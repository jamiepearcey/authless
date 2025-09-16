#!/usr/bin/env node

import { OutboxService, OutboxServiceFactory, type OutboxServiceConfig } from './index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// Configuration Loading
// ============================================================================

function createDefaultConfig(): OutboxServiceConfig {
  return {
    serviceName: process.env.SERVICE_NAME || 'outbox-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/authless',
    natsUrl: process.env.NATS_URL || 'nats://127.0.0.1:4223',
    batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '100'),
    maxTries: parseInt(process.env.OUTBOX_MAX_TRIES || '10'),
    idleSleepMs: parseInt(process.env.OUTBOX_IDLE_SLEEP_MS || '500'),
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    port: parseInt(process.env.PORT || '8082'),
    metricsPort: parseInt(process.env.METRICS_PORT || '9092'),
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
  };
}

function validateConfig(config: OutboxServiceConfig): void {
  const required = ['serviceName', 'databaseUrl', 'natsUrl'];
  const missing = required.filter(key => !config[key as keyof OutboxServiceConfig]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  // Validate numeric values
  if ((config.batchSize ?? 0) < 1 || (config.batchSize ?? 0) > 1000) {
    throw new Error('batchSize must be between 1 and 1000');
  }

  if ((config.maxTries ?? 0) < 1 || (config.maxTries ?? 0) > 100) {
    throw new Error('maxTries must be between 1 and 100');
  }

  if ((config.idleSleepMs ?? 0) < 10 || (config.idleSleepMs ?? 0) > 30000) {
    throw new Error('idleSleepMs must be between 10 and 30000 milliseconds');
  }
}

// ============================================================================
// Service Startup
// ============================================================================

async function main() {
  let service: OutboxService | null = null;

  try {
    console.log('🚀 Starting Outbox Service...');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Version: ${process.env.SERVICE_VERSION || '1.0.0'}`);

    // Load and validate configuration
    const config = createDefaultConfig();
    validateConfig(config);

    console.log('✅ Configuration loaded and validated');
    console.log(`   Service: ${config.serviceName} v${config.version}`);
    console.log(`   NATS: ${config.natsUrl}`);
    console.log(`   Database: ${config.databaseUrl.replace(/\/\/[^@]+@/, '//***:***@')}`);
    console.log(`   Batch Size: ${config.batchSize}`);
    console.log(`   Max Tries: ${config.maxTries}`);
    console.log(`   Idle Sleep: ${config.idleSleepMs}ms`);

    // Create and start service
    service = OutboxServiceFactory.createService(config);
    
    await service.start();
    
    console.log('✅ Outbox Service started successfully');
    console.log(`   Health endpoint: http://localhost:${config.port}/health`);
    console.log(`   Metrics endpoint: http://localhost:${config.metricsPort}/metrics`);
    
  } catch (error) {
    console.error('💥 Failed to start outbox service:', error);
    
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
        console.log('✅ Outbox service stopped gracefully');
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
