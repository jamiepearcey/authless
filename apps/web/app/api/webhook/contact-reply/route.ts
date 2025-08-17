import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { db } from "@db/base";

// JWT secret for webhook authentication
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "your-webhook-secret-key";

interface WebhookPayload {
  messageId: string;
  message: string;
  status?: "open" | "pending" | "in_progress" | "resolved" | "closed";
  priority?: "low" | "normal" | "high" | "urgent";
}

export async function POST(request: NextRequest) {
  try {
    // Verify JWT token in Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;

    try {
      decoded = verify(token, WEBHOOK_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Verify the payload
    const body: WebhookPayload = await request.json();
    
    if (!body.messageId || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields: messageId and message" },
        { status: 400 }
      );
    }

    // Verify the contact message exists
    const contactMessage = await db.contactMessage.findUnique({
      where: { id: body.messageId },
    });

    if (!contactMessage) {
      return NextResponse.json(
        { error: "Contact message not found" },
        { status: 404 }
      );
    }

    // Create the reply
    const reply = await db.contactReply.create({
      data: {
        contactMessageId: body.messageId,
        message: body.message,
        isFromUser: false, // This is from support/external system
      },
    });

    // Update the contact message status if provided
    if (body.status) {
      await db.contactMessage.update({
        where: { id: body.messageId },
        data: { status: body.status },
      });
    }

    // Update priority if provided
    if (body.priority) {
      await db.contactMessage.update({
        where: { id: body.messageId },
        data: { priority: body.priority },
      });
    }

    return NextResponse.json({
      success: true,
      replyId: reply.id,
      message: "Reply added successfully",
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Optional: Add GET method for webhook verification (useful for some services)
export async function GET() {
  return NextResponse.json({
    message: "Contact reply webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
