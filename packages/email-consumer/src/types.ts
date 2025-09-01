import { z } from 'zod';

// React types for email templates
type ReactComponentType<P = any> = (props: P) => any;

/**
 * Base event structure that comes from JetStream
 */
export const EventSchema = z.object({
  tenantId: z.string().optional(),
  created: z.string(), // ISO date string from JetStream
  createdBy: z.string().optional(),
  eventName: z.string(),
  payload: z.record(z.any()),
});

export type Event = z.infer<typeof EventSchema>;

/**
 * Email routing rule configuration
 */
export interface EmailRoutingRule {
  eventPattern: string; // e.g., "user.*" or "notification.*"
  templateName: string; // Name of the React Email template to use
  extractVariables: (event: Event) => Record<string, string>; // Extract variables for template
  condition?: (event: Event) => boolean; // Optional condition for routing
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tenantId?: string; // Optional tenant-specific routing
}

/**
 * React Email template configuration
 */
export interface ReactEmailTemplate {
  name: string;
  component: ReactComponentType<any>; // React component for the template
  subject: string | ((variables: Record<string, any>) => string);
  variables: string[]; // Required variables for the template
  metadata?: {
    category?: string;
    description?: string;
    previewText?: string;
  };
}

/**
 * Email template configuration (legacy support)
 */
export const EmailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  eventTypes: z.array(z.string()),
  subject: z.string(),
  htmlTemplate: z.string(),
  textTemplate: z.string().optional(),
  variables: z.array(z.string()).optional(),
  tenantId: z.string().optional(),
  language: z.string().default('en'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

/**
 * Email recipient information
 */
export const EmailRecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  userId: z.string().optional(),
  variables: z.record(z.any()).optional(),
  preferences: z.object({
    enabled: z.boolean().default(true),
    frequency: z.enum(['instant', 'daily', 'weekly']).default('instant'),
    categories: z.array(z.string()).default([]),
  }).optional(),
});

export type EmailRecipient = z.infer<typeof EmailRecipientSchema>;

/**
 * Email message structure
 */
export const EmailMessageSchema = z.object({
  to: z.array(EmailRecipientSchema),
  from: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  replyTo: z.string().email().optional(),
  subject: z.string(),
  html: z.string(),
  text: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string(),
    encoding: z.string().default('base64'),
  })).optional(),
  headers: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type EmailMessage = z.infer<typeof EmailMessageSchema>;

/**
 * Email provider configuration
 */
export type EmailProviderConfig = 
  | {
      type: 'smtp';
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    }
  | {
      type: 'sendgrid';
      apiKey: string;
    }
  | {
      type: 'ses';
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
    }
  | {
      type: 'mailgun';
      apiKey: string;
      domain: string;
    }
  | {
    type: 'jetstream';
    apiKey: string;
    domain: string;
  }

/**
 * Email delivery result
 */
export interface EmailDeliveryResult {
  eventId: string;
  templateName?: string;
  recipients: Array<{
    email: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
  success: boolean;
  error?: string;
  deliveredAt: Date;
  responseTime: number;
  provider: string;
}

/**
 * Consumer configuration
 */
export interface EmailConsumerConfig {
  natsUrl: string;
  streamName: string;
  consumerName: string;
  filterSubjects: string[];
  batchSize?: number;
  ackWaitMs?: number;
  maxDeliver?: number;
  concurrency?: number;
  provider: EmailProviderConfig;
  defaultFrom: {
    email: string;
    name?: string;
  };
  // Routing rules for email templates
  routingRules: EmailRoutingRule[];
  // React Email template registry
  templates: Map<string, ReactEmailTemplate>;
  database: {
    getRecipients: (eventName: string, tenantId?: string, event?: Event) => Promise<EmailRecipient[]>;
    logEmailDelivery: (result: EmailDeliveryResult) => Promise<void>;
  };
  rateLimiting?: {
    maxEmailsPerSecond?: number;
    maxEmailsPerHour?: number;
  };
}

/**
 * Email consumer interface
 */
export interface IEmailConsumer {
  /**
   * Start consuming events and sending emails
   */
  start(): Promise<void>;

  /**
   * Stop the consumer gracefully
   */
  stop(): Promise<void>;

  /**
   * Health check for the consumer
   */
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }>;
}