/**
 * Order Automation Activities
 * 
 * Activities for the order automation workflow that interact with the tRPC API
 * and external services to create orders, process payments, and manage subscriptions.
 */

import { PrismaClient } from '@db/base';

// Initialize Prisma client for direct database operations in activities
const prisma = new PrismaClient();
export async function createOrder(params: {
  userId?: string;
  tenantId?: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
  isSubscription: boolean;
  description: string;
  metadata?: Record<string, any>;
  // Guest checkout information
  guestName?: string;
  guestEmail?: string;
  // Billing information
  billingCompanyName?: string;
  billingVatNumber?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
  console.log('🛒 Creating order via Prisma:', params);
  
  try {
    // Validate guest order vs regular order
    const isGuestOrder = !params.userId && !params.tenantId;
    
    if (isGuestOrder) {
      // Guest order validation
      if (!params.guestName || !params.guestEmail) {
        throw new Error('Guest orders require guestName and guestEmail');
      }
    } else {
      // Regular order validation
      if (params.userId && params.tenantId) {
        throw new Error('Cannot provide both userId and tenantId - order must be associated with either a user OR tenant');
      }
    }
    
    // Create order directly in database
    const order = await prisma.order.create({
      data: {
        orderNumber: params.orderNumber,
        tenantId: params.tenantId || null,
        userId: params.tenantId ? null : params.userId, // If tenantId provided, user is null
        description: params.description,
        totalAmount: params.totalAmount,
        currency: params.currency,
        status: "PENDING",
        isSubscription: params.isSubscription,
        metadata: JSON.stringify({
          ...params.metadata,
          // Include guest information in metadata for guest orders
          ...(params.guestName && params.guestEmail ? {
            guestName: params.guestName,
            guestEmail: params.guestEmail,
            isGuestOrder: true,
          } : {}),
        }),
        // Billing information
        billingCompanyName: params.billingCompanyName || null,
        billingVatNumber: params.billingVatNumber || null,
        billingAddressLine1: params.billingAddressLine1 || null,
        billingAddressLine2: params.billingAddressLine2 || null,
        billingCity: params.billingCity || null,
        billingState: params.billingState || null,
        billingPostalCode: params.billingPostalCode || null,
        billingCountry: params.billingCountry || null,
      },
    });
    
    console.log('✅ Order created via Prisma:', order.id);
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error('❌ Order creation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `INV-${timestamp}-${random}`.toUpperCase();
}

function calculateDueDate(days: number = 30): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function generateInvoice(params: {
  orderId: string;
  userId?: string;
  tenantId?: string;
  amount: number;
  currency: string;
  description: string;
}): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  console.log('📄 Generating invoice via Prisma:', params);
  
  try {
    const invoiceNumber = generateInvoiceNumber();
    const dueDate = calculateDueDate();
    
    // Create invoice directly in database
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: params.orderId,
        description: params.description,
        amount: params.amount,
        currency: params.currency,
        status: "DRAFT",
        isPending: false, // Make invoice immediately visible for workflow testing
        dueDate,
        checkoutUrl: `/checkout/invoice/${invoiceNumber}`,
      },
    });
    
    console.log('✅ Invoice generated via Prisma:', invoice.id);
    return { success: true, invoiceId: invoice.id };
  } catch (error) {
    console.error('❌ Invoice generation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function processPayment(params: {
  orderId: string;
  invoiceId: string;
  userId?: string;
  tenantId?: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
}): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  console.log('💳 Processing payment via Prisma:', params);
  
  try {
    // Validate that we have a real payment intent ID (not 'pending' or empty)
    if (!params.paymentMethodId || params.paymentMethodId === 'pending' || params.paymentMethodId === '') {
      throw new Error('Invalid payment method ID - cannot process payment without valid Stripe payment intent');
    }
    
    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        invoiceId: params.invoiceId,
        amount: params.amount,
        currency: params.currency,
        status: "SUCCEEDED", // Only mark as succeeded if we have a real payment intent
        paymentMethod: 'card', // Default to 'card' for Stripe payments
        paymentIntentId: params.paymentMethodId, // Use the actual Stripe payment intent ID
        metadata: JSON.stringify({
          orderId: params.orderId,
          userId: params.userId,
          tenantId: params.tenantId
        }),
      },
    });
    
    // Update invoice status to PAID
    await prisma.invoice.update({
      where: { id: params.invoiceId },
      data: { 
        status: "PAID"
      },
    });
    
    // Update order status to COMPLETED (for non-subscription orders)
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      select: { isSubscription: true }
    });
    
    if (!order?.isSubscription) {
      await prisma.order.update({
        where: { id: params.orderId },
        data: { status: "COMPLETED" },
      });
    }
    
    console.log('✅ Payment processed via Prisma:', payment.id);
    return { success: true, paymentId: payment.id };
    
  } catch (error) {
    console.error('❌ Payment processing failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

function calculateNextBillingDate(frequency: 'EVERY_10_MINUTES' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'): Date {
  const now = new Date();
  const nextBillingDate = new Date(now);
  
  switch (frequency) {
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
  
  return nextBillingDate;
}

export async function setupSubscription(params: {
  orderId: string;
  paymentId: string;
  userId?: string;
  tenantId?: string;
  frequency: 'EVERY_10_MINUTES' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  amount: number;
  currency: string;
}): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  console.log('🔄 Setting up subscription via Prisma:', params);
  
  try {
    const now = new Date();
    const nextBillingDate = calculateNextBillingDate(params.frequency);
    
    // Create subscription directly in database
    const subscription = await prisma.subscription.create({
      data: {
        orderId: params.orderId,
        tenantId: params.tenantId || null,
        userId: params.tenantId ? null : params.userId,
        frequency: params.frequency,
        amount: params.amount,
        currency: params.currency,
        status: "ACTIVE",
        startDate: now,
        nextBillingDate,
        autoRenew: true,
        autoPay: false, // Will require manual payment for each billing cycle
      },
    });
    
    // Update order status to PROCESSING (subscriptions don't complete, they stay active)
    await prisma.order.update({
      where: { id: params.orderId },
      data: { status: "PROCESSING" },
    });
    
    console.log('✅ Subscription created via Prisma:', subscription.id);
    return { success: true, subscriptionId: subscription.id };
  } catch (error) {
    console.error('❌ Subscription setup failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function sendOrderConfirmationEmail(params: {
  orderId: string;
  userId?: string;
  tenantId?: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
  paymentProcessed: boolean;
  subscriptionCreated: boolean;
}): Promise<void> {
  console.log('📧 Sending order confirmation email via Prisma:', params);
  
  try {
    // Create notification record in database
    await prisma.notification.create({
      data: {
        userId: params.userId || null,
        tenantId: params.tenantId || null,
        type: "ORDER_CONFIRMATION",
        title: "Order Confirmation",
        description: `Your order ${params.orderNumber} for ${params.currency} ${params.totalAmount} has been ${params.paymentProcessed ? 'confirmed' : 'received'}.${params.subscriptionCreated ? ' Your subscription is now active.' : ''}`,
        status: 'unread',
        metadata: JSON.stringify({
          orderId: params.orderId,
          orderNumber: params.orderNumber,
          totalAmount: params.totalAmount,
          currency: params.currency,
          paymentProcessed: params.paymentProcessed,
          subscriptionCreated: params.subscriptionCreated
        }),
      },
    });
    
    console.log('✅ Order confirmation notification created via Prisma');
  } catch (error) {
    console.error('❌ Order confirmation notification failed:', error);
    // Don't fail the workflow for notification issues
  }
}

export async function sendInvoiceEmail(params: {
  orderId: string;
  invoiceId: string;
  userId?: string;
  tenantId?: string;
}): Promise<void> {
  console.log('📧 Sending invoice email via Prisma:', params);
  
  try {
    // Get invoice details
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.invoiceId },
      select: { invoiceNumber: true, amount: true, currency: true, status: true }
    });
    
    if (!invoice) {
      throw new Error(`Invoice ${params.invoiceId} not found`);
    }
    
    // Create notification record in database
    await prisma.notification.create({
      data: {
        userId: params.userId || null,
        tenantId: params.tenantId || null,
        type: "INVOICE_READY",
        title: "Invoice Ready",
        description: `Invoice ${invoice.invoiceNumber} for ${invoice.currency} ${invoice.amount} is ready. Status: ${invoice.status}`,
        status: 'unread',
        metadata: JSON.stringify({
          orderId: params.orderId,
          invoiceId: params.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status
        }),
      },
    });
    
    console.log('✅ Invoice notification created via Prisma');
  } catch (error) {
    console.error('❌ Invoice notification failed:', error);
    // Don't fail the workflow for notification issues
  }
}

export async function rollbackOrder(params: {
  orderId: string;
  userId?: string;
  tenantId?: string;
  reason: string;
}): Promise<void> {
  console.log('🔄 Rolling back order via Prisma:', params);
  
  try {
    // Update order status to CANCELLED
    await prisma.order.update({
      where: { id: params.orderId },
      data: { 
        status: "CANCELLED",
        metadata: JSON.stringify({
          cancelledAt: new Date().toISOString(),
          cancellationReason: params.reason
        })
      },
    });
    
    // Cancel any associated subscription
    await prisma.subscription.updateMany({
      where: { orderId: params.orderId },
      data: { status: "CANCELLED" },
    });
    
    // Mark any unpaid invoices as CANCELLED
    await prisma.invoice.updateMany({
      where: { 
        orderId: params.orderId,
        status: { in: ["DRAFT", "SENT"] }
      },
      data: { status: "CANCELLED" },
    });
    
    console.log('✅ Order rollback completed via Prisma');
  } catch (error) {
    console.error('❌ Order rollback failed:', error);
    throw error; // Re-throw as rollback failures are critical
  }
}

export async function pushToOutbox(params: {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  tenantId?: string;
  payloadJson: Record<string, any>;
}): Promise<void> {
  console.log('📤 Pushing to outbox via Prisma:', {
    eventType: params.eventType,
    aggregateType: params.aggregateType,
    aggregateId: params.aggregateId,
    tenantId: params.tenantId,
  });
  
  try {
    // Create outbox event record
    await prisma.outboxEvent.create({
      data: {
        eventType: params.eventType,
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        tenantId: params.tenantId || null,
        payloadJson: params.payloadJson as any,
        status: "PENDING",
        tries: 0,
      },
    });
    
    console.log('✅ Event pushed to outbox via Prisma');
  } catch (error) {
    console.error('❌ Outbox push failed:', error);
    // Don't fail the workflow for outbox issues
  }
}

export async function notifyAdmins(params: {
  type: string;
  userId?: string;
  tenantId?: string;
  orderId: string;
  error: string;
}): Promise<void> {
  console.log('🔔 Notifying admins via Prisma:', params);
  
  try {
    // Find platform admin users
    const admins = await prisma.user.findMany({
      where: { platformRole: "ADMIN" },
      select: { id: true, name: true, email: true }
    });
    
    // Create notifications for each admin
    const adminNotifications = admins.map((admin: { id: string; name: string | null; email: string | null }) => ({
      userId: admin.id,
      tenantId: null,
      type: "ADMIN_ALERT",
      title: `Order ${params.type}`,
      description: `Order ${params.orderId} failed: ${params.error}`,
      isRead: false,
      metadata: JSON.stringify({
        alertType: params.type,
        orderId: params.orderId,
        error: params.error,
        userId: params.userId,
        tenantId: params.tenantId,
        timestamp: new Date().toISOString()
      })
    }));
    
    if (adminNotifications.length > 0) {
      await prisma.notification.createMany({
        data: adminNotifications,
      });
    }
    
    console.log(`✅ Admin notifications sent to ${admins.length} admins via Prisma`);
  } catch (error) {
    console.error('❌ Admin notification failed:', error);
    // Don't fail the workflow for notification issues
  }
}
