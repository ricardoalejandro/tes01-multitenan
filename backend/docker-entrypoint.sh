#!/bin/sh
set -e

echo "🔄 Waiting for PostgreSQL to be ready..."
while ! nc -z postgres 5432; do
  sleep 1
done

echo "✅ PostgreSQL is ready!"

echo "🔄 Running database migrations..."
npm run db:push || echo "⚠️  Migrations may have already been applied"

echo "🌱 Running database seed..."
npm run db:seed || echo "⚠️  Database may already be seeded"

echo "🚀 Starting backend server..."
exec node dist/index.js
