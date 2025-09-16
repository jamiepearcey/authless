import { db } from '@db/base';
import type { PrismaClient } from '@db/base';
import { NotificationIntent, NotificationPreferences } from './abstractions';
import type { Logger } from '@jetstream/service-wrapper';
import type { NatsConnection, JetStreamClient } from 'nats';
import { centrifugoService } from '@shared/base';

export interface NotificationServiceConfig {
  // Database configuration
  databaseUrl: string;
  
  // Centrifugo configuration
  centrifugoUrl: string;
  centrifugoApiKey: string;
  
  // Notification processing configuration
  eventMappings?: {
    [eventType: string]: {
      notificationType: string;
      templateId?: string;
      conditions?: (event: any) => boolean;
    };
  };
  
  // Default notification preferences
  defaultPreferences?: Partial<NotificationPreferences>;
  
  // Template processing
  templateProcessing?: boolean;
  
  // Delivery retry configuration
  deliveryRetryConfig?: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

export class NotificationService {
  private prisma: PrismaClient;
  private config: NotificationServiceConfig;
  private logger?: Logger;
  private natsConnection?: NatsConnection;
  private jetStream?: JetStreamClient;

  constructor(config: NotificationServiceConfig, logger?: Logger, natsConnection?: NatsConnection, jetStream?: JetStreamClient) {
    this.config = config;
    this.logger = logger;
    this.natsConnection = natsConnection;
    this.jetStream = jetStream;
    this.prisma = db; // Use the shared db instance instead of creating a new one
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Initialize NATS JetStream connection (called after service starts)
   */
  setJetStreamClient(natsConnection: NatsConnection, jetStream: JetStreamClient): void {
    this.natsConnection = natsConnection;
    this.jetStream = jetStream;
    this.logger?.info('NATS JetStream client initialized for notification service');
  }

  /**
   * Process a notification intent (explicit notification request)
   */
  async processNotificationIntent(intent: NotificationIntent): Promise<void> {
    try {
      // Update intent status to processing
      await this.updateNotificationIntentStatus(intent.id, 'processing');

      // Resolve recipients
      const userIds = await this.resolveRecipients(intent.recipients, intent.tenantId);
      
      if (userIds.length === 0) {
        this.logger?.warn('No recipients found for notification intent', {
          intentId: intent.id,
          type: intent.type
        });
        await this.updateNotificationIntentStatus(intent.id, 'completed');
        return;
      }

      const notifications = [];

      // Process each recipient
      for (const userId of userIds) {
        // Get user preferences
        const preferences = await this.getUserNotificationPreferences(userId, intent.tenantId, intent.type);
        
        // Create notification record
        const notification = await this.createNotificationRecord({
          tenantId: intent.tenantId,
          userId,
          type: intent.type,
          title: this.generateNotificationTitle(intent),
          description: this.generateNotificationDescription(intent),
          dataJson: intent.payloadJson,
          templateId: this.config.eventMappings?.[intent.type]?.templateId,
          templateVariables: intent.payloadJson,
          isAlert: this.isAlertNotification(intent.type),
          emailOnly: !preferences.channels.web
        });

        notifications.push(notification);

        // Create delivery records for enabled channels
        await this.createDeliveryRecords(notification, preferences);
      }

      // Update intent status
      await this.updateNotificationIntentStatus(intent.id, 'completed');

      this.logger?.info('Notification intent processed successfully', {
        intentId: intent.id,
        notificationCount: notifications.length
      });

    } catch (error) {
      this.logger?.error('Failed to process notification intent', {
        intentId: intent.id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      await this.updateNotificationIntentStatus(intent.id, 'failed', 
        error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Process a domain event and map it to notifications
   */
  async processDomainEvent(event: any, eventType: string): Promise<void> {
    const mapping = this.config.eventMappings?.[eventType];
    if (!mapping) {
      this.logger?.debug('No notification mapping found for event type', { eventType });
      return;
    }

    // Check conditions if specified
    if (mapping.conditions && !mapping.conditions(event)) {
      this.logger?.debug('Event conditions not met for notification mapping', { eventType });
      return;
    }

    // Extract recipients from domain event
    const recipients = await this.extractRecipientsFromDomainEvent(event);
    
    if (recipients.length === 0) {
      this.logger?.warn('No recipients found for domain event', { eventType });
      return;
    }

    // Create notification intent
    const intent: NotificationIntent = {
      id: `domain-${event.id || Date.now()}`,
      tenantId: event.tenantId,
      type: mapping.notificationType,
      recipients,
      payloadJson: {
        ...event.payload,
        sourceEvent: {
          id: event.id,
          type: eventType,
          timestamp: event.created
        }
      },
      createdAt: new Date(),
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      traceId: event.traceId || undefined
    };

    await this.processNotificationIntent(intent);
  }

  /**
   * Process a direct notification creation event
   */
  async processNotificationCreated(notification: any): Promise<void> {
    try {
      // Get notification details from database
      const notificationRecord = await this.prisma.notification.findUnique({
        where: { id: notification.id },
        include: {
          recipients: {
            include: {
              user: true
            }
          }
        }
      });

      if (!notificationRecord) {
        this.logger?.warn('Notification not found in database', { notificationId: notification.id });
        return;
      }

      // Publish to Centrifugo for realtime delivery
      const success = await centrifugoService.publishNotification(notificationRecord, {
        tenantId: notificationRecord.tenantId,
        userId: notificationRecord.userId,
        role: notificationRecord.role
      });

      if (success) {
        this.logger?.info('Notification published to Centrifugo', {
          notificationId: notificationRecord.id,
          userId: notificationRecord.userId
        });
      } else {
        this.logger?.error('Failed to publish notification to Centrifugo', {
          notificationId: notificationRecord.id
        });
      }

    } catch (error) {
      this.logger?.error('Failed to process notification created event', {
        notificationId: notification.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async resolveRecipients(recipients: string[] | { type: 'user' | 'role'; ids: string[] }, tenantId?: string): Promise<string[]> {
    if (Array.isArray(recipients)) {
      // Direct user IDs
      return recipients;
    }

    if (recipients.type === 'user') {
      // User IDs
      return recipients.ids;
    }

    if (recipients.type === 'role') {
      // Role-based targeting - find users with the specified roles
      const memberships = await this.prisma.membership.findMany({
        where: {
          tenantId: tenantId || '',
          role: { in: recipients.ids },
          status: 'active'
        },
        select: { userId: true }
      });

      return memberships.map(m => m.userId);
    }

    return [];
  }

  private async getUserNotificationPreferences(userId: string, tenantId?: string, type: string = '*'): Promise<NotificationPreferences> {
    // Try to get specific preferences first
    let prefs = await this.prisma.notificationPreferences.findUnique({
      where: {
        userId_tenantId_type: {
          userId,
          tenantId: tenantId || '',
          type
        }
      }
    });

    if (!prefs) {
      // Try wildcard preferences
      prefs = await this.prisma.notificationPreferences.findUnique({
        where: {
          userId_tenantId_type: {
            userId,
            tenantId: tenantId || '',
            type: '*'
          }
        }
      });
    }

    if (!prefs) {
      // Use default preferences
      const defaults = this.config.defaultPreferences || {
        channels: {
          web: true,
          email: true,
          mobile: false,
          desktop: false
        },
        categories: {}
      };

      return {
        userId,
        tenantId: tenantId || '',
        channels: defaults.channels || {
          web: true,
          email: true,
          mobile: false,
          desktop: false
        },
        categories: defaults.categories || {}
      };
    }

    return {
      userId: prefs.userId,
      tenantId: prefs.tenantId || '',
      channels: {
        web: prefs.realtimeEnabled,
        email: prefs.emailEnabled,
        mobile: prefs.smsEnabled,
        desktop: prefs.whatsappEnabled
      },
      categories: {}
    };
  }

  private async createNotificationRecord(data: {
    tenantId?: string;
    userId: string;
    type: string;
    title: string;
    description?: string;
    dataJson?: any;
    templateId?: string;
    templateVariables?: any;
    isAlert?: boolean;
    emailOnly?: boolean;
  }) {
    return await this.prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        dataJson: data.dataJson,
        templateId: data.templateId,
        templateVariables: data.templateVariables,
        isAlert: data.isAlert || false,
        emailOnly: data.emailOnly || false
      }
    });
  }

  private async createDeliveryRecords(notification: any, preferences: NotificationPreferences) {
    const channels: string[] = [];
    
    if (preferences.channels.web) channels.push('realtime');
    if (preferences.channels.email) channels.push('email');
    if (preferences.channels.mobile) channels.push('sms');
    if (preferences.channels.desktop) channels.push('whatsapp');

    for (const channel of channels) {
      const deliveryRecord = await this.prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: channel as any,
          status: 'pending',
          tries: 0,
          maxTries: 3
        }
      });

      // Process delivery immediately for realtime
      if (channel === 'realtime') {
        await this.processRealtimeDelivery(notification, channel);
      } else {
        // For other channels, publish to JetStream for dedicated services to consume
        await this.publishDeliveryEvent(notification, deliveryRecord, channel);
      }
    }
  }

  private async processRealtimeDelivery(notification: any, channel: string) {
    try {
      // Use the existing Centrifugo service
      const success = await centrifugoService.publishNotification(notification, {
        tenantId: notification.tenantId,
        userId: notification.userId,
        role: notification.role
      });

      if (success) {
        await this.updateDeliveryStatus(notification.id, channel, 'sent');
        this.logger?.info('Realtime notification delivered', {
          notificationId: notification.id,
          channel
        });
      } else {
        await this.updateDeliveryStatus(notification.id, channel, 'failed', 'Centrifugo publish failed');
        this.logger?.error('Failed to deliver realtime notification', {
          notificationId: notification.id,
          channel
        });
      }
    } catch (error) {
      await this.updateDeliveryStatus(notification.id, channel, 'failed', 
        error instanceof Error ? error.message : String(error));
      this.logger?.error('Error delivering realtime notification', {
        notificationId: notification.id,
        channel,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async updateDeliveryStatus(notificationId: string, channel: string, status: 'pending' | 'sent' | 'failed', error?: string) {
    await this.prisma.notificationDelivery.updateMany({
      where: {
        notificationId: notificationId,
        channel: channel as any
      },
      data: {
        status: status,
        lastError: error || null,
        sentAt: status === 'sent' ? new Date() : null,
        tries: { increment: 1 }
      }
    });
  }

  private async updateNotificationIntentStatus(intentId: string, status: 'pending' | 'processing' | 'completed' | 'failed', errorMessage?: string) {
    await this.prisma.notificationIntent.update({
      where: { id: intentId },
      data: {
        status: status,
        errorMessage: errorMessage || null,
        processedAt: new Date()
      }
    });
  }

  private generateNotificationTitle(intent: NotificationIntent): string {
    // Simple title generation - can be enhanced with templates
    return `${intent.type.replace(/_/g, ' ').toUpperCase()} Notification`;
  }

  private generateNotificationDescription(intent: NotificationIntent): string {
    // Simple description generation - can be enhanced with templates
    return `You have a new ${intent.type.replace(/_/g, ' ')} notification`;
  }

  private isAlertNotification(type: string): boolean {
    // Define which notification types should be alerts
    const alertTypes = ['critical', 'urgent', 'error', 'security'];
    return alertTypes.some(alertType => type.toLowerCase().includes(alertType));
  }

  private async extractRecipientsFromDomainEvent(event: any): Promise<string[]> {
    // Extract recipients based on event type and payload
    // This is a simplified implementation - can be enhanced based on business logic
    
    const payload = event.payload as any;
    
    // Common patterns for extracting recipients
    if (payload.userId) {
      return [payload.userId];
    }
    
    if (payload.recipientIds && Array.isArray(payload.recipientIds)) {
      return payload.recipientIds;
    }
    
    if (payload.tenantId) {
      // For tenant-wide events, get all active members
      const memberships = await this.prisma.membership.findMany({
        where: {
          tenantId: payload.tenantId,
          status: 'active'
        },
        select: { userId: true }
      });
      
      return memberships.map(m => m.userId);
    }
    
    return [];
  }

  private async publishDeliveryEvent(notification: any, deliveryRecord: any, channel: string) {
    try {
      // Create a delivery event for the appropriate service to consume
      const deliveryEvent = {
        eventName: 'notification.delivery.created',
        deliveryId: deliveryRecord.id,
        notificationId: notification.id,
        channel: channel,
        tenantId: notification.tenantId,
        userId: notification.userId,
        notification: {
          id: notification.id,
          title: notification.title,
          description: notification.description,
          type: notification.type,
          priority: notification.priority || 'normal',
          templateId: notification.templateId,
          templateVariables: notification.templateVariables,
          dataJson: notification.dataJson,
          createdAt: notification.createdAt
        },
        created: new Date().toISOString(),
        payload: {
          deliveryId: deliveryRecord.id,
          notificationId: notification.id,
          channel: channel,
          maxRetries: deliveryRecord.maxTries
        }
      };

      // Publish to JetStream with channel-specific subject
      // Email service will consume delivery.email.* subjects
      // SMS service will consume delivery.sms.* subjects, etc.
      const subject = `delivery.${channel}.created`;
      
      this.logger?.info('Publishing delivery event to JetStream', {
        subject,
        deliveryId: deliveryRecord.id,
        notificationId: notification.id,
        channel
      });

      // Publish to NATS JetStream
      if (this.jetStream) {
        try {
          await this.jetStream.publish(subject, JSON.stringify(deliveryEvent));
          this.logger?.info('Successfully published delivery event to JetStream', {
            subject,
            deliveryId: deliveryRecord.id
          });
        } catch (natsError) {
          this.logger?.error('Failed to publish to NATS JetStream', {
            subject,
            deliveryId: deliveryRecord.id,
            error: natsError instanceof Error ? natsError.message : String(natsError)
          });
          throw natsError;
        }
      } else {
        this.logger?.warn('NATS JetStream not available, cannot publish delivery event', {
          subject,
          deliveryId: deliveryRecord.id
        });
        throw new Error('NATS JetStream not available');
      }
      
    } catch (error) {
      this.logger?.error('Failed to publish delivery event', {
        deliveryId: deliveryRecord.id,
        notificationId: notification.id,
        channel,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Update delivery status to failed
      await this.updateDeliveryStatus(notification.id, channel, 'failed', 
        `Failed to publish delivery event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
