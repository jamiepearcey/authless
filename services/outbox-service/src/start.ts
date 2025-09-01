import { OutboxService } from './index.js';

/**
 * Start the Outbox Service
 */
async function startOutboxService() {
  try {
    console.log('🚀 Starting Outbox Service...');
    
    // Create the service with example configuration
    const outboxService = new OutboxService({
      serviceName: 'outbox-service',
      version: '1.0.0',
      databaseUrl: 'postgresql://postgres:postgres@localhost:5432/authless',
      natsUrl: 'nats://localhost:4223',
      batchSize: 100,
      maxTries: 3,
      idleSleepMs: 1000,
      logLevel: 'info',
      port: 8082,
      metricsPort: 9094,
      metricsEnabled: true,
    });
    
    // Start the service
    await outboxService.start();
    
    console.log('✅ Outbox Service started successfully');
    console.log(`📦 Service running on port 8082`);
    console.log(`📊 Metrics available on port 9094`);
    
    // Signal handling is managed by the service
    
  } catch (error) {
    console.error('❌ Failed to start Outbox Service:', error);
    process.exit(1);
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startOutboxService();
}
