
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { Context } from "./context";

export { createContext, type Context } from "./context";

export type { AppRouter } from "./main-router";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Base middleware for authentication
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// Admin helper function
export const isAdmin = async (
  ctx: Context,
  tenantId?: string
): Promise<boolean> => {
  if (!ctx.session?.user?.email) {
    return false;
  }

  // Check if user is global platform admin
  const user = await ctx.db.user.findUnique({
    where: { email: ctx.session.user.email },
    select: { platformRole: true },
  });

  if (user?.platformRole === "admin") {
    return true;
  }

  // If tenantId is provided, check if user is admin of that specific tenant
  if (tenantId) {
    const membership = await ctx.db.membership.findFirst({
      where: {
        userId: ctx.session.user.id || ctx.session.user.email,
        tenantId: tenantId,
        role: "admin",
        status: "active",
      },
    });

    return !!membership;
  }

  return false;
};

// Platform admin middleware
const enforcePlatformAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  
  const user = await ctx.db.user.findUnique({
    where: { email: ctx.session.user.email },
    select: { platformRole: true },
  });
  
  if (user?.platformRole !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Platform admin access required" });
  }
  
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const platformAdminProcedure = protectedProcedure.use(enforcePlatformAdmin);

// Tenant admin middleware
const enforceTenantAdmin = t.middleware(async ({ ctx, next, getRawInput }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  
  // Extract tenantId from input if available
  const rawInput = await getRawInput();
  let slug = (rawInput as any)?.slug || (rawInput as any)?.tenantSlug;
  
  if(!slug) {
    const tenantId = (rawInput as any)?.tenantId;

    const tenant = await ctx.db.tenant.findUnique({
      where: { id: tenantId },
    });

    if(!tenant) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant not found" });
    }

    slug = tenant.slug;
  }

  if (!slug) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" });
  }

  if(ctx.session.user.platformRole === "admin"){
    return next({
      ctx: {
        ...ctx,
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  }
  
  const membership = await ctx.db.membership.findFirst({
    where: {
      userId: ctx.session.user.id || ctx.session.user.email,
      tenant: { slug },
      role: "admin",
      status: "active",
    },
  });
  
  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Tenant admin access required" });
  }
  
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const tenantAdminProcedure = protectedProcedure.use(enforceTenantAdmin);

// Tenant member middleware (for users who are members of a specific tenant)
const enforceTenantMember = t.middleware(async ({ ctx, next, getRawInput }) => {
  if (!ctx.session?.user?.email) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const rawInput = await getRawInput();
  console.log("rawInput", rawInput);
  const slug = (rawInput as any)?.slug || (rawInput as any)?.tenantSlug;
  
  if (!slug) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant Slug required" });
  }
  
  if (ctx.session.user?.platformRole !== "admin") {
    const membership = await ctx.db.membership.findFirst({
      where: {
        userId: ctx.session.user.id || ctx.session.user.email,
        tenant: { slug },
        status: "active",
      },
    });
    
    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Tenant access required" });
    }
  }
  
  
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const tenantMemberProcedure = protectedProcedure.use(enforceTenantMember);
