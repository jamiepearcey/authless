import type { RealtimeServiceConfig } from './index.js';

/**
 * Example configuration for the Realtime Service
 * 
 * This shows how to configure the service with different channel patterns,
 * custom event handlers, and various processing options.
 */

export const exampleConfig: RealtimeServiceConfig = {
  // Service identity
  serviceName: 'realtime-service',
  version: '1.0.0',
  
  // NATS configuration
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  streamName: process.env.STREAM_NAME || 'EVENTS',
  consumerName: process.env.CONSUMER_NAME || 'realtime_consumer',
  
  // Database configuration
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/mydb',
  
  // Centrifugo configuration
  centrifugoUrl: process.env.CENTRIFUGO_URL || 'http://localhost:8000',
  centrifugoApiKey: process.env.CENTRIFUGO_API_KEY || 'your-api-key',
  
  // Channel routing configuration
  channels: [
    // Tenant-wide events
    {
      pattern: 'tenant.{tenantId}.events',
      eventTypes: ['*'],
      requireAuth: true,
    },
    
    // User-specific notifications
    {
      pattern: 'user.{userId}.notifications',
      eventTypes: ['notification'],
      requireAuth: true,
    },
    
    // Payment events
    {
      pattern: 'payments.{tenantId}.{paymentId}',
      eventTypes: ['payment_completed', 'payment_failed', 'payment_refunded'],
      requireAuth: true,
    },
    
    // Support events
    {
      pattern: 'support.{tenantId}.{priority}',
      eventTypes: ['support_ticket_created', 'support_ticket_updated', 'support_ticket_closed'],
      requireAuth: true,
    },
    
    // System events (no auth required)
    {
      pattern: 'system.{eventType}',
      eventTypes: ['maintenance', 'update', 'alert'],
      requireAuth: false,
    }
  ],
  
  // Processing configuration
  concurrency: Number(process.env.CONCURRENCY) || 8,
  batchSize: Number(process.env.BATCH_SIZE) || 100,
  ackWaitMs: Number(process.env.ACK_WAIT_MS) || 30000,
  maxRetries: Number(process.env.MAX_RETRIES) || 10,
  
  // Health and metrics
  port: Number(process.env.PORT) || 8080,
  metricsPort: Number(process.env.METRICS_PORT) || 9090,
  healthCheckIntervalMs: Number(process.env.HEALTH_CHECK_INTERVAL_MS) || 10000,
  
  // Custom event handlers for domain-specific logic
  eventHandlers: {
    'user_registered': async (event, ctx) => {
      console.log('Processing user registration:', {
        userId: event.payload.userId,
        email: event.payload.email,
        tenantId: event.tenantId,
        messageId: ctx.messageId
      });
      
      // Here you could:
      // - Send welcome email
      // - Create user profile
      // - Trigger onboarding workflow
      // - Update analytics
    },
    
    'payment_completed': async (event, ctx) => {
      console.log('Processing payment completion:', {
        paymentId: event.payload.paymentId,
        amount: event.payload.amount,
        currency: event.payload.currency,
        messageId: ctx.messageId
      });
      
      // Here you could:
      // - Send receipt
      // - Update billing status
      // - Trigger fulfillment
      // - Update analytics
    },
    
    'support_ticket_created': async (event, ctx) => {
      console.log('Processing support ticket creation:', {
        ticketId: event.payload.ticketId,
        priority: event.payload.priority,
        category: event.payload.category,
        messageId: ctx.messageId
      });
      
      // Here you could:
      // - Assign to support team
      // - Send confirmation
      // - Update ticket status
      // - Trigger notifications
    }
  }
};

/**
 * Minimal configuration for development/testing
 */
export const minimalConfig: RealtimeServiceConfig = {
  serviceName: 'realtime-service-dev',
  version: '0.1.0',
  natsUrl: 'nats://localhost:4222',
  streamName: 'EVENTS',
  consumerName: 'realtime_consumer_dev',
  databaseUrl: 'postgresql://postgres:postgres@localhost:5432/realtime_dev',
  centrifugoUrl: 'http://localhost:8000',
  centrifugoApiKey: 'dev-api-key',
  channels: [
    {
      pattern: 'dev.{eventType}',
      eventTypes: ['*'],
      requireAuth: false,
    }
  ]
};

/**
 * Production configuration template
 */
export const productionConfig: RealtimeServiceConfig = {
  serviceName: 'realtime-service-prod',
  version: '1.0.0',
  natsUrl: process.env.NATS_URL!,
  streamName: process.env.STREAM_NAME!,
  consumerName: process.env.CONSUMER_NAME!,
  databaseUrl: process.env.DATABASE_URL!,
  centrifugoUrl: process.env.CENTRIFUGO_URL!,
  centrifugoApiKey: process.env.CENTRIFUGO_API_KEY!,
  channels: [
    {
      pattern: 'tenant.{tenantId}.events',
      eventTypes: ['*'],
      requireAuth: true,
    },
    {
      pattern: 'user.{userId}.notifications',
      eventTypes: ['notification'],
      requireAuth: true,
    }
  ],
  concurrency: 16,
  batchSize: 200,
  ackWaitMs: 60000,
  maxRetries: 15,
  port: 8080,
  metricsPort: 9090,
  healthCheckIntervalMs: 5000
};
