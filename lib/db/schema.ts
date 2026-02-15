import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  bigint,
} from 'drizzle-orm/pg-core';

// Rooms
export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  maxParticipants: integer('max_participants').default(10).notNull(),
  storageLimitMb: integer('storage_limit_mb').default(100).notNull(),
});

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Room Participants
export const roomParticipants = pgTable('room_participants', {
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  role: varchar('role', { length: 50 }).default('member').notNull(), // owner, member
});

// Chat Messages
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // attachments, mentions, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Documents (CRDT state persistence)
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  yjsState: text('yjs_state'), // Yjs document state (base64 encoded)
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Files
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  filename: varchar('filename', { length: 255 }).notNull(),
  mimetype: varchar('mimetype', { length: 100 }),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  storageKey: text('storage_key').notNull(), // MinIO object key
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
});
