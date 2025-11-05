#!/bin/bash

# Start all services (backend + frontend)

set -e

echo "🚀 Starting Multi-Tenant Academic System..."

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Starting Redis..."
    redis-server --daemonize yes
fi

# Check if PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
fi

# Start backend and frontend in parallel
echo "Starting backend and frontend..."
npm run dev:all
