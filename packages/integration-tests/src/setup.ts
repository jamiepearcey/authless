import { Client } from 'pg';
import { connect } from 'nats';
import { setupOutboxDatabase } from '@outbox/processor';

export async function setupIntegrationTests() {
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/beatthefine_test';
  const NATS_URL = process.env.NATS_URL || 'nats://localhost:4223';

  console.log('🔧 Setting up integration test environment...');

  // Setup test database
  console.log('📊 Setting up test database...');
  const pg = new Client({ connectionString: DATABASE_URL });
  await pg.connect();
  
  // Clean up any existing test data
  await pg.query('TRUNCATE TABLE "OutboxEvent" CASCADE');
  console.log('🗑️ Cleaned up existing test data');

  await pg.end();

  // Setup outbox database triggers
  console.log('⚡ Setting up outbox triggers...');
  await setupOutboxDatabase(DATABASE_URL);

  // Verify NATS connection
  console.log('📡 Verifying NATS connection...');
  const nats = await connect({ servers: NATS_URL });
  const js = nats.jetstream();
  const jsm = await nats.jetstreamManager();

  // Create test streams if they don't exist
  try {
    await jsm.streams.info('events');
    console.log('✅ Events stream already exists');
  } catch (error) {
    console.log('📊 Creating events stream...');
    await jsm.streams.add({
      name: 'events',
      subjects: ['events.>'],
      retention: 'limits',
      max_age: 60 * 60 * 1000000000, // 1 hour in nanoseconds
      max_msgs: 1000,
      storage: 'memory',
    });
    console.log('✅ Events stream created');
  }

  await nats.close();

  console.log('✅ Integration test environment ready!');
  
  return {
    databaseUrl: DATABASE_URL,
    natsUrl: NATS_URL,
  };
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupIntegrationTests().catch(console.error);
}