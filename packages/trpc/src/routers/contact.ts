import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../middleware";
import { SupportCaseService } from "../support-case-service";
import {
  createSupportNotificationService,
  SupportNotificationService,
} from "../support-notification-service";
import * as crypto from "crypto";

export const contactRouter = router({
  // Get contact reasons (public)
  getContactReasons: publicProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        // Build query to include both platform-wide and tenant-specific reasons
        const whereClause: any = {
          isActive: true,
        };

        if (input.tenantId) {
          // If tenantId provided, get both platform-wide (null tenantId) and tenant-specific reasons
          whereClause.OR = [
            { tenantId: null }, // Platform-wide reasons
            { tenantId: input.tenantId } // Tenant-specific reasons
          ];
        } else {
          // If no tenantId provided, only get platform-wide reasons
          whereClause.tenantId = null;
        }

        const reasons = await ctx.db.contactReason.findMany({
          where: whereClause,
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            key: true,
            label: true,
            description: true,
            icon: true,
          },
        });

        // If no reasons found, return default ones
        if (reasons.length === 0) {
          return [
            {
              id: "default-technical",
              key: "technical_support", 
              label: "Technical Support",
              description: "Issues with the platform, bugs, or technical difficulties",
              icon: "Bug",
              helpType: "technical"
            },
            {
              id: "default-billing",
              key: "billing_support",
              label: "Billing & Payments", 
              description: "Questions about billing, payments, or subscription issues",
              icon: "CreditCard",
              helpType: "billing"
            },
            {
              id: "default-account",
              key: "account_support",
              label: "Account Management",
              description: "Account settings, user management, or access issues", 
              icon: "Shield",
              helpType: "account"
            },
            {
              id: "default-general",
              key: "general_inquiry",
              label: "General Inquiry",
              description: "General questions or feedback",
              icon: "HelpCircle", 
              helpType: "general"
            }
          ];
        }

        return reasons;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to fetch contact reasons:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch contact reasons.",
        });
      }
    }),

  // Submit contact message (public - creates support case directly)
  submitContactMessage: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        subject: z.string().min(1, "Subject is required"),
        message: z.string().min(10, "Message must be at least 10 characters"),
        reasonIds: z
          .array(z.string())
          .min(1, "At least one reason must be selected"),
        userId: z.string().optional(),
        tenantId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get contact reasons for metadata
        let contactReasons = [];
        try {
          contactReasons = await ctx.db.contactReason.findMany({
            where: { id: { in: input.reasonIds } },
            select: { id: true, key: true, label: true },
          });
        } catch (reasonError) {
          console.warn("Failed to fetch contact reasons:", reasonError);
          // Use default mappings based on reason IDs
          const defaultReasons = [
            { id: "default-technical", key: "technical_support", label: "Technical Support" },
            { id: "default-billing", key: "billing_support", label: "Billing & Payments" },
            { id: "default-account", key: "account_support", label: "Account Management" },
            { id: "default-general", key: "general_inquiry", label: "General Inquiry" }
          ];
          contactReasons = input.reasonIds.map(id => 
            defaultReasons.find(r => r.id === id) || { id, key: "general", label: "General Inquiry" }
          );
        }

        // Create support case directly (no intermediate ContactMessage)
        const supportCaseService = new SupportCaseService(ctx.db);

        // Create the support case with contact form data
        const supportCase = await ctx.db.supportCase.create({
          data: {
            // caseNumber will be auto-generated by database trigger
            title: input.subject,
            description: input.message,
            status: "OPEN",
            priority: "NORMAL",
            ...(input.tenantId && { tenantId: input.tenantId }),
            source: "CONTACT_FORM",
            sourceMetadata: {
              contactReasons: contactReasons.map((r) => ({
                key: r.key,
                label: r.label,
                helpType: "general", // Default since helpType field may not exist yet
              })),
              customerInfo: {
                name: input.name,
                email: input.email,
                userId: input.userId,
              },
              formType: "contact",
            },
            threadingKey: `contact_form:${crypto.randomUUID()}`,
          },
        });

        // Auto-assign case if configured
        try {
          await supportCaseService.autoAssignCase(supportCase.id);
        } catch (autoAssignError) {
          console.warn("Auto-assign failed:", autoAssignError);
          // Continue without auto-assignment
        }

        // Send notification to tenant support email or primary admin
        try {
          const notificationService = createSupportNotificationService(ctx.db);
          await notifyTenantOfNewContact(
            ctx,
            {
              id: supportCase.id,
              name: input.name,
              email: input.email,
              subject: input.subject,
              message: input.message,
              tenantId: input.tenantId,
              priority: "normal",
              helpTypes: ["general"], // Default until helpType field is available
            },
            supportCase.id,
            notificationService
          );
        } catch (notificationError) {
          console.warn("Notification failed:", notificationError);
          // Continue without notification
        }

        // Log the action if we have a valid user
        if (input.tenantId && input.userId && input.userId !== "anonymous") {
          try {
            await ctx.db.auditLog.create({
              data: {
                tenantId: input.tenantId,
                userId: input.userId,
                action: "contact_form_submitted",
                resourceType: "support_case",
                resourceId: supportCase.id,
                details: JSON.stringify({
                  subject: input.subject,
                  reasonIds: input.reasonIds,
                  caseNumber: supportCase.caseNumber,
                }),
                severity: "info",
              },
            });
          } catch (auditError) {
            console.warn("Failed to create audit log:", auditError);
            // Continue without audit log
          }
        }

        return {
          success: true,
          message: "Message submitted successfully",
          caseId: supportCase.id,
          caseNumber: supportCase.caseNumber,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to submit contact message:", error);
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit contact message",
        });
      }
    }),

  // Get contact message by ID (protected) - now queries support case
  getContactMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(), // This is now a support case ID
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session.user?.email) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await ctx.db.user.findUnique({
        where: { email: ctx.session.user.email },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Get support case that was created via contact form for this user
      const supportCase = await ctx.db.supportCase.findFirst({
        where: {
          id: input.messageId,
          source: "CONTACT_FORM",
          sourceMetadata: {
            path: ["customerInfo", "email"],
            equals: ctx.session.user.email,
          },
        },
        include: {
          messages: {
            where: { isInternal: false },
            orderBy: { createdAt: "asc" },
          },
          assignee: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      if (!supportCase) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Transform to contact message format for UI compatibility
      const sourceMetadata = supportCase.sourceMetadata as any;

      return {
        id: supportCase.id,
        name: sourceMetadata?.customerInfo?.name || "Contact User",
        email: sourceMetadata?.customerInfo?.email || ctx.session.user.email,
        subject: supportCase.title,
        message: supportCase.description,
        status: supportCase.status.toLowerCase(),
        priority: supportCase.priority.toLowerCase(),
        createdAt: supportCase.createdAt,
        updatedAt: supportCase.updatedAt,
        caseNumber: supportCase.caseNumber,
        // Transform case messages to look like contact replies for UI
        replies: supportCase.messages.map((msg) => ({
          id: msg.id,
          message: msg.content,
          isFromUser: msg.direction === "INBOUND",
          isInternal: msg.isInternal,
          createdAt: msg.createdAt,
          channel: msg.channel,
          fromAddress: msg.fromAddress,
          toAddress: msg.toAddress,
        })),
        reasons:
          sourceMetadata?.contactReasons?.map((r: any) => ({
            contactReason: {
              key: r.key,
              label: r.label,
              icon: null, // Contact reasons don't have icons in this context
            },
          })) || [],
        assignee: supportCase.assignee,
        supportCase: {
          id: supportCase.id,
          caseNumber: supportCase.caseNumber,
          status: supportCase.status,
          priority: supportCase.priority,
        },
      };
    }),

  // Get user's contact messages (protected) - now queries support cases
  getUserContactMessages: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.email) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Find support cases that were created via contact form for this user
    const supportCases = await ctx.db.supportCase.findMany({
      where: {
        source: "CONTACT_FORM",
        sourceMetadata: {
          path: ["customerInfo", "email"],
          equals: ctx.session.user.email,
        },
      },
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: "desc" },
          take: 1, // Get only the last message for preview
        },
        assignee: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match contact message format for UI compatibility
    const transformedMessages = supportCases.map((supportCase) => {
      const sourceMetadata = supportCase.sourceMetadata as any;
      const lastMessage = supportCase.messages[0];

      return {
        id: supportCase.id,
        name: sourceMetadata?.customerInfo?.name || "Contact User",
        email: sourceMetadata?.customerInfo?.email || ctx.session.user.email,
        subject: supportCase.title,
        message: supportCase.description,
        status: supportCase.status.toLowerCase(),
        priority: supportCase.priority.toLowerCase(),
        createdAt: supportCase.createdAt,
        updatedAt: supportCase.updatedAt,
        caseNumber: supportCase.caseNumber,
        categories:
          sourceMetadata?.contactReasons?.map((r: any) => r.label).join(", ") ||
          "",
        lastMessage: {
          content: lastMessage?.content || supportCase.description,
          createdAt: lastMessage?.createdAt || supportCase.createdAt,
          isFromUser: lastMessage ? lastMessage.direction === "INBOUND" : true,
        },
        unread: false, // TODO: Implement unread logic based on case messages
        assignee: supportCase.assignee,
      };
    });

    return transformedMessages;
  }),

  // Add reply to contact message (protected) - now creates case message
  addContactReply: protectedProcedure
    .input(
      z.object({
        messageId: z.string(), // This is now a support case ID
        message: z.string().min(1, "Reply message is required"),
        isInternal: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user?.email) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await ctx.db.user.findUnique({
        where: { email: ctx.session.user.email },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Verify this is a contact form support case belonging to the user
      const supportCase = await ctx.db.supportCase.findFirst({
        where: {
          id: input.messageId,
          source: "CONTACT_FORM",
          sourceMetadata: {
            path: ["customerInfo", "email"],
            equals: ctx.session.user.email,
          },
        },
      });

      if (!supportCase) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact message not found",
        });
      }

      // Create case message for the reply
      const caseMessage = await ctx.db.caseMessage.create({
        data: {
          caseId: input.messageId,
          direction: "INBOUND",
          channel: "UI",
          fromAddress: ctx.session.user.email,
          toAddress: "support",
          content: input.message,
          isInternal: input.isInternal,
        },
      });

      // Update case status to "PENDING" if it was "OPEN"
      if (supportCase.status === "OPEN") {
        await ctx.db.supportCase.update({
          where: { id: input.messageId },
          data: { status: "PENDING" },
        });
      }

      // Log the action
      if (supportCase.tenantId) {
        await ctx.db.auditLog.create({
          data: {
            tenantId: supportCase.tenantId,
            userId: user.id,
            action: "contact_reply_added_via_case",
            resourceType: "case_message",
            resourceId: caseMessage.id,
            details: JSON.stringify({
              supportCaseId: input.messageId,
              isInternal: input.isInternal,
            }),
            severity: "info",
          },
        });
      }

      return {
        success: true,
        message: "Reply added successfully",
        caseMessageId: caseMessage.id,
      };
    }),

  // Update contact message status (protected) - now updates support case status
  updateContactMessageStatus: protectedProcedure
    .input(
      z.object({
        contactMessageId: z.string(), // This is now a support case ID
        status: z.enum(["open", "in_progress", "resolved", "closed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify this is a contact form support case belonging to the user
        const supportCase = await ctx.db.supportCase.findFirst({
          where: {
            id: input.contactMessageId,
            source: "CONTACT_FORM",
            sourceMetadata: {
              path: ["customerInfo", "email"],
              equals: ctx.session.user.email,
            },
          },
        });

        if (!supportCase) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contact message not found",
          });
        }

        // Map contact status to support case status
        const statusMapping: Record<string, string> = {
          open: "OPEN",
          in_progress: "PENDING",
          resolved: "RESOLVED",
          closed: "CLOSED",
        };

        // Update the support case status
        const updatedCase = await ctx.db.supportCase.update({
          where: { id: input.contactMessageId },
          data: {
            status: statusMapping[input.status],
            resolvedAt:
              input.status === "resolved" ? new Date() : supportCase.resolvedAt,
            closedAt:
              input.status === "closed" ? new Date() : supportCase.closedAt,
          },
        });

        // Create status history entry
        await ctx.db.caseStatusHistory.create({
          data: {
            caseId: input.contactMessageId,
            fromStatus: supportCase.status,
            toStatus: statusMapping[input.status],
            changedBy: ctx.session.user.id,
            reason: "Updated via contact interface",
          },
        });

        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: supportCase.tenantId,
            userId: ctx.session.user.id || "unknown",
            action: "contact_case_status_updated",
            resourceType: "support_case",
            resourceId: input.contactMessageId,
            details: JSON.stringify({
              fromStatus: supportCase.status,
              toStatus: statusMapping[input.status],
              updatedVia: "contact_interface",
            }),
            severity: "info",
          },
        });

        // Return in contact message format for UI compatibility
        const sourceMetadata = updatedCase.sourceMetadata as any;
        return {
          id: updatedCase.id,
          name: sourceMetadata?.customerInfo?.name || "Contact User",
          email: sourceMetadata?.customerInfo?.email || ctx.session.user.email,
          subject: updatedCase.title,
          message: updatedCase.description,
          status: input.status,
          priority: updatedCase.priority.toLowerCase(),
          createdAt: updatedCase.createdAt,
          updatedAt: updatedCase.updatedAt,
          caseNumber: updatedCase.caseNumber,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to update contact message status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update contact message status",
        });
      }
    }),

  // Get all support cases (for tenant admins)
  getAllCases: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const whereClause: { tenantId?: string } = {};
        if (input.tenantId) {
          whereClause.tenantId = input.tenantId;
        }

        const cases = await ctx.db.supportCase.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take: input.pageSize,
          skip: (input.page - 1) * input.pageSize,
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            contactMessage: {
              select: {
                name: true,
                email: true,
                subject: true,
              },
            },
            supportOption: {
              select: {
                key: true,
                label: true,
              },
            },
            _count: {
              select: {
                messages: true,
              },
            },
          },
        });

        const totalCount = await ctx.db.supportCase.count({
          where: whereClause,
        });

        return {
          cases,
          totalCount,
          page: input.page,
          pageSize: input.pageSize,
          totalPages: Math.ceil(totalCount / input.pageSize),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to fetch support cases:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch support cases.",
        });
      }
    }),

  // Get individual support case
  getSupportCase: protectedProcedure
    .input(
      z.object({
        caseId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const supportCase = await ctx.db.supportCase.findUnique({
          where: { id: input.caseId },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
                          contactMessage: {
                select: {
                  name: true,
                  email: true,
                  subject: true,
                },
              },
            supportOption: {
              select: {
                key: true,
                label: true,
              },
            },
          },
        });

        if (!supportCase) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Support case not found.",
          });
        }

        return supportCase;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to fetch support case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch support case.",
        });
      }
    }),

  // Get support options for a tenant
  getSupportOptions: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const whereClause: { isActive: boolean; tenantId?: string } = {
          isActive: true,
        };
        if (input.tenantId) {
          whereClause.tenantId = input.tenantId;
        }

        const options = await ctx.db.supportOption.findMany({
          where: whereClause,
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            key: true,
            label: true,
            description: true,
            icon: true,
          },
        });

          return options;
        } catch (error) {
          if (error instanceof TRPCError) throw error;

          console.error("Failed to fetch support options:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch support options.",
          });
        }
      }),

  // Get case by ID with full details
  getCaseById: protectedProcedure
    .input(
      z.object({
        caseId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const supportCase = await ctx.db.supportCase.findUnique({
          where: { id: input.caseId },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            contactMessage: {
              select: {
                name: true,
                email: true,
                subject: true,
              },
            },
            supportOption: {
              select: {
                key: true,
                label: true,
                icon: true,
              },
            },
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            _count: {
              select: {
                messages: true,
              },
            },
          },
        });

        if (!supportCase) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Support case not found.",
          });
        }

        return supportCase;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to fetch support case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch support case.",
        });
      }
    }),

  // Get case metrics for analytics
  getCaseMetrics: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const whereClause: { 
          date: { gte: Date; lte: Date }; 
          tenantId?: string 
        } = {
          date: {
            gte: new Date(input.dateFrom),
            lte: new Date(input.dateTo),
          },
        };
        
        if (input.tenantId) {
          whereClause.tenantId = input.tenantId;
        }

        const metrics = await ctx.db.caseMetrics.findMany({
          where: whereClause,
          orderBy: { date: "desc" },
        });

        // Aggregate metrics
        const summary = {
          totalCases: metrics.reduce((sum, m) => sum + m.totalCases, 0),
          openCases: metrics.reduce((sum, m) => sum + m.openCases, 0),
          pendingCases: metrics.reduce((sum, m) => sum + m.pendingCases, 0),
          resolvedCases: metrics.reduce((sum, m) => sum + m.resolvedCases, 0),
          closedCases: metrics.reduce((sum, m) => sum + m.closedCases, 0),
          avgFirstResponseTime: metrics.length > 0 
            ? metrics.reduce((sum, m) => sum + (m.avgFirstResponseTime || 0), 0) / metrics.length
            : null,
          avgResolutionTime: metrics.length > 0
            ? metrics.reduce((sum, m) => sum + (m.avgResolutionTime || 0), 0) / metrics.length
            : null,
        };

        return { metrics, summary };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to fetch case metrics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch case metrics.",
        });
      }
    }),

  // Assign case to user
  assignCase: protectedProcedure
    .input(
      z.object({
        caseId: z.string(),
        assigneeId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedCase = await ctx.db.supportCase.update({
          where: { id: input.caseId },
          data: {
            assigneeId: input.assigneeId,
            updatedAt: new Date(),
          },
        });

        // Create audit log
        await ctx.db.auditLog.create({
          data: {
            tenantId: updatedCase.tenantId,
            userId: ctx.session.user.id || "unknown",
            action: "case_assigned",
            resourceType: "support_case",
            resourceId: input.caseId,
            details: JSON.stringify({
              assigneeId: input.assigneeId,
              previousAssigneeId: updatedCase.assigneeId,
            }),
            severity: "info",
          },
        });

        return updatedCase;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Failed to assign case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign case.",
        });
      }
    }),
});

// Helper method to notify tenant of new contact
async function notifyTenantOfNewContact(
  ctx: any,
  contactMessage: any,
  caseId: string,
  notificationService: SupportNotificationService
) {
  try {
    if (!contactMessage.tenantId) {
      // For non-tenant contacts, notify platform admins
      const platformAdmins = await ctx.db.user.findMany({
        where: { platformRole: "admin" },
        select: { id: true },
      });

      if (platformAdmins.length > 0) {
        await notificationService.createSupportNotification({
          type: "CASE_CREATED",
          caseId: caseId,
          title: `New Contact Message: ${contactMessage.subject}`,
          description: `A new contact message has been received from ${contactMessage.name} (${contactMessage.email})`,
          priority: contactMessage.priority || "normal",
          visibility: "BOTH",
          recipientType: "USER",
          recipients: platformAdmins.map((admin: any) => admin.id),
          metadata: {
            contactMessageId: contactMessage.id,
            source: "contact_form",
          },
        });
      }
    } else {
      // For tenant contacts, route by help type to specific emails
      const helpTypes = contactMessage.helpTypes || ["general"];
      const primaryHelpType = helpTypes[0]; // Use first help type for routing

      // Get tenant-specific routing for this help type
      const tenantRouting = await ctx.db.tenantSupportRouting.findFirst({
        where: {
          tenantId: contactMessage.tenantId,
          helpType: primaryHelpType,
          isActive: true,
        },
      });

      let targetEmails: string[] = [];

      if (tenantRouting) {
        // Use help type-specific email
        targetEmails = [tenantRouting.email];
      } else {
        // Fall back to tenant contact email or admins
        const tenant = await ctx.db.tenant.findUnique({
          where: { id: contactMessage.tenantId },
          select: { contactEmail: true },
        });

        if (tenant?.contactEmail) {
          targetEmails = [tenant.contactEmail];
        }
      }

      // If we have specific email addresses, send email notifications
      if (targetEmails.length > 0) {
        // For email routing, we might want to enhance the notification service
        // to support direct email sending rather than just UI notifications
        console.log(
          `Routing ${primaryHelpType} help request to:`,
          targetEmails
        );
      }

      // Always notify tenant admins and support staff via UI
      const tenantStaff = await ctx.db.membership.findMany({
        where: {
          tenantId: contactMessage.tenantId,
          role: { in: ["admin", "support"] },
          status: "active",
        },
        select: { userId: true, role: true },
      });

      if (tenantStaff.length > 0) {
        await notificationService.createSupportNotification({
          type: "CASE_CREATED",
          caseId: caseId,
          title: `New Contact Message (${primaryHelpType.toUpperCase()}): ${contactMessage.subject}`,
          description: `A new ${primaryHelpType} contact message has been received from ${contactMessage.name} (${contactMessage.email})`,
          priority: contactMessage.priority || "normal",
          visibility: "BOTH",
          tenantId: contactMessage.tenantId,
          recipientType: "ROLE",
          recipients: ["admin", "support"],
          metadata: {
            contactMessageId: contactMessage.id,
            source: "contact_form",
            helpType: primaryHelpType,
            helpTypes: helpTypes,
            routingEmails: targetEmails,
          },
        });
      }
    }
  } catch (error) {
    console.error("Failed to notify tenant of new contact:", error);
    // Don't throw - this shouldn't fail the contact submission
  }
}

