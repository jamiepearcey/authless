#!/usr/bin/env tsx

import { sign } from "jsonwebtoken";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "your-webhook-secret-key";

interface TokenPayload {
  messageId?: string;
  action: "reply" | "status_update" | "priority_update";
  exp?: number;
}

function generateWebhookToken(payload: TokenPayload, expiresIn: string = "1h"): string {
  const tokenPayload: TokenPayload & { exp: number } = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
  };

  return sign(tokenPayload, WEBHOOK_SECRET, { expiresIn });
}

function showHelp() {
  console.log(`
🔐 Webhook Token Generator

Usage: tsx webhook-token.ts [options]

Options:
  --message-id <id>     Contact message ID (optional)
  --action <action>     Action type: reply, status_update, priority_update
  --expires <time>      Expiration time (default: 1h)
  --help               Show this help message

Examples:
  # Generate token for adding a reply
  tsx webhook-token.ts --action reply --message-id "msg_123"

  # Generate token for status update
  tsx webhook-token.ts --action status_update --message-id "msg_123"

  # Generate token with custom expiration
  tsx webhook-token.ts --action reply --expires "30m"

Actions:
  - reply: Add a reply to a contact message
  - status_update: Update message status
  - priority_update: Update message priority

Environment Variables:
  WEBHOOK_SECRET: Secret key for JWT signing (default: "your-webhook-secret-key")
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  let messageId: string | undefined;
  let action: string | undefined;
  let expiresIn = "1h";

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--message-id":
        messageId = args[++i];
        break;
      case "--action":
        action = args[++i];
        break;
      case "--expires":
        expiresIn = args[++i];
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        showHelp();
        process.exit(1);
    }
  }

  if (!action) {
    console.error("Error: --action is required");
    showHelp();
    process.exit(1);
  }

  if (!["reply", "status_update", "priority_update"].includes(action)) {
    console.error("Error: Invalid action. Must be one of: reply, status_update, priority_update");
    process.exit(1);
  }

  const payload: TokenPayload = {
    action: action as any,
    ...(messageId && { messageId }),
  };

  try {
    const token = generateWebhookToken(payload, expiresIn);
    
    console.log("\n🔐 Generated Webhook Token:");
    console.log("=" * 50);
    console.log(`Token: ${token}`);
    console.log(`Action: ${action}`);
    if (messageId) console.log(`Message ID: ${messageId}`);
    console.log(`Expires: ${expiresIn}`);
    console.log("\n📋 Usage Example:");
    console.log(`curl -X POST ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhook/contact-reply \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"messageId": "${messageId || "your_message_id"}", "message": "Your reply message"}'`);
    
  } catch (error) {
    console.error("Error generating token:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
