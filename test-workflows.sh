#!/bin/bash

echo "🧪 Testing Temporal Workflows..."

# Test Hello World Workflow
echo "1. Testing Hello World Workflow..."
curl -s -X GET "http://localhost:3000/api/workflows/hello?name=TestUser&includeRandomFact=true&wait=true" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n2. Testing User Onboarding Workflow..."
curl -s -X POST "http://localhost:3000/api/workflows/user-onboarding" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "email": "test@example.com", 
    "name": "Test User",
    "tenantId": "test-tenant-123",
    "emailVerificationToken": "verify-token-123",
    "skipEmailVerification": true,
    "waitForResult": true
  }' | jq '.'


echo -e "\n✅ Workflow testing complete!"
