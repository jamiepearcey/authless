import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../middleware";

// Enums matching Prisma schema
const OrderStatusSchema = z.enum([
  "DRAFT",
  "PENDING", 
  "CONFIRMED",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
  "FAILED"
]);



const SubscriptionFrequencySchema = z.enum(["EVERY_10_MINUTES", "MONTHLY", "QUARTERLY", "YEARLY"]);

// Helper function to generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

// Helper function to generate invoice number  
function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `INV-${timestamp}-${random}`.toUpperCase();
}

// Helper function to calculate due date
function calculateDueDate(days: number = 30): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export const orderRouter = router({
  // Create a new order
  createOrder: protectedProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      description: z.string().optional(),
      totalAmount: z.number().int().positive(),
      currency: z.string().default("gbp"),
      isSubscription: z.boolean().default(false),
      subscriptionFrequency: SubscriptionFrequencySchema.optional(),
      subscriptionAutoRenew: z.boolean().default(false),
      subscriptionAutoPay: z.boolean().default(false),
      subscriptionStartDate: z.string().datetime().optional().transform((str) => str ? new Date(str) : undefined),
      subscriptionEndDate: z.string().datetime().optional().transform((str) => str ? new Date(str) : undefined),
      metadata: z.record(z.string()).optional(),
      generateInvoiceImmediately: z.boolean().default(true),
      invoicePending: z.boolean().default(false), // Controls invoice pending state
      
      // Guest checkout information
      guestName: z.string().optional(),
      guestEmail: z.string().email().optional(),
      
      // Billing information
      billingCompanyName: z.string().optional(),
      billingVatNumber: z.string().optional(),
      billingAddressLine1: z.string().optional(),
      billingAddressLine2: z.string().optional(),
      billingCity: z.string().optional(),
      billingState: z.string().optional(),
      billingPostalCode: z.string().optional(),
      billingCountry: z.string().optional(),
    })
    .refine((data) => {
      // Order can be associated with current user OR specified tenant, but not both
      // If tenantId is provided, it's a tenant order
      // If no tenantId is provided, it's a user order (will use ctx.session.user.id)
      return true; // This validation is handled in the mutation logic
    }, {
      message: "Order must be associated with either a user or tenant, not both"
    }))
    .mutation(async ({ ctx, input }) => {
      const orderNumber = generateOrderNumber();
      
      // Create the order - associate with tenant OR user, not both
      const order = await ctx.db.order.create({
        data: {
          orderNumber,
          tenantId: input.tenantId || null, // If tenantId provided, this is a tenant order
          userId: input.tenantId ? null : ctx.session.user.id, // If no tenantId, this is a user order
          description: input.description,
          totalAmount: input.totalAmount,
          currency: input.currency,
          status: "PENDING",
          isSubscription: input.isSubscription,
          subscriptionFrequency: input.subscriptionFrequency,
          subscriptionAutoRenew: input.subscriptionAutoRenew,
          subscriptionAutoPay: input.subscriptionAutoPay,
          subscriptionStartDate: input.subscriptionStartDate,
          subscriptionEndDate: input.subscriptionEndDate,
          metadata: input.metadata,
          
          // Guest checkout information
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          
          // Billing information
          billingCompanyName: input.billingCompanyName,
          billingVatNumber: input.billingVatNumber,
          billingAddressLine1: input.billingAddressLine1,
          billingAddressLine2: input.billingAddressLine2,
          billingCity: input.billingCity,
          billingState: input.billingState,
          billingPostalCode: input.billingPostalCode,
          billingCountry: input.billingCountry,
        },
      });

      // Generate invoice if requested
      let invoice = null;
      if (input.generateInvoiceImmediately) {
        const invoiceNumber = generateInvoiceNumber();
        const dueDate = calculateDueDate();
        
        invoice = await ctx.db.invoice.create({
          data: {
            invoiceNumber,
            orderId: order.id,
            description: input.description,
            amount: input.totalAmount,
            currency: input.currency,
            status: "DRAFT",
            isPending: input.invoicePending,
            dueDate,
            checkoutUrl: `/checkout/invoice/${invoiceNumber}`,
          },
        });
      }

        // Emit order created event
        await ctx.outbox.publishGenericEvent(
          "order.created",
          "order",
          order.id,
          order.tenantId, // Use the order's tenantId (null for user orders)
          {
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              tenantId: order.tenantId,
              userId: order.userId,
              totalAmount: order.totalAmount,
              currency: order.currency,
              isSubscription: order.isSubscription,
            },
            invoice: invoice ? {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.amount,
              checkoutUrl: invoice.checkoutUrl,
            } : null,
          },
          {
            idempotencyKey: `order-created-${order.id}`,
            traceId: ctx.trace.traceId,
          }
        );

      return {
        order,
        invoice,
        checkoutUrl: invoice?.checkoutUrl,
      };
    }),

  // Get order by ID
  getOrder: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: any = { id: input.id };
      
      // Add access control based on user role and tenant
      if (ctx.session.user.platformRole !== "admin") {
        if (input.tenantId) {
          whereClause.tenantId = input.tenantId;
        } else {
          whereClause.userId = ctx.session.user.id;
        }
      }

      const order = await ctx.db.order.findFirst({
        where: whereClause,
        include: {
          invoices: {
            include: {
              payments: true,
            },
          },
          subscription: true,
          tenant: {
            select: { id: true, name: true, slug: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      return order;
    }),

  // Get orders with pagination and filters
  getOrders: protectedProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      status: OrderStatusSchema.optional(),
      isSubscription: z.boolean().optional(),
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
      if (input.isSubscription !== undefined) whereClause.isSubscription = input.isSubscription;

      const [orders, total] = await Promise.all([
        ctx.db.order.findMany({
          where: whereClause,
          include: {
            invoices: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                amount: true,
                dueDate: true,
              },
            },
            subscription: {
              select: {
                id: true,
                status: true,
                frequency: true,
                nextBillingDate: true,
              },
            },
            tenant: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.order.count({ where: whereClause }),
      ]);

      return {
        orders,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Update order status
  updateOrderStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: OrderStatusSchema,
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access to order
      const whereClause: any = { id: input.id };
      if (ctx.session.user.platformRole !== "admin") {
        if (input.tenantId) {
          whereClause.tenantId = input.tenantId;
        } else {
          whereClause.userId = ctx.session.user.id;
        }
      }

      const existingOrder = await ctx.db.order.findFirst({ where: whereClause });
      if (!existingOrder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Prevent subscription orders from being manually completed
      if (existingOrder.isSubscription && input.status === "COMPLETED") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Subscription orders cannot be manually completed. They are completed automatically through payment processing." 
        });
      }

      // Prevent manual completion of any order - orders should only be completed via payment processing
      if (input.status === "COMPLETED" && ctx.session.user.platformRole !== "admin") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Orders can only be completed through payment processing, not manually." 
        });
      }

      const updatedOrder = await ctx.db.order.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          invoices: true,
          subscription: true,
        },
      });

      // Emit status change event
      await ctx.outbox.publishGenericEvent(
        "order.status_changed",
        "order",
        updatedOrder.id,
        updatedOrder.tenantId,
        {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          previousStatus: existingOrder.status,
          newStatus: input.status,
          tenantId: updatedOrder.tenantId,
          userId: updatedOrder.userId,
        },
        {
          idempotencyKey: `order-status-${updatedOrder.id}-${input.status}`,
          traceId: ctx.trace.traceId,
        }
      );

      return updatedOrder;
    }),

  // Get invoice URL helper
  getInvoiceCheckoutUrl: protectedProcedure
    .input(z.object({
      invoiceId: z.string(),
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { 
          id: input.invoiceId,
          order: input.tenantId ? { tenantId: input.tenantId } : { userId: ctx.session.user.id }
        },
        select: {
          id: true,
          invoiceNumber: true,
          checkoutUrl: true,
          status: true,
          isPending: true,
          order: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      // Check if invoice should be visible (not pending or order is complete)
      if (invoice.isPending && invoice.order.status !== "COMPLETED") {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Invoice is not yet available" 
        });
      }

      return {
        checkoutUrl: invoice.checkoutUrl,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      };
    }),

  // Cancel order
  cancelOrder: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access and get order
      const whereClause: any = { id: input.id };
      if (ctx.session.user.platformRole !== "admin") {
        if (input.tenantId) {
          whereClause.tenantId = input.tenantId;
        } else {
          whereClause.userId = ctx.session.user.id;
        }
      }

      const order = await ctx.db.order.findFirst({ 
        where: whereClause,
        include: { subscription: true }
      });
      
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Prevent cancelling completed orders (but allow cancelling subscription orders in PROCESSING status)
      if (order.status === "COMPLETED" || (order.status === "PROCESSING" && !order.isSubscription)) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Cannot cancel completed order" 
        });
      }

      // Update order and subscription if exists
      const updatedOrder = await ctx.db.$transaction(async (tx) => {
        // For subscription orders, check if there are any paid invoices
        let finalOrderStatus = "CANCELLED";
        
        if (order.isSubscription) {
          const paidInvoices = await tx.invoice.findMany({
            where: { 
              orderId: order.id,
              status: "PAID"
            }
          });
          
          // If there are paid invoices, mark order as completed instead of cancelled
          if (paidInvoices.length > 0) {
            finalOrderStatus = "COMPLETED";
          }
        }

        const updated = await tx.order.update({
          where: { id: input.id },
          data: { 
            status: finalOrderStatus,
            metadata: {
              ...order.metadata as any,
              cancellationReason: input.reason,
              cancelledAt: new Date().toISOString(),
              cancelledBy: ctx.session.user.id,
              ...(finalOrderStatus === "COMPLETED" && { 
                completedDueToCancellation: true,
                hasPaidInvoices: true 
              })
            }
          },
        });

        // Cancel subscription if exists
        if (order.subscription) {
          await tx.subscription.update({
            where: { orderId: order.id },
            data: { status: "CANCELLED" },
          });
        }

        return updated;
      });

      // Emit cancellation event
      await ctx.outbox.publishGenericEvent(
        "order.cancelled",
        "order",
        updatedOrder.id,
        updatedOrder.tenantId,
        {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          reason: input.reason,
          tenantId: updatedOrder.tenantId,
          userId: updatedOrder.userId,
        },
        {
          idempotencyKey: `order-cancelled-${updatedOrder.id}`,
          traceId: ctx.trace.traceId,
        }
      );

      return updatedOrder;
    }),
});