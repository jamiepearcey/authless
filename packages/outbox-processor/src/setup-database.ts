import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function setupOutboxDatabase(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    
    console.log('📋 Setting up outbox database triggers and indexes...');
    
    // Read the SQL setup file
    const setupSql = readFileSync(join(__dirname, 'setup-triggers.sql'), 'utf-8');
    
    // Execute the setup SQL
    await client.query(setupSql);
    
    console.log('✅ Outbox database setup completed successfully');
    
    // Verify the setup by checking if the trigger function exists
    const { rows } = await client.query(`
      SELECT proname 
      FROM pg_proc 
      WHERE proname = 'notify_outbox'
    `);
    
    if (rows.length > 0) {
      console.log('✅ Trigger function notify_outbox is installed');
    } else {
      console.warn('⚠️ Trigger function notify_outbox was not found');
    }
    
    // Check if triggers exist
    const triggerCheck = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'OutboxEvent'
        AND trigger_name IN ('trg_outbox_notify', 'trg_outbox_retry_notify')
    `);
    
    console.log(`✅ Found ${triggerCheck.rows.length} outbox triggers installed`);
    
  } catch (error) {
    console.error('❌ Failed to setup outbox database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Main execution when run directly
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  try {
    await setupOutboxDatabase(databaseUrl);
    console.log('🎉 Database setup completed successfully');
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}