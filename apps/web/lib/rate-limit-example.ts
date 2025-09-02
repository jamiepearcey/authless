// Example usage of rate limiting in API routes
import { NextRequest, NextResponse } from 'next/server';
import { createRateLimit } from './rate-limiter';

// Create custom rate limiters for different scenarios
const loginRateLimit = createRateLimit({
  points: 3, // 3 attempts
  duration: 300, // per 5 minutes
  blockDuration: 900, // block for 15 minutes after limit exceeded
  keyPrefix: 'login',
  keyGenerator: (req) => {
    // Rate limit by IP and email for login attempts
    const email = req.nextUrl.searchParams.get('email') || '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
    return `${ip}:${email}`;
  },
});

const generalApiLimit = createRateLimit({
  points: 100, // 100 requests
  duration: 60, // per minute
  keyPrefix: 'api',
});

// Example API route with rate limiting
export async function handleApiRoute(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await generalApiLimit(request);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toISOString(),
          ...(rateLimitResult.retryAfter && {
            'Retry-After': rateLimitResult.retryAfter.toString(),
          }),
        },
      }
    );
  }
  
  // Add rate limit headers to successful responses
  const response = NextResponse.json({ message: 'Success' });
  response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toISOString());
  
  return response;
}

// Example login API route with custom rate limiting
export async function handleLoginRoute(request: NextRequest) {
  // Apply login-specific rate limiting
  const rateLimitResult = await loginRateLimit(request);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many login attempts',
        message: 'Please wait before trying again.',
        retryAfter: rateLimitResult.retryAfter,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter?.toString() || '900',
        },
      }
    );
  }
  
  // Your login logic here...
  return NextResponse.json({ message: 'Login successful' });
}

/*
Environment Variables Configuration:

# Use in-memory rate limiting (default)
RATE_LIMIT_USE_REDIS=false

# Use Redis for distributed rate limiting
RATE_LIMIT_USE_REDIS=true
REDIS_URL=redis://localhost:6379

# Redis cluster example
REDIS_URL=redis://node1:6379,redis://node2:6379,redis://node3:6379

Rate Limiting Patterns:

1. Global middleware (applied automatically to all routes)
2. Route-specific rate limiting (in API route handlers)  
3. User-specific rate limiting (by user ID instead of IP)
4. Action-specific rate limiting (login, signup, password reset, etc.)

Benefits of this implementation:

- Seamless fallback from Redis to in-memory
- Environment-based configuration
- Configurable rate limits per route type
- Standard HTTP rate limit headers
- Edge Runtime compatible
- Typescript support with proper error handling
*/