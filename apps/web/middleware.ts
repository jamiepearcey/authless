import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyRateLimitWithHeaders } from "./lib/rate-limiter";

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

// Load custom domains from environment variables or use static config
// Environment variable format: CUSTOM_DOMAINS="domain1.com:tenant1,domain2.com:tenant2"
const loadCustomDomains = (): Record<string, string> => {
  const staticDomains = {
    'demoday.deepintrospect.com': 'demoday',
    // Add other known custom domains here
  };

  const envDomains = process.env.CUSTOM_DOMAINS;
  if (envDomains) {
    const envMappings: Record<string, string> = {};
    envDomains.split(',').forEach(mapping => {
      const [domain, tenant] = mapping.split(':');
      if (domain && tenant) {
        envMappings[domain.trim()] = tenant.trim();
      }
    });
    return { ...staticDomains, ...envMappings };
  }

  return staticDomains;
};

const KNOWN_CUSTOM_DOMAINS = loadCustomDomains();

// Get tenant from domain alias (simple lookup without database)
function getTenantFromDomainAlias(hostname: string): string | null {
  // Check if this is a known custom domain
  return KNOWN_CUSTOM_DOMAINS[hostname] || null;
}

// Resolve tenant using the specified resolution order
function resolveTenant(request: NextRequest): {
  tenantSlug: string | null;
  isSubdomainMode: boolean;
  isPathMode: boolean;
  isDomainMode: boolean;
  isUntenanted: boolean;
} {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;
  
  // Resolution order: 1. Custom Domain, 2. Subdomain, 3. Path, 4. Untenanted
  
  // 1. Try custom domain mode first (highest priority)
  const domainTenant = getTenantFromDomainAlias(hostname);
  if (domainTenant) {
    return {
      tenantSlug: domainTenant,
      isSubdomainMode: false,
      isPathMode: false,
      isDomainMode: true,
      isUntenanted: false,
    };
  }
  
  // 2. Try subdomain mode
  const subdomainTenant = getTenantFromSubdomain(hostname);
  if (subdomainTenant) {
    return {
      tenantSlug: subdomainTenant,
      isSubdomainMode: true,
      isPathMode: false,
      isDomainMode: false,
      isUntenanted: false,
    };
  }
  
  // 3. Try path mode as fallback
  const pathTenant = getTenantFromPath(pathname);
  if (pathTenant) {
    return {
      tenantSlug: pathTenant,
      isSubdomainMode: false,
      isPathMode: true,
      isDomainMode: false,
      isUntenanted: false,
    };
  }
  
  // 4. No tenant resolved (untenanted/platform mode)
  return {
    tenantSlug: null,
    isSubdomainMode: false,
    isPathMode: false,
    isDomainMode: false,
    isUntenanted: true,
  };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Apply rate limiting with error handling
  let rateLimitResponse;
  
  try {
    rateLimitResponse = await applyRateLimitWithHeaders(request);
    
    // If rate limit exceeded, return error response
    if (!rateLimitResponse.result.success) {
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResponse.result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitResponse.headers,
          },
        }
      );
    }
  } catch (error) {
    // If rate limiting fails, log error but continue processing request
    console.error('Rate limiting error:', error);
    // Set a default rate limit response to continue processing
    rateLimitResponse = {
      result: {
        success: true,
        limit: 100,
        remaining: 99,
        reset: new Date(Date.now() + 60000), // 1 minute from now
      },
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
      },
    };
  }

  const { tenantSlug, isSubdomainMode, isPathMode, isDomainMode, isUntenanted } = resolveTenant(request);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", tenantSlug || "");
  requestHeaders.set("x-tenant-mode", 
    isDomainMode ? "domain" : 
    isSubdomainMode ? "subdomain" : 
    isPathMode ? "path" : 
    "untenanted"
  );
  requestHeaders.set("x-is-untenanted", String(isUntenanted));
  const pathParts = pathname.split("/");

  // Handle SSO redirection for tenant sign-in pages
  // Note: SSO redirection logic moved to the sign-in page component
  // since middleware runs in Edge Runtime and can't access database

  // Handle /auth routing
  if (pathname === "/auth") {
    // Always route to /auth/signin/passkey by default
    // The page will offer a fallback to /auth/signin if no passkeys are available
    const passkeyUrl = new URL("/auth/signin/passkey", request.url);
    
    // Preserve query parameters (e.g., callbackUrl)
    request.nextUrl.searchParams.forEach((value, key) => {
      passkeyUrl.searchParams.set(key, value);
    });
    
    return NextResponse.redirect(passkeyUrl);
  }

  // Check if the path requires authentication
  const protectedPaths = ["/settings", "/admin", "/dashboard"];
  const requiresAuth = protectedPaths.some(path => pathname.startsWith(path));
  
  if (requiresAuth) {
    // Check for authentication token (session cookie)
    const authToken = request.cookies.get("next-auth.session-token") || 
                     request.cookies.get("__Secure-next-auth.session-token");
    
    if (!authToken) {
      // Redirect to signin/passkey page first, which will redirect to signin if no passkeys
      const passkeySelectUrl = new URL("/auth/signin/passkey", request.url);
      passkeySelectUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(passkeySelectUrl);
    }
  }

  // Handle tenant-specific routing
  if (!isUntenanted || tenantSlug) {
    // We're in /tenants/[slug] mode
    if (pathParts[1] === "tenants" && pathParts[2]) {
      const nextSegment = pathParts[3]; // after the slug

      // ✅ Do not rewrite if:
      // - exactly /tenants/[slug] (no extra segments)
      // - or starts with /tenants/[slug]/admin
      if (!nextSegment || nextSegment === "admin") {
        const response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        
        // Add rate limit headers to response
        Object.entries(rateLimitResponse.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        
        return response;
      }

      // ❗ Otherwise, strip /tenants/[slug] and rewrite
      const newUrl = request.nextUrl.clone();
      newUrl.pathname = "/" + pathParts.slice(3).join("/");
      const response = NextResponse.rewrite(newUrl, {
        request: { headers: requestHeaders },
      });
      
      // Add rate limit headers to response
      Object.entries(rateLimitResponse.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    }
  }

  // Subdomain, Domain mode, or untenanted
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  
  // Add rate limit headers to response
  Object.entries(rateLimitResponse.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};