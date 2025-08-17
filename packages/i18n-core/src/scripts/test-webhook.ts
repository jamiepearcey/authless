#!/usr/bin/env tsx

import { sign } from "jsonwebtoken";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "your-webhook-secret-key";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface TestCase {
  name: string;
  payload: any;
  tokenPayload: any;
  expectedStatus: number;
}

const testCases: TestCase[] = [
  {
    name: "Valid reply with status update",
    payload: {
      messageId: "test_msg_123",
      message: "This is a test reply from the support team.",
      status: "in_progress",
      priority: "high"
    },
    tokenPayload: {
      action: "reply",
      messageId: "test_msg_123"
    },
    expectedStatus: 200
  },
  {
    name: "Valid reply without optional fields",
    payload: {
      messageId: "test_msg_456",
      message: "Simple test reply."
    },
    tokenPayload: {
      action: "reply",
      messageId: "test_msg_456"
    },
    expectedStatus: 200
  },
  {
    name: "Missing messageId",
    payload: {
      message: "Test reply without message ID."
    },
    tokenPayload: {
      action: "reply"
    },
    expectedStatus: 400
  },
  {
    name: "Missing message",
    payload: {
      messageId: "test_msg_789"
    },
    tokenPayload: {
      action: "reply",
      messageId: "test_msg_789"
    },
    expectedStatus: 400
  },
  {
    name: "Invalid token",
    payload: {
      messageId: "test_msg_999",
      message: "Test reply with invalid token."
    },
    tokenPayload: null,
    expectedStatus: 401
  },
  {
    name: "Expired token",
    payload: {
      messageId: "test_msg_888",
      message: "Test reply with expired token."
    },
    tokenPayload: {
      action: "reply",
      messageId: "test_msg_888",
      exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    },
    expectedStatus: 401
  }
];

function generateToken(payload: any, expiresIn: string = "1h"): string {
  if (!payload) return "invalid_token";
  
  const tokenPayload = {
    ...payload,
    exp: payload.exp || Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  };

  return sign(tokenPayload, WEBHOOK_SECRET, { expiresIn });
}

async function testWebhook(testCase: TestCase): Promise<boolean> {
  const token = generateToken(testCase.tokenPayload);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  
  if (token !== "invalid_token") {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${APP_URL}/api/webhook/contact-reply`, {
      method: "POST",
      headers,
      body: JSON.stringify(testCase.payload)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { error: "Invalid JSON response" };
    }

    const passed = response.status === testCase.expectedStatus;
    
    console.log(`\n🧪 ${testCase.name}`);
    console.log(`   Status: ${response.status} ${passed ? "✅" : "❌"} (expected: ${testCase.expectedStatus})`);
    console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`);
    
    return passed;
  } catch (error) {
    console.log(`\n🧪 ${testCase.name}`);
    console.log(`   Error: ${error.message} ❌`);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting Webhook Tests");
  console.log(`📍 Testing against: ${APP_URL}`);
  console.log(`🔑 Using secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);
  
  let passed = 0;
  let total = testCases.length;

  for (const testCase of testCases) {
    const result = await testWebhook(testCase);
    if (result) passed++;
  }

  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("❌ Some tests failed. Check the output above.");
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🧪 Webhook Test Suite

Usage: tsx test-webhook.ts [options]

Environment Variables:
  WEBHOOK_SECRET: Secret key for JWT signing
  NEXT_PUBLIC_APP_URL: Your app's URL (default: http://localhost:3000)

Examples:
  # Run all tests
  tsx test-webhook.ts

  # Run with custom secret
  WEBHOOK_SECRET=my-secret tsx test-webhook.ts

  # Test against production
  NEXT_PUBLIC_APP_URL=https://myapp.com tsx test-webhook.ts

Note: Make sure your app is running and the contact system is set up before running tests.
`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  runTests().catch(console.error);
}
