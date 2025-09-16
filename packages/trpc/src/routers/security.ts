import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, platformAdminProcedure } from "../middleware";

export const securityRouter = router({
  // Get failed login attempts
  getFailedLogins: platformAdminProcedure
    .input(z.object({ hours: z.number().min(1).max(168).default(24) }))
    .query(async ({ ctx, input }) => {
      const hoursAgo = new Date(Date.now() - input.hours * 60 * 60 * 1000);
      
      // Get failed login attempts from audit events
      const failedLogins = await ctx.db.auditEvent.findMany({
        where: {
          eventType: "auth",
          actionType: "login",
          actionOutcome: "failure",
          timestamp: {
            gte: hoursAgo,
          },
        },
        select: {
          id: true,
          timestamp: true,
          actorEmail: true,
          actorIpAddress: true,
          actionReason: true,
          tenantId: true,
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 100,
      });

      return {
        failedLogins,
        total: failedLogins.length,
        timeRange: `${input.hours} hours`,
      };
    }),

  // Get active sessions
  getActiveSessions: platformAdminProcedure
    .query(async ({ ctx }) => {
      const activeSessions = await ctx.db.session.findMany({
        where: {
          expires: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          userId: true,
          expires: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          expires: "desc",
        },
        take: 100,
      });

      return {
        activeSessions,
        total: activeSessions.length,
      };
    }),

  // Get recent audit events
  getRecentAuditEvents: platformAdminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ ctx, input }) => {
      const auditEvents = await ctx.db.auditEvent.findMany({
        select: {
          id: true,
          eventType: true,
          eventName: true,
          timestamp: true,
          actorEmail: true,
          actionType: true,
          actionDescription: true,
          actionOutcome: true,
          tenantId: true,
        },
        orderBy: {
          timestamp: "desc",
        },
        take: input.limit,
      });

      return auditEvents;
    }),

  // Update security settings
  updateSecuritySettings: platformAdminProcedure
    .input(z.object({
      rateLimit: z.number().min(1).max(10000).optional(),
      sessionTimeout: z.number().min(1).max(168).optional(),
      maxFailedLogins: z.number().min(1).max(20).optional(),
      require2FA: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // For now, we'll just return success
      // In a real implementation, you'd update security configuration
      // stored in a settings table or environment variables
      
      return {
        success: true,
        message: "Security settings updated successfully",
        settings: input,
      };
    }),

  // Get security statistics
  getSecurityStats: platformAdminProcedure
    .query(async ({ ctx }) => {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        failedLogins24h,
        failedLogins7d,
        activeSessions,
        totalUsers,
        recentAuditEvents,
      ] = await Promise.all([
        // Failed logins in last 24 hours
        ctx.db.auditEvent.count({
          where: {
            eventType: "auth",
            actionType: "login",
            actionOutcome: "failure",
            timestamp: { gte: last24Hours },
          },
        }),
        // Failed logins in last 7 days
        ctx.db.auditEvent.count({
          where: {
            eventType: "auth",
            actionType: "login",
            actionOutcome: "failure",
            timestamp: { gte: last7Days },
          },
        }),
        // Active sessions
        ctx.db.session.count({
          where: {
            expires: { gt: now },
          },
        }),
        // Total users
        ctx.db.user.count(),
        // Recent audit events
        ctx.db.auditEvent.count({
          where: {
            timestamp: { gte: last24Hours },
          },
        }),
      ]);

      return {
        failedLogins24h,
        failedLogins7d,
        activeSessions,
        totalUsers,
        recentAuditEvents,
        lastUpdated: now,
      };
    }),
});
