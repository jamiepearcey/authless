import { JetStreamServiceWrapper, type JetStreamService, type ProcessingContext, type Logger } from '@jetstream/service-wrapper';
import { WebhookConsumer } from '@jetstream/webhook-consumer';
import { Client as PG } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface WebhookServiceConfig {
  // Service identity
  serviceName: string;
  version: string;

  // NATS configuration
  natsUrl: string;
  streamName: string;
  consumerName: string;
  filterSubjects: string[];

  // Database configuration
  databaseUrl: string;

  // Processing configuration
  concurrency?: number;
  batchSize?: number;
  ackWaitMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;

  // Health and metrics
  port?: number;
  metricsPort?: number;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  tenantId?: string;
  isActive: boolean;
  maxRetries: number;
  timeout: number;
  headers?: Record<string, string>;
}

export interface WebhookDeliveryResult {
  webhookId: string;
  eventId: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
  retryCount: number;
  deliveredAt: Date;
}

// ============================================================================
// Main Service Implementation
// ============================================================================

export class WebhookService {
  private wrapper: JetStreamServiceWrapper;
  private db: PG;
  private config: WebhookServiceConfig;
  private webhookConsumer: WebhookConsumer;
  private logger: Logger;

  constructor(config: WebhookServiceConfig) {
    this.config = config;

    // Initialize database connection
    this.db = new PG({ connectionString: config.databaseUrl });

    // Create webhook consumer with database adapter
    this.webhookConsumer = new WebhookConsumer({
      database: {
        getWebhookEndpoints: this.getWebhookEndpoints.bind(this),
        logDelivery: this.logDelivery.bind(this),
      }
    });

    // Create the JetStream service wrapper
    this.wrapper = new JetStreamServiceWrapper(this.webhookConsumer, {
      serviceName: config.serviceName,
      version: config.version,
      natsUrl: config.natsUrl,
      streamName: config.streamName,
      consumerName: config.consumerName,
      filterSubjects: config.filterSubjects,
      concurrency: config.concurrency || 5,
      ackWaitMs: config.ackWaitMs || 30000,
      batchSize: config.batchSize || 1,

      retryPolicy: {
        maxRetries: config.maxRetries || 3,
        baseMs: config.retryBackoffMs || 1000,
        jitterMs: 250,
        toDlq: async (msg: any) => {
          this.logger.warn({
            sequence: msg.seq,
            subject: msg.subject,
            redeliveryCount: msg.info?.redeliveryCount || 0
          }, 'Webhook message sent to DLQ');
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
        intervalMs: 10000,
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

  // ============================================================================
  // Database Adapters
  // ============================================================================

  private async getWebhookEndpoints(eventName?: string, tenantId?: string): Promise<WebhookEndpoint[]> {
    try {
      let query = `
        SELECT 
          w.id,
          w.name,
          w.url,
          w.secret,
          w.events,
          w."tenantId",
          w."isActive",
          w."maxRetries",
          w.timeout,
          w.headers
        FROM "WebhookEndpoint" w
        WHERE w."isActive" = true
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      if (eventName) {
        query += ` AND $${paramIndex} = ANY(w.events)`;
        params.push(eventName);
        paramIndex++;
      }

      if (tenantId) {
        query += ` AND w."tenantId" = $${paramIndex}`;
        params.push(tenantId);
        paramIndex++;
      }
      
      const result = await this.db.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        url: row.url,
        secret: row.secret,
        events: row.events,
        tenantId: row.tenantId,
        isActive: row.isActive,
        maxRetries: row.maxRetries || 3,
        timeout: row.timeout || 30000,
        headers: row.headers || {},
      }));
    } catch (error) {
      this.logger.error({ error }, 'Error getting webhook endpoints');
      return [];
    }
  }

  private async logDelivery(result: WebhookDeliveryResult): Promise<void> {
    try {
      const query = `
        INSERT INTO "WebhookDelivery" (
          id, "webhookId", "eventId", success, "statusCode", 
          "responseTime", error, "retryCount", "deliveredAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
        )
      `;
      
      const values = [
        result.webhookId,
        result.eventId,
        result.success,
        result.statusCode,
        result.responseTime,
        result.error,
        result.retryCount,
        result.deliveredAt,
      ];

      await this.db.query(query, values);
      
      this.logger.info({
        webhookId: result.webhookId,
        success: result.success,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        retryCount: result.retryCount
      }, 'Webhook delivery logged');
    } catch (error) {
      this.logger.error({ error }, 'Error logging webhook delivery');
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  async start(): Promise<void> {
    try {
      // Connect to database
      await this.db.connect();
      this.logger.info('Database connected');

      // Start the wrapper
      await this.wrapper.start();
      this.logger.info('Webhook service started');
    } catch (error) {
      this.logger.error({ error }, 'Failed to start webhook service');
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.wrapper.stop();
      await this.db.end();
      this.logger.info('Webhook service stopped');
    } catch (error) {
      this.logger.error({ error }, 'Error stopping webhook service');
      throw error;
    }
  }

  isRunning(): boolean {
    return this.wrapper.isRunning();
  }

  async getMetrics(): Promise<string> {
    return this.wrapper.getPrometheusMetrics();
  }
}

// ============================================================================
// Service Factory
// ============================================================================

export class WebhookServiceFactory {
  static createService(config: WebhookServiceConfig): WebhookService {
    return new WebhookService(config);
  }
}

// ============================================================================
// Default Configuration and Startup
// ============================================================================

function createDefaultConfig(): WebhookServiceConfig {
  return {
    serviceName: 'webhook-service',
    version: '1.0.0',
    natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
    streamName: process.env.NATS_STREAM_NAME || 'EVENTS',
    consumerName: process.env.WEBHOOK_CONSUMER_NAME || 'webhook-consumer',
    filterSubjects: (process.env.WEBHOOK_FILTER_SUBJECTS || 'events.webhook.*').split(','),
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/beatthefine',
    concurrency: parseInt(process.env.WEBHOOK_CONCURRENCY || '5'),
    batchSize: parseInt(process.env.WEBHOOK_BATCH_SIZE || '1'),
    ackWaitMs: parseInt(process.env.WEBHOOK_ACK_WAIT_MS || '30000'),
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3'),
    retryBackoffMs: parseInt(process.env.WEBHOOK_RETRY_BACKOFF_MS || '1000'),
    port: parseInt(process.env.PORT || '8080'),
    metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
  };
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = createDefaultConfig();
  const service = WebhookServiceFactory.createService(config);
  
  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('🔄 Received SIGINT, shutting down gracefully...');
    await service.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('🔄 Received SIGTERM, shutting down gracefully...');
    await service.stop();
    process.exit(0);
  });
  
  // Start the service
  service.start().catch((error) => {
    console.error('💥 Failed to start webhook service:', error);
    process.exit(1);
  });
}

export default WebhookService;