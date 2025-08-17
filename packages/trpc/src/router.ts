import { z } from "zod";
import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello, ${input.name}!`,
      };
    }),
  
  getUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      
      return user;
    }),
  
  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user?.email) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    const user = await ctx.db.user.findUnique({
      where: { email: ctx.session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    
    return user;
  }),

  // Contact system procedures
  getContactReasons: publicProcedure.query(async ({ ctx }) => {
    try {
      // For now, return hardcoded reasons until Prisma client is regenerated
      const reasons = [
        { id: "1", key: "technical", label: "Technical Issue", description: "Report bugs or technical problems", icon: "Bug" },
        { id: "2", key: "billing", label: "Billing Question", description: "Questions about payments or subscriptions", icon: "CreditCard" },
        { id: "3", key: "account", label: "Account Security", description: "Account access or security concerns", icon: "Shield" },
        { id: "4", key: "feature", label: "Feature Request", description: "Suggest new features or improvements", icon: "MessageCircle" },
        { id: "5", key: "general", label: "General Support", description: "General questions or assistance", icon: "HelpCircle" }
      ];
      
      return reasons;
    } catch (error) {
      console.error("Failed to fetch contact reasons:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch contact reasons.",
      });
    }
  }),

  submitContactMessage: publicProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email address"),
      subject: z.string().min(1, "Subject is required"),
      message: z.string().min(10, "Message must be at least 10 characters"),
      reasonIds: z.array(z.string()).min(1, "At least one reason must be selected"),
      userId: z.string().optional(),
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
            status: "open",
            priority: "normal",
          },
        });

        // TODO: Create reason associations when Prisma client is regenerated
        // For now, just create the message

        // TODO: Send webhook notification to external system
        // This would typically go to a CRM, help desk, or notification service
        
        return {
          success: true,
          messageId: contactMessage.id,
          message: "Your message has been sent successfully. We'll get back to you soon.",
        };
      } catch (error) {
        console.error("Failed to submit contact message:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit your message. Please try again.",
        });
      }
    }),

  getUserContactMessages: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      status: z.string().optional(),
      category: z.string().optional(),
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

      const whereClause: any = { userId: user.id };
      if (input.status) {
        whereClause.status = input.status;
      }

              const [messages, total] = await Promise.all([
          ctx.db.contactMessage.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            take: input.limit,
            skip: input.offset,
          }),
          ctx.db.contactMessage.count({ where: whereClause }),
        ]);

        // Transform messages to include category and last message info
        const transformedMessages = messages.map(msg => {
          return {
            ...msg,
            category: "General", // TODO: Add categories when Prisma client is regenerated
            lastMessage: msg.message,
            unread: false, // TODO: Implement unread logic
          };
        });

      return {
        messages: transformedMessages,
        total,
        hasMore: total > input.offset + input.limit,
      };
    }),

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
      });

      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return message;
    }),

  addContactReply: protectedProcedure
    .input(z.object({
      messageId: z.string(),
      message: z.string().min(1, "Reply message is required"),
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
        },
      });

      // Update the contact message status to "in_progress" if it was "open"
      if (contactMessage.status === "open") {
        await ctx.db.contactMessage.update({
          where: { id: input.messageId },
          data: { status: "in_progress" },
        });
      }

      return {
        success: true,
        replyId: reply.id,
        message: "Your reply has been added successfully.",
      };
    }),

  updateContactMessageStatus: protectedProcedure
    .input(z.object({
      messageId: z.string(),
      status: z.enum(["open", "pending", "in_progress", "resolved", "closed"]),
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

      await ctx.db.contactMessage.update({
        where: { id: input.messageId },
        data: { status: input.status },
      });

      return {
        success: true,
        message: "Message status updated successfully.",
      };
    }),
});

export type AppRouter = typeof appRouter;
