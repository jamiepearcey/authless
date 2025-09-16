import { JetStreamServiceWrapper, type JetStreamService, type ProcessingContext, type Logger } from '@jetstream/service-wrapper';
import { db } from '@db/base';
import { SimpleNotificationProcessor } from './notification-processor';

/**
 * Simplified notification service with config-driven architecture
 * 
 * This replaces the complex index.ts with a much simpler approach:
 * - Single entry point for all events
 * - All logic defined in notification-config.ts
 * - No hard-coded event type handling
 * - No complex routing based on subjects
 */

export interface SimpleNotificationServiceConfig {
  serviceName: string;
  version: string;
  natsUrl: string;
  streamName: string;
  consumerName: string;
  databaseUrl: string;
  concurrency?: number;
  batchSize?: number;
  port?: number;
  metricsPort?: number;
}

export class SimpleNotificationService {
  private wrapper: JetStreamServiceWrapper;
  private processor: SimpleNotificationProcessor;
  private logger: Logger;

  constructor(private config: SimpleNotificationServiceConfig) {
    // Initialize notification processor
    this.processor = new SimpleNotificationProcessor(db, this.createLogger());
    
    // Create JetStream service wrapper
    this.wrapper = new JetStreamServiceWrapper(this.createJetStreamService(), {
      serviceName: config.serviceName,
      version: config.version,
      natsUrl: config.natsUrl,
      streamName: config.streamName,
      consumerName: config.consumerName,
      concurrency: config.concurrency || 8,
      batchSize: config.batchSize || 100,
      
      retryPolicy: {
        maxRetries: 3,
        baseMs: 1000,
        jitterMs: 250,
      },
      
      lightshipPort: config.port || 8084,
      
      metrics: {
        enabled: true,
        prefix: 'notification_service_',
        metricsPort: config.metricsPort || 9094,
      },
      
      healthChecks: {
        intervalMs: 10000,
        checks: [
          async () => {
            // Simple database health check
            await db.$queryRaw`SELECT 1`;
          }
        ],
      },
    });

    this.logger = this.wrapper.getLogger();
  }

  private createLogger(): Logger {
    return console as any; // Fallback logger until wrapper initializes
  }

  private createJetStreamService(): JetStreamService {
    return {
      hooks: {
        afterStart: async () => {
          // Initialize processor with NATS connection
          const natsConnection = this.wrapper.getNatsConnection();
          const jetStream = this.wrapper.getJetStreamClient();
          
          if (natsConnection && jetStream) {
            this.processor.setJetStreamClient(natsConnection, jetStream);
          }
          
          this.logger.info('Simple notification service started');
        },
        
        onError: async (err: unknown, ctx: ProcessingContext) => {
          this.logger.error({ error: err, context: ctx }, 'Notification service error');
        },
      },

      /**
       * Single, unified message processing entry point
       * No complex routing - just process every event through the config-driven processor
       */
      processMessage: async (data: unknown, ctx: ProcessingContext) => {
        try {
          // All events are processed the same way using config rules
          await this.processor.processEvent(data);
          
          this.logger.info('Event processed successfully', {
            messageId: ctx.messageId,
            subject: ctx.subject,
            duration: Date.now() - ctx.processingStartTime
          });

        } catch (error) {
          this.logger.error('Error processing event', {
            messageId: ctx.messageId,
            subject: ctx.subject,
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      },

      healthCheck: async () => {
        // Simple health check
        await db.$queryRaw`SELECT 1`;
        return { status: 'healthy', timestamp: new Date().toISOString() };
      }
    };
  }

  async start(): Promise<void> {
    await this.wrapper.start();
  }

  async stop(): Promise<void> {
    await this.wrapper.stop();
    await db.$disconnect();
  }

  isRunning(): boolean {
    return this.wrapper.isRunning();
  }

  async getMetrics(): Promise<string> {
    return this.wrapper.getPrometheusMetrics();
  }
}
