import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, platformAdminProcedure } from "../middleware";

export const outboxRouter = router({
  // Get outbox statistics
  getOutboxStats: platformAdminProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.outbox.getStats(input.tenantId);
    }),

  // Get outbox events with pagination and filtering
  getOutboxEvents: platformAdminProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      eventType: z.string().optional(),
      status: z.enum(['pending', 'processing', 'sent', 'failed', 'dead']).optional(),
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Build where clause for filtering
      const whereConditions: any = {};
      
      if (input.tenantId) {
        whereConditions.tenantId = input.tenantId;
      }
      
      if (input.eventType) {
        whereConditions.eventType = input.eventType;
      }
      
      if (input.status) {
        whereConditions.status = input.status;
      }

      const events = await ctx.db.outboxEvent.findMany({
        where: whereConditions,
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
        select: {
          id: true,
          eventType: true,
          aggregateType: true,
          aggregateId: true,
          tenantId: true,
          status: true,
          tries: true,
          lastError: true,
          createdAt: true,
          nextAttemptAt: true,
          payloadJson: true,
        },
      });

      const totalCount = await ctx.db.outboxEvent.count({
        where: whereConditions,
      });

      return {
        events,
        totalCount,
        hasMore: totalCount > input.offset + input.limit,
      };
    }),

  // Get event details by ID
  getOutboxEventById: platformAdminProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.outboxEvent.findUnique({
        where: { id: parseInt(input.eventId) },
      });

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      return event;
    }),

  // Retry failed events
  retryFailedEvents: platformAdminProcedure
    .input(z.object({ 
      maxRetries: z.number().min(1).max(1000).default(100) 
    }))
    .mutation(async ({ ctx, input }) => {
      const repository = new (await import("@db/base")).OutboxRepository(ctx.db);
      const retriedCount = await repository.retryFailedEvents(input.maxRetries);
      
      return { 
        success: true, 
        message: `${retriedCount} events marked for retry`,
        retriedCount 
      };
    }),

  // Reset stuck events
  resetStuckEvents: platformAdminProcedure
    .input(z.object({ 
      stuckAfterMinutes: z.number().min(1).max(1440).default(30) 
    }))
    .mutation(async ({ ctx, input }) => {
      const repository = new (await import("@db/base")).OutboxRepository(ctx.db);
      const resetCount = await repository.resetStuckEvents(input.stuckAfterMinutes);
      
      return { 
        success: true, 
        message: `${resetCount} stuck events reset`,
        resetCount 
      };
    }),

  // Clean up old processed events
  cleanupProcessedEvents: platformAdminProcedure
    .input(z.object({ 
      olderThanHours: z.number().min(1).max(8760).default(24) 
    }))
    .mutation(async ({ ctx, input }) => {
      const repository = new (await import("@db/base")).OutboxRepository(ctx.db);
      const cleanedCount = await repository.cleanupProcessedEvents(input.olderThanHours);
      
      return { 
        success: true, 
        message: `${cleanedCount} processed events cleaned up`,
        cleanedCount 
      };
    }),

  // Get recent events by tenant
  getEventsByTenant: platformAdminProcedure
    .input(z.object({ 
      tenantId: z.string(),
      limit: z.number().min(1).max(500).default(100) 
    }))
    .query(async ({ ctx, input }) => {
      const events = await ctx.outbox.getEventsByTenant(input.tenantId, input.limit);
      return events;
    }),

  // Get events by type
  getEventsByType: platformAdminProcedure
    .input(z.object({ 
      eventType: z.string(),
      limit: z.number().min(1).max(500).default(100) 
    }))
    .query(async ({ ctx, input }) => {
      const events = await ctx.outbox.getEventsByType(input.eventType, input.limit);
      return events;
    }),

  // Get distinct event types for filtering
  getOutboxEventTypes: platformAdminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.outboxEvent.findMany({
      select: { eventType: true },
      distinct: ['eventType'],
      orderBy: { eventType: 'asc' },
    });

    return result.map(r => r.eventType);
  }),

  // Get distinct tenant IDs for filtering
  getTenantIds: platformAdminProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.outboxEvent.findMany({
      select: { tenantId: true },
      distinct: ['tenantId'],
      where: { tenantId: { not: "" } },
      orderBy: { tenantId: 'asc' },
    });

    return result.map(r => r.tenantId);
  }),

  // Restart dead events (bulk)
  restartDeadEvents: platformAdminProcedure
    .input(z.object({ 
      eventIds: z.array(z.string()).optional(),
      newMaxTries: z.number().min(1).max(1000).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const repository = new (await import("@db/base")).OutboxRepository(ctx.db);
      const result = await repository.restartDeadEvents(input.eventIds, input.newMaxTries);
      
      return { 
        success: true, 
        message: `${result.restartedCount} dead events restarted`,
        restartedCount: result.restartedCount,
        events: result.events
      };
    }),

  // Restart a single dead event by ID
  restartDeadEventById: platformAdminProcedure
    .input(z.object({ 
      eventId: z.string(),
      newMaxTries: z.number().min(1).max(1000).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const repository = new (await import("@db/base")).OutboxRepository(ctx.db);
      const result = await repository.restartDeadEventById(input.eventId, input.newMaxTries);
      
      return result;
    }),
});