import { JetStreamServiceWrapper, type JetStreamService, type ProcessingContext, type Logger } from '@jetstream/service-wrapper';
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
  private logger: Logger;

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
          this.logger.warn({
            sequence: msg.seq,
            subject: msg.subject,
            redeliveryCount: msg.info?.redeliveryCount || 0
          }, 'Message sent to DLQ');
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

    // Get logger from wrapper
    this.logger = this.wrapper.getLogger();
  }

  private createJetStreamService(): JetStreamService {
    return {
      hooks: {
        beforeStart: async () => {
          // Connect to database
          await this.db.connect();
          this.logger.info(`${this.config.serviceName} initialized`);
        },

        afterStop: async () => {
          // Cleanup resources
          await this.db.end();
          this.logger.info(`${this.config.serviceName} stopped`);
        },

        onError: async (err: unknown, ctx: ProcessingContext) => {
          // Structured logging for errors
          this.logger.error({
            error: err,
            context: ctx,
            timestamp: new Date().toISOString()
          }, `${this.config.serviceName} error`);
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
          this.logger.info({
            messageId: ctx.messageId,
            eventName: auditEvent.eventName,
            tenantId: auditEvent.tenantId,
            duration: Date.now() - ctx.processingStartTime
          }, 'Audit event processed successfully');

        } catch (error) {
          this.logger.error({
            messageId: ctx.messageId,
            error: error instanceof Error ? error.message : String(error),
            data: data
          }, 'Error processing audit message');
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

  private async processAuditEvent(auditEvent: AuditEvent, _ctx: ProcessingContext): Promise<void> {
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