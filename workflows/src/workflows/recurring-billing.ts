/**
 * Recurring Billing Workflow
 * 
 * This workflow handles recurring billing for subscription orders:
 * - Finds orders that are due for recurring billing
 * - Creates new invoices for the next billing period
 * - Attempts automatic payment if Stripe subscription is configured
 * - Sends payment reminders if automatic payment fails
 * - Updates subscription status and next billing date
 */

import { proxyActivities, log } from '@temporalio/workflow';
import type * as activities from '../activities/recurring-billing';

// Configure activity options
const {
  findOrdersDueForBilling,
  createInvoiceForOrder,
  attemptAutomaticPayment,
  updateSubscriptionBillingDate,
  sendPaymentReminder,
  sendPaymentSuccessNotification,
  sendPaymentFailureNotification,
  pushToOutbox,
  notifyAdmins,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '2s',
    maximumInterval: '60s',
    maximumAttempts: 3,
  },
});

export interface RecurringBillingParams {
  tenantId?: string; // If provided, only process orders for this tenant
  userId?: string;   // If provided, only process orders for this user
  dryRun?: boolean;  // If true, don't actually create invoices or charge payments
}

export interface RecurringBillingResult {
  processedOrders: number;
  successfulInvoices: number;
  successfulPayments: number;
  failedPayments: number;
  errors: string[];
  summary: {
    totalAmount: number;
    currency: string;
  };
}

export async function recurringBillingWorkflow(params: RecurringBillingParams): Promise<RecurringBillingResult> {
  const workflowId = `recurring-billing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  log.info('Starting recurring billing workflow', { 
    workflowId, 
    params,
    timestamp: new Date().toISOString()
  });

  const result: RecurringBillingResult = {
    processedOrders: 0,
    successfulInvoices: 0,
    successfulPayments: 0,
    failedPayments: 0,
    errors: [],
    summary: {
      totalAmount: 0,
      currency: 'gbp'
    }
  };

  try {
    // Step 1: Find orders that are due for recurring billing
    log.info('Finding orders due for billing', { params });
    
    const ordersDueForBilling = await findOrdersDueForBilling({
      tenantId: params.tenantId,
      userId: params.userId,
    });

    log.info(`Found ${ordersDueForBilling.length} orders due for billing`);

    if (ordersDueForBilling.length === 0) {
      log.info('No orders due for billing, workflow complete');
      return result;
    }

    // Step 2: Process each order
    for (const order of ordersDueForBilling) {
      try {
        result.processedOrders++;
        
        log.info(`Processing order ${order.orderNumber}`, { 
          orderId: order.id,
          amount: order.totalAmount,
          currency: order.currency
        });

        // Create invoice for the next billing period
        const invoice = await createInvoiceForOrder({
          orderId: order.id,
          amount: order.totalAmount,
          currency: order.currency,
          description: `${order.description} - Recurring billing`,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          metadata: {
            billingPeriod: new Date().toISOString(),
            originalOrderId: order.id,
            subscriptionId: order.subscription?.id,
          }
        });

        result.successfulInvoices++;
        result.summary.totalAmount += order.totalAmount;

        // Step 3: Attempt automatic payment if Stripe subscription is configured
        let paymentResult = null;
        if (order.subscription?.stripeSubscriptionId && !params.dryRun) {
          try {
            log.info(`Attempting automatic payment for order ${order.orderNumber}`, {
              invoiceId: invoice.id,
              stripeSubscriptionId: order.subscription.stripeSubscriptionId
            });

            paymentResult = await attemptAutomaticPayment({
              invoiceId: invoice.id,
              amount: order.totalAmount,
              currency: order.currency,
              stripeSubscriptionId: order.subscription.stripeSubscriptionId,
              customerEmail: order.user?.email || order.guestEmail,
              customerName: order.user?.name || order.guestName,
            });

            if (paymentResult.success) {
              result.successfulPayments++;
              log.info(`Automatic payment successful for order ${order.orderNumber}`, {
                paymentId: paymentResult.paymentId
              });

              // Send success notification
              await sendPaymentSuccessNotification({
                orderId: order.id,
                invoiceId: invoice.id,
                paymentId: paymentResult.paymentId,
                amount: order.totalAmount,
                currency: order.currency,
                customerEmail: order.user?.email || order.guestEmail,
                customerName: order.user?.name || order.guestName,
              });
            } else {
              result.failedPayments++;
              log.warn(`Automatic payment failed for order ${order.orderNumber}`, {
                error: paymentResult.error
              });

              // Send failure notification
              await sendPaymentFailureNotification({
                orderId: order.id,
                invoiceId: invoice.id,
                amount: order.totalAmount,
                currency: order.currency,
                error: paymentResult.error,
                customerEmail: order.user?.email || order.guestEmail,
                customerName: order.user?.name || order.guestName,
              });
            }
          } catch (error) {
            result.failedPayments++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown payment error';
            result.errors.push(`Payment failed for order ${order.orderNumber}: ${errorMessage}`);
            
            log.error(`Payment processing error for order ${order.orderNumber}`, { error });
          }
        } else {
          // No automatic payment configured, send payment reminder
          log.info(`No automatic payment configured for order ${order.orderNumber}, sending reminder`);
          
          await sendPaymentReminder({
            orderId: order.id,
            invoiceId: invoice.id,
            amount: order.totalAmount,
            currency: order.currency,
            customerEmail: order.user?.email || order.guestEmail,
            customerName: order.user?.name || order.guestName,
            dueDate: invoice.dueDate,
          });
        }

        // Step 4: Update subscription next billing date
        if (order.subscription && !params.dryRun) {
          await updateSubscriptionBillingDate({
            subscriptionId: order.subscription.id,
            frequency: order.subscriptionFrequency || 'MONTHLY',
            lastBillingDate: new Date(),
          });
        }

        // Step 5: Publish event to outbox
        await pushToOutbox({
          eventType: paymentResult?.success ? 'subscription.billing.completed' : 'subscription.billing.invoice_created',
          aggregateType: 'Subscription',
          aggregateId: order.subscription?.id || order.id,
          tenantId: order.tenantId || 'global',
          payloadJson: {
            id: `billing-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            orderId: order.id,
            invoiceId: invoice.id,
            paymentId: paymentResult?.paymentId,
            amount: order.totalAmount,
            currency: order.currency,
            success: paymentResult?.success || false,
            error: paymentResult?.error,
            timestamp: new Date().toISOString(),
            workflowId,
          }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to process order ${order.orderNumber}: ${errorMessage}`);
        
        log.error(`Error processing order ${order.orderNumber}`, { error });
      }
    }

    // Step 6: Notify admins of results
    if (!params.dryRun && (result.errors.length > 0 || result.processedOrders > 0)) {
      await notifyAdmins({
        subject: 'Recurring Billing Workflow Completed',
        message: `
          Recurring billing workflow completed:
          - Processed orders: ${result.processedOrders}
          - Successful invoices: ${result.successfulInvoices}
          - Successful payments: ${result.successfulPayments}
          - Failed payments: ${result.failedPayments}
          - Errors: ${result.errors.length}
          - Total amount: ${result.summary.totalAmount / 100} ${result.summary.currency.toUpperCase()}
        `,
        metadata: {
          workflowId,
          result,
          timestamp: new Date().toISOString(),
        }
      });
    }

    log.info('Recurring billing workflow completed', { result });

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown workflow error';
    result.errors.push(`Workflow failed: ${errorMessage}`);
    
    log.error('Recurring billing workflow failed', { error, workflowId });

    // Publish failure event
    await pushToOutbox({
      eventType: 'subscription.billing.failed',
      aggregateType: 'System',
      aggregateId: workflowId,
      tenantId: 'global',
      payloadJson: {
        id: `billing-failure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workflowId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        result,
      }
    });

    throw error;
  }
}
