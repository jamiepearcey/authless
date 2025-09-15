import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, platformAdminProcedure, tenantAdminProcedure } from "../middleware";

export const auditRouter = router({
  // Get audit events with pagination and filtering (platform admin)
  getAuditEvents: platformAdminProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      userId: z.string().optional(),
      action: z.string().optional(),
      resourceType: z.string().optional(),
      resourceId: z.string().optional(),
      severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
      dateFrom: z.string().optional(), // ISO date string
      dateTo: z.string().optional(),   // ISO date string
      search: z.string().optional(),   // Search in action, details, etc.
      limit: z.number().min(1).max(1000).default(100),
      offset: z.number().min(0).default(0),
      sortBy: z.enum(['createdAt', 'action', 'severity', 'userId']).default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ ctx, input }) => {
      // Build where clause for filtering
      const whereConditions: any = {};
      
      if (input.tenantId) {
        whereConditions.tenantId = input.tenantId;
      }
      
      if (input.userId) {
        whereConditions.userId = input.userId;
      }
      
      if (input.action) {
        whereConditions.action = { contains: input.action, mode: 'insensitive' };
      }
      
      if (input.resourceType) {
        whereConditions.resourceType = input.resourceType;
      }
      
      if (input.resourceId) {
        whereConditions.resourceId = input.resourceId;
      }
      
      if (input.severity) {
        whereConditions.severity = input.severity;
      }

      // Date range filtering
      if (input.dateFrom || input.dateTo) {
        whereConditions.createdAt = {};
        if (input.dateFrom) {
          whereConditions.createdAt.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          whereConditions.createdAt.lte = new Date(input.dateTo);
        }
      }

      // Search functionality
      if (input.search) {
        whereConditions.OR = [
          { action: { contains: input.search, mode: 'insensitive' } },
          { resourceType: { contains: input.search, mode: 'insensitive' } },
          { details: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      const [events, totalCount] = await Promise.all([
        ctx.db.auditLog.findMany({
          where: whereConditions,
          orderBy: { [input.sortBy]: input.sortOrder },
          take: input.limit,
          skip: input.offset,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
        ctx.db.auditLog.count({ where: whereConditions }),
      ]);

      return {
        events: events.map(event => ({
          ...event,
          id: event.id.toString(), // Convert BigInt to string
        })),
        totalCount,
        hasMore: totalCount > input.offset + input.limit,
        pagination: {
          offset: input.offset,
          limit: input.limit,
          totalCount,
          totalPages: Math.ceil(totalCount / input.limit),
          currentPage: Math.floor(input.offset / input.limit) + 1,
        },
      };
    }),

  // Get audit events for a specific tenant (tenant admin)
  getTenantAuditEvents: tenantAdminProcedure
    .input(z.object({
      tenantId: z.string(),
      userId: z.string().optional(),
      action: z.string().optional(),
      resourceType: z.string().optional(),
      severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(500).default(50),
      offset: z.number().min(0).default(0),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ ctx, input }) => {
      // Build where clause - always scoped to the tenant
      const whereConditions: any = {
        tenantId: input.tenantId,
      };
      
      if (input.userId) {
        whereConditions.userId = input.userId;
      }
      
      if (input.action) {
        whereConditions.action = { contains: input.action, mode: 'insensitive' };
      }
      
      if (input.resourceType) {
        whereConditions.resourceType = input.resourceType;
      }
      
      if (input.severity) {
        whereConditions.severity = input.severity;
      }

      if (input.dateFrom || input.dateTo) {
        whereConditions.createdAt = {};
        if (input.dateFrom) {
          whereConditions.createdAt.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          whereConditions.createdAt.lte = new Date(input.dateTo);
        }
      }

      if (input.search) {
        whereConditions.OR = [
          { action: { contains: input.search, mode: 'insensitive' } },
          { resourceType: { contains: input.search, mode: 'insensitive' } },
          { details: { contains: input.search, mode: 'insensitive' } },
        ];
      }

      const [events, totalCount] = await Promise.all([
        ctx.db.auditLog.findMany({
          where: whereConditions,
          orderBy: { createdAt: input.sortOrder },
          take: input.limit,
          skip: input.offset,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        ctx.db.auditLog.count({ where: whereConditions }),
      ]);

      return {
        events: events.map(event => ({
          ...event,
          id: event.id.toString(), // Convert BigInt to string
        })),
        totalCount,
        hasMore: totalCount > input.offset + input.limit,
      };
    }),

  // Get audit statistics
  getAuditStats: platformAdminProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};
      
      if (input.tenantId) {
        whereConditions.tenantId = input.tenantId;
      }

      if (input.dateFrom || input.dateTo) {
        whereConditions.createdAt = {};
        if (input.dateFrom) {
          whereConditions.createdAt.gte = new Date(input.dateFrom);
        }
        if (input.dateTo) {
          whereConditions.createdAt.lte = new Date(input.dateTo);
        }
      }

      const [
        totalEvents,
        eventsBySeverity,
        eventsByAction,
        eventsByResourceType,
        recentEvents,
      ] = await Promise.all([
        // Total count
        ctx.db.auditLog.count({ where: whereConditions }),
        
        // Events by severity
        ctx.db.auditLog.groupBy({
          by: ['severity'],
          where: whereConditions,
          _count: { severity: true },
        }),
        
        // Top actions
        ctx.db.auditLog.groupBy({
          by: ['action'],
          where: whereConditions,
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
          take: 10,
        }),
        
        // Events by resource type
        ctx.db.auditLog.groupBy({
          by: ['resourceType'],
          where: whereConditions,
          _count: { resourceType: true },
          orderBy: { _count: { resourceType: 'desc' } },
          take: 10,
        }),
        
        // Recent events (last 24 hours)
        ctx.db.auditLog.count({
          where: {
            ...whereConditions,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return {
        totalEvents,
        recentEvents,
        severityBreakdown: eventsBySeverity.reduce((acc, item) => {
          acc[item.severity as string] = item._count.severity;
          return acc;
        }, {} as Record<string, number>),
        topActions: eventsByAction.map(item => ({
          action: item.action,
          count: item._count.action,
        })),
        resourceTypeBreakdown: eventsByResourceType.map(item => ({
          resourceType: item.resourceType,
          count: item._count.resourceType,
        })),
      };
    }),

  // Get distinct values for filtering
  getFilterOptions: platformAdminProcedure
    .input(z.object({
      tenantId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};
      
      if (input.tenantId) {
        whereConditions.tenantId = input.tenantId;
      }

      const [actions, resourceTypes, userIds, tenantIds] = await Promise.all([
        ctx.db.auditLog.findMany({
          where: whereConditions,
          select: { action: true },
          distinct: ['action'],
          orderBy: { action: 'asc' },
          take: 100,
        }),
        ctx.db.auditLog.findMany({
          where: whereConditions,
          select: { resourceType: true },
          distinct: ['resourceType'],
          orderBy: { resourceType: 'asc' },
          take: 50,
        }),
        ctx.db.auditLog.findMany({
          where: {
            ...whereConditions,
            userId: { isNot: null },
          },
          select: { 
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          distinct: ['userId'],
          orderBy: { userId: 'asc' },
          take: 100,
        }),
        ctx.db.auditLog.findMany({
          where: {
            ...whereConditions,
            tenantId: { not: null as any },
          },
          select: { 
            tenantId: true,
            tenant: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          distinct: ['tenantId'],
          orderBy: { tenantId: 'asc' },
          take: 100,
        }),
      ]);

      return {
        actions: actions.map(a => a.action),
        resourceTypes: resourceTypes.map(rt => rt.resourceType),
        users: userIds.map(u => ({
          id: u.userId,
          name: u.user?.name,
          email: u.user?.email,
        })),
        tenants: tenantIds.map(t => ({
          id: t.tenantId,
          name: t.tenant?.name,
          slug: t.tenant?.slug,
        })),
      };
    }),

  // Get audit event details by ID
  getAuditEventById: platformAdminProcedure
    .input(z.object({ 
      eventId: z.string() 
    }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.db.auditLog.findUnique({
        where: { id: input.eventId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audit event not found" });
      }

      return event;
    }),
});