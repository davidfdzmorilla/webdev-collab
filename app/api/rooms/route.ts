import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, rooms } from '@/lib/db';

// Validation schema
const createRoomSchema = z.object({
  name: z.string().min(1).max(255),
  maxParticipants: z.number().int().min(2).max(50).optional().default(10),
  storageLimitMb: z.number().int().min(10).max(1000).optional().default(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createRoomSchema.parse(body);

    // Create room
    const [room] = await db
      .insert(rooms)
      .values({
        name: validated.name,
        maxParticipants: validated.maxParticipants,
        storageLimitMb: validated.storageLimitMb,
      })
      .returning();

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const allRooms = await db.select().from(rooms);
    return NextResponse.json(allRooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
