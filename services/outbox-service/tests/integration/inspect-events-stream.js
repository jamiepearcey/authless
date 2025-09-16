#!/usr/bin/env node

/**
 * Inspect the existing EVENTS stream configuration
 */

import { connect } from 'nats';

const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4223';

async function inspectEventsStream() {
  console.log('🔍 Inspecting EVENTS stream configuration');
  
  let natsConnection = null;
  
  try {
    natsConnection = await connect({ servers: NATS_URL });
    const jetstreamManager = await natsConnection.jetstreamManager();
    
    const streamInfo = await jetstreamManager.streams.info('EVENTS');
    
    console.log(`\n🌊 Stream: ${streamInfo.config.name}`);
    console.log(`   Subjects: ${streamInfo.config.subjects.join(', ')}`);
    console.log(`   Storage: ${streamInfo.config.storage}`);
    console.log(`   Retention: ${streamInfo.config.retention}`);
    console.log(`   Max Age: ${streamInfo.config.max_age} nanoseconds (${streamInfo.config.max_age / (1000 * 1000000)} seconds)`);
    console.log(`   Max Messages: ${streamInfo.config.max_msgs}`);
    console.log(`   Max Bytes: ${streamInfo.config.max_bytes}`);
    console.log(`   Duplicate Window: ${streamInfo.config.duplicate_window} nanoseconds (${streamInfo.config.duplicate_window / (1000 * 1000000)} seconds)`);
    console.log(`   Discard Policy: ${streamInfo.config.discard}`);
    console.log(`   Replicas: ${streamInfo.config.num_replicas}`);
    
    console.log(`\n📊 Stream State:`);
    console.log(`   Messages: ${streamInfo.state.messages}`);
    console.log(`   Bytes: ${streamInfo.state.bytes}`);
    console.log(`   First Seq: ${streamInfo.state.first_seq}`);
    console.log(`   Last Seq: ${streamInfo.state.last_seq}`);
    console.log(`   Consumers: ${streamInfo.state.consumer_count}`);
    
    if (streamInfo.state.subjects) {
      console.log(`\n📋 Subject Details:`);
      Object.entries(streamInfo.state.subjects).forEach(([subject, count]) => {
        console.log(`   ${subject}: ${count} messages`);
      });
    }
    
    // Check if there might be permission or configuration issues
    console.log(`\n🔧 Potential Issues:`);
    if (streamInfo.config.storage === 'file') {
      console.log(`   ⚠️  Stream uses file storage - might be slower than memory`);
    }
    
    if (streamInfo.config.duplicate_window === 0) {
      console.log(`   ⚠️  No duplicate window - deduplication disabled`);
    }
    
    if (streamInfo.config.max_age < 60 * 1000 * 1000000) { // Less than 1 minute
      console.log(`   ⚠️  Max age is very short (${streamInfo.config.max_age / (1000 * 1000000)} seconds) - messages expire quickly`);
    }
    
    return streamInfo;

  } catch (error) {
    console.error(`💥 Stream inspection failed: ${error.message}`);
    return null;
  } finally {
    if (natsConnection) {
      await natsConnection.close();
    }
  }
}

inspectEventsStream();