import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { OutboxProcessor } from '@outbox/processor';
import { createTestEnvironment, createTestEvent, waitForMessage, waitForCondition, type TestEnvironment } from './test-utils';

describe('Outbox Processor Integration Tests', () => {
  let testEnv: TestEnvironment;
  let processor: OutboxProcessor;

  beforeAll(async () => {
    console.log('Setting up test environment...');
    testEnv = await createTestEnvironment();
    console.log('Test environment created');
    
    processor = new OutboxProcessor({
      databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/beatthefine_test',
      natsUrl: process.env.NATS_URL || 'nats://localhost:4223',
      batchSize: 10,
      maxTries: 3,
      idleSleepMs: 100,
    });

    console.log('Initializing outbox processor...');
    await processor.init();
    console.log('Outbox processor initialized');
    
    // Start processor in background
    processor.start().catch(console.error);
    console.log('Outbox processor started');
  }, 30000);

  afterAll(async () => {
    await processor?.close();
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Clean up any existing events
    await testEnv.pg.query('TRUNCATE TABLE "OutboxEvent" CASCADE');
  });

  it('should process outbox events and publish to JetStream', async () => {
    // Create a test event
    const testEvent = await createTestEvent({
      eventType: 'user.registered',
      tenantId: 'test-tenant',
    });

    // Insert event into outbox
    const eventId = await testEnv.outboxRepo.createEvent(testEvent);
    expect(eventId).toBeDefined();

    // Wait for the event to be processed and published
    const subject = `events.test-tenant.user_registered`;
    
    // Wait for message on JetStream
    const receivedMessage = await waitForMessage(testEnv.js, subject, 10000);
    
    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.eventType).toBe('user.registered');
    expect(receivedMessage.tenantId).toBe('test-tenant');
    expect(receivedMessage.aggregateType).toBe('user');
    expect(receivedMessage.payload).toEqual(testEvent.payloadJson);
    
    // Verify event is marked as sent in database
    await waitForCondition(async () => {
      const event = await testEnv.outboxRepo.getEventById(eventId);
      return event?.status === 'sent';
    }, 5000);

    const finalEvent = await testEnv.outboxRepo.getEventById(eventId);
    expect(finalEvent?.status).toBe('sent');
    expect(finalEvent?.lastError).toBeNull();
  });

  it('should handle batch processing correctly', async () => {
    const eventCount = 5;
    const eventIds: string[] = [];

    // Create multiple test events
    for (let i = 0; i < eventCount; i++) {
      const testEvent = await createTestEvent({
        eventType: 'batch.test',
        aggregateId: `batch-${i}`,
        tenantId: 'batch-tenant',
      });
      
      const eventId = await testEnv.outboxRepo.createEvent(testEvent);
      eventIds.push(eventId);
    }

    // Wait for all events to be processed
    await waitForCondition(async () => {
      const events = await Promise.all(
        eventIds.map(id => testEnv.outboxRepo.getEventById(id))
      );
      return events.every(event => event?.status === 'sent');
    }, 10000);

    // Verify all events are sent
    for (const eventId of eventIds) {
      const event = await testEnv.outboxRepo.getEventById(eventId);
      expect(event?.status).toBe('sent');
    }
  });

  it('should handle duplicate events with idempotency key', async () => {
    const idempotencyKey = `unique-test-${Date.now()}`;
    
    // Create two events with the same idempotency key
    const testEvent1 = await createTestEvent({
      idempotencyKey,
      eventType: 'duplicate.test',
    });
    
    const testEvent2 = await createTestEvent({
      idempotencyKey,
      eventType: 'duplicate.test',
      aggregateId: 'different-aggregate', // Different data but same idempotency key
    });

    // Insert both events (second should fail due to unique constraint)
    const eventId1 = await testEnv.outboxRepo.createEvent(testEvent1);
    
    await expect(
      testEnv.outboxRepo.createEvent(testEvent2)
    ).rejects.toThrow(); // Should fail due to unique constraint

    // Verify only one event exists and gets processed
    await waitForCondition(async () => {
      const event = await testEnv.outboxRepo.getEventById(eventId1);
      return event?.status === 'sent';
    }, 5000);

    const finalEvent = await testEnv.outboxRepo.getEventById(eventId1);
    expect(finalEvent?.status).toBe('sent');
  });

  it('should provide accurate statistics', async () => {
    // Create a successful event
    const successEvent = await createTestEvent({ eventType: 'success.test' });
    await testEnv.outboxRepo.createEvent(successEvent);

    // Wait for processing
    await waitForCondition(async () => {
      const stats = await processor.getStats();
      return stats.byStatus.sent >= 1;
    }, 10000);

    const stats = await processor.getStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.byStatus.sent).toBeGreaterThan(0);
    expect(stats.timestamp).toBeInstanceOf(Date);
  });
});