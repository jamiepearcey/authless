import { Context } from "./context";

/**
 * Helper function to create audit logs with trace ID
 */
export async function createAuditLog(
  ctx: Context,
  data: {
    tenantId?: string | null;
    userId: string;
    action: string;
    resourceType?: string | null;
    resourceId?: string | null;
    details?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: string | null;
    severity?: string;
  }
) {
  return await ctx.db.auditLog.create({
    data: {
      ...data,
      traceId: ctx.trace.traceId,
    },
  });
}

/**
 * Helper function to create audit logs for user actions
 */
export async function createUserAuditLog(
  ctx: Context,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, any>,
  options?: {
    tenantId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    severity?: string;
  }
) {
  return await createAuditLog(ctx, {
    tenantId: options?.tenantId || ctx.session?.user?.tenantId || null,
    userId: ctx.session?.user?.id || "system",
    action,
    resourceType: resourceType || null,
    resourceId: resourceId || null,
    details: details ? JSON.stringify(details) : null,
    ipAddress: options?.ipAddress || null,
    userAgent: options?.userAgent || null,
    metadata: null,
    severity: options?.severity || "info",
  });
}

/**
 * Helper function to create audit logs for system actions
 */
export async function createSystemAuditLog(
  ctx: Context,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, any>,
  options?: {
    tenantId?: string | null;
    severity?: string;
  }
) {
  return await createAuditLog(ctx, {
    tenantId: options?.tenantId || null,
    userId: "system",
    action,
    resourceType: resourceType || null,
    resourceId: resourceId || null,
    details: details ? JSON.stringify(details) : null,
    ipAddress: null,
    userAgent: null,
    metadata: null,
    severity: options?.severity || "info",
  });
}
