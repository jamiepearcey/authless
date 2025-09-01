import { AuditSinkAdapter, AuditSinkType } from '../types';
import { DatabaseSink } from './db-sink';
import { SplunkSink } from './splunk-sink';

export { DatabaseSink } from './db-sink';
export { SplunkSink } from './splunk-sink';

// Sink Factory
export class SinkFactory {
  static createSink(type: AuditSinkType, config: any): AuditSinkAdapter {
    switch (type) {
      case 'db':
        return new DatabaseSink(config);
      
      case 'splunk':
        if (!config) {
          throw new Error('Splunk configuration is required for Splunk sink');
        }
        return new SplunkSink(config);
      
      case 'webhook':
        throw new Error('Webhook sink not implemented yet');
      
      default:
        throw new Error(`Unknown sink type: ${type}`);
    }
  }
}

// Sink Registry for managing multiple sinks
export class SinkRegistry {
  private sinks: Map<string, AuditSinkAdapter> = new Map();
  private initialized = false;

  async addSink(sink: AuditSinkAdapter): Promise<void> {
    if (this.sinks.has(sink.name)) {
      throw new Error(`Sink with name ${sink.name} already exists`);
    }
    
    this.sinks.set(sink.name, sink);
    
    // Initialize if registry is already initialized
    if (this.initialized) {
      await sink.initialize();
    }
  }

  async initialize(): Promise<void> {
    const initPromises = Array.from(this.sinks.values()).map(sink => sink.initialize());
    await Promise.all(initPromises);
    this.initialized = true;
  }

  async processAll(events: any[]): Promise<void> {
    const processPromises = Array.from(this.sinks.values()).map(async (sink) => {
      try {
        await sink.process(events);
      } catch (error) {
        console.error(`❌ Sink ${sink.name} failed to process events:`, error);
        // Don't throw - allow other sinks to continue
      }
    });

    await Promise.allSettled(processPromises);
  }

  async healthCheckAll(): Promise<Record<string, any>> {
    const healthChecks: Record<string, any> = {};
    
    for (const [name, sink] of this.sinks.entries()) {
      try {
        healthChecks[name] = await sink.healthCheck();
      } catch (error) {
        healthChecks[name] = {
          healthy: false,
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
      }
    }
    
    return healthChecks;
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.sinks.values()).map(sink => sink.close());
    await Promise.all(closePromises);
    this.sinks.clear();
    this.initialized = false;
  }

  getSink(name: string): AuditSinkAdapter | undefined {
    return this.sinks.get(name);
  }

  getSinks(): AuditSinkAdapter[] {
    return Array.from(this.sinks.values());
  }

  getSinkNames(): string[] {
    return Array.from(this.sinks.keys());
  }
}