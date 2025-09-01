import { AuditSinkAdapter, AuditEvent, AuditSinkType } from '../types';
import fetch from 'node-fetch';

interface SplunkHECConfig {
  url: string;
  token: string;
  source: string;
  sourcetype: string;
  index: string;
  batchSize: number;
  flushIntervalMs: number;
  timeout?: number;
}

interface SplunkHECEvent {
  time?: number;
  host?: string;
  source?: string;
  sourcetype?: string;
  index?: string;
  event: any;
}

interface SplunkHECBatchPayload {
  events: SplunkHECEvent[];
}

export class SplunkSink implements AuditSinkAdapter {
  readonly name = 'splunk';
  readonly type: AuditSinkType = 'splunk';
  
  private isInitialized = false;
  private eventBuffer: AuditEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isProcessing = false;
  private lastSuccessAt?: Date;
  private errorCount = 0;
  private circuitBreakerOpen = false;

  constructor(private config: SplunkHECConfig) {
    this.validateConfig();
  }

  private validateConfig() {
    if (!this.config.url) {
      throw new Error('Splunk HEC URL is required');
    }
    if (!this.config.token) {
      throw new Error('Splunk HEC token is required');
    }
    if (!this.config.url.includes('/services/collector')) {
      console.warn('⚠️ Splunk URL should typically end with /services/collector/event');
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Test connection with a simple health check
      await this.healthCheck();
      
      // Start the flush timer
      this.startFlushTimer();
      
      this.isInitialized = true;
      console.log('✅ Splunk HEC sink initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Splunk HEC sink:', error);
      throw error;
    }
  }

  async process(events: AuditEvent[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Splunk sink not initialized');
    }

    if (events.length === 0) return;

    // Check circuit breaker
    if (this.circuitBreakerOpen) {
      throw new Error('Splunk sink circuit breaker is open');
    }

    // Add to buffer
    this.eventBuffer.push(...events);
    
    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flush();
    }

    console.log(`📨 Added ${events.length} events to Splunk buffer (${this.eventBuffer.length} total)`);
  }

  async processOne(event: AuditEvent): Promise<void> {
    await this.process([event]);
  }

  private async flush(): Promise<void> {
    if (this.isProcessing || this.eventBuffer.length === 0) {
      return;
    }

    this.isProcessing = true;
    const eventsToFlush = this.eventBuffer.splice(0, this.config.batchSize);

    try {
      await this.sendToSplunk(eventsToFlush);
      this.lastSuccessAt = new Date();
      this.errorCount = 0;
      this.circuitBreakerOpen = false;
      console.log(`📤 Flushed ${eventsToFlush.length} events to Splunk HEC`);
    } catch (error) {
      this.handleError(error, eventsToFlush);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendToSplunk(events: AuditEvent[]): Promise<void> {
    const hecEvents = events.map(event => this.convertToHECEvent(event));
    
    // Splunk HEC expects newline-delimited JSON, not an array
    const payload = hecEvents.map(event => JSON.stringify(event)).join('\n');
    
    // Use AbortController for timeout instead of the invalid timeout property
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);
    
    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Authorization': `Splunk ${this.config.token}`,
          'Content-Type': 'application/json',
          'X-Splunk-Request-Channel': 'audit-consumer',
        },
        body: payload,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Splunk HEC request failed: ${response.status} ${response.statusText}. Response: ${errorText}`);
      }

      const result = await response.json() as any;
      
      // Check for partial failures
      if (result.code !== undefined && result.code !== 0) {
        throw new Error(`Splunk HEC returned error code ${result.code}: ${result.text}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }

  }

  private convertToHECEvent(auditEvent: AuditEvent): SplunkHECEvent {
    return {
      time: Math.floor(auditEvent.timestamp.getTime() / 1000), // Unix timestamp in seconds
      host: auditEvent.source.host || 'unknown',
      source: this.config.source,
      sourcetype: this.config.sourcetype,
      index: this.config.index,
      event: {
        // Core audit fields
        audit_id: auditEvent.id,
        event_type: auditEvent.eventType,
        event_name: auditEvent.eventName,
        tenant_id: auditEvent.tenantId,
        user_id: auditEvent.userId,
        timestamp: auditEvent.timestamp.toISOString(),
        
        // Source
        source_service: auditEvent.source.service,
        source_version: auditEvent.source.version,
        source_host: auditEvent.source.host,
        request_id: auditEvent.source.requestId,
        correlation_id: auditEvent.source.correlationId,
        
        // Actor
        actor_type: auditEvent.actor?.type,
        actor_id: auditEvent.actor?.id,
        actor_name: auditEvent.actor?.name,
        actor_email: auditEvent.actor?.email, // Should be hashed
        actor_ip: auditEvent.actor?.ipAddress,
        actor_user_agent: auditEvent.actor?.userAgent,
        
        // Resource
        resource_type: auditEvent.resource?.type,
        resource_id: auditEvent.resource?.id,
        resource_name: auditEvent.resource?.name,
        resource_attributes: auditEvent.resource?.attributes,
        
        // Action
        action_type: auditEvent.action.type,
        action_description: auditEvent.action.description,
        action_outcome: auditEvent.action.outcome,
        action_reason: auditEvent.action.reason,
        
        // Additional data
        metadata: auditEvent.metadata,
        
        // Aggregate information
        aggregate_type: auditEvent.aggregateType,
        aggregate_id: auditEvent.aggregateId,
        
        // Splunk-specific fields
        splunk_indexed_at: new Date().toISOString(),
        audit_consumer_version: process.env.APP_VERSION || '1.0.0',
      }
    };
  }

  private handleError(error: any, failedEvents: AuditEvent[]) {
    this.errorCount++;
    console.error(`❌ Splunk HEC error (${this.errorCount} consecutive):`, error.message);

    // Circuit breaker logic
    if (this.errorCount >= 3) {
      this.circuitBreakerOpen = true;
      console.error('🔴 Splunk HEC circuit breaker opened due to consecutive failures');
      
      // Reset after 5 minutes
      setTimeout(() => {
        this.circuitBreakerOpen = false;
        this.errorCount = 0;
        console.log('🟡 Splunk HEC circuit breaker reset');
      }, 5 * 60 * 1000);
    }

    // Put failed events back at the front of the buffer for retry
    this.eventBuffer.unshift(...failedEvents);
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.eventBuffer.length > 0 && !this.isProcessing) {
        this.flush().catch(error => {
          console.error('❌ Periodic flush failed:', error.message);
        });
      }
    }, this.config.flushIntervalMs);
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      if (!this.isInitialized && this.config) {
        // Test connection with a simple test event
        const testEvent: SplunkHECEvent = {
          time: Math.floor(Date.now() / 1000),
          host: 'health-check',
          source: this.config.source,
          sourcetype: 'audit_health_check',
          index: this.config.index,
          event: {
            message: 'Health check from audit consumer',
            timestamp: new Date().toISOString(),
            health_check: true,
          }
        };

        // Use AbortController for timeout instead of the invalid timeout property
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch(this.config.url, {
            method: 'POST',
            headers: {
              'Authorization': `Splunk ${this.config.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(testEvent),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          await response.json();
        } finally {
          clearTimeout(timeoutId);
        }
      }

      return {
        healthy: !this.circuitBreakerOpen,
        details: {
          connected: true,
          lastSuccess: this.lastSuccessAt,
          consecutiveErrors: this.errorCount,
          circuitBreakerOpen: this.circuitBreakerOpen,
          bufferSize: this.eventBuffer.length,
          lastCheck: new Date(),
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          consecutiveErrors: this.errorCount,
          circuitBreakerOpen: this.circuitBreakerOpen,
          lastCheck: new Date(),
        }
      };
    }
  }

  async close(): Promise<void> {
    try {
      // Stop the flush timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.flushTimer = undefined;
      }

      // Flush remaining events
      if (this.eventBuffer.length > 0 && !this.circuitBreakerOpen) {
        console.log(`🔄 Flushing ${this.eventBuffer.length} remaining events to Splunk...`);
        await this.flush();
      }

      this.isInitialized = false;
      console.log('✅ Splunk HEC sink closed');
    } catch (error) {
      console.error('❌ Error closing Splunk HEC sink:', error);
    }
  }

  // Additional utility methods
  getBufferStats() {
    return {
      bufferSize: this.eventBuffer.length,
      isProcessing: this.isProcessing,
      lastSuccessAt: this.lastSuccessAt,
      errorCount: this.errorCount,
      circuitBreakerOpen: this.circuitBreakerOpen,
    };
  }

  forceFlush(): Promise<void> {
    return this.flush();
  }
}