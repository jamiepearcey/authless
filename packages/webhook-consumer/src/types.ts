import { z } from 'zod';

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
 * Webhook endpoint configuration
 */
export const WebhookEndpointSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.string()),
  tenantId: z.string().optional(),
  isActive: z.boolean().default(true),
  maxRetries: z.number().default(3),
  timeout: z.number().default(30000),
  headers: z.record(z.string()).optional(),
});

export type WebhookEndpoint = z.infer<typeof WebhookEndpointSchema>;

/**
 * Webhook payload sent to endpoints
 */
export const WebhookPayloadSchema = z.object({
  id: z.string(),
  event: z.string(),
  created: z.string(),
  data: EventSchema,
  webhook: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  webhookId: string;
  eventId: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
  retryCount: number;
  deliveredAt: Date;
}

/**
 * Consumer configuration
 */
export interface WebhookConsumerConfig {
  database: {
    getWebhookEndpoints: (eventName?: string, tenantId?: string) => Promise<WebhookEndpoint[]>;
    logDelivery: (result: WebhookDeliveryResult) => Promise<void>;
  };
}

/**
 * Webhook consumer interface
 */
export interface IWebhookConsumer {
  /**
   * Start consuming events and processing webhooks
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