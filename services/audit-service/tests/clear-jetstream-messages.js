#!/usr/bin/env node

/**
 * Clear old messages from JetStream to ensure clean testing
 */

import { connect } from 'nats';

const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4223';

async function clearJetStreamMessages() {
  console.log('🧹 Clearing old JetStream messages');
  console.log('═'.repeat(40));
  
  let natsConnection = null;
  
  try {
    // Connect to NATS
    natsConnection = await connect({ servers: NATS_URL });
    const js = natsConnection.jetstream();
    
    // Get stream info
    const jsm = await js.jetstreamManager();
    const streamInfo = await jsm.streams.info('EVENTS');
    console.log(`📊 Stream info: ${streamInfo.state.messages} messages, ${streamInfo.state.bytes} bytes`);
    
    if (streamInfo.state.messages === 0) {
      console.log('✅ No messages to clear');
      return;
    }
    
    console.log('🗑️  Purging all messages from stream...');
    
    // Purge the stream - this removes all messages
    await jsm.streams.purge('EVENTS');
    
    const clearedCount = streamInfo.state.messages;
    
    // Get updated stream info
    const updatedStreamInfo = await jsm.streams.info('EVENTS');
    console.log(`✅ Cleared ${clearedCount} messages`);
    console.log(`📊 Stream now has: ${updatedStreamInfo.state.messages} messages, ${updatedStreamInfo.state.bytes} bytes`);
    
  } catch (error) {
    console.error('💥 Failed to clear messages:', error.message);
    process.exit(1);
  } finally {
    if (natsConnection) {
      try { await natsConnection.close(); } catch (e) {}
    }
  }
}

clearJetStreamMessages().then(() => {
  console.log('✅ JetStream messages cleared');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});