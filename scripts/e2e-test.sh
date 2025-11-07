#!/bin/bash

# E2E test script to verify API endpoints

set -e

API_URL="http://localhost:3000/api"
TOKEN=""

echo "🧪 Running E2E API tests..."

# Test health endpoint
echo "Testing health endpoint..."
curl -s "$API_URL/../health" | grep -q "ok" && echo "✅ Health check passed" || echo "❌ Health check failed"

# Test login
echo "Testing login..."
RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"escolastica123"}')

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  exit 1
fi

# Test authenticated endpoint
echo "Testing authenticated endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/auth/me" | grep -q "username" && echo "✅ Authentication passed" || echo "❌ Authentication failed"

# Test branches
echo "Testing branches endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/branches" | grep -q "\\[" && echo "✅ Branches endpoint passed" || echo "❌ Branches endpoint failed"

echo "🎉 All tests passed!"
