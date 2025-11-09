# Backend Dockerfile for Fastify API
# Optimized multi-stage build for faster builds and smaller images

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for node-gyp and native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy only package files for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies with cache
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . ./

# Build TypeScript
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies and tools
RUN apk add --no-cache wget netcat-openbsd

# Copy package files
COPY package.json package-lock.json* ./

# Copy ALL dependencies from builder (includes drizzle-orm and other needed packages)
COPY --from=builder /app/node_modules ./node_modules

# Install drizzle-kit and tsx globally for migrations
RUN npm install -g drizzle-kit tsx

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY drizzle.config.ts ./

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

# Set correct permissions
RUN chown -R fastify:nodejs /app

USER fastify

EXPOSE 3000

ENV PORT=3000
ENV HOST="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
