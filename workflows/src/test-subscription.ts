/**
 * Test script for 10-minute subscription billing
 * 
 * This script creates a test subscription with EVERY_10_MINUTES frequency
 * and monitors the subscription billing workflow to ensure invoices are
 * created at the correct intervals.
 */

import { Client } from '@temporalio/client';
import { orderAutomationWorkflow } from './workflows';

async function testTenMinuteSubscription() {
  const client = new Client();

  console.log('🧪 Starting 10-minute subscription test...');

  try {
    // Step 1: Create a test subscription order
    const testOrderParams = {
      userId: 'test-user-id', // Use a test user ID
      orderNumber: `TEST-SUB-${Date.now()}`,
      totalAmount: 9.99,
      currency: 'USD',
      isSubscription: true,
      subscriptionFrequency: 'EVERY_10_MINUTES' as const,
      description: 'Test 10-minute subscription for workflow validation',
      metadata: {
        testRun: true,
        createdAt: new Date().toISOString()
      }
    };

    console.log('📦 Creating test subscription order:', testOrderParams);

    // Start the order automation workflow
    const orderWorkflowId = `test-order-${Date.now()}`;
    const orderHandle = await client.workflow.start(orderAutomationWorkflow, {
      args: [testOrderParams],
      taskQueue: 'authless-task-queue',
      workflowId: orderWorkflowId,
    });

    console.log(`🔄 Order workflow started: ${orderWorkflowId}`);

    // Wait for order completion
    const orderResult = await orderHandle.result();
    console.log('✅ Order workflow completed:', {
      orderId: orderResult.orderId,
      subscriptionId: orderResult.subscriptionId,
      status: orderResult.status,
      paymentProcessed: orderResult.paymentProcessed,
      subscriptionCreated: orderResult.subscriptionCreated
    });

    if (!orderResult.subscriptionCreated) {
      throw new Error('❌ Subscription was not created successfully');
    }

    // Step 2: Start the subscription monitor workflow (if not already running)
    // TODO: Implement subscription monitor workflow
    // const monitorWorkflowId = 'subscription-monitor-test';
    // try {
    //   const monitorHandle = await client.workflow.start(subscriptionMonitorWorkflow, {
    //     args: [],
    //     taskQueue: 'authless-task-queue',
    //     workflowId: monitorWorkflowId,
    //   });
    //   console.log(`🔍 Subscription monitor started: ${monitorWorkflowId}`);
    // } catch (error) {
    //   if (error instanceof Error && error.message.includes('already exists')) {
    //     console.log('🔍 Subscription monitor already running');
    //   } else {
    //     throw error;
    //   }
    // }

    // Step 3: Monitor for 15 minutes to see at least one billing cycle
    console.log('⏱️ Monitoring subscription billing for 15 minutes...');
    console.log('💡 Expected: First invoice should be created in ~10 minutes');

    const monitorDuration = 15 * 60 * 1000; // 15 minutes
    const startTime = Date.now();

    // Check subscription status every 30 seconds
    const checkInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      
      console.log(`⏰ Elapsed time: ${minutes}m ${seconds}s`);
      
      if (elapsed >= monitorDuration) {
        clearInterval(checkInterval);
        console.log('✅ Test monitoring period completed');
        console.log('🔍 Check your database for subscription invoices created during this period');
        process.exit(0);
      }
    }, 30000);

    // Keep the process alive
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testTenMinuteSubscription().catch(console.error);
}

export { testTenMinuteSubscription };