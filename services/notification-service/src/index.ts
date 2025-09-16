import { JetStreamServiceWrapper, type JetStreamService, type ProcessingContext, type Logger } from '@jetstream/service-wrapper';
import { Client as PG } from 'pg';
import type { Event as RealtimeEvent, RealtimeMessage, NotificationEvent } from '@jetstream/realtime-consumer';
import { CentrifugoClient } from '@jetstream/realtime-consumer';
import { ChannelRouter } from '@jetstream/realtime-consumer';
import { db } from '@db/base';
import type { PrismaClient } from '@db/base';
import { NotificationIntent, RealtimeServiceConfig } from './abstractions';
import { NotificationService, NotificationServiceConfig } from './notification-service';

export interface RealtimeServiceFactory {
  createService(config: RealtimeServiceConfig): RealtimeService;
}

// ============================================================================
// Main Service Implementation
// ============================================================================

export class RealtimeService {
  private wrapper: JetStreamServiceWrapper;
  private db: PG;
  private prisma: PrismaClient;
  private centrifugoClient: CentrifugoClient;
  private channelRouter: ChannelRouter;
  private notificationService: NotificationService;
  private config: RealtimeServiceConfig;
  private logger: Logger;

  constructor(config: RealtimeServiceConfig) {
    this.config = config;
    
    // Initialize database connection
    this.db = new PG({ connectionString: config.databaseUrl });

    // Use shared Prisma client instance
    this.prisma = db;
    
    // Initialize Centrifugo client
    this.centrifugoClient = new CentrifugoClient({
      apiUrl: config.centrifugoUrl,
      apiKey: config.centrifugoApiKey,
      timeout: 5000,
    });
    
    // Initialize channel router with custom configuration
    this.channelRouter = new ChannelRouter(config.channels);
    
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
        baseMs: 1000,
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
      
      lightshipPort: config.port || 8084,
      
      metrics: {
        enabled: true,
        prefix: `${config.serviceName.replace(/-/g, '_')}_`,
        metricsPort: config.metricsPort || 9094,
      },
      
      healthChecks: {
        intervalMs: config.healthCheckIntervalMs || 10000,
        checks: [
          async () => {
            await this.db.query('SELECT 1');
          },
          async () => {
            // Check Centrifugo health
            const stats = await this.centrifugoClient.getStats();
            if (!stats) {
              throw new Error('Centrifugo health check failed');
            }
          }
        ],
      },
    });

    // Get logger from wrapper
    this.logger = this.wrapper.getLogger();
    
    // Initialize notification service (after logger is available)
    const notificationConfig: NotificationServiceConfig = {
      databaseUrl: config.databaseUrl,
      centrifugoUrl: config.centrifugoUrl,
      centrifugoApiKey: config.centrifugoApiKey,
      eventMappings: config.notificationConfig?.eventMappings,
      defaultPreferences: config.notificationConfig?.defaultPreferences,
      templateProcessing: config.notificationConfig?.templateProcessing,
      deliveryRetryConfig: config.notificationConfig?.deliveryRetryConfig
    };
    // Note: NATS connection will be passed in afterStart hook when available
    this.notificationService = new NotificationService(notificationConfig, this.logger);
  }

  private createJetStreamService(): JetStreamService {
    return {
      hooks: {
        beforeStart: async () => {
          // Connect to database
          await this.db.connect();
          
          this.logger.info(`${this.config.serviceName} initialized`);
        },
        
        afterStart: async () => {
          // Initialize notification service with NATS connection
          const natsConnection = this.wrapper.getNatsConnection();
          const jetStream = this.wrapper.getJetStreamClient();
          
          if (natsConnection && jetStream) {
            this.notificationService.setJetStreamClient(natsConnection, jetStream);
          } else {
            this.logger.warn('NATS connection not available for notification service');
          }
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
          const event = data as RealtimeEvent;
          
          if (!event || !event.eventName) {
            throw new Error('Invalid event format: missing eventName');
          }

          // Check for custom event handler first
          if (this.config.eventHandlers?.[event.eventName]) {
            await this.config.eventHandlers[event.eventName](event, ctx);
            return;
          }

          // Route the event based on its type and subject pattern
          const subject = ctx.subject || '';
          
          if (subject.startsWith('notification.intent.')) {
            // Handle explicit notification intents
            await this.handleNotificationIntent(event, ctx);
          } else if (subject.startsWith('events.')) {
            // Handle domain events from outbox
            await this.handleDomainEvent(event, ctx);
          } else if (event.eventName === 'notification.created') {
            // Handle direct notification creation events
            await this.handleNotificationCreated(event, ctx);
          } else {
            // Legacy event handling
            switch (event.eventName) {
              case 'realtime_message':
                if (this.isRealtimeMessage(data)) {
                  await this.handleRealtimeMessage(data as RealtimeMessage, ctx);
                } else {
                  await this.handleGenericEvent(event, ctx);
                }
                break;
                
              case 'notification':
                if (this.isNotificationEvent(data)) {
                  await this.handleNotificationEvent(data as NotificationEvent, ctx);
                } else {
                  await this.handleGenericEvent(event, ctx);
                }
                break;
                
              default:
                // Use the existing channel router for other events
                await this.handleGenericEvent(event, ctx);
            }
          }

          // Log successful processing
          this.logger.info('Event processed successfully', {
            messageId: ctx.messageId,
            eventName: event.eventName,
            subject: ctx.subject,
            duration: Date.now() - ctx.processingStartTime
          });

        } catch (error) {
          this.logger.error('Error processing message', {
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
        
        // Check Centrifugo connection
        const stats = await this.centrifugoClient.getStats();
        
        return {
          database: 'connected',
          centrifugo: stats ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString()
        };
      }
    };
  }

  // Type guards
  private isRealtimeMessage(data: unknown): data is RealtimeMessage {
    return typeof data === 'object' && data !== null && 'channel' in data && 'type' in data;
  }

  private isNotificationEvent(data: unknown): data is NotificationEvent {
    return typeof data === 'object' && data !== null && 'recipientId' in data && 'title' in data;
  }

  // ============================================================================
  // Notification Processing Methods
  // ============================================================================

  private async handleNotificationCreated(event: RealtimeEvent, ctx: ProcessingContext) {
    try {
      this.logger.info('Processing notification created event', {
        messageId: ctx.messageId,
        eventName: event.eventName,
        tenantId: event.tenantId
      });

      // Extract notification data from event payload
      const notificationData = event.payload as any;
      
      if (!notificationData || !notificationData.notificationId) {
        throw new Error('Invalid notification created event: missing notificationId');
      }

      // Process notification through notification service
      await this.notificationService.processNotificationCreated(notificationData);

    } catch (error) {
      this.logger.error('Failed to handle notification created event', {
        messageId: ctx.messageId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async handleNotificationIntent(event: RealtimeEvent, ctx: ProcessingContext) {
    try {
      this.logger.info('Processing notification intent', {
        messageId: ctx.messageId,
        eventName: event.eventName,
        tenantId: event.tenantId
      });

      // Extract notification intent data from event payload
      const intentData = event.payload as NotificationIntent;
      
      if (!intentData || !intentData.type || !intentData.recipients) {
        throw new Error('Invalid notification intent: missing required fields');
      }

      // Process the notification intent
      await this.notificationService.processNotificationIntent(intentData);

    } catch (error) {
      this.logger.error('Failed to handle notification intent', {
        messageId: ctx.messageId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async handleDomainEvent(event: RealtimeEvent, ctx: ProcessingContext) {
    try {
      this.logger.info('Processing domain event for notification mapping', {
        messageId: ctx.messageId,
        eventName: event.eventName,
        tenantId: event.tenantId
      });

      // Process domain event through notification service
      await this.notificationService.processDomainEvent(event, event.eventName);

    } catch (error) {
      this.logger.error('Failed to handle domain event', {
        messageId: ctx.messageId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // ============================================================================
  // Notification Processing Methods (delegated to NotificationService)
  // ============================================================================

  // ============================================================================
  // Legacy Event Handlers
  // ============================================================================

  // Event handlers
  private async handleGenericEvent(event: RealtimeEvent, ctx: ProcessingContext) {
    // Use the existing channel router to determine target channels
    const channels = this.channelRouter.routeEvent(event);
    
    if (channels.length === 0) {
      this.logger.warn('No channels found for event', { messageId: ctx.messageId, eventName: event.eventName });
      return;
    }

    // Publish to each channel
    for (const channel of channels) {
      try {
        const result = await this.centrifugoClient.publish(channel, {
          id: ctx.messageId,
          type: 'event',
          timestamp: new Date().toISOString(),
          channel,
          event: event.eventName,
          data: event.payload,
          metadata: {
            tenantId: event.tenantId,
            userId: event.createdBy,
            origin: 'jetstream',
          },
        });
        
        if (result.success) {
          this.logger.info('Event published to channel', { 
            channel, 
            messageId: ctx.messageId,
            eventName: event.eventName
          });
        } else {
          this.logger.error('Failed to publish to channel', { 
            channel, 
            messageId: ctx.messageId,
            error: result.error
          });
        }
      } catch (error) {
        this.logger.error('Failed to publish to channel', { 
          channel, 
          messageId: ctx.messageId, 
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with other channels even if one fails
      }
    }
  }

  private async handleRealtimeMessage(message: RealtimeMessage, ctx: ProcessingContext) {
    try {
      const result = await this.centrifugoClient.publish(message.channel, message);
      
      if (result.success) {
        this.logger.info('Realtime message published to channel', { 
          channel: message.channel, 
          messageId: ctx.messageId 
        });
      } else {
        this.logger.error('Failed to publish realtime message', { 
          channel: message.channel, 
          messageId: ctx.messageId, 
          error: result.error
        });
      }
    } catch (error) {
      this.logger.error('Failed to publish realtime message', { 
        channel: message.channel, 
        messageId: ctx.messageId, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async handleNotificationEvent(notification: NotificationEvent, ctx: ProcessingContext) {
    try {
      // Convert notification to RealtimeEvent format for the router
      const eventForRouter: RealtimeEvent = {
        created: notification.timestamp.toISOString(),
        eventName: 'notification',
        payload: {
          id: notification.id,
          title: notification.title,
          priority: notification.priority,
          data: notification.data,
          recipientId: notification.recipientId,
          tenantId: notification.tenantId,
        },
        tenantId: notification.tenantId,
        createdBy: notification.recipientId,
      };
      
      // Route notification through channel router
      const channels = this.channelRouter.routeEvent(eventForRouter);
      
      if (channels.length > 0) {
        // Publish to notification channels
        for (const channel of channels) {
          try {
            const result = await this.centrifugoClient.publish(channel, {
              id: ctx.messageId,
              type: 'notification',
              timestamp: new Date().toISOString(),
              channel,
              event: 'notification',
              data: {
                id: notification.id,
                title: notification.title,
                priority: notification.priority,
                data: notification.data,
              },
              metadata: {
                tenantId: notification.tenantId,
                userId: notification.recipientId,
                origin: 'jetstream',
              },
            });
            
            if (result.success) {
              this.logger.info('Notification published to channel', { 
                channel, 
                messageId: ctx.messageId,
                notificationId: notification.id
              });
            } else {
              this.logger.error('Failed to publish notification to channel', { 
                channel, 
                messageId: ctx.messageId,
                error: result.error
              });
            }
          } catch (error) {
            this.logger.error('Failed to publish notification to channel', { 
              channel, 
              messageId: ctx.messageId, 
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      } else {
        this.logger.warn('No channels found for notification', { 
          messageId: ctx.messageId,
          notificationId: notification.id
        });
      }
      
    } catch (error) {
      this.logger.error('Failed to route notification', { 
        messageId: ctx.messageId,
        notificationId: notification.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Public API
  async start(): Promise<void> {
    await this.wrapper.start();
  }

  async stop(): Promise<void> {
    await this.wrapper.stop();
    await this.notificationService.disconnect();
  }

  isRunning(): boolean {
    return this.wrapper.isRunning();
  }

  async getMetrics(): Promise<string> {
    return this.wrapper.getPrometheusMetrics();
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default RealtimeService;
