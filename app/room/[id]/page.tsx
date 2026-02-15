import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, rooms } from '@/lib/db';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: PageProps) {
  const { id } = await params;

  const [room] = await db.select().from(rooms).where(eq(rooms.id, id));

  if (!room) {
    notFound();
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">{room.name}</h1>
          <p className="mt-2 text-gray-600">Room ID: {room.id}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold">Room Details</h2>
            <dl className="mt-4 space-y-2">
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
            </dl>
          </div>

          <div className="rounded-lg border border-gray-200 p-6 md:col-span-2">
            <h2 className="text-lg font-semibold">Collaboration Space</h2>
            <p className="mt-4 text-gray-600">
              Real-time features will be implemented in upcoming milestones:
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>✅ M1: Project Setup (Complete)</li>
              <li>🔄 M2: Room Management (In Progress)</li>
              <li>⏳ M3: Real-Time Chat</li>
              <li>⏳ M4: Collaborative Editing</li>
              <li>⏳ M5: Video/Audio Calls</li>
              <li>⏳ M6: File Sharing</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
