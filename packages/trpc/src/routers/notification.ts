import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, platformAdminProcedure } from "../base";

// Real-time notification adapter interface
export interface NotificationAdapter {
  publish(notification: any): Promise<void>;
  subscribe(userId: string, callback: (notification: any) => void): () => void;
}

// In-memory adapter implementation (can be replaced with Redis, WebSocket, etc.)
class InMemoryNotificationAdapter implements NotificationAdapter {
  private subscribers = new Map<string, Set<(notification: any) => void>>();
  private notifications = new Map<string, any>();

  async publish(notification: any): Promise<void> {
    // Store the notification
    this.notifications.set(notification.id, notification);
    
    // If it's a global notification (no specific targeting), send to all subscribers
    if (!notification.tenantId && !notification.role && !notification.userId) {
      for (const [userId, callbacks] of this.subscribers) {
        for (const callback of callbacks) {
          try {
            callback(notification);
          } catch (error) {
            console.error(`Error delivering notification to user ${userId}:`, error);
          }
        }
      }
    } else {
      // For targeted notifications, we'd need to look up the specific users
      // This is a simplified implementation
      console.log(`Targeted notification published:`, notification);
    }
  }

  subscribe(userId: string, callback: (notification: any) => void): () => void {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set());
    }
    
    this.subscribers.get(userId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const userSubscribers = this.subscribers.get(userId);
      if (userSubscribers) {
        userSubscribers.delete(callback);
        if (userSubscribers.size === 0) {
          this.subscribers.delete(userId);
        }
      }
    };
  }

  getNotifications(userId: string): any[] {
    return Array.from(this.notifications.values());
  }
}

// Global notification adapter instance
export const notificationAdapter = new InMemoryNotificationAdapter();

// Input schemas
const createNotificationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  
  // Target scope - if all are null, it becomes a global notification
  tenantId: z.string().optional(),
  role: z.string().optional(),
  userId: z.string().optional(),
  
  // Metadata
  metadata: z.record(z.any()).optional(),
  expiresAt: z.date().optional(),
});

const updateNotificationSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["info", "success", "warning", "error"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  status: z.enum(["unread", "read", "archived"]).optional(),
  expiresAt: z.date().optional(),
});

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

export const notificationRouter = router({
  // Create a new notification
  createNotification: platformAdminProcedure
    .input(createNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      const { tenantId, role, userId } = input;
      
      // Create the notification
      const notification = await ctx.db.notification.create({
        data: {
          title: input.title,
          description: input.description,
          type: input.type,
          priority: input.priority,
          tenantId: input.tenantId,
          role: input.role,
          userId: input.userId,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          expiresAt: input.expiresAt,
        },
      });

      // If targeting specific users, create recipient records
      if (userId) {
        await ctx.db.notificationRecipient.create({
          data: {
            notificationId: notification.id,
            userId: userId,
          },
        });
      } else if (tenantId && role) {
        // Find all users with the specified role in the tenant
        const memberships = await ctx.db.membership.findMany({
          where: {
            tenantId: tenantId,
            role: role,
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
          await ctx.db.notificationRecipient.createMany({
            data: recipientData,
          });
        }
      } else if (tenantId) {
        // Find all active members of the tenant
        const memberships = await ctx.db.membership.findMany({
          where: {
            tenantId: tenantId,
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
          await ctx.db.notificationRecipient.createMany({
            data: recipientData,
          });
        }
      } else {
        // Global notification - create recipient records for ALL users
        const allUsers = await ctx.db.user.findMany({
          where: { status: "active" },
          select: { id: true },
        });

        if (allUsers.length > 0) {
          const recipientData = allUsers.map(user => ({
            notificationId: notification.id,
            userId: user.id,
          }));

          await ctx.db.notificationRecipient.createMany({
            data: recipientData,
          });
        }
      }

      // Publish to real-time adapter
      await notificationAdapter.publish(notification);

      // Trigger webhooks if any are configured
      await triggerWebhooks(ctx, "notification.created", {
        notification,
        targetScope: { tenantId, role, userId },
      });

      return notification;
    }),

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

  // Admin: Update notification
  updateNotification: platformAdminProcedure
    .input(updateNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const notification = await ctx.db.notification.update({
        where: { id },
        data: updateData,
      });

      // Publish updated notification to real-time adapter
      await notificationAdapter.publish(notification);

      // Trigger webhooks
      await triggerWebhooks(ctx, "notification.updated", { notification });

      return notification;
    }),

  // Admin: Delete notification
  deleteNotification: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.db.notification.delete({
        where: { id: input.id },
      });

      // Trigger webhooks
      await triggerWebhooks(ctx, "notification.deleted", { notification });

      return notification;
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

  // Real-time subscription endpoint
  subscribeToNotifications: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // In a real implementation, this would establish a WebSocket connection
      // For now, we'll return a subscription token that the client can use
      const subscriptionToken = `sub_${userId}_${Date.now()}`;
      
      return {
        subscriptionToken,
        message: "Subscription established. Use the token for real-time updates.",
      };
    }),
});

// Helper function to trigger webhooks
async function triggerWebhooks(ctx: any, event: string, data: any) {
  try {
    const webhooks = await ctx.db.webhookEndpoint.findMany({
      where: {
        isActive: true,
        events: {
          contains: event,
        },
      },
    });

    // In a real implementation, you'd send these webhooks asynchronously
    // For now, we'll just log them
    console.log(`Triggering webhooks for event: ${event}`, {
      webhookCount: webhooks.length,
      data,
    });

    // TODO: Implement actual webhook delivery
    // This could be done with a queue system like Bull/BullMQ
    // or with a background job processor
  } catch (error) {
    console.error("Error triggering webhooks:", error);
  }
}
