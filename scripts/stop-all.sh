#!/bin/bash

# Stop all services

echo "🛑 Stopping Multi-Tenant Academic System..."

# Kill frontend and backend processes
pkill -f "next dev" || true
pkill -f "tsx watch" || true

echo "✅ All services stopped"
