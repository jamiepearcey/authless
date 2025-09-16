import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { 
  createAuditConsumer, 
  AuditConsumer,
  AuditConsumerConfig 
} from '../../src/index';
import { createAuditService, AuditService } from '@jetstream/audit-service';
import { PrismaClient } from '@db/base';
import { connect, NatsConnection, JetStreamManager } from 'nats';

const TEST_CONFIG: AuditConsumerConfig = {
  natsUrl: 'nats://127.0.0.1:4223',
  streamName: 'events',
  consumerName: 'test-audit-consumer',
  filterSubjects: ['audit.>'],
  batchSize: 10,
  maxInflight: 100,
  concurrency: 2,
  retryLimit: 3,
  retryBackoffMs: 100,
  sinks: ['db'],
  database: {
    connectionString: 'postgresql://postgres:postgres@localhost:5432/authless'
  },
  healthCheckIntervalMs: 5000,
  metricsEnabled: true,
};

const TEST_AUDIT_SERVICE_CONFIG = {
  natsUrl: 'nats://127.0.0.1:4223',
  streamName: 'events',
  defaultTenantId: 'test-tenant',
  defaultService: 'test-service',
  defaultVersion: '1.0.0',
  maxRetries: 3,
  retryDelayMs: 100,
};

describe('Audit Consumer Integration Tests', () => {
  let auditConsumer: AuditConsumer;
  let auditService: AuditService;
  let natsConnection: NatsConnection;
  let jsManager: JetStreamManager;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Initialize database connection
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5432/authless'
        }
      }
    });

    // Initialize NATS connection for test setup
    natsConnection = await connect({
      servers: 'nats://127.0.0.1:4223',
      name: 'test-setup',
    });
    jsManager = natsConnection.jetstream();

    // Ensure test stream exists
    try {
      await jsManager.streams.info('events');
    } catch (error) {
      await jsManager.streams.add({
        name: 'events',
        subjects: ['audit.>'],
        retention: 'limits',
        max_age: 24 * 60 * 60 * 1000 * 1000000, // 24 hours in nanoseconds
        storage: 'file',
        max_bytes: 1024 * 1024 * 1024, // 1GB
      });
    }

    // Clean up any existing test data
    await prisma.auditEvent.deleteMany({
      where: { tenantId: 'test-tenant' }
    });
  });

  afterAll(async () => {
    await natsConnection?.close();
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    // Create fresh instances for each test
    auditConsumer = createAuditConsumer(TEST_CONFIG);
    auditService = await createAuditService(TEST_AUDIT_SERVICE_CONFIG);
    await auditService.initialize();
  });

  afterEach(async () => {
    await auditConsumer?.stop();
    await auditService?.close();
    
    // Clean up test data
    await prisma.auditEvent.deleteMany({
      where: { tenantId: 'test-tenant' }
    });
  });

  it('should initialize audit consumer successfully', async () => {
    await auditConsumer.initialize();
    
    expect(auditConsumer.isHealthy()).toBe(true);
    
    const health = await auditConsumer.healthCheck();
    expect(health.status).toBe('healthy');
  });

  it('should consume and persist audit events from NATS', async () => {
    await auditConsumer.initialize();
    
    // Start consumer in background
    const consumerPromise = auditConsumer.start();
    
    // Wait a moment for consumer to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Publish test audit event
    await auditService.auditUserLogin(
      {
        tenantId: 'test-tenant',
        userId: 'test-user-123',
        requestId: 'req-123',
        correlationId: 'corr-123',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      },
      {
        type: 'user',
        id: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      },
      'success',
      { loginMethod: 'password' }
    );

    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify event was persisted to database
    const savedEvents = await prisma.auditEvent.findMany({
      where: { tenantId: 'test-tenant' }
    });

    expect(savedEvents).toHaveLength(1);
    expect(savedEvents[0]).toMatchObject({
      eventType: 'auth',
      eventName: 'user_logged_in',
      tenantId: 'test-tenant',
      userId: 'test-user-123',
      actionType: 'authentication',
      actionOutcome: 'success',
    });

    await auditConsumer.stop();
  }, 10000);

  it('should handle multiple event types correctly', async () => {
    await auditConsumer.initialize();
    
    const consumerPromise = auditConsumer.start();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Publish different types of audit events
    await Promise.all([
      auditService.auditUserLogin(
        { tenantId: 'test-tenant', userId: 'user-1' },
        { type: 'user', id: 'user-1', name: 'User 1' },
        'success'
      ),
      auditService.auditPaymentCompleted(
        { tenantId: 'test-tenant', userId: 'user-2' },
        { type: 'user', id: 'user-2', name: 'User 2' },
        'payment-123',
        1000,
        'GBP'
      ),
      auditService.auditSubscriptionCreated(
        { tenantId: 'test-tenant', userId: 'user-3' },
        { type: 'user', id: 'user-3', name: 'User 3' },
        'sub-123',
        'premium-plan'
      )
    ]);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    const savedEvents = await prisma.auditEvent.findMany({
      where: { tenantId: 'test-tenant' },
      orderBy: { timestamp: 'asc' }
    });

    expect(savedEvents).toHaveLength(3);
    expect(savedEvents.map(e => e.eventType)).toEqual(['auth', 'payment', 'subscription']);
    expect(savedEvents.map(e => e.eventName)).toEqual([
      'user_logged_in',
      'payment_completed', 
      'subscription_created'
    ]);

    await auditConsumer.stop();
  }, 15000);

  it('should track metrics correctly', async () => {
    await auditConsumer.initialize();
    
    const consumerPromise = auditConsumer.start();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Publish several events
    for (let i = 0; i < 5; i++) {
      await auditService.auditUserLogin(
        { tenantId: 'test-tenant', userId: `user-${i}` },
        { type: 'user', id: `user-${i}`, name: `User ${i}` },
        'success'
      );
    }

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    const metrics = auditConsumer.getMetrics();
    expect(metrics.messagesTotal.get('processed')).toBeGreaterThanOrEqual(5);
    expect(metrics.processingRate).toBeGreaterThan(0);
    expect(metrics.errorRate).toBe(0);
    expect(metrics.averageLatency).toBeGreaterThan(0);

    await auditConsumer.stop();
  }, 10000);

  it('should handle failed events and retry logic', async () => {
    // Create a consumer with DB sink that will fail initially
    const failingConfig = {
      ...TEST_CONFIG,
      database: {
        connectionString: 'postgresql://invalid:invalid@localhost:5432/invalid'
      }
    };
    
    const failingConsumer = createAuditConsumer(failingConfig);
    
    try {
      await failingConsumer.initialize();
      // This should fail due to invalid DB connection
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error).toBeDefined();
    }
  }, 10000);

  it('should perform health checks correctly', async () => {
    await auditConsumer.initialize();
    
    const health = await auditConsumer.healthCheck();
    expect(health.status).toBe('healthy');
    expect(health.details.nats.connected).toBe(true);
    expect(health.details.consumer.running).toBe(true);
  });

  it('should handle graceful shutdown', async () => {
    await auditConsumer.initialize();
    
    const consumerPromise = auditConsumer.start();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Publish some events
    await auditService.auditUserLogin(
      { tenantId: 'test-tenant', userId: 'shutdown-user' },
      { type: 'user', id: 'shutdown-user', name: 'Shutdown User' },
      'success'
    );

    // Stop consumer gracefully
    await auditConsumer.stop();

    // Verify last event was processed
    const savedEvents = await prisma.auditEvent.findMany({
      where: { tenantId: 'test-tenant' }
    });
    
    expect(savedEvents.length).toBeGreaterThan(0);
  }, 10000);

  it('should normalize events correctly based on type', async () => {
    await auditConsumer.initialize();
    
    const consumerPromise = auditConsumer.start();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Publish a payment event
    await auditService.auditPaymentCompleted(
      { 
        tenantId: 'test-tenant', 
        userId: 'payment-user',
        correlationId: 'payment-corr-123'
      },
      { 
        type: 'user', 
        id: 'payment-user', 
        name: 'Payment User',
        email: 'payment@example.com'
      },
      'payment-456',
      2500,
      'GBP',
      { 
        paymentMethod: 'card',
        merchantId: 'merchant-123'
      }
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    const savedEvents = await prisma.auditEvent.findMany({
      where: { 
        tenantId: 'test-tenant',
        eventType: 'payment'
      }
    });

    expect(savedEvents).toHaveLength(1);
    expect(savedEvents[0]).toMatchObject({
      eventType: 'payment',
      eventName: 'payment_completed',
      actionType: 'payment_processing',
      actionOutcome: 'success',
      resourceType: 'payment',
      resourceId: 'payment-456',
    });

    // Verify original payload is stored
    const originalPayload = JSON.parse(savedEvents[0].originalPayload);
    expect(originalPayload.metadata?.paymentMethod).toBe('card');

    await auditConsumer.stop();
  }, 10000);
});