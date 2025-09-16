#!/usr/bin/env node

/**
 * Service Startup Test
 * Tests that services can start and respond to basic requests
 */

import { spawn } from 'child_process';
import { Client as PGClient } from 'pg';
import { connect } from 'nats';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/authless';
const NATS_URL = process.env.NATS_URL || 'nats://127.0.0.1:4223';

class ServiceTester {
  constructor() {
    this.processes = [];
    this.dbClient = null;
    this.natsConnection = null;
  }

  async setup() {
    console.log('🔧 Setting up service test environment...');
    
    // Database connection
    this.dbClient = new PGClient({ connectionString: DATABASE_URL });
    await this.dbClient.connect();
    console.log('✅ Database connected');

    // NATS connection
    this.natsConnection = await connect({ servers: NATS_URL });
    console.log('✅ NATS connected');
  }

  async cleanup() {
    console.log('🧹 Cleaning up service test environment...');
    
    // Kill all processes
    for (const proc of this.processes) {
      if (!proc.killed) {
        proc.kill('SIGTERM');
        console.log(`✅ Process ${proc.pid} terminated`);
      }
    }
    
    // Close connections
    if (this.dbClient) {
      await this.dbClient.end();
      console.log('✅ Database connection closed');
    }
    
    if (this.natsConnection) {
      await this.natsConnection.close();
      console.log('✅ NATS connection closed');
    }
  }

  async startOutboxService() {
    console.log('🚀 Starting outbox service...');
    
    return new Promise((resolve, reject) => {
      const proc = spawn('node', ['dist/start.js'], {
        cwd: '../outbox-service',
        env: {
          ...process.env,
          DATABASE_URL,
          NATS_URL,
          SERVICE_NAME: 'outbox-service-test',
          PORT: '8882',
          METRICS_PORT: '9892',
          OUTBOX_BATCH_SIZE: '10',
          OUTBOX_IDLE_SLEEP_MS: '1000',
          LOG_LEVEL: 'info'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.processes.push(proc);

      let output = '';
      proc.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(`[OUTBOX] ${text.trim()}`);
        
        if (text.includes('started successfully')) {
          resolve(proc);
        }
      });

      proc.stderr.on('data', (data) => {
        console.log(`[OUTBOX ERROR] ${data.toString().trim()}`);
      });

      proc.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Outbox service exited with code ${code}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!output.includes('started successfully')) {
          reject(new Error('Outbox service failed to start within 30 seconds'));
        }
      }, 30000);
    });
  }

  async startAuditService() {
    console.log('🚀 Starting audit service...');
    
    return new Promise((resolve, reject) => {
      const proc = spawn('node', ['dist/start.js'], {
        cwd: '../audit-service',
        env: {
          ...process.env,
          DATABASE_URL,
          NATS_URL,
          SERVICE_NAME: 'audit-service-test',
          NATS_STREAM_NAME: 'EVENTS',
          AUDIT_CONSUMER_NAME: 'audit-test-consumer',
          PORT: '8881',
          METRICS_PORT: '9891',
          LOG_LEVEL: 'info'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.processes.push(proc);

      let output = '';
      proc.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(`[AUDIT] ${text.trim()}`);
        
        if (text.includes('started successfully')) {
          resolve(proc);
        }
      });

      proc.stderr.on('data', (data) => {
        console.log(`[AUDIT ERROR] ${data.toString().trim()}`);
      });

      proc.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Audit service exited with code ${code}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!output.includes('started successfully')) {
          reject(new Error('Audit service failed to start within 30 seconds'));
        }
      }, 30000);
    });
  }

  async testOutboxToAuditFlow() {
    console.log('\n🧪 Testing Outbox -> Audit Flow');
    console.log('─'.repeat(50));

    // Create test audit event data
    const auditEventData = {
      id: randomUUID(),
      eventType: 'UserEvent',
      eventName: 'user.service.test',
      tenantId: 'test-tenant',
      userId: randomUUID(),
      aggregateType: 'User',
      aggregateId: randomUUID(),
      timestamp: new Date().toISOString(),
      source: {
        service: 'service-test',
        version: '1.0.0'
      },
      actor: {
        type: 'user',
        id: randomUUID(),
        name: 'Service Tester',
        email: 'test@service.com'
      },
      resource: {
        type: 'User',
        id: randomUUID(),
        name: 'Test User'
      },
      action: {
        type: 'CREATE',
        description: 'Service startup test',
        outcome: 'success',
        reason: 'Testing service integration'
      },
      metadata: {
        testType: 'service-startup',
        timestamp: new Date().toISOString()
      },
      originalPayload: {
        message: 'Service startup test payload',
        timestamp: new Date().toISOString()
      }
    };

    // Insert into outbox
    const outboxEvent = {
      eventType: 'events.audit.user.service.test',
      aggregateType: 'User',
      aggregateId: randomUUID(),
      tenantId: 'test-tenant',
      payloadJson: auditEventData,
      idempotencyKey: randomUUID(),
      status: 'PENDING',
      tries: 0
    };

    console.log(`📥 Inserting event into outbox: ${outboxEvent.idempotencyKey}`);

    await this.dbClient.query(`
      INSERT INTO "OutboxEvent" (
        "eventType", "aggregateType", "aggregateId", "tenantId", "payloadJson", 
        "idempotencyKey", status, tries
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      outboxEvent.eventType,
      outboxEvent.aggregateType,
      outboxEvent.aggregateId,
      outboxEvent.tenantId,
      JSON.stringify(outboxEvent.payloadJson),
      outboxEvent.idempotencyKey,
      outboxEvent.status,
      outboxEvent.tries
    ]);

    console.log('✅ Event inserted into outbox');

    // Wait for processing
    console.log('⏳ Waiting for outbox service to process and audit service to consume...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Check if outbox event was processed
    const outboxResult = await this.dbClient.query(
      'SELECT * FROM "OutboxEvent" WHERE "idempotencyKey" = $1', 
      [outboxEvent.idempotencyKey]
    );

    if (outboxResult.rows.length > 0) {
      const processedEvent = outboxResult.rows[0];
      console.log(`📊 Outbox status: ${processedEvent.status}`);
      console.log(`📊 Tries: ${processedEvent.tries}`);

      if (processedEvent.status === 'PROCESSED') {
        console.log('✅ Outbox service processed the event');
        
        // Check if audit event was stored
        const auditResult = await this.dbClient.query(
          'SELECT * FROM "AuditEvent" WHERE id = $1',
          [auditEventData.id]
        );

        if (auditResult.rows.length > 0) {
          console.log('✅ Audit service stored the event!');
          console.log(`   Event Type: ${auditResult.rows[0].eventType}`);
          console.log(`   Event Name: ${auditResult.rows[0].eventName}`);
          console.log(`   Tenant ID: ${auditResult.rows[0].tenantId}`);
          
          // Clean up
          await this.dbClient.query('DELETE FROM "AuditEvent" WHERE id = $1', [auditEventData.id]);
          await this.dbClient.query('DELETE FROM "OutboxEvent" WHERE "idempotencyKey" = $1', [outboxEvent.idempotencyKey]);
          console.log('🧹 Test data cleaned up');
          
          return true;
        } else {
          console.log('❌ Audit service did not store the event');
          return false;
        }
      } else {
        console.log(`⚠️  Outbox event still in status: ${processedEvent.status}`);
        if (processedEvent.lastError) {
          console.log(`   Last error: ${processedEvent.lastError}`);
        }
        return false;
      }
    } else {
      console.log('❌ Outbox event not found');
      return false;
    }
  }

  async runServiceTests() {
    console.log('🚀 Starting Service Integration Tests');
    console.log('═'.repeat(60));

    try {
      await this.setup();

      // Build services first
      console.log('🔨 Building services...');
      const { spawn } = await import('child_process');
      
      await new Promise((resolve, reject) => {
        const buildAudit = spawn('pnpm', ['build'], { cwd: '../audit-service' });
        buildAudit.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error('Audit service build failed'));
        });
      });
      
      await new Promise((resolve, reject) => {
        const buildOutbox = spawn('pnpm', ['build'], { cwd: '../outbox-service' });
        buildOutbox.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error('Outbox service build failed'));
        });
      });
      
      console.log('✅ Services built successfully');

      // Start services
      await this.startOutboxService();
      await this.startAuditService();
      
      // Wait a moment for full initialization
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Run integration test
      const flowTest = await this.testOutboxToAuditFlow();

      // Summary
      console.log('\n📋 Service Test Results Summary');
      console.log('═'.repeat(60));
      
      if (flowTest) {
        console.log('✅ PASS Outbox -> Audit Flow');
        console.log('\n🎉 Service integration test passed! Both services work together correctly.');
        return true;
      } else {
        console.log('❌ FAIL Outbox -> Audit Flow');
        console.log('\n⚠️  Service integration test failed. Check service logs above.');
        return false;
      }

    } catch (error) {
      console.error(`💥 Service test failed: ${error.message}`);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ServiceTester();
  tester.runServiceTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}