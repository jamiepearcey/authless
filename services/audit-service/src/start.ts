#!/usr/bin/env node

/**
 * Audit Service Startup Script
 * 
 * This script demonstrates how to start the Audit Service using the factory pattern.
 * It handles graceful shutdown and provides basic error handling.
 */

import { AuditServiceFactory } from './index.js';
import { exampleConfig } from './example-config.js';

// Graceful shutdown handler
const gracefulShutdown = async (service: any, signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  try {
    await service.stop();
    console.log('Audit service stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

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
    
    // Set up graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown(service, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(service, 'SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown(service, 'uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown(service, 'unhandledRejection');
    });
    
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
