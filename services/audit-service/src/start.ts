#!/usr/bin/env node

import { AuditService, AuditServiceFactory, type AuditServiceConfig } from './index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// Configuration Loading
// ============================================================================

function createDefaultConfig(): AuditServiceConfig {
  return {
    serviceName: process.env.SERVICE_NAME || 'audit-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    natsUrl: process.env.NATS_URL || 'nats://127.0.0.1:4223',
    streamName: process.env.NATS_STREAM_NAME || 'EVENTS',
    consumerName: process.env.AUDIT_CONSUMER_NAME || 'audit-consumer',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/authless',
    defaultService: process.env.DEFAULT_SERVICE || 'audit-service',
    defaultVersion: process.env.DEFAULT_VERSION || '1.0.0',
    maxRetries: parseInt(process.env.AUDIT_MAX_RETRIES || '10'),
    retryDelayMs: parseInt(process.env.AUDIT_RETRY_DELAY_MS || '1000'),
    concurrency: parseInt(process.env.AUDIT_CONCURRENCY || '8'),
    batchSize: parseInt(process.env.AUDIT_BATCH_SIZE || '100'),
    ackWaitMs: parseInt(process.env.AUDIT_ACK_WAIT_MS || '30000'),
    port: parseInt(process.env.PORT || '8081'),
    metricsPort: parseInt(process.env.METRICS_PORT || '9091'),
    healthCheckIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '10000'),
  };
}

function validateConfig(config: AuditServiceConfig): void {
  const required = ['serviceName', 'natsUrl', 'streamName', 'consumerName', 'databaseUrl'];
  const missing = required.filter(key => !config[key as keyof AuditServiceConfig]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  // Validate numeric values
  if (config.maxRetries < 1 || config.maxRetries > 100) {
    throw new Error('maxRetries must be between 1 and 100');
  }

  if (config.retryDelayMs < 100 || config.retryDelayMs > 30000) {
    throw new Error('retryDelayMs must be between 100 and 30000 milliseconds');
  }

  if ((config.concurrency ?? 0) < 1 || (config.concurrency ?? 0) > 100) {
    throw new Error('concurrency must be between 1 and 100');
  }

  if ((config.batchSize ?? 0) < 1 || (config.batchSize ?? 0) > 1000) {
    throw new Error('batchSize must be between 1 and 1000');
  }
}

// ============================================================================
// Service Startup
// ============================================================================

async function main() {
  let service: AuditService | null = null;

  try {
    console.log('🚀 Starting Audit Service...');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Version: ${process.env.SERVICE_VERSION || '1.0.0'}`);

    // Load and validate configuration
    const config = createDefaultConfig();
    validateConfig(config);

    console.log('✅ Configuration loaded and validated');
    console.log(`   Service: ${config.serviceName} v${config.version}`);
    console.log(`   NATS: ${config.natsUrl}`);
    console.log(`   Stream: ${config.streamName}`);
    console.log(`   Consumer: ${config.consumerName}`);
    console.log(`   Database: ${config.databaseUrl.replace(/\/\/[^@]+@/, '//***:***@')}`);
    console.log(`   Concurrency: ${config.concurrency}`);
    console.log(`   Batch Size: ${config.batchSize}`);
    console.log(`   Max Retries: ${config.maxRetries}`);

    // Create and start service
    service = AuditServiceFactory.createService(config);
    
    await service.start();
    
    console.log('✅ Audit Service started successfully');
    console.log(`   Health endpoint: http://localhost:${config.port}/health`);
    console.log(`   Metrics endpoint: http://localhost:${config.metricsPort}/metrics`);
    
  } catch (error) {
    console.error('💥 Failed to start audit service:', error);
    
    if (service) {
      try {
        await service.stop();
      } catch (stopError) {
        console.error('Error during cleanup:', stopError);
      }
    }
    
    process.exit(1);
  }

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    
    if (service) {
      try {
        await service.stop();
        console.log('✅ Audit service stopped gracefully');
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
      }
    }
    
    process.exit(0);
  };

  // Register signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

// Start the service
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
