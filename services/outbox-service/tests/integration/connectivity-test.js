#!/usr/bin/env node

/**
 * Simple connectivity test to verify infrastructure is accessible
 */

import { connect } from 'nats';
import { Client as PGClient } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/authless';
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4223';

async function testConnectivity() {
  console.log('🧪 Testing Infrastructure Connectivity');
  console.log('═'.repeat(50));
  
  let results = [];

  // Test PostgreSQL connection
  try {
    console.log('🔌 Testing PostgreSQL connection...');
    const dbClient = new PGClient({ connectionString: DATABASE_URL });
    await dbClient.connect();
    
    const result = await dbClient.query('SELECT version()');
    console.log(`✅ PostgreSQL connected: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    
    await dbClient.end();
    results.push({ test: 'PostgreSQL', status: 'PASS' });
  } catch (error) {
    console.log(`❌ PostgreSQL failed: ${error.message}`);
    results.push({ test: 'PostgreSQL', status: 'FAIL', error: error.message });
  }

  // Test NATS connection
  try {
    console.log('🔌 Testing NATS connection...');
    const natsConnection = await connect({ servers: NATS_URL });
    
    console.log(`✅ NATS connected: ${natsConnection.info?.version || 'Unknown version'}`);
    
    await natsConnection.close();
    results.push({ test: 'NATS', status: 'PASS' });
  } catch (error) {
    console.log(`❌ NATS failed: ${error.message}`);
    results.push({ test: 'NATS', status: 'FAIL', error: error.message });
  }

  // Summary
  console.log('\n📋 Connectivity Test Results');
  console.log('═'.repeat(50));
  
  const passedTests = results.filter(r => r.status === 'PASS').length;
  const totalTests = results.length;
  
  results.forEach(result => {
    const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.test}`);
    if (result.error) {
      console.log(`      Error: ${result.error}`);
    }
  });

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All connectivity tests passed! Infrastructure is ready.');
  } else {
    console.log('⚠️  Some connectivity tests failed. Check configuration.');
  }

  return passedTests === totalTests;
}

testConnectivity().catch(error => {
  console.error('💥 Connectivity test failed:', error);
  process.exit(1);
});