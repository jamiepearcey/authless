// Support Notification Service
// Handles creation and delivery of support case notifications

import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@db/base";
import { TrpcOutboxService, OutboxEvents } from "./outbox-service";

export interface CreateSupportNotificationInput {
  type: "CASE_CREATED" | "CASE_ASSIGNED" | "CASE_STATUS_CHANGED" | "CASE_MESSAGE_RECEIVED" | "CASE_MESSAGE_SENT" | "CASE_FIRST_RESPONSE" | "CASE_RESOLVED" | "CASE_CLOSED";
  caseId: string;
  title: string;
  description?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  visibility?: "UI" | "EMAIL" | "BOTH";
  tenantId?: string;
  recipientType?: "USER" | "ROLE" | "ASSIGNEE" | "CUSTOMER";
  recipients?: string[]; // User IDs or role names
  metadata?: Record<string, any>;
  suppressIfNoPreference?: boolean;
  // Optional user context for audit logging
  userId?: string;
}

export interface SupportNotificationResult {
  success: boolean;
  notificationId: string | null;
  recipientCount: number;
  uiNotificationsSent: number;
  emailNotificationsSent: number;
  recipients: Array<{
    userId: string;
    email?: string;
    sentUI: boolean;
    sentEmail: boolean;
  }>;
  message?: string;
}

export class SupportNotificationService {
  constructor(
    private db: PrismaClient,
    private outbox: TrpcOutboxService
  ) {}

  async createSupportNotification(input: CreateSupportNotificationInput): Promise<SupportNotificationResult> {
    try {
      // Set defaults
      const {
        priority = "normal",
        visibility = "BOTH",
        recipientType = "USER",
        suppressIfNoPreference = true,
        userId = "system"
      } = input;

      // Get the case details
      const supportCase = await this.db.supportCase.findUnique({
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

      // Determine recipients based on type and configuration
      let targetRecipients: Array<{
        userId: string;
        email?: string;
        name?: string;
        role?: string;
      }> = [];

      switch (recipientType) {
        case "ASSIGNEE":
          if (supportCase.assigneeId && supportCase.assignee) {
            targetRecipients.push({
              userId: supportCase.assigneeId,
              email: supportCase.assignee.email || undefined,
              name: supportCase.assignee.name || undefined,
            });
          }
          break;

        case "CUSTOMER":
          if (supportCase.contactMessage?.userId) {
            const customer = await this.db.user.findUnique({
              where: { id: supportCase.contactMessage.userId }
            });
            if (customer) {
              targetRecipients.push({
                userId: customer.id,
                email: customer.email || undefined,
                name: customer.name || undefined,
              });
            }
          }
          break;

        case "ROLE":
          if (input.tenantId && input.recipients) {
            const roleMembers = await this.db.membership.findMany({
              where: {
                tenantId: input.tenantId,
                role: { in: input.recipients },
                status: "active",
              },
              include: {
                user: true,
              }
            });

            targetRecipients = roleMembers.map(member => ({
              userId: member.userId,
              email: member.user.email || undefined,
              name: member.user.name || undefined,
              role: member.role,
            }));
          }
          break;

        case "USER":
        default:
          if (input.recipients) {
            const users = await this.db.user.findMany({
              where: { id: { in: input.recipients } },
              select: { id: true, email: true, name: true }
            });

            targetRecipients = users.map(user => ({
              userId: user.id,
              email: user.email || undefined,
              name: user.name || undefined,
            }));
          }
          break;
      }

      if (targetRecipients.length === 0) {
        return {
          success: true,
          message: "No valid recipients found",
          notificationId: null,
          recipientCount: 0,
          uiNotificationsSent: 0,
          emailNotificationsSent: 0,
          recipients: [],
        };
      }

      // Create the notification
      const notification = await this.db.notification.create({
        data: {
          title: input.title,
          description: input.description,
          type: "support",
          priority: priority,
          status: "unread",
          tenantId: input.tenantId,
          metadata: JSON.stringify({
            ...input.metadata,
            caseId: input.caseId,
            caseNumber: supportCase.caseNumber,
            notificationType: input.type,
            visibility: visibility,
          }),
        }
      });

      // Process each recipient based on their preferences
      const processedRecipients = [];
      let uiNotificationsSent = 0;
      let emailNotificationsSent = 0;

      for (const recipient of targetRecipients) {
        // Get user notification preferences
        const user = await this.db.user.findUnique({
          where: { id: recipient.userId },
          select: {
            notifySupportRepliesUI: true,
            notifySupportRepliesEmail: true,
            emailNotifications: true,
          }
        });

        if (!user) continue;

        let shouldSendUI = false;
        let shouldSendEmail = false;

        // Determine delivery method based on visibility and user preferences
        switch (visibility) {
          case "UI":
            shouldSendUI = user.notifySupportRepliesUI;
            break;

          case "EMAIL":
            shouldSendEmail = user.notifySupportRepliesEmail && user.emailNotifications;
            break;

          case "BOTH":
            shouldSendUI = user.notifySupportRepliesUI;
            shouldSendEmail = user.notifySupportRepliesEmail && user.emailNotifications;
            break;
        }

        // Handle email-only fallback policy
        if (visibility === "EMAIL" && !shouldSendEmail) {
          const fallbackPolicy = await this.db.supportConfiguration.findFirst({
            where: {
              tenantId: input.tenantId,
              key: "emailOnlyFallbackToUI"
            }
          });

          const globalFallbackPolicy = await this.db.supportConfiguration.findFirst({
            where: {
              tenantId: null,
              key: "emailOnlyFallbackToUI"
            }
          });

          const shouldFallback = (fallbackPolicy?.value ?? globalFallbackPolicy?.value ?? true) as boolean;

          if (shouldFallback && user.notifySupportRepliesUI) {
            shouldSendUI = true;
            
            // Log the fallback
            await this.db.auditLog.create({
              data: {
                tenantId: input.tenantId,
                userId: recipient.userId,
                action: "support_notification_fallback_to_ui",
                resourceType: "notification",
                resourceId: notification.id,
                details: JSON.stringify({
                  originalVisibility: "EMAIL",
                  fallbackReason: "Email notifications disabled",
                }),
                severity: "info",
              },
            });
          }
        }

        // Skip if no notification method available and suppressIfNoPreference is true
        if (suppressIfNoPreference && !shouldSendUI && !shouldSendEmail) {
          continue;
        }

        // Create notification recipient record
        const notificationRecipient = await this.db.notificationRecipient.create({
          data: {
            notificationId: notification.id,
            userId: recipient.userId,
            status: "unread",
          }
        });

        // Create a unified notification intent that the notification service will process
        // This replaces the old approach of directly sending emails and UI notifications
        // The notification service will handle channel routing and delivery
        if (shouldSendUI || shouldSendEmail) {
          try {
            // Create notification intent with appropriate delivery channels
            const channels = [];
            if (shouldSendUI) channels.push('realtime');
            if (shouldSendEmail) channels.push('email');

            await this.outbox.publishNotificationIntentEvent(
              OutboxEvents.NOTIFICATION_INTENT_CREATED,
              `support-${notification.id}-${recipient.userId}`,
              {
                id: `support-${notification.id}-${recipient.userId}`,
                tenantId: input.tenantId,
                type: input.type.toLowerCase(), // e.g., 'case_created'
                recipients: [recipient.userId],
                payloadJson: {
                  notificationId: notification.id,
                  title: input.title,
                  description: input.description || input.title,
                  priority: priority,
                  caseId: input.caseId,
                  caseNumber: supportCase.caseNumber,
                  supportNotificationType: input.type,
                  templateVariables: {
                    title: input.title,
                    description: input.description,
                    caseNumber: supportCase.caseNumber,
                    priority: priority,
                    type: "support"
                  }
                },
                channels: channels,
                createdAt: new Date(),
                status: 'pending',
                retryCount: 0,
                maxRetries: 3,
                traceId: input.userId
              },
              { 
                traceId: input.userId,
                idempotencyKey: `support-notification-intent.${notification.id}.${recipient.userId}.${Date.now()}`
              }
            );

            if (shouldSendUI) uiNotificationsSent++;
            if (shouldSendEmail) emailNotificationsSent++;
          } catch (error) {
            console.error(`Failed to publish notification intent for user ${recipient.userId}:`, error);
          }
        }

        processedRecipients.push({
          userId: recipient.userId,
          email: recipient.email,
          sentUI: shouldSendUI,
          sentEmail: shouldSendEmail && !!recipient.email,
        });
      }

      // Log notification creation
      await this.db.auditLog.create({
        data: {
          tenantId: input.tenantId,
          userId: userId,
          action: "support_notification_created",
          resourceType: "notification",
          resourceId: notification.id,
          details: JSON.stringify({
            type: input.type,
            caseId: input.caseId,
            recipientCount: processedRecipients.length,
            uiNotificationsSent,
            emailNotificationsSent,
          }),
          severity: "info",
        },
      });

      return {
        success: true,
        notificationId: notification.id,
        recipientCount: processedRecipients.length,
        uiNotificationsSent,
        emailNotificationsSent,
        recipients: processedRecipients,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error("Failed to create support notification:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create support notification",
      });
    }
  }
}

// Factory function to create service with database and outbox instances
export const createSupportNotificationService = (db: PrismaClient, outbox: TrpcOutboxService) => {
  return new SupportNotificationService(db, outbox);
};
