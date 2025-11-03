#!/bin/bash

# Script to run API integration tests with proper server management

set -e

echo "🧹 Cleaning up any existing Astro processes..."
pkill -f 'node.*astro' 2>/dev/null || true
sleep 1

echo "🚀 Starting Astro dev server..."
npm run dev > /tmp/astro-dev.log 2>&1 &
SERVER_PID=$!

echo "⏳ Waiting for server to be ready..."
MAX_WAIT=15
COUNTER=0
until curl -s http://localhost:4321/ > /dev/null 2>&1 || curl -s http://localhost:4322/ > /dev/null 2>&1; do
  sleep 1
  COUNTER=$((COUNTER + 1))
  if [ $COUNTER -ge $MAX_WAIT ]; then
    echo "❌ Server failed to start within ${MAX_WAIT} seconds"
    cat /tmp/astro-dev.log
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
  echo "  ... waiting (${COUNTER}/${MAX_WAIT})"
done

# Detect which port the server is on
if curl -s http://localhost:4321/ > /dev/null 2>&1; then
  PORT=4321
elif curl -s http://localhost:4322/ > /dev/null 2>&1; then
  PORT=4322
else
  echo "❌ Server not responding on expected ports"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

echo "✅ Server ready on port $PORT"

echo "🧪 Running tests..."
ASTRO_TEST_URL="http://localhost:$PORT" npm test -- api/__tests__/search.test.ts --run
TEST_EXIT=$?

echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null || true
pkill -f 'node.*astro' 2>/dev/null || true

if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Tests failed with exit code $TEST_EXIT"
fi

exit $TEST_EXIT
