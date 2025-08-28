import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@db/base";

// Webhook payload schema
const webhookPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  
  // Target scope - if all are null, it becomes a global notification
  tenantId: z.string().optional(),
  role: z.string().optional(),
  userId: z.string().optional(),
  
  // Metadata
  metadata: z.record(z.any()).optional(),
  expiresAt: z.string().datetime().optional(),
  
  // Webhook authentication
  signature: z.string().optional(),
  timestamp: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate webhook payload
    const payload = webhookPayloadSchema.parse(body);
    
    // TODO: Implement webhook signature verification
    // const signature = request.headers.get("x-webhook-signature");
    // const timestamp = request.headers.get("x-webhook-timestamp");
    
    // If no target scope is set, it becomes a global notification
    // This is now allowed and will be sent to all users

    // Create the notification
    const notification = await db.notification.create({
      data: {
        title: payload.title,
        description: payload.description,
        type: payload.type,
        priority: payload.priority,
        tenantId: payload.tenantId,
        role: payload.role,
        userId: payload.userId,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      },
    });

    // If targeting specific users, create recipient records
    if (payload.userId) {
      await db.notificationRecipient.create({
        data: {
          notificationId: notification.id,
          userId: payload.userId,
        },
      });
    } else if (payload.tenantId && payload.role) {
      // Find all users with the specified role in the tenant
      const memberships = await db.membership.findMany({
        where: {
          tenantId: payload.tenantId,
          role: payload.role,
          status: "active",
        },
        select: { userId: true },
      });

      // Create recipient records for all matching users
      const recipientData = memberships.map(membership => ({
        notificationId: notification.id,
        userId: membership.userId,
      }));

      if (recipientData.length > 0) {
        await db.notificationRecipient.createMany({
          data: recipientData,
        });
      }
    } else if (payload.tenantId) {
      // Find all active members of the tenant
      const memberships = await db.membership.findMany({
        where: {
          tenantId: payload.tenantId,
          status: "active",
        },
        select: { userId: true },
      });

      // Create recipient records for all tenant members
      const recipientData = memberships.map(membership => ({
        notificationId: notification.id,
        userId: membership.userId,
      }));

      if (recipientData.length > 0) {
        await db.notificationRecipient.createMany({
          data: recipientData,
        });
      }
    } else {
      // Global notification - create recipient records for ALL users
      const allUsers = await db.user.findMany({
        where: { status: "active" },
        select: { id: true },
      });

      if (allUsers.length > 0) {
        const recipientData = allUsers.map(user => ({
          notificationId: notification.id,
          userId: user.id,
        }));

        await db.notificationRecipient.createMany({
          data: recipientData,
        });
      }
    }

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      recipientsCreated: true,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Notification webhook endpoint",
    usage: "POST with notification payload to create notifications",
    example: {
      title: "System Maintenance",
      description: "Scheduled maintenance on Sunday at 2 AM",
      type: "warning",
      priority: "normal",
      // No target scope = global notification to all users
    },
  });
}


