# Backend Dockerfile for Fastify API
# Using Debian-based images for better compatibility

# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Configure npm to handle SSL issues
RUN npm config set strict-ssl false && npm config set registry https://registry.npmjs.org/

# Install dependencies for node-gyp and native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install TypeScript and dependencies globally first
RUN npm install -g typescript tsx drizzle-kit || true

# Copy only package files for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies with fallback options
RUN npm install --no-audit --no-fund || npm install --legacy-peer-deps || true

# Stage 2: Builder
FROM node:20-slim AS builder
WORKDIR /app

# Configure npm
RUN npm config set strict-ssl false

# Install TypeScript globally for building
RUN npm install -g typescript || true

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=deps /usr/local/bin /usr/local/bin
COPY . ./

# Build TypeScript
RUN npx tsc || tsc || npm run build

# Stage 3: Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies and tools
RUN apt-get update && apt-get install -y \
    wget \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

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
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs fastify

# Set correct permissions
RUN chown -R fastify:nodejs /app

USER fastify

EXPOSE 3000

ENV PORT=3000
ENV HOST="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
