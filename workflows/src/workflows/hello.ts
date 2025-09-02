/**
 * Hello World Workflow
 * 
 * This is a simple workflow that demonstrates Temporal's basic concepts.
 * Workflows are deterministic and can be replayed, so they should only
 * contain deterministic logic and delegate side effects to activities.
 */

import { proxyActivities, sleep, log } from '@temporalio/workflow';
import type * as activities from '../activities/hello';

// Configure activity options
const { greet, getRandomFact, pushToOutbox } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1s',
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});

export interface HelloWorkflowParams {
  name: string;
  includeRandomFact?: boolean;
  pushToOutboxAfter?: boolean;
}

export interface HelloWorkflowResult {
  greeting: string;
  randomFact?: string;
  executionTime: number;
  workflowId: string;
}

export async function helloWorkflow(params: HelloWorkflowParams): Promise<HelloWorkflowResult> {
  const startTime = Date.now();
  
  log.info('Starting Hello World workflow', { 
    name: params.name,
    includeRandomFact: params.includeRandomFact,
    pushToOutboxAfter: params.pushToOutboxAfter 
  });

  // Step 1: Greet the user
  const greeting = await greet(params.name);
  log.info('Greeting completed', { greeting });

  let randomFact: string | undefined;
  
  // Step 2: Optionally get a random fact
  if (params.includeRandomFact) {
    randomFact = await getRandomFact();
    log.info('Random fact retrieved', { randomFact });
  }

  // Step 3: Simulate some workflow logic with deterministic sleep
  await sleep('2s');
  log.info('Workflow processing completed');

  // Step 4: Optionally push an event to your outbox pattern
  if (params.pushToOutboxAfter) {
    const eventData = {
      eventType: 'workflow.hello.completed',
      aggregateType: 'HelloWorkflow',
      aggregateId: `hello-${params.name.toLowerCase().replace(/\s+/g, '-')}`,
      tenantId: 'temporal-integration',
      payloadJson: {
        id: crypto.randomUUID(),
        eventType: 'WorkflowEvent',
        eventName: 'hello.workflow.completed',
        tenantId: 'temporal-integration',
        workflowName: params.name,
        timestamp: new Date().toISOString(),
        source: { service: 'temporal-workflows', version: '1.0.0' },
        actor: { type: 'system', id: 'temporal', name: 'Temporal Workflow' },
        resource: { type: 'HelloWorkflow', id: `hello-${params.name}` },
        action: { 
          type: 'COMPLETE', 
          description: 'Hello workflow completed successfully',
          outcome: 'success'
        },
        metadata: { 
          greeting,
          randomFact,
          originalParams: params
        }
      }
    };
    
    await pushToOutbox(eventData);
    log.info('Event pushed to outbox for further processing');
  }

  const executionTime = Date.now() - startTime;
  
  const result: HelloWorkflowResult = {
    greeting,
    randomFact,
    executionTime,
    workflowId: `hello-${params.name}-${startTime}`
  };

  log.info('Hello World workflow completed successfully', { 
    greeting: result.greeting,
    randomFact: result.randomFact,
    executionTime: result.executionTime,
    workflowId: result.workflowId
  });
  return result;
}