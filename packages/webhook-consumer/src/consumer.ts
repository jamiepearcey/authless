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
  private readonly deliveryService = new WebhookDeliveryService();

  constructor(private readonly config: WebhookConsumerConfig) {
    this.validateConfig();
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
      console.log('🚀 Initializing Webhook Consumer...');
    },

    afterStop: async () => {
      console.log('✅ Webhook Consumer stopped');
    },

    onError: async (err: unknown, ctx: ProcessingContext) => {
      console.error('❌ Webhook Consumer error:', {
        error: err instanceof Error ? err.message : String(err),
        context: ctx,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Process a message from JetStream
   * This is the main entry point called by JetStreamServiceWrapper
   */
  processMessage = async (data: unknown, ctx: ProcessingContext): Promise<void> => {
    try {
      console.log(`📨 Processing webhook message: ${ctx.subject} (seq: ${ctx.sequence})`);

      // Parse the event
      const event = EventSchema.parse(data);

      console.log(`🎯 Processing event: ${event.eventName} for tenant: ${event.tenantId || 'system'}`);

      // Get webhook endpoints that should receive this event
      const webhooks = await this.config.database.getWebhookEndpoints(
        event.eventName,
        event.tenantId
      );

      if (webhooks.length === 0) {
        console.log(`📭 No webhooks configured for event ${event.eventName}`);
        return;
      }

      console.log(`🎣 Found ${webhooks.length} webhooks for event ${event.eventName}`);

      // Process webhooks concurrently
      const deliveryPromises = webhooks.map(webhook =>
        this.processWebhook(event, webhook)
      );

      await Promise.allSettled(deliveryPromises);

      console.log(`✅ Message processed: ${ctx.subject} (seq: ${ctx.sequence})`);

    } catch (error) {
      console.error(`❌ Failed to process message: ${ctx.subject}`, error);
      throw error; // Re-throw to trigger retry logic
    }
  };


  /**
   * Process a webhook for an event
   */
  private async processWebhook(event: Event, webhook: WebhookEndpoint): Promise<void> {
    try {
      console.log(`🔗 Processing webhook ${webhook.name} (${webhook.id}) for event ${event.eventName}`);

      // Deliver webhook with retries
      const results = await this.deliveryService.deliverWithRetry(event, webhook);

      // Log all delivery attempts
      for (const result of results) {
        await this.config.database.logDelivery(result);
      }

      const finalResult = results[results.length - 1];
      if (finalResult.success) {
        console.log(`✅ Webhook ${webhook.name} delivered successfully`);
      } else {
        console.error(`💥 Webhook ${webhook.name} failed after all retries: ${finalResult.error}`);
      }

    } catch (error) {
      console.error(`❌ Error processing webhook ${webhook.name}:`, error);
      
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