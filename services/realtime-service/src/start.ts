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
    
    // Keep the process running
    process.on('SIGTERM', async () => {
      console.log('🔄 SIGTERM received, shutting down gracefully...');
      await service.stop();
      console.log('✅ Service stopped gracefully');
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('🔄 SIGINT received, shutting down gracefully...');
      await service.stop();
      console.log('✅ Service stopped gracefully');
      process.exit(0);
    });
    
    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught exception:', error);
      await service.stop();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
      await service.stop();
      process.exit(1);
    });
    
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
