import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, tenantAdminProcedure, platformAdminProcedure } from "../middleware";

// Routing configuration schemas
const EmailRoutingConfigSchema = z.object({
  type: z.literal("email"),
  addresses: z.array(z.string().email()),
});

const WebhookRoutingConfigSchema = z.object({
  type: z.literal("webhook"),
  url: z.string().url(),
  method: z.enum(["POST", "PUT"]).default("POST"),
  headers: z.record(z.string()).optional(),
  authentication: z.object({
    type: z.enum(["bearer", "api_key", "basic"]),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    headerName: z.string().optional(),
  }).optional(),
});

const TenantRoutingConfigSchema = z.object({
  type: z.literal("tenant_default"),
  fallbackEmail: z.string().email().optional(),
});

const RoutingConfigSchema = z.union([
  EmailRoutingConfigSchema,
  WebhookRoutingConfigSchema,
  TenantRoutingConfigSchema,
]);

export const supportOptionRouter = router({
  // ==========================================
  // GLOBAL SUPPORT OPTIONS (Platform Admin)
  // ==========================================

  // Get all global support options
  getGlobalSupportOptions: platformAdminProcedure
    .input(z.object({
      includeHidden: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const where: any = { 
          tenantId: null, // Global options
          isActive: true,
        };
        
        if (!input.includeHidden) {
          where.isHidden = false;
        }
        
        const options = await ctx.db.supportOption.findMany({
          where,
          orderBy: { sortOrder: "asc" },
          include: {
            _count: {
              select: { cases: true }
            }
          }
        });
        
        return options;
      } catch (error) {
        console.error("Failed to fetch global support options:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch global support options",
        });
      }
    }),

  // Create global support option
  createGlobalSupportOption: platformAdminProcedure
    .input(z.object({
      key: z.string().min(1, "Key is required").regex(/^[a-z0-9_]+$/, "Key must contain only lowercase letters, numbers, and underscores"),
      label: z.string().min(1, "Label is required"),
      description: z.string().optional(),
      icon: z.string().optional(),
      isActive: z.boolean().default(true),
      isHidden: z.boolean().default(false),
      sortOrder: z.number().default(0),
      routingConfig: RoutingConfigSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if key already exists
        const existing = await ctx.db.supportOption.findFirst({
          where: { 
            key: input.key,
            tenantId: null,
          }
        });
        
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A global support option with this key already exists",
          });
        }
        
        const option = await ctx.db.supportOption.create({
          data: {
            key: input.key,
            label: input.label,
            description: input.description,
            icon: input.icon,
            isActive: input.isActive,
            isGlobal: true,
            tenantId: null,
            isHidden: input.isHidden,
            sortOrder: input.sortOrder,
            routingConfig: input.routingConfig,
          }
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id || "system",
            action: "global_support_option_created",
            resourceType: "support_option",
            resourceId: option.id,
            details: JSON.stringify({ 
              key: input.key,
              label: input.label 
            }),
            severity: "info",
          },
        });
        
        return option;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to create global support option:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create global support option",
        });
      }
    }),

  // Update global support option
  updateGlobalSupportOption: platformAdminProcedure
    .input(z.object({
      id: z.string(),
      label: z.string().min(1, "Label is required").optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      isActive: z.boolean().optional(),
      isHidden: z.boolean().optional(),
      sortOrder: z.number().optional(),
      routingConfig: RoutingConfigSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;
        
        const option = await ctx.db.supportOption.update({
          where: { 
            id,
            tenantId: null, // Ensure it's a global option
          },
          data: updateData,
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id || "system",
            action: "global_support_option_updated",
            resourceType: "support_option",
            resourceId: option.id,
            details: JSON.stringify(updateData),
            severity: "info",
          },
        });
        
        return option;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to update global support option:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update global support option",
        });
      }
    }),

  // Delete global support option
  deleteGlobalSupportOption: platformAdminProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if option has associated cases
        const caseCount = await ctx.db.supportCase.count({
          where: { supportOptionId: input.id }
        });
        
        if (caseCount > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot delete support option with ${caseCount} associated cases`,
          });
        }
        
        const option = await ctx.db.supportOption.delete({
          where: { 
            id: input.id,
            tenantId: null, // Ensure it's a global option
          }
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            userId: ctx.session.user.id || "system",
            action: "global_support_option_deleted",
            resourceType: "support_option",
            resourceId: input.id,
            details: JSON.stringify({ 
              key: option.key,
              label: option.label 
            }),
            severity: "info",
          },
        });
        
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to delete global support option:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete global support option",
        });
      }
    }),

  // ==========================================
  // TENANT SUPPORT OPTIONS (Tenant Admin)
  // ==========================================

  // Get tenant support options (merged with global)
  getTenantSupportOptions: protectedProcedure
    .input(z.object({
      tenantId: z.string(),
      includeHidden: z.boolean().default(false),
      includeGlobal: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Get global options
        const globalOptions = input.includeGlobal ? await ctx.db.supportOption.findMany({
          where: {
            tenantId: null,
            isActive: true,
            isHidden: input.includeHidden ? undefined : false,
          },
          orderBy: { sortOrder: "asc" },
        }) : [];
        
        // Get tenant-specific options
        const tenantOptions = await ctx.db.supportOption.findMany({
          where: {
            tenantId: input.tenantId,
            isActive: true,
            isHidden: input.includeHidden ? undefined : false,
          },
          orderBy: { sortOrder: "asc" },
          include: {
            parent: true, // Include parent for overrides
          }
        });
        
        // Merge and override logic
        const optionsMap = new Map();
        
        // Add global options first
        globalOptions.forEach(option => {
          optionsMap.set(option.key, {
            ...option,
            isOverridden: false,
            scope: 'global' as const,
          });
        });
        
        // Add/override with tenant options
        tenantOptions.forEach(option => {
          if (option.parentOptionId) {
            // This is an override
            optionsMap.set(option.key, {
              ...option,
              isOverridden: true,
              scope: 'tenant' as const,
              parent: option.parent,
            });
          } else {
            // This is a tenant-specific option
            optionsMap.set(option.key, {
              ...option,
              isOverridden: false,
              scope: 'tenant' as const,
            });
          }
        });
        
        // Convert back to array and sort
        const mergedOptions = Array.from(optionsMap.values())
          .sort((a, b) => a.sortOrder - b.sortOrder);
        
        return mergedOptions;
      } catch (error) {
        console.error("Failed to fetch tenant support options:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tenant support options",
        });
      }
    }),

  // Create tenant support option
  createTenantSupportOption: tenantAdminProcedure
    .input(z.object({
      tenantId: z.string(),
      key: z.string().min(1, "Key is required").regex(/^[a-z0-9_]+$/, "Key must contain only lowercase letters, numbers, and underscores"),
      label: z.string().min(1, "Label is required"),
      description: z.string().optional(),
      icon: z.string().optional(),
      isActive: z.boolean().default(true),
      isHidden: z.boolean().default(false),
      sortOrder: z.number().default(0),
      routingConfig: RoutingConfigSchema,
      parentOptionId: z.string().optional(), // For overriding global options
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if key already exists for this tenant
        const existing = await ctx.db.supportOption.findFirst({
          where: { 
            key: input.key,
            tenantId: input.tenantId,
          }
        });
        
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A support option with this key already exists for this tenant",
          });
        }
        
        // If this is an override, verify parent exists
        if (input.parentOptionId) {
          const parent = await ctx.db.supportOption.findUnique({
            where: { id: input.parentOptionId }
          });
          
          if (!parent || parent.tenantId !== null) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Parent option must be a global option",
            });
          }
        }
        
        const option = await ctx.db.supportOption.create({
          data: {
            key: input.key,
            label: input.label,
            description: input.description,
            icon: input.icon,
            isActive: input.isActive,
            isGlobal: false,
            tenantId: input.tenantId,
            parentOptionId: input.parentOptionId,
            isHidden: input.isHidden,
            sortOrder: input.sortOrder,
            routingConfig: input.routingConfig,
          }
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: input.tenantId,
            userId: ctx.session.user.id || "system",
            action: "tenant_support_option_created",
            resourceType: "support_option",
            resourceId: option.id,
            details: JSON.stringify({ 
              key: input.key,
              label: input.label,
              isOverride: !!input.parentOptionId 
            }),
            severity: "info",
          },
        });
        
        return option;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to create tenant support option:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create tenant support option",
        });
      }
    }),

  // Update tenant support option
  updateTenantSupportOption: tenantAdminProcedure
    .input(z.object({
      id: z.string(),
      tenantId: z.string(),
      label: z.string().min(1, "Label is required").optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      isActive: z.boolean().optional(),
      isHidden: z.boolean().optional(),
      sortOrder: z.number().optional(),
      routingConfig: RoutingConfigSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, tenantId, ...updateData } = input;
        
        const option = await ctx.db.supportOption.update({
          where: { 
            id,
            tenantId, // Ensure it belongs to the tenant
          },
          data: updateData,
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId,
            userId: ctx.session.user.id || "system",
            action: "tenant_support_option_updated",
            resourceType: "support_option",
            resourceId: option.id,
            details: JSON.stringify(updateData),
            severity: "info",
          },
        });
        
        return option;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to update tenant support option:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update tenant support option",
        });
      }
    }),

  // Delete tenant support option
  deleteTenantSupportOption: tenantAdminProcedure
    .input(z.object({
      id: z.string(),
      tenantId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if option has associated cases
        const caseCount = await ctx.db.supportCase.count({
          where: { supportOptionId: input.id }
        });
        
        if (caseCount > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot delete support option with ${caseCount} associated cases`,
          });
        }
        
        const option = await ctx.db.supportOption.delete({
          where: { 
            id: input.id,
            tenantId: input.tenantId,
          }
        });
        
        // Log the action
        await ctx.db.auditLog.create({
          data: {
            tenantId: input.tenantId,
            userId: ctx.session.user.id || "system",
            action: "tenant_support_option_deleted",
            resourceType: "support_option",
            resourceId: input.id,
            details: JSON.stringify({ 
              key: option.key,
              label: option.label 
            }),
            severity: "info",
          },
        });
        
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to delete tenant support option:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete tenant support option",
        });
      }
    }),

  // ==========================================
  // PUBLIC ENDPOINTS (for user selection)
  // ==========================================

  // Get available support options for contact form
  getAvailableSupportOptions: protectedProcedure
    .input(z.object({
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Get global options
        const globalOptions = await ctx.db.supportOption.findMany({
          where: {
            tenantId: null,
            isActive: true,
            isHidden: false,
          },
          select: {
            id: true,
            key: true,
            label: true,
            description: true,
            icon: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        });
        
        if (!input.tenantId) {
          return globalOptions;
        }
        
        // Get tenant options that might override globals
        const tenantOptions = await ctx.db.supportOption.findMany({
          where: {
            tenantId: input.tenantId,
            isActive: true,
            isHidden: false,
          },
          select: {
            id: true,
            key: true,
            label: true,
            description: true,
            icon: true,
            sortOrder: true,
            parentOptionId: true,
          },
          orderBy: { sortOrder: "asc" },
        });
        
        // Merge options (tenant overrides global)
        const optionsMap = new Map();
        
        // Add global options
        globalOptions.forEach(option => {
          optionsMap.set(option.key, option);
        });
        
        // Add/override with tenant options
        tenantOptions.forEach(option => {
          optionsMap.set(option.key, {
            id: option.id,
            key: option.key,
            label: option.label,
            description: option.description,
            icon: option.icon,
            sortOrder: option.sortOrder,
          });
        });
        
        return Array.from(optionsMap.values())
          .sort((a, b) => a.sortOrder - b.sortOrder);
      } catch (error) {
        console.error("Failed to fetch available support options:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch available support options",
        });
      }
    }),

  // ==========================================
  // UTILITY ENDPOINTS
  // ==========================================

  // Test support option routing
  testSupportOptionRouting: tenantAdminProcedure
    .input(z.object({
      optionId: z.string(),
      testMessage: z.object({
        subject: z.string(),
        content: z.string(),
        fromEmail: z.string().email(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const option = await ctx.db.supportOption.findUnique({
          where: { id: input.optionId },
          include: {
            tenant: true,
          }
        });
        
        if (!option) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Support option not found",
          });
        }
        
        const routingConfig = option.routingConfig as any;
        let testResult: any = {
          success: false,
          optionId: input.optionId,
          routingType: routingConfig.type,
        };
        
        try {
          switch (routingConfig.type) {
            case "email":
              // Test email routing
              testResult = {
                ...testResult,
                success: true,
                addresses: routingConfig.addresses,
                message: `Would send to: ${routingConfig.addresses.join(", ")}`,
              };
              break;
              
            case "webhook":
              // Test webhook routing (could make actual request in production)
              testResult = {
                ...testResult,
                success: true,
                webhookUrl: routingConfig.url,
                method: routingConfig.method || "POST",
                message: `Would POST to: ${routingConfig.url}`,
              };
              break;
              
            case "tenant_default":
              // Test tenant default routing
              const fallback = routingConfig.fallbackEmail || option.tenant?.contactEmail || "" ;
              testResult = {
                ...testResult,
                success: !!fallback,
                fallbackEmail: fallback,
                message: fallback 
                  ? `Would send to tenant default: ${fallback}`
                  : "No tenant default email configured",
              };
              break;
              
            default:
              testResult.message = `Unknown routing type: ${routingConfig.type}`;
          }
        } catch (routingError) {
          testResult.message = `Routing test failed: ${routingError}`;
        }
        
        // Log the test
        await ctx.db.auditLog.create({
          data: {
            tenantId: option.tenantId,
            userId: ctx.session.user.id || "system",
            action: "support_option_routing_tested",
            resourceType: "support_option",
            resourceId: input.optionId,
            details: JSON.stringify({ 
              testResult,
              testMessage: input.testMessage 
            }),
            severity: "info",
          },
        });
        
        return testResult;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error("Failed to test support option routing:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to test support option routing",
        });
      }
    }),
});