import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { OutboxProcessor } from '@outbox/processor';
import { EmailConsumer } from '@jetstream/email-consumer';
import { createTestEnvironment, createEmailEvent, waitForCondition, type TestEnvironment } from './test-utils';

// Mock email template for testing
const mockTemplate = {
  id: 'test-notification',
  name: 'Test Notification Template',
  description: 'Template for testing',
  subject: 'Test: {{title}}',
  htmlTemplate: `
    <h1>{{title}}</h1>
    <p>{{message}}</p>
    <p>Priority: {{priority}}</p>
  `,
  textTemplate: '{{title}}\n{{message}}\nPriority: {{priority}}',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Email Consumer Integration Tests', () => {
  let testEnv: TestEnvironment;
  let processor: OutboxProcessor;
  let emailConsumer: EmailConsumer;
  let mockEmailSent: any[] = [];

  // Mock email provider
  const mockEmailProvider = {
    async sendEmail(options: any) {
      console.log('📧 Mock email sent:', options);
      mockEmailSent.push({
        ...options,
        timestamp: new Date(),
      });
      return { success: true, messageId: `mock-${Date.now()}` };
    }
  };

  beforeAll(async () => {
    testEnv = await createTestEnvironment();
    
    // Setup outbox processor
    processor = new OutboxProcessor({
      databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/beatthefine_test',
      natsUrl: process.env.NATS_URL || 'nats://localhost:4223',
      batchSize: 10,
      maxTries: 3,
      idleSleepMs: 100,
    });

    await processor.init();

    // Setup email consumer with new React Email system
    emailConsumer = new EmailConsumer({
      natsUrl: process.env.NATS_URL || 'nats://localhost:4223',
      streamName: 'events',
      consumerName: 'test-email-consumer',
      filterSubjects: ['events.*.notification_created'],
      batchSize: 10,
      concurrency: 3,
      provider: {
        type: 'smtp',
        host: 'localhost',
        port: 1025,
        secure: false,
        auth: { user: 'test', pass: 'test' },
      },
      defaultFrom: {
        email: 'test@example.com',
        name: 'Test System',
      },
      routingRules: [
        {
          eventPattern: 'notification.created',
          templateName: 'test-notification',
          priority: 'normal',
          extractVariables: (event) => ({
            title: event.payload.title || 'Test Title',
            message: event.payload.message || 'Test Message',
            priority: event.payload.priority || 'normal',
          }),
        },
      ],
      templates: new Map([
        ['test-notification', {
          name: 'test-notification',
          component: (props: any) => null, // Mock React component
          subject: 'Test: {{title}}',
          variables: ['title', 'message', 'priority'],
        }],
      ]),
      database: {
        getEmailTemplates: async () => [], // Legacy support
        getRecipients: async (eventName: string, tenantId?: string) => [
          { email: 'test@example.com', name: 'Test User' }
        ],
        logEmailDelivery: async (result: any) => {
          console.log('Email delivery logged:', result);
        },
      },
    });

    // Note: The new system uses the configured email provider

    // Start both processor and consumer in background
    processor.start().catch(console.error);
    emailConsumer.start().catch(console.error);
  });

  afterAll(async () => {
    await emailConsumer?.stop();
    await processor?.close();
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Clean up any existing events and reset mock
    await testEnv.pg.query('TRUNCATE TABLE "OutboxEvent" CASCADE');
    mockEmailSent = [];
  });

  it('should receive notification events and send emails', async () => {
    // Create a notification event that should trigger an email
    const emailEvent = createEmailEvent();

    // Insert event into outbox
    const eventId = await testEnv.outboxRepo.createEvent(emailEvent);
    expect(eventId).toBeDefined();

    // Wait for the event to be processed by outbox processor
    await waitForCondition(async () => {
      const event = await testEnv.outboxRepo.getEventById(eventId);
      return event?.status === 'sent';
    }, 10000);

    // Wait for email consumer to receive and process the event
    await waitForCondition(() => mockEmailSent.length > 0, 10000);

    expect(mockEmailSent).toHaveLength(1);
    
    const sentEmail = mockEmailSent[0];
    expect(sentEmail.to).toBe('test@example.com');
    expect(sentEmail.subject).toContain('Test Notification');
    expect(sentEmail.html).toContain('Test Notification');
    expect(sentEmail.html).toContain('This is a test notification for integration testing');
    expect(sentEmail.html).toContain('Priority: normal');
  });

  it('should handle multiple recipients', async () => {
    const emailEvent = createEmailEvent();
    
    // Add multiple recipients
    emailEvent.payloadJson.recipients = [
      {
        userId: 'user-1',
        email: 'user1@example.com',
        channel: 'email',
      },
      {
        userId: 'user-2',
        email: 'user2@example.com',
        channel: 'email',
      },
      {
        userId: 'user-3',
        email: 'user3@example.com',
        channel: 'email',
      },
    ];

    const eventId = await testEnv.outboxRepo.createEvent(emailEvent);

    // Wait for processing
    await waitForCondition(async () => {
      const event = await testEnv.outboxRepo.getEventById(eventId);
      return event?.status === 'sent';
    }, 10000);

    // Wait for all emails to be sent
    await waitForCondition(() => mockEmailSent.length === 3, 10000);

    expect(mockEmailSent).toHaveLength(3);
    
    const recipients = mockEmailSent.map(email => email.to);
    expect(recipients).toContain('user1@example.com');
    expect(recipients).toContain('user2@example.com');
    expect(recipients).toContain('user3@example.com');
  });

  it('should handle template rendering with dynamic data', async () => {
    const emailEvent = createEmailEvent();
    
    // Customize the notification data
    emailEvent.payloadJson.title = 'Welcome to the Platform!';
    emailEvent.payloadJson.message = 'Thank you for signing up. Your account is now active.';
    emailEvent.payloadJson.priority = 'high';

    const eventId = await testEnv.outboxRepo.createEvent(emailEvent);

    await waitForCondition(async () => {
      const event = await testEnv.outboxRepo.getEventById(eventId);
      return event?.status === 'sent';
    }, 10000);

    await waitForCondition(() => mockEmailSent.length > 0, 10000);

    const sentEmail = mockEmailSent[0];
    expect(sentEmail.subject).toBe('Test: Welcome to the Platform!');
    expect(sentEmail.html).toContain('<h1>Welcome to the Platform!</h1>');
    expect(sentEmail.html).toContain('<p>Thank you for signing up. Your account is now active.</p>');
    expect(sentEmail.html).toContain('Priority: high');
    expect(sentEmail.text).toContain('Welcome to the Platform!');
    expect(sentEmail.text).toContain('Priority: high');
  });

  it('should handle email consumer errors gracefully', async () => {
    // Mock email provider to throw an error
    const originalSendEmail = mockEmailProvider.sendEmail;
    mockEmailProvider.sendEmail = vi.fn().mockRejectedValue(new Error('Email service unavailable'));

    const emailEvent = createEmailEvent();
    const eventId = await testEnv.outboxRepo.createEvent(emailEvent);

    await waitForCondition(async () => {
      const event = await testEnv.outboxRepo.getEventById(eventId);
      return event?.status === 'sent';
    }, 10000);

    // Wait a bit for consumer to try processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should not have sent any emails due to error
    expect(mockEmailSent).toHaveLength(0);
    expect(mockEmailProvider.sendEmail).toHaveBeenCalled();

    // Restore original mock
    mockEmailProvider.sendEmail = originalSendEmail;
  });

  it('should filter events correctly based on subject pattern', async () => {
    // Create a non-notification event (should not trigger email)
    const nonEmailEvent = {
      eventType: 'user.registered',
      aggregateType: 'user',
      aggregateId: `user-${Date.now()}`,
      tenantId: 'test-tenant',
      payloadJson: {
        userId: `user-${Date.now()}`,
        email: 'user@example.com',
        name: 'Test User',
      },
      idempotencyKey: `user-test-${Date.now()}`,
    };

    // Create a notification event (should trigger email)
    const emailEvent = createEmailEvent();

    await testEnv.outboxRepo.createEvent(nonEmailEvent);
    await testEnv.outboxRepo.createEvent(emailEvent);

    // Wait for both events to be processed by outbox
    await waitForCondition(async () => {
      const stats = await processor.getStats();
      return stats.byStatus.sent >= 2;
    }, 10000);

    // Wait for potential email processing
    await waitForCondition(() => mockEmailSent.length > 0, 5000);

    // Should only have sent one email (from the notification event)
    expect(mockEmailSent).toHaveLength(1);
  });
});