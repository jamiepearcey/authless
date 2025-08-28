#!/bin/bash

# Setup PostgreSQL for Beat the Fine London
echo "🐘 Setting up PostgreSQL for Beat the Fine London..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Remove any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose down -v 2>/dev/null || true

# Remove old SQLite database files
echo "🗑️  Removing old SQLite database files..."
find . -name "*.db" -type f -delete 2>/dev/null || true

# Start PostgreSQL
echo "🚀 Starting PostgreSQL container..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=30
while ! docker exec beatthefine-postgres pg_isready -U postgres >/dev/null 2>&1; do
    if [ $timeout -le 0 ]; then
        echo "❌ PostgreSQL failed to start within 30 seconds"
        exit 1
    fi
    echo "   Waiting... ($timeout seconds remaining)"
    sleep 1
    timeout=$((timeout - 1))
done

echo "✅ PostgreSQL is ready!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd packages/db
pnpm prisma generate

# Push database schema
echo "📊 Pushing database schema..."
pnpm prisma db push

# Run seed data
echo "🌱 Seeding database..."
pnpm prisma db seed

echo "🎉 Setup complete!"
echo ""
echo "Database connection: postgresql://postgres:postgres@localhost:5432/beatthefine"
echo "You can now start your development server."
