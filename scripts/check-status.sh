#!/bin/bash

echo "🔍 Checking Authless London Status..."
echo ""

# Check Docker/OrbStack
echo "📦 Docker Status:"
if docker ps > /dev/null 2>&1; then
    echo "  ✅ Docker is running"
    
    # Check PostgreSQL container
    if docker ps | grep -q "beatthefine-postgres"; then
        echo "  ✅ PostgreSQL container is running"
        
        # Test PostgreSQL connection
        if docker exec beatthefine-postgres pg_isready -U postgres > /dev/null 2>&1; then
            echo "  ✅ PostgreSQL is accepting connections"
        else
            echo "  ❌ PostgreSQL is not ready"
        fi
    else
        echo "  ❌ PostgreSQL container is not running"
        echo "      Run: docker-compose up -d"
    fi
else
    echo "  ❌ Docker is not running"
    echo "      Start Docker Desktop or run: orb start"
fi

echo ""

# Check Environment Variables
echo "🌍 Environment Configuration:"
if grep -q "postgresql://" .env 2>/dev/null; then
    echo "  ✅ DATABASE_URL is configured for PostgreSQL"
else
    echo "  ❌ DATABASE_URL is not configured for PostgreSQL"
fi

echo ""

# Check Database Schema
echo "🗃️  Database Schema:"
cd packages/db
if DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beatthefine" pnpm prisma db execute --command "SELECT COUNT(*) FROM \"User\";" > /dev/null 2>&1; then
    USER_COUNT=$(DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beatthefine" pnpm prisma db execute --command "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | grep -o '[0-9]\+' | head -1)
    echo "  ✅ Database schema is ready"
    echo "  👤 Users in database: $USER_COUNT"
else
    echo "  ❌ Database schema is not ready"
    echo "      Run: cd packages/db && DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/beatthefine\" pnpm prisma db push"
fi

cd ../..

echo ""
echo "🎉 System Status Check Complete!"
echo ""
echo "🚀 To start your development server:"
echo "   pnpm dev"
echo ""
echo "🔑 Admin Credentials:"
echo "   Email: admin@beatthefine.london"
echo "   Password: admin123"
