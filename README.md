# Real-Time Collaboration Platform

Real-time document editing, video calls, and file sharing platform built with WebRTC, WebSocket, and CRDTs.

**🌐 Live**: TBD  
**📦 Repo**: [github.com/davidfdzmorilla/webdev-collab](https://github.com/davidfdzmorilla/webdev-collab)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Real-time**: Socket.io (Chat), Yjs (CRDT), WebRTC (Video)
- **Database**: PostgreSQL 17 + Drizzle ORM
- **Cache**: Redis 7
- **Storage**: MinIO (S3-compatible)
- **Infrastructure**: Docker, Nginx, Cloudflare

## Features

- ✅ Real-time document editing (CRDTs with Yjs)
- ✅ Video/audio calls (WebRTC)
- ✅ Screen sharing
- ✅ Persistent chat (Socket.io)
- ✅ File sharing (MinIO)
- ✅ Presence indicators

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm
- Docker & Docker Compose

### Development

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d

# Run migrations
pnpm drizzle-kit migrate

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production (Docker)

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Project Structure

```
├── app/                    # Next.js app directory
├── components/            # React components
├── lib/
│   ├── db/               # Database schema and connection
│   └── ...               # Utilities
├── docs/                  # Documentation
│   ├── DESIGN.md         # Architecture and design decisions
│   ├── ROADMAP.md        # Development milestones
│   └── VERIFICATION.md   # Deployment verification
└── docker-compose.yml    # Development infrastructure
```

## Development Status

**Current Milestone**: M1 (Setup) ✅

See [ROADMAP.md](docs/ROADMAP.md) for detailed milestones.

## Documentation

- [Design Document](docs/DESIGN.md) - Architecture, data model, API design
- [Roadmap](docs/ROADMAP.md) - Milestones and timeline
- [Verification Report](docs/VERIFICATION.md) - Deployment checklist

## License

MIT
