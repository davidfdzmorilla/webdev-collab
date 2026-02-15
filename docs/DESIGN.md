# Design Document — Real-Time Collaboration Platform

**Project**: webdev-collab  
**Level**: 6.1 (Cloud-Native & Real-Time Systems)  
**Status**: Design Phase  
**Created**: 2026-02-15

---

## Problem Statement

Modern teams need real-time collaboration tools that combine document editing, video communication, and file sharing in one platform. Current solutions are either too complex (enterprise tools) or too limited (chat apps without editing).

**Goal**: Build a production-grade collaboration platform demonstrating WebRTC, WebSocket, and CRDT technologies.

---

## Requirements

### Functional Requirements

**F1: Real-Time Document Editing**

- Multiple users can edit the same document simultaneously
- Changes appear instantly for all users (<100ms latency)
- Conflict-free merging using CRDTs
- Cursor positions visible for all users
- Document persistence (save to database)
- Version history (optional for MVP)

**F2: Video/Audio Communication**

- Peer-to-peer video calls (WebRTC)
- Audio calls (WebRTC)
- Mute/unmute controls
- Camera on/off toggle
- Screen sharing
- Up to 4 participants per room (MVP limit)

**F3: Presence & Status**

- Online/offline indicators
- "Currently typing" indicators
- Active user list per room
- Heartbeat-based connection monitoring

**F4: Persistent Chat**

- Text messages preserved in database
- Message history on join
- Markdown support (optional)
- File attachments (images, documents)

**F5: File Sharing**

- Upload files to shared workspace
- Download files
- Upload progress indicators
- File preview (images)
- Storage limit per room (100MB MVP)

### Non-Functional Requirements

**NFR1: Performance**

- Document sync latency: <100ms (p95)
- Video quality: 720p @ 30fps minimum
- Chat message delivery: <500ms (p95)
- File upload: support files up to 10MB

**NFR2: Scalability**

- Support 10 concurrent rooms
- 4 users per room
- Degrade gracefully under load

**NFR3: Reliability**

- Connection recovery (automatic reconnect)
- Data consistency (CRDT guarantees)
- No message loss (persistent storage)

**NFR4: Security**

- Room access control (unique room IDs)
- HTTPS/WSS only
- File upload validation (type, size)
- XSS protection

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                       │
│  ┌─────────────┬──────────────┬──────────────┬───────────┐ │
│  │   Editor    │  Video/Audio │    Chat      │   Files   │ │
│  │   (Yjs)     │   (WebRTC)   │ (Socket.io)  │ (MinIO)   │ │
│  └─────────────┴──────────────┴──────────────┴───────────┘ │
│         │              │               │            │       │
└─────────┼──────────────┼───────────────┼────────────┼───────┘
          │              │               │            │
          │              │               │            │
       WSS (Yjs)      Signaling      WebSocket       HTTP
          │              │               │            │
          ▼              ▼               ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Server                          │
│  ┌────────────┬──────────────┬──────────────┬────────────┐  │
│  │ Yjs Server │   Signaling  │   Socket.io  │  File API  │  │
│  │ (y-websocket)│  Server   │   (Chat)     │ (Express)  │  │
│  └────────────┴──────────────┴──────────────┴────────────┘  │
│         │                                         │          │
│         ▼                                         ▼          │
│  ┌─────────────────────────┐          ┌──────────────────┐  │
│  │      PostgreSQL         │          │      MinIO       │  │
│  │  (Rooms, Users, Chat)   │          │  (File Storage)  │  │
│  └─────────────────────────┘          └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │      Redis       │
                 │  (Presence, Rate)│
                 └──────────────────┘
```

### Component Breakdown

#### Frontend (Next.js 15)

- **Editor Component**: Yjs-based collaborative text editor (Monaco or Tiptap)
- **Video Component**: WebRTC peer connections, media streams
- **Chat Component**: Socket.io client, message rendering
- **File Component**: Upload/download UI, preview
- **Room Component**: Manages room state, presence

#### Backend Services

- **Yjs WebSocket Server**: Handles CRDT synchronization
- **Signaling Server**: WebRTC peer discovery and ICE candidate exchange
- **Socket.io Server**: Chat messages, presence updates
- **File API**: Upload/download endpoints, MinIO integration
- **Room Service**: Room creation, access control

#### Data Stores

- **PostgreSQL**: Rooms, users, chat history, metadata
- **Redis**: Presence tracking, rate limiting, session data
- **MinIO**: File storage (S3-compatible)

---

## Data Model

### PostgreSQL Schema

```sql
-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  max_participants INT DEFAULT 10,
  storage_limit_mb INT DEFAULT 100
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room Participants
CREATE TABLE room_participants (
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  role VARCHAR(50) DEFAULT 'member', -- owner, member
  PRIMARY KEY (room_id, user_id)
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  metadata JSONB, -- attachments, mentions, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_room_created (room_id, created_at)
);

-- Documents (CRDT state persistence)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  yjs_state BYTEA, -- Yjs document state
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, name)
);

-- Files
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  mimetype VARCHAR(100),
  size_bytes BIGINT,
  storage_key TEXT NOT NULL, -- MinIO object key
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_files_room ON files(room_id, uploaded_at DESC);
CREATE INDEX idx_participants_room ON room_participants(room_id);
```

### Redis Keys

```
presence:room:{room_id} → SET of user IDs (online users)
presence:user:{user_id} → HASH {room_id, last_seen, status}
typing:room:{room_id} → SET of user IDs (currently typing)
ratelimit:{user_id}:upload → COUNT with TTL (upload rate limit)
```

---

## API Design

### REST Endpoints

**Room Management**

```
POST   /api/rooms           Create new room
GET    /api/rooms/:id       Get room details
PUT    /api/rooms/:id       Update room settings
DELETE /api/rooms/:id       Delete room
GET    /api/rooms/:id/participants   Get room participants
POST   /api/rooms/:id/join  Join room
```

**File Management**

```
POST   /api/rooms/:id/files       Upload file
GET    /api/rooms/:id/files       List files
GET    /api/files/:id             Download file
DELETE /api/files/:id             Delete file
```

**Chat**

```
GET    /api/rooms/:id/messages    Get message history (paginated)
POST   /api/rooms/:id/messages    Send message (fallback, prefer WebSocket)
```

### WebSocket Events

**Client → Server**

```javascript
// Chat
socket.emit('chat:message', { room_id, content });
socket.emit('chat:typing', { room_id, is_typing });

// Presence
socket.emit('room:join', { room_id, user_id });
socket.emit('room:leave', { room_id });
socket.emit('presence:update', { status });

// Signaling (WebRTC)
socket.emit('webrtc:offer', { room_id, to_user_id, sdp });
socket.emit('webrtc:answer', { room_id, to_user_id, sdp });
socket.emit('webrtc:ice-candidate', { room_id, to_user_id, candidate });
```

**Server → Client**

```javascript
// Chat
socket.on('chat:message', { id, user, content, created_at });
socket.on('chat:typing', { user_id, is_typing });

// Presence
socket.on('presence:joined', { user });
socket.on('presence:left', { user_id });
socket.on('presence:update', { user_id, status });
socket.on('presence:list', { users: [] });

// Signaling (WebRTC)
socket.on('webrtc:offer', { from_user_id, sdp });
socket.on('webrtc:answer', { from_user_id, sdp });
socket.on('webrtc:ice-candidate', { from_user_id, candidate });
```

---

## Technology Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: Tailwind CSS 4, Radix UI
- **Editor**: Tiptap (ProseMirror-based) + Yjs extension
- **WebRTC**: simple-peer or native WebRTC API
- **CRDT**: Yjs (y-websocket, y-tiptap)
- **Chat**: socket.io-client
- **State**: Zustand or Jotai

### Backend

- **Runtime**: Node.js 22
- **Framework**: Express.js
- **WebSocket**: socket.io (Chat), ws (Yjs)
- **CRDT Server**: y-websocket
- **Database**: PostgreSQL 17 + Drizzle ORM
- **Cache**: Redis 7
- **Storage**: MinIO (S3-compatible)
- **Validation**: Zod

### DevOps

- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt (certbot)
- **DNS**: Cloudflare (proxied: false)

---

## WebRTC Architecture

### Signaling Flow

```
User A                  Server                  User B
  │                       │                       │
  ├─ createOffer() ───────┤                       │
  │                       │                       │
  ├─ emit('offer') ──────►│                       │
  │                       │                       │
  │                       ├─► on('offer') ────────┤
  │                       │                       │
  │                       │                   createAnswer()
  │                       │                       │
  │                       │◄─── emit('answer') ───┤
  │                       │                       │
  │◄─── on('answer') ─────┤                       │
  │                       │                       │
  ├─ setRemoteDescription │                       │
  │                       │                       │
  │◄─ ICE candidates ────►│◄─ ICE candidates ────►│
  │                       │                       │
  │◄──────── Direct P2P Connection ──────────────►│
```

### Connection Types

1. **P2P (Peer-to-Peer)**: Direct connection when possible (same network, port forwarding)
2. **STUN**: Use public STUN server (Google's stun:stun.l.google.com:19302) for NAT traversal
3. **TURN** (Future): Relay server for restrictive NATs (not implemented in MVP)

### Media Constraints

```javascript
const constraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};
```

---

## CRDT Implementation (Yjs)

### Why Yjs?

- Proven CRDT implementation
- Excellent performance (< 50ms sync)
- Rich ecosystem (y-websocket, y-tiptap, y-monaco)
- Offline-capable (stores updates locally)

### Architecture

```
Client A              Yjs WebSocket Server              Client B
   │                         │                             │
   │  ── Y.Doc changes ─────►│                             │
   │                         │                             │
   │                         ├─── broadcast ──────────────►│
   │                         │                             │
   │◄─────── Y.Doc changes ──┤◄────────────────────────────┤
   │                         │                             │
   │      (All clients have eventually consistent state)   │
```

### Persistence Strategy

- **In-Memory**: Y.Doc kept in memory on server for active rooms
- **Database**: Persist Y.Doc state to PostgreSQL on:
  - Periodic interval (every 5 minutes)
  - When last user leaves room
  - Manual save action
- **Loading**: Load Y.Doc state from database when first user joins

---

## File Upload Flow

```
Client                  Backend API             MinIO
  │                         │                     │
  ├─ POST /api/rooms/:id/files                   │
  │   (multipart/form-data) │                     │
  │                         │                     │
  │                         ├─ Validate file     │
  │                         │   (size, type)      │
  │                         │                     │
  │                         ├─ Generate key      │
  │                         │   (UUID + extension)│
  │                         │                     │
  │                         ├─ Upload ───────────►│
  │                         │                     │
  │                         │◄── Success ─────────┤
  │                         │                     │
  │                         ├─ Save metadata     │
  │                         │   (PostgreSQL)      │
  │                         │                     │
  │◄── Success + file URL ──┤                     │
  │                         │                     │
  ├─ Emit 'file:uploaded' via Socket.io         │
  │   (notify other participants)                │
```

---

## Security Considerations

### Authentication & Authorization

- **Room Access**: UUID-based room IDs (hard to guess)
- **User Identity**: Simple username-based (no passwords for MVP)
- **Session**: Cookie-based session management

### Input Validation

- **File uploads**: Validate MIME type, size, extension
- **Chat messages**: Sanitize HTML, limit length
- **WebSocket events**: Validate all incoming data with Zod

### Rate Limiting

- **File uploads**: 5 uploads per minute per user
- **Chat messages**: 10 messages per 10 seconds per user
- **API requests**: 100 requests per minute per IP

### XSS Protection

- **Chat**: Render messages as plain text or sanitized Markdown
- **File names**: Escape special characters in display

---

## Performance Optimizations

### Frontend

- Code splitting (lazy load video/editor components)
- WebSocket connection pooling
- Debounce typing indicators (500ms)
- Throttle presence updates (2 seconds)

### Backend

- Redis for presence (fast reads/writes)
- Database connection pooling
- Compress WebSocket messages (permessage-deflate)
- Rate limiting to prevent abuse

### WebRTC

- Adaptive bitrate (adjust quality based on bandwidth)
- Simulcast (future: send multiple quality streams)
- SVC (Scalable Video Coding) - future

---

## Error Handling & Recovery

### Connection Loss

- **WebSocket**: Auto-reconnect with exponential backoff
- **WebRTC**: Reconnect on ICE failure
- **Yjs**: Queue updates locally, sync on reconnect

### Data Conflicts

- **CRDT**: Yjs handles conflicts automatically
- **Chat**: Server is source of truth, client re-syncs on conflict

### Resource Limits

- **Storage**: Prevent uploads when room limit exceeded
- **Participants**: Reject join when room full
- **Bandwidth**: Degrade video quality gracefully

---

## Monitoring & Observability

### Metrics

- Active rooms count
- Active connections count
- WebSocket message rate
- File upload rate
- Average message latency
- Video connection success rate

### Logs

- Room creation/deletion
- User joins/leaves
- File uploads
- WebRTC connection failures
- Error logs (with stack traces)

### Health Checks

- Database connection
- Redis connection
- MinIO connection
- WebSocket server status

---

## Deployment Architecture

### Docker Compose (MVP)

```yaml
services:
  app: # Next.js frontend + backend
  postgres: # Database
  redis: # Cache + presence
  minio: # File storage
  nginx: # Reverse proxy
```

### Resource Requirements

- **CPU**: 2 cores minimum
- **RAM**: 4GB minimum (2GB app, 1GB postgres, 512MB redis, 512MB minio)
- **Storage**: 20GB (10GB files, 10GB database)
- **Network**: 100Mbps (for video)

---

## Testing Strategy

### Unit Tests

- CRDT merge logic
- Chat message validation
- File upload validation
- Presence tracking logic

### Integration Tests

- Room creation flow
- Chat message flow (WebSocket)
- File upload flow (API + MinIO)
- Document sync (Yjs)

### E2E Tests (Manual for MVP)

- Multi-user editing
- Video call establishment
- File sharing workflow
- Connection recovery

---

## Future Enhancements

### Phase 2 (Post-MVP)

- [ ] User authentication (OAuth 2.0)
- [ ] Persistent user accounts
- [ ] Room permissions (public/private, passwords)
- [ ] Message reactions and threads
- [ ] Code editor mode (syntax highlighting)
- [ ] Drawing/whiteboard tool

### Phase 3 (Scale)

- [ ] Kubernetes deployment
- [ ] Horizontal scaling (Redis Pub/Sub for Socket.io)
- [ ] SFU (Selective Forwarding Unit) for 10+ participants
- [ ] CDN for file downloads
- [ ] Analytics dashboard

---

## References

- [Yjs Documentation](https://docs.yjs.dev/)
- [WebRTC for the Curious](https://webrtcforthecurious.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Tiptap Collaboration Guide](https://tiptap.dev/collaboration)
- [MinIO Documentation](https://min.io/docs/)

---

**Status**: Design Complete  
**Next Step**: Create ROADMAP.md with milestones
