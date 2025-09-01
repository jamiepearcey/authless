#!/usr/bin/env node

/**
 * Startup script for the Realtime Service
 * 
 * This demonstrates how to start the service with configuration
 * and handle graceful shutdown.
 */

import RealtimeService, { RealtimeServiceFactory } from './index.js';
import { exampleConfig } from './example-config.js';

async function main() {
  console.log('🚀 Starting Realtime Service...');
  
  try {
    // Create the service using the factory
    const service = new RealtimeService(exampleConfig);
    
    // Start the service
    await service.start();
    
    console.log('✅ Realtime Service started successfully');
    console.log(`📊 Health checks available at: http://localhost:${exampleConfig.port}/health`);
    console.log(`📈 Metrics available at: http://localhost:${exampleConfig.metricsPort}/metrics`);
    
    // Keep the process running - signal handling is managed by the service wrapper
    
  } catch (error) {
    console.error('❌ Failed to start Realtime Service:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
