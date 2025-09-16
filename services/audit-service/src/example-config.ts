import { AuditServiceConfig } from './index.js';

/**
 * Example configuration for the Audit Service
 */
export const exampleConfig: AuditServiceConfig = {
  serviceName: 'audit-service',
  version: '1.0.0',
  natsUrl: 'nats://127.0.0.1:4223',
  streamName: 'EVENTS',
  consumerName: 'audit_consumer',
  databaseUrl: 'postgresql://postgres:postgres@localhost:5432/authless',
  
  // Processing configuration
  concurrency: 5,
  batchSize: 10,
  ackWaitMs: 30000,
  
  // Health and monitoring
  port: 8081,
  metricsPort: 9092,
  healthCheckIntervalMs: 10000,
  
  // Audit configuration
  defaultTenantId: '1',
  defaultService: 'audit-service',
  defaultVersion: '1.0.0',
  maxRetries: 3,
  retryDelayMs: 1000,
  
  // Event handlers
  customAuditHandlers: {
    'user.login': async (event, ctx) => {
      console.log('User login audited:', {
        userId: event.originalPayload.userId,
        timestamp: event.timestamp,
        messageId: ctx.messageId
      });
    },
    
    'payment.completed': async (event, ctx) => {
      console.log('Payment completion audited:', {
        paymentId: event.originalPayload.paymentId,
        amount: event.originalPayload.amount,
        messageId: ctx.messageId
      });
    },
    
    'support.ticket.created': async (event, ctx) => {
      console.log('Support ticket creation audited:', {
        ticketId: event.originalPayload.ticketId,
        userId: event.originalPayload.userId,
        messageId: ctx.messageId
      });
    }
  }
};
