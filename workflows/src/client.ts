/**
 * Temporal Client
 * 
 * This module provides a configured Temporal client for starting workflows
 * and querying workflow state. Used by the Next.js app to trigger workflows.
 */

import { Client, Connection } from '@temporalio/client';
import type { HelloWorkflowParams, HelloWorkflowResult } from './workflows/hello';
import type { UserOnboardingParams, UserOnboardingResult } from './workflows/user-onboarding';
import type { PaymentProcessingParams, PaymentProcessingResult } from './workflows/payment-processing';

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
 * Start a Payment Processing workflow
 */
export async function startPaymentProcessingWorkflow(
  params: PaymentProcessingParams,
  workflowId?: string
): Promise<{ workflowId: string; result: Promise<PaymentProcessingResult> }> {
  const temporalClient = await getTemporalClient();
  
  const id = workflowId || `payment-processing-${params.userId}-${Date.now()}`;
  
  const handle = await temporalClient.workflow.start('paymentProcessingWorkflow', {
    taskQueue: 'authless-workflows-queue',
    args: [params],
    workflowId: id,
  });

  console.log(`🚀 Started Payment Processing workflow ${handle.workflowId}`);
  
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
 * Close the Temporal client connection
 */
export async function closeTemporalClient(): Promise<void> {
  if (client) {
    await client.connection.close();
    client = null;
  }
}