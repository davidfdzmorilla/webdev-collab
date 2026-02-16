'use client';

import { useEffect, useState } from 'react';
import { Chat } from './Chat';
import { Editor } from './Editor';

interface Room {
  id: string;
  name: string;
  maxParticipants: number;
  storageLimitMb: number;
  createdAt: string;
}

export function RoomClient({ room }: { room: Room }) {
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Get or create user ID and username from cookies/localStorage
    const storedUserId =
      document.cookie
        .split('; ')
        .find((row) => row.startsWith('collab_user_id='))
        ?.split('=')[1] || `user-${Math.random().toString(36).substr(2, 9)}`;

    const storedUsername =
      localStorage.getItem('username') || `User${Math.floor(Math.random() * 1000)}`;

    setUserId(storedUserId);
    setUsername(storedUsername);

    localStorage.setItem('username', storedUsername);
  }, []);

  if (!userId || !username) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid h-screen grid-cols-1 gap-4 p-4 lg:grid-cols-4">
      {/* Room Info */}
      <div className="lg:col-span-1">
        <div className="rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold">Room Details</h2>
          <dl className="mt-4 space-y-2">
            <div>
              <dt className="text-sm text-gray-600">Room Name</dt>
              <dd className="font-medium">{room.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Max Participants</dt>
              <dd className="font-medium">{room.maxParticipants}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Storage Limit</dt>
              <dd className="font-medium">{room.storageLimitMb} MB</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Created</dt>
              <dd className="font-medium">{new Date(room.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Your Username</dt>
              <dd className="font-medium">{username}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <h3 className="text-sm font-semibold">Milestones</h3>
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            <li>✅ M1: Project Setup</li>
            <li>✅ M2: Room Management</li>
            <li>✅ M3: Real-Time Chat</li>
            <li>🔄 M4: Collaborative Editing</li>
            <li>⏳ M5: Video/Audio Calls</li>
            <li>⏳ M6: File Sharing</li>
          </ul>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-lg border border-gray-200 lg:col-span-2">
        <Editor roomId={room.id} userId={userId} username={username} />
      </div>

      {/* Chat */}
      <div className="rounded-lg border border-gray-200 lg:col-span-1">
        <Chat roomId={room.id} userId={userId} username={username} />
      </div>
    </div>
  );
}
