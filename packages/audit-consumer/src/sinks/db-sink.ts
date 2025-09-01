import { AuditSinkAdapter, AuditEvent, AuditSinkType } from '../types';
import { PrismaClient } from '@db/base';

export class DatabaseSink implements AuditSinkAdapter {
  readonly name = 'database';
  readonly type: AuditSinkType = 'db';
  
  private db: PrismaClient;
  private isInitialized = false;

  constructor(private config: { connectionString?: string } = {}) {
    this.db = new PrismaClient({
      datasources: this.config.connectionString ? {
        db: { url: this.config.connectionString }
      } : undefined,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.db.$connect();
      // Test the connection
      await this.db.$queryRaw`SELECT 1`;
      this.isInitialized = true;
      console.log('✅ Database sink initialized');
    } catch (error) {
      console.error('❌ Failed to initialize database sink:', error);
      throw error;
    }
  }

  async process(events: AuditEvent[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Database sink not initialized');
    }

    if (events.length === 0) return;

    try {
      // Use transaction for batch insert with idempotency
      await this.db.$transaction(async (tx) => {
        for (const event of events) {
          await this.insertAuditEvent(tx, event);
        }
      });

      console.log(`📊 Persisted ${events.length} audit events to database`);
    } catch (error) {
      console.error('❌ Failed to persist audit events to database:', error);
      throw error;
    }
  }

  async processOne(event: AuditEvent): Promise<void> {
    await this.process([event]);
  }

  private async insertAuditEvent(tx: any, event: AuditEvent): Promise<void> {
    try {
      await tx.auditEvent.create({
        data: {
          id: event.id,
          eventType: event.eventType,
          eventName: event.eventName,
          tenantId: event.tenantId,
          userId: event.userId || null,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          timestamp: event.timestamp,
          
          // Source information
          sourceService: event.source.service,
          sourceVersion: event.source.version || null,
          sourceHost: event.source.host || null,
          requestId: event.source.requestId || null,
          correlationId: event.source.correlationId || null,
          
          // Actor information
          actorType: event.actor?.type || null,
          actorId: event.actor?.id || null,
          actorName: event.actor?.name || null,
          actorEmail: event.actor?.email || null,
          actorIpAddress: event.actor?.ipAddress || null,
          actorUserAgent: event.actor?.userAgent || null,
          
          // Resource information
          resourceType: event.resource?.type || null,
          resourceId: event.resource?.id || null,
          resourceName: event.resource?.name || null,
          resourceAttributes: event.resource?.attributes ? 
            JSON.stringify(event.resource.attributes) : null,
          
          // Action information
          actionType: event.action.type,
          actionDescription: event.action.description || null,
          actionOutcome: event.action.outcome,
          actionReason: event.action.reason || null,
          
          // Metadata and payload
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
          originalPayload: JSON.stringify(event.originalPayload),
        },
      });
    } catch (error: any) {
      // Check if it's a duplicate key error
      if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
        console.log(`⚠️ Audit event ${event.id} already exists, skipping`);
        return;
      }
      throw error;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      if (!this.isInitialized) {
        return {
          healthy: false,
          details: { error: 'Not initialized' }
        };
      }

      // Simple query to test connection
      await this.db.$queryRaw`SELECT 1`;
      
      // Get some basic stats
      const eventCount = await this.db.auditEvent.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      return {
        healthy: true,
        details: {
          connected: true,
          eventsLast24h: eventCount,
          lastCheck: new Date(),
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date(),
        }
      };
    }
  }

  async close(): Promise<void> {
    try {
      await this.db.$disconnect();
      this.isInitialized = false;
      console.log('✅ Database sink closed');
    } catch (error) {
      console.error('❌ Error closing database sink:', error);
    }
  }

  // Additional utility methods
  async getStats() {
    if (!this.isInitialized) {
      throw new Error('Database sink not initialized');
    }

    const [total, last24h, byEventType, byTenant] = await Promise.all([
      this.db.auditEvent.count(),
      this.db.auditEvent.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.db.auditEvent.groupBy({
        by: ['eventType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.db.auditEvent.groupBy({
        by: ['tenantId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalEvents: total,
      eventsLast24h: last24h,
      topEventTypes: byEventType.map((item: any) => ({
        eventType: item.eventType,
        count: item._count.id
      })),
      topTenants: byTenant.map((item: any) => ({
        tenantId: item.tenantId,
        count: item._count.id
      })),
    };
  }
}