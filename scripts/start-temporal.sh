#!/bin/bash

# Start Temporal Integration Script
# This script helps you get started with Temporal workflows

set -e

echo "🚀 Starting Temporal Integration for Authless"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if docker-compose is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    echo "Please install Docker and try again"
    exit 1
fi

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed or not in PATH${NC}"
    echo "Please install pnpm and try again"
    exit 1
fi

echo -e "${BLUE}📦 Installing workflow dependencies...${NC}"
cd workflows
pnpm install
cd ..

echo -e "${BLUE}🐳 Starting Temporal server with Docker Compose...${NC}"
docker compose up -d temporal

echo -e "${YELLOW}⏳ Waiting for Temporal to be ready...${NC}"
sleep 10

# Check if Temporal is responding
TEMPORAL_READY=false
for i in {1..30}; do
    if curl -f http://localhost:8233/health > /dev/null 2>&1; then
        TEMPORAL_READY=true
        break
    fi
    echo "Waiting for Temporal... ($i/30)"
    sleep 2
done

if [ "$TEMPORAL_READY" = false ]; then
    echo -e "${RED}❌ Temporal failed to start within timeout${NC}"
    echo "Check Docker logs: docker compose logs temporal"
    exit 1
fi

echo -e "${GREEN}✅ Temporal is ready!${NC}"
echo -e "${BLUE}🔧 Building workflows...${NC}"
cd workflows
pnpm run build
cd ..

echo -e "${GREEN}🎉 Temporal integration setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Start the workflow worker:"
echo "   ${YELLOW}pnpm run temporal:worker${NC}"
echo ""
echo "2. Start your Next.js development server:"  
echo "   ${YELLOW}pnpm run dev${NC}"
echo ""
echo "3. Visit the demo page:"
echo "   ${YELLOW}http://localhost:3000/workflows/demo${NC}"
echo ""
echo "4. View the Temporal Web UI:"
echo "   ${YELLOW}http://localhost:8233${NC}"
echo ""
echo -e "${BLUE}API Endpoints:${NC}"
echo "• Start workflow: GET /api/workflows/hello?name=World"
echo "• Check status: GET /api/workflows/hello/status?workflowId=<id>"
echo ""
echo -e "${GREEN}Happy workflow orchestration! 🎯${NC}"