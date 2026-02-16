'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const room = await response.json();
      router.push(`/room/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-6xl font-bold text-gray-900">
            Real-Time <span className="text-blue-600">Collaboration</span>
          </h1>
          <p className="text-xl text-gray-600">
            Document editing, chat, and collaboration — all in real-time
          </p>
        </div>

        {/* Create Room Form */}
        <div className="mb-12 rounded-2xl bg-white p-8 shadow-xl">
          <h2 className="mb-6 text-2xl font-semibold text-gray-900">Create a Room</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
                Room Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Team Planning Session"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <button
              type="submit"
              disabled={loading || !name}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </form>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 text-4xl">📝</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Collaborative Editing</h3>
            <p className="text-sm text-gray-600">
              Edit documents together in real-time with CRDT technology. See everyone&apos;s cursors
              and changes instantly.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 text-4xl">💬</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Real-Time Chat</h3>
            <p className="text-sm text-gray-600">
              Chat with your team while you work. See who&apos;s typing, who&apos;s online, and keep
              the conversation flowing.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 text-4xl">👥</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Presence Tracking</h3>
            <p className="text-sm text-gray-600">
              Know who&apos;s in the room at all times. See active users, their cursor positions,
              and online status.
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-12 rounded-xl bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Built With Modern Tech</h3>
          <div className="flex flex-wrap gap-2">
            {[
              'Next.js 15',
              'React 19',
              'TypeScript',
              'Socket.io',
              'Yjs CRDTs',
              'Tiptap',
              'PostgreSQL',
              'Redis',
              'Tailwind CSS',
            ].map((tech) => (
              <span key={tech} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Level 6.1: Cloud-Native & Real-Time Systems</p>
          <p className="mt-1">
            <a
              href="https://github.com/davidfdzmorilla/webdev-collab"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
