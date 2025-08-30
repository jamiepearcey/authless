import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../middleware";
import { SupportCaseService } from "../support-case-service";

export const contactRouter = router({
  // Get contact reasons (public)
  getContactReasons: publicProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const whereClause: { isActive: boolean; tenantId?: string } = { isActive: true };
        if (input.tenantId) {
          whereClause.tenantId = input.tenantId;
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

  // Submit contact message (public - for non-logged in users)
  submitContactMessage: publicProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email address"),
      subject: z.string().min(1, "Subject is required"),
      message: z.string().min(10, "Message must be at least 10 characters"),
      reasonIds: z.array(z.string()).min(1, "At least one reason must be selected"),
      userId: z.string().optional(),
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Create the contact message
        const contactMessage = await ctx.db.contactMessage.create({
          data: {
            name: input.name,
            email: input.email,
            subject: input.subject,
            message: input.message,
            userId: input.userId,
            tenantId: input.tenantId,
            status: "open",
            priority: "normal",
          },
        });

        // Create the reason associations
        const reasonAssociations = input.reasonIds.map(reasonId => ({
          contactMessageId: contactMessage.id,
          contactReasonId: reasonId,
        }));

        await ctx.db.contactMessageReason.createMany({
          data: reasonAssociations,
        });

        // Log the action
        if (input.tenantId) {
          await ctx.db.auditLog.create({
            data: {
              tenantId: input.tenantId,
              userId: input.userId || "anonymous",
              action: "contact_message_submitted",
              resourceType: "contact_message",
              resourceId: contactMessage.id,
              details: JSON.stringify({ 
                subject: input.subject,
                reasonIds: input.reasonIds 
              }),
              severity: "info",
            },
          });
        }

        // Auto-create support case from contact message
        try {
          const supportCaseService = new SupportCaseService(ctx.db);
          const caseId = await supportCaseService.createCaseFromContactMessage(contactMessage.id);
          
          // Auto-assign case if configured
          await supportCaseService.autoAssignCase(caseId);
          
          console.log(`Auto-created support case ${caseId} from contact message ${contactMessage.id}`);
        } catch (caseError) {
          // Don't fail the contact submission if case creation fails
          console.error("Failed to auto-create support case:", caseError);
          
          await ctx.db.auditLog.create({
            data: {
              tenantId: input.tenantId,
              userId: input.userId || "anonymous",
              action: "support_case_auto_creation_failed",
              resourceType: "contact_message", 
              resourceId: contactMessage.id,
              details: JSON.stringify({ 
                error: String(caseError),
                contactMessageId: contactMessage.id 
              }),
              severity: "warning",
            },
          });
        }
        
        return { 
          success: true, 
          message: "Message submitted successfully",
          contactMessageId: contactMessage.id,
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

  // Create contact message (public - for non-logged in users)
  createContactMessage: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      message: z.string().min(10),
      reasons: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Create the contact message
        const contactMessage = await ctx.db.contactMessage.create({
          data: {
            name: input.name,
            email: input.email,
            subject: input.message.substring(0, 100), // Use first 100 chars as subject
            message: input.message,
            status: "open",
            userId: ctx.session?.user?.id || null,
          },
        });
        
        // Create the reason associations
        for (const reasonKey of input.reasons) {
          await ctx.db.contactMessageReason.create({
            data: {
              contactMessageId: contactMessage.id,
              contactReasonId: reasonKey, // Use contactReasonId instead of reasonKey
            },
          });
        }
        
        // Log the action
        if (ctx.session?.user?.id) {
          await ctx.db.auditLog.create({
            data: {
              userId: ctx.session.user.id,
              action: "contact_message_created",
              resourceType: "contact_message",
              resourceId: contactMessage.id,
              details: JSON.stringify({ email: input.email, reasons: input.reasons }),
              severity: "info",
            },
          });
        }
        
        // TODO: Send webhook notification to external system
        // This would typically go to a CRM, help desk, or notification service
        
        return contactMessage;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to create contact message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create contact message",
        });
      }
    }),

  // Get contact message by ID (protected)
  getContactMessage: protectedProcedure
    .input(z.object({
      messageId: z.string(),
    }))
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

      const message = await ctx.db.contactMessage.findFirst({
        where: {
          id: input.messageId,
          userId: user.id,
        },
        include: {
          replies: {
            orderBy: { createdAt: "asc" },
          },
          reasons: {
            include: {
              contactReason: {
                select: {
                  key: true,
                  label: true,
                  icon: true,
                },
              },
            },
          },
        },
      });

      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return message;
    }),

  // Get user's contact messages (protected)
  getUserContactMessages: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.email) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    const messages = await ctx.db.contactMessage.findMany({
      where: { email: ctx.session.user.email },
      include: {
        reasons: {
          include: {
            contactReason: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    
          // Transform messages to include category and last message info
      const transformedMessages = messages.map((message) => {
        const categories = message.reasons.map((mr) => mr.contactReason.label).join(", ");
        const lastMessage = message.replies.length > 0 
          ? message.replies[message.replies.length - 1] 
          : message;
        
        return {
          ...message,
          categories,
          lastMessage: {
            content: lastMessage.message || message.message,
            createdAt: lastMessage.createdAt || message.createdAt,
            isFromUser: !lastMessage.message, // If no message, it's the original message
          },
          unread: false, // TODO: Implement unread logic
        };
      });
    
    return transformedMessages;
  }),

  // Add reply to contact message (protected)
  addContactReply: protectedProcedure
    .input(z.object({
      messageId: z.string(),
      message: z.string().min(1, "Reply message is required"),
      isInternal: z.boolean().default(false),
    }))
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

      // Verify the user owns this contact message
      const contactMessage = await ctx.db.contactMessage.findFirst({
        where: {
          id: input.messageId,
          userId: user.id,
        },
      });

      if (!contactMessage) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const reply = await ctx.db.contactReply.create({
        data: {
          contactMessageId: input.messageId,
          message: input.message,
          isFromUser: true,
          isInternal: input.isInternal,
        },
      });

      // Update the contact message status to "in_progress" if it was "open"
      if (contactMessage.status === "open") {
        await ctx.db.contactMessage.update({
          where: { id: input.messageId },
          data: { status: "in_progress" },
        });
      }

      // Log the action
      if (contactMessage.tenantId) {
        await ctx.db.auditLog.create({
          data: {
            tenantId: contactMessage.tenantId,
            userId: user.id,
            action: "contact_reply_added",
            resourceType: "contact_reply",
            resourceId: reply.id,
            details: JSON.stringify({ 
              contactMessageId: input.messageId,
              isInternal: input.isInternal 
            }),
            severity: "info",
          },
        });
      }
      
      return { success: true, message: "Reply added successfully" };
    }),

  // Update contact message status (protected)
  updateContactMessageStatus: protectedProcedure
    .input(z.object({
      contactMessageId: z.string(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify the user owns this contact message
        const contactMessage = await ctx.db.contactMessage.findFirst({
          where: {
            id: input.contactMessageId,
            email: ctx.session.user.email,
          },
        });
        
        if (!contactMessage) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Contact message not found" });
        }
        
        // Update the status
        const updatedMessage = await ctx.db.contactMessage.update({
          where: { id: input.contactMessageId },
          data: { status: input.status },
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id || "unknown",
            action: "contact_message_status_updated",
            resourceType: "contact_message",
            resourceId: input.contactMessageId,
            details: JSON.stringify({ status: input.status }),
            severity: "info",
          },
        });
        
        return updatedMessage;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to update contact message status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update contact message status",
        });
      }
    }),
});
