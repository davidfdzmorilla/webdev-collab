'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface EditorProps {
  roomId: string;
  username: string;
  userId: string;
}

const colors = ['#958DF1', '#F98181', '#FBBC88', '#FAF594', '#70CFF8', '#94FADB', '#B9F18D'];

function getRandomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function Editor({ roomId, username }: EditorProps) {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [ydoc] = useState(() => new Y.Doc());

  useEffect(() => {
    // Create WebSocket provider for Yjs
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    const wsProvider = new WebsocketProvider(wsUrl, `room-${roomId}`, ydoc);

    setProvider(wsProvider);

    return () => {
      wsProvider.destroy();
      ydoc.destroy();
    };
  }, [roomId, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Yjs handles history
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: username,
          color: getRandomColor(),
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
  });

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Collaborative Document</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${provider?.wsconnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-gray-600">
              {provider?.wsconnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`rounded px-3 py-1 text-sm ${editor.isActive('bold') ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Bold
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`rounded px-3 py-1 text-sm ${editor.isActive('italic') ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Italic
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`rounded px-3 py-1 text-sm ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`rounded px-3 py-1 text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`rounded px-3 py-1 text-sm ${editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Bullet List
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`rounded px-3 py-1 text-sm ${editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Ordered List
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
