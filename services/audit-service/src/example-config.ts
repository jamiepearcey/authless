import type { AuditServiceConfig } from './index.js';

// Example configuration for development
export const exampleConfig: AuditServiceConfig = {
  serviceName: 'audit-service',
  version: '1.0.0',
  
  // NATS configuration
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  streamName: 'EVENTS',
  consumerName: 'audit_service',
  
  // Database configuration
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/audit_db',
  
  // Audit configuration
  defaultTenantId: process.env.DEFAULT_TENANT_ID,
  defaultService: process.env.SERVICE_NAME || 'audit-service',
  defaultVersion: process.env.APP_VERSION || '1.0.0',
  maxRetries: Number(process.env.MAX_RETRIES) || 10,
  retryDelayMs: Number(process.env.RETRY_DELAY_MS) || 1000,
  
  // Processing configuration
  concurrency: Number(process.env.CONCURRENCY) || 8,
  batchSize: Number(process.env.BATCH_SIZE) || 100,
  ackWaitMs: Number(process.env.ACK_WAIT_MS) || 30000,
  
  // Health and metrics
  port: Number(process.env.PORT) || 8080,
  metricsPort: Number(process.env.METRICS_PORT) || 9090,
  healthCheckIntervalMs: Number(process.env.HEALTH_CHECK_INTERVAL_MS) || 10000,
  
  // Custom audit handlers
  customAuditHandlers: {
    // Example: Custom handler for payment events
    'payment_completed': async (event, ctx) => {
      console.log('Custom payment completion handler', { eventId: event.id, amount: event.metadata?.amount });
      // Add custom logic here
    },
    
    // Example: Custom handler for security events
    'security_breach_detected': async (event, ctx) => {
      console.log('Security breach detected!', { eventId: event.id, severity: event.metadata?.severity });
      // Trigger security alerts, notifications, etc.
    }
  }
};

// Minimal configuration for testing
export const minimalConfig: AuditServiceConfig = {
  serviceName: 'audit-service-test',
  version: '1.0.0',
  natsUrl: 'nats://localhost:4222',
  streamName: 'EVENTS',
  consumerName: 'audit_service_test',
  databaseUrl: 'postgresql://test:test@localhost:5432/test_db',
  defaultService: 'test-service',
  defaultVersion: '1.0.0',
  maxRetries: 3,
  retryDelayMs: 500
};

// Production configuration
export const productionConfig: AuditServiceConfig = {
  serviceName: 'audit-service',
  version: process.env.APP_VERSION || '1.0.0',
  natsUrl: process.env.NATS_URL!,
  streamName: 'EVENTS',
  consumerName: 'audit_service_prod',
  databaseUrl: process.env.DATABASE_URL!,
  defaultTenantId: process.env.DEFAULT_TENANT_ID,
  defaultService: process.env.SERVICE_NAME || 'audit-service',
  defaultVersion: process.env.APP_VERSION || '1.0.0',
  maxRetries: Number(process.env.MAX_RETRIES) || 15,
  retryDelayMs: Number(process.env.RETRY_DELAY_MS) || 2000,
  concurrency: Number(process.env.CONCURRENCY) || 16,
  batchSize: Number(process.env.BATCH_SIZE) || 200,
  ackWaitMs: Number(process.env.ACK_WAIT_MS) || 60000,
  port: Number(process.env.PORT) || 8080,
  metricsPort: Number(process.env.METRICS_PORT) || 9090,
  healthCheckIntervalMs: Number(process.env.HEALTH_CHECK_INTERVAL_MS) || 5000
};
