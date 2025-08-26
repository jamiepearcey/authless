import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Reserved subdomains that should not be treated as tenants
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "static",
  "cdn",
  "mail",
  "ftp",
  "blog",
  "docs",
  "help",
  "support",
  "status",
  "monitoring",
  "analytics",
  "webhooks",
]);

// Tenant slug validation rules
function isValidTenantSlug(slug: string): boolean {
  if (slug.length < 2 || slug.length > 32) return false;
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  if (slug.startsWith("-") || slug.endsWith("-")) return false;
  if (RESERVED_SUBDOMAINS.has(slug)) return false;
  return true;
}

// Extract tenant from subdomain
function getTenantFromSubdomain(hostname: string): string | null {
  const parts = hostname.split(".");
  
  // Handle localhost for development
  if (hostname.includes("localhost")) {
    const subdomain = parts[0];
    if (subdomain !== "localhost" && isValidTenantSlug(subdomain)) {
      return subdomain;
    }
    return null;
  }
  
  // Handle production domains (e.g., tenant.example.com)
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (isValidTenantSlug(subdomain)) {
      return subdomain;
    }
  }
  
  return null;
}

// Extract tenant from path
function getTenantFromPath(pathname: string): string | null {
  const pathParts = pathname.split("/");
  if (pathParts[1] === "tenants" && pathParts[2]) {
    const tenantSlug = pathParts[2];
    if (isValidTenantSlug(tenantSlug)) {
      return tenantSlug;
    }
  }
  return null;
}

// Resolve tenant using the specified resolution order
function resolveTenant(request: NextRequest): {
  tenantSlug: string | null;
  isSubdomainMode: boolean;
  isPathMode: boolean;
  isUntenanted: boolean;
} {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;
  
  // Resolution order: 1. Subdomain, 2. Path, 3. Untenanted
  
  // 1. Try subdomain mode first
  const subdomainTenant = getTenantFromSubdomain(hostname);
  if (subdomainTenant) {
    return {
      tenantSlug: subdomainTenant,
      isSubdomainMode: true,
      isPathMode: false,
      isUntenanted: false,
    };
  }
  
  // 2. Try path mode as fallback
  const pathTenant = getTenantFromPath(pathname);
  if (pathTenant) {
    return {
      tenantSlug: pathTenant,
      isSubdomainMode: false,
      isPathMode: true,
      isUntenanted: false,
    };
  }
  
  // 3. No tenant resolved (untenanted/platform mode)
  return {
    tenantSlug: null,
    isSubdomainMode: false,
    isPathMode: false,
    isUntenanted: true,
  };
}

export function middleware(request: NextRequest) {
  const { tenantSlug, isSubdomainMode, isPathMode, isUntenanted } = resolveTenant(request);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", tenantSlug || "");
  requestHeaders.set("x-tenant-mode", isSubdomainMode ? "subdomain" : isPathMode ? "path" : "untenanted");
  requestHeaders.set("x-is-untenanted", String(isUntenanted));

  const pathname = request.nextUrl.pathname;
  const pathParts = pathname.split("/");

  // Check if the path requires authentication
  const protectedPaths = ["/settings", "/admin", "/dashboard"];
  const requiresAuth = protectedPaths.some(path => pathname.startsWith(path));
  
  if (requiresAuth) {
    // Check for authentication token (session cookie)
    const authToken = request.cookies.get("next-auth.session-token") || 
                     request.cookies.get("__Secure-next-auth.session-token");
    
    if (!authToken) {
      // Redirect to passkey-select page first, which will redirect to signin if no passkeys
      const passkeySelectUrl = new URL("/passkey-select", request.url);
      passkeySelectUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(passkeySelectUrl);
    }
  }

  if (isPathMode && tenantSlug) {
    // We’re in /tenants/[slug] mode
    if (pathParts[1] === "tenants" && pathParts[2]) {
      const nextSegment = pathParts[3]; // after the slug

      // ✅ Do not rewrite if:
      // - exactly /tenants/[slug] (no extra segments)
      // - or starts with /tenants/[slug]/admin
      if (!nextSegment || nextSegment === "admin") {
        return NextResponse.next({
          request: { headers: requestHeaders },
        });
      }

      // ❗ Otherwise, strip /tenants/[slug] and rewrite
      const newUrl = request.nextUrl.clone();
      newUrl.pathname = "/" + pathParts.slice(3).join("/");
      return NextResponse.rewrite(newUrl, {
        request: { headers: requestHeaders },
      });
    }
  }

  // Subdomain or untenanted
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};