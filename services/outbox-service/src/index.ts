import { OutboxProcessor, type ProcessorConfig } from '@outbox/processor';
import { createLightship, type Lightship } from 'lightship';
import pino, { type Logger } from 'pino';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import http from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// Configuration Interface
// ============================================================================

export interface OutboxServiceConfig {
  // Service identity
  serviceName: string;
  version: string;
  
  // Outbox processor configuration
  databaseUrl: string;
  natsUrl: string;
  batchSize?: number;
  maxTries?: number;
  idleSleepMs?: number;
  
  // Service configuration
  logLevel?: pino.LevelWithSilent;
  port?: number;
  metricsPort?: number;
  
  // Metrics configuration
  metricsEnabled?: boolean;
  metricsPrefix?: string;
}

// ============================================================================
// Service Metrics
// ============================================================================

class OutboxServiceMetrics {
  private registry: Registry;
  private eventsProcessed!: Counter<string>;
  private eventsFailures!: Counter<string>;
  private processingDuration!: Histogram<string>;
  private queueSize!: Gauge<string>;

  constructor(serviceName: string, enabled = true) {
    this.registry = new Registry();
    
    if (enabled) {
      this.initialize(serviceName);
    }
  }

  private initialize(serviceName: string) {
    const prefix = 'outbox_service_';
    this.registry.setDefaultLabels({ service: serviceName });

    // Collect default metrics
    collectDefaultMetrics({ register: this.registry });

    this.eventsProcessed = new Counter({
      name: `${prefix}events_processed_total`,
      help: 'Total number of events processed',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.eventsFailures = new Counter({
      name: `${prefix}events_failures_total`,
      help: 'Total number of event processing failures',
      labelNames: ['error_type'],
      registers: [this.registry],
    });

    this.processingDuration = new Histogram({
      name: `${prefix}processing_duration_seconds`,
      help: 'Time spent processing events',
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.queueSize = new Gauge({
      name: `${prefix}queue_size`,
      help: 'Current number of pending events in outbox',
      registers: [this.registry],
    });
  }

  recordEventProcessed(status: 'success' | 'failure') {
    this.eventsProcessed.inc({ status });
  }

  recordEventFailure(errorType: string) {
    this.eventsFailures.inc({ error_type: errorType });
  }

  recordProcessingDuration(durationSeconds: number) {
    this.processingDuration.observe(durationSeconds);
  }

  setQueueSize(size: number) {
    this.queueSize.set(size);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

// ============================================================================
// Main Service Implementation
// ============================================================================

export class OutboxService {
  private processor: OutboxProcessor;
  private logger: Logger;
  private lightship?: Lightship;
  private metricsServer?: http.Server;
  private metrics: OutboxServiceMetrics;
  private isRunning = false;

  constructor(private config: OutboxServiceConfig) {
    // Initialize logger
    this.logger = pino({
      name: config.serviceName,
      level: config.logLevel || 'info',
      base: {
        service: config.serviceName,
        version: config.version,
        env: process.env.NODE_ENV || 'development',
      },
    });

    // Initialize metrics
    this.metrics = new OutboxServiceMetrics(
      config.serviceName, 
      config.metricsEnabled !== false
    );

    // Create outbox processor with enhanced configuration
    const processorConfig: ProcessorConfig = {
      databaseUrl: config.databaseUrl,
      natsUrl: config.natsUrl,
      batchSize: config.batchSize,
      maxTries: config.maxTries,
      idleSleepMs: config.idleSleepMs,
    };

    this.processor = new OutboxProcessor(processorConfig);
  }

  /**
   * Get the logger instance
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<string> {
    return this.metrics.getMetrics();
  }

  /**
   * Check if service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Start the outbox service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Outbox service already running');
      return;
    }

    try {
      this.logger.info('Starting outbox service...');

      // Start Lightship for health checks
      this.lightship = await createLightship({
        port: this.config.port || 8082,
        detectKubernetes: false,
        gracefulShutdownTimeout: 25_000,
      });

      this.lightship.registerShutdownHandler(async () => {
        this.logger.info('Shutdown requested (Lightship)');
        await this.stop().catch((err) => 
          this.logger.error({ error: err }, 'Error during shutdown')
        );
      });

      // Start metrics server if enabled
      if (this.config.metricsEnabled !== false) {
        await this.startMetricsServer();
      }

      // Initialize and start the outbox processor
      await this.processor.init();
      await this.processor.start();

      this.isRunning = true;
      this.lightship.signalReady();
      
      this.logger.info({
        port: this.config.port || 8082,
        metricsPort: this.config.metricsPort || 9090,
        batchSize: this.config.batchSize,
        maxTries: this.config.maxTries,
      }, 'Outbox service started successfully');

    } catch (error) {
      this.logger.error({ error }, 'Failed to start outbox service');
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Stop the outbox service gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Outbox service not running');
      return;
    }

    this.logger.info('Stopping outbox service...');
    this.isRunning = false;

    try {
      // Stop the processor
      await this.processor.stop();
      
      // Clean up resources
      await this.cleanup();
      
      this.logger.info('Outbox service stopped successfully');
    } catch (error) {
      this.logger.error({ error }, 'Error stopping outbox service');
      throw error;
    }
  }

  /**
   * Start the metrics server
   */
  private async startMetricsServer(): Promise<void> {
    const port = this.config.metricsPort || 9090;
    
    this.metricsServer = http.createServer(async (req, res) => {
      if (req.url === '/metrics' && req.method === 'GET') {
        const metrics = await this.getMetrics();
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(metrics);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    return new Promise((resolve, reject) => {
      this.metricsServer!.listen(port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          this.logger.info({ port }, 'Metrics server started');
          resolve();
        }
      });
    });
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.metricsServer) {
        await new Promise<void>((resolve) => {
          this.metricsServer!.close(() => resolve());
        });
        this.metricsServer = undefined;
        this.logger.info('Metrics server stopped');
      }

      if (this.lightship) {
        await this.lightship.shutdown();
        this.lightship = undefined;
        this.logger.info('Lightship stopped');
      }
    } catch (error) {
      this.logger.error({ error }, 'Error during cleanup');
    }
  }
}

// ============================================================================
// Factory and Configuration
// ============================================================================

export class OutboxServiceFactory {
  static createService(config: OutboxServiceConfig): OutboxService {
    return new OutboxService(config);
  }
}

function createDefaultConfig(): OutboxServiceConfig {
  return {
    serviceName: 'outbox-service',
    version: '1.0.0',
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/authless',
    natsUrl: process.env.NATS_URL || 'nats://127.0.0.1:4223',
    batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '100'),
    maxTries: parseInt(process.env.OUTBOX_MAX_TRIES || '10'),
    idleSleepMs: parseInt(process.env.OUTBOX_IDLE_SLEEP_MS || '500'),
    logLevel: (process.env.LOG_LEVEL as pino.LevelWithSilent) || 'info',
            port: parseInt(process.env.PORT || '8082'),
    metricsPort: parseInt(process.env.METRICS_PORT || '9092'),
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
  };
}

// Start the service if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = createDefaultConfig();
  const service = OutboxServiceFactory.createService(config);
  
  // Graceful shutdown handling
  const logger = service.getLogger();
  
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await service.stop();
      logger.info('Service stopped gracefully');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught Exception');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled Rejection');
    shutdown('unhandledRejection');
  });
  
  // Start the service
  service.start().catch((error) => {
    logger.error({ error }, 'Failed to start outbox service');
    process.exit(1);
  });
}

export default OutboxService;