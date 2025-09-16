import { type JetStreamService, type ProcessingContext } from '@jetstream/service-wrapper';
import { type Event, type EmailDeliveryResult, EventSchema } from './types.js';
import { EmailRouter } from './email-router';
import { ReactEmailRenderer } from './react-email-renderer';
import { createEmailProvider, type EmailProvider } from './email-providers';

/**
 * Email Service Implementation
 * 
 * This service processes email events from NATS streams and sends templated emails
 * to recipients using React Email templates and various email providers.
 */
export class EmailService implements JetStreamService {
  private readonly emailRouter: EmailRouter;
  private readonly templateRenderer: ReactEmailRenderer;
  private emailProvider: EmailProvider;
  private readonly database: any;
  private lastConfigCheck = 0;
  private configCacheTtlMs = 60000; // 1 minute cache
  private currentConfigHash: string | null = null;

  constructor(
    private readonly config: {
      routingRules: any[];
      templates: Map<string, any>;
      provider: any;
      database: any;
      defaultFrom: any;
    }
  ) {
    this.emailProvider = createEmailProvider(config.provider);
    this.emailRouter = new EmailRouter(config.routingRules, config.templates);
    this.templateRenderer = new ReactEmailRenderer();
    this.database = config.database;
  }

  /**
   * Initialize or refresh email provider configuration from database with smart caching
   */
  private async initializeEmailProvider(): Promise<void> {
    const now = Date.now();
    
    // Check if we need to refresh the config (cache expired)
    if (now - this.lastConfigCheck < this.configCacheTtlMs) {
      return; // Cache is still valid, no need to check
    }

    try {
      if (this.database.getEmailProviderConfig) {
        const providerConfig = await this.database.getEmailProviderConfig();
        if (providerConfig) {
          // Create a hash of the config to detect changes
          const configHash = this.hashConfig(providerConfig);
          
          // Only reinitialize if config actually changed
          if (configHash !== this.currentConfigHash) {
            console.log(`📧 Email provider config changed, reinitializing: ${providerConfig.type}`);
            this.emailProvider = createEmailProvider(providerConfig);
            this.currentConfigHash = configHash;
          }
        }
      }
      
      this.lastConfigCheck = now;
    } catch (error) {
      console.warn(`📧 Failed to load email provider config from database, using current provider:`, error);
      this.lastConfigCheck = now; // Still update check time to prevent constant retries
    }
  }

  /**
   * Create a simple hash of the config to detect changes
   */
  private hashConfig(config: any): string {
    try {
      // Create a stable hash by stringifying relevant config properties
      const hashableConfig = {
        type: config.type,
        apiKey: config.apiKey ? 'set' : 'unset', // Don't include actual key in hash
        domain: config.domain,
        host: config.host,
        port: config.port,
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        replyToEmail: config.replyToEmail,
      };
      return Buffer.from(JSON.stringify(hashableConfig)).toString('base64');
    } catch {
      return Math.random().toString(); // Fallback to force refresh on error
    }
  }

  /**
   * Force refresh of email provider configuration (useful for external triggers)
   */
  public async refreshEmailProvider(): Promise<void> {
    this.lastConfigCheck = 0; // Reset cache
    await this.initializeEmailProvider();
  }

  /**
   * Process incoming email events (handles both delivery events and legacy events)
   */
  async processMessage(eventData: unknown, ctx: ProcessingContext): Promise<void> {
    try {
      // Initialize/refresh email provider configuration (with smart caching)
      await this.initializeEmailProvider();
      
      // Parse and validate the incoming message using the new schema
      const event = EventSchema.parse(eventData);
      
      // Determine if this is a delivery event or legacy event
      if ('deliveryId' in event) {
        // This is a delivery event from notification service
        await this.processDeliveryEvent(event, ctx);
      } else {
        // This is a legacy event (backward compatibility)
        await this.processLegacyEvent(event, ctx);
      }

      console.log(`📧 Processed email event: ${event.eventName}`);
    } catch (error) {
      console.error(`❌ Error processing email event:`, error);
      throw error;
    }
  }

  /**
   * Process delivery events from notification service
   */
  private async processDeliveryEvent(event: any, ctx: ProcessingContext): Promise<void> {
    let recipient;
    
    // Check if this is an external recipient (invitation emails)
    if (event.externalRecipient) {
      recipient = {
        userId: null,
        email: event.externalRecipient.email,
        name: event.externalRecipient.name || event.externalRecipient.email.split('@')[0],
      };
      console.log(`📧 Processing external recipient: ${recipient.email}`);
    } else if (event.userId) {
      // For delivery events, the recipient is already known from the notification
      recipient = {
        userId: event.userId,
        email: await this.getUserEmail(event.userId),
        name: await this.getUserName(event.userId),
      };

      if (!recipient.email) {
        console.warn(`📧 No email found for user: ${event.userId}`);
        return;
      }
    } else {
      console.warn(`📧 No recipient information found in delivery event`);
      return;
    }

    // Route the event to determine which template to use
    const routingResult = this.emailRouter.routeEvent(event);
    if (!routingResult) {
      console.log(`📧 No routing rule found for delivery event: ${event.eventName}`);
      return;
    }

    // Process the email
    await this.processEmailForRecipient(event, routingResult, recipient, ctx);
  }

  /**
   * Process legacy events (backward compatibility)
   */
  private async processLegacyEvent(event: any, ctx: ProcessingContext): Promise<void> {
    // Normalize timestamp if it's a string (handle malformed timestamps)
    if ('timestamp' in event && typeof event.timestamp === 'string') {
      let timestampStr = event.timestamp;
      
      // Fix common malformed timestamp patterns
      if (timestampStr.includes('NZ') && !timestampStr.endsWith('Z')) {
        timestampStr = timestampStr.replace(/(\d)NZ$/, '$1000Z');
      }
      
      const normalized = new Date(timestampStr);
      if (isNaN(normalized.getTime())) {
        console.warn(`📧 Invalid timestamp format: ${event.timestamp}, using current time`);
        event.timestamp = new Date();
      } else {
        event.timestamp = normalized;
      }
    }

    // Route the event to determine which template to use
    const routingResult = this.emailRouter.routeEvent(event);
    if (!routingResult) {
      console.log(`📧 No routing rule found for legacy event: ${event.eventName}`);
      return;
    }

    // Get recipients for this event
    const recipients = await this.database.getRecipients(
      event.eventName,
      event.tenantId
    );

    if (recipients.length === 0) {
      console.log(`📧 No recipients found for event: ${event.eventName}`);
      return;
    }

    // Process email for each recipient
    for (const recipient of recipients) {
      await this.processEmailForRecipient(event, routingResult, recipient, ctx);
    }
  }

  /**
   * Get user email by user ID
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      if (this.database.getUserEmail) {
        return await this.database.getUserEmail(userId);
      }
      // Fallback: look in database directly
      const result = await this.database.query?.(`
        SELECT email FROM "User" WHERE id = $1
      `, [userId]);
      return result?.rows?.[0]?.email || null;
    } catch (error) {
      console.warn(`📧 Failed to get email for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get user name by user ID
   */
  private async getUserName(userId: string): Promise<string | null> {
    try {
      if (this.database.getUserName) {
        return await this.database.getUserName(userId);
      }
      // Fallback: look in database directly
      const result = await this.database.query?.(`
        SELECT name FROM "User" WHERE id = $1
      `, [userId]);
      return result?.rows?.[0]?.name || null;
    } catch (error) {
      console.warn(`📧 Failed to get name for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Process email for a specific recipient
   */
  private async processEmailForRecipient(
    event: Event,
    routingResult: any,
    recipient: any,
    ctx: ProcessingContext
  ): Promise<void> {
    try {
      // Extract variables for template
      const variables = routingResult.extractVariables?.(event) || {};
      
      // Render the email template
      const emailContent = await this.templateRenderer.renderTemplate(
        routingResult.templateName,
        variables
      );

      // Send the email
      const deliveryResult = await this.emailProvider.send({
        to: recipient.email,
        from: this.config.defaultFrom.email,
        subject: this.renderSubject(routingResult.subject, variables),
        html: emailContent.html,
        text: emailContent.text,
        metadata: {
          eventId: ctx.messageId,
          eventName: event.eventName,
          tenantId: event.tenantId,
          recipientId: recipient.userId,
          templateName: routingResult.templateName,
        },
      });

      // Log the delivery result
      await this.database.logEmailDelivery({
        ...deliveryResult,
        eventId: ctx.messageId,
        recipientId: recipient.userId,
        templateName: routingResult.templateName,
        timestamp: new Date(),
      });

      console.log(`📧 Email sent to ${recipient.email}: ${deliveryResult.success ? 'success' : 'failed'}`);
    } catch (error) {
      console.error(`❌ Error sending email to ${recipient.email}:`, error);
      
      // Log the failure
      await this.database.logEmailDelivery({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        eventId: ctx.messageId,
        recipientId: recipient.userId,
        templateName: routingResult.templateName,
        timestamp: new Date(),
      });
      
      throw error;
    }
  }

  /**
   * Render subject line with variables
   */
  private renderSubject(subject: string, variables: Record<string, any>): string {
    let renderedSubject = subject;
    for (const [key, value] of Object.entries(variables)) {
      renderedSubject = renderedSubject.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return renderedSubject;
  }

  /**
   * Health check for the email service
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const providerHealth = await this.emailProvider.healthCheck();
      return {
        healthy: providerHealth.status === 'healthy',
        details: {
          provider: providerHealth,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        },
      };
    }
  }
}