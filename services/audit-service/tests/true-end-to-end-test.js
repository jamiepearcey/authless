#!/usr/bin/env node

/**
 * TRUE End-to-End Integration Test
 * Tests with REAL audit service running: OutboxEvent → OutboxProcessor → NATS → REAL AuditService → AuditEvent
 */

import { OutboxProcessor } from '@outbox/processor';
import { AuditService } from '../src/index.js';
import { connect } from 'nats';
import { Client as PGClient } from 'pg';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/authless';
const NATS_URL = process.env.NATS_URL || 'nats://localhost:4223';

class TrueEndToEndTester {
  constructor() {
    this.dbClient = null;
    this.natsConnection = null;
    this.auditService = null;
    this.outboxProcessor = null;
  }

  async setup() {
    console.log('🔧 Setting up TRUE end-to-end test...');
    
    // Database connection
    this.dbClient = new PGClient({ connectionString: DATABASE_URL });
    await this.dbClient.connect();
    console.log('✅ Database connected');

    // NATS connection for monitoring
    this.natsConnection = await connect({ servers: NATS_URL });
    console.log('✅ NATS connected');
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    if (this.auditService) {
      try {
        await this.auditService.stop();
        console.log('✅ Audit service stopped');
      } catch (e) {
        console.log(`⚠️  Audit service cleanup error: ${e.message}`);
      }
    }
    
    if (this.outboxProcessor) {
      try {
        await this.outboxProcessor.close();
        console.log('✅ Outbox processor stopped');
      } catch (e) {
        console.log(`⚠️  Outbox processor cleanup error: ${e.message}`);
      }
    }
    
    if (this.natsConnection) {
      await this.natsConnection.close();
      console.log('✅ NATS connection closed');
    }
    
    if (this.dbClient) {
      await this.dbClient.end();
      console.log('✅ Database connection closed');
    }
  }

  createTrueTestEvent() {
    const eventId = randomUUID();
    const userId = randomUUID();
    const aggregateId = randomUUID();
    const tenantId = 'true-e2e-tenant';

    return {
      eventId,
      outboxEvent: {
        eventType: 'events.audit.user.true.e2e.test',
        aggregateType: 'User',
        aggregateId,
        tenantId,
        payloadJson: {
          id: eventId,
          eventType: 'UserEvent',
          eventName: 'user.true.e2e.test',
          tenantId,
          userId,
          aggregateType: 'User',
          aggregateId,
          timestamp: new Date().toISOString(),
          source: {
            service: 'true-e2e-test',
            version: '1.0.0'
          },
          actor: {
            type: 'user',
            id: userId,
            name: 'True E2E Test User',
            email: 'true-e2e@test.com'
          },
          resource: {
            type: 'User',
            id: aggregateId,
            name: 'Test Resource'
          },
          action: {
            type: 'CREATE',
            description: 'True end-to-end integration test',
            outcome: 'success',
            reason: 'Testing real audit service consumption'
          },
          metadata: {
            testType: 'true-end-to-end',
            correlationId: randomUUID(),
            timestamp: new Date().toISOString()
          },
          originalPayload: {
            message: 'True end-to-end test payload',
            testId: randomUUID(),
            timestamp: new Date().toISOString()
          }
        },
        idempotencyKey: randomUUID(),
        status: 'pending',
        tries: 0
      }
    };
  }

  async step01_StartRealAuditService() {
    console.log('\n🧪 Step 1: Start REAL Audit Service');
    console.log('─'.repeat(50));

    try {
      console.log('🚀 Creating and starting REAL audit service...');
      
      // Create audit service configuration
      const auditConfig = {
        serviceName: 'audit-service-test',
        version: '1.0.0',
        natsUrl: NATS_URL,
        streamName: 'EVENTS',
        consumerName: 'audit-service-true-e2e',
        databaseUrl: DATABASE_URL,
        defaultService: 'true-e2e-test',
        defaultVersion: '1.0.0',
        maxRetries: 3,
        retryDelayMs: 1000,
        concurrency: 1,
        batchSize: 1,
        ackWaitMs: 5000,
        port: 0, // Use random port to avoid conflicts
        metricsPort: 0
      };

      this.auditService = new AuditService(auditConfig);
      await this.auditService.start();
      
      console.log('✅ REAL audit service is running and consuming from NATS');
      console.log('   Stream: EVENTS');
      console.log('   Consumer: audit-service-true-e2e');
      
      return { success: true };
    } catch (error) {
      console.log(`❌ Failed to start audit service: ${error.message}`);
      return { success: false, error };
    }
  }

  async step02_InsertOutboxEvent() {
    console.log('\n🧪 Step 2: Insert Event into Outbox');
    console.log('─'.repeat(50));

    const testData = this.createTrueTestEvent();
    const { outboxEvent } = testData;

    console.log(`📝 Inserting outbox event: ${outboxEvent.idempotencyKey}`);
    console.log(`   Event Type: ${outboxEvent.eventType}`);
    console.log(`   Tenant: ${outboxEvent.tenantId}`);
    console.log(`   Audit Event ID: ${testData.eventId}`);

    try {
      const result = await this.dbClient.query(`
        INSERT INTO "OutboxEvent" (
          "eventType", "aggregateType", "aggregateId", "tenantId", "payloadJson", 
          "idempotencyKey", status, tries
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
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

      const outboxId = result.rows[0].id;
      console.log(`✅ Outbox event inserted with database ID: ${outboxId}`);
      
      return { success: true, testData: { ...testData, outboxId } };
    } catch (error) {
      console.log(`❌ Outbox event insertion failed: ${error.message}`);
      return { success: false, error };
    }
  }

  async step03_RunOutboxProcessor(testData) {
    console.log('\n🧪 Step 3: Run OutboxProcessor');
    console.log('─'.repeat(50));

    try {
      console.log('🚀 Creating OutboxProcessor...');
      this.outboxProcessor = new OutboxProcessor({
        databaseUrl: DATABASE_URL,
        natsUrl: NATS_URL,
        batchSize: 1,
        maxTries: 2,
        idleSleepMs: 100,
        logger: {
          info: (obj, msg) => console.log(`[OUTBOX] ${msg || ''}`),
          error: (obj, msg) => console.log(`[OUTBOX ERROR] ${msg || ''}`),
          warn: (obj, msg) => console.log(`[OUTBOX WARN] ${msg || ''}`),
          debug: (obj, msg) => console.log(`[OUTBOX DEBUG] ${msg || ''}`)
        }
      });

      await this.outboxProcessor.init();
      console.log('✅ OutboxProcessor initialized');

      // Start processor for a limited time
      console.log('⚙️  Running OutboxProcessor to publish to NATS...');
      const processingPromise = this.outboxProcessor.start();
      
      // Let it run for 3 seconds to process the event
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Stop the processor
      await this.outboxProcessor.stop();
      await processingPromise;
      console.log('✅ OutboxProcessor completed');

      // Check the outbox event status
      const outboxResult = await this.dbClient.query(
        'SELECT * FROM "OutboxEvent" WHERE id = $1',
        [testData.outboxId]
      );

      if (outboxResult.rows.length > 0) {
        const event = outboxResult.rows[0];
        console.log(`📊 Outbox event status: ${event.status}`);
        console.log(`📊 Outbox event tries: ${event.tries}`);
        
        if (event.lastError) {
          console.log(`⚠️  Last error: ${event.lastError}`);
        }

        if (event.status === 'sent') {
          console.log('✅ OutboxProcessor successfully published event to NATS');
          return { success: true, outboxEvent: event };
        } else {
          console.log(`❌ OutboxProcessor failed to publish event (status: ${event.status})`);
          return { success: false, reason: `Event status is ${event.status}`, outboxEvent: event };
        }
      } else {
        console.log('❌ Outbox event not found after processing');
        return { success: false, reason: 'Event not found' };
      }

    } catch (error) {
      console.log(`❌ OutboxProcessor failed: ${error.message}`);
      return { success: false, error };
    }
  }

  async step04_WaitForAuditServiceConsumption(testData) {
    console.log('\n🧪 Step 4: Wait for REAL Audit Service Consumption');
    console.log('─'.repeat(50));

    try {
      console.log('⏳ Waiting for audit service to consume and process the message...');
      console.log('   The audit service should receive the NATS message and store it in AuditEvent table');
      
      // Wait longer for the audit service to process the message
      const maxWaitTime = 15000; // 15 seconds
      const checkInterval = 1000; // 1 second
      let waitTime = 0;
      let auditEventFound = false;

      while (waitTime < maxWaitTime && !auditEventFound) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;

        // Check if audit event exists in database
        const auditResult = await this.dbClient.query(
          'SELECT * FROM "AuditEvent" WHERE id = $1',
          [testData.eventId]
        );

        if (auditResult.rows.length > 0) {
          auditEventFound = true;
          const auditEvent = auditResult.rows[0];
          console.log(`✅ Audit event found after ${waitTime}ms!`);
          console.log(`   Event ID: ${auditEvent.id}`);
          console.log(`   Event Name: ${auditEvent.eventName}`);
          console.log(`   Tenant: ${auditEvent.tenantId}`);
          console.log(`   Action: ${auditEvent.actionType} - ${auditEvent.actionOutcome}`);
          
          return { success: true, auditEvent, waitTime };
        } else {
          console.log(`⏳ Still waiting... (${waitTime}ms/${maxWaitTime}ms)`);
        }
      }

      if (!auditEventFound) {
        console.log(`❌ Audit event not found after ${maxWaitTime}ms`);
        console.log('   The audit service may not be consuming messages correctly');
        return { success: false, reason: 'Audit event not found after waiting' };
      }

    } catch (error) {
      console.log(`❌ Audit service consumption check failed: ${error.message}`);
      return { success: false, error };
    }
  }

  async step05_VerifyCompleteFlow(testData) {
    console.log('\n🧪 Step 5: Verify Complete TRUE End-to-End Flow');
    console.log('─'.repeat(50));

    try {
      // Double-check that audit event exists and has correct data
      const auditResult = await this.dbClient.query(
        'SELECT * FROM "AuditEvent" WHERE id = $1',
        [testData.eventId]
      );

      if (auditResult.rows.length === 0) {
        console.log('❌ Audit event not found in final verification');
        return { success: false, reason: 'Audit event not found' };
      }

      const auditEvent = auditResult.rows[0];
      console.log('✅ Final verification: Audit event exists in AuditEvent table');

      // Check outbox event is marked as sent
      const outboxResult = await this.dbClient.query(
        'SELECT * FROM "OutboxEvent" WHERE id = $1',
        [testData.outboxId]
      );

      if (outboxResult.rows.length > 0) {
        const outboxEvent = outboxResult.rows[0];
        console.log(`✅ Final verification: Outbox event status is ${outboxEvent.status}`);
      }

      // Verify data consistency between outbox payload and stored audit event
      const validations = [
        { field: 'eventName', expected: 'user.true.e2e.test', actual: auditEvent.eventName },
        { field: 'tenantId', expected: 'true-e2e-tenant', actual: auditEvent.tenantId },
        { field: 'actionOutcome', expected: 'success', actual: auditEvent.actionOutcome },
        { field: 'sourceService', expected: 'true-e2e-test', actual: auditEvent.sourceService }
      ];

      let validationsPassed = 0;
      console.log('\n🔍 Data consistency validation (outbox → audit):');
      validations.forEach(v => {
        if (v.actual === v.expected) {
          console.log(`   ✅ ${v.field}: ${v.actual}`);
          validationsPassed++;
        } else {
          console.log(`   ❌ ${v.field}: expected "${v.expected}", got "${v.actual}"`);
        }
      });

      if (validationsPassed === validations.length) {
        console.log('✅ All data consistency validations passed');
        console.log('✅ The REAL audit service correctly processed and stored the event');
        return { success: true, auditEvent, validations: validationsPassed };
      } else {
        console.log(`⚠️  Only ${validationsPassed}/${validations.length} validations passed`);
        return { success: false, reason: 'Data consistency validation failed', validations: validationsPassed };
      }

    } catch (error) {
      console.log(`❌ Final verification failed: ${error.message}`);
      return { success: false, error };
    }
  }

  async runTrueEndToEndTest() {
    console.log('🎯 TRUE End-to-End Integration Test');
    console.log('═'.repeat(60));
    console.log('This test verifies the REAL COMPLETE flow:');
    console.log('OutboxEvent → OutboxProcessor → NATS → REAL AuditService → AuditEvent');
    console.log('(No manual simulation - the actual audit service processes the message)');
    console.log();

    const results = [];
    let testData = null;

    try {
      await this.setup();

      // Clear any existing test data
      await this.dbClient.query('DELETE FROM "AuditEvent" WHERE "tenantId" = $1', ['true-e2e-tenant']);
      await this.dbClient.query('DELETE FROM "OutboxEvent" WHERE "tenantId" = $1', ['true-e2e-tenant']);
      console.log('🧹 Cleared existing test data');

      // Step 1: Start real audit service
      const step1Result = await this.step01_StartRealAuditService();
      results.push({ name: 'Start REAL Audit Service', success: step1Result.success });
      
      if (step1Result.success) {
        // Step 2: Insert outbox event
        const step2Result = await this.step02_InsertOutboxEvent();
        results.push({ name: 'Insert Outbox Event', success: step2Result.success });
        
        if (step2Result.success) {
          testData = step2Result.testData;

          // Step 3: Process with OutboxProcessor
          const step3Result = await this.step03_RunOutboxProcessor(testData);
          results.push({ name: 'OutboxProcessor Processing', success: step3Result.success });

          if (step3Result.success) {
            // Step 4: Wait for real audit service consumption
            const step4Result = await this.step04_WaitForAuditServiceConsumption(testData);
            results.push({ name: 'REAL Audit Service Consumption', success: step4Result.success });

            if (step4Result.success) {
              // Step 5: Verify complete flow
              const step5Result = await this.step05_VerifyCompleteFlow(testData);
              results.push({ name: 'TRUE End-to-End Flow Verification', success: step5Result.success });
            }
          }
        }
      }

      // Summary
      console.log('\n📋 TRUE End-to-End Test Results');
      console.log('═'.repeat(60));
      
      const passedTests = results.filter(r => r.success).length;
      const totalTests = results.length;
      
      results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${result.name}`);
      });

      console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
      
      if (passedTests === totalTests) {
        console.log('\n🎉 🎉 🎉 TRUE END-TO-END TEST PASSED! 🎉 🎉 🎉');
        console.log('✅ REAL audit service started and consuming from NATS');
        console.log('✅ OutboxEvent successfully inserted');
        console.log('✅ OutboxProcessor successfully published to NATS');
        console.log('✅ REAL audit service successfully consumed message');
        console.log('✅ REAL audit service successfully stored to AuditEvent table');
        console.log('✅ Data consistency maintained throughout REAL flow');
        console.log('\n🏆 THE TRUE OUTBOX → REAL AUDIT SERVICE FLOW IS WORKING! 🏆');
      } else {
        console.log('\n⚠️  Some TRUE end-to-end tests failed. Check the logs above.');
        console.log('🔍 This indicates issues in the REAL complete message flow.');
      }

      // Final cleanup
      if (testData) {
        await this.dbClient.query('DELETE FROM "AuditEvent" WHERE "tenantId" = $1', ['true-e2e-tenant']);
        await this.dbClient.query('DELETE FROM "OutboxEvent" WHERE "tenantId" = $1', ['true-e2e-tenant']);
        console.log('🧹 Final test data cleanup completed');
      }

      return passedTests === totalTests;

    } catch (error) {
      console.error(`💥 TRUE end-to-end test suite failed: ${error.message}`);
      console.error('Stack trace:', error.stack);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new TrueEndToEndTester();
  tester.runTrueEndToEndTest().then(success => {
    console.log('\n' + '═'.repeat(60));
    if (success) {
      console.log('🏆 TRUE END-TO-END TEST: PASSED!');
      console.log('🎯 The REAL OutboxEvent → REAL AuditService flow is working perfectly!');
    } else {
      console.log('💥 TRUE END-TO-END TEST: FAILED');
      console.log('⚠️  The REAL complete message flow needs debugging.');
    }
    console.log('═'.repeat(60));
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}