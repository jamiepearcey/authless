import { describe, it, expect } from 'vitest';

describe('Package Exports', () => {
  it('should export main classes and functions', async () => {
    const exports = await import('../../src/index');
    
    // Main consumer class and factory functions
    expect(exports.AuditConsumer).toBeDefined();
    expect(exports.createAuditConsumer).toBeDefined();
    expect(exports.startAuditConsumer).toBeDefined();
    expect(exports.stopAuditConsumer).toBeDefined();
    
    // Configuration
    expect(exports.AuditConfigLoader).toBeDefined();
    expect(exports.TenantConfigResolver).toBeDefined();
    expect(exports.ConfigSecurity).toBeDefined();
    
    // Sinks
    expect(exports.SinkFactory).toBeDefined();
    expect(exports.SinkRegistry).toBeDefined();
    expect(exports.DatabaseSink).toBeDefined();
    expect(exports.SplunkSink).toBeDefined();
    
    // Metrics
    expect(exports.MetricsCollector).toBeDefined();
    expect(exports.HealthCheckManager).toBeDefined();
    expect(exports.PrometheusMetricsExporter).toBeDefined();
    
    // Utilities
    expect(exports.DataRedactor).toBeDefined();
    expect(exports.PIIDetector).toBeDefined();
    expect(exports.DEFAULT_REDACTION_RULES).toBeDefined();
  });

  it('should export types', async () => {
    const { AuditConsumerConfigSchema } = await import('../../src/types');
    expect(AuditConsumerConfigSchema).toBeDefined();
  });

  it('should create audit consumer with minimal config', () => {
    const { createAuditConsumer } = require('../../src/index');
    
    expect(() => {
      createAuditConsumer({
        natsUrl: 'nats://localhost:4223',
        streamName: 'test-stream',
        consumerName: 'test-consumer',
        sinks: ['db'],
        database: {
          connectionString: 'postgresql://test:test@localhost:5432/test'
        }
      });
    }).not.toThrow();
  });
});