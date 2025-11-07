#!/bin/bash

set -e

echo "🚀 Starting setup..."

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Copy environment files if they don't exist
if [ ! -f .env ]; then
  echo "📝 Creating backend .env file..."
  cp .env.example .env
fi

cd ..
if [ ! -f .env ]; then
  echo "📝 Creating frontend .env file..."
  cp .env.example .env
fi

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
cd backend
until npm run db:push 2>/dev/null; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

# Run database seed
echo "🌱 Seeding database..."
npm run db:seed

cd ..

echo "✅ Setup completed successfully!"
echo ""
echo "To start the application:"
echo "  Terminal 1: npm run dev (Frontend)"
echo "  Terminal 2: npm run backend:dev (Backend)"
echo ""
echo "Or run both with: npm run dev:all"
