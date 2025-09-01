#!/bin/bash

echo "🚀 Starting essential development services..."

# Kill any existing processes
echo "🔄 Stopping existing services..."
pkill -f "turbo run dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Start only the web app and essential services
echo "🌐 Starting web application..."
cd apps/web && pnpm dev &
WEB_PID=$!

echo "📦 Starting outbox service..."
cd ../../services/outbox-service && pnpm dev &
OUTBOX_PID=$!

echo "✅ Essential services started:"
echo "   Web App PID: $WEB_PID"
echo "   Outbox Service PID: $OUTBOX_PID"
echo ""
echo "🌐 Access your app at:"
echo "   Regular: http://localhost:3000"
echo "   Tenants: http://acme.test:3000"
echo ""
echo "🛑 To stop all services: kill $WEB_PID $OUTBOX_PID"

# Keep script running
wait
