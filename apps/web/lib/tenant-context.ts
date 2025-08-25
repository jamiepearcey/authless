import { headers } from "next/headers";
import { db } from "@db/base";

export interface TenantContext {
  tenantSlug: string | null;
  tenantId: string | null;
  tenant: any | null;
  isSubdomainMode: boolean;
  isPathMode: boolean;
  isUntenanted: boolean;
  mode: "subdomain" | "path" | "untenanted";
}

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  status: string;
  subdomain: string | null;
  customDomain: string | null;
  logoUrl: string | null;
  theme: string | null;
  invitePolicy: string;
  emailVerificationBypassEnabled: boolean;
  locale: string;
  timezone: string;
  plan: string;
  limits: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Get tenant context from request headers (server-side)
export async function getTenantContext(): Promise<TenantContext> {
  const headersList = await headers();
  
  const tenantSlug = headersList.get("x-tenant-slug") || null;
  const mode = (headersList.get("x-tenant-mode") as "subdomain" | "path" | "untenanted") || "untenanted";
  const isUntenanted = headersList.get("x-is-untenanted") === "true";
  
  const isSubdomainMode = mode === "subdomain";
  const isPathMode = mode === "path";
  
  let tenant: TenantInfo | null = null;
  let tenantId: string | null = null;
  
  if (tenantSlug) {
    try {
      tenant = await db.tenant.findUnique({
        where: { 
          slug: tenantSlug,
          status: "active" // Only active tenants
        },
      });
      
      if (tenant) {
        tenantId = tenant.id;
      }
    } catch (error) {
      console.error("Error fetching tenant:", error);
    }
  }
  
  return {
    tenantSlug,
    tenantId,
    tenant,
    isSubdomainMode,
    isPathMode,
    isUntenanted,
    mode,
  };
}

// Get tenant context from client-side (for use in components)
export function getClientTenantContext(): Partial<TenantContext> {
  // This will be populated by the server and passed to the client
  // For now, return basic info that can be determined client-side
  return {
    isUntenanted: true, // Default to untenanted until server provides context
    mode: "untenanted",
  };
}

// Validate tenant slug format
export function isValidTenantSlug(slug: string): boolean {
  if (slug.length < 2 || slug.length > 32) return false;
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  if (slug.startsWith("-") || slug.endsWith("-")) return false;
  
  const reservedSubdomains = [
    "www", "app", "admin", "api", "static", "cdn", "mail", "ftp",
    "blog", "docs", "help", "support", "status", "monitoring",
    "analytics", "webhooks"
  ];
  
  if (reservedSubdomains.includes(slug)) return false;
  
  return true;
}

// Generate tenant URL based on mode
export function getTenantUrl(tenantSlug: string, path: string = "", mode: "subdomain" | "path" = "subdomain"): string {
  if (mode === "subdomain") {
    // For development, use localhost with subdomain
    if (process.env.NODE_ENV === "development") {
      return `http://${tenantSlug}.localhost:3000${path}`;
    }
    // For production, use actual domain
    const domain = process.env.NEXT_PUBLIC_APP_URL || "https://example.com";
    const domainParts = domain.replace(/^https?:\/\//, "").split("/")[0];
    return `https://${tenantSlug}.${domainParts}${path}`;
  } else {
    // Path mode
    return `/tenants/${tenantSlug}${path}`;
  }
}

// Get current tenant URL
export function getCurrentTenantUrl(path: string = ""): string {
  // This will be determined by the current request context
  // For now, return a placeholder
  return path;
}

// Check if user has access to tenant
export async function checkTenantAccess(tenantId: string, userId: string): Promise<{
  hasAccess: boolean;
  role: string | null;
  isAdmin: boolean;
}> {
  try {
    const membership = await db.membership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
    });
    
    if (!membership) {
      return {
        hasAccess: false,
        role: null,
        isAdmin: false,
      };
    }
    
    return {
      hasAccess: true,
      role: membership.role,
      isAdmin: membership.role === "admin",
    };
  } catch (error) {
    console.error("Error checking tenant access:", error);
    return {
      hasAccess: false,
      role: null,
      isAdmin: false,
    };
  }
}

// Check if user is platform admin
export async function checkPlatformAdmin(userId: string): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { platformRole: true },
    });
    
    return user?.platformRole === "admin";
  } catch (error) {
    console.error("Error checking platform admin:", error);
    return false;
  }
}

// Get user's tenants
export async function getUserTenants(userId: string): Promise<Array<{
  tenant: TenantInfo;
  role: string;
  isAdmin: boolean;
}>> {
  try {
    const memberships = await db.membership.findMany({
      where: { userId },
      include: {
        tenant: true,
      },
    });
    
    return memberships.map(membership => ({
      tenant: membership.tenant as TenantInfo,
      role: membership.role,
      isAdmin: membership.role === "admin",
    }));
  } catch (error) {
    console.error("Error fetching user tenants:", error);
    return [];
  }
}
