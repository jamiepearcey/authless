/**
 * Order Automation Workflow
 * 
 * This workflow handles automated order processing including:
 * - Order creation
 * - Invoice generation
 * - Payment processing
 * - Subscription setup (if applicable)
 * - Email notifications
 * - Event publishing to outbox
 * - Rollback on failure
 */

import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from '../activities/order-automation';

// Configure activity options
const {
  createOrder,
  generateInvoice,
  processPayment,
  setupSubscription,
  sendOrderConfirmationEmail,
  sendInvoiceEmail,
  rollbackOrder,
  pushToOutbox,
  notifyAdmins,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '15 minutes',
  retry: {
    initialInterval: '2s',
    maximumInterval: '120s',
    maximumAttempts: 3,
  },
});

export interface OrderAutomationParams {
  userId?: string;
  tenantId?: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
  isSubscription: boolean;
  subscriptionFrequency?: 'EVERY_10_MINUTES' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  description: string;
  metadata?: Record<string, any>;
  // Payment processing
  paymentIntentId?: string;
  processPayment?: boolean;
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
}

export interface OrderAutomationResult {
  orderId: string;
  invoiceId?: string;
  paymentId?: string;
  subscriptionId?: string;
  userId?: string;
  tenantId?: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending_payment';
  orderCreated: boolean;
  invoiceGenerated: boolean;
  paymentProcessed: boolean;
  subscriptionCreated: boolean;
  confirmationEmailSent: boolean;
  executionTime: number;
  workflowId: string;
  error?: string;
}

export async function orderAutomationWorkflow(params: OrderAutomationParams): Promise<OrderAutomationResult> {
  const startTime = Date.now();
  
  // Validate business logic: orders are either user-to-tenant, tenant-to-platform, or guest orders
  // User Order: user buying from tenant (requires tenantId, userId is the buyer)
  // Tenant Order: tenant buying from platform (requires userId for billing/admin, tenantId is the buyer)
  // Guest Order: guest buying (no userId or tenantId, but guestName and guestEmail are required)
  const isGuestOrder = !params.userId && !params.tenantId;
  
  if (isGuestOrder && (!params.guestName || !params.guestEmail)) {
    throw new Error('Guest orders require guestName and guestEmail');
  }
  
  if (!isGuestOrder && !params.userId && !params.tenantId) {
    throw new Error('Either userId (for tenant orders) or tenantId (for user orders) must be provided');
  }
  
  // Determine order type based on business logic
  const orderType = isGuestOrder ? 'guest' : (!!params.tenantId ? 'user-to-tenant' : 'tenant-to-platform');
  
  log.info('Starting Order Automation workflow', { 
    orderType,
    userId: params.userId,
    tenantId: params.tenantId,
    guestName: params.guestName,
    guestEmail: params.guestEmail,
    orderNumber: params.orderNumber,
    totalAmount: params.totalAmount,
    currency: params.currency,
    isSubscription: params.isSubscription,
    subscriptionFrequency: params.subscriptionFrequency
  });

  let orderId = '';
  let invoiceId = '';
  let paymentId = '';
  let subscriptionId = '';
  let orderCreated = false;
  let invoiceGenerated = false;
  let paymentProcessed = false;
  let subscriptionCreated = false;
  let confirmationEmailSent = false;
  let status: 'completed' | 'failed' | 'pending_payment' = 'pending_payment';
  let errorMessage: string | undefined;

  try {
    // Step 1: Create order
    const orderResult = await createOrder({
      userId: params.userId,
      tenantId: params.tenantId,
      orderNumber: params.orderNumber,
      totalAmount: params.totalAmount,
      currency: params.currency,
      isSubscription: params.isSubscription,
      description: params.description,
      metadata: params.metadata,
      // Guest checkout information
      guestName: params.guestName,
      guestEmail: params.guestEmail,
      // Billing information
      billingCompanyName: params.billingCompanyName,
      billingVatNumber: params.billingVatNumber,
      billingAddressLine1: params.billingAddressLine1,
      billingAddressLine2: params.billingAddressLine2,
      billingCity: params.billingCity,
      billingState: params.billingState,
      billingPostalCode: params.billingPostalCode,
      billingCountry: params.billingCountry,
    });
    
    if (!orderResult.success) {
      throw new Error(`Order creation failed: ${orderResult.error}`);
    }
    
    orderId = orderResult.orderId!;
    orderCreated = true;
    log.info('Order created successfully', { orderId, orderNumber: params.orderNumber });

    // Step 2: Generate invoice
    const invoiceResult = await generateInvoice({
      orderId,
      userId: params.userId,
      tenantId: params.tenantId,
      amount: params.totalAmount,
      currency: params.currency,
      description: params.description,
    });
    
    if (!invoiceResult.success) {
      log.warn('Invoice generation failed', { orderId, error: invoiceResult.error });
    } else {
      invoiceId = invoiceResult.invoiceId!;
      invoiceGenerated = true;
      log.info('Invoice generated successfully', { orderId, invoiceId });
    }

    // Step 3: Process payment if paymentIntentId is provided and valid, otherwise set to pending
    if (params.paymentIntentId && params.processPayment && 
        params.paymentIntentId !== 'pending' && params.paymentIntentId !== '') {
      log.info('Processing payment immediately', { orderId, paymentIntentId: params.paymentIntentId });
      
      const paymentResult = await processPayment({
        orderId,
        invoiceId,
        paymentMethodId: params.paymentIntentId,
        amount: params.totalAmount,
        currency: params.currency,
        userId: params.userId,
        tenantId: params.tenantId,
      });
      
      if (!paymentResult.success) {
        log.warn('Payment processing failed', { orderId, error: paymentResult.error });
        status = 'pending_payment';
      } else {
        paymentId = paymentResult.paymentId!;
        paymentProcessed = true;
        status = 'completed';
        log.info('Payment processed successfully', { orderId, paymentId });
      }
    } else {
      // Set status to pending payment (user will complete payment via checkout page)
      status = 'pending_payment';
      log.info('Order created with invoice - awaiting payment via checkout', { orderId, invoiceId });
    }

    // Step 4: Setup subscription (if applicable) - will be activated when payment is completed
    if (params.isSubscription && params.subscriptionFrequency) {
      const subscriptionResult = await setupSubscription({
        orderId,
        paymentId: 'pending', // Placeholder until payment is completed
        userId: params.userId,
        tenantId: params.tenantId,
        frequency: params.subscriptionFrequency,
        amount: params.totalAmount,
        currency: params.currency,
      });
      
      if (!subscriptionResult.success) {
        log.warn('Subscription setup failed', { orderId, error: subscriptionResult.error });
      } else {
        subscriptionId = subscriptionResult.subscriptionId!;
        subscriptionCreated = true;
        log.info('Subscription created successfully', { orderId, subscriptionId });
      }
    }

    // Step 5: Send confirmation email
    await sendOrderConfirmationEmail({
      orderId,
      userId: params.userId,
      tenantId: params.tenantId,
      orderNumber: params.orderNumber,
      totalAmount: params.totalAmount,
      currency: params.currency,
      paymentProcessed, // Use actual payment status
      subscriptionCreated,
    });
    
    confirmationEmailSent = true;
    log.info('Order confirmation email sent', { orderId });

    // Step 6: Send invoice email (if invoice was generated)
    if (invoiceGenerated && invoiceId) {
      await sendInvoiceEmail({
        orderId,
        invoiceId,
        userId: params.userId,
        tenantId: params.tenantId,
      });
      
      log.info('Invoice email sent', { orderId, invoiceId });
    }

    // Step 7: Push pending payment event to outbox
    await pushToOutbox({
      eventType: 'order.automation.pending_payment',
      aggregateType: 'Order',
      aggregateId: orderId,
      tenantId: params.tenantId,
      payloadJson: {
        id: `order-event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        eventType: 'OrderAutomationEvent',
        eventName: 'order.automation.pending_payment',
        tenantId: params.tenantId,
        userId: params.userId,
        orderId,
        invoiceId,
        paymentId,
        subscriptionId,
        orderNumber: params.orderNumber,
        totalAmount: params.totalAmount,
        currency: params.currency,
        timestamp: new Date().toISOString(),
        source: { service: 'temporal-workflows', version: '1.0.0' },
        actor: { type: 'system', id: 'temporal', name: 'Temporal Workflow' },
        resource: { type: 'Order', id: orderId },
        action: { 
          type: 'PENDING_PAYMENT', 
          description: 'Order created and awaiting payment',
          outcome: 'pending'
        },
        metadata: { 
          orderCreated,
          invoiceGenerated,
          paymentProcessed: false,
          subscriptionCreated,
          confirmationEmailSent,
          originalParams: params
        }
      }
    });

    log.info('Order automation workflow completed - awaiting payment', { 
      orderId,
      invoiceId,
      subscriptionId,
      orderCreated,
      invoiceGenerated,
      paymentProcessed: false,
      subscriptionCreated,
      confirmationEmailSent,
      status: 'pending_payment'
    });

  } catch (error) {
    log.error('Order automation workflow failed', { 
      orderId,
      userId: params.userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    status = 'failed';
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Attempt rollback if order was created
    if (orderCreated && orderId) {
      try {
        await rollbackOrder({
          orderId,
          userId: params.userId,
          tenantId: params.tenantId,
          reason: errorMessage,
        });
        
        log.info('Order rollback completed', { orderId });
      } catch (rollbackError) {
        log.error('Order rollback failed', { 
          orderId, 
          error: rollbackError instanceof Error ? rollbackError.message : 'Unknown error'
        });
      }
    }
    
    // Notify admins about order failure
    await notifyAdmins({
      type: 'order_automation_failed',
      userId: params.userId,
      tenantId: params.tenantId,
      orderId,
      error: errorMessage,
    });
    
    // Push failure event to outbox
    await pushToOutbox({
      eventType: 'order.automation.failed',
      aggregateType: 'Order',
      aggregateId: orderId || 'unknown',
      tenantId: params.tenantId,
      payloadJson: {
        id: `order-event-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        eventType: 'OrderAutomationEvent',
        eventName: 'order.automation.failed',
        tenantId: params.tenantId,
        userId: params.userId,
        orderId,
        invoiceId,
        paymentId,
        subscriptionId,
        orderNumber: params.orderNumber,
        totalAmount: params.totalAmount,
        currency: params.currency,
        timestamp: new Date().toISOString(),
        source: { service: 'temporal-workflows', version: '1.0.0' },
        actor: { type: 'system', id: 'temporal', name: 'Temporal Workflow' },
        resource: { type: 'Order', id: orderId || 'unknown' },
        action: { 
          type: 'FAIL', 
          description: 'Order automation failed',
          outcome: 'failure'
        },
        metadata: { 
          error: errorMessage,
          orderCreated,
          invoiceGenerated,
          paymentProcessed,
          subscriptionCreated,
          confirmationEmailSent,
          originalParams: params
        }
      }
    });
  }

  const executionTime = Date.now() - startTime;
  
  return {
    orderId,
    invoiceId,
    paymentId,
    subscriptionId,
    userId: params.userId,
    tenantId: params.tenantId,
    orderNumber: params.orderNumber,
    totalAmount: params.totalAmount,
    currency: params.currency,
    status,
    orderCreated,
    invoiceGenerated,
    paymentProcessed,
    subscriptionCreated,
    confirmationEmailSent,
    executionTime,
    workflowId: `order-automation-${orderId || 'unknown'}-${startTime}`,
    error: status === 'failed' ? errorMessage : undefined,
  };
}
