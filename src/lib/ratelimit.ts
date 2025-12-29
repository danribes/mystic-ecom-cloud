/**
 * Rate Limiting Middleware
 *
 * Implements rate limiting using Redis to prevent abuse and brute force attacks.
 * Uses sliding window algorithm for accurate rate limiting.
 *
 * Security: T199 - Rate limiting implementation
 */

import { getRedisClient } from './redis';
import type { APIContext } from 'astro';

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Optional key prefix for Redis keys
   */
  keyPrefix?: string;

  /**
   * Whether to use user ID instead of IP for rate limiting
   * (useful for authenticated endpoints)
   */
  useUserId?: boolean;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Number of requests remaining in current window
   */
  remaining: number;

  /**
   * When the rate limit resets (Unix timestamp)
   */
  resetAt: number;

  /**
   * Total limit
   */
  limit: number;
}

/**
 * Pre-configured rate limit profiles for common use cases
 */
export const RateLimitProfiles = {
  /**
   * Authentication endpoints (login, register)
   * 5 requests per 15 minutes - prevents brute force attacks
   */
  AUTH: {
    maxRequests: 5,
    windowSeconds: 900, // 15 minutes
    keyPrefix: 'rl:auth',
  } as RateLimitConfig,

  /**
   * Password reset endpoints
   * 3 requests per hour - prevents abuse
   */
  PASSWORD_RESET: {
    maxRequests: 3,
    windowSeconds: 3600, // 1 hour
    keyPrefix: 'rl:password',
  } as RateLimitConfig,

  /**
   * Email verification resend
   * 3 requests per hour
   */
  EMAIL_VERIFY: {
    maxRequests: 3,
    windowSeconds: 3600,
    keyPrefix: 'rl:email',
  } as RateLimitConfig,

  /**
   * Checkout endpoints
   * 10 requests per minute - prevents payment abuse
   */
  CHECKOUT: {
    maxRequests: 10,
    windowSeconds: 60,
    keyPrefix: 'rl:checkout',
  } as RateLimitConfig,

  /**
   * Search endpoints
   * 30 requests per minute - prevents scraping
   */
  SEARCH: {
    maxRequests: 30,
    windowSeconds: 60,
    keyPrefix: 'rl:search',
  } as RateLimitConfig,

  /**
   * File upload endpoints
   * 10 requests per 10 minutes - prevents storage abuse
   */
  UPLOAD: {
    maxRequests: 10,
    windowSeconds: 600,
    keyPrefix: 'rl:upload',
  } as RateLimitConfig,

  /**
   * General API endpoints
   * 100 requests per minute per IP
   */
  API: {
    maxRequests: 100,
    windowSeconds: 60,
    keyPrefix: 'rl:api',
  } as RateLimitConfig,

  /**
   * Admin endpoints (authenticated)
   * 200 requests per minute per user
   */
  ADMIN: {
    maxRequests: 200,
    windowSeconds: 60,
    keyPrefix: 'rl:admin',
    useUserId: true,
  } as RateLimitConfig,

  /**
   * Cart operations (add, remove, view)
   * 100 requests per hour per session - prevents cart abuse
   */
  CART: {
    maxRequests: 100,
    windowSeconds: 3600, // 1 hour
    keyPrefix: 'rl:cart',
    useUserId: true, // Track by session
  } as RateLimitConfig,

  /**
   * GDPR Data Export (T148)
   * 5 requests per hour per user - prevents abuse of data export
   */
  DATA_EXPORT: {
    maxRequests: 5,
    windowSeconds: 3600, // 1 hour
    keyPrefix: 'rl:gdpr:export',
    useUserId: true,
  } as RateLimitConfig,

  /**
   * GDPR Account Deletion (T148)
   * 3 requests per day per user - prevents accidental deletion abuse
   */
  DATA_DELETION: {
    maxRequests: 3,
    windowSeconds: 86400, // 24 hours
    keyPrefix: 'rl:gdpr:delete',
    useUserId: true,
  } as RateLimitConfig,
};

/**
 * Get client identifier (IP or user ID)
 */
function getClientIdentifier(context: APIContext, config: RateLimitConfig): string {
  if (config.useUserId) {
    // Try to get user ID from session cookie
    const sessionId = context.cookies.get('session_id')?.value;
    if (sessionId) {
      return `user:${sessionId}`;
    }
  }

  // Fall back to IP address
  const ip = context.clientAddress ||
             context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             context.request.headers.get('x-real-ip') ||
             'unknown';

  return `ip:${ip}`;
}

/**
 * Check if request is allowed under rate limit
 *
 * Uses sliding window algorithm with Redis:
 * 1. Store request timestamps in Redis as sorted set
 * 2. Remove expired timestamps outside window
 * 3. Count remaining timestamps
 * 4. Allow if count < limit
 */
export async function checkRateLimit(
  context: APIContext,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    const redis = await getRedisClient();

    // If Redis is not available, allow request (fail open)
    if (!redis) {
      console.warn('[RateLimit] Redis not available, allowing request');
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: Math.floor(Date.now() / 1000) + config.windowSeconds,
        limit: config.maxRequests,
      };
    }

    const clientId = getClientIdentifier(context, config);
    const key = `${config.keyPrefix || 'rl'}:${clientId}`;
    const now = Date.now();
    const windowStart = now - (config.windowSeconds * 1000);

    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    const count = await redis.zcard(key);

    // Calculate reset time
    const oldestEntry = await redis.zrange(key, 0, 0);
    const resetAt = oldestEntry.length > 0 && oldestEntry[0]
      ? parseInt(oldestEntry[0].split(':')[0]) + (config.windowSeconds * 1000)
      : now + (config.windowSeconds * 1000);

    if (count >= config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetAt: Math.floor(resetAt / 1000),
        limit: config.maxRequests,
      };
    }

    // Add current request timestamp
    await redis.zadd(key, {
      score: now,
      value: `${now}:${Math.random()}`, // Unique value
    });

    // Set key expiration to window size (cleanup)
    await redis.expire(key, config.windowSeconds + 10);

    return {
      allowed: true,
      remaining: config.maxRequests - count - 1,
      resetAt: Math.floor(resetAt / 1000),
      limit: config.maxRequests,
    };
  } catch (error) {
    // If Redis fails, allow the request (fail open)
    // Log error for monitoring
    console.error('[RateLimit] Error checking rate limit:', error);

    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: Math.floor(Date.now() / 1000) + config.windowSeconds,
      limit: config.maxRequests,
    };
  }
}

/**
 * Rate limit middleware for Astro API routes
 *
 * Usage:
 * ```typescript
 * export const POST: APIRoute = async (context) => {
 *   const rateLimitResult = await rateLimit(context, RateLimitProfiles.AUTH);
 *   if (!rateLimitResult.allowed) {
 *     return new Response(JSON.stringify({
 *       error: 'Too many requests',
 *       resetAt: rateLimitResult.resetAt,
 *     }), {
 *       status: 429,
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'Retry-After': String(rateLimitResult.resetAt - Math.floor(Date.now() / 1000)),
 *       },
 *     });
 *   }
 *   // ... rest of handler
 * };
 * ```
 */
export async function rateLimit(
  context: APIContext,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  return checkRateLimit(context, config);
}

/**
 * Create a rate-limited handler wrapper
 *
 * Usage:
 * ```typescript
 * export const POST = withRateLimit(
 *   RateLimitProfiles.AUTH,
 *   async (context) => {
 *     // Your handler code
 *   }
 * );
 * ```
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (context: APIContext) => Promise<Response>
) {
  return async (context: APIContext): Promise<Response> => {
    const result = await rateLimit(context, config);

    if (!result.allowed) {
      const retryAfter = result.resetAt - Math.floor(Date.now() / 1000);

      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          limit: result.limit,
          resetAt: result.resetAt,
          retryAfter: retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter > 0 ? retryAfter : 1),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetAt),
          },
        }
      );
    }

    // Add rate limit headers to successful response
    const response = await handler(context);

    // Clone response to add headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-RateLimit-Limit', String(result.limit));
    newResponse.headers.set('X-RateLimit-Remaining', String(result.remaining));
    newResponse.headers.set('X-RateLimit-Reset', String(result.resetAt));

    return newResponse;
  };
}

/**
 * Reset rate limit for a specific client (admin function)
 */
export async function resetRateLimit(
  clientId: string,
  keyPrefix: string = 'rl'
): Promise<void> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn('[RateLimit] Redis not available, cannot reset rate limit');
      return;
    }
    const key = `${keyPrefix}:${clientId}`;
    await redis.del(key);
    console.log(`[RateLimit] Reset rate limit for: ${key}`);
  } catch (error) {
    console.error('[RateLimit] Error resetting rate limit:', error);
  }
}

/**
 * Get current rate limit status for a client
 */
export async function getRateLimitStatus(
  clientId: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn('[RateLimit] Redis not available, cannot get status');
      return null;
    }
    const key = `${config.keyPrefix || 'rl'}:${clientId}`;
    const now = Date.now();
    const windowStart = now - (config.windowSeconds * 1000);

    // Remove old entries
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    const count = await redis.zcard(key);

    // Get oldest entry for reset time
    const oldestEntry = await redis.zrange(key, 0, 0);
    const resetAt = oldestEntry.length > 0 && oldestEntry[0]
      ? parseInt(oldestEntry[0].split(':')[0]) + (config.windowSeconds * 1000)
      : now + (config.windowSeconds * 1000);

    return {
      allowed: count < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetAt: Math.floor(resetAt / 1000),
      limit: config.maxRequests,
    };
  } catch (error) {
    console.error('[RateLimit] Error getting status:', error);
    return null;
  }
}

/**
 * Simple rate limiting function for legacy API compatibility
 *
 * @deprecated Use withRateLimit or checkRateLimit with APIContext instead
 * @param request - The incoming request
 * @param config - Rate limit configuration with windowMs
 * @returns Promise with success and optional retryAfter
 */
export async function applyRateLimit(
  request: Request,
  config: { maxRequests: number; windowMs: number }
): Promise<{ success: boolean; retryAfter?: number }> {
  try {
    // Extract client IP from request
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    const redis = await getRedisClient();
    if (!redis) {
      console.warn('[RateLimit] Redis not available, allowing request');
      return { success: true };
    }

    const keyPrefix = 'rl:legacy';
    const key = `${keyPrefix}:${clientIp}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    const count = await redis.zcard(key);

    // Check if limit exceeded
    if (count >= config.maxRequests) {
      // Get oldest entry to calculate retry time
      const oldestEntry = await redis.zrange(key, 0, 0);
      const retryAfter = oldestEntry.length > 0 && oldestEntry[0]
        ? Math.ceil((parseInt(oldestEntry[0].split(':')[0]) + config.windowMs - now) / 1000)
        : Math.ceil(config.windowMs / 1000);

      return {
        success: false,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    // Add current request to the window
    const requestId = `${now}:${Math.random()}`;
    await redis.zadd(key, { score: now, value: requestId });

    // Set expiry on the key
    await redis.expire(key, Math.ceil(config.windowMs / 1000) + 10);

    return { success: true };
  } catch (error) {
    console.error('[RateLimit] Error in applyRateLimit:', error);
    // On error, allow the request to proceed (fail open)
    return { success: true };
  }
}
