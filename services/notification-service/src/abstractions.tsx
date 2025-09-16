
import type { ChannelConfig } from '@jetstream/realtime-consumer';

// ============================================================================
// Notification Interfaces
// ============================================================================

export interface NotificationIntent {
    id: string;
    tenantId?: string;
    type: string;
    recipients: string[] | { type: 'user' | 'role'; ids: string[] };
    payloadJson: any;
    createdAt: Date;
    processedAt?: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    errorMessage?: string;
    retryCount: number;
    maxRetries: number;
    traceId?: string;
    idempotencyKey?: string;
    expiresAt?: Date;
  }
  
  export interface NotificationDelivery {
    id: string;
    notificationId: string;
    channel: 'realtime' | 'email' | 'sms' | 'whatsapp';
    status: 'pending' | 'sent' | 'failed';
    tries: number;
    maxTries: number;
    lastError?: string;
    sentAt?: Date;
    metadata?: any;
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
    categories: Record<string, boolean>; // e.g., { 'payment': true, 'support': false }
    quietHours?: {
      start: string; // HH:mm format
      end: string;   // HH:mm format
      timezone: string;
    };
  }
  
  export interface NotificationTemplate {
    id: string;
    type: string;
    locale: string;
    subject: string;
    html?: string;
    text?: string;
    variables: string[];
  }
  
  // ============================================================================
  // Configuration Interfaces
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
    
  // Custom routing rules
  customRoutingRules?: Array<{
    eventPattern: string;
    channelTemplate: string;
    condition?: (event: any) => boolean;
  }>;
  
  // Custom event handlers
  eventHandlers?: {
    [eventName: string]: (event: any, ctx: any) => Promise<void>;
  };
    
    // Notification processing configuration
    notificationConfig?: {
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
    };
  }
  