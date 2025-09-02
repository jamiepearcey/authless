import { AuditConsumerConfigSchema, type AuditConsumerConfig, AuditSinkType } from './types';
import { z } from 'zod';

// Environment variable configuration schema
const EnvConfigSchema = z.object({
  // NATS Configuration
  NATS_URL: z.string().default('nats://localhost:4222'),
  AUDIT_STREAM_NAME: z.string().default('events'),
  AUDIT_CONSUMER_NAME: z.string().default('audit-consumer'),
  AUDIT_FILTER_SUBJECTS: z.string().optional(),
  
  // Processing Configuration
  AUDIT_BATCH_SIZE: z.string().transform(Number).default('100'),
  AUDIT_MAX_INFLIGHT: z.string().transform(Number).default('1000'),
  AUDIT_CONCURRENCY: z.string().transform(Number).default('10'),
  AUDIT_RETRY_LIMIT: z.string().transform(Number).default('3'),
  AUDIT_RETRY_BACKOFF_MS: z.string().transform(Number).default('1000'),
  
  // Sink Configuration
  AUDIT_SINKS: z.string().default('db'),
  
  // Database Configuration
  DATABASE_URL: z.string().optional(),
  
  // Splunk HEC Configuration
  SPLUNK_HEC_URL: z.string().optional(),
  SPLUNK_HEC_TOKEN: z.string().optional(),
  SPLUNK_SOURCE: z.string().default('authless'),
  SPLUNK_SOURCETYPE: z.string().default('audit_event'),
  SPLUNK_INDEX: z.string().default('main'),
  SPLUNK_BATCH_SIZE: z.string().transform(Number).default('10'),
  SPLUNK_FLUSH_INTERVAL_MS: z.string().transform(Number).default('5000'),
  
  // Health and Monitoring
  AUDIT_HEALTH_CHECK_INTERVAL_MS: z.string().transform(Number).default('30000'),
  AUDIT_METRICS_ENABLED: z.string().transform(Boolean).default('true'),
  
  // Application
  APP_VERSION: z.string().optional(),
  HOSTNAME: z.string().optional(),
});

export class AuditConfigLoader {
  static fromEnvironment(): AuditConsumerConfig {
    const env = EnvConfigSchema.parse(process.env);
    
    // Parse sinks from comma-separated string
    const sinks = env.AUDIT_SINKS.split(',').map((s: string) => s.trim()) as AuditSinkType[];
    
    // Parse filter subjects from comma-separated string
    const filterSubjects = env.AUDIT_FILTER_SUBJECTS 
      ? env.AUDIT_FILTER_SUBJECTS.split(',').map((s: string) => s.trim())
      : undefined;
    
    const config: AuditConsumerConfig = {
      natsUrl: env.NATS_URL,
      streamName: env.AUDIT_STREAM_NAME,
      consumerName: env.AUDIT_CONSUMER_NAME,
      filterSubjects: filterSubjects || [
        'audit.>',
        'events.*.user_logged_in',
        'events.*.user_logged_out',
        'events.*.user_registered',
        'events.*.payment_completed',
        'events.*.payment_failed',
        'events.*.subscription_created',
        'events.*.subscription_cancelled',
        'events.*.support_ticket_created',
      ],
      batchSize: env.AUDIT_BATCH_SIZE,
      maxInflight: env.AUDIT_MAX_INFLIGHT,
      concurrency: env.AUDIT_CONCURRENCY,
      retryLimit: env.AUDIT_RETRY_LIMIT,
      retryBackoffMs: env.AUDIT_RETRY_BACKOFF_MS,
      
      sinks: sinks,
      
      database: env.DATABASE_URL ? {
        connectionString: env.DATABASE_URL,
      } : undefined,
      
      splunk: (sinks.includes('splunk') && env.SPLUNK_HEC_URL && env.SPLUNK_HEC_TOKEN) ? {
        url: env.SPLUNK_HEC_URL,
        token: env.SPLUNK_HEC_TOKEN,
        source: env.SPLUNK_SOURCE,
        sourcetype: env.SPLUNK_SOURCETYPE,
        index: env.SPLUNK_INDEX,
        batchSize: env.SPLUNK_BATCH_SIZE,
        flushIntervalMs: env.SPLUNK_FLUSH_INTERVAL_MS,
      } : undefined,
      
      healthCheckIntervalMs: env.AUDIT_HEALTH_CHECK_INTERVAL_MS,
      metricsEnabled: env.AUDIT_METRICS_ENABLED,
      redactionRules: [],
    };
    
    return AuditConsumerConfigSchema.parse(config);
  }

  static fromConfig(config: Partial<AuditConsumerConfig>): AuditConsumerConfig {
    const envConfig = this.fromEnvironment();
    const mergedConfig = { ...envConfig, ...config };
    return AuditConsumerConfigSchema.parse(mergedConfig);
  }

  static validateConfig(config: any): AuditConsumerConfig {
    return AuditConsumerConfigSchema.parse(config);
  }
}

// Tenant Configuration Resolver
export class TenantConfigResolver {
  private baseConfig: AuditConsumerConfig;
  
  constructor(baseConfig: AuditConsumerConfig) {
    this.baseConfig = baseConfig;
  }

  resolve(tenantId: string): AuditConsumerConfig {
    const tenantOverrides = this.baseConfig.tenantOverrides?.[tenantId];
    
    if (!tenantOverrides) {
      return this.baseConfig;
    }

    // Create tenant-specific configuration
    const tenantConfig = { ...this.baseConfig };
    
    if (tenantOverrides.sinks) {
      tenantConfig.sinks = tenantOverrides.sinks;
    }
    
    if (tenantOverrides.splunk) {
      if (tenantConfig.splunk) {
        tenantConfig.splunk = {
          ...tenantConfig.splunk,
          ...tenantOverrides.splunk,
        };
      }
    }
    
    return tenantConfig;
  }

  getAllTenantIds(): string[] {
    return Object.keys(this.baseConfig.tenantOverrides || {});
  }
}

// Security utilities for configuration
export class ConfigSecurity {
  private static sensitiveFields = ['token', 'password', 'secret', 'key'];
  
  static redactSensitiveFields(config: any): any {
    if (typeof config !== 'object' || config === null) {
      return config;
    }
    
    const redacted = { ...config };
    
    for (const [key, value] of Object.entries(redacted)) {
      if (this.isSensitiveField(key)) {
        redacted[key] = this.redactValue(value);
      } else if (typeof value === 'object') {
        redacted[key] = this.redactSensitiveFields(value);
      }
    }
    
    return redacted;
  }
  
  private static isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return this.sensitiveFields.some(sensitive => lowerField.includes(sensitive));
  }
  
  private static redactValue(value: any): string {
    if (typeof value !== 'string') {
      return '[REDACTED]';
    }
    
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }
    
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }
}