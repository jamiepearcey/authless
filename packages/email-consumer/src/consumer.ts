import { type JetStreamService, type ProcessingContext } from '@jetstream/service-wrapper';
import { type Event, type EmailDeliveryResult } from './types.js';
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
  private readonly emailProvider: EmailProvider;
  private readonly database: any;

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
   * Process incoming email events
   */
  async processMessage(event: Event, ctx: ProcessingContext): Promise<void> {
    try {
      // Route the event to determine which template to use
      const routingResult = this.emailRouter.routeEvent(event);
      if (!routingResult) {
        console.log(`📧 No routing rule found for event: ${event.eventName}`);
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

      console.log(`📧 Processed email event: ${event.eventName} for ${recipients.length} recipients`);
    } catch (error) {
      console.error(`❌ Error processing email event: ${event.eventName}`, error);
      throw error;
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