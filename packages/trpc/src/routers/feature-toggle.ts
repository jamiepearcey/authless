import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../middleware";
import { db } from "@db/base";
import { featureToggleService, type FeatureTier } from "../feature-toggle-service";
import { TRPCError } from "@trpc/server";

// Input validation schemas
const featureKeySchema = z.string().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/);
const featureTierSchema = z.enum(["Core", "Secondary", "Tenancy-only"]);

const createFeatureSchema = z.object({
  key: featureKeySchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tier: featureTierSchema,
  defaultEnabled: z.boolean().default(false)
});

const setFeatureRuleSchema = z.object({
  featureKey: featureKeySchema,
  enabled: z.boolean()
});

const setTenantFeatureRuleSchema = z.object({
  featureKey: featureKeySchema,
  tenantId: z.string(),
  enabled: z.boolean()
});

const getAuditHistorySchema = z.object({
  featureKey: featureKeySchema,
  tenantId: z.string().optional(),
  limit: z.number().min(1).max(100).default(50)
});

export const featureToggleRouter = router({
  // Public/Client endpoints - read-only access to effective flags
  getEffectiveFeatures: publicProcedure
    .input(z.object({
      tenantId: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      // Anyone can read effective feature flags for a tenant they have access to
      if (input.tenantId && ctx.session?.user?.id) {
        // Verify user has access to this tenant
        const membership = await db.membership.findFirst({
          where: {
            userId: ctx.session.user.id,
            tenantId: input.tenantId,
            status: "active"
          }
        });

        if (!membership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied to tenant features"
          });
        }
      }

      return featureToggleService.getEffectiveFeatures({
        tenantId: input.tenantId,
        userId: ctx.session?.user?.id
      });
    }),

  isFeatureEnabled: publicProcedure
    .input(z.object({
      featureKey: featureKeySchema,
      tenantId: z.string().optional()
    }))
    .query(async ({ input, ctx }) => {
      // Verify tenant access if tenantId provided
      if (input.tenantId && ctx.session?.user?.id) {
        const membership = await db.membership.findFirst({
          where: {
            userId: ctx.session.user.id,
            tenantId: input.tenantId,
            status: "active"
          }
        });

        if (!membership) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied to tenant features"
          });
        }
      }

      return featureToggleService.evaluateFeature(input.featureKey, {
        tenantId: input.tenantId,
        userId: ctx.session?.user?.id
      });
    }),

  // Global Admin endpoints - platform admin only
  createFeatureDefinition: protectedProcedure
    .input(createFeatureSchema)
    .mutation(async ({ input, ctx }) => {
      // Check if user is platform admin
      if (ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Platform admin access required"
        });
      }

      // Check if feature already exists
      const existing = await db.featureDefinition.findUnique({
        where: { key: input.key }
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Feature with this key already exists"
        });
      }

      const feature = await db.featureDefinition.create({
        data: {
          ...input,
          createdBy: ctx.session.user.id
        }
      });

      return feature;
    }),

  updateFeatureDefinition: protectedProcedure
    .input(z.object({
      key: featureKeySchema,
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(1000).optional(),
      tier: featureTierSchema.optional(),
      defaultEnabled: z.boolean().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Platform admin access required"
        });
      }

      const { key, ...updateData } = input;

      const feature = await db.featureDefinition.update({
        where: { key },
        data: updateData
      });

      return feature;
    }),

  deleteFeatureDefinition: protectedProcedure
    .input(z.object({
      key: featureKeySchema
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Platform admin access required"
        });
      }

      // Check for existing rules before deletion
      const globalRules = await db.globalFeatureRule.count({
        where: { featureKey: input.key }
      });

      const tenantRules = await db.tenantFeatureRule.count({
        where: { featureKey: input.key }
      });

      if (globalRules > 0 || tenantRules > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete feature with active rules. Remove all rules first."
        });
      }

      await db.featureDefinition.delete({
        where: { key: input.key }
      });

      return { success: true };
    }),

  listFeatureDefinitions: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Platform admin access required"
        });
      }

      const features = await db.featureDefinition.findMany({
        include: {
          globalRules: true,
          _count: {
            select: {
              tenantRules: true,
              auditEntries: true
            }
          }
        },
        orderBy: [
          { tier: 'asc' },
          { name: 'asc' }
        ]
      });

      return features.map(feature => ({
        ...feature,
        hasGlobalRule: feature.globalRules && feature.globalRules.length > 0,
        globalEnabled: feature.globalRules && feature.globalRules.length > 0 ? feature.globalRules[0].enabled : undefined,
        tenantRuleCount: feature._count.tenantRules,
        auditEntryCount: feature._count.auditEntries
      }));
    }),

  setGlobalFeatureRule: protectedProcedure
    .input(setFeatureRuleSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Platform admin access required"
        });
      }

      await featureToggleService.setGlobalRule(
        input.featureKey,
        input.enabled,
        ctx.session.user.id
      );

      return { success: true };
    }),

  removeGlobalFeatureRule: protectedProcedure
    .input(z.object({
      featureKey: featureKeySchema
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Platform admin access required"
        });
      }

      await featureToggleService.removeGlobalRule(
        input.featureKey,
        ctx.session.user.id
      );

      return { success: true };
    }),

  getGlobalAuditHistory: protectedProcedure
    .input(getAuditHistorySchema.omit({ tenantId: true }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Platform admin access required"
        });
      }

      return featureToggleService.getAuditHistory(input.featureKey, undefined, input.limit);
    }),

  // Tenant Admin endpoints - tenant admin only
  getTenantFeatures: protectedProcedure
    .input(z.object({
      tenantId: z.string()
    }))
    .query(async ({ input, ctx }) => {
      // Verify user is admin of this tenant
      const membership = await db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          tenantId: input.tenantId,
          role: "admin",
          status: "active"
        }
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Tenant admin access required"
        });
      }

      return featureToggleService.getDetailedFeatures({
        tenantId: input.tenantId,
        userId: ctx.session.user.id
      });
    }),

  setTenantFeatureRule: protectedProcedure
    .input(setTenantFeatureRuleSchema)
    .mutation(async ({ input, ctx }) => {
      // Verify user is admin of this tenant
      const membership = await db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          tenantId: input.tenantId,
          role: "admin",
          status: "active"
        }
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Tenant admin access required"
        });
      }

      await featureToggleService.setTenantRule(
        input.featureKey,
        input.tenantId,
        input.enabled,
        ctx.session.user.id
      );

      return { success: true };
    }),

  removeTenantFeatureRule: protectedProcedure
    .input(z.object({
      featureKey: featureKeySchema,
      tenantId: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify user is admin of this tenant
      const membership = await db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          tenantId: input.tenantId,
          role: "admin",
          status: "active"
        }
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Tenant admin access required"
        });
      }

      await featureToggleService.removeTenantRule(
        input.featureKey,
        input.tenantId,
        ctx.session.user.id
      );

      return { success: true };
    }),

  getTenantAuditHistory: protectedProcedure
    .input(getAuditHistorySchema)
    .query(async ({ input, ctx }) => {
      if (!input.tenantId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tenant ID is required"
        });
      }

      // Verify user is admin of this tenant
      const membership = await db.membership.findFirst({
        where: {
          userId: ctx.session.user.id,
          tenantId: input.tenantId,
          role: "admin",
          status: "active"
        }
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Tenant admin access required"
        });
      }

      return featureToggleService.getAuditHistory(
        input.featureKey,
        input.tenantId,
        input.limit
      );
    }),
});
