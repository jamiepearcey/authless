import { Prisma, PrismaClient } from './generated/client';
import {
  OutboxEventStatus,
  type CreateOutboxEventInput,
  type FetchPendingEventsOptions,
  type UpdateEventStatusOptions,
  type OutboxEventStats,
  type RetryConfig,
  DEFAULT_RETRY_CONFIG,
  calculateNextAttemptAt,
} from './outbox-types';

export class OutboxRepository {
  constructor(private readonly db: PrismaClient) {}

  async createEvent(input: CreateOutboxEventInput): Promise<string> {
    const event = await this.db.outboxEvent.create({
      data: {
        eventType: input.eventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        tenantId: input.tenantId,
        payloadJson: input.payloadJson,
        idempotencyKey: input.idempotencyKey,
        traceId: input.traceId,
        status: OutboxEventStatus.PENDING,
        tries: 0,
      },
      select: {
        id: true,
      },
    });

    return event.id.toString();
  }

  async fetchPendingEvents(options: FetchPendingEventsOptions = {}) {
    const {
      limit = 100,
      eventTypes,
      tenantId,
      maxTries = DEFAULT_RETRY_CONFIG.maxTries,
    } = options;

    return this.db.$transaction(async (tx) => {
      const whereClause: Prisma.OutboxEventWhereInput = {
        status: OutboxEventStatus.PENDING,
        tries: {
          lt: maxTries,
        },
        OR: [
          { nextAttemptAt: { lte: new Date() } },
        ],
      };

      if (eventTypes?.length) {
        whereClause.eventType = { in: eventTypes };
      }

      if (tenantId) {
        whereClause.tenantId = tenantId;
      }

      const events = await tx.outboxEvent.findMany({
        where: whereClause,
        orderBy: [
          { createdAt: 'asc' },
          { tries: 'asc' },
        ],
        take: limit,
      });

      if (events.length > 0) {
        const eventIds = events.map(e => e.id);
        await tx.outboxEvent.updateMany({
          where: { id: { in: eventIds } },
          data: { status: OutboxEventStatus.PROCESSING },
        });
      }

      return events.map(event => ({
        ...event,
        status: OutboxEventStatus.PROCESSING as OutboxEventStatus,
      }));
    });
  }

  async updateEventStatus(
    eventId: string,
    options: UpdateEventStatusOptions
  ): Promise<void> {
    const updateData: Prisma.OutboxEventUpdateInput = {
      status: options.status,
    };

    if (options.error) {
      updateData.lastError = options.error;
    }

    if (options.nextAttemptAt) {
      updateData.nextAttemptAt = options.nextAttemptAt;
    }

    if (options.incrementTries) {
      updateData.tries = { increment: 1 };
    }

    await this.db.outboxEvent.update({
      where: { id: parseInt(eventId) },
      data: updateData,
    });
  }

  async markEventCompleted(eventId: string): Promise<void> {
    await this.updateEventStatus(eventId, {
      status: OutboxEventStatus.SENT,
    });
  }

  async markEventFailed(
    eventId: string,
    error: string,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<void> {
    const event = await this.db.outboxEvent.findUnique({
      where: { id: parseInt(eventId) },
      select: { tries: true },
    });

    if (!event) {
      throw new Error(`Event with id ${eventId} not found`);
    }

    const newTries = event.tries + 1;
    const shouldRetry = newTries < retryConfig.maxTries;

    await this.updateEventStatus(eventId, {
      status: shouldRetry ? OutboxEventStatus.PENDING : OutboxEventStatus.DEAD,
      error,
      nextAttemptAt: shouldRetry ? calculateNextAttemptAt(newTries, retryConfig) : undefined,
      incrementTries: true,
    });
  }

  async getStats(tenantId?: string): Promise<OutboxEventStats> {
    const whereClause: Prisma.OutboxEventWhereInput = tenantId 
      ? { tenantId } 
      : {};

    const [counts, oldestPending] = await Promise.all([
      this.db.outboxEvent.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true },
      }),
      this.db.outboxEvent.findFirst({
        where: {
          ...whereClause,
          status: OutboxEventStatus.PENDING,
        },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    const statusCounts = counts.reduce((acc, item) => {
      acc[item.status as OutboxEventStatus] = item._count.status;
      return acc;
    }, {} as Record<OutboxEventStatus, number>);

    const totalCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    const avgProcessingTime = await this.getAverageProcessingTime(whereClause);

    return {
      total: totalCount,
      pending: statusCounts[OutboxEventStatus.PENDING] || 0,
      processing: statusCounts[OutboxEventStatus.PROCESSING] || 0,
      sent: statusCounts[OutboxEventStatus.SENT] || 0,
      failed: statusCounts[OutboxEventStatus.FAILED] || 0,
      dead: statusCounts[OutboxEventStatus.DEAD] || 0,
      oldestPending: oldestPending?.createdAt,
      averageProcessingTime: avgProcessingTime,
    };
  }

  private async getAverageProcessingTime(whereClause: Prisma.OutboxEventWhereInput): Promise<number | undefined> {
    try {
      let query = Prisma.sql`
        SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000)::float as avg
        FROM "OutboxEvent"
        WHERE status = 'sent'
          AND "updatedAt" IS NOT NULL
          AND "createdAt" < NOW() - INTERVAL '1 minute'
      `;

      if (whereClause.tenantId) {
        query = Prisma.sql`
          SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000)::float as avg
          FROM "OutboxEvent"
          WHERE status = 'sent'
            AND "tenantId" = ${whereClause.tenantId}
            AND "updatedAt" IS NOT NULL
            AND "createdAt" < NOW() - INTERVAL '1 minute'
        `;
      }

      const result = await this.db.$queryRaw<[{ avg: number | null }]>(query);
      return result[0]?.avg || undefined;
    } catch (error) {
      console.warn('Failed to calculate average processing time:', error);
      return undefined
    }
  }

  async cleanupProcessedEvents(olderThanHours: number = 24): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const result = await this.db.outboxEvent.deleteMany({
      where: {
        status: OutboxEventStatus.SENT,
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  async cleanupDeadEvents(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.db.outboxEvent.deleteMany({
      where: {
        status: OutboxEventStatus.DEAD,
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  async retryFailedEvents(
    maxRetries: number = 100,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<number> {
    const failedEvents = await this.db.outboxEvent.findMany({
      where: {
        status: OutboxEventStatus.FAILED,
        tries: { lt: retryConfig.maxTries },
      },
      take: maxRetries,
      orderBy: { createdAt: 'asc' },
    });

    if (failedEvents.length === 0) {
      return 0;
    }

    const updatePromises = failedEvents.map(event =>
      this.db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxEventStatus.PENDING,
          nextAttemptAt: calculateNextAttemptAt(event.tries, retryConfig),
        },
      })
    );

    await Promise.all(updatePromises);
    return failedEvents.length;
  }

  async getEventById(eventId: string) {
    return this.db.outboxEvent.findUnique({
      where: { id: parseInt(eventId) },
    });
  }

  async getEventsByTenant(tenantId: string, limit: number = 100) {
    return this.db.outboxEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getEventsByType(eventType: string, limit: number = 100) {
    return this.db.outboxEvent.findMany({
      where: { eventType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async resetStuckEvents(stuckAfterMinutes: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - stuckAfterMinutes * 60 * 1000);

    const result = await this.db.outboxEvent.updateMany({
      where: {
        status: OutboxEventStatus.PROCESSING,
        createdAt: { lt: cutoffDate },
      },
      data: {
        status: OutboxEventStatus.PENDING,
        nextAttemptAt: new Date(),
      },
    });

    return result.count;
  }

  async restartDeadEvents(
    eventIds?: string[], 
    newMaxTries?: number
  ): Promise<{ restartedCount: number; events: any[] }> {
    const defaultMaxTries = newMaxTries ?? DEFAULT_RETRY_CONFIG.maxTries;
    
    // Build where clause for dead events
    const whereClause: Prisma.OutboxEventWhereInput = {
      status: OutboxEventStatus.DEAD,
    };
    
    // If specific event IDs provided, filter by them
    if (eventIds && eventIds.length > 0) {
      whereClause.id = {
        in: eventIds.map(id => parseInt(id)),
      };
    }

    // First, get the dead events that will be restarted
    const deadEvents = await this.db.outboxEvent.findMany({
      where: whereClause,
      select: {
        id: true,
        eventType: true,
        tries: true,
        createdAt: true,
      },
    });

    if (deadEvents.length === 0) {
      return { restartedCount: 0, events: [] };
    }

    // Update the dead events to pending status with increased max retry count
    // We'll use a custom field or approach to track the effective max retries
    // For now, we'll reset the tries to 0 but keep track of the original tries
    const updatePromises = deadEvents.map(event =>
      this.db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxEventStatus.PENDING,
          tries: 0, // Reset tries to 0 for fresh retry
          nextAttemptAt: new Date(), // Immediate retry
          lastError: null, // Clear the error
        },
      })
    );

    await Promise.all(updatePromises);

    return {
      restartedCount: deadEvents.length,
      events: deadEvents.map(event => ({
        id: event.id.toString(),
        eventType: event.eventType,
        originalTries: event.tries,
        createdAt: event.createdAt,
      })),
    };
  }

  async restartDeadEventById(
    eventId: string, 
    newMaxTries?: number
  ): Promise<{ success: boolean; event?: any; error?: string }> {
    try {
      const result = await this.restartDeadEvents([eventId], newMaxTries);
      
      if (result.restartedCount === 0) {
        return {
          success: false,
          error: 'Event not found or not in dead status',
        };
      }

      return {
        success: true,
        event: result.events[0],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}