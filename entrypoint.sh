#!/bin/sh
set -e

echo "Starting 1Gate Application..."

# Wait for DB to be ready (handled by docker-compose depends_on healthcheck mostly)
# But it's good to ensure prisma can connect

echo "Running Database Migrations..."
node node_modules/prisma/build/index.js migrate deploy

# Optionally trigger seed script if DB is empty
# You can uncomment this if you want it to run automatically, or run it manually via docker exec
# npx tsx prisma/seed.ts

echo "Starting Next.js Server..."
exec node server.js
