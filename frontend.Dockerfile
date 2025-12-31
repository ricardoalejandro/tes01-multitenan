# Frontend Dockerfile for Next.js 14
# Optimized multi-stage build for faster builds and smaller images

# Stage 1: Dependencies - Use cache mount for faster npm install
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for node-gyp
RUN apk add --no-cache libc6-compat

# Copy only package files for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies with cache
RUN npm ci

# Stage 2: Builder (Production)
FROM node:20-alpine AS builder
WORKDIR /app

# Build-time argument for API URL (MUST be declared before RUN npm run build)
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variable
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application (NEXT_PUBLIC_* variables are embedded during this step)
RUN npm run build

# Stage 3: Runner - Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install only wget for health checks
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 5000

ENV PORT=5000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# Stage 4: Development (usando Debian slim para mejor compatibilidad con SWC)
FROM node:20-slim AS development
WORKDIR /app

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Install wget for health checks
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies)
RUN npm install

# Copy source code (will be overridden by volume mounts)
COPY . .

EXPOSE 5000

ENV PORT=5000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "dev"]
