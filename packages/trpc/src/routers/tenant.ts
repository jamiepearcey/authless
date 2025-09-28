import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, platformAdminProcedure, tenantMemberProcedure, protectedProcedure } from "../middleware";
import { PrismaClient } from "@db/base";
import { OutboxEvents } from "../outbox-service";

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  logoUrl: true,
  plan: true,
  primaryColor: true,
  secondaryColor: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  invitePolicy: true,
  emailVerificationBypassEnabled: true,
  ssoEnabled: true,
  description: true,
  website: true,
  industry: true,
  size: true,
  contactEmail: true,
  subdomain: true,
  customDomain: true,
  domainAlias: true,
  registrationClosed: true,
  timezone: true,
  locale: true,
  theme: true
} as const;


export const tenantRouter = router({
  // Create tenant (platform admin only)
  createTenant: platformAdminProcedure
    .input(z.object({
      slug: z.string().min(2).max(32),
      name: z.string().min(1),
      subdomain: z.string().optional(),
      domainAlias: z.string().optional(),
      registrationClosed: z.boolean().default(false),
      plan: z.string().default("free"),
      invitePolicy: z.enum(["admin_only", "open"]).default("admin_only"),
      description: z.string().optional(),
      website: z.string().optional(),
      industry: z.string().optional(),
      size: z.string().optional(),
      contactEmail: z.string().email().optional(),
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
        const newTenant = await ctx.db.tenant.create({
          data: {
            slug: input.slug,
            name: input.name,
            subdomain: input.subdomain,
            domainAlias: input.domainAlias,
            registrationClosed: input.registrationClosed,
            plan: input.plan,
            invitePolicy: input.invitePolicy,
            description: input.description,
            website: input.website,
            industry: input.industry,
            size: input.size,
            contactEmail: input.contactEmail,
          },
        });

        // Publish tenant created event
        await ctx.outbox.publishTenantEvent(
          OutboxEvents.TENANT_CREATED,
          newTenant.id,
          {
            tenantId: newTenant.id,
            slug: input.slug,
            name: input.name,
            plan: input.plan,
            createdBy: ctx.user.id,
            createdByEmail: ctx.user.email,
            timestamp: new Date().toISOString(),
            metadata: {
              subdomain: input.subdomain,
              invitePolicy: input.invitePolicy,
              description: input.description,
              website: input.website,
              industry: input.industry,
              size: input.size,
              contactEmail: input.contactEmail,
            },
          },
          { 
            traceId: ctx.trace.traceId,
            idempotencyKey: `tenant.created.${newTenant.id}.${Date.now()}`
          }
        );
        
        return newTenant;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to create tenant:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create tenant",
        });
      }
    }),

  // Get tenant by slug (tenant members can access)
  getTenant: tenantMemberProcedure
    .input(z.object({ slug: z.string() }))  
    .query(async ({ ctx, input }) => {
      console.log("input", input);
      const tenant = await ctx.db.tenant.findUnique({
        where: { slug: input.slug },
        include: {
          memberships: {
            where: { status: "active" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  createdAt: true,
                  lastLoginAt: true,
                  isEmailVerified: true,
                },
              },
            },
          },
        },
      });
      
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }
      
      return tenant;
    }),

  // Update tenant (platform admin only)
  updateTenant: platformAdminProcedure
    .input(z.object({
      slug: z.string(),
      data: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        website: z.string().url().optional(),
        industry: z.string().optional(),
        size: z.string().optional(),
        contactEmail: z.string().email().optional(),
        domainAlias: z.string().optional(),
        registrationClosed: z.boolean().optional(),
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
        // Debug: Check context availability
        console.log("updateTenant context check:", {
          hasUser: !!ctx.user,
          userId: ctx.user?.id,
          userEmail: ctx.user?.email,
          hasSession: !!ctx.session,
          sessionUserId: ctx.session?.user?.id,
          sessionUserEmail: ctx.session?.user?.email,
          hasOutbox: !!ctx.outbox,
          hasTrace: !!ctx.trace
        });
        
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
        
        // Publish tenant updated event
        console.log("About to publish tenant updated event...");
        try {
          const eventId = await ctx.outbox.publishTenantEvent(
            OutboxEvents.TENANT_UPDATED,
            updatedTenant.id,
            {
              tenantId: updatedTenant.id,
              slug: slug,
              updatedBy: ctx.user.id,
              updatedByEmail: ctx.user.email,
              timestamp: new Date().toISOString(),
              changes: data,
              metadata: {
                previousState: existingTenant,
              },
            },
            { 
              traceId: ctx.trace.traceId,
              idempotencyKey: `tenant.updated.${updatedTenant.id}.${Date.now()}`
            }
          );
          console.log("Successfully published tenant updated event with ID:", eventId);
        } catch (outboxError) {
          console.error("Failed to publish tenant updated event:", {
            error: outboxError,
            errorMessage: outboxError instanceof Error ? outboxError.message : 'Unknown error',
            errorStack: outboxError instanceof Error ? outboxError.stack : undefined,
            userContext: {
              hasUser: !!ctx.user,
              userId: ctx.user?.id,
              userEmail: ctx.user?.email,
              hasSession: !!ctx.session,
              sessionUserId: ctx.session?.user?.id,
              sessionUserEmail: ctx.session?.user?.email
            }
          });
          throw outboxError; // Re-throw to see the actual error
        }
        
        return updatedTenant;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to update tenant - Full error details:", {
          error: error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update tenant",
        });
      }
    }),

  // Delete tenant (platform admin only)
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
            traceId: ctx.trace.traceId,
            resourceId: deletedTenant.id,
            details: JSON.stringify({ slug }),
            severity: "warning",
          },
        });

        // Publish tenant deleted event (optional - don't fail if outbox is unavailable)
        try {
          await ctx.outbox.publishTenantEvent(
            OutboxEvents.TENANT_DELETED,
            deletedTenant.id,
            {
              tenantId: deletedTenant.id,
              slug: slug,
              deletedBy: ctx.user.id,
              deletedByEmail: ctx.user.email,
              timestamp: new Date().toISOString(),
              metadata: {
                previousState: existingTenant,
              },
            },
            { 
              traceId: ctx.trace.traceId,
              idempotencyKey: `tenant.deleted.${deletedTenant.id}.${Date.now()}`
            }
          );
        } catch (outboxError) {
          console.warn("Failed to publish tenant deleted event to outbox:", outboxError);
          // Continue with the deletion even if outbox publishing fails
        }
        
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

  // Get all tenants (platform admin only)
  getAllTenants: platformAdminProcedure.query(async ({ ctx }) => {
    const tenants = await ctx.db.tenant.findMany({
      where: { status: { not: "deleted" } },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            memberships: {
              where: { status: "active" },
            },
          },
        },
      },
    });
    
    return tenants;
  }),

  // Get unique roles for a specific tenant (platform admin only)
  getTenantRoles: platformAdminProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const roles = await ctx.db.membership.findMany({
        where: {
          tenantId: input.tenantId,
          status: "active",
        },
        select: { role: true },
        distinct: ["role"],
      });
      
      return roles.map(membership => membership.role);
    }),

  // Get tenants with pagination and filtering (platform admin only)
  getTenants: platformAdminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100),
      offset: z.number().min(0),
      status: z.string().optional(),
      plan: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { limit, offset, status, plan } = input;
      
      // Build where clause
      const where: any = { status: { not: "deleted" } };
      if (status && status !== "all") {
        where.status = status;
      }
      if (plan && plan !== "all") {
        where.plan = plan;
      }
      
      // Get total count for pagination
      const total = await ctx.db.tenant.count({ where });
      
      // Get tenants with pagination
      const tenants = await ctx.db.tenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          _count: {
            select: {
              memberships: {
                where: { status: "active" },
              },
            },
          },
        },
      });
      
              return {
          tenants,
          total,
          hasMore: total > offset + limit,
        };
    }),

  // Get tenant memberships (tenant members can access)
  getTenantMemberships: tenantMemberProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get tenant first
      const tenant = await ctx.db.tenant.findUnique({
        where: { slug: input.slug },
      });
      
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" });
      }
      
      // Get all memberships for this tenant (active and pending)
      const memberships = await ctx.db.membership.findMany({
        where: {
          tenantId: tenant.id,
          status: { in: ["active", "pending"] },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              image: true,
              createdAt: true,
              lastLoginAt: true,
              isEmailVerified: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      
      // Transform the data to include computed fields
      const transformedMemberships = memberships.map((membership) => ({
        id: membership.id,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          status: tenant.status,
          logoUrl: tenant.logoUrl,
          plan: tenant.plan,
          primaryColor: tenant.primaryColor,
          secondaryColor: tenant.secondaryColor,
        },
        role: membership.role,
        status: membership.status,
        createdAt: membership.createdAt,
        lastActiveAt: membership.lastActiveAt,
        isAdmin: membership.role === "admin",
        user: membership.user,
      }));
      
      return transformedMemberships;
    }),

  // Get user's tenants (for tenant switcher)
  getUserTenants: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.email) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const user = await ctx.db.user.findUnique({
      where: { email: ctx.session.user.email },
      include: {
        memberships: {
          where: { status: "active", role: "admin" },
          include: {
            tenant: {
              select: tenantSelect,
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // Transform to match the expected interface
    const userTenants = user.memberships.map((membership) => ({
      tenant: membership.tenant,
      role: membership.role,
      isAdmin: membership.role === "admin",
      createdAt: membership.createdAt,
      lastActiveAt: membership.lastActiveAt,
    }));

    return userTenants;
  }),

  // Get tenants for workflow testing (protected - limited scope)
  getTenantsForWorkflow: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const tenants = await ctx.db.tenant.findMany({
        where: { 
          status: { not: "deleted" },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          plan: true,
        },
        take: input.limit,
        orderBy: { createdAt: "desc" },
      });
      
      return tenants;
    }),
});
