/**
 * Subscription Billing Workflow
 * 
 * This workflow handles recurring billing for active subscriptions:
 * - Monitors subscription billing dates
 * - Creates invoices for each billing period
 * - Handles billing cycles for different frequencies
 * - Updates subscription billing dates
 * - Manages subscription status
 */

import { proxyActivities, sleep, log, condition, startChild } from '@temporalio/workflow';
import type * as activities from '../activities/subscription-billing';

// Configure activity options
const {
  findDueSubscriptions,
  createSubscriptionInvoice,
  updateSubscriptionBillingDate,
  cancelSubscription,
  notifySubscriptionBilling,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '1s',
    maximumInterval: '60s',
    maximumAttempts: 3,
  },
});

export interface SubscriptionBillingParams {
  subscriptionId: string;
  frequency: 'EVERY_10_MINUTES' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  amount: number;
  currency: string;
  tenantId?: string;
  userId?: string;
}

export interface SubscriptionBillingResult {
  subscriptionId: string;
  invoiceId?: string;
  nextBillingDate: Date;
  status: 'billed' | 'failed' | 'cancelled';
  error?: string;
}

export async function subscriptionBillingWorkflow(params: SubscriptionBillingParams): Promise<SubscriptionBillingResult> {
  const { subscriptionId, frequency, amount, currency, tenantId, userId } = params;
  
  log.info('Starting Subscription Billing workflow', { 
    subscriptionId,
    frequency,
    amount,
    currency,
    tenantId,
    userId
  });

  try {
    // Step 1: Create invoice for this billing period
    const invoiceResult = await createSubscriptionInvoice({
      subscriptionId,
      amount,
      currency,
      tenantId,
      userId,
      description: `Subscription billing - ${frequency}`,
    });
    
    if (!invoiceResult.success) {
      throw new Error(`Failed to create subscription invoice: ${invoiceResult.error}`);
    }
    
    log.info('Subscription invoice created', { 
      subscriptionId, 
      invoiceId: invoiceResult.invoiceId 
    });

    // Step 2: Update subscription billing date
    const updateResult = await updateSubscriptionBillingDate({
      subscriptionId,
      frequency,
    });
    
    if (!updateResult.success) {
      throw new Error(`Failed to update billing date: ${updateResult.error}`);
    }
    
    log.info('Subscription billing date updated', { 
      subscriptionId, 
      nextBillingDate: updateResult.nextBillingDate 
    });

    // Step 3: Send billing notification
    await notifySubscriptionBilling({
      subscriptionId,
      invoiceId: invoiceResult.invoiceId!,
      tenantId,
      userId,
      amount,
      currency,
    });
    
    log.info('Subscription billing workflow completed successfully', { 
      subscriptionId,
      invoiceId: invoiceResult.invoiceId,
      nextBillingDate: updateResult.nextBillingDate
    });

    return {
      subscriptionId,
      invoiceId: invoiceResult.invoiceId,
      nextBillingDate: new Date(updateResult.nextBillingDate!),
      status: 'billed',
    };

  } catch (error) {
    log.error('Subscription billing workflow failed', { 
      subscriptionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Don't automatically cancel on billing failure - let admin review
    return {
      subscriptionId,
      nextBillingDate: new Date(), // Keep current date
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Recurring Subscription Monitor Workflow
 * 
 * This is a long-running workflow that continuously monitors all subscriptions
 * and triggers billing workflows when subscriptions are due.
 */
export async function subscriptionMonitorWorkflow(): Promise<void> {
  log.info('Starting Subscription Monitor workflow');
  
  while (true) {
    try {
      // Check for due subscriptions every minute
      const dueSubscriptions = await findDueSubscriptions();
      
      if (dueSubscriptions.length > 0) {
        log.info(`Found ${dueSubscriptions.length} subscriptions due for billing`);
        
        // Start billing workflow for each due subscription
        for (const subscription of dueSubscriptions) {
          try {
            await startChild(subscriptionBillingWorkflow, {
              args: [subscription],
              workflowId: `subscription-billing-${subscription.subscriptionId}-${Date.now()}`,
            });
            
            log.info('Started billing workflow for subscription', { 
              subscriptionId: subscription.subscriptionId 
            });
          } catch (error) {
            log.error('Failed to start billing workflow', { 
              subscriptionId: subscription.subscriptionId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
      
      // Wait 1 minute before checking again
      await sleep('1 minute');
      
    } catch (error) {
      log.error('Subscription monitor error', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Wait before retrying on error
      await sleep('5 minutes');
    }
  }
}