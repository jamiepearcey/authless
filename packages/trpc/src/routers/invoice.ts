import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../middleware";

const InvoiceStatusSchema = z.enum([
  "DRAFT",
  "PENDING", 
  "SENT",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "VOID"
]);


export const invoiceRouter = router({
  // Get invoice by ID
  getInvoice: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { 
          id: input.id,
          order: input.tenantId 
            ? { tenantId: input.tenantId }
            : ctx.session.user.platformRole === "admin" 
              ? {} 
              : { userId: ctx.session.user.id }
        },
        include: {
          order: {
            include: {
              tenant: {
                select: { id: true, name: true, slug: true },
              },
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      // Check if invoice should be visible
      // For subscription orders, invoices are visible when order is PROCESSING
      // For regular orders, invoices are visible when order is COMPLETED
      const shouldBeVisible = !invoice.isPending || 
        (invoice.order.isSubscription && invoice.order.status === "PROCESSING") ||
        (!invoice.order.isSubscription && invoice.order.status === "COMPLETED");
        
      if (!shouldBeVisible) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Invoice is not yet available" 
        });
      }

      return invoice;
    }),

  // Get invoice by invoice number
  getInvoiceByNumber: protectedProcedure
    .input(z.object({ 
      invoiceNumber: z.string(),
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { 
          invoiceNumber: input.invoiceNumber,
          order: input.tenantId 
            ? { tenantId: input.tenantId }
            : ctx.session.user.platformRole === "admin" 
              ? {} 
              : { userId: ctx.session.user.id }
        },
        include: {
          order: {
            include: {
              tenant: {
                select: { id: true, name: true, slug: true },
              },
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      // Check if invoice should be visible
      // For subscription orders, invoices are visible when order is PROCESSING
      // For regular orders, invoices are visible when order is COMPLETED
      const shouldBeVisible = !invoice.isPending || 
        (invoice.order.isSubscription && invoice.order.status === "PROCESSING") ||
        (!invoice.order.isSubscription && invoice.order.status === "COMPLETED");
        
      if (!shouldBeVisible) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Invoice is not yet available" 
        });
      }

      return invoice;
    }),

  // Get invoices with pagination
  getInvoices: protectedProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      orderId: z.string().optional(),
      status: InvoiceStatusSchema.optional(),
      includePending: z.boolean().default(false),
      limit: z.number().int().positive().max(100).default(20),
      offset: z.number().int().nonnegative().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: any = {};

      // Access control
      if (ctx.session.user.platformRole !== "admin") {
        whereClause.order = input.tenantId 
          ? { tenantId: input.tenantId }
          : { userId: ctx.session.user.id };
      } else if (input.tenantId) {
        whereClause.order = { tenantId: input.tenantId };
      }

      // Apply filters
      if (input.orderId) whereClause.orderId = input.orderId;
      if (input.status) whereClause.status = input.status;
      
      // Filter pending invoices unless explicitly included
      if (!input.includePending) {
        whereClause.OR = [
          { isPending: false },
          { 
            isPending: true,
            order: { 
              OR: [
                { status: "COMPLETED" }, // Regular orders are visible when completed
                { status: "PROCESSING", isSubscription: true } // Subscription orders are visible when processing
              ]
            }
          }
        ];
      }

      const [invoices, total] = await Promise.all([
        ctx.db.invoice.findMany({
          where: whereClause,
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                isSubscription: true,
                tenant: {
                  select: { id: true, name: true, slug: true },
                },
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.invoice.count({ where: whereClause }),
      ]);

      return {
        invoices,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Update invoice status
  updateInvoiceStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: InvoiceStatusSchema,
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access to invoice
      const existingInvoice = await ctx.db.invoice.findFirst({
        where: { 
          id: input.id,
          order: input.tenantId 
            ? { tenantId: input.tenantId }
            : ctx.session.user.platformRole === "admin" 
              ? {} 
              : { userId: ctx.session.user.id }
        },
        include: { order: true },
      });

      if (!existingInvoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      const updatedInvoice = await ctx.db.invoice.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          order: true,
          payments: true,
        },
      });

      // Emit status change event
      await ctx.outbox.publishGenericEvent(
        "invoice.status_changed",
        "invoice",
        updatedInvoice.id,
        existingInvoice.order.tenantId,
        {
          invoiceId: updatedInvoice.id,
          invoiceNumber: updatedInvoice.invoiceNumber,
          orderId: updatedInvoice.orderId,
          previousStatus: existingInvoice.status,
          newStatus: input.status,
          amount: updatedInvoice.amount,
          tenantId: existingInvoice.order.tenantId,
          userId: existingInvoice.order.userId,
        },
        {
          idempotencyKey: `invoice-status-${updatedInvoice.id}-${input.status}`,
          traceId: ctx.trace.traceId,
        }
      );

      return updatedInvoice;
    }),

  // Create Stripe checkout session for invoice
  createCheckoutSession: protectedProcedure
    .input(z.object({
      invoiceId: z.string(),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access to invoice
      const invoice = await ctx.db.invoice.findFirst({
        where: { 
          id: input.invoiceId,
          order: input.tenantId 
            ? { tenantId: input.tenantId }
            : ctx.session.user.platformRole === "admin" 
              ? {} 
              : { userId: ctx.session.user.id }
        },
        include: { 
          order: {
            include: {
              tenant: true,
              user: true,
            },
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (invoice.status === "PAID") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Invoice is already paid" 
        });
      }

      // TODO: Implement actual Stripe checkout session creation
      // For now, return a mock checkout session URL
      const mockCheckoutUrl = `https://checkout.stripe.com/pay/cs_test_mock#fidkdWxOYHwnPyd1blpxYHZxWjA0VGxOUUtqSkxhTG1FT3Y1bGdRNXZOMGBTdmNnQE4%2FUDYxXEZLamtEa2lzRkZrSDBiYHJOdEJ8VzNiXGE3N1JiXVc3bGRLQEBhPGhBbHBoVF1qdHFMMm5Bc1RsZnZGdDdMZmJIVCcpJ2N3amhWYHdzYHcnP3F3cGApJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl`;

      return {
        checkoutUrl: mockCheckoutUrl,
        sessionId: "cs_test_mock_session_id",
      };
    }),

  // Create payment for invoice (DEPRECATED - use createCheckoutSession instead)
  createPayment: protectedProcedure
    .input(z.object({
      invoiceId: z.string(),
      amount: z.number().int().positive(),
      paymentIntentId: z.string().optional(),
      paymentMethod: z.string().optional(),
      paymentProvider: z.string().default("stripe"),
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access to invoice
      const invoice = await ctx.db.invoice.findFirst({
        where: { 
          id: input.invoiceId,
          order: input.tenantId 
            ? { tenantId: input.tenantId }
            : ctx.session.user.platformRole === "admin" 
              ? {} 
              : { userId: ctx.session.user.id }
        },
        include: { order: true },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (invoice.status === "PAID") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Invoice is already paid" 
        });
      }

      const payment = await ctx.db.payment.create({
        data: {
          invoiceId: input.invoiceId,
          amount: input.amount,
          paymentIntentId: input.paymentIntentId,
          paymentMethod: input.paymentMethod,
          paymentProvider: input.paymentProvider,
          status: "PENDING",
        },
      });

      // Emit payment created event
      await ctx.outbox.publishGenericEvent(
        "payment.created",
        "payment",
        payment.id,
        invoice.order.tenantId,
        {
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
          orderId: invoice.orderId,
          amount: payment.amount,
          paymentIntentId: payment.paymentIntentId,
          tenantId: invoice.order.tenantId,
          userId: invoice.order.userId,
        },
        {
          idempotencyKey: `payment-created-${payment.id}`,
          traceId: ctx.trace.traceId,
        }
      );

      return payment;
    }),

  // Get payment history for invoice
  getInvoicePayments: protectedProcedure
    .input(z.object({
      invoiceId: z.string(),
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify access to invoice
      const invoice = await ctx.db.invoice.findFirst({
        where: { 
          id: input.invoiceId,
          order: input.tenantId 
            ? { tenantId: input.tenantId }
            : ctx.session.user.platformRole === "admin" 
              ? {} 
              : { userId: ctx.session.user.id }
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      const payments = await ctx.db.payment.findMany({
        where: { invoiceId: input.invoiceId },
        orderBy: { createdAt: "desc" },
      });

      return payments;
    }),

  // Mark invoice as sent
  markAsSent: protectedProcedure
    .input(z.object({
      id: z.string(),
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { 
          id: input.id,
          order: input.tenantId 
            ? { tenantId: input.tenantId }
            : ctx.session.user.platformRole === "admin" 
              ? {} 
              : { userId: ctx.session.user.id }
        },
        include: { order: true },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      const updatedInvoice = await ctx.db.invoice.update({
        where: { id: input.id },
        data: { 
          status: "SENT",
          isPending: false, // Make visible when sent
        },
      });

      // Emit invoice sent event
      await ctx.outbox.publishGenericEvent(
        "invoice.sent",
        "invoice",
        updatedInvoice.id,
        invoice.order.tenantId,
        {
          invoiceId: updatedInvoice.id,
          invoiceNumber: updatedInvoice.invoiceNumber,
          orderId: updatedInvoice.orderId,
          amount: updatedInvoice.amount,
          dueDate: updatedInvoice.dueDate,
          checkoutUrl: updatedInvoice.checkoutUrl,
          tenantId: invoice.order.tenantId,
          userId: invoice.order.userId,
        },
        {
          idempotencyKey: `invoice-sent-${updatedInvoice.id}`,
          traceId: ctx.trace.traceId,
        }
      );

      return updatedInvoice;
    }),

  // Void an invoice
  voidInvoice: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: { 
          id: input.id,
          order: input.tenantId 
            ? { tenantId: input.tenantId }
            : ctx.session.user.platformRole === "admin" 
              ? {} 
              : { userId: ctx.session.user.id }
        },
        include: { order: true },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (invoice.status === "PAID") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Cannot void a paid invoice. Issue a refund instead." 
        });
      }

      const updatedInvoice = await ctx.db.invoice.update({
        where: { id: input.id },
        data: { 
          status: "VOID",
          metadata: {
            ...invoice.metadata as any,
            voidReason: input.reason,
            voidedAt: new Date().toISOString(),
            voidedBy: ctx.session.user.id,
          }
        },
      });

      // Emit invoice voided event
      await ctx.outbox.publishGenericEvent(
        "invoice.voided",
        "invoice",
        updatedInvoice.id,
        invoice.order.tenantId,
        {
          invoiceId: updatedInvoice.id,
          invoiceNumber: updatedInvoice.invoiceNumber,
          orderId: updatedInvoice.orderId,
          reason: input.reason,
          tenantId: invoice.order.tenantId,
          userId: invoice.order.userId,
        },
        {
          idempotencyKey: `invoice-voided-${updatedInvoice.id}`,
          traceId: ctx.trace.traceId,
        }
      );

      return updatedInvoice;
    }),

  // Create Stripe checkout session for invoice payment
  createCheckoutSession: protectedProcedure
    .input(z.object({
      invoiceId: z.string(),
      successUrl: z.string(),
      cancelUrl: z.string(),
      tenantId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get invoice with order details
      const invoice = await ctx.db.invoice.findFirst({
        where: { 
          id: input.invoiceId,
          order: input.tenantId 
            ? { tenantId: input.tenantId }
            : ctx.session.user.platformRole === "admin" 
              ? {} 
              : { userId: ctx.session.user.id }
        },
        include: { 
          order: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              tenant: { select: { id: true, name: true } }
            }
          }
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (invoice.status === "PAID") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Invoice has already been paid" 
        });
      }

      try {
        // Create Stripe checkout session
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: invoice.currency,
                product_data: {
                  name: `Invoice ${invoice.invoiceNumber}`,
                  description: invoice.description || `Payment for order ${invoice.order.orderNumber}`,
                },
                unit_amount: invoice.amount,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            orderId: invoice.order.id,
            orderNumber: invoice.order.orderNumber,
          },
          // Set customer email if available (prefer email over customer name)
          ...(invoice.order.user?.email && {
            customer_email: invoice.order.user.email,
          }),
        });

        return {
          checkoutUrl: session.url,
          sessionId: session.id,
        };
      } catch (error) {
        console.error('Stripe checkout session creation failed:', error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to create checkout session" 
        });
      }
    }),
});