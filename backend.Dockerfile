# Backend Dockerfile for Fastify API
# Multi-stage build for optimal image size

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install git (required for some npm packages)
RUN apk add --no-cache git python3 make g++

# Copy package files
COPY package.json ./

# Install ALL dependencies
RUN npm install --verbose

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

# Install runtime dependencies
RUN apk add --no-cache wget netcat-openbsd git python3 make g++

# Copy package file
COPY package.json ./

# Install production dependencies and required tools
RUN npm install --omit=dev && \
    npm install -g drizzle-kit tsx

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
