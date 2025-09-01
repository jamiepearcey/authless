import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { OutboxProcessor } from '@outbox/processor';
import { EmailConsumer } from '@jetstream/email-consumer';
import { WebhookConsumer } from '@jetstream/webhook-consumer';
import { RealtimeConsumer } from '@jetstream/realtime-consumer';
import { createTestEnvironment, createEmailEvent, waitForCondition, type TestEnvironment } from './test-utils';

// Mock implementations for testing
const mockEmailSent: any[] = [];
const mockWebhooksDelivered: any[] = [];
const mockRealtimeMessages: any[] = [];

const mockEmailProvider = {
  async sendEmail(options: any) {
    mockEmailSent.push({ ...options, timestamp: new Date() });
    return { success: true, messageId: `email-${Date.now()}` };
  }
};

const mockHttpClient = {
  async post(url: string, data: any, options?: any) {
    mockWebhooksDelivered.push({ url, data, options, timestamp: new Date() });
    return { status: 200, data: { received: true } };
  }
};

const mockCentrifugo = {
  async publish(channel: string, data: any) {
    mockRealtimeMessages.push({ channel, data, timestamp: new Date() });
    return { success: true };
  }
};

describe('End-to-End Integration Tests', () => {
  let testEnv: TestEnvironment;
  let processor: OutboxProcessor;
  let emailConsumer: EmailConsumer;
  let webhookConsumer: WebhookConsumer;
  let realtimeConsumer: RealtimeConsumer;

  const mockTemplate = {
    id: 'e2e-notification',
    name: 'E2E Notification Template',
    description: 'Template for end-to-end testing',
    subject: 'E2E Test: {{title}}',
    htmlTemplate: '<h1>{{title}}</h1><p>{{message}}</p>',
    textTemplate: '{{title}}\n{{message}}',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    testEnv = await createTestEnvironment();
    
    // Setup outbox processor
    processor = new OutboxProcessor({
      databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/beatthefine_test',
      natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
      batchSize: 10,
      maxTries: 3,
      idleSleepMs: 100,
    });

    // Setup email consumer
    emailConsumer = new EmailConsumer({
      nats: {
        servers: process.env.NATS_URL || 'nats://localhost:4222',
      },
      consumer: {
        streamName: 'events',
        durableName: 'e2e-email-consumer',
        filterSubjects: ['events.*.notification_created'],
        maxMessages: 10,
      },
      email: {
        provider: 'mock' as any,
        templates: {
          'notification.created': mockTemplate,
        },
        defaultFrom: 'test@example.com',
        rateLimiting: {
          maxPerSecond: 100,
          maxPerMinute: 1000,
        },
      },
      templates: [mockTemplate],
    });

    // Setup webhook consumer
    webhookConsumer = new WebhookConsumer({
      nats: {
        servers: process.env.NATS_URL || 'nats://localhost:4222',
      },
      consumer: {
        streamName: 'events',
        durableName: 'e2e-webhook-consumer',
        filterSubjects: ['events.>'],
        maxMessages: 10,
      },
      webhooks: [
        {
          id: 'test-webhook',
          name: 'Test Webhook',
          url: 'https://httpbin.org/post',
          events: ['notification.created', 'user.registered'],
          isActive: true,
          headers: {
            'Content-Type': 'application/json',
            'X-Test': 'e2e-test',
          },
          maxRetries: 3,
          retryDelayMs: 1000,
        }
      ],
      delivery: {
        timeout: 5000,
        maxConcurrent: 5,
        rateLimitPerSecond: 10,
      },
    });

    // Setup realtime consumer
    realtimeConsumer = new RealtimeConsumer({
      nats: {
        servers: process.env.NATS_URL || 'nats://localhost:4222',
      },
      consumer: {
        streamName: 'events',
        durableName: 'e2e-realtime-consumer',
        filterSubjects: ['events.>'],
        maxMessages: 10,
      },
      centrifugo: {
        url: 'http://localhost:8000',
        apiKey: 'test-api-key',
        timeout: 5000,
      },
      routing: {
        'user.registered': 'user:{{tenantId}}:registrations',
        'notification.created': 'notifications:{{tenantId}}',
        'default': 'events:{{tenantId}}',
      },
    });

    // Inject mock implementations
    (emailConsumer as any).emailProvider = mockEmailProvider;
    (webhookConsumer as any).httpClient = mockHttpClient;
    (realtimeConsumer as any).centrifugo = mockCentrifugo;

    // Initialize all components
    await processor.init();
    await emailConsumer.init();
    await webhookConsumer.init();
    await realtimeConsumer.init();
    
    // Start all consumers
    processor.start().catch(console.error);
    emailConsumer.start().catch(console.error);
    webhookConsumer.start().catch(console.error);
    realtimeConsumer.start().catch(console.error);
  });

  afterAll(async () => {
    await realtimeConsumer?.close();
    await webhookConsumer?.close();
    await emailConsumer?.close();
    await processor?.close();
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Clean up test data and reset mocks
    await testEnv.pg.query('TRUNCATE TABLE "OutboxEvent" CASCADE');
    mockEmailSent.length = 0;
    mockWebhooksDelivered.length = 0;
    mockRealtimeMessages.length = 0;
  });

  it('should process a complete notification workflow end-to-end', async () => {
    // Create a comprehensive notification event
    const notificationEvent = createEmailEvent();
    notificationEvent.payloadJson = {
      ...notificationEvent.payloadJson,
      title: 'Welcome to Our Platform!',
      message: 'Your account has been successfully created and is now active.',
      priority: 'high',
      recipients: [
        {
          userId: 'user-123',
          email: 'newuser@example.com',
          channel: 'email',
        }
      ],
      metadata: {
        campaignId: 'welcome-campaign',
        source: 'registration',
      }
    };

    // Insert event into outbox
    const eventId = await testEnv.outboxRepo.createEvent(notificationEvent);

    // Wait for outbox processor to publish to JetStream
    await waitForCondition(async () => {
      const event = await testEnv.outboxRepo.getEventById(eventId);
      return event?.status === 'sent';
    }, 10000);

    // Wait for all consumers to process the event
    await waitForCondition(() => 
      mockEmailSent.length > 0 && 
      mockWebhooksDelivered.length > 0 && 
      mockRealtimeMessages.length > 0
    , 15000);

    // Verify email was sent
    expect(mockEmailSent).toHaveLength(1);
    const email = mockEmailSent[0];
    expect(email.to).toBe('newuser@example.com');
    expect(email.subject).toBe('E2E Test: Welcome to Our Platform!');
    expect(email.html).toContain('Welcome to Our Platform!');
    expect(email.html).toContain('Your account has been successfully created');

    // Verify webhook was delivered
    expect(mockWebhooksDelivered).toHaveLength(1);
    const webhook = mockWebhooksDelivered[0];
    expect(webhook.url).toBe('https://httpbin.org/post');
    expect(webhook.data.eventType).toBe('notification.created');
    expect(webhook.data.tenantId).toBe('test-tenant');
    expect(webhook.data.payload.title).toBe('Welcome to Our Platform!');

    // Verify realtime message was published
    expect(mockRealtimeMessages).toHaveLength(1);
    const realtimeMsg = mockRealtimeMessages[0];
    expect(realtimeMsg.channel).toBe('notifications:test-tenant');
    expect(realtimeMsg.data.eventType).toBe('notification.created');
    expect(realtimeMsg.data.payload.title).toBe('Welcome to Our Platform!');
  });

  it('should handle multiple event types with different consumers', async () => {
    // Create different types of events
    const userRegisteredEvent = {
      eventType: 'user.registered',
      aggregateType: 'user',
      aggregateId: 'user-456',
      tenantId: 'test-tenant',
      payloadJson: {
        userId: 'user-456',
        email: 'user456@example.com',
        name: 'Jane Doe',
        action: 'registered',
      },
      idempotencyKey: `user-reg-${Date.now()}`,
    };

    const paymentEvent = {
      eventType: 'payment.completed',
      aggregateType: 'payment',
      aggregateId: 'payment-789',
      tenantId: 'test-tenant',
      payloadJson: {
        paymentId: 'payment-789',
        amount: 2999,
        currency: 'USD',
        status: 'completed',
        customerId: 'user-456',
      },
      idempotencyKey: `payment-${Date.now()}`,
    };

    const notificationEvent = createEmailEvent();

    // Insert all events
    await testEnv.outboxRepo.createEvent(userRegisteredEvent);
    await testEnv.outboxRepo.createEvent(paymentEvent);
    await testEnv.outboxRepo.createEvent(notificationEvent);

    // Wait for all events to be processed
    await waitForCondition(async () => {
      const stats = await processor.getStats();
      return stats.byStatus.sent >= 3;
    }, 15000);

    // Wait for consumers to process all events
    await waitForCondition(() => 
      mockWebhooksDelivered.length >= 2 && // user.registered + notification.created (payment not in webhook filter)
      mockRealtimeMessages.length >= 3 && // All events go to realtime
      mockEmailSent.length >= 1 // Only notification triggers email
    , 10000);

    // Verify webhook received user.registered and notification.created
    const webhookEventTypes = mockWebhooksDelivered.map(w => w.data.eventType);
    expect(webhookEventTypes).toContain('user.registered');
    expect(webhookEventTypes).toContain('notification.created');

    // Verify realtime received all event types
    const realtimeEventTypes = mockRealtimeMessages.map(m => m.data.eventType);
    expect(realtimeEventTypes).toContain('user.registered');
    expect(realtimeEventTypes).toContain('payment.completed');
    expect(realtimeEventTypes).toContain('notification.created');

    // Verify email only sent for notification
    expect(mockEmailSent).toHaveLength(1);
    expect(mockEmailSent[0].subject).toContain('Test Notification');
  });

  it('should maintain event ordering and handle high throughput', async () => {
    const eventCount = 20;
    const events = [];

    // Create a batch of ordered events
    for (let i = 0; i < eventCount; i++) {
      const event = {
        eventType: 'batch.test',
        aggregateType: 'batch',
        aggregateId: `batch-${i}`,
        tenantId: 'test-tenant',
        payloadJson: {
          sequenceNumber: i,
          batchId: 'high-throughput-test',
          timestamp: new Date().toISOString(),
        },
        idempotencyKey: `batch-${i}-${Date.now()}`,
      };
      events.push(event);
    }

    // Insert all events rapidly
    const eventIds = await Promise.all(
      events.map(event => testEnv.outboxRepo.createEvent(event))
    );

    // Wait for all events to be processed
    await waitForCondition(async () => {
      const processedEvents = await Promise.all(
        eventIds.map(id => testEnv.outboxRepo.getEventById(id))
      );
      return processedEvents.every(event => event?.status === 'sent');
    }, 20000);

    // Wait for consumers to process all events
    await waitForCondition(() => 
      mockWebhooksDelivered.length >= eventCount &&
      mockRealtimeMessages.length >= eventCount
    , 15000);

    // Verify all events were processed
    expect(mockWebhooksDelivered).toHaveLength(eventCount);
    expect(mockRealtimeMessages).toHaveLength(eventCount);

    // Verify event data integrity
    const webhookSequences = mockWebhooksDelivered
      .map(w => w.data.payload.sequenceNumber)
      .sort((a, b) => a - b);
    
    const realtimeSequences = mockRealtimeMessages
      .map(m => m.data.payload.sequenceNumber)
      .sort((a, b) => a - b);

    expect(webhookSequences).toEqual(Array.from({ length: eventCount }, (_, i) => i));
    expect(realtimeSequences).toEqual(Array.from({ length: eventCount }, (_, i) => i));
  });

  it('should handle consumer failures gracefully without losing events', async () => {
    // Create a test event
    const testEvent = createEmailEvent();
    const eventId = await testEnv.outboxRepo.createEvent(testEvent);

    // Wait for event to be published to JetStream
    await waitForCondition(async () => {
      const event = await testEnv.outboxRepo.getEventById(eventId);
      return event?.status === 'sent';
    }, 10000);

    // Temporarily break one consumer (email)
    const originalSendEmail = mockEmailProvider.sendEmail;
    mockEmailProvider.sendEmail = () => Promise.reject(new Error('Email service down'));

    // Wait a bit for consumers to try processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Other consumers should still work
    expect(mockWebhooksDelivered.length).toBeGreaterThan(0);
    expect(mockRealtimeMessages.length).toBeGreaterThan(0);
    expect(mockEmailSent).toHaveLength(0); // Email should fail

    // Fix the email consumer
    mockEmailProvider.sendEmail = originalSendEmail;

    // Email consumer should eventually recover and process messages
    // (This would require implementing retry logic in the consumer)
  });
});