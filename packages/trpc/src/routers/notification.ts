import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, platformAdminProcedure } from "../middleware";
import { OutboxEvents } from "../outbox-service";
import { centrifugoService } from "@shared/base";

// DEPRECATED: Notification adapters removed - all notifications now flow through
// outbox → notification-service → realtime-service pattern

// Input schemas (only keeping schemas that are actually used)

const markAsReadSchema = z.object({
  notificationId: z.string(),
  userId: z.string(),
});

const getNotificationsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(["unread", "read", "archived"]).optional(),
  type: z.enum(["info", "success", "warning", "error"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

const webhookEndpointSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Valid URL is required"),
  secret: z.string().optional(),
  events: z.array(z.string()).min(1, "At least one event type is required"),
  tenantId: z.string().optional(),
});

const createNotificationIntentSchema = z.object({
  type: z.string().min(1, "Notification type is required"),
  recipients: z.union([
    z.array(z.string()), // Direct user IDs
    z.object({
      type: z.enum(['user', 'role', 'tenant', 'global']),
      ids: z.array(z.string()).optional(), // Optional for global/tenant-wide messages
      roles: z.array(z.string()).optional(), // Optional role filter for tenant messages
    })
  ]),
  channels: z.array(z.enum(['email', 'web', 'sms'])).default(['web']),
  payloadJson: z.record(z.any()),
  tenantId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  expiresAt: z.date().optional(),
}).refine((data) => {
  // Validate recipients based on type
  if (Array.isArray(data.recipients)) {
    return data.recipients.length > 0; // Direct user IDs must have at least one
  }
  
  const recipientObj = data.recipients;
  
  // For global messages, no specific validation needed
  if (recipientObj.type === 'global') {
    return true;
  }
  
  // For tenant messages, no specific IDs needed
  if (recipientObj.type === 'tenant') {
    return true;
  }
  
  // For user and role types, require IDs
  if (recipientObj.type === 'user' || recipientObj.type === 'role') {
    return recipientObj.ids && recipientObj.ids.length > 0;
  }
  
  return true;
}, {
  message: "Invalid recipient configuration",
  path: ["recipients"]
});

export const notificationRouter = router({
  // Create a notification intent (explicit notification request)
  createNotificationIntent: protectedProcedure
    .input(createNotificationIntentSchema)
    .mutation(async ({ ctx, input }) => {
      const { tenantId, type, recipients, channels, payloadJson, idempotencyKey, expiresAt } = input;
      
      console.log('🔍 [createNotificationIntent] Input received:', {
        type,
        tenantId,
        recipients,
        channels,
        idempotencyKey
      });

      // Create notification intent record
      const intent = await ctx.db.notificationIntent.create({
        data: {
          tenantId: tenantId || ctx.session?.user?.tenantId,
          type,
          recipients: recipients as any, // Prisma will handle JSON serialization
          channels: channels as any, // Store selected channels
          payloadJson: payloadJson as any,
          idempotencyKey,
          expiresAt,
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
          traceId: ctx.trace?.traceId
        },
      });

      console.log('🔍 [createNotificationIntent] Intent created:', {
        id: intent.id,
        type: intent.type,
        status: intent.status
      });

      // Publish to JetStream for processing by realtime service
      try {
        const eventId = await ctx.outbox.publishNotificationIntentEvent(
          OutboxEvents.NOTIFICATION_INTENT_CREATED,
          intent.id,
          {
            intentId: intent.id,
            tenantId: intent.tenantId,
            type: intent.type,
            recipients: intent.recipients,
            channels: intent.channels,
            payloadJson: intent.payloadJson,
            createdAt: intent.createdAt.toISOString(),
            idempotencyKey: intent.idempotencyKey,
            expiresAt: intent.expiresAt?.toISOString(),
            traceId: intent.traceId
          },
          { 
            traceId: ctx.trace?.traceId,
            idempotencyKey: `notification.intent.${intent.id}.${Date.now()}`
          }
        );
        
        console.log('🔍 [createNotificationIntent] Published to outbox:', eventId);
      } catch (outboxError) {
        console.error('🔍 [createNotificationIntent] Failed to publish to outbox:', outboxError);
        // Don't fail the request if outbox publishing fails - the intent is still created
      }

      return intent;
    }),

  // DEPRECATED: Manual notification creation removed in favor of outbox pattern
  // All notifications are now created automatically by notification-service
  // based on domain events (invitation.created, user.updated, etc.)
  // Use createNotificationIntent for explicit notification requests

  // Get notifications for the current user
  getUserNotifications: protectedProcedure
    .input(getNotificationsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, status, type, priority } = input;
      const userId = ctx.session.user.id;
 
      const notifications = await ctx.db.notificationRecipient.findMany({
        where: {
          userId: userId,
          ...(status && { status: status }),
          // Exclude archived notifications unless specifically requested
          ...(status !== "archived" && { status: { not: "archived" } }),
          notification: {
            ...(type && { type: type }),
            ...(priority && { priority: priority }),
            OR: [
              { expiresAt: null }, // Notifications with no expiration
              { expiresAt: { gte: new Date() } }, // Notifications that haven't expired yet
            ],
          },
        },
        include: {
          notification: {
            include: {
              tenant: {
                select: { name: true, slug: true },
              },
            },
          },
        },
        orderBy: {
          notification: {
            createdAt: "desc",
          },
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (notifications.length > limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: notifications,
        nextCursor,
      };
    }),

  // Get unread notification count for the current user
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const count = await ctx.db.notificationRecipient.count({
      where: {
        userId: userId,
        status: "unread",
        notification: {
          OR: [
            { expiresAt: null }, // Notifications with no expiration
            { expiresAt: { gte: new Date() } }, // Notifications that haven't expired yet
          ],
        },
      },
    });

    return count;
  }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(markAsReadSchema)
    .mutation(async ({ ctx, input }) => {
      const { notificationId, userId } = input;

      // Verify the user owns this notification
      const recipient = await ctx.db.notificationRecipient.findUnique({
        where: {
          notificationId_userId: {
            notificationId,
            userId,
          },
        },
      });

      if (!recipient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      const updatedRecipient = await ctx.db.notificationRecipient.update({
        where: {
          notificationId_userId: {
            notificationId,
            userId,
          },
        },
        data: {
          status: "read",
          readAt: new Date(),
        },
      });

      return updatedRecipient;
    }),

  // Mark all notifications as read for the current user
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    await ctx.db.notificationRecipient.updateMany({
      where: {
        userId: userId,
        status: "unread",
      },
      data: {
        status: "read",
        readAt: new Date(),
      },
    });

    return { success: true };
  }),

  // Archive a notification
  archiveNotification: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const updatedRecipient = await ctx.db.notificationRecipient.update({
        where: {
          notificationId_userId: {
            notificationId: input.notificationId,
            userId: userId,
          },
        },
        data: {
          status: "archived",
        },
      });

      return updatedRecipient;
    }),

  // Admin: Get all notifications (with filtering)
  getAllNotifications: platformAdminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      tenantId: z.string().optional(),
      status: z.enum(["unread", "read", "archived"]).optional(),
      type: z.enum(["info", "success", "warning", "error"]).optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { limit, cursor, tenantId, status, type, priority } = input;

      const notifications = await ctx.db.notification.findMany({
        where: {
          tenantId: tenantId,
          status: status,
          type: type,
          priority: priority,
        },
        include: {
          tenant: {
            select: { name: true, slug: true },
          },
          recipients: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (notifications.length > limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: notifications,
        nextCursor,
      };
    }),

  // DEPRECATED: Manual notification updates removed in favor of outbox pattern

  // Admin: Delete notification
  deleteNotification: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;

      // Delete the notification (this will cascade to recipients)
      const deletedNotification = await ctx.db.notification.delete({
        where: { id },
      });

      return deletedNotification;
    }),

  // Batch delete notifications
  batchDeleteNotifications: platformAdminProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const { ids } = input;

      if (ids.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No notification IDs provided",
        });
      }

      // Delete multiple notifications (this will cascade to recipients)
      const result = await ctx.db.notification.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      return result.count;
    }),

  // Webhook management
  createWebhookEndpoint: platformAdminProcedure
    .input(webhookEndpointSchema)
    .mutation(async ({ ctx, input }) => {
      const webhook = await ctx.db.webhookEndpoint.create({
        data: {
          name: input.name,
          url: input.url,
          secret: input.secret,
          events: JSON.stringify(input.events),
          tenantId: input.tenantId,
        },
      });

      return webhook;
    }),

  getWebhookEndpoints: platformAdminProcedure
    .input(z.object({
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const webhooks = await ctx.db.webhookEndpoint.findMany({
        where: {
          tenantId: input.tenantId,
          isActive: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return webhooks;
    }),

  updateWebhookEndpoint: platformAdminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      url: z.string().url().optional(),
      secret: z.string().optional(),
      events: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const webhook = await ctx.db.webhookEndpoint.update({
        where: { id },
        data: {
          ...updateData,
          events: updateData.events ? JSON.stringify(updateData.events) : undefined,
        },
      });

      return webhook;
    }),

  deleteWebhookEndpoint: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const webhook = await ctx.db.webhookEndpoint.delete({
        where: { id: input.id },
      });

      return webhook;
    }),

  // Real-time subscription endpoint - generates Centrifugo token
  getCentrifugoToken: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User ID not found in session",
          });
        }
        
        // Generate Centrifugo JWT token for the user
        const token = centrifugoService.generateToken(userId, 3600); // 1 hour expiration
        const channels = centrifugoService.generateChannels({ userId });
        
        console.log('🎫 Generated Centrifugo token for user:', userId);
        console.log('📡 Channels for user:', channels);
        
        // Convert HTTP URL to WebSocket URL for client-side connection
        const httpUrl = process.env.CENTRIFUGO_URL || "http://localhost:8000";
        const wsDomain = httpUrl.replace('http://', 'ws://').replace('https://', 'wss://');
        const wsUrl = `${wsDomain}/connection/websocket`;
        
        return {
          token,
          centrifugoUrl: wsUrl, // WebSocket URL for client
          httpUrl: httpUrl, // HTTP URL for reference
          channels,
          message: "Use this token to connect to Centrifugo for real-time notifications",
        };
      } catch (error) {
        console.error('Error generating Centrifugo token:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to generate Centrifugo token",
          cause: error,
        });
      }
    }),

  // Legacy subscription endpoint (for backwards compatibility)
  subscribeToNotifications: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Generate Centrifugo token for real-time updates
      const token = centrifugoService.generateToken(userId, 3600);
      
      return {
        subscriptionToken: token,
        centrifugoUrl: process.env.CENTRIFUGO_URL || "http://localhost:8000",
        message: "Use Centrifugo for real-time updates.",
      };
    }),
});


// DEPRECATED: Manual webhook triggering removed
// Webhooks are now triggered automatically by notification-service based on events
