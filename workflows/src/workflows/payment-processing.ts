/**
 * Payment Processing Workflow
 * 
 * This workflow handles complex payment processing including:
 * - Payment intent creation
 * - Payment confirmation
 * - Subscription setup
 * - Invoice generation
 * - Email notifications
 * - Rollback on failure
 */

import { proxyActivities, sleep, log, condition } from '@temporalio/workflow';
import type * as activities from '../activities/payment-processing';

// Configure activity options
const {
  createPaymentIntent,
  confirmPayment,
  setupSubscription,
  generateInvoice,
  sendPaymentConfirmationEmail,
  sendInvoiceEmail,
  rollbackPayment,
  pushToOutbox,
  notifyAdmins,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '2s',
    maximumInterval: '120s',
    maximumAttempts: 3,
  },
});

export interface PaymentProcessingParams {
  userId: string;
  tenantId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  subscriptionPlanId?: string;
  invoiceId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface PaymentProcessingResult {
  paymentId: string;
  userId: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending_confirmation';
  subscriptionCreated: boolean;
  invoiceGenerated: boolean;
  confirmationEmailSent: boolean;
  executionTime: number;
  workflowId: string;
  error?: string;
}

export async function paymentProcessingWorkflow(params: PaymentProcessingParams): Promise<PaymentProcessingResult> {
  const startTime = Date.now();
  
  log.info('Starting Payment Processing workflow', { 
    userId: params.userId,
    tenantId: params.tenantId,
    amount: params.amount,
    currency: params.currency,
    subscriptionPlanId: params.subscriptionPlanId
  });

  let paymentId = '';
  let subscriptionCreated = false;
  let invoiceGenerated = false;
  let confirmationEmailSent = false;
  let status: 'completed' | 'failed' | 'pending_confirmation' = 'completed';
  let error: string | undefined;

  try {
    // Step 1: Create payment intent
    const paymentIntent = await createPaymentIntent({
      userId: params.userId,
      tenantId: params.tenantId,
      amount: params.amount,
      currency: params.currency,
      paymentMethodId: params.paymentMethodId,
      description: params.description,
      metadata: params.metadata,
    });
    
    paymentId = paymentIntent.id;
    log.info('Payment intent created', { paymentId, amount: params.amount });

    // Step 2: Confirm payment
    const paymentResult = await confirmPayment({
      paymentId,
      paymentMethodId: params.paymentMethodId,
    });
    
    if (!paymentResult.success) {
      throw new Error(`Payment confirmation failed: ${paymentResult.error}`);
    }
    
    log.info('Payment confirmed successfully', { paymentId });

    // Step 3: Setup subscription (if applicable)
    if (params.subscriptionPlanId) {
      const subscriptionResult = await setupSubscription({
        userId: params.userId,
        tenantId: params.tenantId,
        paymentId,
        subscriptionPlanId: params.subscriptionPlanId,
      });
      
      subscriptionCreated = subscriptionResult.success;
      
      if (!subscriptionCreated) {
        log.warn('Subscription setup failed, but payment succeeded', { 
          paymentId, 
          error: subscriptionResult.error 
        });
      } else {
        log.info('Subscription created successfully', { paymentId });
      }
    }

    // Step 4: Generate invoice
    const invoiceResult = await generateInvoice({
      userId: params.userId,
      tenantId: params.tenantId,
      paymentId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
    });
    
    invoiceGenerated = invoiceResult.success;
    
    if (!invoiceGenerated) {
      log.warn('Invoice generation failed', { paymentId, error: invoiceResult.error });
    } else {
      log.info('Invoice generated successfully', { paymentId, invoiceId: invoiceResult.invoiceId });
    }

    // Step 5: Send confirmation email
    await sendPaymentConfirmationEmail({
      userId: params.userId,
      tenantId: params.tenantId,
      paymentId,
      amount: params.amount,
      currency: params.currency,
      subscriptionCreated,
    });
    
    confirmationEmailSent = true;
    log.info('Payment confirmation email sent', { paymentId });

    // Step 6: Send invoice email (if invoice was generated)
    if (invoiceGenerated && invoiceResult.invoiceId) {
      await sendInvoiceEmail({
        userId: params.userId,
        tenantId: params.tenantId,
        invoiceId: invoiceResult.invoiceId,
        paymentId,
      });
      
      log.info('Invoice email sent', { paymentId, invoiceId: invoiceResult.invoiceId });
    }

    // Step 7: Push success event to outbox
    await pushToOutbox({
      eventType: 'payment.processing.completed',
      aggregateType: 'Payment',
      aggregateId: paymentId,
      tenantId: params.tenantId,
      payloadJson: {
        id: crypto.randomUUID(),
        eventType: 'PaymentEvent',
        eventName: 'payment.processing.completed',
        tenantId: params.tenantId,
        userId: params.userId,
        paymentId,
        amount: params.amount,
        currency: params.currency,
        timestamp: new Date().toISOString(),
        source: { service: 'temporal-workflows', version: '1.0.0' },
        actor: { type: 'system', id: 'temporal', name: 'Temporal Workflow' },
        resource: { type: 'Payment', id: paymentId },
        action: { 
          type: 'COMPLETE', 
          description: 'Payment processing completed successfully',
          outcome: 'success'
        },
        metadata: { 
          subscriptionCreated,
          invoiceGenerated,
          confirmationEmailSent,
          originalParams: params
        }
      }
    });

    log.info('Payment processing workflow completed successfully', { 
      paymentId,
      amount: params.amount,
      subscriptionCreated,
      invoiceGenerated,
      confirmationEmailSent
    });

  } catch (error) {
    log.error('Payment processing workflow failed', { 
      paymentId,
      userId: params.userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    status = 'failed';
    error = error instanceof Error ? error.message : 'Unknown error';
    
    // Attempt rollback if payment was created
    if (paymentId) {
      try {
        await rollbackPayment({
          paymentId,
          userId: params.userId,
          tenantId: params.tenantId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
        
        log.info('Payment rollback completed', { paymentId });
      } catch (rollbackError) {
        log.error('Payment rollback failed', { 
          paymentId, 
          error: rollbackError instanceof Error ? rollbackError.message : 'Unknown error'
        });
      }
    }
    
    // Notify admins about payment failure
    await notifyAdmins({
      type: 'payment_processing_failed',
      userId: params.userId,
      tenantId: params.tenantId,
      paymentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Push failure event to outbox
    await pushToOutbox({
      eventType: 'payment.processing.failed',
      aggregateType: 'Payment',
      aggregateId: paymentId || 'unknown',
      tenantId: params.tenantId,
      payloadJson: {
        id: crypto.randomUUID(),
        eventType: 'PaymentEvent',
        eventName: 'payment.processing.failed',
        tenantId: params.tenantId,
        userId: params.userId,
        paymentId,
        amount: params.amount,
        currency: params.currency,
        timestamp: new Date().toISOString(),
        source: { service: 'temporal-workflows', version: '1.0.0' },
        actor: { type: 'system', id: 'temporal', name: 'Temporal Workflow' },
        resource: { type: 'Payment', id: paymentId || 'unknown' },
        action: { 
          type: 'FAIL', 
          description: 'Payment processing failed',
          outcome: 'failure'
        },
        metadata: { 
          error,
          subscriptionCreated,
          invoiceGenerated,
          confirmationEmailSent,
          originalParams: params
        }
      }
    });
  }

  const executionTime = Date.now() - startTime;
  
  return {
    paymentId,
    userId: params.userId,
    tenantId: params.tenantId,
    amount: params.amount,
    currency: params.currency,
    status,
    subscriptionCreated,
    invoiceGenerated,
    confirmationEmailSent,
    executionTime,
    workflowId: `payment-processing-${paymentId || 'unknown'}-${startTime}`,
    error,
  };
}
