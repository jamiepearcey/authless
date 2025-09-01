import { z } from 'zod';

// Configuration Types
export const AuditSinkType = z.enum(['db', 'splunk', 'webhook']);
export type AuditSinkType = z.infer<typeof AuditSinkType>;

export const AuditConsumerConfigSchema = z.object({
  natsUrl: z.string(),
  streamName: z.string().default('events'),
  consumerName: z.string().default('audit-consumer'),
  filterSubjects: z.array(z.string()).default(['audit.>', 'events.*.user_logged_in', 'events.*.user_logged_out', 'events.*.payment_completed', 'events.*.subscription_created']),
  batchSize: z.number().default(100),
  maxInflight: z.number().default(1000),
  concurrency: z.number().default(10),
  retryLimit: z.number().default(3),
  retryBackoffMs: z.number().default(1000),
  
  // Sink Configuration
  sinks: z.array(AuditSinkType).default(['db']),
  
  // Database Configuration (mandatory)
  database: z.object({
    connectionString: z.string().optional(),
  }).optional(),
  
  // Splunk HEC Configuration (optional)
  splunk: z.object({
    url: z.string(),
    token: z.string(),
    source: z.string().default('beat-the-fine'),
    sourcetype: z.string().default('audit_event'),
    index: z.string().default('main'),
    batchSize: z.number().default(10),
    flushIntervalMs: z.number().default(5000),
  }).optional(),
  
  // Tenant overrides (optional)
  tenantOverrides: z.record(z.object({
    sinks: z.array(AuditSinkType).optional(),
    splunk: z.object({
      enabled: z.boolean(),
      index: z.string().optional(),
    }).optional(),
  })).optional(),
  
  // Health and metrics
  healthCheckIntervalMs: z.number().default(30000),
  metricsEnabled: z.boolean().default(true),
  
  // Security
  redactionRules: z.array(z.object({
    field: z.string(),
    action: z.enum(['remove', 'hash', 'mask']),
  })).default([
    { field: 'password', action: 'remove' },
    { field: 'token', action: 'hash' },
    { field: 'secret', action: 'remove' },
    { field: 'apiKey', action: 'remove' },
    { field: 'email', action: 'hash' },
  ]),
});

export type AuditConsumerConfig = z.infer<typeof AuditConsumerConfigSchema>;

// Normalized Audit Record Types
export const AuditEventSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  eventName: z.string(),
  tenantId: z.string(),
  userId: z.string().optional(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  timestamp: z.date(),
  source: z.object({
    service: z.string(),
    version: z.string().optional(),
    host: z.string().optional(),
    requestId: z.string().optional(),
    correlationId: z.string().optional(),
  }),
  actor: z.object({
    type: z.enum(['user', 'system', 'service']),
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }).optional(),
  resource: z.object({
    type: z.string(),
    id: z.string(),
    name: z.string().optional(),
    attributes: z.record(z.any()).optional(),
  }).optional(),
  action: z.object({
    type: z.string(),
    description: z.string().optional(),
    outcome: z.enum(['success', 'failure', 'unknown']),
    reason: z.string().optional(),
  }),
  metadata: z.record(z.any()).optional(),
  originalPayload: z.record(z.any()),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// Sink Adapter Types
export interface AuditSinkAdapter {
  readonly name: string;
  readonly type: AuditSinkType;
  
  initialize(): Promise<void>;
  process(events: AuditEvent[]): Promise<void>;
  processOne(event: AuditEvent): Promise<void>;
  healthCheck(): Promise<{ healthy: boolean; details?: any }>;
  close(): Promise<void>;
}

// Metrics Types
export interface AuditConsumerMetrics {
  messagesTotal: Map<string, number>; // status -> count
  latencyHistogram: number[];
  sinkErrors: Map<string, number>; // sink -> error count
  dlqTotal: number;
  currentInflight: number;
  lastProcessedAt?: Date;
}

// Health Check Types
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  details: {
    nats?: { connected: boolean; lastSeen?: Date };
    database?: { connected: boolean; lastQuery?: Date };
    sinks?: Record<string, { healthy: boolean; lastSuccess?: Date }>;
    consumer?: { 
      running: boolean; 
      inflightCount: number; 
      lastMessageAt?: Date;
      errorRate?: number;
    };
  };
}

// Event Normalization Types
export interface EventNormalizer {
  canHandle(eventType: string): boolean;
  normalize(rawEvent: any): Promise<AuditEvent>;
}

// DLQ Types
export interface DLQMessage {
  originalEvent: any;
  error: string;
  attempts: number;
  lastAttemptAt: Date;
  dlqAt: Date;
  tenantId: string;
  eventType: string;
}

// Retry Configuration
export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  maxBackoffMs: number;
  jitterMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffMs: 1000,
  maxBackoffMs: 30000,
  jitterMs: 100,
};