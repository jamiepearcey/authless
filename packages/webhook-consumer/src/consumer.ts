import type { JetStreamService, ProcessingContext } from '@jetstream/service-wrapper';
import {
  type IWebhookConsumer,
  type WebhookConsumerConfig,
  type Event,
  type WebhookEndpoint,
  EventSchema,
} from './types';
import { WebhookDeliveryService } from './webhook-delivery';

/**
 * Webhook Consumer Service
 * 
 * Consumes events from JetStream and delivers them to configured webhook endpoints
 * with retry logic, concurrency control, and delivery tracking.
 */
export class WebhookConsumer implements IWebhookConsumer, JetStreamService {
  private readonly deliveryService: WebhookDeliveryService;
  private readonly logger?: WebhookConsumerConfig['logger'];

  constructor(private readonly config: WebhookConsumerConfig) {
    this.validateConfig();
    this.logger = config.logger;
    this.deliveryService = new WebhookDeliveryService(config.logger);
  }

  /**
   * Validate consumer configuration
   */
  private validateConfig(): void {
    if (!this.config.database) {
      throw new Error('Database configuration is required');
    }
  }

  /**
   * JetStreamService hooks implementation
   */
  hooks = {
    beforeStart: async () => {
      this.logger?.info({}, 'Initializing Webhook Consumer...');
    },

    afterStop: async () => {
      this.logger?.info({}, 'Webhook Consumer stopped');
    },

    onError: async (err: unknown, ctx: ProcessingContext) => {
      this.logger?.error({
        error: err instanceof Error ? err.message : String(err),
        context: ctx,
        timestamp: new Date().toISOString()
      }, 'Webhook Consumer error');
    }
  };

  /**
   * Process a message from JetStream
   * This is the main entry point called by JetStreamServiceWrapper
   */
  processMessage = async (data: unknown, ctx: ProcessingContext): Promise<void> => {
    try {
      this.logger?.info({ subject: ctx.subject, sequence: ctx.sequence }, 'Processing webhook message');

      // Parse the event
      const event = EventSchema.parse(data);

      this.logger?.info({ eventName: event.eventName, tenantId: event.tenantId || 'system' }, 'Processing event');

      // Get webhook endpoints that should receive this event
      const webhooks = await this.config.database.getWebhookEndpoints(
        event.eventName,
        event.tenantId
      );

      if (webhooks.length === 0) {
        this.logger?.info({ eventName: event.eventName }, 'No webhooks configured for event');
        return;
      }

      this.logger?.info({ webhooksCount: webhooks.length, eventName: event.eventName }, 'Found webhooks for event');

      // Process webhooks concurrently
      const deliveryPromises = webhooks.map(webhook =>
        this.processWebhook(event, webhook)
      );

      await Promise.allSettled(deliveryPromises);

      this.logger?.info({ subject: ctx.subject, sequence: ctx.sequence }, 'Message processed');

    } catch (error) {
      this.logger?.error({ subject: ctx.subject, error }, 'Failed to process message');
      throw error; // Re-throw to trigger retry logic
    }
  };


  /**
   * Process a webhook for an event
   */
  private async processWebhook(event: Event, webhook: WebhookEndpoint): Promise<void> {
    try {
      this.logger?.info({ webhookName: webhook.name, webhookId: webhook.id, eventName: event.eventName }, 'Processing webhook');

      // Deliver webhook with retries
      const results = await this.deliveryService.deliverWithRetry(event, webhook);

      // Log all delivery attempts
      for (const result of results) {
        await this.config.database.logDelivery(result);
      }

      const finalResult = results[results.length - 1];
      if (finalResult.success) {
        this.logger?.info({ webhookName: webhook.name }, 'Webhook delivered successfully');
      } else {
        this.logger?.error({ webhookName: webhook.name, error: finalResult.error }, 'Webhook failed after all retries');
      }

    } catch (error) {
      this.logger?.error({ webhookName: webhook.name, error }, 'Error processing webhook');
      
      // Log the failure
      await this.config.database.logDelivery({
        webhookId: webhook.id,
        eventId: `error_${Date.now()}`,
        success: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
        deliveredAt: new Date(),
      });
    }
  }



  /**
   * Health check for the consumer
   */
  healthCheck = async (): Promise<any> => {
    return {
      webhookDelivery: 'ready',
      timestamp: new Date().toISOString()
    };
  };

  /**
   * Legacy interface methods for backward compatibility
   */
  async start(): Promise<void> {
    throw new Error('Use JetStreamServiceWrapper.start() instead');
  }

  async stop(): Promise<void> {
    throw new Error('Use JetStreamServiceWrapper.stop() instead');
  }
}