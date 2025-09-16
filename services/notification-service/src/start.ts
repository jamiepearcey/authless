#!/usr/bin/env node

import { SimpleNotificationService } from './index';

/**
 * Simple startup script for the config-driven notification service
 * 
 * This replaces the complex configuration in start.ts with a minimal setup
 */

async function main() {
  const service = new SimpleNotificationService({
    serviceName: 'notification-service',
    version: '1.0.0',
    natsUrl: process.env.NATS_URL || 'nats://127.0.0.1:4223',
    streamName: process.env.STREAM_NAME || 'EVENTS',
    consumerName: process.env.CONSUMER_NAME || 'notification_consumer',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/authless',
    concurrency: Number(process.env.CONCURRENCY) || 8,
    batchSize: Number(process.env.BATCH_SIZE) || 100,
    port: Number(process.env.PORT) || 8084,
    metricsPort: Number(process.env.METRICS_PORT) || 9094,
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    try {
      await service.stop();
      console.log('Service stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start the service
  try {
    await service.start();
    console.log('🚀 Simple notification service started successfully');
    console.log('📧 All notification logic is now config-driven in notification-config.ts');
  } catch (error) {
    console.error('Failed to start notification service:', error);
    process.exit(1);
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}