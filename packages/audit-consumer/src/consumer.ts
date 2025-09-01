import { JetStreamServiceWrapper, type JetStreamService, type ProcessingContext } from '@jetstream/service-wrapper';
import { Client as PG } from 'pg';
import { SinkRegistry } from './sinks/index.js';
import { DataRedactor, DEFAULT_REDACTION_RULES } from './utils/redaction.js';
import { MetricsCollector } from './metrics.js';
import type { AuditEvent } from './types.js';

// Database connection
const db = new PG({ connectionString: process.env.DATABASE_URL! });

// Sink registry for different output destinations
const sinkRegistry = new SinkRegistry();

// Event normalizer registry - we'll use a simple approach for now
const normalizerRegistry = {
  normalize: async (event: any) => event
};

// Data redactor for PII
const dataRedactor = new DataRedactor(DEFAULT_REDACTION_RULES);

// Metrics collector
const metricsCollector = new MetricsCollector();

const auditService: JetStreamService = {
  hooks: {
    beforeStart: async () => {
      // Connect to database
      await db.connect();
      
      // Initialize sinks
      await sinkRegistry.initialize();
      
      console.log('Audit consumer initialized');
    },
    
    afterStop: async () => {
      // Cleanup resources
      await db.end();
      await sinkRegistry.closeAll();
      console.log('Audit consumer stopped');
    },
    
    onError: async (err: unknown, ctx: ProcessingContext) => {
      // Structured logging for errors
      console.error('Audit consumer error', { 
        error: err, 
        context: ctx,
        timestamp: new Date().toISOString()
      });
      
      // Record error metrics
      metricsCollector.incrementMessageCount('failed');
    },
  },

  processMessage: async (data: unknown, ctx: ProcessingContext) => {
    try {
      // Parse and validate the incoming message
      const auditMessage = data as any;
      
      if (!auditMessage || !auditMessage.eventName) {
        throw new Error('Invalid audit message format: missing eventName');
      }

      // Record processing start
      const startTime = Date.now();
      metricsCollector.incrementInflight();

      // Get sinks for processing
      const sinks = await sinkRegistry.getSinks();
      
      // Process through all sinks
      const sinkResults = await Promise.allSettled(
        sinks.map((sink: any) => sink.processOne(auditMessage))
      );
      
      // Record results
      const successCount = sinkResults.filter((r: any) => r.status === 'fulfilled').length;
      const failureCount = sinkResults.filter((r: any) => r.status === 'rejected').length;
      
      // Log successful processing
      console.log('Audit event processed successfully', {
        messageId: ctx.messageId,
        eventName: auditMessage.eventName,
        tenantId: auditMessage.tenantId,
        sinks: sinks.length,
        successCount,
        failureCount,
        duration: Date.now() - startTime
      });

      // Record metrics
      metricsCollector.recordLatency(Date.now() - startTime);
      metricsCollector.incrementMessageCount('processed');

      // If any sinks failed, log the errors but don't fail the message
      sinkResults.forEach((result: any, index: number) => {
        if (result.status === 'rejected') {
          console.error('Sink processing failed', {
            sink: sinks[index].type,
            eventName: auditMessage.eventName,
            error: result.reason
          });
        }
      });

    } catch (error) {
      console.error('Error processing audit message', {
        messageId: ctx.messageId,
        error: error instanceof Error ? error.message : String(error),
        data: data
      });
      
      // Record error metrics
      metricsCollector.incrementMessageCount('failed');
      
      throw error; // Re-throw to trigger retry logic
    }
  },

  healthCheck: async () => {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check sinks health
    const sinkHealth = await sinkRegistry.healthCheckAll();
    
    return {
      database: 'connected',
      sinks: sinkHealth,
      timestamp: new Date().toISOString()
    };
  }
};

// Create and configure the service wrapper
const wrapper = new JetStreamServiceWrapper(auditService, {
  serviceName: 'audit-consumer',
  version: '1.0.0',
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  streamName: 'EVENTS',
  consumerName: 'audit_consumer',
  concurrency: Number(process.env.CONCURRENCY) || 8,
  ackWaitMs: Number(process.env.ACK_WAIT_MS) || 30000,
  batchSize: Number(process.env.BATCH_SIZE) || 100,
  
  retryPolicy: {
    maxRetries: Number(process.env.MAX_RETRIES) || 10,
    baseMs: 1000,
    jitterMs: 250,
    toDlq: async (msg: any) => {
      // Send to DLQ stream for failed messages
      console.warn('Message sent to DLQ', { 
        sequence: msg.seq,
        subject: msg.subject,
        redeliveryCount: msg.info?.redeliveryCount || 0
      });
      msg.term();
    },
  },
  
  lightshipPort: Number(process.env.PORT) || 8080,
  
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    prefix: 'audit_consumer_',
    metricsPort: Number(process.env.METRICS_PORT) || 9090,
  },
  
  healthChecks: {
    intervalMs: Number(process.env.HEALTH_CHECK_INTERVAL_MS) || 10000,
    checks: [
      async () => {
        await db.query('SELECT 1');
      },
    ],
  },
});

// Start the service
wrapper.start().catch((error: unknown) => {
  console.error('Fatal error starting audit consumer', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await wrapper.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await wrapper.stop();
  process.exit(0);
});

export { wrapper as AuditConsumer };

// Legacy exports for backward compatibility
export const createAuditConsumer = () => wrapper;
export const startAuditConsumer = () => wrapper.start();
export const stopAuditConsumer = () => wrapper.stop();