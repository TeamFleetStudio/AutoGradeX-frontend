#!/bin/sh

# Debug: Print environment variables
echo "=== Environment Configuration ==="
echo "NODE_ENV: $NODE_ENV"
echo "NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
echo "NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
echo "Port: 3000"
echo "====================================="

# Ensure .next directory exists
if [ ! -d ".next" ]; then
  echo "ERROR: .next directory not found. Build may have failed."
  exit 1
fi

echo "Starting Next.js application..."
exec npm start
