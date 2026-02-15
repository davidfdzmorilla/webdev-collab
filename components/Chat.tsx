'use client';

import { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/lib/socket-context';

interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  lastSeen: number;
}

interface ChatProps {
  roomId: string;
  userId: string;
  username: string;
}

export function Chat({ roomId, userId, username }: ChatProps) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load message history
  useEffect(() => {
    async function loadMessages() {
      try {
        const response = await fetch(`/api/rooms/${roomId}/messages?limit=50`);
        if (response.ok) {
          const history = await response.json();
          setMessages(history);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }

    loadMessages();
  }, [roomId]);

  // Join room and set up event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('room:join', { roomId, userId, username });

    socket.on('chat:message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('presence:joined', ({ userId: newUserId, username: newUsername }) => {
      console.log(`${newUsername} joined`);
    });

    socket.on('presence:left', ({ userId: leftUserId }) => {
      setUsers((prev) => prev.filter((u) => u.id !== leftUserId));
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(leftUserId);
        return next;
      });
    });

    socket.on('presence:list', ({ users: userList }: { users: User[] }) => {
      setUsers(userList);
    });

    socket.on(
      'chat:typing',
      ({ userId: typingUserId, isTyping }: { userId: string; isTyping: boolean }) => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (isTyping) {
            next.add(typingUserId);
          } else {
            next.delete(typingUserId);
          }
          return next;
        });
      }
    );

    return () => {
      socket.emit('room:leave', { roomId, userId });
      socket.off('chat:message');
      socket.off('presence:joined');
      socket.off('presence:left');
      socket.off('presence:list');
      socket.off('chat:typing');
    };
  }, [socket, isConnected, roomId, userId, username]);

  const handleTyping = () => {
    if (!socket) return;

    socket.emit('chat:typing', { roomId, userId, username, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('chat:typing', { roomId, userId, username, isTyping: false });
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !input.trim()) return;

    socket.emit('chat:message', {
      roomId,
      userId,
      username,
      content: input.trim(),
    });

    setInput('');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('chat:typing', { roomId, userId, username, isTyping: false });
  };

  const typingUsernames = users
    .filter((u) => typingUsers.has(u.id) && u.id !== userId)
    .map((u) => u.username);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chat</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-gray-600">
              {users.length} {users.length === 1 ? 'user' : 'users'} online
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-500">No messages yet. Start chatting!</p>
        )}

        {messages.map((message) => (
          <div key={message.id} className={message.userId === userId ? 'text-right' : ''}>
            <div
              className={`inline-block rounded-lg px-4 py-2 ${
                message.userId === userId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.userId !== userId && (
                <p className="mb-1 text-xs font-semibold">{message.username}</p>
              )}
              <p className="text-sm">{message.content}</p>
              <p
                className={`mt-1 text-xs ${
                  message.userId === userId ? 'text-blue-200' : 'text-gray-500'
                }`}
              >
                {new Date(message.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsernames.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-500">
          {typingUsernames.join(', ')} {typingUsernames.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!isConnected || !input.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
