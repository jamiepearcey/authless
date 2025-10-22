import { Client } from "pg";
import { connect, NatsConnection, JetStreamClient, StringCodec, headers, DiscardPolicy, StorageType, RetentionPolicy } from "nats";

const sc = StringCodec();
const MAX_TRIES = 10;
const BATCH_SIZE = 100;
const IDLE_SLEEP_MS = 500;

interface ProcessorConfig {
  databaseUrl: string;
  natsUrl: string;
  batchSize?: number;
  maxTries?: number;
  idleSleepMs?: number;
  logger?: {
    info: (obj: any, msg?: string) => void;
    error: (obj: any, msg?: string) => void;
    warn: (obj: any, msg?: string) => void;
    debug: (obj: any, msg?: string) => void;
  };
}

interface OutboxEventRow {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  tenantId: string | null; // Allow null for cross-tenant/platform events
  payloadJson: any;
  idempotencyKey: string | null;
  status: string;
  tries: number;
  createdAt: Date;
  nextAttemptAt: Date | null;
  sentAt: Date | null;
  lastError: string | null;
}

export class OutboxProcessor {
  private pg: Client;
  private nats: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private isRunning = false;
  private shouldStop = false;
  private wakeupPromise: (() => void) | null = null;
  private logger?: ProcessorConfig['logger'];

  constructor(private config: ProcessorConfig) {
    this.pg = new Client({ 
      connectionString: config.databaseUrl
    });
    this.logger = config.logger;
  }

  private backoff(tries: number): number {
    const base = Math.min(tries, 6); // cap exponential growth
    return 1000 * Math.pow(2, base) + Math.floor(Math.random() * 250); // ms + jitter
  }

  private async queryWithTimeout(query: string, params: any[], timeoutMs: number = 10000): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    const queryPromise = this.pg.query(query, params);

    return Promise.race([queryPromise, timeoutPromise]);
  }

  private wakeup() {
    if (this.wakeupPromise) {
      this.wakeupPromise();
      this.wakeupPromise = null;
    }
  }

  private async waitForWakeup(): Promise<void> {
    return new Promise((resolve) => {
      this.wakeupPromise = resolve;
      // Fallback timeout in case notification is missed
      setTimeout(resolve, this.config.idleSleepMs || IDLE_SLEEP_MS);
    });
  }

  async init(): Promise<void> {
    this.logger?.info({}, 'Initializing Outbox Processor...');
    
    // Connect to PostgreSQL
    await this.pg.connect();
    this.logger?.info({}, 'Connected to PostgreSQL');

    // Set up LISTEN/NOTIFY
    this.pg.on('notification', (msg: any) => {
      if (msg.channel === 'outbox_wakeup') {
        this.logger?.info({}, 'Received outbox wakeup notification');
        this.wakeup();
      }
    });
    
    await this.pg.query('LISTEN outbox_wakeup');
    this.logger?.info({}, 'Listening for outbox notifications');

    // Connect to NATS JetStream with simplified timeout
    this.logger?.info({}, 'Connecting to NATS...');
    this.nats = await connect({ 
      servers: this.config.natsUrl,
      timeout: 5000
    });
    this.logger?.info({}, 'Connected to NATS successfully');
    
    // Create JetStream client with extended timeout
    this.logger?.info({}, 'Creating JetStream client...');
    
    // Wrap JetStream creation in a timeout to prevent hanging
    const jetstreamPromise = Promise.resolve(this.nats!.jetstream({
      timeout: 30000 // 30 second JetStream operation timeout
    }));
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('JetStream creation timeout after 10 seconds')), 10000);
    });
    
    this.js = await Promise.race([jetstreamPromise, timeoutPromise]);
    this.logger?.info({}, 'JetStream client created successfully');
    
    // Create the EVENTS stream if it doesn't exist
    // Don't fail initialization if stream creation fails - we'll retry during processing
    this.ensureStreamExists().catch(error => {
      this.logger?.warn({ error }, 'Failed to ensure JetStream stream exists during init, will retry during processing');
    });
    
    this.logger?.info({}, 'Connected to NATS JetStream with extended timeouts');

    this.logger?.info({}, 'Outbox Processor initialized');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger?.info({}, 'Processor is already running');
      return;
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.logger?.info({}, 'Starting outbox processing loop...');

    while (!this.shouldStop) {
      try {
        const processedCount = await this.processBatch();
        
        if (processedCount === 0) {
          // No events to process, wait for notification or timeout
          await this.waitForWakeup();
        }
      } catch (error) {
        this.logger?.error({ error }, 'Error in processing loop');
        // Short sleep to avoid tight loop on persistent errors
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    this.isRunning = false;
    this.logger?.info({}, 'Outbox processor stopped');
  }

  async stop(): Promise<void> {
    this.logger?.info({}, 'Stopping outbox processor...');
    this.shouldStop = true;
    this.wakeup(); // Wake up if waiting
    
    // Wait for current processing to complete
    while (this.isRunning) {
      await new Promise(r => setTimeout(r, 100));
    }
    
    this.logger?.info({}, 'Outbox processor stopped');
  }

  private async processBatch(): Promise<number> {
    if (!this.js) {
      throw new Error('JetStream client not initialized');
    }

    // Claim a batch of pending events (case-insensitive status check) with timeout
    const { rows } = await this.queryWithTimeout(`
      WITH cte AS (
        SELECT id
        FROM "OutboxEvent"
        WHERE UPPER(status) = 'PENDING' 
          AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= NOW())
        ORDER BY "createdAt" ASC, id ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "OutboxEvent" o
      SET status = 'processing'
      FROM cte
      WHERE o.id = cte.id
      RETURNING o.*;
    `, [this.config.batchSize || BATCH_SIZE], 10000); // 10 second timeout for batch queries

    if (rows.length === 0) {
      return 0;
    }

    this.logger?.info(`📦 Processing batch of ${rows.length} events`);

    let successCount = 0;
    let errorCount = 0;

    for (const event of rows as OutboxEventRow[]) {
      const success = await this.processEvent(event);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    this.logger?.info(`✅ Processed batch: ${successCount} success, ${errorCount} errors`);
    return rows.length;
  }

  private async processEvent(event: OutboxEventRow): Promise<boolean> {
    this.logger?.info({
      eventId: event.id,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      tenantId: event.tenantId,
      tries: event.tries,
      status: event.status,
      createdAt: event.createdAt.toISOString()
    }, `🔄 Processing event ${event.id} (${event.eventType})`);

    try {
      if (!this.js) {
        throw new Error('JetStream client not initialized');
      }

      // Ensure the stream exists before publishing (outside transaction)
      try {
        await this.ensureStreamExists();
      } catch (error) {
        this.logger?.warn({ error }, 'Failed to ensure stream exists, continuing with publish attempt');
      }

      // Prepare the event payload for JetStream
      // Create a normalized AuditEvent format for the audit service
      const jetStreamEvent = {
        // Required AuditEvent fields
        id: String(event.id),
        eventType: String(event.eventType || 'unknown'),
        eventName: String(event.eventType || 'unknown'),
        tenantId: event.tenantId ? String(event.tenantId) : null,
        userId: String(event.payloadJson?.createdBy || event.payloadJson?.updatedBy || event.payloadJson?.deletedBy || event.payloadJson?.userId || 'system'),
        aggregateType: String(event.aggregateType || 'unknown'),
        aggregateId: String(event.aggregateId || 'unknown'),
        timestamp: event.createdAt.toISOString(),
        source: {
          service: 'outbox-service',
          version: '1.0.0',
          host: process.env.HOSTNAME || 'localhost',
          requestId: String(event.idempotencyKey || event.id),
          correlationId: String((event as any).traceId || ''),
        },
        actor: {
          type: 'user' as const,
          id: String(event.payloadJson?.createdBy || event.payloadJson?.updatedBy || event.payloadJson?.deletedBy || event.payloadJson?.userId || 'system'),
          name: String(event.payloadJson?.createdByName || event.payloadJson?.updatedByName || event.payloadJson?.deletedByName || event.payloadJson?.userName || ''),
          email: String(event.payloadJson?.createdByEmail || event.payloadJson?.updatedByEmail || event.payloadJson?.deletedByEmail || event.payloadJson?.userEmail || ''),
          ipAddress: String(event.payloadJson?.ipAddress || ''),
          userAgent: String(event.payloadJson?.userAgent || ''),
        },
        resource: {
          type: String(event.aggregateType || 'unknown'),
          id: String(event.aggregateId || 'unknown'),
          name: String(event.payloadJson?.name || event.payloadJson?.title || ''),
          attributes: event.payloadJson,
        },
        action: {
          type: String(event.eventType || 'unknown'),
          description: `Created ${String(event.aggregateType || 'unknown')}`,
          outcome: 'success' as const,
          reason: 'Event processed successfully',
        },
        metadata: {
          outboxId: String(event.id),
          outboxEventType: String(event.eventType || 'unknown'),
          outboxCreated: event.createdAt.toISOString(),
          outboxIdempotencyKey: String(event.idempotencyKey || event.id),
        },
        originalPayload: event.payloadJson,
      };

      // Derive subject from event type and tenant
      const subject = this.deriveSubject(event.eventType, event.tenantId);

      // Create headers for the message with safe string conversion
      const msgHeaders = headers();
      const safeHeaderValue = (value: any, fallback: string = 'unknown'): string => {
        if (value === null || value === undefined) return fallback;
        return String(value).trim() || fallback;
      };
      
      msgHeaders.set('Event-Type', safeHeaderValue(event.eventType, 'unknown'));
      msgHeaders.set('Aggregate-Type', safeHeaderValue(event.aggregateType, 'unknown'));
      msgHeaders.set('Aggregate-Id', safeHeaderValue(event.aggregateId, 'unknown'));
      msgHeaders.set('Tenant-Id', safeHeaderValue(event.tenantId, 'system'));
      msgHeaders.set('Outbox-Event-Id', safeHeaderValue(event.id, 'unknown'));

      // Publish to JetStream with broker deduplication and timeout
      this.logger?.info({
        eventId: event.id,
        eventType: event.eventType,
        subject,
        tenantId: event.tenantId,
        jetStreamEvent: jetStreamEvent,
        headers: msgHeaders.toString()
      }, `🚀 Publishing event ${event.id} to subject: ${subject}`);

      // Publish to JetStream (outside transaction to avoid long-running locks)
      const publishResult = await this.js.publish(
        subject, 
        sc.encode(JSON.stringify(jetStreamEvent)), {
        msgID: safeHeaderValue(event.idempotencyKey || event.id, String(event.id)),
        headers: msgHeaders,
        timeout: 20000 // 20 second timeout for individual publish operations
      });

      this.logger?.info({
        eventId: event.id,
        subject,
        publishResult: {
          seq: publishResult.seq,
          duplicate: publishResult.duplicate,
          stream: publishResult.stream
        }
      }, `✅ JetStream publish successful for event ${event.id}`);

      // Mark as sent in a short transaction with timeout
      this.logger?.info(`💾 Updating event ${event.id} status to 'sent'`);
      await this.queryWithTimeout(
        'UPDATE "OutboxEvent" SET status = $2, "sentAt" = NOW(), "lastError" = NULL WHERE id = $1',
        [event.id, 'sent'],
        5000 // 5 second timeout for status updates
      );

      this.logger?.info(`📤 Event ${event.id} (${event.eventType}) published successfully`);
      return true;

    } catch (error: any) {
      const tries = event.tries + 1;
      const maxTries = this.config.maxTries || MAX_TRIES;
      const delayMs = this.backoff(tries);
      const newStatus = tries >= maxTries ? 'dead' : 'pending';
      const errorMessage = error?.message || String(error);

      // Enhanced error logging with detailed context
      const errorDetails = {
        eventId: event.id,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        tenantId: event.tenantId,
        subject: this.deriveSubject(event.eventType, event.tenantId),
        attempt: tries,
        maxTries,
        error: errorMessage,
        errorCode: error?.code,
        errorStatus: error?.status,
        errorResponse: error?.response?.data,
        errorHeaders: error?.response?.headers,
        stack: error?.stack,
        jetStreamEvent: {
          outboxId: event.id,
          outboxEventType: event.eventType,
          outboxCreated: event.createdAt.toISOString(),
          outboxIdempotencyKey: event.idempotencyKey || event.id,
        }
      };

      this.logger?.info({
        eventId: event.id,
        newStatus,
        tries,
        errorMessage,
        delayMs
      }, `💾 Updating event ${event.id} status to '${newStatus}' after error`);

      await this.queryWithTimeout(
        `UPDATE "OutboxEvent"
         SET status = $2, tries = $3, "lastError" = $4,
             "nextAttemptAt" = NOW() + MAKE_INTERVAL(secs => $5 / 1000.0)
         WHERE id = $1`,
        [event.id, newStatus, tries, errorMessage, delayMs],
        5000 // 5 second timeout for error updates
      );

      if (newStatus === 'dead') {
        this.logger?.error(errorDetails, `💀 Event ${event.id} marked as dead after ${tries} attempts`);
      } else {
        console.warn(`⚠️ Event ${event.id} failed (attempt ${tries}/${maxTries}), will retry in ${delayMs}ms: ${errorMessage}`);
        console.warn(`🔍 Error details:`, JSON.stringify(errorDetails, null, 2));
      }

      return false;
    }
  }

  private async ensureStreamExists(): Promise<void> {
    try {
      const streamName = 'EVENTS';
      
      // Get JetStream manager for stream operations
      const jsm = await this.js!.jetstreamManager();
      
      // Try to get the stream info to see if it exists
      try {
        await jsm.streams.info(streamName);
        this.logger?.info({ streamName }, 'JetStream stream already exists');
        return;
      } catch (error: any) {
        // Stream doesn't exist, create it
        if (error.code === '404' || error.message?.includes('not found')) {
          this.logger?.info({ streamName }, 'Creating JetStream stream...');
          
          await jsm.streams.add({
            name: streamName,
            subjects: ['events.*.*'],
            retention: RetentionPolicy.Limits,
            max_age: 24 * 60 * 60 * 1000 * 1000 * 1000, // 24 hours in nanoseconds
            max_msgs: 1000000,
            max_bytes: 1024 * 1024 * 1024, // 1GB
            storage: StorageType.File,
            num_replicas: 1,
            discard: DiscardPolicy.Old,
          });
          
          this.logger?.info({ streamName }, 'JetStream stream created successfully');
        } else {
          throw error;
        }
      }
    } catch (error) {
      this.logger?.error({ error }, 'Failed to ensure JetStream stream exists');
      throw error;
    }
  }

  private deriveSubject(eventType: string | null, tenantId: string | null): string {
    // Handle null/empty tenantId by using 'system' as the tenant segment for NATS subjects
    const tenant = tenantId && typeof tenantId === 'string' && tenantId.trim() ? tenantId : 'system';
    const safeEventType = eventType && typeof eventType === 'string' ? eventType : 'unknown';
    return `events.${tenant}.${safeEventType.replace(/\./g, '_')}`;
  }

  async close(): Promise<void> {
    this.logger?.info({}, 'Closing Outbox Processor...');
    
    await this.stop();
    
    if (this.nats && !this.nats.isClosed()) {
      await this.nats.close();
    }
    
    if (this.pg) {
      await this.pg.end();
    }
    
    this.logger?.info({}, 'Outbox Processor closed');
  }

  async getStats() {
    const { rows } = await this.pg.query(`
      SELECT 
        status,
        COUNT(*) as count,
        MIN("createdAt") as oldest,
        MAX("createdAt") as newest
      FROM "OutboxEvent"
      GROUP BY status
      ORDER BY status
    `);

    return {
      byStatus: rows.reduce((acc: Record<string, any>, row: Record<string, any>) => {
        acc[row.status] = {
          count: parseInt(row.count),
          oldest: row.oldest,
          newest: row.newest
        };
        return acc;
      }, {} as Record<string, any>),
      timestamp: new Date()
    };
  }
}

// Main execution when run directly
async function main() {
  const config: ProcessorConfig = {
    databaseUrl: process.env.DATABASE_URL!,
    natsUrl: process.env.NATS_URL || 'nats://127.0.0.1:4222',
    batchSize: parseInt(process.env.BATCH_SIZE || '100'),
    maxTries: parseInt(process.env.MAX_TRIES || '10'),
    idleSleepMs: parseInt(process.env.IDLE_SLEEP_MS || '500'),
  };

  if (!config.databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const processor = new OutboxProcessor(config);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n📤 Received ${signal}, shutting down gracefully...`);
    await processor.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await processor.init();
    await processor.start();
  } catch (error) {
    console.error('Failed to start outbox processor:', error);
    await processor.close();
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}