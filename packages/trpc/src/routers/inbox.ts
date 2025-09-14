import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, platformAdminProcedure, publicProcedure } from "../middleware";

export const inboxRouter = router({
  // Get inbox statistics
  getStats: platformAdminProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};
      
      if (input.tenantId) {
        whereConditions.tenantId = input.tenantId;
      }

      const [received, processing, processed, failed, dead] = await Promise.all([
        ctx.db.inboxEvent.count({ where: { ...whereConditions, status: "received" } }),
        ctx.db.inboxEvent.count({ where: { ...whereConditions, status: "processing" } }),
        ctx.db.inboxEvent.count({ where: { ...whereConditions, status: "processed" } }),
        ctx.db.inboxEvent.count({ where: { ...whereConditions, status: "failed" } }),
        ctx.db.inboxEvent.count({ where: { ...whereConditions, status: "dead" } }),
      ]);

      return {
        received,
        processing,
        processed,
        failed,
        dead,
        total: received + processing + processed + failed + dead,
      };
    }),

  // Get inbox events with pagination and filtering
  getEvents: platformAdminProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      eventType: z.string().optional(),
      status: z.enum(['received', 'processing', 'processed', 'failed', 'dead']).optional(),
      source: z.string().optional(),
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

      if (input.source) {
        whereConditions.source = input.source;
      }

      const events = await ctx.db.inboxEvent.findMany({
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
          source: true,
          sourceId: true,
          traceId: true,
        },
      });

      const totalCount = await ctx.db.inboxEvent.count({
        where: whereConditions,
      });

      return {
        events,
        totalCount,
        hasMore: totalCount > input.offset + input.limit,
      };
    }),

  // Get event details by ID
  getEventById: platformAdminProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.inboxEvent.findUnique({
        where: { id: parseInt(input.eventId) },
      });

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      return event;
    }),

  // Get unique event types
  getEventTypes: platformAdminProcedure
    .query(async ({ ctx }) => {
      const eventTypes = await ctx.db.inboxEvent.findMany({
        select: { eventType: true },
        distinct: ['eventType'],
        orderBy: { eventType: 'asc' },
      });

      return eventTypes.map(et => et.eventType);
    }),

  // Get unique sources
  getSources: platformAdminProcedure
    .query(async ({ ctx }) => {
      const sources = await ctx.db.inboxEvent.findMany({
        select: { source: true },
        distinct: ['source'],
        where: { source: { not: null } },
        orderBy: { source: 'asc' },
      });

      return sources.map(s => s.source).filter(Boolean);
    }),

  // Manually insert an inbox event
  insertEvent: platformAdminProcedure
    .input(z.object({
      eventType: z.string().min(1),
      aggregateType: z.string().min(1),
      aggregateId: z.string().min(1),
      tenantId: z.string().optional(),
      payloadJson: z.any(),
      idempotencyKey: z.string().optional(),
      source: z.string().optional(),
      sourceId: z.string().optional(),
      traceId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const event = await ctx.db.inboxEvent.create({
          data: {
            eventType: input.eventType,
            aggregateType: input.aggregateType,
            aggregateId: input.aggregateId,
            tenantId: input.tenantId,
            payloadJson: input.payloadJson,
            idempotencyKey: input.idempotencyKey,
            source: input.source,
            sourceId: input.sourceId,
            traceId: input.traceId,
            status: "received",
          },
        });

        return {
          success: true,
          message: "Inbox event created successfully",
          event,
        };
      } catch (error) {
        console.error("Failed to create inbox event:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create inbox event",
        });
      }
    }),

  // Retry failed events
  retryFailedEvents: platformAdminProcedure
    .input(z.object({ 
      maxRetries: z.number().min(1).max(1000).default(100) 
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.inboxEvent.updateMany({
        where: {
          status: "failed",
          tries: { lt: input.maxRetries },
        },
        data: {
          status: "received",
          nextAttemptAt: new Date(),
        },
      });
      
      return { 
        success: true, 
        message: `${result.count} events marked for retry`,
        retriedCount: result.count,
      };
    }),

  // Reset stuck events
  resetStuckEvents: platformAdminProcedure
    .input(z.object({ 
      stuckAfterMinutes: z.number().min(1).max(1440).default(30) 
    }))
    .mutation(async ({ ctx, input }) => {
      const stuckThreshold = new Date(Date.now() - input.stuckAfterMinutes * 60 * 1000);
      
      const result = await ctx.db.inboxEvent.updateMany({
        where: {
          status: "processing",
          nextAttemptAt: { lt: stuckThreshold },
        },
        data: {
          status: "received",
          nextAttemptAt: new Date(),
        },
      });
      
      return { 
        success: true, 
        message: `${result.count} stuck events reset`,
        resetCount: result.count,
      };
    }),

  // Clean up old processed events
  cleanupProcessedEvents: platformAdminProcedure
    .input(z.object({ 
      olderThanHours: z.number().min(1).max(8760).default(24) 
    }))
    .mutation(async ({ ctx, input }) => {
      const cutoffDate = new Date(Date.now() - input.olderThanHours * 60 * 60 * 1000);
      
      const result = await ctx.db.inboxEvent.deleteMany({
        where: {
          status: "processed",
          createdAt: { lt: cutoffDate },
        },
      });
      
      return { 
        success: true, 
        message: `${result.count} processed events cleaned up`,
        cleanedCount: result.count,
      };
    }),

  // Delete an event
  deleteEvent: platformAdminProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.inboxEvent.delete({
          where: { id: parseInt(input.eventId) },
        });

        return {
          success: true,
          message: "Event deleted successfully",
        };
      } catch (error) {
        console.error("Failed to delete inbox event:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete inbox event",
        });
      }
    }),
});
