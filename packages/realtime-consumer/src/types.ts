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
 * Realtime channel configuration
 */
export interface ChannelConfig {
  pattern: string; // e.g., "user.{userId}" or "tenant.{tenantId}.notifications"
  eventTypes: string[]; // Which events should be sent to this channel
  requireAuth?: boolean;
  permissions?: {
    read?: string[]; // Required roles/permissions to read
    subscribe?: string[]; // Required roles/permissions to subscribe
  };
}

/**
 * Realtime message structure sent to clients
 */
export const RealtimeMessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string(),
  channel: z.string(),
  event: z.string(),
  data: z.record(z.any()),
  metadata: z.object({
    tenantId: z.string().optional(),
    userId: z.string().optional(),
    origin: z.string(),
  }),
});

export type RealtimeMessage = z.infer<typeof RealtimeMessageSchema>;

/**
 * Centrifugo client configuration
 */
export interface CentrifugoConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

/**
 * Consumer configuration
 */
export interface RealtimeConsumerConfig {
  natsUrl: string;
  streamName: string;
  consumerName: string;
  filterSubjects: string[];
  batchSize?: number;
  ackWaitMs?: number;
  maxDeliver?: number;
  concurrency?: number;
  centrifugo: CentrifugoConfig;
  channels: ChannelConfig[];
  database: {
    getUsersForChannel: (channel: string, eventName: string) => Promise<Array<{
      id: string;
      channels: string[];
    }>>;
    logRealtimeDelivery: (delivery: RealtimeDeliveryResult) => Promise<void>;
  };
}

/**
 * Realtime delivery result
 */
export interface RealtimeDeliveryResult {
  eventId: string;
  channel: string;
  eventName: string;
  success: boolean;
  subscribersCount?: number;
  error?: string;
  deliveredAt: Date;
  responseTime: number;
}

/**
 * Realtime consumer interface
 */
export interface IRealtimeConsumer {
  /**
   * Start consuming events and broadcasting to realtime channels
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

/**
 * Channel routing rules - determines which channels an event should be sent to
 */
export interface ChannelRoutingRule {
  eventPattern: string; // Regex or glob pattern for event names
  channelTemplate: string; // Template for channel name with variables like {tenantId}, {userId}
  extractVariables?: (event: Event) => Record<string, string>; // Custom variable extraction
  condition?: (event: Event) => boolean; // Additional condition to check
}

/**
 * Notification-specific event types
 */
export const NotificationEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  tenantId: z.string(),
  userId: z.string().optional(),
  recipientId: z.string(),
  title: z.string(),
  body: z.string().optional(),
  icon: z.string().optional(),
  url: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  category: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.date(),
  expiresAt: z.date().optional(),
});

export type NotificationEvent = z.infer<typeof NotificationEventSchema>;

/**
 * Notification delivery channels
 */
export type NotificationChannel = 
  | `user:${string}` // Individual user notifications
  | `tenant:${string}` // Tenant-wide notifications  
  | `tenant:${string}:role:${string}` // Role-based notifications within tenant
  | `tenant:${string}:user:${string}` // Specific user within tenant
  | `system` // System-wide notifications
  | `support:${string}`; // Support-related notifications

/**
 * Notification routing configuration
 */
export interface NotificationRoutingConfig {
  eventType: string;
  channels: NotificationChannel[];
  template?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  conditions?: {
    tenantId?: string;
    userId?: string;
    roles?: string[];
  };
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  userId: string;
  tenantId: string;
  channels: {
    web: boolean;
    email: boolean;
    mobile: boolean;
    desktop: boolean;
  };
  categories: Record<string, boolean>; // e.g., { 'payment': true, 'support': false }
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
}

/**
 * Enhanced realtime consumer stats for notifications
 */
export interface NotificationConsumerStats {
  processed: number;
  failed: number;
  retried: number;
  dlq: number;
  averageLatency: number;
  notificationsPerSecond: number;
  channelsActive: number;
  subscribersCount: number;
  lastProcessedAt?: Date;
  uptime: number;
  byChannel: Record<string, {
    delivered: number;
    failed: number;
    subscribers: number;
  }>;
  byEventType: Record<string, {
    processed: number;
    failed: number;
  }>;
}