import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../middleware"; 
import { createSupportNotificationService } from "../support-notification-service";

// Notification visibility modes
const NotificationVisibilityEnum = z.enum(["UI", "EMAIL", "BOTH"]);

// Support notification types
const SupportNotificationTypeEnum = z.enum([
  "CASE_CREATED",
  "CASE_ASSIGNED", 
  "CASE_STATUS_CHANGED",
  "CASE_MESSAGE_RECEIVED",
  "CASE_MESSAGE_SENT",
  "CASE_FIRST_RESPONSE",
  "CASE_RESOLVED",
  "CASE_CLOSED"
]);

export const supportNotificationsRouter = router({
  // ==========================================
  // NOTIFICATION CREATION
  // ==========================================

  // Create support case notification
  createSupportNotification: protectedProcedure
    .input(z.object({
      type: SupportNotificationTypeEnum,
      caseId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      visibility: NotificationVisibilityEnum.default("BOTH"),
      tenantId: z.string().optional(),
      recipientType: z.enum(["USER", "ROLE", "ASSIGNEE", "CUSTOMER"]).default("USER"),
      recipients: z.array(z.string()).optional(), // User IDs or role names
      metadata: z.record(z.any()).optional(),
      suppressIfNoPreference: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const supportNotificationService = createSupportNotificationService(ctx.db);
      
      return await supportNotificationService.createSupportNotification({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  // ==========================================
  // USER PREFERENCE MANAGEMENT
  // ==========================================

  // Get user support notification preferences
  getUserSupportNotificationPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: {
            notifySupportRepliesUI: true,
            notifySupportRepliesEmail: true,
            emailNotifications: true,
          }
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        return {
          notifySupportRepliesUI: user.notifySupportRepliesUI,
          notifySupportRepliesEmail: user.notifySupportRepliesEmail,
          emailNotificationsEnabled: user.emailNotifications,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to get user support notification preferences:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get user support notification preferences",
        });
      }
    }),

  // Update user support notification preferences
  updateUserSupportNotificationPreferences: protectedProcedure
    .input(z.object({
      notifySupportRepliesUI: z.boolean().optional(),
      notifySupportRepliesEmail: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedUser = await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            notifySupportRepliesUI: input.notifySupportRepliesUI,
            notifySupportRepliesEmail: input.notifySupportRepliesEmail,
          },
          select: {
            notifySupportRepliesUI: true,
            notifySupportRepliesEmail: true,
          }
        });

        // Log preference change
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id,
            action: "support_notification_preferences_updated",
            resourceType: "user",
            resourceId: ctx.session.user.id,
            details: JSON.stringify(input),
            severity: "info",
          },
        });

        return updatedUser;
      } catch (error) {
        console.error("Failed to update support notification preferences:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update support notification preferences",
        });
      }
    }),

  // ==========================================
  // NOTIFICATION HELPERS
  // ==========================================

  // Bulk notify case participants
  notifyCaseParticipants: protectedProcedure
    .input(z.object({
      caseId: z.string(),
      type: SupportNotificationTypeEnum,
      title: z.string(),
      description: z.string().optional(),
      excludeUserId: z.string().optional(), // Exclude the user who triggered the notification
      includeCustomer: z.boolean().default(true),
      includeAssignee: z.boolean().default(true),
      includeTenantAdmins: z.boolean().default(false),
      visibility: NotificationVisibilityEnum.default("BOTH"),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const supportCase = await ctx.db.supportCase.findUnique({
          where: { id: input.caseId },
          include: {
            assignee: true,
            contactMessage: true,
            tenant: true,
          }
        });

        if (!supportCase) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Support case not found",
          });
        }

        const notifications = [];

        const supportNotificationService = createSupportNotificationService(ctx.db);

        // Notify assignee
        if (input.includeAssignee && supportCase.assigneeId && supportCase.assigneeId !== input.excludeUserId) {
          const assigneeNotification = await supportNotificationService.createSupportNotification({
            type: input.type,
            caseId: input.caseId,
            title: input.title,
            description: input.description,
            visibility: input.visibility,
            tenantId: supportCase.tenantId || undefined,
            recipientType: "ASSIGNEE",
            userId: ctx.session?.user?.id || "system",
          });
          notifications.push(assigneeNotification);
        }

        // Notify customer
        if (input.includeCustomer && supportCase.contactMessage?.userId && supportCase.contactMessage.userId !== input.excludeUserId) {
          const customerNotification = await supportNotificationService.createSupportNotification({
            type: input.type,
            caseId: input.caseId,
            title: input.title,
            description: input.description,
            visibility: input.visibility,
            tenantId: supportCase.tenantId || undefined,
            recipientType: "CUSTOMER",
            userId: ctx.session?.user?.id || "system",
          });
          notifications.push(customerNotification);
        }

        // Notify tenant admins
        if (input.includeTenantAdmins && supportCase.tenantId) {
          const adminNotification = await supportNotificationService.createSupportNotification({
            type: input.type,
            caseId: input.caseId,
            title: input.title,
            description: input.description,
            visibility: input.visibility,
            tenantId: supportCase.tenantId,
            recipientType: "ROLE",
            recipients: ["admin", "owner"], // Standard admin roles
            userId: ctx.session?.user?.id || "system",
          });
          notifications.push(adminNotification);
        }

        return {
          success: true,
          notificationCount: notifications.length,
          notifications: notifications.filter(n => n.success),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to notify case participants:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to notify case participants",
        });
      }
    }),
});