/**
 * Recurring Billing Activities
 * 
 * These activities handle the individual steps of recurring billing:
 * - Finding orders due for billing
 * - Creating invoices
 * - Processing payments
 * - Sending notifications
 */

import { PrismaClient } from '@db/generated/client';

// In production, these would call tRPC endpoints or directly interact with the database

export interface OrderDueForBilling {
  id: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
  description?: string;
  subscription?: {
    id: string;
    stripeSubscriptionId?: string;
    nextBillingDate: Date;
  };
  subscriptionFrequency?: string;
  user?: {
    id: string;
    name?: string;
    email: string | null;
  };
  guestName?: string;
  guestEmail?: string;
  tenantId?: string;
}

export interface CreateInvoiceParams {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  dueDate: Date;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export interface AttemptPaymentParams {
  invoiceId: string;
  amount: number;
  currency: string;
  stripeSubscriptionId: string;
  customerEmail?: string;
  customerName?: string;
}

export interface NotificationParams {
  orderId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  [key: string]: any;
}

export interface UpdateBillingDateParams {
  subscriptionId: string;
  frequency: string;
  lastBillingDate: Date;
}

export interface NotifyAdminsParams {
  subject: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface PushToOutboxParams {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  tenantId?: string;
  payloadJson: Record<string, any>;
}

/**
 * Find orders that are due for recurring billing
 */
export async function findOrdersDueForBilling(params: {
  tenantId?: string;
  userId?: string;
}): Promise<OrderDueForBilling[]> {
  console.log('🔍 Finding orders due for billing', params);
  
  // Initialize Prisma client
  const prisma = new PrismaClient();
  
  try {
    // Query for orders that are due for billing
    const orders = await prisma.order.findMany({
      where: {
        // Only subscription orders
        isSubscription: true,
        // Order must be up to date (not draft, pending, or cancelled)
        status: 'UP_TO_DATE',
        // Filter by tenant or user if specified
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
        ...(params.userId ? { userId: params.userId } : {}),
        // Must have an active subscription
        subscription: {
          status: 'ACTIVE',
          // Next billing date is due or overdue
          nextBillingDate: {
            lte: new Date(),
          },
        },
        // Must not have pending invoices for the current billing period
        // (this prevents duplicate billing)
        invoices: {
          none: {
            status: {
              in: ['PENDING', 'SENT'],
            },
            createdAt: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7)), // Within last 7 days
            },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
        subscription: {
          select: {
            id: true,
            stripeSubscriptionId: true,
            nextBillingDate: true,
            status: true,
          },
        },
      },
      orderBy: {
        subscription: {
          nextBillingDate: 'asc',
        },
      },
    });

    const ordersDueForBilling: OrderDueForBilling[] = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      currency: order.currency,
      description: order.description || '',
      subscription: order.subscription ? {
        id: order.subscription.id,
        stripeSubscriptionId: order.subscription.stripeSubscriptionId || undefined,
        nextBillingDate: order.subscription.nextBillingDate,
      } : undefined,
      subscriptionFrequency: order.subscriptionFrequency || undefined,
      user: order.user ? {
        id: order.user.id,
        name: order.user.name || undefined,
        email: order.user.email,
      } : undefined,
      guestName: order.guestName || undefined,
      guestEmail: order.guestEmail || undefined,
      tenantId: order.tenantId || undefined,
    }));

    console.log(`✅ Found ${ordersDueForBilling.length} orders due for billing`);
    return ordersDueForBilling;

  } catch (error) {
    console.error('❌ Error finding orders due for billing:', error);
    throw new Error(`Failed to find orders due for billing: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Create an invoice for an order
 */
export async function createInvoiceForOrder(params: CreateInvoiceParams): Promise<{
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: Date;
}> {
  console.log('📄 Creating invoice for order', params);
  
  // Initialize Prisma client
  const prisma = new PrismaClient();
  
  try {
    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        orderId: params.orderId,
        invoiceNumber,
        amount: params.amount,
        currency: params.currency,
        status: 'PENDING',
        dueDate: params.dueDate,
        metadata: params.metadata || {},
      },
    });

    console.log(`✅ Created invoice ${invoice.invoiceNumber} for order ${params.orderId}`);
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate,
    };

  } catch (error) {
    console.error('❌ Error creating invoice for order:', error);
    throw new Error(`Failed to create invoice for order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Attempt automatic payment using Stripe subscription
 */
export async function attemptAutomaticPayment(params: AttemptPaymentParams): Promise<PaymentResult> {
  console.log('💳 Attempting automatic payment', params);
  
  // Initialize Prisma client
  const prisma = new PrismaClient();
  
  try {
    // Import Stripe (this would be configured in the workflow environment)
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Create payment intent for the subscription
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      customer: params.stripeSubscriptionId, // Using subscription ID as customer reference
      metadata: {
        invoiceId: params.invoiceId,
        subscriptionId: params.stripeSubscriptionId,
        billingType: 'recurring',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Confirm the payment intent
    const confirmedPayment = await stripe.paymentIntents.confirm(paymentIntent.id);
    
    if (confirmedPayment.status === 'succeeded') {
      // Create payment record in database
      const payment = await prisma.payment.create({
        data: {
          invoiceId: params.invoiceId,
          paymentIntentId: confirmedPayment.id,
          amount: params.amount,
          currency: params.currency,
          status: 'SUCCEEDED',
          metadata: {
            stripePaymentIntentId: confirmedPayment.id,
            subscriptionId: params.stripeSubscriptionId,
            billingType: 'recurring',
          },
        },
      });

      // Update invoice status
      await prisma.invoice.update({
        where: { id: params.invoiceId },
        data: { status: 'PAID' },
      });

      console.log(`✅ Automatic payment successful: ${payment.id}`);
      return {
        success: true,
        paymentId: payment.id,
      };
    } else {
      // Payment failed
      const error = `Payment failed with status: ${confirmedPayment.status}`;
      console.log(`❌ Automatic payment failed: ${error}`);
      return {
        success: false,
        error,
      };
    }

  } catch (error) {
    console.error('❌ Error attempting automatic payment:', error);
    
    // Create failed payment record
    try {
      await prisma.payment.create({
        data: {
          invoiceId: params.invoiceId,
          amount: params.amount,
          currency: params.currency,
          status: 'FAILED',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            subscriptionId: params.stripeSubscriptionId,
            billingType: 'recurring',
          },
        },
      });
    } catch (dbError) {
      console.error('❌ Error creating failed payment record:', dbError);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Update subscription next billing date
 */
export async function updateSubscriptionBillingDate(params: UpdateBillingDateParams): Promise<void> {
  console.log('📅 Updating subscription billing date', params);
  
  // Initialize Prisma client
  const prisma = new PrismaClient();
  
  try {
    // Calculate next billing date based on frequency
    const nextBillingDate = new Date(params.lastBillingDate);
    
    switch (params.frequency) {
      case 'MONTHLY':
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
        break;
      case 'YEARLY':
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        break;
      default:
        // Default to monthly if frequency is not recognized
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        break;
    }
    
    // Update subscription record in database
    await prisma.subscription.update({
      where: { id: params.subscriptionId },
      data: {
        nextBillingDate,
        lastBillingDate: params.lastBillingDate,
        updatedAt: new Date(),
      },
    });
    
    console.log(`✅ Updated subscription ${params.subscriptionId} next billing date to ${nextBillingDate.toISOString()}`);

  } catch (error) {
    console.error('❌ Error updating subscription billing date:', error);
    throw new Error(`Failed to update subscription billing date: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminder(params: NotificationParams): Promise<void> {
  console.log('📧 Sending payment reminder', params);
  
  if (!params.customerEmail) {
    console.log('⚠️ No customer email provided, skipping payment reminder');
    return;
  }
  
  // In production, this would send an email through the existing email service
  // For now, we'll log the action and could integrate with the notification system
  console.log(`✅ Payment reminder sent to ${params.customerEmail} for invoice ${params.invoiceId}`);
  
  // TODO: Integrate with existing email service or notification system
  // This could call the email service API or create a notification intent
}

/**
 * Send payment success notification
 */
export async function sendPaymentSuccessNotification(params: NotificationParams): Promise<void> {
  console.log('✅ Sending payment success notification', params);
  
  if (!params.customerEmail) {
    console.log('⚠️ No customer email provided, skipping payment success notification');
    return;
  }
  
  // In production, this would send an email through the existing email service
  console.log(`✅ Payment success notification sent to ${params.customerEmail} for invoice ${params.invoiceId}`);
  
  // TODO: Integrate with existing email service or notification system
}

/**
 * Send payment failure notification
 */
export async function sendPaymentFailureNotification(params: NotificationParams): Promise<void> {
  console.log('❌ Sending payment failure notification', params);
  
  if (!params.customerEmail) {
    console.log('⚠️ No customer email provided, skipping payment failure notification');
    return;
  }
  
  // In production, this would send an email through the existing email service
  console.log(`✅ Payment failure notification sent to ${params.customerEmail} for invoice ${params.invoiceId}`);
  
  // TODO: Integrate with existing email service or notification system
}

/**
 * Publish event to outbox
 */
export async function pushToOutbox(params: PushToOutboxParams): Promise<void> {
  console.log('📤 Publishing event to outbox', params);
  
  // Initialize Prisma client
  const prisma = new PrismaClient();
  
  try {
    // Create outbox event
    await prisma.outboxEvent.create({
      data: {
        eventType: params.eventType as any,
        aggregateType: params.aggregateType as any,
        aggregateId: params.aggregateId,
        tenantId: params.tenantId || 'global',
        payloadJson: params.payloadJson,
        status: 'PENDING',
        createdAt: new Date(),
      },
    });
    
    console.log(`✅ Event published: ${params.eventType} for ${params.aggregateType}:${params.aggregateId}`);

  } catch (error) {
    console.error('❌ Error publishing event to outbox:', error);
    throw new Error(`Failed to publish event to outbox: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Notify admins of workflow results
 */
export async function notifyAdmins(params: NotifyAdminsParams): Promise<void> {
  console.log('📢 Notifying admins', params);
  
  // Initialize Prisma client
  const prisma = new PrismaClient();
  
  try {
    // Create admin notification
    await prisma.notification.create({
      data: {
        type: 'admin_alert',
        title: params.subject,
        description: params.message,
        metadata: JSON.stringify(params.metadata || {}),
        status: 'unread',
        createdAt: new Date(),
      },
    });
    
    console.log(`✅ Admin notification sent: ${params.subject}`);

  } catch (error) {
    console.error('❌ Error notifying admins:', error);
    // Don't throw here as admin notifications are not critical for the workflow
    console.log(`⚠️ Admin notification failed but workflow continues: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    await prisma.$disconnect();
  }
}
