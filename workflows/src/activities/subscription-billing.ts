/**
 * Subscription Billing Activities
 * 
 * Activities for the subscription billing workflow that handle:
 * - Finding subscriptions due for billing
 * - Creating invoices for subscription billing periods
 * - Updating subscription billing dates
 * - Managing subscription status
 */

import { PrismaClient } from '@db/base';

// Initialize Prisma client for direct database operations in activities
const prisma = new PrismaClient();

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

export interface SubscriptionDue {
  subscriptionId: string;
  frequency: 'EVERY_10_MINUTES' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  amount: number;
  currency: string;
  tenantId?: string;
  userId?: string;
  orderId: string;
  nextBillingDate: Date;
}

export async function findDueSubscriptions(): Promise<SubscriptionDue[]> {
  console.log('🔍 Finding subscriptions due for billing');
  
  try {
    const now = new Date();
    
    // Find all active subscriptions where nextBillingDate <= now
    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: {
          lte: now,
        },
      },
      include: {
        order: true,
      },
    });
    
    const subscriptionsDue: SubscriptionDue[] = dueSubscriptions.map((sub: any) => ({
      subscriptionId: sub.id,
      frequency: sub.frequency as 'EVERY_10_MINUTES' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
      amount: sub.amount,
      currency: sub.currency,
      tenantId: sub.tenantId || undefined,
      userId: sub.userId || undefined,
      orderId: sub.orderId,
      nextBillingDate: sub.nextBillingDate,
    }));
    
    console.log(`✅ Found ${subscriptionsDue.length} subscriptions due for billing`);
    return subscriptionsDue;
    
  } catch (error) {
    console.error('❌ Failed to find due subscriptions:', error);
    return [];
  }
}

export async function createSubscriptionInvoice(params: {
  subscriptionId: string;
  amount: number;
  currency: string;
  tenantId?: string;
  userId?: string;
  description: string;
}): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  console.log('📄 Creating subscription invoice via Prisma:', params);
  
  try {
    // Get subscription details
    const subscription = await prisma.subscription.findUnique({
      where: { id: params.subscriptionId },
      include: { order: true },
    });
    
    if (!subscription) {
      throw new Error(`Subscription ${params.subscriptionId} not found`);
    }
    
    const invoiceNumber = generateInvoiceNumber();
    const dueDate = calculateDueDate();
    
    // Create invoice for this billing period
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: subscription.orderId,
        description: params.description,
        amount: params.amount,
        currency: params.currency,
        status: "SENT", // Subscription invoices are immediately sent
        isPending: false,
        dueDate,
        checkoutUrl: `/checkout/invoice/${invoiceNumber}`,
        billingPeriodStart: subscription.lastBillingDate || subscription.startDate,
        billingPeriodEnd: new Date(),
      },
    });
    
    // Update subscription's last billing date
    await prisma.subscription.update({
      where: { id: params.subscriptionId },
      data: { lastBillingDate: new Date() },
    });
    
    console.log('✅ Subscription invoice created via Prisma:', invoice.id);
    return { success: true, invoiceId: invoice.id };
    
  } catch (error) {
    console.error('❌ Subscription invoice creation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function updateSubscriptionBillingDate(params: {
  subscriptionId: string;
  frequency: 'EVERY_10_MINUTES' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}): Promise<{ success: boolean; nextBillingDate?: string; error?: string }> {
  console.log('📅 Updating subscription billing date via Prisma:', params);
  
  try {
    const nextBillingDate = calculateNextBillingDate(params.frequency);
    
    // Update subscription's next billing date
    const updatedSubscription = await prisma.subscription.update({
      where: { id: params.subscriptionId },
      data: { nextBillingDate },
    });
    
    console.log('✅ Subscription billing date updated via Prisma:', {
      subscriptionId: params.subscriptionId,
      nextBillingDate: nextBillingDate.toISOString(),
    });
    
    return { 
      success: true, 
      nextBillingDate: nextBillingDate.toISOString()
    };
    
  } catch (error) {
    console.error('❌ Subscription billing date update failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function cancelSubscription(params: {
  subscriptionId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  console.log('❌ Cancelling subscription via Prisma:', params);
  
  try {
    await prisma.subscription.update({
      where: { id: params.subscriptionId },
      data: { 
        status: 'CANCELLED',
        // Note: we don't have a cancellation reason field in the schema
        // but we could add metadata or extend the schema
      },
    });
    
    console.log('✅ Subscription cancelled via Prisma:', params.subscriptionId);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Subscription cancellation failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export async function notifySubscriptionBilling(params: {
  subscriptionId: string;
  invoiceId: string;
  tenantId?: string;
  userId?: string;
  amount: number;
  currency: string;
}): Promise<void> {
  console.log('📧 Sending subscription billing notification:', params);
  
  // TODO: Implement actual email/notification sending
  // For now, just log the notification
  
  console.log('✅ Subscription billing notification sent');
}