#!/bin/bash

# Script to kill processes on ports used by services
# This prevents EADDRINUSE errors when starting services

echo "🔍 Checking for port conflicts..."

# Define the ports used by services
PORTS=(8081 8082 8083 8084 8085 9091 9092 9093 9094 9095)

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    
    if [ ! -z "$pid" ]; then
        echo "⚠️  Killing process $pid on port $port"
        kill -9 $pid 2>/dev/null
        sleep 1
        
        # Verify it's killed
        local new_pid=$(lsof -ti:$port)
        if [ ! -z "$new_pid" ]; then
            echo "❌ Failed to kill process on port $port"
            return 1
        else
            echo "✅ Port $port is now free"
        fi
    else
        echo "✅ Port $port is already free"
    fi
}

# Kill processes on all service ports
for port in "${PORTS[@]}"; do
    kill_port $port
done

echo "🎯 Port conflict resolution complete!"
echo ""
echo "📋 Service ports:"
echo "   Audit Service: 8081 (health) / 9091 (metrics)"
echo "   Outbox Service: 8082 (health) / 9092 (metrics)" 
echo "   Email Service: 8083 (health) / 9093 (metrics)"
echo "   Realtime Service: 8084 (health) / 9094 (metrics)"
echo "   Webhook Service: 8085 (health) / 9095 (metrics)"
