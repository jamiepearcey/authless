// jetstream-service-wrapper.ts
import { createLightship, type Lightship } from 'lightship';
import {
  connect,
  type NatsConnection,
  type JetStreamClient,
  type JsMsg,
  AckPolicy,
  DeliverPolicy,
  RetentionPolicy,
  StorageType,
} from 'nats';
import pino, { type Logger as PinoLogger } from 'pino';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';
import http from 'http';

/* ===========================
   Types (public surface)
   =========================== */

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

// Re-export commonly used types
export type Logger = PinoLogger;

export interface ProcessingContext {
  messageId: string;
  subject: string;
  sequence: number;
  timestamp: Date;
  retryCount: number;
  processingStartTime: number;
}

export interface HookSet {
  beforeStart?(): Promise<void>;
  afterStart?(): Promise<void>;
  beforeStop?(): Promise<void>;
  afterStop?(): Promise<void>;
  onError?(err: unknown, ctx: ProcessingContext): Promise<void>;
  onHealthCheck?(): Promise<Record<string, unknown>>;
}

export interface RetryPolicy {
  maxRetries: number; // number of redeliveries allowed (excluding first attempt)
  baseMs?: number; // 1000 default
  jitterMs?: number; // 250 default
  // Return delay for next attempt (ms).
  backoffMs?(attempt: number): number;
  // DLQ handler: default -> msg.term()
  toDlq?(msg: JsMsg, err: unknown): Promise<void>;
}

export interface HealthChecks {
  intervalMs: number; // 0 to disable
  checks: Array<() => Promise<void>>; // throw to fail
}

export interface PrometheusConfig {
  enabled?: boolean;
  prefix?: string; // default 'jetstream_service_'
  collectDefaultMetrics?: boolean; // default true
  defaultLabels?: Record<string, string>;
  metricsPort?: number; // optional separate /metrics server
}

export interface ServiceConfig {
  serviceName: string;
  version: string;
  logLevel?: pino.LevelWithSilent;
  // NATS/JetStream
  natsUrl: string;
  streamName: string;
  consumerName: string;
  filterSubjects?: string[]; // optional, when creating the consumer
  ackWaitMs?: number; // default 30_000
  batchSize?: number; // max messages to pull per consume window (advisory)
  concurrency?: number; // default 4
  retryPolicy?: RetryPolicy;
  // Health
  lightshipPort?: number; // default 8080
  healthChecks?: HealthChecks; // optional
  // Metrics
  metrics?: PrometheusConfig;
}

export interface JetStreamService {
  // Your domain handler
  processMessage(data: unknown, ctx: ProcessingContext): Promise<void>;
  // Optional health probe
  healthCheck?(): Promise<Record<string, unknown>>;
  // Hooks
  hooks?: HookSet;
}

export interface ServiceRunner {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getPrometheusMetrics(): Promise<string>;
  getLogger(): PinoLogger;
}

/* ===========================
   Internal helpers
   =========================== */

function expBackoffMs(attempt: number, base = 1000, jitter = 250, cap = 6) {
  const pow = Math.min(attempt, cap);
  const ms = base * Math.pow(2, pow);
  const j = Math.floor(Math.random() * jitter);
  return ms + j;
}

class StateTracker {
  isRunning = false;
  inFlight = 0;
  processed = 0;
  failed = 0;
  retried = 0;
  dlq = 0;
  startTime = Date.now();
  lastProcessedAt?: Date;

  start() {
    this.isRunning = true;
    this.startTime = Date.now();
  }
  stop() {
    this.isRunning = false;
  }
  incInFlight() {
    this.inFlight++;
  }
  decInFlight() {
    if (this.inFlight > 0) this.inFlight--;
  }
  markOk() {
    this.processed++;
    this.lastProcessedAt = new Date();
  }
  markErr() {
    this.failed++;
  }
  markRetry() {
    this.retried++;
  }
  markDlq() {
    this.dlq++;
  }
  snapshot() {
    const uptime = (Date.now() - this.startTime) / 1000;
    const total = this.processed + this.failed;
    return {
      isRunning: this.isRunning,
      inFlight: this.inFlight,
      processed: this.processed,
      failed: this.failed,
      retried: this.retried,
      dlq: this.dlq,
      lastProcessedAt: this.lastProcessedAt,
      uptime,
      errorRate: total > 0 ? (this.failed / total) * 100 : 0,
      rate: total > 0 ? total / uptime : 0,
    };
  }
}

/* ===========================
   Metrics collectors
   =========================== */

class ServiceMetricsCollector {
  private registry: Registry;
  private startTime = Date.now();
  private messagesTotal!: Counter<string>;
  private processingDuration!: Histogram<string>;
  private processingRate!: Gauge<string>;
  private errorRate!: Gauge<string>;
  private memoryUsage!: Gauge<string>;
  private uptime!: Gauge<string>;

  constructor(
    private serviceName: string,
    private cfg: PrometheusConfig = { enabled: true }
  ) {
    this.registry = new Registry();
    if (cfg.enabled !== false) this.initialize();
  }

  private initialize() {
    const sanitizedServiceName = this.serviceName.replace(/-/g, '_');
    const prefix = this.cfg.prefix?.replace(/-/g, '_') ?? `${sanitizedServiceName}_`;
    const defaultLabels = { service: sanitizedServiceName, ...(this.cfg.defaultLabels ?? {}) };
    this.registry.setDefaultLabels(defaultLabels);

    console.log('prefix',`${prefix}messages_total`, sanitizedServiceName)

    this.messagesTotal = new Counter({
      name: `${prefix}messages_total`,
      help: 'Total messages processed partitioned by status',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.processingDuration = new Histogram({
      name: `${prefix}processing_duration_seconds`,
      help: 'Time spent processing messages',
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.processingRate = new Gauge({
      name: `${prefix}processing_rate`,
      help: 'Messages per second (since start)',
      registers: [this.registry],
    });

    this.errorRate = new Gauge({
      name: `${prefix}error_rate`,
      help: 'Error rate percent (failed / total)',
      registers: [this.registry],
    });

    this.memoryUsage = new Gauge({
      name: `${prefix}memory_usage_bytes`,
      help: 'heapUsed bytes',
      registers: [this.registry],
    });

    this.uptime = new Gauge({
      name: `${prefix}uptime_seconds`,
      help: 'Service uptime in seconds',
      registers: [this.registry],
    });

    if (this.cfg.collectDefaultMetrics !== false) {
      collectDefaultMetrics({ register: this.registry, prefix });
    }
  }

  startTimer() {
    const start = Date.now();
    return {
      endSuccess: () => this.observe(true, Date.now() - start),
      endFailure: () => this.observe(false, Date.now() - start),
      elapsedMs: () => Date.now() - start,
    };
  }

  private observe(success: boolean, durationMs: number) {
    if (this.cfg.enabled === false) return;
    const status = success ? 'processed' : 'failed';
    this.messagesTotal.inc({ status });
    this.processingDuration.observe(durationMs / 1000);

    // periodically refresh gauges
    const mem = process.memoryUsage();
    const uptimeSec = (Date.now() - this.startTime) / 1000;
    // Note: prom-client Counter doesn't expose hashMap directly, so we'll use a simpler approach
    // In a real implementation, you might want to track these values separately
    this.processingRate.set(0); // Placeholder - implement based on your needs
    // Error rate requires total; simplest: recompute from counters exposed to you (or pass state snapshot in)
    // Here we skip exact calc and leave it to a separate updater (see updateFromState).
    this.memoryUsage.set(mem.heapUsed);
    this.uptime.set(uptimeSec);
  }

  updateFromState(state: ReturnType<StateTracker['snapshot']>) {
    if (this.cfg.enabled === false) return;
    this.processingRate.set(state.rate);
    this.errorRate.set(state.errorRate);
    this.uptime.set(state.uptime);
    this.memoryUsage.set(process.memoryUsage().heapUsed);
  }

  incRetried() {
    if (this.cfg.enabled === false) return;
    this.messagesTotal.inc({ status: 'retried' });
  }
  incDlq() {
    if (this.cfg.enabled === false) return;
    this.messagesTotal.inc({ status: 'dlq' });
  }

  async metricsText() {
    return this.registry.metrics();
  }

  getRegistry() {
    return this.registry;
  }
}

class HealthMetricsCollector {
  private registry: Registry;
  private statusGauge: Gauge<string>;
  private durationHist: Histogram<string>;

  constructor(serviceName: string, registry: Registry) {
    this.registry = registry;
    this.statusGauge = new Gauge({
      name: 'jetstream_service_health_status',
      help: '1=healthy, 0.5=degraded, 0=unhealthy',
      labelNames: ['service'],
      registers: [this.registry],
    });
    this.durationHist = new Histogram({
      name: 'jetstream_service_health_check_duration_seconds',
      help: 'Duration of health checks',
      labelNames: ['service', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry],
    });
    this.serviceName = serviceName;
  }
  private serviceName: string;

  record(status: HealthStatus, durationMs: number) {
    const v = status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : 0;
    this.statusGauge.set({ service: this.serviceName }, v);
    this.durationHist.observe({ service: this.serviceName, status }, durationMs / 1000);
  }
}

/* ===========================
   Wrapper implementation
   =========================== */

export class JetStreamServiceWrapper implements ServiceRunner {
  private lightship: Lightship | null = null;
  private logger: PinoLogger;
  private registry: Registry;
  private metrics: ServiceMetricsCollector;
  private healthMetrics: HealthMetricsCollector;
  private metricsServer?: http.Server;

  private state = new StateTracker();

  private nc?: NatsConnection;
  private js?: JetStreamClient;

  constructor(
    private readonly service: JetStreamService,
    private readonly config: ServiceConfig
  ) {
    this.logger = pino({
      name: config.serviceName,
      level: config.logLevel ?? 'info',
      base: {
        service: config.serviceName,
        version: config.version,
        env: process.env.NODE_ENV ?? 'development',
      },
    });

    this.metrics = new ServiceMetricsCollector(config.serviceName, {
      enabled: config.metrics?.enabled ?? true,
      prefix: config.metrics?.prefix ?? 'jetstream_service',
      collectDefaultMetrics: config.metrics?.collectDefaultMetrics ?? true,
      defaultLabels: config.metrics?.defaultLabels,
    });

    this.registry = this.metrics.getRegistry();
    this.healthMetrics = new HealthMetricsCollector(config.serviceName, this.registry);
  }

  isRunning() {
    return this.state.isRunning;
  }

  async getPrometheusMetrics(): Promise<string> {
    // sync gauges with latest state
    this.metrics.updateFromState(this.state.snapshot());
    return this.registry.metrics();
  }

  getLogger(): PinoLogger {
    return this.logger;
  }

  async start(): Promise<void> {
    if (this.state.isRunning) {
      this.logger.warn('Service already running');
      return;
    }

    // 1) Lightship
    this.lightship = await createLightship({
      port: this.config.lightshipPort ?? 8081,
      detectKubernetes: false,
      gracefulShutdownTimeout: 25_000,
    });
    this.lightship.registerShutdownHandler(async () => {
      this.logger.info('Shutdown requested (Lightship)');
      await this.stop().catch((err) => this.logger.error({ err }, 'Error on stop'));
    });

    // 3) Signal handling for graceful shutdown
    this.setupSignalHandlers();

    // 2) Optional metrics HTTP server
    const metricsPort = this.config.metrics?.metricsPort;
    if (metricsPort) {
      this.metricsServer = http
        .createServer(async (req, res) => {
          if (req.url === '/metrics') {
            const body = await this.getPrometheusMetrics();
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(body);
          } else {
            res.writeHead(404);
            res.end();
          }
        })
        .listen(metricsPort, () =>
          this.logger.info({ metricsPort }, 'metrics server listening')
        );
    }

    try {
      // 3) Hooks.beforeStart
      if (this.service.hooks?.beforeStart) {
        await this.service.hooks.beforeStart();
      }

      // 4) Connect NATS
      this.nc = await connect({
        servers: this.config.natsUrl,
        name: `${this.config.serviceName}-${this.config.version}`,
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 1500,
      });
      this.js = this.nc.jetstream();

      // Ensure stream exists (create if needed) - Fan-out pattern
      const jsm = await this.nc.jetstreamManager();
      try {
        await jsm.streams.add({
          name: this.config.streamName,
          subjects: ['events.*'], // Accept all events.* subjects
          retention: RetentionPolicy.Limits,
          max_age: 24 * 60 * 60 * 1000 * 1000 * 1000, // 24 hours in nanoseconds
          max_msgs: 1000000,
          max_bytes: 1024 * 1024 * 1024, // 1GB
          storage: StorageType.File,
        });
        this.logger.info(
          { stream: this.config.streamName },
          'JetStream stream created (fan-out pattern)'
        );
      } catch (err: any) {
        if (!String(err?.message ?? '').includes('already in use') &&
            !String(err?.message ?? '').includes('already exists')) {
          throw err;
        }
        this.logger.info(
          { stream: this.config.streamName },
          'JetStream stream already exists'
        );
      }

      // Ensure consumer exists (create if needed) - Fan-out pattern
      const ackWaitNs = (this.config.ackWaitMs ?? 30_000) * 1_000_000;
      const uniqueConsumerName = `${this.config.consumerName}_${this.config.serviceName}`;
      try {
        await jsm.consumers.add(this.config.streamName, {
          name: uniqueConsumerName,
          deliver_policy: DeliverPolicy.All,
          ack_policy: AckPolicy.Explicit,
          max_deliver: (this.config.retryPolicy?.maxRetries ?? 10) + 1,
          ack_wait: ackWaitNs,
          max_ack_pending: this.config.batchSize ?? 100,
          filter_subjects: this.config.filterSubjects,
        });
        this.logger.info(
          { stream: this.config.streamName, consumer: uniqueConsumerName },
          'JetStream consumer created (fan-out)'
        );
      } catch (err: any) {
        if (!String(err?.message ?? '').includes('already in use') &&
            !String(err?.message ?? '').includes('already exists')) {
          throw err;
        }
        this.logger.info(
          { stream: this.config.streamName, consumer: uniqueConsumerName },
          'JetStream consumer already exists'
        );
      }

      // 5) Ready to run
      this.state.start();
      this.lightship.signalReady();
      this.logger.info(
        {
          natsUrl: this.config.natsUrl,
          stream: this.config.streamName,
          consumer: uniqueConsumerName,
          concurrency: this.config.concurrency ?? 4,
        },
        'Service ready'
      );

      // 6) Start health checks loop if configured
      if (this.config.healthChecks && this.config.healthChecks.intervalMs > 0) {
        const { intervalMs, checks } = this.config.healthChecks;
        const loop = async () => {
          const started = Date.now();
          let status: HealthStatus = 'healthy';
          try {
            for (const check of checks) await check();
            // optional: merge service.hooks.onHealthCheck()
            if (this.service.hooks?.onHealthCheck) await this.service.hooks.onHealthCheck();
            status = 'healthy';
            this.lightship!.signalReady();
          } catch {
            // degraded vs unhealthy: simple heuristic — if connected to NATS but check failed, mark degraded
            status = this.nc && !this.nc.isClosed() ? 'degraded' : 'unhealthy';
            this.lightship!.signalNotReady();
          } finally {
            this.metrics.updateFromState(this.state.snapshot());
            this.healthMetrics.record(status, Date.now() - started);
          }
        };
        await loop();
        setInterval(loop, intervalMs).unref();
      }

      // 7) Start consumer loop
      await this.consumeLoop();

      // 8) Hooks.afterStart
      if (this.service.hooks?.afterStart) await this.service.hooks.afterStart();
    } catch (err) {
      this.logger.error({ err }, 'Failed to start service');
      await this.stop(); // best-effort cleanup
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (!this.state.isRunning && !this.nc) {
      return;
    }
    try {
      if (this.service.hooks?.beforeStop) await this.service.hooks.beforeStop();
    } catch (err) {
      this.logger.warn({ err }, 'beforeStop hook error');
    }

    this.state.stop();
    try {
      if (this.nc && !this.nc.isClosed()) {
        await this.nc.drain().catch(async () => {
          try { await this.nc!.close(); } catch {}
        });
      }
    } catch (err) {
      this.logger.warn({ err }, 'Error draining/closing NATS');
    }

    if (this.metricsServer) {
      await new Promise<void>((res) => this.metricsServer!.close(() => res()));
    }

    try {
      if (this.service.hooks?.afterStop) await this.service.hooks.afterStop();
    } catch (err) {
      this.logger.warn({ err }, 'afterStop hook error');
    }
  }

  /* ===========================
     Consumer loop
     =========================== */

  private async consumeLoop() {
    if (!this.js) throw new Error('JetStream not initialized');

    const uniqueConsumerName = `${this.config.consumerName}_${this.config.serviceName}`;
    const consumer = await this.js.consumers.get(
      this.config.streamName,
      uniqueConsumerName
    );
    const sub = await consumer.consume({
      max_messages: this.config.batchSize ?? 100,
      expires: (this.config.ackWaitMs ?? 30_000) - 1000, // pull window
    });

    const concurrency = this.config.concurrency ?? 4;
    const retryCfg = this.config.retryPolicy ?? { maxRetries: 10 };

    const handleMsg = async (msg: JsMsg) => {
      const ctx: ProcessingContext = {
        messageId: `${msg.seq}`,
        subject: msg.subject,
        sequence: msg.seq,
        timestamp: new Date(),
        retryCount: msg.info?.redeliveryCount ?? 0,
        processingStartTime: Date.now(),
      };
      const t = this.metrics.startTimer();

      try {
        const data = safeParse(msg);
        await this.service.processMessage(data, ctx);
        msg.ack();
        this.state.markOk();
        t.endSuccess();
      } catch (err) {
        this.state.markErr();
        t.endFailure();
        try { await this.service.hooks?.onError?.(err, ctx); } catch {}

        const attempt = (msg.info?.redeliveryCount ?? 0);
        const shouldRetry =
          attempt < (retryCfg.maxRetries ?? 10);

        if (shouldRetry) {
          this.state.markRetry();
          this.metrics.incRetried();
          const delay =
            retryCfg.backoffMs?.(attempt) ??
            expBackoffMs(attempt, retryCfg.baseMs ?? 1000, retryCfg.jitterMs ?? 250);
          try { msg.nak(delay); } catch { /* best effort */ }
          this.logger.warn(
            { seq: msg.seq, attempt: attempt + 1, delay },
            'Message scheduled for retry'
          );
        } else {
          this.state.markDlq();
          this.metrics.incDlq();
          try {
            if (retryCfg.toDlq) await retryCfg.toDlq(msg, err);
            else msg.term(); // default: terminal; configure a DLQ consumer to capture
          } catch { /* no-op */ }
          this.logger.error(
            { seq: msg.seq, attempts: attempt, action: 'DLQ' },
            'Message moved to DLQ'
          );
        }
      }
    };

    // Simple in-flight gate
    const inflight = new Set<Promise<void>>();
    const pump = async () => {
      for await (const msg of sub) {
        if (!this.state.isRunning) break;
        // backpressure by in-flight
        while (inflight.size >= concurrency) {
          await Promise.race(inflight);
        }
        this.state.incInFlight();
        
        const promise = (async () => {
          try { 
            await handleMsg(msg); 
          } finally {
            this.state.decInFlight();
          }
        })();
        
        inflight.add(promise);
        
        // Clean up when promise completes
        promise.finally(() => {
          inflight.delete(promise);
        });
      }
    };

    pump().catch((err) => {
      this.logger.error({ err }, 'Subscription loop failed');
      this.lightship?.signalNotReady();
      this.lightship?.shutdown();
    });
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const shutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await this.stop();
        this.logger.info('Service stopped gracefully');
        process.exit(0);
      } catch (error) {
        this.logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error({ error }, 'Uncaught Exception');
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error({ reason, promise }, 'Unhandled Rejection');
      shutdown('unhandledRejection');
    });
  }
}

/* ===========================
   Utils
   =========================== */

function safeParse(msg: JsMsg): unknown {
  try {
    const s = msg.string();
    return JSON.parse(s);
  } catch {
    // fall back to raw bytes
    return msg.data;
  }
}