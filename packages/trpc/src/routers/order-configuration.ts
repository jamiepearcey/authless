import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, platformAdminProcedure, publicProcedure } from "../middleware";

// Enums for validation
const SubscriptionFrequencyEnum = z.enum(['EVERY_10_MINUTES', 'MONTHLY', 'QUARTERLY', 'YEARLY']);

// Input schemas
const CreateOrderConfigurationInput = z.object({
  tenantId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  features: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  termsContent: z.string().optional(),
  requiresTerms: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const UpdateOrderConfigurationInput = CreateOrderConfigurationInput.partial().extend({
  id: z.string(),
});

const CreatePricingOptionInput = z.object({
  orderConfigurationId: z.string(),
  name: z.string().min(1, "Name is required"),
  amount: z.number().int().min(0, "Amount must be positive"),
  currency: z.string().default("gbp"),
  frequency: SubscriptionFrequencyEnum.optional(),
  isRecurring: z.boolean().default(false),
  discountPercent: z.number().int().min(0).max(100).optional(),
  discountAmount: z.number().int().min(0).optional(),
  discountDescription: z.string().optional(),
  trialDays: z.number().int().min(0).default(0),
  setupFee: z.number().int().min(0).default(0),
  displayOrder: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
  stripePriceId: z.string().optional(),
  stripeProductId: z.string().optional(),
});

const UpdatePricingOptionInput = CreatePricingOptionInput.partial().extend({
  id: z.string(),
});

export const orderConfigurationRouter = router({
  // Public endpoints - for fetching configurations for checkout
  getBySlug: publicProcedure
    .input(z.object({
      slug: z.string(),
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const configuration = await ctx.db.orderConfiguration.findFirst({
        where: {
          slug: input.slug,
          tenantId: input.tenantId || null,
          isActive: true,
          isPublic: true,
        },
        include: {
          pricingOptions: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      if (!configuration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order configuration not found',
        });
      }

      return configuration;
    }),

  getPublicConfigurations: publicProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const configurations = await ctx.db.orderConfiguration.findMany({
        where: {
          tenantId: input.tenantId || null,
          isActive: true,
          isPublic: true,
          ...(input.category && { category: input.category }),
        },
        include: {
          pricingOptions: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });

      return configurations;
    }),

  // Protected endpoints - for authenticated users
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const configuration = await ctx.db.orderConfiguration.findUnique({
        where: { id: input.id },
        include: {
          pricingOptions: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      if (!configuration) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order configuration not found',
        });
      }

      return configuration;
    }),

  // Admin endpoints - for managing configurations
  list: platformAdminProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      includeInactive: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const configurations = await ctx.db.orderConfiguration.findMany({
        where: {
          tenantId: input.tenantId || null,
          ...(input.includeInactive ? {} : { isActive: true }),
        },
        include: {
          pricingOptions: {
            orderBy: { displayOrder: 'asc' },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { displayOrder: 'asc' },
      });

      return configurations;
    }),

  create: platformAdminProcedure
    .input(CreateOrderConfigurationInput)
    .mutation(async ({ ctx, input }) => {
      // Check if slug already exists for this tenant
      const existing = await ctx.db.orderConfiguration.findFirst({
        where: {
          slug: input.slug,
          tenantId: input.tenantId || null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An order configuration with this slug already exists',
        });
      }

      const configuration = await ctx.db.orderConfiguration.create({
        data: input,
        include: {
          pricingOptions: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      return configuration;
    }),

  update: platformAdminProcedure
    .input(UpdateOrderConfigurationInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if slug already exists for this tenant (excluding current record)
      if (updateData.slug) {
        const existing = await ctx.db.orderConfiguration.findFirst({
          where: {
            slug: updateData.slug,
            tenantId: updateData.tenantId || null,
            NOT: { id },
          },
        });

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An order configuration with this slug already exists',
          });
        }
      }

      const configuration = await ctx.db.orderConfiguration.update({
        where: { id },
        data: updateData,
        include: {
          pricingOptions: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      return configuration;
    }),

  delete: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if there are any orders using this configuration
      const orderCount = await ctx.db.order.count({
        where: { orderConfigurationId: input.id },
      });

      if (orderCount > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Cannot delete order configuration with ${orderCount} existing orders. Consider deactivating instead.`,
        });
      }

      await ctx.db.orderConfiguration.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Pricing option management
  createPricingOption: platformAdminProcedure
    .input(CreatePricingOptionInput)
    .mutation(async ({ ctx, input }) => {
      // If this is set as default, unset other defaults for this configuration
      if (input.isDefault) {
        await ctx.db.orderConfigurationPricing.updateMany({
          where: { 
            orderConfigurationId: input.orderConfigurationId,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      const pricingOption = await ctx.db.orderConfigurationPricing.create({
        data: input,
      });

      return pricingOption;
    }),

  updatePricingOption: platformAdminProcedure
    .input(UpdatePricingOptionInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // If this is set as default, unset other defaults for this configuration
      if (updateData.isDefault) {
        const pricingOption = await ctx.db.orderConfigurationPricing.findUnique({
          where: { id },
          select: { orderConfigurationId: true },
        });

        if (pricingOption) {
          await ctx.db.orderConfigurationPricing.updateMany({
            where: { 
              orderConfigurationId: pricingOption.orderConfigurationId,
              isDefault: true,
              NOT: { id },
            },
            data: { isDefault: false },
          });
        }
      }

      const updated = await ctx.db.orderConfigurationPricing.update({
        where: { id },
        data: updateData,
      });

      return updated;
    }),

  deletePricingOption: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.orderConfigurationPricing.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});