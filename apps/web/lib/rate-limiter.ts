import { NextRequest } from "next/server";

// Rate limit configuration for different endpoint patterns
export interface RateLimitConfig {
  // Pattern to match against the pathname
  pattern: string | RegExp;
  // HTTP methods this limit applies to (e.g., ['GET'], ['POST'], ['GET', 'POST'])
  methods: string[];
  // Rate limit values
  limit: number;
  windowMs: number; // Time window in milliseconds
  // Optional: Custom key function for more complex rate limiting
  keyGenerator?: (request: NextRequest) => string;
  // Optional: Skip rate limiting for certain conditions
  skip?: (request: NextRequest) => boolean;
}

// Rate limit result
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Rate limit response with headers
export interface RateLimitResponse {
  result: RateLimitResult;
  headers: Record<string, string>;
}

// Generic rate limiter class
export class RateLimiter {
  private store: Map<string, { count: number; resetTime: number }>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.store = new Map();
    
    // Clean up expired entries periodically
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
    }, 60 * 1000); // Clean up every minute
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }

  // Apply rate limiting based on configuration
  async applyLimit(
    request: NextRequest, 
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator?.(request) || this.defaultKeyGenerator(request);
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const resetTime = windowStart + config.windowMs;
    const storeKey = `${key}:${windowStart}`;
    
    // Get current count
    const current = this.store.get(storeKey) || { count: 0, resetTime };
    
    // Check if we've exceeded the limit
    if (current.count >= config.limit) {
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      return {
        success: false,
        limit: config.limit,
        remaining: 0,
        reset: new Date(resetTime),
        retryAfter,
      };
    }
    
    // Increment the count
    current.count++;
    this.store.set(storeKey, current);
    
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - current.count,
      reset: new Date(resetTime),
    };
  }

  // Apply rate limiting with headers
  async applyLimitWithHeaders(
    request: NextRequest, 
    config: RateLimitConfig
  ): Promise<RateLimitResponse> {
    const result = await this.applyLimit(request, config);
    
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toISOString(),
    };

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return {
      result,
      headers,
    };
  }

  // Default key generator using IP + User Agent
  private defaultKeyGenerator(request: NextRequest): string {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return `${ip}:${userAgent}`;
  }

  // Clear all rate limits (useful for testing)
  clearAll(): void {
    this.store.clear();
  }

  // Clear rate limits for a specific key pattern
  clearForPattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  // Cleanup resources
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Rate limit configuration manager
export class RateLimitConfigManager {
  private configs: RateLimitConfig[] = [];

  constructor() {
    this.loadDefaultConfigs();
  }

  // Add a configuration to the stack
  addConfig(config: RateLimitConfig): void {
    this.configs.push(config);
  }

  // Add multiple configurations
  addConfigs(configs: RateLimitConfig[]): void {
    this.configs.push(...configs);
  }

  // Find the first matching configuration
  findMatchingConfig(request: NextRequest): RateLimitConfig | null {
    const pathname = request.nextUrl.pathname;
    const method = request.method.toUpperCase();
    
    for (const config of this.configs) {
      // Check if the pattern matches
      const patternMatches = typeof config.pattern === 'string' 
        ? pathname.startsWith(config.pattern)
        : config.pattern.test(pathname);
      
      // Check if the method matches
      const methodMatches = config.methods.includes(method);
      
      // Check if we should skip this rate limit
      const shouldSkip = config.skip?.(request) || false;
      
      if (patternMatches && methodMatches && !shouldSkip) {
        return config;
      }
    }
    
    return null;
  }

  // Load default configurations
  private loadDefaultConfigs(): void {
    // Default key generators
    const defaultKeyGenerator = (request: NextRequest): string => {
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      return `${ip}:${userAgent}`;
    };

    const authenticatedKeyGenerator = (request: NextRequest): string => {
      const authToken = request.cookies.get("next-auth.session-token") || 
                       request.cookies.get("__Secure-next-auth.session-token");
      
      if (authToken) {
        // Use a hash of the token for authenticated users
        return `auth:${authToken.value.substring(0, 16)}`;
      }
      
      // Fallback to IP-based for unauthenticated users
      return defaultKeyGenerator(request);
    };

    const isAuthenticated = (request: NextRequest): boolean => {
      const authToken = request.cookies.get("next-auth.session-token") || 
                       request.cookies.get("__Secure-next-auth.session-token");
      return !!authToken;
    };

    // Default configurations - ordered from most specific to least specific
    this.configs = [
      // Development mode - very lenient for testing
      ...(process.env.NODE_ENV === 'development' ? [
        {
          pattern: /^\/api\/trpc\/(getDashboardLayout|saveDashboardLayout|resetDashboardLayout)/,
          methods: ['POST'],
          limit: 1000, // Very high limit for development
          windowMs: 60 * 1000, // 1 minute
          keyGenerator: authenticatedKeyGenerator,
        },
        {
          pattern: /^\/api\/trpc\/getCentrifugoToken/,
          methods: ['GET', 'POST'],
          limit: 2000, // Very high limit for Centrifugo in development
          windowMs: 60 * 1000, // 1 minute
          keyGenerator: authenticatedKeyGenerator,
        },
        {
          pattern: /^\/api\/trpc\/.*\?batch=1$/,
          methods: ['GET', 'POST'],
          limit: 1000, // Very high limit for batch requests in development
          windowMs: 60 * 1000, // 1 minute
          keyGenerator: authenticatedKeyGenerator,
        }
      ] : []),
      // API endpoints - very restrictive
      {
        pattern: /^\/api\/auth\/signin$/,
        methods: ['POST'],
        limit: 5, // 5 login attempts per window
        windowMs: 15 * 60 * 1000, // 15 minutes
        keyGenerator: defaultKeyGenerator,
      },
      
      // Password reset endpoints
      {
        pattern: /^\/api\/auth\/reset-password$/,
        methods: ['POST'],
        limit: 3, // 3 password reset attempts per window
        windowMs: 60 * 60 * 1000, // 1 hour
        keyGenerator: defaultKeyGenerator,
      },
      
      // Registration endpoints
      {
        pattern: /^\/api\/auth\/register$/,
        methods: ['POST'],
        limit: 3, // 3 registration attempts per window
        windowMs: 60 * 60 * 1000, // 1 hour
        keyGenerator: defaultKeyGenerator,
      },
      
      // Webhook endpoints - more lenient
      {
        pattern: /^\/api\/webhooks\//,
        methods: ['POST'],
        limit: 100, // 100 webhook calls per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: defaultKeyGenerator,
      },
      
      // tRPC batch requests - more lenient since they contain multiple calls
      {
        pattern: /^\/api\/trpc\/.*\?batch=1$/,
        methods: ['GET', 'POST'],
        limit: 200, // 200 batch requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
      },
      
      // Dashboard layout operations - more lenient for testing
      {
        pattern: /^\/api\/trpc\/(getDashboardLayout|saveDashboardLayout|resetDashboardLayout)/,
        methods: ['POST'],
        limit: 200, // 200 dashboard operations per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
      },
      
      // Centrifugo token requests - very lenient for real-time features
      {
        pattern: /^\/api\/trpc\/getCentrifugoToken/,
        methods: ['GET', 'POST'],
        limit: 500, // 500 token requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
      },
      
      // tRPC mutations (POST requests to tRPC)
      {
        pattern: /^\/api\/trpc\/[^/]+\.[^/]+$/,
        methods: ['POST'],
        limit: 60, // 60 mutations per window for authenticated users
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
      },
      
      // tRPC queries (GET requests to tRPC)
      {
        pattern: /^\/api\/trpc\/[^/]+\.[^/]+$/,
        methods: ['GET'],
        limit: 120, // 120 queries per window for authenticated users
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
      },
      
      // General API endpoints - POST
      {
        pattern: /^\/api\//,
        methods: ['POST'],
        limit: 30, // 30 POST requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
      },
      
      // General API endpoints - GET
      {
        pattern: /^\/api\//,
        methods: ['GET'],
        limit: 100, // 100 GET requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
      },
      
      // Auth pages - more restrictive
      {
        pattern: /^\/auth\//,
        methods: ['GET', 'POST'],
        limit: 20, // 20 requests per window
        windowMs: 15 * 60 * 1000, // 15 minutes
        keyGenerator: defaultKeyGenerator,
      },
      
      // Admin pages - authenticated users only
      {
        pattern: /^\/admin\//,
        methods: ['GET'],
        limit: 200, // 200 GET requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
        skip: (request) => !isAuthenticated(request),
      },
      
      // Admin pages - POST requests
      {
        pattern: /^\/admin\//,
        methods: ['POST'],
        limit: 50, // 50 POST requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
        skip: (request) => !isAuthenticated(request),
      },
      
      // Dashboard pages - authenticated users
      {
        pattern: /^\/dashboard\//,
        methods: ['GET'],
        limit: 150, // 150 GET requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
        skip: (request) => !isAuthenticated(request),
      },
      
      // Settings pages - authenticated users
      {
        pattern: /^\/settings\//,
        methods: ['GET'],
        limit: 100, // 100 GET requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
        skip: (request) => !isAuthenticated(request),
      },
      
      // Settings pages - POST requests
      {
        pattern: /^\/settings\//,
        methods: ['POST'],
        limit: 20, // 20 POST requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
        skip: (request) => !isAuthenticated(request),
      },
      
      // Tenant pages - authenticated users
      {
        pattern: /^\/tenants\/[^/]+\//,
        methods: ['GET'],
        limit: 120, // 120 GET requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
        skip: (request) => !isAuthenticated(request),
      },
      
      // Tenant pages - POST requests
      {
        pattern: /^\/tenants\/[^/]+\//,
        methods: ['POST'],
        limit: 30, // 30 POST requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: authenticatedKeyGenerator,
        skip: (request) => !isAuthenticated(request),
      },
      
      // Default rate limit for all other requests
      {
        pattern: /.*/,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        limit: 200, // 200 requests per window
        windowMs: 60 * 1000, // 1 minute
        keyGenerator: defaultKeyGenerator,
      },
    ];
  }
}

// Global instances
const rateLimiter = new RateLimiter();
const configManager = new RateLimitConfigManager();

// Expose rate limit utilities to global scope in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).clearAllRateLimits = clearAllRateLimits;
  (window as any).clearDashboardRateLimits = clearDashboardRateLimits;
  (window as any).clearCentrifugoRateLimits = clearCentrifugoRateLimits;
}

// Main function to apply rate limiting
export async function applyRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const config = configManager.findMatchingConfig(request);
  
  if (!config) {
    // No rate limit configured, allow the request
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: new Date(Date.now() + 60000),
    };
  }
  
  return rateLimiter.applyLimit(request, config);
}

// Main function to apply rate limiting with headers
export async function applyRateLimitWithHeaders(request: NextRequest): Promise<RateLimitResponse> {
  const config = configManager.findMatchingConfig(request);
  
  if (!config) {
    // No rate limit configured, allow the request
    return {
      result: {
        success: true,
        limit: 0,
        remaining: 0,
        reset: new Date(Date.now() + 60000),
      },
      headers: {
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
      },
    };
  }
  
  return rateLimiter.applyLimitWithHeaders(request, config);
}

// Utility functions for testing and debugging
export function clearAllRateLimits(): void {
  rateLimiter.clearAll();
}

export function clearDashboardRateLimits(): void {
  rateLimiter.clearForPattern(/dashboard/);
}

export function clearCentrifugoRateLimits(): void {
  rateLimiter.clearForPattern(/centrifugo/i);
}

// Legacy functions for backward compatibility
export async function defaultRateLimit(request: NextRequest) {
  return applyRateLimit(request);
}

export async function apiRateLimit(request: NextRequest) {
  return applyRateLimit(request);
}

export async function authRateLimit(request: NextRequest) {
  return applyRateLimit(request);
}

// Classes are already exported above