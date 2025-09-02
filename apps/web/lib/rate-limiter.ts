import { NextRequest } from 'next/server';

interface RateLimitConfig {
  keyPrefix?: string;
  points: number;
  duration: number;
  blockDuration?: number;
  execEvenly?: boolean;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
  blockUntil?: number;
}

class RateLimitService {
  private limiters: Map<string, Map<string, RateLimitRecord>> = new Map();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Clean up expired records every 5 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  private getLimiterStore(limiterKey: string): Map<string, RateLimitRecord> {
    if (!this.limiters.has(limiterKey)) {
      this.limiters.set(limiterKey, new Map());
    }
    return this.limiters.get(limiterKey)!;
  }

  private cleanup() {
    const now = Date.now();
    for (const [limiterKey, store] of this.limiters.entries()) {
      for (const [identifier, record] of store.entries()) {
        // Remove expired records
        if (record.resetTime < now && (!record.blockUntil || record.blockUntil < now)) {
          store.delete(identifier);
        }
      }
      // Remove empty stores
      if (store.size === 0) {
        this.limiters.delete(limiterKey);
      }
    }
  }

  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    // Ensure identifier is a valid string
    if (!identifier || typeof identifier !== 'string') {
      identifier = 'anonymous';
    }

    const limiterKey = `${config.keyPrefix || 'default'}_${config.points}_${config.duration}`;
    const store = this.getLimiterStore(limiterKey);
    const now = Date.now();
    
    let record = store.get(identifier);
    
    // Check if still blocked
    if (record?.blockUntil && record.blockUntil > now) {
      return {
        success: false,
        limit: config.points,
        remaining: 0,
        reset: new Date(record.blockUntil),
        retryAfter: Math.ceil((record.blockUntil - now) / 1000),
      };
    }
    
    // Reset if window has passed
    if (!record || record.resetTime <= now) {
      record = {
        count: 0,
        resetTime: now + (config.duration * 1000),
      };
    }
    
    // Increment count
    record.count++;
    
    // Check if limit exceeded
    if (record.count > config.points) {
      // Set block time
      const blockDuration = (config.blockDuration || config.duration) * 1000;
      record.blockUntil = now + blockDuration;
      
      store.set(identifier, record);
      
      return {
        success: false,
        limit: config.points,
        remaining: 0,
        reset: new Date(record.blockUntil),
        retryAfter: Math.ceil(blockDuration / 1000),
      };
    }
    
    // Update record
    store.set(identifier, record);
    
    return {
      success: true,
      limit: config.points,
      remaining: Math.max(0, config.points - record.count),
      reset: new Date(record.resetTime),
    };
  }

  getClientIdentifier(request: NextRequest): string {
    // Try to get real IP from various headers (for proxy/CDN scenarios)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    if (forwarded && typeof forwarded === 'string') {
      const ip = forwarded.split(',')[0].trim();
      if (ip) return ip;
    }
    
    if (realIp && typeof realIp === 'string') {
      return realIp;
    }
    
    if (cfConnectingIp && typeof cfConnectingIp === 'string') {
      return cfConnectingIp;
    }
    
    // Fallback: use host header or generate a fallback identifier
    const host = request.headers.get('host');
    if (host && typeof host === 'string') {
      return `host-${host}`;
    }
    
    return 'anonymous';
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const rateLimitService = new RateLimitService();

export interface CreateRateLimitOptions {
  points: number;
  duration: number;
  blockDuration?: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: NextRequest) => string;
}

export function createRateLimit(options: CreateRateLimitOptions) {
  return async (request: NextRequest): Promise<RateLimitResult> => {
    const identifier = options.keyGenerator 
      ? options.keyGenerator(request) 
      : rateLimitService.getClientIdentifier(request);

    return rateLimitService.checkLimit(identifier, {
      keyPrefix: options.keyPrefix || 'general',
      points: options.points,
      duration: options.duration,
      blockDuration: options.blockDuration,
    });
  };
}

export const defaultRateLimit = createRateLimit({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  keyPrefix: 'general',
});

export const apiRateLimit = createRateLimit({
  points: 50,
  duration: 60,
  keyPrefix: 'api',
});

export const authRateLimit = createRateLimit({
  points: 10,
  duration: 300, // 5 minutes
  blockDuration: 900, // Block for 15 minutes
  keyPrefix: 'auth',
});