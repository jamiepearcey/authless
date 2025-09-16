import type { ProcessingContext } from '@jetstream/service-wrapper';

// ============================================================================
// Notification System Types
// ============================================================================

export interface NotificationIntent {
  id: string;
  tenantId?: string;
  type: string;
  recipients: string[] | { type: 'user' | 'role'; ids: string[] };
  payloadJson: any;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  traceId?: string;
}

export interface NotificationPreferences {
  userId: string;
  tenantId: string;
  channels: {
    web: boolean;
    email: boolean;
    mobile: boolean;
    desktop: boolean;
  };
  categories: {
    [category: string]: boolean;
  };
}

// ============================================================================
// Realtime Service Configuration
// ============================================================================

export interface RealtimeServiceConfig {
  // Service identity
  serviceName: string;
  version: string;

  // NATS configuration
  natsUrl: string;
  streamName: string;
  consumerName: string;

  // Database configuration
  databaseUrl: string;

  // Centrifugo configuration
  centrifugoUrl: string;
  centrifugoApiKey: string;

  // Channel routing configuration
  channels: ChannelConfig[];

  // Processing configuration
  concurrency?: number;
  batchSize?: number;
  ackWaitMs?: number;
  maxRetries?: number;

  // Health and metrics
  port?: number;
  metricsPort?: number;
  healthCheckIntervalMs?: number;

  // Custom event handlers
  eventHandlers?: {
    [eventType: string]: (event: any, ctx: ProcessingContext) => Promise<void>;
  };

  // Notification processing configuration
  notificationConfig?: NotificationConfig;
}

export interface ChannelConfig {
  pattern: string;
  eventTypes: string[];
  requireAuth: boolean;
}

export interface NotificationConfig {
  // Domain event to notification type mapping
  eventMappings?: {
    [eventType: string]: {
      notificationType: string;
      templateId?: string;
      conditions?: (event: any) => boolean;
    };
  };

  // Default notification preferences
  defaultPreferences?: Partial<NotificationPreferences>;

  // Template processing
  templateProcessing?: boolean;

  // Delivery retry configuration
  deliveryRetryConfig?: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

// ============================================================================
// Event Types
// ============================================================================

export interface RealtimeEvent {
  id?: string;
  eventName: string;
  created: string;
  tenantId?: string;
  createdBy?: string;
  payload: any;
  traceId?: string;
}

export interface RealtimeMessage {
  id: string;
  type: string;
  channel: string;
  timestamp: string;
  event: string;
  data: any;
  metadata?: {
    tenantId?: string;
    userId?: string;
    origin?: string;
  };
}

export interface NotificationEvent {
  id: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data: any;
  recipientId: string;
  tenantId?: string;
  timestamp: Date;
}