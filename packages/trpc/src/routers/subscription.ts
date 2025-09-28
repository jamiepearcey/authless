import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../middleware";

const SubscriptionStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "CANCELLED",
  "EXPIRED"
]);

const SubscriptionFrequencySchema = z.enum(["EVERY_10_MINUTES", "MONTHLY", "QUARTERLY", "YEARLY"]);

export const subscriptionRouter = router({
  // Get subscription by ID
  getSubscription: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const subscription = await ctx.db.subscription.findFirst({
        where: { 
          id: input.id,
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          ...(ctx.session.user.platformRole !== "admin" && !input.tenantId ? { userId: ctx.session.user.id } : {}),
        },
        include: {
          order: {
            include: {
              invoices: {
                orderBy: { createdAt: "desc" },
                take: 5,
              },
              tenant: {
                select: { id: true, name: true, slug: true },
              },
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          tenant: {
            select: { id: true, name: true, slug: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      return subscription;
    }),

  // Get subscriptions with pagination
  getSubscriptions: protectedProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      status: SubscriptionStatusSchema.optional(),
      frequency: SubscriptionFrequencySchema.optional(),
      limit: z.number().int().positive().max(100).default(20),
      offset: z.number().int().nonnegative().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: any = {};

      // Access control
      if (ctx.session.user.platformRole !== "admin") {
        if (input.tenantId) {
          whereClause.tenantId = input.tenantId;
        } else {
          whereClause.userId = ctx.session.user.id;
        }
      } else if (input.tenantId) {
        whereClause.tenantId = input.tenantId;
      }

      // Apply filters
      if (input.status) whereClause.status = input.status;
      if (input.frequency) whereClause.frequency = input.frequency;

      const [subscriptions, total] = await Promise.all([
        ctx.db.subscription.findMany({
          where: whereClause,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                description: true,
                status: true,
              },
            },
            tenant: {
              select: { id: true, name: true, slug: true },
            },
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.subscription.count({ where: whereClause }),
      ]);

      return {
        subscriptions,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Update subscription status
  updateSubscriptionStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: SubscriptionStatusSchema,
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access to subscription
      const existingSubscription = await ctx.db.subscription.findFirst({
        where: { 
          id: input.id,
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          ...(ctx.session.user.platformRole !== "admin" && !input.tenantId ? { userId: ctx.session.user.id } : {}),
        },
        include: { order: true },
      });

      if (!existingSubscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.id },
        data: { status: input.status },
        include: { order: true },
      });

      // Emit status change event
      await ctx.outbox.publishGenericEvent(
        "subscription.status_changed",
        "subscription",
        updatedSubscription.id,
        updatedSubscription.tenantId,
        {
          subscriptionId: updatedSubscription.id,
          orderId: updatedSubscription.orderId,
          previousStatus: existingSubscription.status,
          newStatus: input.status,
          frequency: updatedSubscription.frequency,
          tenantId: updatedSubscription.tenantId,
          userId: updatedSubscription.userId,
        },
        {
          idempotencyKey: `subscription-status-${updatedSubscription.id}-${input.status}`,
          traceId: ctx.trace.traceId,
        }
      );

      return updatedSubscription;
    }),

  // Update subscription billing settings
  updateBillingSettings: protectedProcedure
    .input(z.object({
      id: z.string(),
      autoRenew: z.boolean().optional(),
      autoPay: z.boolean().optional(),
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access to subscription
      const subscription = await ctx.db.subscription.findFirst({
        where: { 
          id: input.id,
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          ...(ctx.session.user.platformRole !== "admin" && !input.tenantId ? { userId: ctx.session.user.id } : {}),
        },
        include: { order: true },
      });

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      const updateData: any = {};
      if (input.autoRenew !== undefined) updateData.autoRenew = input.autoRenew;
      if (input.autoPay !== undefined) updateData.autoPay = input.autoPay;

      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.id },
        data: updateData,
        include: { order: true },
      });

      // Emit billing settings change event
      await ctx.outbox.publishGenericEvent(
        "subscription.billing_settings_changed",
        "subscription",
        updatedSubscription.id,
        updatedSubscription.tenantId,
        {
          subscriptionId: updatedSubscription.id,
          orderId: updatedSubscription.orderId,
          autoRenew: updatedSubscription.autoRenew,
          autoPay: updatedSubscription.autoPay,
          tenantId: updatedSubscription.tenantId,
          userId: updatedSubscription.userId,
        },
        {
          idempotencyKey: `subscription-billing-${updatedSubscription.id}`,
          traceId: ctx.trace.traceId,
        }
      );

      return updatedSubscription;
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
      cancelAtPeriodEnd: z.boolean().default(true),
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access to subscription
      const subscription = await ctx.db.subscription.findFirst({
        where: { 
          id: input.id,
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          ...(ctx.session.user.platformRole !== "admin" && !input.tenantId ? { userId: ctx.session.user.id } : {}),
        },
        include: { order: true },
      });

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      if (subscription.status === "CANCELLED") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Subscription is already cancelled" 
        });
      }

      // Calculate end date if cancelling at period end
      const endDate = input.cancelAtPeriodEnd 
        ? subscription.nextBillingDate 
        : new Date();

      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.id },
        data: { 
          status: input.cancelAtPeriodEnd ? "ACTIVE" : "CANCELLED",
          endDate: endDate,
          autoRenew: false,
          metadata: {
            ...subscription.metadata as any,
            cancellationReason: input.reason,
            cancelAtPeriodEnd: input.cancelAtPeriodEnd,
            cancellationRequestedAt: new Date().toISOString(),
            cancellationRequestedBy: ctx.session.user.id,
          }
        },
        include: { order: true },
      });

      // Emit cancellation event
      await ctx.outbox.publishGenericEvent(
        "subscription.cancellation_requested",
        "subscription",
        updatedSubscription.id,
        updatedSubscription.tenantId,
        {
          subscriptionId: updatedSubscription.id,
          orderId: updatedSubscription.orderId,
          reason: input.reason,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          effectiveDate: endDate,
          tenantId: updatedSubscription.tenantId,
          userId: updatedSubscription.userId,
        },
        {
          idempotencyKey: `subscription-cancel-${updatedSubscription.id}`,
          traceId: ctx.trace.traceId,
        }
      );

      return updatedSubscription;
    }),

  // Reactivate subscription
  reactivateSubscription: protectedProcedure
    .input(z.object({
      id: z.string(),
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access to subscription
      const subscription = await ctx.db.subscription.findFirst({
        where: { 
          id: input.id,
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          ...(ctx.session.user.platformRole !== "admin" && !input.tenantId ? { userId: ctx.session.user.id } : {}),
        },
        include: { order: true },
      });

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      if (subscription.status === "ACTIVE") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Subscription is already active" 
        });
      }

      // Calculate next billing date based on frequency
      const now = new Date();
      const nextBillingDate = new Date(now);
      
      switch (subscription.frequency) {
        case "EVERY_10_MINUTES":
          nextBillingDate.setMinutes(nextBillingDate.getMinutes() + 10);
          break;
        case "MONTHLY":
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          break;
        case "QUARTERLY":
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
          break;
        case "YEARLY":
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          break;
      }

      const updatedSubscription = await ctx.db.subscription.update({
        where: { id: input.id },
        data: { 
          status: "ACTIVE",
          nextBillingDate,
          autoRenew: true,
          endDate: null,
        },
        include: { order: true },
      });

      // Emit reactivation event
      await ctx.outbox.publishGenericEvent(
        "subscription.reactivated",
        "subscription",
        updatedSubscription.id,
        updatedSubscription.tenantId,
        {
          subscriptionId: updatedSubscription.id,
          orderId: updatedSubscription.orderId,
          nextBillingDate: nextBillingDate,
          tenantId: updatedSubscription.tenantId,
          userId: updatedSubscription.userId,
        },
        {
          idempotencyKey: `subscription-reactivate-${updatedSubscription.id}`,
          traceId: ctx.trace.traceId,
        }
      );

      return updatedSubscription;
    }),

  // Get subscription usage/billing history
  getSubscriptionHistory: protectedProcedure
    .input(z.object({
      subscriptionId: z.string(),
      tenantId: z.string().optional(),
      limit: z.number().int().positive().max(100).default(20),
      offset: z.number().int().nonnegative().default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Verify access to subscription
      const subscription = await ctx.db.subscription.findFirst({
        where: { 
          id: input.subscriptionId,
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
          ...(ctx.session.user.platformRole !== "admin" && !input.tenantId ? { userId: ctx.session.user.id } : {}),
        },
      });

      if (!subscription) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Subscription not found" });
      }

      // Get all invoices related to this subscription's order
      const invoices = await ctx.db.invoice.findMany({
        where: { 
          orderId: subscription.orderId,
        },
        include: {
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        skip: input.offset,
      });

      const total = await ctx.db.invoice.count({
        where: { orderId: subscription.orderId },
      });

      return {
        invoices,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),
});