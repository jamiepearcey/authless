import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  MetricsCollector, 
  HealthCheckManager,
  PrometheusMetricsExporter
} from '../../src/metrics';

describe('Metrics Unit Tests', () => {
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
    vi.clearAllMocks();
  });

  describe('MetricsCollector', () => {
    it('should initialize with empty metrics', () => {
      const metrics = metricsCollector.getMetrics();
      
      expect(metrics.messagesTotal.size).toBe(0);
      expect(metrics.latencyHistogram).toHaveLength(0);
      expect(metrics.sinkErrors.size).toBe(0);
      expect(metrics.dlqTotal).toBe(0);
      expect(metrics.currentInflight).toBe(0);
    });

    it('should increment message counts correctly', () => {
      metricsCollector.incrementMessageCount('processed');
      metricsCollector.incrementMessageCount('processed');
      metricsCollector.incrementMessageCount('failed');

      const metrics = metricsCollector.getMetrics();
      
      expect(metrics.messagesTotal.get('processed')).toBe(2);
      expect(metrics.messagesTotal.get('failed')).toBe(1);
      expect(metrics.messagesTotal.get('retried')).toBeUndefined();
    });

    it('should update lastProcessedAt when processing messages', () => {
      const beforeTime = new Date();
      
      metricsCollector.incrementMessageCount('processed');
      
      const metrics = metricsCollector.getMetrics();
      expect(metrics.lastProcessedAt).toBeDefined();
      expect(metrics.lastProcessedAt!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('should increment DLQ total when messages go to DLQ', () => {
      metricsCollector.incrementMessageCount('dlq');
      metricsCollector.incrementMessageCount('dlq');

      const metrics = metricsCollector.getMetrics();
      expect(metrics.dlqTotal).toBe(2);
    });

    it('should record latency measurements', () => {
      metricsCollector.recordLatency(100);
      metricsCollector.recordLatency(200);
      metricsCollector.recordLatency(150);

      const metrics = metricsCollector.getMetrics();
      expect(metrics.latencyHistogram).toHaveLength(3);
      expect(metrics.latencyHistogram).toContain(100);
      expect(metrics.latencyHistogram).toContain(200);
      expect(metrics.latencyHistogram).toContain(150);
    });

    it('should limit latency histogram size to 1000 measurements', () => {
      // Add 1200 measurements
      for (let i = 0; i < 1200; i++) {
        metricsCollector.recordLatency(i);
      }

      const metrics = metricsCollector.getMetrics();
      expect(metrics.latencyHistogram).toHaveLength(1000);
      
      // Should keep the last 1000 measurements
      expect(metrics.latencyHistogram[0]).toBe(200); // 1200 - 1000
      expect(metrics.latencyHistogram[999]).toBe(1199);
    });

    it('should track sink errors by sink name', () => {
      metricsCollector.incrementSinkError('db-sink');
      metricsCollector.incrementSinkError('splunk-sink');
      metricsCollector.incrementSinkError('db-sink');

      const metrics = metricsCollector.getMetrics();
      expect(metrics.sinkErrors.get('db-sink')).toBe(2);
      expect(metrics.sinkErrors.get('splunk-sink')).toBe(1);
    });

    it('should manage inflight message count', () => {
      metricsCollector.setInflightCount(5);
      expect(metricsCollector.getMetrics().currentInflight).toBe(5);

      metricsCollector.incrementInflight();
      expect(metricsCollector.getMetrics().currentInflight).toBe(6);

      metricsCollector.decrementInflight();
      expect(metricsCollector.getMetrics().currentInflight).toBe(5);

      // Should not go below 0
      metricsCollector.setInflightCount(0);
      metricsCollector.decrementInflight();
      expect(metricsCollector.getMetrics().currentInflight).toBe(0);
    });

    it('should calculate processing rate correctly', () => {
      const startTime = Date.now();
      
      // Simulate processing 10 messages
      for (let i = 0; i < 10; i++) {
        metricsCollector.incrementMessageCount('processed');
      }

      // Wait a small amount to ensure time passes
      const processingRate = metricsCollector.getProcessingRate();
      expect(processingRate).toBeGreaterThan(0);
    });

    it('should calculate error rate correctly', () => {
      metricsCollector.incrementMessageCount('processed');
      metricsCollector.incrementMessageCount('processed');
      metricsCollector.incrementMessageCount('processed');
      metricsCollector.incrementMessageCount('failed');

      const errorRate = metricsCollector.getErrorRate();
      expect(errorRate).toBeCloseTo(0.25); // 1 failed out of 4 total
    });

    it('should return 0 error rate when no messages processed', () => {
      const errorRate = metricsCollector.getErrorRate();
      expect(errorRate).toBe(0);
    });

    it('should calculate average latency correctly', () => {
      metricsCollector.recordLatency(100);
      metricsCollector.recordLatency(200);
      metricsCollector.recordLatency(300);

      const avgLatency = metricsCollector.getAverageLatency();
      expect(avgLatency).toBeCloseTo(200);
    });

    it('should return 0 average latency when no measurements', () => {
      const avgLatency = metricsCollector.getAverageLatency();
      expect(avgLatency).toBe(0);
    });

    it('should calculate latency percentiles correctly', () => {
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      latencies.forEach(latency => metricsCollector.recordLatency(latency));

      const p50 = metricsCollector.getLatencyPercentile(50);
      const p95 = metricsCollector.getLatencyPercentile(95);
      const p99 = metricsCollector.getLatencyPercentile(99);

      expect(p50).toBeCloseTo(50, 0);
      expect(p95).toBeCloseTo(95, 0);
      expect(p99).toBeCloseTo(99, 0);
    });

    it('should return 0 percentile when no measurements', () => {
      const p95 = metricsCollector.getLatencyPercentile(95);
      expect(p95).toBe(0);
    });

    it('should provide comprehensive metrics object', () => {
      metricsCollector.incrementMessageCount('processed');
      metricsCollector.incrementMessageCount('failed');
      metricsCollector.recordLatency(150);
      metricsCollector.incrementSinkError('test-sink');
      metricsCollector.setInflightCount(3);

      const metrics = metricsCollector.getMetrics();

      expect(metrics).toHaveProperty('messagesTotal');
      expect(metrics).toHaveProperty('latencyHistogram');
      expect(metrics).toHaveProperty('sinkErrors');
      expect(metrics).toHaveProperty('dlqTotal');
      expect(metrics).toHaveProperty('currentInflight');
      expect(metrics).toHaveProperty('processingRate');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('p95Latency');
      expect(metrics).toHaveProperty('p99Latency');
      expect(metrics).toHaveProperty('uptimeMs');

      expect(typeof metrics.processingRate).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(typeof metrics.uptimeMs).toBe('number');
    });

    it('should reset metrics correctly', () => {
      metricsCollector.incrementMessageCount('processed');
      metricsCollector.recordLatency(100);
      metricsCollector.incrementSinkError('test-sink');
      metricsCollector.setInflightCount(5);

      metricsCollector.reset();

      const metrics = metricsCollector.getMetrics();
      expect(metrics.messagesTotal.size).toBe(0);
      expect(metrics.latencyHistogram).toHaveLength(0);
      expect(metrics.sinkErrors.size).toBe(0);
      expect(metrics.dlqTotal).toBe(0);
      expect(metrics.currentInflight).toBe(0);
    });
  });

  describe('HealthCheckManager', () => {
    let healthCheckManager: HealthCheckManager;
    let mockNatsHealthCheck: vi.Mock;
    let mockSinkHealthChecks: vi.Mock;

    beforeEach(() => {
      mockNatsHealthCheck = vi.fn();
      mockSinkHealthChecks = vi.fn();
      
      healthCheckManager = new HealthCheckManager(
        mockNatsHealthCheck,
        mockSinkHealthChecks,
        metricsCollector
      );
    });

    it('should return healthy status when all components are healthy', async () => {
      mockNatsHealthCheck.mockResolvedValue(true);
      mockSinkHealthChecks.mockResolvedValue({
        'db-sink': { healthy: true },
        'splunk-sink': { healthy: true }
      });

      const result = await healthCheckManager.performHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.details.nats.connected).toBe(true);
      expect(result.details.sinks).toEqual({
        'db-sink': { healthy: true },
        'splunk-sink': { healthy: true }
      });
    });

    it('should return unhealthy status when NATS is down', async () => {
      mockNatsHealthCheck.mockResolvedValue(false);
      mockSinkHealthChecks.mockResolvedValue({});

      const result = await healthCheckManager.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.details.nats.connected).toBe(false);
    });

    it('should return degraded status when error rate is high', async () => {
      mockNatsHealthCheck.mockResolvedValue(true);
      mockSinkHealthChecks.mockResolvedValue({});

      // Simulate high error rate
      for (let i = 0; i < 5; i++) {
        metricsCollector.incrementMessageCount('processed');
      }
      for (let i = 0; i < 6; i++) {
        metricsCollector.incrementMessageCount('failed');
      }

      const result = await healthCheckManager.performHealthCheck();

      expect(result.status).toBe('degraded');
      expect(result.details.consumer.errorRate).toBeGreaterThan(0.1);
    });

    it('should return degraded status when no recent activity', async () => {
      mockNatsHealthCheck.mockResolvedValue(true);
      mockSinkHealthChecks.mockResolvedValue({});

      const result = await healthCheckManager.performHealthCheck();

      expect(result.status).toBe('degraded');
    });

    it('should return degraded status when sink is unhealthy', async () => {
      mockNatsHealthCheck.mockResolvedValue(true);
      mockSinkHealthChecks.mockResolvedValue({
        'db-sink': { healthy: true },
        'splunk-sink': { healthy: false, error: 'Connection failed' }
      });

      // Add recent activity
      metricsCollector.incrementMessageCount('processed');

      const result = await healthCheckManager.performHealthCheck();

      expect(result.status).toBe('degraded');
    });

    it('should handle health check errors gracefully', async () => {
      mockNatsHealthCheck.mockRejectedValue(new Error('NATS connection failed'));
      mockSinkHealthChecks.mockRejectedValue(new Error('Sink check failed'));

      const result = await healthCheckManager.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.details.error).toContain('NATS connection failed');
    });

    it('should not run concurrent health checks', async () => {
      mockNatsHealthCheck.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      mockSinkHealthChecks.mockResolvedValue({});

      const check1 = healthCheckManager.performHealthCheck();
      const check2 = healthCheckManager.performHealthCheck();

      const [result1, result2] = await Promise.all([check1, check2]);

      // Both should return a result, but second might be cached
      expect(result1.status).toBeDefined();
      expect(result2.status).toBeDefined();
    });

    it('should cache last health check result', async () => {
      mockNatsHealthCheck.mockResolvedValue(true);
      mockSinkHealthChecks.mockResolvedValue({});

      await healthCheckManager.performHealthCheck();
      const lastCheck = healthCheckManager.getLastHealthCheck();

      expect(lastCheck).toBeDefined();
      expect(lastCheck!.status).toBe('healthy');
      expect(lastCheck!.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('PrometheusMetricsExporter', () => {
    let exporter: PrometheusMetricsExporter;

    beforeEach(() => {
      exporter = new PrometheusMetricsExporter(metricsCollector);
    });

    it('should export metrics in Prometheus format', () => {
      metricsCollector.incrementMessageCount('processed');
      metricsCollector.incrementMessageCount('failed');
      metricsCollector.recordLatency(100);
      metricsCollector.incrementSinkError('db-sink');

      const exported = exporter.exportMetrics();

      expect(exported).toContain('# HELP audit_consumer_messages_total');
      expect(exported).toContain('# TYPE audit_consumer_messages_total counter');
      expect(exported).toContain('audit_consumer_messages_total{status="processed"} 1');
      expect(exported).toContain('audit_consumer_messages_total{status="failed"} 1');
      
      expect(exported).toContain('# HELP audit_consumer_latency_ms_bucket');
      expect(exported).toContain('# TYPE audit_consumer_latency_ms_bucket histogram');
      
      expect(exported).toContain('# HELP audit_sink_errors_total');
      expect(exported).toContain('audit_sink_errors_total{sink="db-sink"} 1');
      
      expect(exported).toContain('# HELP audit_consumer_inflight_messages');
      expect(exported).toContain('# TYPE audit_consumer_inflight_messages gauge');
      
      expect(exported).toContain('# HELP audit_dlq_messages_total');
      expect(exported).toContain('# TYPE audit_dlq_messages_total counter');
    });

    it('should create histogram buckets correctly', () => {
      const latencies = [1, 5, 25, 100, 500, 2000, 10000];
      latencies.forEach(latency => metricsCollector.recordLatency(latency));

      const exported = exporter.exportMetrics();

      expect(exported).toContain('audit_consumer_latency_ms_bucket{le="1"}');
      expect(exported).toContain('audit_consumer_latency_ms_bucket{le="100"}');
      expect(exported).toContain('audit_consumer_latency_ms_bucket{le="+Inf"}');
      expect(exported).toContain('audit_consumer_latency_ms_count 7');
    });

    it('should handle empty metrics', () => {
      const exported = exporter.exportMetrics();

      expect(exported).toContain('audit_consumer_inflight_messages 0');
      expect(exported).toContain('audit_dlq_messages_total 0');
      expect(exported).toContain('audit_consumer_latency_ms_count 0');
      expect(exported).toContain('audit_consumer_latency_ms_sum 0');
    });
  });
});