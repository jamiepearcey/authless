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
    
    // Find matching rules for this event
    const matchingRules = this.findMatchingRules(eventType);
    
    if (matchingRules.length === 0) {
      this.logger.debug('No notification rules found for event', { eventType });
      return;
    }

    // Process each matching rule
    for (const rule of matchingRules) {
      try {
        await this.processRule(event, rule);
      } catch (error) {
        this.logger.error('Failed to process notification rule', {
          eventType,
          rule: rule.notificationType,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with other rules even if one fails
      }
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
    // Check conditions first
    if (!this.checkConditions(event, rule)) {
      this.logger.debug('Event conditions not met for rule', {
        eventType: event.eventType,
        rule: rule.notificationType
      });
      return;
    }

    // Resolve recipients
    const recipients = await this.resolveRecipients(event, rule);
    
    if (recipients.length === 0) {
      this.logger.debug('No recipients found for rule', {
        eventType: event.eventType,
        rule: rule.notificationType
      });
      return;
    }

    // Create notifications for each recipient and channel
    for (const userId of recipients) {
      for (const channel of rule.channels) {
        await this.createNotificationDelivery(event, rule, userId, channel);
      }
    }

    this.logger.info('Notification rule processed successfully', {
      eventType: event.eventType,
      rule: rule.notificationType,
      recipientCount: recipients.length,
      channels: rule.channels
    });
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
   * Create notification delivery for a specific user and channel
   */
  private async createNotificationDelivery(
    event: any,
    rule: NotificationRule,
    userId: string,
    channel: string
  ): Promise<void> {
    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        tenantId: event.tenantId,
        userId,
        type: rule.notificationType,
        title: this.generateTitle(rule, event),
        description: this.generateDescription(rule, event),
        templateId: rule.templateId,
        templateVariables: this.extractTemplateVariables(event, rule),
        dataJson: event.payload,
        isAlert: rule.priority === 'urgent' || rule.priority === 'high',
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

    // For realtime delivery, publish to Centrifugo
    if (channel === 'web') {
      // Handle realtime delivery (existing logic)
      // This would integrate with the existing Centrifugo service
    } else {
      // For other channels, publish delivery event to JetStream
      await this.publishDeliveryEvent(notification, deliveryRecord, channel);
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