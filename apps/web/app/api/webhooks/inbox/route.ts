import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@db/base";

// Schema for incoming webhook payload
const InboxWebhookSchema = z.object({
  eventType: z.string().min(1),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  tenantId: z.string().optional(),
  payload: z.any(), // Flexible payload structure
  idempotencyKey: z.string().optional(),
  source: z.string().optional(),
  sourceId: z.string().optional(),
  traceId: z.string().optional(),
});

// Optional authentication schema
const AuthHeaderSchema = z.object({
  authorization: z.string().optional(),
  "x-api-key": z.string().optional(),
  "x-webhook-secret": z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate payload
    const validatedData = InboxWebhookSchema.parse(body);
    
    // Optional: Validate authentication headers
    const authHeaders = AuthHeaderSchema.parse({
      authorization: request.headers.get("authorization"),
      "x-api-key": request.headers.get("x-api-key"),
      "x-webhook-secret": request.headers.get("x-webhook-secret"),
    });
    
    // Optional: Add authentication logic here
    // For now, we'll accept all requests
    
    // Create inbox event
    const inboxEvent = await db.inboxEvent.create({
      data: {
        eventType: validatedData.eventType,
        aggregateType: validatedData.aggregateType,
        aggregateId: validatedData.aggregateId,
        tenantId: validatedData.tenantId,
        payloadJson: validatedData.payload,
        idempotencyKey: validatedData.idempotencyKey,
        source: validatedData.source,
        sourceId: validatedData.sourceId,
        traceId: validatedData.traceId,
        status: "received",
      },
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Inbox event created successfully",
        eventId: inboxEvent.id,
        eventType: inboxEvent.eventType,
        aggregateId: inboxEvent.aggregateId,
        status: inboxEvent.status,
        createdAt: inboxEvent.createdAt,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Webhook inbox error:", error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payload",
          errors: error.errors.map(err => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === "development" ? error.message : "An error occurred",
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Webhook-Secret",
    },
  });
}
