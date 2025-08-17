#!/bin/bash

echo "🚀 Setting up Authless monorepo..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "npm install -g pnpm@8.0.0"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Some features will be limited."
    echo "Install Docker from: https://docs.docker.com/get-docker/"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo "✅ .env file already exists."
fi

# Ask user which database to use
echo ""
echo "🗄️  Choose your database setup:"
echo "1) SQLite (default, file-based, no setup required)"
echo "2) PostgreSQL (Docker, recommended for production-like development)"
echo "3) Skip database setup for now"
read -p "Enter your choice (1-3): " db_choice

case $db_choice in
    1)
        echo "🗄️  Setting up SQLite..."
        pnpm run db:switch:sqlite
        pnpm run db:generate
        pnpm run db:migrate
        pnpm run db:seed
        echo "✅ SQLite setup complete!"
        ;;
    2)
        if command -v docker &> /dev/null; then
            echo "🐳 Starting PostgreSQL with Docker..."
            pnpm run docker:up
            
            # Wait for PostgreSQL to be ready
            echo "⏳ Waiting for PostgreSQL to be ready..."
            sleep 10
            
            # Update .env to use PostgreSQL
            sed -i '' 's|DATABASE_URL="file:./dev.db"|DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beatthefine"|' .env
            
            echo "🗄️  Setting up PostgreSQL..."
            pnpm run db:switch:postgresql
            pnpm run db:generate
            pnpm run db:migrate
            pnpm run db:seed
            echo "✅ PostgreSQL setup complete!"
        else
            echo "❌ Docker is not available. Falling back to SQLite..."
            pnpm run db:switch:sqlite
            pnpm run db:generate
            pnpm run db:migrate
            pnpm run db:seed
        fi
        ;;
    3)
        echo "⏭️  Skipping database setup."
        ;;
    *)
        echo "❌ Invalid choice. Falling back to SQLite..."
        pnpm run db:switch:sqlite
        pnpm run db:generate
        pnpm run db:migrate
        pnpm run db:seed
        ;;
esac

echo ""
echo "🎉 Setup complete! You can now:"
echo "• Run 'pnpm run dev' to start development servers"
echo "• Run 'pnpm run db:studio' to open Prisma Studio"
echo "• Run 'pnpm run docker:up' to start PostgreSQL (if using Docker)"
echo ""
echo "📚 Check the README.md for more information."
