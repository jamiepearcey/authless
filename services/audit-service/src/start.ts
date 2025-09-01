#!/usr/bin/env node

/**
 * Audit Service Startup Script
 * 
 * This script demonstrates how to start the Audit Service using the factory pattern.
 * It handles graceful shutdown and provides basic error handling.
 */

import { AuditServiceFactory } from './index.js';
import { exampleConfig } from './example-config.js';



// Main startup function
const main = async () => {
  try {
    console.log('🚀 Starting Audit Service...');
    
    // Create the service using the factory
    const service = AuditServiceFactory.createService(exampleConfig);
    
    // Start the service
    await service.start();
    
    console.log('✅ Audit Service started successfully');
    console.log(`📊 Metrics available at: http://localhost:${exampleConfig.metricsPort}/metrics`);
    console.log(`🏥 Health checks available at: http://localhost:${exampleConfig.port}/health`);
    
    // Signal handling is managed by the service wrapper
    
  } catch (error) {
    console.error('❌ Failed to start Audit Service:', error);
    process.exit(1);
  }
};

// Start the service
main().catch((error) => {
  console.error('Fatal error in main:', error);
  process.exit(1);
});
