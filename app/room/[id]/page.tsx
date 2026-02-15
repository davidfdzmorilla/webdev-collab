import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, rooms } from '@/lib/db';
import { RoomClient } from '@/components/RoomClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: PageProps) {
  const { id } = await params;

  const [room] = await db.select().from(rooms).where(eq(rooms.id, id));

  if (!room) {
    notFound();
  }

  // Serialize dates for client component
  const serializedRoom = {
    ...room,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };

  return <RoomClient room={serializedRoom} />;
}
