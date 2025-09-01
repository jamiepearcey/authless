import { JetStreamServiceWrapper, type JetStreamService, type ProcessingContext } from '@jetstream/service-wrapper';
import { Client as PG } from 'pg';
import type { AuditEvent } from '@jetstream/audit-consumer';

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface AuditServiceConfig {
  // Service identity
  serviceName: string;
  version: string;

  // NATS configuration
  natsUrl: string;
  streamName: string;
  consumerName: string;

  // Database configuration
  databaseUrl: string;

  // Audit configuration
  defaultTenantId?: string;
  defaultService: string;
  defaultVersion: string;
  maxRetries: number;
  retryDelayMs: number;

  // Processing configuration
  concurrency?: number;
  batchSize?: number;
  ackWaitMs?: number;

  // Health and metrics
  port?: number;
  metricsPort?: number;
  healthCheckIntervalMs?: number;

  // Custom audit handlers
  customAuditHandlers?: {
    [eventType: string]: (event: AuditEvent, ctx: ProcessingContext) => Promise<void>;
  };
}

export interface AuditServiceFactory {
  createService(config: AuditServiceConfig): AuditService;
}

// ============================================================================
// Main Service Implementation
// ============================================================================

export class AuditService {
  private wrapper: JetStreamServiceWrapper;
  private db: PG;
  private config: AuditServiceConfig;

  constructor(config: AuditServiceConfig) {
    this.config = config;

    // Initialize database connection
    this.db = new PG({ connectionString: config.databaseUrl });

    // Create the JetStream service wrapper
    this.wrapper = new JetStreamServiceWrapper(this.createJetStreamService(), {
      serviceName: config.serviceName,
      version: config.version,
      natsUrl: config.natsUrl,
      streamName: config.streamName,
      consumerName: config.consumerName,
      concurrency: config.concurrency || 8,
      ackWaitMs: config.ackWaitMs || 30000,
      batchSize: config.batchSize || 100,

      retryPolicy: {
        maxRetries: config.maxRetries || 10,
        baseMs: config.retryDelayMs || 1000,
        jitterMs: 250,
        toDlq: async (msg: any) => {
          console.warn('Message sent to DLQ', {
            sequence: msg.seq,
            subject: msg.subject,
            redeliveryCount: msg.info?.redeliveryCount || 0
          });
          msg.term();
        },
      },

      lightshipPort: config.port || 8080,

      metrics: {
        enabled: true,
        prefix: `${config.serviceName}_`,
        metricsPort: config.metricsPort || 9090,
      },

      healthChecks: {
        intervalMs: config.healthCheckIntervalMs || 10000,
        checks: [
          async () => {
            await this.db.query('SELECT 1');
          },
        ],
      },
    });
  }

  private createJetStreamService(): JetStreamService {
    return {
      hooks: {
        beforeStart: async () => {
          // Connect to database
          await this.db.connect();
          console.log(`${this.config.serviceName} initialized`);
        },

        afterStop: async () => {
          // Cleanup resources
          await this.db.end();
          console.log(`${this.config.serviceName} stopped`);
        },

        onError: async (err: unknown, ctx: ProcessingContext) => {
          // Structured logging for errors
          console.error(`${this.config.serviceName} error`, {
            error: err,
            context: ctx,
            timestamp: new Date().toISOString()
          });
        },
      },

      processMessage: async (data: unknown, ctx: ProcessingContext) => {
        try {
          // Parse and validate the incoming message
          const auditEvent = data as AuditEvent;

          if (!auditEvent || !auditEvent.eventName) {
            throw new Error('Invalid audit event format: missing eventName');
          }

          // Check for custom audit handler first
          if (this.config.customAuditHandlers?.[auditEvent.eventName]) {
            await this.config.customAuditHandlers[auditEvent.eventName](auditEvent, ctx);
            return;
          }

          // Default audit event processing
          await this.processAuditEvent(auditEvent, ctx);

          // Log successful processing
          console.log('Audit event processed successfully', {
            messageId: ctx.messageId,
            eventName: auditEvent.eventName,
            tenantId: auditEvent.tenantId,
            duration: Date.now() - ctx.processingStartTime
          });

        } catch (error) {
          console.error('Error processing audit message', {
            messageId: ctx.messageId,
            error: error instanceof Error ? error.message : String(error),
            data: data
          });
          throw error; // Re-throw to trigger retry logic
        }
      },

      healthCheck: async () => {
        // Check database connection
        await this.db.query('SELECT 1');

        return {
          database: 'connected',
          timestamp: new Date().toISOString()
        };
      }
    };
  }

  private async processAuditEvent(auditEvent: AuditEvent, ctx: ProcessingContext): Promise<void> {
    // Store audit event in database
    await this.storeAuditEvent(auditEvent);

    // Additional processing logic can be added here
    // For example: notifications, analytics, compliance checks, etc.
  }

  private async storeAuditEvent(auditEvent: AuditEvent): Promise<void> {
    const query = `
      INSERT INTO "AuditEvent" (
        id, "eventType", "eventName", "tenantId", "userId", "aggregateType", "aggregateId",
        timestamp, "sourceService", "sourceVersion", "actorType", "actorId", "actorName",
        "actorEmail", "resourceType", "resourceId", "resourceName", "actionType",
        "actionDescription", "actionOutcome", "actionReason", metadata, "originalPayload"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    `;

    const values = [
      auditEvent.id,
      auditEvent.eventType,
      auditEvent.eventName,
      auditEvent.tenantId,
      auditEvent.userId,
      auditEvent.aggregateType,
      auditEvent.aggregateId,
      auditEvent.timestamp,
      auditEvent.source.service,
      auditEvent.source.version,
      auditEvent.actor?.type,
      auditEvent.actor?.id,
      auditEvent.actor?.name,
      auditEvent.actor?.email,
      auditEvent.resource?.type,
      auditEvent.resource?.id,
      auditEvent.resource?.name,
      auditEvent.action.type,
      auditEvent.action.description,
      auditEvent.action.outcome,
      auditEvent.action.reason,
      auditEvent.metadata ? JSON.stringify(auditEvent.metadata) : null,
      JSON.stringify(auditEvent.originalPayload)
    ];

    await this.db.query(query, values);
  }

  // Public API
  async start(): Promise<void> {
    await this.wrapper.start();
  }

  async stop(): Promise<void> {
    await this.wrapper.stop();
  }

  isRunning(): boolean {
    return this.wrapper.isRunning();
  }

  async getMetrics(): Promise<string> {
    return this.wrapper.getPrometheusMetrics();
  }
}

// ============================================================================
// Factory Implementation
// ============================================================================

export class AuditServiceFactory {
  static createService(config: AuditServiceConfig): AuditService {
    return new AuditService(config);
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default AuditService;