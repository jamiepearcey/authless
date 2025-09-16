import { WebhookService } from './index.js';

/**
 * Start the Webhook Service
 */
async function startWebhookService() {
  try {
    console.log('🚀 Starting Webhook Service...');
    
    // Create the service with example configuration
    const webhookService = new WebhookService({
      serviceName: 'webhook-service',
      version: '1.0.0',
      natsUrl: 'nats://127.0.0.1:4223',
      streamName: 'EVENTS',
      consumerName: 'webhook_consumer',
      filterSubjects: ['webhook.*'],
      databaseUrl: 'postgresql://postgres:postgres@localhost:5432/authless',
      
      // Processing configuration
      concurrency: 5,
      batchSize: 10,
      ackWaitMs: 30000,
      maxRetries: 3,
      retryBackoffMs: 1000,
      
      // Health and monitoring
              port: 8085,
      metricsPort: 9095,
    });
    
    // Start the service
    await webhookService.start();
    
    console.log('✅ Webhook Service started successfully');
    console.log(`🔗 Service running on port 8084`);
    console.log(`📊 Metrics available on port 9095`);
    
    // Signal handling is managed by the service wrapper
    
  } catch (error) {
    console.error('❌ Failed to start Webhook Service:', error);
    process.exit(1);
  }
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWebhookService();
}
