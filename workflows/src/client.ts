/**
 * Temporal Client
 * 
 * This module provides a configured Temporal client for starting workflows
 * and querying workflow state. Used by the Next.js app to trigger workflows.
 */

import { Client, Connection } from '@temporalio/client';
import type { HelloWorkflowParams, HelloWorkflowResult } from './workflows/hello';
import type { UserOnboardingParams, UserOnboardingResult } from './workflows/user-onboarding';
import type { OrderAutomationParams, OrderAutomationResult } from './workflows/order-automation';
import type { RecurringBillingParams, RecurringBillingResult } from './workflows/recurring-billing';

// Default connection options
const DEFAULT_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';

let client: Client | null = null;

/**
 * Get or create a Temporal client instance
 */
export async function getTemporalClient(): Promise<Client> {
  if (!client) {
    const connection = await Connection.connect({
      address: DEFAULT_ADDRESS,
    });
    
    client = new Client({
      connection,
    });
  }
  return client;
}

/**
 * Start a Hello World workflow
 */
export async function startHelloWorkflow(
  params: HelloWorkflowParams,
  workflowId?: string
): Promise<{ workflowId: string; result: Promise<HelloWorkflowResult> }> {
  const temporalClient = await getTemporalClient();
  
  const id = workflowId || `hello-${params.name}-${Date.now()}`;
  
  const handle = await temporalClient.workflow.start('helloWorkflow', {
    taskQueue: 'authless-workflows-queue',
    args: [params],
    workflowId: id,
  });

  console.log(`🚀 Started Hello workflow ${handle.workflowId}`);
  
  return {
    workflowId: handle.workflowId,
    result: handle.result(),
  };
}

/**
 * Start a User Onboarding workflow
 */
export async function startUserOnboardingWorkflow(
  params: UserOnboardingParams,
  workflowId?: string
): Promise<{ workflowId: string; result: Promise<UserOnboardingResult> }> {
  const temporalClient = await getTemporalClient();
  
  const id = workflowId || `user-onboarding-${params.userId}-${Date.now()}`;
  
  const handle = await temporalClient.workflow.start('userOnboardingWorkflow', {
    taskQueue: 'authless-workflows-queue',
    args: [params],
    workflowId: id,
  });

  console.log(`🚀 Started User Onboarding workflow ${handle.workflowId}`);
  
  return {
    workflowId: handle.workflowId,
    result: handle.result(),
  };
}


/**
 * Start an Order Automation workflow
 */
export async function startOrderAutomationWorkflow(
  params: OrderAutomationParams,
  workflowId?: string
): Promise<{ workflowId: string; result: Promise<OrderAutomationResult> }> {
  const temporalClient = await getTemporalClient();
  
  const id = workflowId || `order-automation-${params.userId}-${Date.now()}`;
  
  const handle = await temporalClient.workflow.start('orderAutomationWorkflow', {
    taskQueue: 'authless-workflows-queue',
    args: [params],
    workflowId: id,
  });

  console.log(`🚀 Started Order Automation workflow ${handle.workflowId}`);
  
  return {
    workflowId: handle.workflowId,
    result: handle.result(),
  };
}

/**
 * Get the result of a running workflow
 */
export async function getWorkflowResult(workflowId: string): Promise<HelloWorkflowResult> {
  const temporalClient = await getTemporalClient();
  
  const handle = temporalClient.workflow.getHandle(workflowId);
  return await handle.result();
}

/**
 * Check if a workflow is running
 */
export async function isWorkflowRunning(workflowId: string): Promise<boolean> {
  try {
    const temporalClient = await getTemporalClient();
    const handle = temporalClient.workflow.getHandle(workflowId);
    const description = await handle.describe();
    
    return description.status.name === 'RUNNING';
  } catch (error) {
    return false;
  }
}

/**
 * Get Order Automation workflow status
 */
export async function getOrderAutomationWorkflowStatus(workflowId: string): Promise<{
  status: 'running' | 'completed' | 'failed';
  result?: OrderAutomationResult;
  message?: string;
}> {
  try {
    const temporalClient = await getTemporalClient();
    const handle = temporalClient.workflow.getHandle(workflowId);
    const description = await handle.describe();
    
    if (description.status.name === 'RUNNING') {
      return { status: 'running', message: 'Order automation workflow is running' };
    } else if (description.status.name === 'COMPLETED') {
      const result = await handle.result() as OrderAutomationResult;
      return { 
        status: 'completed', 
        result,
        message: 'Order automation workflow completed successfully' 
      };
    } else {
      return { 
        status: 'failed', 
        message: `Order automation workflow failed: ${description.status.name}` 
      };
    }
  } catch (error) {
    return { 
      status: 'failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Start a Recurring Billing workflow
 */
export async function startRecurringBillingWorkflow(
  params: RecurringBillingParams,
  workflowId?: string
): Promise<{ workflowId: string; result: Promise<RecurringBillingResult> }> {
  const temporalClient = await getTemporalClient();

  const id = workflowId || `recurring-billing-${Date.now()}`;
  
  const handle = await temporalClient.workflow.start('recurringBillingWorkflow', {
    taskQueue: 'authless-workflows-queue',
    args: [params],
    workflowId: id,
  });

  console.log(`🚀 Started Recurring Billing workflow ${handle.workflowId}`);
  
  return {
    workflowId: handle.workflowId,
    result: handle.result(),
  };
}

/**
 * Get Recurring Billing workflow status
 */
export async function getRecurringBillingWorkflowStatus(workflowId: string): Promise<{
  status: 'running' | 'completed' | 'failed';
  result?: RecurringBillingResult;
  message?: string;
}> {
  try {
    const temporalClient = await getTemporalClient();
    const handle = temporalClient.workflow.getHandle(workflowId);
    const description = await handle.describe();
    
    if (description.status.name === 'RUNNING') {
      return { status: 'running', message: 'Recurring billing workflow is running' };
    } else if (description.status.name === 'COMPLETED') {
      const result = await handle.result() as RecurringBillingResult;
      return { 
        status: 'completed', 
        result,
        message: 'Recurring billing workflow completed successfully' 
      };
    } else {
      return { 
        status: 'failed', 
        message: `Recurring billing workflow failed: ${description.status.name}` 
      };
    }
  } catch (error) {
    return { 
      status: 'failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Close the Temporal client connection
 */
export async function closeTemporalClient(): Promise<void> {
  if (client) {
    await client.connection.close();
    client = null;
  }
}