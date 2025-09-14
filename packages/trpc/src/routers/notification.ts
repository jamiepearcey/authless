import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, platformAdminProcedure } from "../middleware";
import { centrifugoService } from "../centrifugo";
import { emailNotificationService } from "../email-service";

// Real-time notification adapter interface
export interface NotificationAdapter {
  publish(notification: any): Promise<void>;
  subscribe(userId: string, callback: (notification: any) => void): () => void;
}

// Centrifugo-based notification adapter
class CentrifugoNotificationAdapter implements NotificationAdapter {
  async publish(notification: any): Promise<void> {
    // Publish to Centrifugo with appropriate channels based on notification scope
    const scope = {
      tenantId: notification.tenantId,
      role: notification.role,
      userId: notification.userId,
    };

    console.log('🔍 [CentrifugoNotificationAdapter] Publishing notification:', {
      id: notification.id,
      title: notification.title,
      scope: scope
    });

    const success = await centrifugoService.publishNotification(notification, scope);
    
    if (!success) {
      console.error('Failed to publish notification to Centrifugo:', notification.id);
    } else {
      console.log('✅ Published notification to Centrifugo:', notification.id, 'scope:', scope);
    }
  }

  // This is handled by the client-side Centrifugo connection
  subscribe(userId: string, callback: (notification: any) => void): () => void {
    console.log(`Subscription for user ${userId} should be handled client-side via Centrifugo`);
    // Return a no-op unsubscribe function since this is handled client-side
    return () => {};
  }
}

// In-memory fallback adapter (for development/testing)
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

// Use Centrifugo adapter by default, fallback to in-memory for development
export const notificationAdapter = process.env.NODE_ENV === 'test' 
  ? new InMemoryNotificationAdapter()
  : new CentrifugoNotificationAdapter();

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
      
      console.log('🔍 [createNotification] Input received:', {
        title: input.title,
        tenantId,
        role,
        userId,
        type: input.type,
        priority: input.priority
      });
      
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

      console.log('🔍 [createNotification] Notification created:', {
        id: notification.id,
        tenantId: notification.tenantId,
        role: notification.role,
        userId: notification.userId
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

      // Send email notifications to users who have email notifications enabled
      await sendEmailNotifications(ctx, notification, { tenantId, role, userId });

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

// Helper function to send email notifications to users who have email notifications enabled
async function sendEmailNotifications(ctx: any, notification: any, targetScope: { tenantId?: string | null; role?: string | null; userId?: string | null }) {
  try {
    // Get all users who should receive this notification and have email notifications enabled
    let userIds: string[] = [];

    if (targetScope.userId) {
      // Single user notification
      userIds = [targetScope.userId];
    } else if (targetScope.tenantId && targetScope.role) {
      // Role-based notification in a tenant
      const memberships = await ctx.db.membership.findMany({
        where: {
          tenantId: targetScope.tenantId,
          role: targetScope.role,
          status: "active",
        },
        select: { userId: true },
      });
      userIds = memberships.map((m: { userId: string }) => m.userId);
    } else if (targetScope.tenantId) {
      // Tenant-wide notification
      const memberships = await ctx.db.membership.findMany({
        where: {
          tenantId: targetScope.tenantId,
          status: "active",
        },
        select: { userId: true },
      });
      userIds = memberships.map((m: { userId: string }) => m.userId);
    } else {
      // Global notification
      const allUsers = await ctx.db.user.findMany({
        where: { status: "active" },
        select: { id: true },
      });
      userIds = allUsers.map((u: { id: string }) => u.id);
    }

    if (userIds.length === 0) {
      console.log('📧 No users to send email notifications to');
      return;
    }

    // Get user details and check email notification preferences
    const users = await ctx.db.user.findMany({
      where: {
        id: { in: userIds },
        emailNotifications: true, // Only users who have email notifications enabled
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (users.length === 0) {
      console.log('📧 No users with email notifications enabled');
      return;
    }

    console.log(`📧 Sending email notifications to ${users.length} users`);

    // Prepare email notification data
    const emailNotifications = users.map((user: { id: string; email: string | null; name: string | null }) => ({
      notification: {
        id: notification.id,
        title: notification.title,
        description: notification.description,
        type: notification.type,
        priority: notification.priority,
        createdAt: notification.createdAt.toISOString(),
      },
      recipient: {
        id: user.id,
        email: user.email!,
        name: user.name,
      },
      targetScope,
    }));

    // Send email notifications
    const result = await emailNotificationService.sendBulkNotificationEmails(emailNotifications);
    
    console.log('📧 Email notification results:', result);
  } catch (error) {
    console.error('📧 Error sending email notifications:', error);
  }
}

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
