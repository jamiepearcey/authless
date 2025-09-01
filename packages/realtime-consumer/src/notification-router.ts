import type { 
  Event, 
  NotificationEvent, 
  NotificationChannel, 
  NotificationRoutingConfig,
  NotificationPreferences,
  RealtimeMessage
} from './types.js';

/**
 * Notification router that determines which channels to send notifications to
 * and transforms events into proper notification messages
 */
export class NotificationRouter {
  private routingConfigs: Map<string, NotificationRoutingConfig[]> = new Map();

  constructor() {
    this.setupDefaultRouting();
  }

  /**
   * Setup default notification routing rules
   */
  private setupDefaultRouting(): void {
    const defaultConfigs: NotificationRoutingConfig[] = [
      // User notifications
      {
        eventType: 'user.notification',
        channels: ['user:{recipientId}'],
        priority: 'normal',
      },
      
      // Support ticket replies
      {
        eventType: 'support.ticket_reply',
        channels: ['user:{recipientId}', 'support:{ticketId}'],
        priority: 'high',
      },
      
      // Payment notifications
      {
        eventType: 'payment.completed',
        channels: ['user:{userId}', 'tenant:{tenantId}:user:{userId}'],
        priority: 'high',
      },
      {
        eventType: 'payment.failed',
        channels: ['user:{userId}', 'tenant:{tenantId}:user:{userId}'],
        priority: 'urgent',
      },
      
      // Subscription notifications
      {
        eventType: 'subscription.created',
        channels: ['user:{userId}', 'tenant:{tenantId}:user:{userId}'],
        priority: 'normal',
      },
      {
        eventType: 'subscription.cancelled',
        channels: ['user:{userId}', 'tenant:{tenantId}:user:{userId}'],
        priority: 'high',
      },
      
      // Authentication alerts
      {
        eventType: 'auth.login_alert',
        channels: ['user:{userId}'],
        priority: 'normal',
      },
      {
        eventType: 'auth.security_alert',
        channels: ['user:{userId}'],
        priority: 'urgent',
      },
      
      // Tenant-wide announcements
      {
        eventType: 'tenant.announcement',
        channels: ['tenant:{tenantId}'],
        priority: 'normal',
      },
      
      // System alerts (admin only)
      {
        eventType: 'system.alert',
        channels: ['system'],
        priority: 'urgent',
      },
    ];

    // Group by event type for efficient lookup
    for (const config of defaultConfigs) {
      const existing = this.routingConfigs.get(config.eventType) || [];
      existing.push(config);
      this.routingConfigs.set(config.eventType, existing);
    }
  }

  /**
   * Add custom routing configuration
   */
  addRoutingConfig(config: NotificationRoutingConfig): void {
    const existing = this.routingConfigs.get(config.eventType) || [];
    existing.push(config);
    this.routingConfigs.set(config.eventType, existing);
  }

  /**
   * Route an event to the appropriate notification channels
   */
  routeNotification(event: Event): {
    channels: string[];
    message: RealtimeMessage;
    priority: string;
  } | null {
    const configs = this.routingConfigs.get(event.eventName) || [];
    
    if (configs.length === 0) {
      console.log(`⚠️ No routing configuration found for event: ${event.eventName}`);
      return null;
    }

    // Use the first matching config (could be enhanced to match on conditions)
    const config = configs[0];
    
    // Extract variables from event payload
    const variables = this.extractVariables(event);
    
    // Generate concrete channels from templates
    const channels = config.channels
      .map(channelTemplate => this.resolveChannelTemplate(channelTemplate, variables))
      .filter(channel => channel !== null) as string[];

    if (channels.length === 0) {
      console.warn(`⚠️ No valid channels generated for event: ${event.eventName}`);
      return null;
    }

    // Transform event to realtime message
    const message = this.transformToRealtimeMessage(event, config);

    return {
      channels,
      message,
      priority: config.priority || 'normal',
    };
  }

  /**
   * Extract variables from event payload for channel template resolution
   */
  private extractVariables(event: Event): Record<string, string> {
    const variables: Record<string, string> = {
      tenantId: event.tenantId || '',
      createdBy: event.createdBy || '',
    };

    // Extract common variables from payload
    if (event.payload) {
      const payload = event.payload;
      
      // Common user/recipient identifiers
      if (payload.userId) variables.userId = String(payload.userId);
      if (payload.recipientId) variables.recipientId = String(payload.recipientId);
      if (payload.actorId) variables.actorId = String(payload.actorId);
      
      // Resource identifiers
      if (payload.ticketId) variables.ticketId = String(payload.ticketId);
      if (payload.paymentId) variables.paymentId = String(payload.paymentId);
      if (payload.subscriptionId) variables.subscriptionId = String(payload.subscriptionId);
      if (payload.supportCaseId) variables.supportCaseId = String(payload.supportCaseId);
      
      // Role-based routing
      if (payload.role) variables.role = String(payload.role);
      if (payload.department) variables.department = String(payload.department);
    }

    return variables;
  }

  /**
   * Resolve channel template with variables
   */
  private resolveChannelTemplate(template: string, variables: Record<string, string>): string | null {
    let resolved = template;

    // Replace all {variable} placeholders
    const placeholderRegex = /\{([^}]+)\}/g;
    const matches = template.match(placeholderRegex);

    if (matches) {
      for (const match of matches) {
        const variable = match.slice(1, -1); // Remove { and }
        const value = variables[variable];
        
        if (!value) {
          console.warn(`⚠️ Missing variable '${variable}' for channel template: ${template}`);
          return null;
        }
        
        resolved = resolved.replace(match, value);
      }
    }

    return resolved;
  }

  /**
   * Transform event to realtime message format
   */
  private transformToRealtimeMessage(event: Event, config: NotificationRoutingConfig): RealtimeMessage {
    const message: RealtimeMessage = {
      id: this.generateMessageId(event),
      type: 'notification',
      timestamp: event.created,
      channel: '', // Will be set per channel during publishing
      event: event.eventName,
      data: {
        title: this.extractTitle(event),
        body: this.extractBody(event),
        icon: this.extractIcon(event),
        url: this.extractUrl(event),
        category: this.extractCategory(event),
        priority: config.priority || 'normal',
        ...event.payload,
      },
      metadata: {
        tenantId: event.tenantId,
        userId: event.createdBy,
        origin: 'notification-service',
      },
    };

    return message;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(event: Event): string {
    const timestamp = new Date(event.created).getTime();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `notification_${event.eventName}_${timestamp}_${randomSuffix}`;
  }

  /**
   * Extract notification title from event
   */
  private extractTitle(event: Event): string {
    const payload = event.payload;

    // Check for explicit title
    if (payload.title) return String(payload.title);
    if (payload.subject) return String(payload.subject);

    // Generate title based on event type
    switch (event.eventName) {
      case 'support.ticket_reply':
        return `New reply on support ticket #${payload.ticketNumber || payload.ticketId || 'Unknown'}`;
      
      case 'payment.completed':
        return 'Payment Successful';
      
      case 'payment.failed':
        return 'Payment Failed';
      
      case 'subscription.created':
        return 'Subscription Created';
      
      case 'subscription.cancelled':
        return 'Subscription Cancelled';
      
      case 'auth.login_alert':
        return 'New Login Detected';
      
      case 'auth.security_alert':
        return 'Security Alert';
      
      case 'tenant.announcement':
        return payload.announcementTitle || 'New Announcement';
      
      case 'system.alert':
        return 'System Alert';
      
      default:
        return 'New Notification';
    }
  }

  /**
   * Extract notification body from event
   */
  private extractBody(event: Event): string | undefined {
    const payload = event.payload;

    // Check for explicit body/message
    if (payload.body) return String(payload.body);
    if (payload.message) return String(payload.message);
    if (payload.description) return String(payload.description);

    // Generate body based on event type
    switch (event.eventName) {
      case 'support.ticket_reply':
        return `A new reply has been added to your support ticket.`;
      
      case 'payment.completed':
        const amount = payload.amount ? `${payload.currency || '$'}${payload.amount}` : 'payment';
        return `Your ${amount} payment has been processed successfully.`;
      
      case 'payment.failed':
        return `Your payment could not be processed. Please check your payment method.`;
      
      case 'subscription.created':
        return `Your subscription to ${payload.planName || 'our service'} is now active.`;
      
      case 'subscription.cancelled':
        return `Your subscription has been cancelled and will not renew.`;
      
      case 'auth.login_alert':
        return `A new login was detected on your account from ${payload.location || 'unknown location'}.`;
      
      case 'auth.security_alert':
        return `Suspicious activity detected on your account. Please review your security settings.`;
      
      default:
        return undefined;
    }
  }

  /**
   * Extract notification icon from event
   */
  private extractIcon(event: Event): string | undefined {
    const payload = event.payload;

    if (payload.icon) return String(payload.icon);

    // Default icons based on event type
    const iconMap: Record<string, string> = {
      'support.ticket_reply': '💬',
      'payment.completed': '✅',
      'payment.failed': '❌',
      'subscription.created': '🎉',
      'subscription.cancelled': '⏹️',
      'auth.login_alert': '🔐',
      'auth.security_alert': '⚠️',
      'tenant.announcement': '📢',
      'system.alert': '🚨',
    };

    return iconMap[event.eventName];
  }

  /**
   * Extract notification URL from event
   */
  private extractUrl(event: Event): string | undefined {
    const payload = event.payload;

    if (payload.url) return String(payload.url);
    if (payload.link) return String(payload.link);

    // Generate URLs based on event type and available data
    switch (event.eventName) {
      case 'support.ticket_reply':
        return payload.ticketId ? `/support/tickets/${payload.ticketId}` : '/support';
      
      case 'payment.completed':
      case 'payment.failed':
        return payload.paymentId ? `/payments/${payload.paymentId}` : '/payments';
      
      case 'subscription.created':
      case 'subscription.cancelled':
        return '/subscription';
      
      case 'auth.login_alert':
      case 'auth.security_alert':
        return '/settings/security';
      
      default:
        return undefined;
    }
  }

  /**
   * Extract notification category from event
   */
  private extractCategory(event: Event): string {
    const payload = event.payload;

    if (payload.category) return String(payload.category);

    // Derive category from event name
    if (event.eventName.startsWith('support.')) return 'support';
    if (event.eventName.startsWith('payment.')) return 'payment';
    if (event.eventName.startsWith('subscription.')) return 'subscription';
    if (event.eventName.startsWith('auth.')) return 'security';
    if (event.eventName.startsWith('tenant.')) return 'announcement';
    if (event.eventName.startsWith('system.')) return 'system';

    return 'general';
  }

  /**
   * Get all routing configurations
   */
  getAllConfigs(): Record<string, NotificationRoutingConfig[]> {
    const result: Record<string, NotificationRoutingConfig[]> = {};
    for (const [eventType, configs] of this.routingConfigs.entries()) {
      result[eventType] = [...configs];
    }
    return result;
  }

  /**
   * Remove routing configuration
   */
  removeRoutingConfig(eventType: string, configId?: string): void {
    const configs = this.routingConfigs.get(eventType);
    if (!configs) return;

    if (configId) {
      const filtered = configs.filter(config => (config as any).id !== configId);
      this.routingConfigs.set(eventType, filtered);
    } else {
      this.routingConfigs.delete(eventType);
    }
  }
}