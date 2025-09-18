import { type PrismaClient } from '@db/base';
import { type Logger } from '@jetstream/service-wrapper';
import { type NatsConnection, type JetStreamClient } from 'nats';
import { notificationRules, type NotificationRule } from './notification-config';

/**
 * Simplified notification processor that uses purely config-driven rules
 */
export class SimpleNotificationProcessor {
  private prisma: PrismaClient;
  private logger: Logger;
  private jetStream?: JetStreamClient;

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  setJetStreamClient(natsConnection: NatsConnection, jetStream: JetStreamClient): void {
    this.jetStream = jetStream;
    this.logger.info('NATS JetStream client initialized for notification processor');
  }

  /**
   * Process any domain event using config-driven rules
   */
  async processEvent(event: any): Promise<void> {
    const eventType = event.eventType || event.eventName;
    
    this.logger.debug('Processing event', {
      eventType,
      tenantId: event.tenantId,
      hasPayload: !!event.payload,
      hasOriginalPayload: !!event.originalPayload
    });
    
    // Special handling for notification intent events (explicit notification requests)
    if (eventType === 'notification.intent.created') {
      await this.processNotificationIntent(event);
      return;
    }
    
    // Find matching rules for this event
    const matchingRules = this.findMatchingRules(eventType);
    
    if (matchingRules.length === 0) {
      this.logger.debug('No notification rules found for event', { eventType });
      return;
    }

    this.logger.info('Found matching notification rules', {
      eventType,
      rulesCount: matchingRules.length,
      rules: matchingRules.map(r => r.notificationType)
    });

    // Process each matching rule
    let successCount = 0;
    let errorCount = 0;
    
    for (const rule of matchingRules) {
      try {
        await this.processRule(event, rule);
        successCount++;
      } catch (error) {
        errorCount++;
        this.logger.error('Failed to process notification rule', {
          eventType,
          rule: rule.notificationType,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with other rules even if one fails
      }
    }

    this.logger.info('Event processing completed', {
      eventType,
      successCount,
      errorCount,
      totalRules: matchingRules.length
    });
  }

  /**
   * Process notification intent events (explicit notification requests)
   */
  private async processNotificationIntent(event: any): Promise<void> {
    const payload = event.payload;
    
    if (!payload) {
      this.logger.error('No payload in notification intent event');
      return;
    }

    this.logger.info('Processing notification intent', {
      intentId: payload.intentId,
      type: payload.type,
      tenantId: payload.tenantId,
      channels: payload.channels
    });

    try {
      // Resolve recipients using new intent-specific logic
      const recipients = await this.resolveNotificationIntentRecipients(event);
      
      if (recipients.length === 0) {
        this.logger.warn('No recipients resolved for notification intent', {
          intentId: payload.intentId,
          recipientConfig: payload.recipients
        });
        return;
      }

      // Get channels or default to web
      const channels = payload.channels || ['web'];
      
      // Create notifications for each recipient and channel
      let successCount = 0;
      let errorCount = 0;
      
      for (const userId of recipients) {
        for (const channel of channels) {
          try {
            await this.createNotificationDeliveryForIntent(event, userId, channel);
            successCount++;
          } catch (error) {
            errorCount++;
            this.logger.error('Failed to create notification delivery for intent', {
              intentId: payload.intentId,
              userId,
              channel,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }

      this.logger.info('Notification intent processed', {
        intentId: payload.intentId,
        recipientCount: recipients.length,
        channels,
        successCount,
        errorCount
      });

    } catch (error) {
      this.logger.error('Failed to process notification intent', {
        intentId: payload.intentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Find rules that match the given event type
   */
  private findMatchingRules(eventType: string): NotificationRule[] {
    return notificationRules.filter(rule => {
      // Support glob-style patterns
      if (rule.eventPattern.includes('*')) {
        const regex = new RegExp('^' + rule.eventPattern.replace(/\*/g, '.*') + '$');
        return regex.test(eventType);
      }
      return rule.eventPattern === eventType;
    });
  }

  /**
   * Process a single notification rule
   */
  private async processRule(event: any, rule: NotificationRule): Promise<void> {
    try {
      // Check conditions first
      if (!this.checkConditions(event, rule)) {
        this.logger.debug('Event conditions not met for rule', {
          eventType: event.eventType,
          rule: rule.notificationType
        });
        return;
      }

      // Resolve recipients with error handling
      let recipients: string[] = [];
      try {
        recipients = await this.resolveRecipients(event, rule);
      } catch (error) {
        this.logger.error('Failed to resolve recipients for rule', {
          eventType: event.eventType,
          rule: rule.notificationType,
          error: error instanceof Error ? error.message : String(error)
        });
        return; // Continue processing other rules
      }
      
      if (recipients.length === 0) {
        this.logger.debug('No recipients found for rule', {
          eventType: event.eventType,
          rule: rule.notificationType
        });
        return;
      }

      // Create notifications for each recipient and channel with error handling
      let successCount = 0;
      let errorCount = 0;
      
      for (const userId of recipients) {
        for (const channel of rule.channels) {
          try {
            await this.createNotificationDelivery(event, rule, userId, channel);
            successCount++;
          } catch (error) {
            errorCount++;
            this.logger.error('Failed to create notification delivery', {
              eventType: event.eventType,
              rule: rule.notificationType,
              userId,
              channel,
              error: error instanceof Error ? error.message : String(error)
            });
            // Continue with next delivery instead of failing entire rule
          }
        }
      }

      this.logger.info('Notification rule processed', {
        eventType: event.eventType,
        rule: rule.notificationType,
        recipientCount: recipients.length,
        channels: rule.channels,
        successCount,
        errorCount
      });
    } catch (error) {
      this.logger.error('Unexpected error in processRule', {
        eventType: event.eventType,
        rule: rule.notificationType,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't re-throw - log and continue with other rules
    }
  }

  /**
   * Check if event meets rule conditions
   */
  private checkConditions(event: any, rule: NotificationRule): boolean {
    if (!rule.conditions) return true;

    return rule.conditions.every(condition => {
      if (condition.custom) {
        return condition.custom(event);
      }

      if (condition.field) {
        const value = this.getValueFromPath(event.payload, condition.field);
        
        switch (condition.operator) {
          case 'equals':
            return value === condition.value;
          case 'not_equals':
            return value !== condition.value;
          case 'exists':
            return value !== undefined && value !== null;
          case 'not_exists':
            return value === undefined || value === null;
          default:
            return true;
        }
      }

      return true;
    });
  }

  /**
   * Resolve recipients based on rule strategy
   */
  private async resolveRecipients(event: any, rule: NotificationRule): Promise<string[]> {
    const { recipientStrategy } = rule;
    const originalPayload = event.originalPayload;

    switch (recipientStrategy.type) {
      case 'direct':
        return this.resolveDirectRecipients(originalPayload, recipientStrategy.fields || []);
      
      case 'role':
        return this.resolveRoleRecipients(event.tenantId, recipientStrategy.roles || []);
      
      case 'tenant':
        return this.resolveTenantRecipients(event.tenantId);
      
      case 'global':
        return this.resolveGlobalRecipients();
      
      case 'custom':
        if (recipientStrategy.resolver) {
          return await recipientStrategy.resolver(event);
        }
        return [];
      
      default:
        this.logger.warn('Unknown recipient strategy type', { 
          type: recipientStrategy.type 
        });
        return [];
    }
  }

  /**
   * Resolve recipients for notification intent events (explicit notification requests)
   */
  private async resolveNotificationIntentRecipients(event: any): Promise<string[]> {
    const recipients = event.payload?.recipients;
    
    if (!recipients) {
      this.logger.warn('No recipients specified in notification intent', { 
        intentId: event.payload?.intentId 
      });
      return [];
    }

    // Handle direct user ID array
    if (Array.isArray(recipients)) {
      return recipients;
    }

    // Handle structured recipient object
    switch (recipients.type) {
      case 'user':
        return recipients.ids || [];
      
      case 'role':
        return this.resolveRoleRecipients(event.tenantId, recipients.ids || []);
      
      case 'tenant':
        // For tenant targeting, optionally filter by roles
        if (recipients.roles && recipients.roles.length > 0) {
          return this.resolveRoleRecipients(event.tenantId, recipients.roles);
        }
        return this.resolveTenantRecipients(event.tenantId);
      
      case 'global':
        // Global notifications target all active users
        return this.resolveGlobalRecipients();
      
      default:
        this.logger.warn('Unknown recipient type in notification intent', { 
          type: recipients.type,
          intentId: event.payload?.intentId
        });
        return [];
    }
  }

  /**
   * Resolve global recipients (all active users)
   */
  private async resolveGlobalRecipients(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'active'
      },
      select: { id: true }
    });

    return users.map(u => u.id);
  }

  /**
   * Resolve direct recipients from payload fields
   */
  private resolveDirectRecipients(payload: any, fields: string[]): string[] {
    const recipients: string[] = [];
    
    for (const field of fields) {
      const value = this.getValueFromPath(payload, field);
      if (value) {
        if (Array.isArray(value)) {
          recipients.push(...value);
        } else {
          recipients.push(value);
        }
      }
    }
    
    return [...new Set(recipients)]; // Remove duplicates
  }

  /**
   * Resolve recipients by role within a tenant
   */
  private async resolveRoleRecipients(tenantId: string, roles: string[]): Promise<string[]> {
    if (!tenantId) return [];

    const memberships = await this.prisma.membership.findMany({
      where: {
        tenantId,
        role: { in: roles },
        status: 'active'
      },
      select: { userId: true }
    });

    return memberships.map(m => m.userId);
  }

  /**
   * Resolve all active members of a tenant
   */
  private async resolveTenantRecipients(tenantId: string): Promise<string[]> {
    if (!tenantId) return [];

    const memberships = await this.prisma.membership.findMany({
      where: {
        tenantId,
        status: 'active'
      },
      select: { userId: true }
    });

    return memberships.map(m => m.userId);
  }

  /**
   * Create notification delivery for notification intent (explicit notification request)
   */
  private async createNotificationDeliveryForIntent(
    event: any,
    userId: string,
    channel: string
  ): Promise<void> {
    const payload = event.payload;
    
    // Validate inputs
    if (!userId) {
      throw new Error('userId is required for notification delivery');
    }

    // Check if user exists before creating notification
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      this.logger.warn('Skipping notification for non-existent user', {
        intentId: payload.intentId,
        userId,
        tenantId: payload.tenantId
      });
      return;
    }

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: payload.tenantId || null,
        userId,
        type: payload.type,
        title: payload.payloadJson?.title || payload.type.replace(/_/g, ' ').toUpperCase(),
        description: payload.payloadJson?.description || `New ${payload.type.replace(/_/g, ' ')} notification`,
        templateId: payload.payloadJson?.templateId || null,
        templateVariables: payload.payloadJson?.templateVariables || {},
        dataJson: payload.payloadJson,
        isAlert: ['urgent', 'high'].includes(payload.payloadJson?.priority || 'normal'),
        emailOnly: channel === 'email'
      }
    });

    // Create delivery record
    const deliveryRecord = await this.prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: channel as any,
        status: 'pending',
        tries: 0,
        maxTries: 3
      }
    });

    // Handle channel-specific delivery
    if (channel === 'web') {
      // For realtime delivery, this would integrate with Centrifugo
      this.logger.debug('Realtime delivery not yet implemented', {
        notificationId: notification.id,
        userId
      });
    } else {
      // For other channels, publish delivery event to JetStream
      try {
        await this.publishDeliveryEvent(notification, deliveryRecord, channel);
      } catch (error) {
        this.logger.error('Failed to publish delivery event for intent', {
          intentId: payload.intentId,
          notificationId: notification.id,
          deliveryId: deliveryRecord.id,
          channel,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Create notification delivery for a specific user and channel
   */
  private async createNotificationDelivery(
    event: any,
    rule: NotificationRule,
    userId: string,
    channel: string
  ): Promise<void> {
    // Validate inputs
    if (!userId) {
      throw new Error('userId is required for notification delivery');
    }
    
    if (!event.tenantId) {
      this.logger.warn('No tenantId provided for notification', {
        eventType: event.eventType,
        rule: rule.notificationType,
        userId
      });
    }

    // Check if user exists before creating notification to avoid foreign key constraint violations
    let userExists = false;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });
      userExists = !!user;
    } catch (error) {
      this.logger.error('Failed to check if user exists', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    if (!userExists) {
      this.logger.warn('Skipping notification for non-existent user', {
        eventType: event.eventType,
        rule: rule.notificationType,
        userId,
        tenantId: event.tenantId
      });
      return; // Skip this delivery instead of failing entire rule processing
    }

    // Create notification record with error handling
    let notification;
    try {
      notification = await this.prisma.notification.create({
        data: {
          tenantId: event.tenantId || null, // Allow null tenantId for global notifications
          userId,
          type: rule.notificationType,
          title: this.generateTitle(rule, event),
          description: this.generateDescription(rule, event),
          templateId: rule.templateId || null, // Allow null templateId if template doesn't exist
          templateVariables: this.extractTemplateVariables(event, rule),
          dataJson: event.payload,
          isAlert: rule.priority === 'urgent' || rule.priority === 'high',
          emailOnly: channel === 'email'
        }
      });
    } catch (error) {
      this.logger.error('Failed to create notification record', {
        eventType: event.eventType,
        rule: rule.notificationType,
        userId,
        tenantId: event.tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    // Create delivery record with error handling
    let deliveryRecord;
    try {
      deliveryRecord = await this.prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: channel as any,
          status: 'pending',
          tries: 0,
          maxTries: 3
        }
      });
    } catch (error) {
      this.logger.error('Failed to create delivery record', {
        notificationId: notification.id,
        channel,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    // For realtime delivery, publish to Centrifugo
    if (channel === 'web') {
      // Handle realtime delivery (existing logic)
      // This would integrate with the existing Centrifugo service
      this.logger.debug('Realtime delivery not yet implemented', {
        notificationId: notification.id,
        userId
      });
    } else {
      // For other channels, publish delivery event to JetStream
      try {
        await this.publishDeliveryEvent(notification, deliveryRecord, channel);
      } catch (error) {
        this.logger.error('Failed to publish delivery event, but continuing', {
          notificationId: notification.id,
          deliveryId: deliveryRecord.id,
          channel,
          error: error instanceof Error ? error.message : String(error)
        });
        // Don't re-throw - delivery record is created, we can retry later
      }
    }
  }

  /**
   * Generate notification title from rule and event
   */
  private generateTitle(rule: NotificationRule, event: any): string {
    // Simple title generation - could be enhanced with templates
    return rule.notificationType.replace(/_/g, ' ').toUpperCase();
  }

  /**
   * Generate notification description from rule and event
   */
  private generateDescription(rule: NotificationRule, event: any): string {
    // Simple description generation - could be enhanced with templates
    return `New ${rule.notificationType.replace(/_/g, ' ')} notification`;
  }

  /**
   * Extract template variables based on rule configuration
   */
  private extractTemplateVariables(event: any, rule: NotificationRule): any {
    if (!rule.templateVariables) return {};

    const variables: any = {};
    
    for (const [templateVar, payloadPath] of Object.entries(rule.templateVariables)) {
      variables[templateVar] = this.getValueFromPath(event.payload, payloadPath);
    }

    return variables;
  }

  /**
   * Get value from object using dot notation path
   */
  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Publish delivery event to JetStream for email/SMS services
   */
  private async publishDeliveryEvent(
    notification: any,
    deliveryRecord: any,
    channel: string
  ): Promise<void> {
    if (!this.jetStream) {
      this.logger.warn('NATS JetStream not available, cannot publish delivery event');
      return;
    }

    const deliveryEvent = {
      eventName: 'notification.delivery.created',
      deliveryId: deliveryRecord.id,
      notificationId: notification.id,
      channel,
      tenantId: notification.tenantId,
      userId: notification.userId,
      notification: {
        id: notification.id,
        title: notification.title,
        description: notification.description,
        type: notification.type,
        priority: 'normal',
        templateId: notification.templateId,
        templateVariables: notification.templateVariables,
        dataJson: notification.dataJson,
        createdAt: notification.createdAt
      },
      created: new Date().toISOString(),
      payload: {
        deliveryId: deliveryRecord.id,
        notificationId: notification.id,
        channel,
        maxRetries: 3
      }
    };

    const subject = `delivery.${channel}.created`;
    
    try {
      await this.jetStream.publish(subject, JSON.stringify(deliveryEvent));
      
      this.logger.info('Published delivery event to JetStream', {
        subject,
        deliveryId: deliveryRecord.id,
        notificationId: notification.id,
        channel
      });
    } catch (error) {
      this.logger.error('Failed to publish delivery event', {
        subject,
        deliveryId: deliveryRecord.id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Update delivery status to failed
      await this.prisma.notificationDelivery.update({
        where: { id: deliveryRecord.id },
        data: {
          status: 'failed',
          lastError: `Failed to publish: ${error instanceof Error ? error.message : String(error)}`
        }
      });
    }
  }
}