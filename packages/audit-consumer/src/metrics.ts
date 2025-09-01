import { AuditConsumerMetrics, HealthCheckResult } from './types';

export class MetricsCollector {
  private metrics: AuditConsumerMetrics = {
    messagesTotal: new Map(),
    latencyHistogram: [],
    sinkErrors: new Map(),
    dlqTotal: 0,
    currentInflight: 0,
  };
  
  private startTime = Date.now();

  // Message processing metrics
  incrementMessageCount(status: 'processed' | 'failed' | 'retried' | 'dlq'): void {
    const current = this.metrics.messagesTotal.get(status) || 0;
    this.metrics.messagesTotal.set(status, current + 1);
    
    if (status === 'processed') {
      this.metrics.lastProcessedAt = new Date();
    } else if (status === 'dlq') {
      this.metrics.dlqTotal++;
    }
  }

  // Latency tracking
  recordLatency(latencyMs: number): void {
    this.metrics.latencyHistogram.push(latencyMs);
    
    // Keep only last 1000 measurements for memory efficiency
    if (this.metrics.latencyHistogram.length > 1000) {
      this.metrics.latencyHistogram = this.metrics.latencyHistogram.slice(-1000);
    }
  }

  // Sink error tracking
  incrementSinkError(sinkName: string): void {
    const current = this.metrics.sinkErrors.get(sinkName) || 0;
    this.metrics.sinkErrors.set(sinkName, current + 1);
  }

  // Inflight message tracking
  setInflightCount(count: number): void {
    this.metrics.currentInflight = count;
  }

  incrementInflight(): void {
    this.metrics.currentInflight++;
  }

  decrementInflight(): void {
    this.metrics.currentInflight = Math.max(0, this.metrics.currentInflight - 1);
  }

  // Computed metrics
  getProcessingRate(): number {
    const totalProcessed = this.metrics.messagesTotal.get('processed') || 0;
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    return uptimeSeconds > 0 ? totalProcessed / uptimeSeconds : 0;
  }

  getErrorRate(): number {
    const totalProcessed = this.metrics.messagesTotal.get('processed') || 0;
    const totalFailed = this.metrics.messagesTotal.get('failed') || 0;
    const total = totalProcessed + totalFailed;
    return total > 0 ? totalFailed / total : 0;
  }

  getAverageLatency(): number {
    if (this.metrics.latencyHistogram.length === 0) return 0;
    const sum = this.metrics.latencyHistogram.reduce((a, b) => a + b, 0);
    return sum / this.metrics.latencyHistogram.length;
  }

  getLatencyPercentile(percentile: number): number {
    if (this.metrics.latencyHistogram.length === 0) return 0;
    
    const sorted = [...this.metrics.latencyHistogram].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  // Get all metrics
  getMetrics(): AuditConsumerMetrics & {
    processingRate: number;
    errorRate: number;
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    uptimeMs: number;
  } {
    return {
      ...this.metrics,
      processingRate: this.getProcessingRate(),
      errorRate: this.getErrorRate(),
      averageLatency: this.getAverageLatency(),
      p95Latency: this.getLatencyPercentile(95),
      p99Latency: this.getLatencyPercentile(99),
      uptimeMs: Date.now() - this.startTime,
    };
  }

  // Reset metrics (useful for testing)
  reset(): void {
    this.metrics = {
      messagesTotal: new Map(),
      latencyHistogram: [],
      sinkErrors: new Map(),
      dlqTotal: 0,
      currentInflight: 0,
    };
    this.startTime = Date.now();
  }
}

// Health Check Manager
export class HealthCheckManager {
  private lastHealthCheck?: HealthCheckResult;
  private checkInProgress = false;

  constructor(
    private natsHealthCheck: () => Promise<boolean>,
    private sinkHealthChecks: () => Promise<Record<string, any>>,
    private metricsCollector: MetricsCollector
  ) {}

  async performHealthCheck(): Promise<HealthCheckResult> {
    if (this.checkInProgress) {
      return this.lastHealthCheck || this.createUnhealthyResult('Health check in progress');
    }

    this.checkInProgress = true;

    try {
      const [natsHealthy, sinkStatuses] = await Promise.all([
        this.natsHealthCheck().catch(() => false),
        this.sinkHealthChecks().catch(() => ({})),
      ]);

      const metrics = this.metricsCollector.getMetrics();
      const errorRate = metrics.errorRate;
      const hasRecentActivity = metrics.lastProcessedAt && 
        Date.now() - metrics.lastProcessedAt.getTime() < 5 * 60 * 1000; // 5 minutes

      // Determine overall health status
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      
      if (!natsHealthy) {
        status = 'unhealthy';
      } else if (errorRate > 0.1 || !hasRecentActivity) { // 10% error rate threshold
        status = 'degraded';
      } else {
        // Check if any sinks are unhealthy
        const sinkProblems = Object.values(sinkStatuses).some(
          (sinkStatus: any) => sinkStatus.healthy === false
        );
        if (sinkProblems) {
          status = 'degraded';
        }
      }

      this.lastHealthCheck = {
        status,
        timestamp: new Date(),
        details: {
          nats: {
            connected: natsHealthy,
            lastSeen: new Date(),
          },
          sinks: sinkStatuses,
          consumer: {
            running: true,
            inflightCount: metrics.currentInflight,
            lastMessageAt: metrics.lastProcessedAt,
            errorRate: errorRate,
          },
        },
      };

      return this.lastHealthCheck;
    } catch (error) {
      this.lastHealthCheck = this.createUnhealthyResult(
        error instanceof Error ? error.message : 'Unknown health check error'
      );
      return this.lastHealthCheck;
    } finally {
      this.checkInProgress = false;
    }
  }

  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  private createUnhealthyResult(error: string): HealthCheckResult {
    return {
      status: 'unhealthy',
      timestamp: new Date(),
      details: {
        consumer: { running: false, inflightCount: 0 },
      },
    };
  }
}

// Prometheus-style metrics exporter (optional)
export class PrometheusMetricsExporter {
  constructor(private metricsCollector: MetricsCollector) {}

  exportMetrics(): string {
    const metrics = this.metricsCollector.getMetrics();
    const lines: string[] = [];

    // Help and type declarations
    lines.push('# HELP audit_consumer_messages_total Total number of messages processed');
    lines.push('# TYPE audit_consumer_messages_total counter');
    
    for (const [status, count] of metrics.messagesTotal.entries()) {
      lines.push(`audit_consumer_messages_total{status="${status}"} ${count}`);
    }

    lines.push('# HELP audit_consumer_latency_ms_bucket Message processing latency buckets');
    lines.push('# TYPE audit_consumer_latency_ms_bucket histogram');
    
    const buckets = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
    let cumulativeCount = 0;
    
    for (const bucket of buckets) {
      const count = metrics.latencyHistogram.filter(latency => latency <= bucket).length;
      cumulativeCount += count;
      lines.push(`audit_consumer_latency_ms_bucket{le="${bucket}"} ${cumulativeCount}`);
    }
    
    lines.push(`audit_consumer_latency_ms_bucket{le="+Inf"} ${metrics.latencyHistogram.length}`);
    lines.push(`audit_consumer_latency_ms_count ${metrics.latencyHistogram.length}`);
    lines.push(`audit_consumer_latency_ms_sum ${metrics.latencyHistogram.reduce((a, b) => a + b, 0)}`);

    lines.push('# HELP audit_sink_errors_total Total number of sink errors');
    lines.push('# TYPE audit_sink_errors_total counter');
    
    for (const [sink, count] of metrics.sinkErrors.entries()) {
      lines.push(`audit_sink_errors_total{sink="${sink}"} ${count}`);
    }

    lines.push('# HELP audit_consumer_inflight_messages Current number of inflight messages');
    lines.push('# TYPE audit_consumer_inflight_messages gauge');
    lines.push(`audit_consumer_inflight_messages ${metrics.currentInflight}`);

    lines.push('# HELP audit_dlq_messages_total Total number of messages sent to DLQ');
    lines.push('# TYPE audit_dlq_messages_total counter');
    lines.push(`audit_dlq_messages_total ${metrics.dlqTotal}`);

    return lines.join('\n') + '\n';
  }
}