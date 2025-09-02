/**
 * Temporal Worker
 * 
 * The worker is responsible for executing workflows and activities.
 * It connects to the Temporal service and polls for work.
 */

import { Worker } from '@temporalio/worker';
import * as helloActivities from './activities/hello';
import * as userOnboardingActivities from './activities/user-onboarding';
import * as paymentProcessingActivities from './activities/payment-processing';

async function run() {
  console.log('🚀 Starting Temporal Worker...');
  
  // Create and run a Worker
  const worker = await Worker.create({
    workflowsPath: new URL('./workflows', import.meta.url).pathname,
    activities: {
      ...helloActivities,
      ...userOnboardingActivities,
      ...paymentProcessingActivities,
    },
    taskQueue: 'authless-workflows-queue',
  });

  console.log('✅ Worker created, connecting to Temporal server...');
  
  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down worker gracefully...');
    await worker.shutdown();
    console.log('✅ Worker shut down successfully');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await worker.run();
  } catch (error) {
    console.error('💥 Worker failed:', error);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('💥 Failed to start worker:', err);
  process.exit(1);
});