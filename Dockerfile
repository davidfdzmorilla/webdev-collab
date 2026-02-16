# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (needed for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Next.js application
RUN pnpm build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (simpler approach, includes runtime deps)
RUN pnpm install --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

# Copy server and lib files
COPY server.ts ./
COPY lib ./lib
COPY drizzle ./drizzle

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start server
CMD ["pnpm", "start"]
