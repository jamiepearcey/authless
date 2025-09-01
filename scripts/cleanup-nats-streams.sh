#!/bin/bash

# Script to clean up existing NATS JetStream streams and consumers
# This resolves the workqueue stream conflicts

echo "🧹 Cleaning up NATS JetStream streams and consumers..."

# Check if NATS CLI is available
if ! command -v nats &> /dev/null; then
    echo "❌ NATS CLI not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install nats-io/nats-tools/nats
    else
        echo "Please install NATS CLI manually: https://github.com/nats-io/natscli"
        exit 1
    fi
fi

# Connect to NATS and clean up streams
echo "🔍 Checking existing streams..."

# List existing streams
nats stream list --server nats://localhost:4223 2>/dev/null || echo "No streams found or NATS not running"

# Delete the EVENTS stream if it exists (this will also delete all consumers)
echo "🗑️  Deleting EVENTS stream and all its consumers..."
nats stream delete EVENTS --server nats://localhost:4223 --force 2>/dev/null || echo "EVENTS stream not found or already deleted"

# List streams after cleanup
echo "📋 Remaining streams:"
nats stream list --server nats://localhost:4223 2>/dev/null || echo "No streams remaining"

echo "✅ NATS stream cleanup complete!"
echo ""
echo "🚀 The services will now create a new EVENTS stream with fan-out configuration"
echo "   - Stream type: Fan-out (not workqueue)"
echo "   - Subjects: events.*"
echo "   - Multiple consumers allowed"
