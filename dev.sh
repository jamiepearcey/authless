#!/bin/bash

# Development script with proper process management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PID file for tracking processes
PID_FILE=".dev-pids"

# Function to cleanup processes
cleanup() {
    echo -e "${YELLOW}🔄 Stopping development services...${NC}"
    
    if [ -f "$PID_FILE" ]; then
        while read -r pid; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                echo "Stopping process $pid"
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    
    # Fallback cleanup
    pkill -f "turbo run dev" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "tsx src" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

# Check if already running
if [ -f "$PID_FILE" ]; then
    echo -e "${YELLOW}⚠️  Development services may already be running${NC}"
    echo "Run './dev.sh stop' to stop them first"
fi

# Parse command line arguments
case "${1:-start}" in
    "stop")
        cleanup
        exit 0
        ;;
    "web-only")
        echo -e "${BLUE}🌐 Starting web application only...${NC}"
        cd apps/web
        pnpm dev &
        echo $! >> "../../$PID_FILE"
        ;;
    "essential")
        echo -e "${BLUE}🚀 Starting essential services...${NC}"
        
        # Start web app
        echo -e "${GREEN}📱 Starting web application...${NC}"
        cd apps/web
        pnpm dev &
        echo $! >> "../../$PID_FILE"
        cd ../..
        
        # Start outbox service (if working)
        echo -e "${GREEN}📦 Starting outbox service...${NC}"
        cd services/outbox-service
        pnpm dev &
        echo $! >> "../../$PID_FILE"
        cd ../..
        ;;
    "all")
        echo -e "${BLUE}🚀 Starting all services...${NC}"
        
        # Kill any processes on service ports first
        echo -e "${YELLOW}🔍 Resolving port conflicts...${NC}"
        ./scripts/kill-port-conflicts.sh
        
        # Clean up NATS streams to resolve workqueue conflicts
        echo -e "${YELLOW}🧹 Cleaning up NATS streams...${NC}"
        ./scripts/cleanup-nats-streams.sh
        
        pnpm turbo run dev --concurrency=15 &
        echo $! >> "$PID_FILE"
        ;;
    "start"|*)
        echo -e "${BLUE}🚀 Starting development environment...${NC}"
        echo -e "${GREEN}📱 Web application starting...${NC}"
        
        cd apps/web
        pnpm dev &
        echo $! >> "../../$PID_FILE"
        cd ../..
        ;;
esac

echo -e "${GREEN}✅ Services started!${NC}"
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo "   Main app: http://localhost:3000"
echo "   ACME tenant: http://acme.test:3000"
echo "   Startup tenant: http://startup.test:3000"
echo "   Enterprise tenant: http://enterprise.test:3000"
echo ""
echo -e "${YELLOW}🛑 To stop: ./dev.sh stop${NC}"

# Wait for processes
wait
