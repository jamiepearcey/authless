#!/bin/bash

echo "🔐 Verifying Authentication Setup..."
echo ""

# Check PostgreSQL
echo "1️⃣ PostgreSQL Status:"
if docker ps | grep -q "beatthefine-postgres"; then
    echo "  ✅ PostgreSQL container running"
    if docker exec beatthefine-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "  ✅ PostgreSQL accepting connections"
    else
        echo "  ❌ PostgreSQL not ready"
        exit 1
    fi
else
    echo "  ❌ PostgreSQL container not running"
    echo "      Run: docker-compose up -d"
    exit 1
fi

echo ""

# Check Environment Variables
echo "2️⃣ Environment Variables:"
if [ -f "apps/web/.env.local" ]; then
    echo "  ✅ Web app .env.local exists"
    if grep -q "postgresql://" apps/web/.env.local; then
        echo "  ✅ DATABASE_URL configured for PostgreSQL"
    else
        echo "  ❌ DATABASE_URL not configured for PostgreSQL"
    fi
    if grep -q "NEXTAUTH_URL.*3000" apps/web/.env.local; then
        echo "  ✅ NEXTAUTH_URL configured for port 3000"
    else
        echo "  ⚠️  NEXTAUTH_URL not set to port 3000"
    fi
else
    echo "  ❌ Web app .env.local missing"
fi

echo ""

# Check Database Client
echo "3️⃣ Database Client:"
cd packages/db
if DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beatthefine" pnpm tsx -e "const {db} = require('./src/client'); db.user.count().then(c => console.log('User count:', c)).catch(e => {console.error(e); process.exit(1)}).finally(() => db.\$disconnect())" 2>/dev/null; then
    echo "  ✅ Database client working"
else
    echo "  ❌ Database client not working"
fi

cd ../..

echo ""
echo "🎉 Authentication Setup Verification Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Start your development server: pnpm dev"
echo "2. Navigate to: http://localhost:3000"
echo "3. Try signing in with: admin@beatthefine.london / admin123"
echo ""
echo "🔍 If you still get errors:"
echo "- Make sure to restart your development server"
echo "- Check the browser console for detailed error messages"
echo "- Ensure port 3000 is not in use by another service"
