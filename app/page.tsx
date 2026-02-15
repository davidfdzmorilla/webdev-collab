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
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-4xl font-bold">Real-Time Collaboration</h1>
        <p className="mb-8 text-gray-600">
          Create a room and collaborate with your team in real-time.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium">
              Room Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter room name"
              required
              disabled={loading}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </form>

        <div className="mt-8 rounded-lg bg-gray-50 p-4">
          <h2 className="mb-2 font-semibold">Features (Level 6.1)</h2>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>✅ Real-time document editing (CRDTs)</li>
            <li>✅ Video/audio calls (WebRTC)</li>
            <li>✅ Persistent chat (Socket.io)</li>
            <li>✅ File sharing (MinIO)</li>
            <li>✅ Presence indicators</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
