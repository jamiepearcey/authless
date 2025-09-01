import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import type {
  EmailProviderConfig,
  EmailMessage,
  EmailDeliveryResult,
} from './types.js';

import FormData from 'form-data';

// Mailgun client - we'll use the official SDK
interface MailgunMessage {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  'h:X-Mailgun-Variables'?: string;
  'h:X-Mailgun-Tag'?: string[];
  'h:Reply-To'?: string;
}

/**
 * Abstract base class for email providers
 */
export abstract class EmailProvider {
  abstract send(message: EmailMessage): Promise<EmailDeliveryResult>;
  abstract healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }>;
  abstract getProviderName(): string;
}

/**
 * SMTP Email Provider using Nodemailer
 */
export class SMTPProvider extends EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(private config: Extract<EmailProviderConfig, { type: 'smtp' }>) {
    super();
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  getProviderName(): string {
    return 'smtp';
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const startTime = Date.now();
    const eventId = this.generateEventId();

    const result: EmailDeliveryResult = {
      eventId,
      recipients: [],
      success: false,
      deliveredAt: new Date(),
      responseTime: 0,
      provider: this.getProviderName(),
    };

    try {
      console.log(`📧 Sending email via SMTP to ${message.to.length} recipients`);

      // Convert to nodemailer format
      const mailOptions = {
        from: `${message.from.name || ''} <${message.from.email}>`,
        replyTo: message.replyTo,
        to: message.to.map(recipient => 
          recipient.name 
            ? `${recipient.name} <${recipient.email}>` 
            : recipient.email
        ),
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding as any,
        })),
        headers: message.headers,
      };

      const info = await this.transporter.sendMail(mailOptions);

      result.responseTime = Date.now() - startTime;
      result.success = true;
      result.recipients = message.to.map(recipient => ({
        email: recipient.email,
        success: true,
        messageId: info.messageId,
      }));

      console.log(`✅ Email sent successfully via SMTP. Message ID: ${info.messageId}`);

    } catch (error: any) {
      result.responseTime = Date.now() - startTime;
      result.error = error.message || 'Unknown SMTP error';
      result.recipients = message.to.map(recipient => ({
        email: recipient.email,
        success: false,
        error: error.message,
      }));

      console.error(`❌ SMTP email delivery failed:`, error.message);
    }

    return result;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      await this.transporter.verify();
      
      return {
        status: 'healthy',
        details: {
          provider: 'smtp',
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure,
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          provider: 'smtp',
          error: error instanceof Error ? error.message : 'Unknown error',
          host: this.config.host,
        }
      };
    }
  }

  private generateEventId(): string {
    return `smtp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * SendGrid Email Provider
 */
export class SendGridProvider extends EmailProvider {
  constructor(private config: Extract<EmailProviderConfig, { type: 'sendgrid' }>) {
    super();
    sgMail.setApiKey(config.apiKey);
  }

  getProviderName(): string {
    return 'sendgrid';
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const startTime = Date.now();
    const eventId = this.generateEventId();

    const result: EmailDeliveryResult = {
      eventId,
      recipients: [],
      success: false,
      deliveredAt: new Date(),
      responseTime: 0,
      provider: this.getProviderName(),
    };

    try {
      console.log(`📧 Sending email via SendGrid to ${message.to.length} recipients`);

      // Convert to SendGrid format
      const sendGridMessage = {
        from: {
          email: message.from.email,
          name: message.from.name,
        },
        replyTo: message.replyTo ? {
          email: message.replyTo,
        } : undefined,
        personalizations: message.to.map(recipient => ({
          to: [{
            email: recipient.email,
            name: recipient.name,
          }],
          subject: message.subject,
          custom_args: {
            ...message.metadata,
            userId: recipient.userId,
          },
        })),
        content: message.text ? [
          {
            type: 'text/html',
            value: message.html,
          },
          {
            type: 'text/plain',
            value: message.text,
          },
        ] : [
          {
            type: 'text/html',
            value: message.html,
          },
        ],
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType,
          disposition: 'attachment',
        })),
        headers: message.headers,
        categories: message.tags,
      };

      const [response] = await sgMail.send(sendGridMessage as any);

      result.responseTime = Date.now() - startTime;
      result.success = true;
      result.recipients = message.to.map((recipient, index) => ({
        email: recipient.email,
        success: true,
        messageId: response.headers['x-message-id'] || `${eventId}_${index}`,
      }));

      console.log(`✅ Email sent successfully via SendGrid. Status: ${response.statusCode}`);

    } catch (error: any) {
      result.responseTime = Date.now() - startTime;
      result.error = error.message || 'Unknown SendGrid error';
      result.recipients = message.to.map(recipient => ({
        email: recipient.email,
        success: false,
        error: error.message,
      }));

      console.error(`❌ SendGrid email delivery failed:`, error.response?.body || error.message);
    }

    return result;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // SendGrid doesn't have a direct health check, but we can verify API key format
      if (!this.config.apiKey.startsWith('SG.')) {
        throw new Error('Invalid SendGrid API key format');
      }
      
      return {
        status: 'healthy',
        details: {
          provider: 'sendgrid',
          apiKeyValid: true,
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          provider: 'sendgrid',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      };
    }
  }

  private generateEventId(): string {
    return `sg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Mailgun Email Provider using the Mailgun API
 */
export class MailgunProvider extends EmailProvider {
  private apiKey: string;
  private domain: string;
  private baseUrl: string;

  constructor(private config: Extract<EmailProviderConfig, { type: 'mailgun' }>) {
    super();
    this.apiKey = config.apiKey;
    this.domain = config.domain;
    this.baseUrl = `https://api.mailgun.net/v3/${this.domain}`;
  }

  getProviderName(): string {
    return 'mailgun';
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    const startTime = Date.now();
    const eventId = this.generateEventId();

    const result: EmailDeliveryResult = {
      eventId,
      recipients: [],
      success: false,
      deliveredAt: new Date(),
      responseTime: 0,
      provider: this.getProviderName(),
    };

    try {
      console.log(`📧 Sending email via Mailgun to ${message.to.length} recipients`);

      // Prepare Mailgun message
      const mailgunMessage: MailgunMessage = {
        from: message.from.name 
          ? `${message.from.name} <${message.from.email}>` 
          : message.from.email,
        to: message.to.map(recipient => 
          recipient.name 
            ? `${recipient.name} <${recipient.email}>` 
            : recipient.email
        ),
        subject: message.subject,
        html: message.html,
        text: message.text,
      };

      // Add reply-to if specified
      if (message.replyTo) {
        mailgunMessage['h:Reply-To'] = message.replyTo;
      }

      // Add tags if specified
      if (message.tags && message.tags.length > 0) {
        mailgunMessage['h:X-Mailgun-Tag'] = message.tags;
      }

      // Add custom variables if metadata is present
      if (message.metadata && Object.keys(message.metadata).length > 0) {
        mailgunMessage['h:X-Mailgun-Variables'] = JSON.stringify(message.metadata);
      }

      // Convert to FormData for Mailgun API
      const formData = new FormData();
      for (const [key, value] of Object.entries(mailgunMessage)) {
        if (Array.isArray(value)) {
          value.forEach(v => formData.append(key, v));
        } else if (value !== undefined) {
          formData.append(key, value);
        }
      }

      // Make the API request to Mailgun
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
          ...formData.getHeaders(), // Include form-data headers
        },
        body: formData as any, // Type assertion for Node.js compatibility
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mailgun API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseData = await response.json();

      result.responseTime = Date.now() - startTime;
      result.success = true;
      result.recipients = message.to.map(recipient => ({
        email: recipient.email,
        success: true,
        messageId: responseData.id || `${eventId}_${recipient.email}`,
      }));

      console.log(`✅ Email sent successfully via Mailgun. Message ID: ${(responseData as any).id}`);

    } catch (error: any) {
      result.responseTime = Date.now() - startTime;
      result.error = error.message || 'Unknown Mailgun error';
      result.recipients = message.to.map(recipient => ({
        email: recipient.email,
        success: false,
        error: error.message,
      }));

      console.error(`❌ Mailgun email delivery failed:`, error.message);
    }

    return result;
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Test Mailgun API connectivity by making a simple request
      const response = await fetch(`${this.baseUrl}/events`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
        },
      });

      if (response.ok) {
        return {
          status: 'healthy',
          details: {
            provider: 'mailgun',
            domain: this.domain,
            apiKeyValid: true,
          }
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          provider: 'mailgun',
          domain: this.domain,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      };
    }
  }

  private generateEventId(): string {
    return `mg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Factory function to create email providers
 */
export function createEmailProvider(config: EmailProviderConfig): EmailProvider {
  switch (config.type) {
    case 'smtp':
      return new SMTPProvider(config);
    case 'sendgrid':
      return new SendGridProvider(config);
    case 'mailgun':
      return new MailgunProvider(config);
    default:
      throw new Error(`Unsupported email provider type: ${(config as any).type}`);
  }
}