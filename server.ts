import { createServer } from 'node:http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { createClient } from 'redis';
import { db, chatMessages } from './lib/db';
import { setupYjsServer } from './lib/yjs-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer(handler);

  // Initialize Socket.io
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST'],
    },
  });

  // Initialize Redis client
  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6380',
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  await redisClient.connect();

  console.log('✅ Redis connected');

  // Initialize Yjs WebSocket server
  setupYjsServer(httpServer);

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log('👤 Client connected:', socket.id);

    // Join room
    socket.on('room:join', async ({ roomId, userId, username }) => {
      socket.join(roomId);
      console.log(`User ${username} (${userId}) joined room ${roomId}`);

      // Add to presence set
      await redisClient.sAdd(`presence:room:${roomId}`, userId);
      await redisClient.hSet(`presence:user:${userId}`, {
        roomId,
        username,
        socketId: socket.id,
        lastSeen: Date.now().toString(),
      });

      // Get all users in room
      const userIds = await redisClient.sMembers(`presence:room:${roomId}`);
      const users = [];
      for (const uid of userIds) {
        const userData = await redisClient.hGetAll(`presence:user:${uid}`);
        if (userData.username) {
          users.push({
            id: uid,
            username: userData.username,
            lastSeen: parseInt(userData.lastSeen || '0'),
          });
        }
      }

      // Notify room of new user
      io.to(roomId).emit('presence:joined', { userId, username });
      socket.emit('presence:list', { users });
    });

    // Leave room
    socket.on('room:leave', async ({ roomId, userId }) => {
      socket.leave(roomId);
      await redisClient.sRem(`presence:room:${roomId}`, userId);
      await redisClient.del(`presence:user:${userId}`);

      io.to(roomId).emit('presence:left', { userId });
    });

    // Chat message
    socket.on('chat:message', async ({ roomId, userId, username, content }) => {
      // Save to database
      const [savedMessage] = await db
        .insert(chatMessages)
        .values({
          roomId,
          userId,
          content,
        })
        .returning();

      const message = {
        id: savedMessage.id,
        roomId: savedMessage.roomId,
        userId: savedMessage.userId,
        username,
        content: savedMessage.content,
        createdAt: savedMessage.createdAt.toISOString(),
      };

      // Broadcast to room
      io.to(roomId).emit('chat:message', message);
    });

    // Typing indicator
    socket.on('chat:typing', async ({ roomId, userId, username, isTyping }) => {
      if (isTyping) {
        await redisClient.sAdd(`typing:room:${roomId}`, userId);
      } else {
        await redisClient.sRem(`typing:room:${roomId}`, userId);
      }

      socket.to(roomId).emit('chat:typing', { userId, username, isTyping });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log('👋 Client disconnected:', socket.id);

      // Find user by socket ID and clean up presence
      const keys = await redisClient.keys('presence:user:*');
      for (const key of keys) {
        const userData = await redisClient.hGetAll(key);
        if (userData.socketId === socket.id) {
          const userId = key.split(':')[2];
          const roomId = userData.roomId;

          await redisClient.sRem(`presence:room:${roomId}`, userId);
          await redisClient.del(key);

          io.to(roomId).emit('presence:left', { userId });
          break;
        }
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
