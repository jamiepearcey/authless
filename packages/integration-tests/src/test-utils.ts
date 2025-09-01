import { Client } from 'pg';
import { connect, NatsConnection, JetStreamClient, StringCodec } from 'nats';
import { OutboxRepository, CreateOutboxEventInput } from '@db/base';
import { PrismaClient } from '@db/base';

const sc = StringCodec();

export interface TestEnvironment {
  pg: Client;
  prisma: PrismaClient;
  nats: NatsConnection;
  js: JetStreamClient;
  outboxRepo: OutboxRepository;
  cleanup: () => Promise<void>;
}

export async function createTestEnvironment(): Promise<TestEnvironment> {
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/beatthefine_test';
  const NATS_URL = process.env.NATS_URL || 'nats://localhost:4223';

  // Setup PostgreSQL
  const pg = new Client({ connectionString: DATABASE_URL });
  await pg.connect();

  // Setup Prisma
  const prisma = new PrismaClient({
    datasourceUrl: DATABASE_URL,
  });

  // Setup NATS
  const nats = await connect({ servers: NATS_URL });
  const js = nats.jetstream();

  // Setup repositories
  const outboxRepo = new OutboxRepository(prisma);

  const cleanup = async () => {
    await prisma.$disconnect();
    await pg.end();
    if (!nats.isClosed()) {
      await nats.close();
    }
  };

  return {
    pg,
    prisma,
    nats,
    js,
    outboxRepo,
    cleanup,
  };
}

export async function createTestEvent(overrides?: Partial<CreateOutboxEventInput>): Promise<CreateOutboxEventInput> {
  return {
    eventType: 'user.registered',
    aggregateType: 'user',
    aggregateId: `user-${Date.now()}`,
    tenantId: 'test-tenant',
    payloadJson: {
      userId: `user-${Date.now()}`,
      email: 'test@example.com',
      name: 'Test User',
      action: 'registered',
    },
    idempotencyKey: `test-${Date.now()}-${Math.random()}`,
    ...overrides,
  };
}

export function createEmailEvent(): CreateOutboxEventInput {
  const timestamp = Date.now();
  return {
    eventType: 'notification.created',
    aggregateType: 'notification',
    aggregateId: `notification-${timestamp}`,
    tenantId: 'test-tenant',
    payloadJson: {
      notificationId: `notification-${timestamp}`,
      title: 'Test Notification',
      message: 'This is a test notification for integration testing',
      priority: 'normal',
      recipients: [
        {
          userId: `user-${timestamp}`,
          email: 'test@example.com',
          channel: 'email',
        }
      ],
      metadata: {
        testRun: true,
        timestamp: timestamp,
      }
    },
    idempotencyKey: `email-test-${timestamp}`,
  };
}

export async function waitForMessage(
  js: JetStreamClient, 
  subject: string, 
  timeoutMs: number = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for message on ${subject}`));
    }, timeoutMs);

    // Create a temporary consumer to get the message
    const consumerName = `test-consumer-${Date.now()}`;
    
    js.consumers.get('events', consumerName).then(async (consumer) => {
      const messages = await consumer.consume({ max_messages: 1 });
      
      for await (const msg of messages) {
        clearTimeout(timeout);
        const data = JSON.parse(sc.decode(msg.data));
        msg.ack();
        await consumer.delete();
        resolve(data);
        return;
      }
    }).catch(async () => {
      // Consumer doesn't exist, create it
      try {
        const consumer = await js.consumers.add('events', {
          name: consumerName,
          filter_subject: subject,
          deliver_policy: 'new',
          ack_policy: 'explicit',
        });
        
        const messages = await consumer.consume({ max_messages: 1 });
        
        for await (const msg of messages) {
          clearTimeout(timeout);
          const data = JSON.parse(sc.decode(msg.data));
          msg.ack();
          await consumer.delete();
          resolve(data);
          return;
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  });
}

export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeoutMs: number = 5000,
  pollMs: number = 100
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, pollMs));
  }
  
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}