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

      lightshipPort: config.port || 8081,

      metrics: {
        enabled: true,
        prefix: `${config.serviceName}_`,
        metricsPort: config.metricsPort || 9091,
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

  private normalizeTimestamp(timestamp: any): Date {
    if (typeof timestamp === 'string') {
      // Handle malformed timestamps like "2025-09-14T21:58:34.3NZ"
      let timestampStr = timestamp;
      
      // Fix common malformed timestamp patterns
      if (timestampStr.includes('NZ') && !timestampStr.endsWith('Z')) {
        // Replace "3NZ" with "300Z" (pad milliseconds and fix timezone)
        timestampStr = timestampStr.replace(/(\d)NZ$/, '$1000Z');
      }
      
      const normalized = new Date(timestampStr);
      
      // If still invalid, use current time
      if (isNaN(normalized.getTime())) {
        this.logger.warn({
          originalTimestamp: timestamp,
        }, 'Invalid timestamp format, using current time');
        return new Date();
      }
      
      return normalized;
    } else if (timestamp instanceof Date) {
      return timestamp;
    } else {
      // Fallback to current time
      this.logger.warn({
        originalTimestamp: timestamp,
      }, 'Unexpected timestamp type, using current time');
      return new Date();
    }
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
          // Debug log the incoming data structure
          this.logger.info({
            messageId: ctx.messageId,
            dataStructure: data,
            dataType: typeof data
          }, 'Processing incoming audit message');

          // Parse and validate the incoming message
          const auditEvent = data as AuditEvent;

          if (!auditEvent || !auditEvent.eventName) {
            throw new Error('Invalid audit event format: missing eventName');
          }

          // Fix timestamp if it's a string (normalize malformed timestamps)
          if (typeof auditEvent.timestamp === 'string') {
            auditEvent.timestamp = this.normalizeTimestamp(auditEvent.timestamp);
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
        const healthStatus: any = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          checks: {},
          errors: []
        };

        // Check database connection
        try {
          await this.db.query('SELECT 1');
          healthStatus.checks.database = { status: 'connected', lastChecked: new Date().toISOString() };
        } catch (error) {
          healthStatus.status = 'unhealthy';
          healthStatus.checks.database = { 
            status: 'failed', 
            error: error instanceof Error ? error.message : String(error),
            lastChecked: new Date().toISOString()
          };
          healthStatus.errors.push({
            component: 'database',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          });
        }

        // Check recent processing activity
        try {
          const recentLogs = await this.db.query(`
            SELECT COUNT(*) as count 
            FROM "AuditLog" 
            WHERE "createdAt" > NOW() - INTERVAL '5 minutes'
          `);
          const recentCount = parseInt(recentLogs.rows[0]?.count || '0');
          healthStatus.checks.recentActivity = { 
            status: 'active', 
            recentEvents: recentCount,
            lastChecked: new Date().toISOString()
          };
        } catch (error) {
          healthStatus.errors.push({
            component: 'recent_activity_check',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          });
        }

        return healthStatus;
      }
    };
  }

  private async processAuditEvent(auditEvent: AuditEvent, _ctx: ProcessingContext): Promise<void> {
    // Store audit event in database
    await this.storeAuditEvent(auditEvent);

    // Additional processing logic can be added here
    // For example: notifications, analytics, compliance checks, etc.
  }

  private extractUserId(auditEvent: AuditEvent): string | null {
    // Try multiple patterns to extract user ID from different event types
    if (auditEvent.userId) {
      return auditEvent.userId;
    }

    // For outbox events, check the originalPayload for user ID patterns
    const payload = auditEvent.originalPayload || {};
    
    // Check common user ID field patterns
    const userIdFields = [
      'userId', 'user_id', 'updatedBy', 'createdBy', 'deletedBy', 
      'actionedBy', 'triggeredBy', 'changedBy'
    ];
    
    for (const field of userIdFields) {
      if (payload[field]) {
        return payload[field];
      }
    }

    // Check nested user objects
    if (payload.user?.id) {
      return payload.user.id;
    }

    if (payload.actor?.id && payload.actor?.type === 'user') {
      return payload.actor.id;
    }

    return null;
  }

  private async storeAuditEvent(auditEvent: AuditEvent): Promise<void> {
    const query = `
      INSERT INTO "AuditLog" (
        id, "tenantId", "userId", action, "resourceType", "resourceId", 
        details, "ipAddress", "userAgent", metadata, severity, "createdAt", "traceId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;

    // Extract userId using multiple patterns
    const userId = this.extractUserId(auditEvent);

    // Map AuditEvent to AuditLog schema
    const values = [
      auditEvent.id,
      auditEvent.tenantId || null, // Convert empty string to null for foreign key constraint
      userId,
      auditEvent.action.type || auditEvent.eventType,
      auditEvent.resource?.type,
      auditEvent.resource?.id,
      JSON.stringify({
        eventType: auditEvent.eventType,
        eventName: auditEvent.eventName,
        aggregateType: auditEvent.aggregateType,
        aggregateId: auditEvent.aggregateId,
        source: auditEvent.source,
        action: auditEvent.action,
        originalPayload: auditEvent.originalPayload
      }),
      auditEvent.actor?.ipAddress,
      auditEvent.actor?.userAgent,
      auditEvent.metadata ? JSON.stringify(auditEvent.metadata) : null,
      auditEvent.action.outcome === 'failure' ? 'error' : 'info',
      auditEvent.timestamp,
      auditEvent.source?.correlationId
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