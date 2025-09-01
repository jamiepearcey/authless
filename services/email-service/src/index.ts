import { JetStreamServiceWrapper, type Logger } from '@jetstream/service-wrapper';
import { EmailService as EmailConsumerService } from '@jetstream/email-consumer';
import { Client as PG } from 'pg';

/**
 * Email Service Configuration
 */
export interface EmailServiceConfig {
  serviceName: string;
  version: string;
  natsUrl: string;
  streamName: string;
  consumerName: string;
  databaseUrl: string;
  provider: {
    type: 'mailgun' | 'sendgrid' | 'smtp';
    apiKey?: string;
    domain?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
  };
  routingRules: Array<{
    eventPattern: string;
    templateName: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    extractVariables: (event: any) => Record<string, any>;
    condition?: (event: any) => boolean;
    tenantId?: string;
  }>;
  templates: Map<string, {
    name: string;
    component: any;
    subject: string;
    variables: string[];
  }>;
  filterSubjects: string[];
  defaultFrom: {
    email: string;
    name: string;
  };
  concurrency?: number;
  batchSize?: number;
  retryLimit?: number;
  retryBackoffMs?: number;
  port?: number;
  metricsPort?: number;
}


/**
 * Email Service Implementation
 */
export class EmailService {
  private readonly wrapper: JetStreamServiceWrapper;
  private readonly emailConsumerService: EmailConsumerService;
  private readonly database: PG;
  private readonly logger: Logger;

  constructor(private readonly config: EmailServiceConfig) {
    // Initialize database connection
    this.database = new PG({
      connectionString: config.databaseUrl,
    });

    // Create the email consumer service implementation
    this.emailConsumerService = new EmailConsumerService({
      routingRules: config.routingRules,
      templates: config.templates,
      provider: config.provider,
      database: {
        getRecipients: this.getRecipients.bind(this),
        logEmailDelivery: this.logEmailDelivery.bind(this),
      },
      defaultFrom: config.defaultFrom,
    });

    // Create the JetStream service wrapper
    this.wrapper = new JetStreamServiceWrapper(
      this.emailConsumerService,
      {
        serviceName: config.serviceName,
        metrics: { enabled: false },
        version: config.version,
        natsUrl: config.natsUrl,
        streamName: config.streamName,
        consumerName: config.consumerName,
        filterSubjects: config.filterSubjects,
        concurrency: config.concurrency || 5,
        batchSize: config.batchSize || 1,
        retryPolicy: {
          maxRetries: config.retryLimit || 3,
          baseMs: config.retryBackoffMs || 1000,
          jitterMs: 250,
        },
        healthChecks: {
          intervalMs: 10000,
          checks: [
            async () => {
              await this.database.query('SELECT 1');
            },
          ],
        },
        lightshipPort: config.port || 8080,
      }
    );

    // Get logger from wrapper
    this.logger = this.wrapper.getLogger();
  }

  /**
   * Start the email service
   */
  async start(): Promise<void> {
    try {
      // Connect to database
      await this.database.connect();
      this.logger.info('Database connected');

      // Start the wrapper
      await this.wrapper.start();
      this.logger.info('Email service started');
    } catch (error) {
      this.logger.error({ error }, 'Failed to start email service');
      throw error;
    }
  }

  /**
   * Stop the email service
   */
  async stop(): Promise<void> {
    try {
      await this.wrapper.stop();
      await this.database.end();
      this.logger.info('Email service stopped');
    } catch (error) {
      this.logger.error({ error }, 'Error stopping email service');
      throw error;
    }
  }

  /**
   * Check if the service is running
   */
  isRunning(): boolean {
    return this.wrapper.isRunning();
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<string> {
    return this.wrapper.getPrometheusMetrics();
  }

  /**
   * Get recipients for an event
   */
  private async getRecipients(_eventName: string, tenantId?: string): Promise<any[]> {
    try {
      // This is a simplified implementation - in production, you'd query your user database
      // based on event type, tenant, user preferences, etc.
      const query = `
        SELECT 
          u.email,
          u.name,
          u.id as user_id
        FROM "User" u
        WHERE u."emailNotifications" = true
        ${tenantId ? 'AND EXISTS (SELECT 1 FROM "Membership" m WHERE m."userId" = u.id AND m."tenantId" = $1)' : ''}
      `;
      
      const params = tenantId ? [tenantId] : [];
      const result = await this.database.query(query, params);
      
      return result.rows.map(row => ({
        email: row.email,
        name: row.name,
        userId: row.user_id,
      }));
    } catch (error) {
      this.logger.error({ error }, 'Error getting recipients');
      // Return a fallback recipient for testing
      return [{
        email: 'test@example.com',
        name: 'Test User',
        userId: 'test-user',
      }];
    }
  }

  /**
   * Log email delivery results
   */
  private async logEmailDelivery(result: any): Promise<void> {
    try {
      // This is a simplified implementation - in production, you'd store this in a proper table
      this.logger.info({
        timestamp: result.timestamp,
        templateName: result.templateName,
        recipientId: result.recipientId,
        success: result.success,
        error: result.error,
      }, 'Email delivery logged');
    } catch (error) {
      this.logger.error({ error }, 'Error logging email delivery');
    }
  }
}

/**
 * Email Service Factory
 */
export class EmailServiceFactory {
  static createService(config: EmailServiceConfig): EmailService {
    return new EmailService(config);
  }
}
