import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, tenantAdminProcedure } from "../middleware";

// Support Case Status Enum
const CaseStatusEnum = z.enum(["OPEN", "PENDING", "RESOLVED", "CLOSED"]);
const CasePriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const CaseSourceEnum = z.enum(["CONTACT_FORM", "EMAIL", "SMS", "WHATSAPP", "WEBHOOK"]);
const MessageDirectionEnum = z.enum(["INBOUND", "OUTBOUND"]);
const MessageChannelEnum = z.enum(["EMAIL", "SMS", "WHATSAPP", "UI", "SYSTEM"]);

export const supportCaseRouter = router({
  // ==========================================
  // CASE MANAGEMENT ENDPOINTS
  // ==========================================

  // Get all cases (with filtering and pagination)
  getAllCases: protectedProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      status: CaseStatusEnum.optional(),
      priority: CasePriorityEnum.optional(),
      assigneeId: z.string().optional(),
      supportOptionId: z.string().optional(),
      search: z.string().optional(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      sortBy: z.enum(["createdAt", "updatedAt", "caseNumber", "status", "priority"]).default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const skip = (input.page - 1) * input.pageSize;
        
        // Build where clause
        const where: any = {};
        
        // Tenant filtering (for tenant users)
        if (input.tenantId) {
          where.tenantId = input.tenantId;
        }
        
        // Status filtering
        if (input.status) {
          where.status = input.status;
        }
        
        // Priority filtering
        if (input.priority) {
          where.priority = input.priority;
        }
        
        // Assignee filtering
        if (input.assigneeId) {
          where.assigneeId = input.assigneeId;
        }
        
        // Support option filtering
        if (input.supportOptionId) {
          where.supportOptionId = input.supportOptionId;
        }
        
        // Search functionality
        if (input.search) {
          where.OR = [
            { caseNumber: { contains: input.search, mode: "insensitive" } },
            { title: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
            { contactMessage: { email: { contains: input.search, mode: "insensitive" } } },
            { contactMessage: { name: { contains: input.search, mode: "insensitive" } } },
          ];
        }
        
        const [cases, totalCount] = await Promise.all([
          ctx.db.supportCase.findMany({
            where,
            skip,
            take: input.pageSize,
            orderBy: { [input.sortBy]: input.sortOrder },
            include: {
              contactMessage: {
                select: {
                  name: true,
                  email: true,
                  subject: true,
                }
              },
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              },
              supportOption: {
                select: {
                  key: true,
                  label: true,
                  icon: true,
                }
              },
              tenant: {
                select: {
                  name: true,
                  slug: true,
                }
              },
              _count: {
                select: {
                  messages: true,
                }
              }
            }
          }),
          ctx.db.supportCase.count({ where })
        ]);
        
        return {
          cases,
          pagination: {
            page: input.page,
            pageSize: input.pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / input.pageSize),
          }
        };
      } catch (error) {
        console.error("Failed to fetch support cases:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch support cases",
        });
      }
    }),

  // Get single case by ID with full details
  getCaseById: protectedProcedure
    .input(z.object({
      caseId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const supportCase = await ctx.db.supportCase.findUnique({
          where: { id: input.caseId },
          include: {
            contactMessage: {
              include: {
                reasons: {
                  include: {
                    contactReason: true,
                  }
                }
              }
            },
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            },
            supportOption: true,
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            },
            messages: {
              orderBy: { createdAt: "asc" },
              include: {
                contactReply: true,
              }
            },
            statusHistory: {
              orderBy: { createdAt: "desc" },
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  }
                }
              }
            }
          }
        });
        
        if (!supportCase) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Support case not found",
          });
        }
        
        return supportCase;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to fetch support case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch support case",
        });
      }
    }),

  // Create new case (manual case creation by admin)
  createCase: tenantAdminProcedure
    .input(z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      priority: CasePriorityEnum.default("NORMAL"),
      tenantId: z.string().optional(),
      assigneeId: z.string().optional(),
      supportOptionId: z.string().optional(),
      source: CaseSourceEnum.default("CONTACT_FORM"),
      sourceMetadata: z.record(z.any()).optional(),
      contactMessageId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Create the case
        const supportCase = await ctx.db.supportCase.create({
          data: {
            caseNumber: crypto.randomUUID(),
            title: input.title,
            description: input.description,
            priority: input.priority,
            tenantId: input.tenantId,
            assigneeId: input.assigneeId,
            supportOptionId: input.supportOptionId,
            source: input.source,
            sourceMetadata: input.sourceMetadata,
            contactMessageId: input.contactMessageId,
          },
          include: {
            assignee: {
              select: {
                name: true,
                email: true,
              }
            },
            supportOption: true,
            tenant: {
              select: {
                name: true,
              }
            }
          }
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: input.tenantId,
            userId: ctx.session.user.id || "system",
            action: "support_case_created",
            resourceType: "support_case",
            resourceId: supportCase.id,
            details: JSON.stringify({ 
              caseNumber: supportCase.caseNumber,
              title: input.title,
              priority: input.priority 
            }),
            severity: "info",
          },
        });
        
        return supportCase;
      } catch (error) {
        console.error("Failed to create support case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create support case",
        });
      }
    }),

  // Update case status
  updateCaseStatus: protectedProcedure
    .input(z.object({
      caseId: z.string(),
      status: CaseStatusEnum,
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get current case
        const currentCase = await ctx.db.supportCase.findUnique({
          where: { id: input.caseId },
          include: {
            contactMessage: true,
            assignee: true,
          }
        });
        
        if (!currentCase) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Support case not found",
          });
        }
        
        // Update the case
        const updatedCase = await ctx.db.supportCase.update({
          where: { id: input.caseId },
          data: {
            status: input.status,
            resolvedAt: input.status === "RESOLVED" ? new Date() : currentCase.resolvedAt,
            closedAt: input.status === "CLOSED" ? new Date() : currentCase.closedAt,
          }
        });
        
        // Create status history entry
        await ctx.db.caseStatusHistory.create({
          data: {
            caseId: input.caseId,
            fromStatus: currentCase.status,
            toStatus: input.status,
            changedBy: ctx.session.user.id,
            reason: input.reason,
          }
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: currentCase.tenantId,
            userId: ctx.session.user.id || "system",
            action: "support_case_status_updated",
            resourceType: "support_case",
            resourceId: input.caseId,
            details: JSON.stringify({ 
              fromStatus: currentCase.status,
              toStatus: input.status,
              reason: input.reason 
            }),
            severity: "info",
          },
        });
        
        return updatedCase;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to update case status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update case status",
        });
      }
    }),

  // Assign case to user
  assignCase: protectedProcedure
    .input(z.object({
      caseId: z.string(),
      assigneeId: z.string().optional(), // null to unassign
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedCase = await ctx.db.supportCase.update({
          where: { id: input.caseId },
          data: {
            assigneeId: input.assigneeId,
          },
          include: {
            assignee: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: updatedCase.tenantId,
            userId: ctx.session.user.id || "system",
            action: "support_case_assigned",
            resourceType: "support_case",
            resourceId: input.caseId,
            details: JSON.stringify({ 
              assigneeId: input.assigneeId,
              assigneeName: updatedCase.assignee?.name 
            }),
            severity: "info",
          },
        });
        
        return updatedCase;
      } catch (error) {
        console.error("Failed to assign case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign case",
        });
      }
    }),

  // ==========================================
  // CASE MESSAGE ENDPOINTS
  // ==========================================

  // Add message to case
  addCaseMessage: protectedProcedure
    .input(z.object({
      caseId: z.string(),
      direction: MessageDirectionEnum,
      channel: MessageChannelEnum,
      content: z.string().min(1, "Message content is required"),
      subject: z.string().optional(),
      fromAddress: z.string().optional(),
      toAddress: z.string().optional(),
      isInternal: z.boolean().default(false),
      attachments: z.array(z.object({
        filename: z.string(),
        contentType: z.string(),
        size: z.number(),
        url: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify case exists
        const supportCase = await ctx.db.supportCase.findUnique({
          where: { id: input.caseId },
          include: {
            contactMessage: true,
          }
        });
        
        if (!supportCase) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Support case not found",
          });
        }
        
        // Create the message
        const caseMessage = await ctx.db.caseMessage.create({
          data: {
            caseId: input.caseId,
            direction: input.direction,
            channel: input.channel,
            content: input.content,
            subject: input.subject,
            fromAddress: input.fromAddress,
            toAddress: input.toAddress,
            isInternal: input.isInternal,
            attachments: input.attachments,
          }
        });
        
        // Update case first response time if this is the first outbound message
        if (input.direction === "OUTBOUND" && !supportCase.firstResponseAt) {
          await ctx.db.supportCase.update({
            where: { id: input.caseId },
            data: { firstResponseAt: new Date() }
          });
        }
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: supportCase.tenantId,
            userId: ctx.session.user.id || "system",
            action: "case_message_added",
            resourceType: "case_message",
            resourceId: caseMessage.id,
            details: JSON.stringify({ 
              caseId: input.caseId,
              direction: input.direction,
              channel: input.channel,
              isInternal: input.isInternal 
            }),
            severity: "info",
          },
        });
        
        return caseMessage;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to add case message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add case message",
        });
      }
    }),

  // Get case messages
  getCaseMessages: protectedProcedure
    .input(z.object({
      caseId: z.string(),
      includeInternal: z.boolean().default(true),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const skip = (input.page - 1) * input.pageSize;
        
        const where: any = { caseId: input.caseId };
        if (!input.includeInternal) {
          where.isInternal = false;
        }
        
        const messages = await ctx.db.caseMessage.findMany({
          where,
          skip,
          take: input.pageSize,
          orderBy: { createdAt: "asc" },
          include: {
            contactReply: true,
          }
        });
        
        return messages;
      } catch (error) {
        console.error("Failed to fetch case messages:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch case messages",
        });
      }
    }),

  // ==========================================
  // CASE ANALYTICS ENDPOINTS
  // ==========================================

  // Get case metrics for dashboard
  getCaseMetrics: protectedProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      dateFrom: z.date(),
      dateTo: z.date(),
      supportOptionId: z.string().optional(),
      assigneeId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const where: any = {
          date: {
            gte: input.dateFrom,
            lte: input.dateTo,
          }
        };
        
        if (input.tenantId) {
          where.tenantId = input.tenantId;
        }
        
        if (input.supportOptionId) {
          where.supportOptionId = input.supportOptionId;
        }
        
        if (input.assigneeId) {
          where.assigneeId = input.assigneeId;
        }
        
        const metrics = await ctx.db.caseMetrics.findMany({
          where,
          include: {
            supportOption: {
              select: { label: true }
            },
            assignee: {
              select: { name: true }
            }
          },
          orderBy: { date: "asc" }
        });
        
        // Aggregate metrics
        const aggregated = metrics.reduce((acc, metric) => {
          acc.totalCases += metric.totalCases;
          acc.openCases += metric.openCases;
          acc.pendingCases += metric.pendingCases;
          acc.resolvedCases += metric.resolvedCases;
          acc.closedCases += metric.closedCases;
          
          // Weighted averages for response times
          if (metric.avgFirstResponseTime) {
            acc.totalFirstResponseTime += metric.avgFirstResponseTime * metric.totalCases;
            acc.responseTimeCount += metric.totalCases;
          }
          
          if (metric.avgResolutionTime) {
            acc.totalResolutionTime += metric.avgResolutionTime * metric.resolvedCases;
            acc.resolutionTimeCount += metric.resolvedCases;
          }
          
          return acc;
        }, {
          totalCases: 0,
          openCases: 0,
          pendingCases: 0,
          resolvedCases: 0,
          closedCases: 0,
          totalFirstResponseTime: 0,
          responseTimeCount: 0,
          totalResolutionTime: 0,
          resolutionTimeCount: 0,
        });
        
        return {
          summary: {
            totalCases: aggregated.totalCases,
            openCases: aggregated.openCases,
            pendingCases: aggregated.pendingCases,
            resolvedCases: aggregated.resolvedCases,
            closedCases: aggregated.closedCases,
            avgFirstResponseTime: aggregated.responseTimeCount > 0 
              ? Math.round(aggregated.totalFirstResponseTime / aggregated.responseTimeCount) 
              : null,
            avgResolutionTime: aggregated.resolutionTimeCount > 0 
              ? Math.round(aggregated.totalResolutionTime / aggregated.resolutionTimeCount) 
              : null,
          },
          daily: metrics,
        };
      } catch (error) {
        console.error("Failed to fetch case metrics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch case metrics",
        });
      }
    }),

  // ==========================================
  // UTILITY ENDPOINTS
  // ==========================================

  // Convert ContactMessage to SupportCase
  convertContactMessageToCase: protectedProcedure
    .input(z.object({
      contactMessageId: z.string(),
      supportOptionId: z.string().optional(),
      assigneeId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the contact message
        const contactMessage = await ctx.db.contactMessage.findUnique({
          where: { id: input.contactMessageId },
          include: {
            supportCase: true, // Check if already converted
            replies: true,
          }
        });
        
        if (!contactMessage) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contact message not found",
          });
        }
        
        if (contactMessage.supportCase) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Contact message already has an associated support case",
          });
        }
        
        // Create the support case
        const supportCase = await ctx.db.supportCase.create({
          data: {
            contactMessageId: input.contactMessageId,
            caseNumber: crypto.randomUUID(),
            title: contactMessage.subject,
            description: contactMessage.message,
            status: "OPEN",
            priority: contactMessage.priority?.toUpperCase() as any || "NORMAL",
            tenantId: contactMessage.tenantId,
            supportOptionId: input.supportOptionId,
            assigneeId: input.assigneeId,
            source: "CONTACT_FORM",
          }
        });
        
        // Convert existing replies to case messages
        for (const reply of contactMessage.replies) {
          await ctx.db.caseMessage.create({
            data: {
              caseId: supportCase.id,
              contactReplyId: reply.id,
              direction: reply.isFromUser ? "INBOUND" : "OUTBOUND",
              channel: "UI",
              content: reply.message,
              isInternal: reply.isInternal,
            }
          });
        }
        
        // Log the conversion
        await ctx.db.auditLog.create({
          data: {
            tenantId: contactMessage.tenantId,
            userId: ctx.session.user.id || "system",
            action: "contact_message_converted_to_case",
            resourceType: "support_case",
            resourceId: supportCase.id,
            details: JSON.stringify({ 
              contactMessageId: input.contactMessageId,
              caseNumber: supportCase.caseNumber 
            }),
            severity: "info",
          },
        });
        
        return supportCase;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to convert contact message to case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to convert contact message to case",
        });
      }
    }),
});