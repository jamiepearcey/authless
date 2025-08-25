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

// Platform admin middleware
const enforcePlatformAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  
  // Check if user is platform admin
  const user = await ctx.db.user.findUnique({
    where: { email: ctx.session.user.email },
    select: { platformRole: true },
  });
  
  if (user?.platformRole !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Platform admin access required" });
  }
  
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const platformAdminProcedure = protectedProcedure.use(enforcePlatformAdmin);

// Tenant admin middleware
const enforceTenantAdmin = t.middleware(async ({ ctx, next, input }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  
  // This middleware will be enhanced once we have tenant context
  // For now, it's a placeholder that allows access
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const tenantAdminProcedure = protectedProcedure.use(enforceTenantAdmin);

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
    if (!ctx.session?.user?.email) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    
    const user = await ctx.db.user.findUnique({
      where: { email: ctx.session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        platformRole: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    
    return user;
  }),

  // Multi-tenancy procedures
  createTenant: platformAdminProcedure
    .input(z.object({
      slug: z.string().min(2).max(32),
      name: z.string().min(1),
      subdomain: z.string().optional(),
      plan: z.string().default("free"),
      invitePolicy: z.enum(["admin_only", "open"]).default("admin_only"),
      description: z.string().optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
      size: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate tenant slug
        if (!/^[a-z0-9-]+$/.test(input.slug)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tenant slug must contain only lowercase letters, numbers, and hyphens",
          });
        }
        
        if (input.slug.startsWith("-") || input.slug.endsWith("-")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tenant slug cannot start or end with a hyphen",
          });
        }
        
        // Check if slug already exists
        const existingTenant = await ctx.db.tenant.findUnique({
          where: { slug: input.slug },
        });
        
        if (existingTenant) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Tenant slug already exists",
          });
        }
        
        // Create tenant
        const tenant = await ctx.db.tenant.create({
          data: {
            slug: input.slug,
            name: input.name,
            subdomain: input.subdomain,
            plan: input.plan,
            invitePolicy: input.invitePolicy,
            description: input.description,
            website: input.website,
            industry: input.industry,
            size: input.size,
          },
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id,
            action: "tenant_created",
            resourceType: "tenant",
            resourceId: tenant.id,
            details: JSON.stringify({ tenantSlug: input.slug, plan: input.plan }),
            severity: "info",
          },
        });
        
        return {
          success: true,
          tenant,
          message: "Tenant created successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to create tenant:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create tenant",
        });
      }
    }),

  getTenants: platformAdminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      status: z.string().optional(),
      plan: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const whereClause: any = {};
        if (input.status) {
          whereClause.status = input.status;
        }
        if (input.plan) {
          whereClause.plan = input.plan;
        }
        
        const [tenants, total] = await Promise.all([
          ctx.db.tenant.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            take: input.limit,
            skip: input.offset,
            include: {
              _count: {
                select: {
                  memberships: true,
                  contactMessages: true,
                },
              },
            },
          }),
          ctx.db.tenant.count({ where: whereClause }),
        ]);
        
        return {
          tenants,
          total,
          hasMore: total > input.offset + input.limit,
        };
      } catch (error) {
        console.error("Failed to fetch tenants:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tenants",
        });
      }
    }),

  getTenant: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const tenant = await ctx.db.tenant.findUnique({
          where: { 
            slug: input.slug,
            status: "active",
          },
          include: {
            _count: {
              select: {
                memberships: true,
                contactMessages: true,
              },
            },
          },
        });
        
        if (!tenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
        }
        
        return tenant;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to fetch tenant:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tenant",
        });
      }
    }),

  inviteUser: tenantAdminProcedure
    .input(z.object({
      tenantId: z.string(),
      email: z.string().email(),
      role: z.enum(["admin", "member"]).default("member"),
      bypassEmailVerification: z.boolean().default(false),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user is already a member
        const existingMembership = await ctx.db.membership.findFirst({
          where: {
            tenantId: input.tenantId,
            user: { email: input.email },
            status: "active",
          },
        });
        
        if (existingMembership) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a member of this tenant",
          });
        }
        
        // Check if invitation already exists
        const existingInvitation = await ctx.db.invitation.findFirst({
          where: {
            tenantId: input.tenantId,
            email: input.email,
            status: "pending",
          },
        });
        
        if (existingInvitation) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Invitation already exists for this user",
          });
        }
        
        // Generate invitation token
        const token = require("crypto").randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        // Create invitation
        const invitation = await ctx.db.invitation.create({
          data: {
            tenantId: input.tenantId,
            email: input.email,
            role: input.role,
            token: require("crypto").createHash("sha256").update(token).digest("hex"),
            expiresAt,
            bypassEmailVerification: input.bypassEmailVerification,
            invitedByUserId: ctx.session.user.id,
            message: input.message,
          },
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: input.tenantId,
            userId: ctx.session.user.id,
            action: "user_invited",
            resourceType: "invitation",
            resourceId: invitation.id,
            details: JSON.stringify({ 
              email: input.email, 
              role: input.role,
              bypassEmailVerification: input.bypassEmailVerification 
            }),
            severity: "info",
          },
        });
        
        // TODO: Send invitation email
        // For now, return the token (in production, this would be sent via email)
        
        return {
          success: true,
          invitationId: invitation.id,
          token: token, // This should be sent via email in production
          message: "Invitation sent successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to invite user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to invite user",
        });
      }
    }),

  updateTenant: platformAdminProcedure
    .input(z.object({
      slug: z.string(),
      data: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        website: z.string().url().optional(),
        industry: z.string().optional(),
        size: z.string().optional(),
        plan: z.enum(["free", "pro", "enterprise"]).optional(),
        status: z.enum(["active", "suspended", "deleted"]).optional(),
        invitePolicy: z.enum(["admin_only", "open"]).optional(),
        emailVerificationBypassEnabled: z.boolean().optional(),
        ssoEnabled: z.boolean().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { slug, data } = input;
        
        // Check if tenant exists
        const existingTenant = await ctx.db.tenant.findUnique({
          where: { slug },
        });
        
        if (!existingTenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
        }
        
        // Update tenant
        const updatedTenant = await ctx.db.tenant.update({
          where: { slug },
          data,
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id || "unknown",
            action: "tenant_updated",
            resourceType: "tenant",
            resourceId: updatedTenant.id,
            details: JSON.stringify({ slug, changes: data }),
            severity: "info",
          },
        });
        
        return updatedTenant;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to update tenant:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update tenant",
        });
      }
    }),

  deleteTenant: platformAdminProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { slug } = input;
        
        // Check if tenant exists
        const existingTenant = await ctx.db.tenant.findUnique({
          where: { slug },
        });
        
        if (!existingTenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
        }
        
        // Soft delete by setting status to deleted
        const deletedTenant = await ctx.db.tenant.update({
          where: { slug },
          data: { 
            status: "deleted",
            deletedAt: new Date(),
          },
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id || "unknown",
            action: "tenant_deleted",
            resourceType: "tenant",
            resourceId: deletedTenant.id,
            details: JSON.stringify({ slug }),
            severity: "warning",
          },
        });
        
        return deletedTenant;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to delete tenant:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete tenant",
        });
      }
    }),

  getTenantMemberships: protectedProcedure
    .input(z.object({ tenantSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { tenantSlug } = input;
        
        // Get tenant first
        const tenant = await ctx.db.tenant.findUnique({
          where: { slug: tenantSlug },
        });
        
        if (!tenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
        }
        
        // Get all memberships for this tenant
        const memberships = await ctx.db.membership.findMany({
          where: { 
            tenantId: tenant.id,
            status: "active",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                createdAt: true,
                lastLoginAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        
        return memberships.map(membership => ({
          id: membership.id,
          role: membership.role,
          isAdmin: membership.role === "admin",
          status: membership.status,
          createdAt: membership.createdAt,
          lastActiveAt: membership.lastActiveAt,
          user: membership.user,
        }));
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to fetch tenant memberships:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tenant memberships",
        });
      }
    }),

  getUserTenants: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.session.user?.email) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      const user = await ctx.db.user.findUnique({
        where: { email: ctx.session.user.email },
        select: { id: true },
      });
      
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      
      const memberships = await ctx.db.membership.findMany({
        where: { 
          userId: user.id,
          status: "active",
        },
        include: {
          tenant: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
              logoUrl: true,
              plan: true,
              primaryColor: true,
              secondaryColor: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      
      return memberships.map(membership => ({
        tenant: membership.tenant,
        role: membership.role,
        isAdmin: membership.role === "admin",
        createdAt: membership.createdAt,
        lastActiveAt: membership.lastActiveAt,
      }));
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      
      console.error("Failed to fetch user tenants:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user tenants",
      });
    }
  }),

  // Contact system procedures
  getContactReasons: publicProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const whereClause: any = { isActive: true };
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
      tenantId: z.string().optional(),
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
      if (input.tenantId) {
        whereClause.tenantId = input.tenantId;
      }
      if (input.category) {
        whereClause.category = input.category;
      }

      const [messages, total] = await Promise.all([
        ctx.db.contactMessage.findMany({
          where: whereClause,
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
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.contactMessage.count({ where: whereClause }),
      ]);

      // Transform messages to include category and last message info
      const transformedMessages = messages.map(msg => {
        const lastReply = msg.replies[msg.replies.length - 1];
        const categories = msg.reasons.map(r => r.contactReason.label).join(", ");
        
        return {
          ...msg,
          category: categories || "General",
          lastMessage: lastReply?.message || msg.message,
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
              messageId: input.messageId,
              isInternal: input.isInternal 
            }),
            severity: "info",
          },
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

      const updateData: any = { status: input.status };
      if (input.status === "resolved") {
        updateData.resolvedAt = new Date();
      }

      await ctx.db.contactMessage.update({
        where: { id: input.messageId },
        data: updateData,
      });

      // Log the action
      if (contactMessage.tenantId) {
        await ctx.db.auditLog.create({
          data: {
            tenantId: contactMessage.tenantId,
            userId: user.id,
            action: "contact_message_status_updated",
            resourceType: "contact_message",
            resourceId: input.messageId,
            details: JSON.stringify({ 
              oldStatus: contactMessage.status,
              newStatus: input.status 
            }),
            severity: "info",
          },
        });
      }

      return {
        success: true,
        message: "Message status updated successfully.",
      };
    }),
});

export type AppRouter = typeof appRouter;
