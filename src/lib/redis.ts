/**
 * Redis Client
 * 
 * Redis client configuration for caching and session management.
 * Uses redis package with automatic reconnection and error handling.
 */

import { createClient, type RedisClientType, type RedisClientOptions } from 'redis';

// Redis configuration
const config: RedisClientOptions = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries: number) => {
      // Exponential backoff: 100ms, 200ms, 400ms, 800ms, up to 3000ms
      const delay = Math.min(retries * 100, 3000);
      console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
  },
  // Enable legacy mode for backward compatibility if needed
  ...(process.env.REDIS_LEGACY_MODE === 'true' && {
    legacyMode: true,
  }),
};

// Client instance
let client: RedisClientType | null = null;
let connectionFailed = false;

/**
 * Check if Redis is configured
 */
function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379';
}

/**
 * Get or create Redis client
 * Returns null if Redis is not configured or connection fails
 */
export async function getRedisClient(): Promise<RedisClientType | null> {
  // If connection previously failed or Redis not configured, return null
  if (connectionFailed || !isRedisConfigured()) {
    if (!isRedisConfigured()) {
      console.warn('[Redis] REDIS_URL not configured - Redis features disabled');
    }
    return null;
  }

  if (!client) {
    try {
      client = createClient(config) as RedisClientType;

      // Handle errors
      client.on('error', (err) => {
        console.error('[Redis] Client error:', err);
        connectionFailed = true;
      });

      // Handle connection events
      client.on('connect', () => {
        console.log('[Redis] Client connecting...');
      });

      client.on('ready', () => {
        console.log('[Redis] Client ready');
        connectionFailed = false; // Reset flag on successful connection
      });

      client.on('reconnecting', () => {
        console.log('[Redis] Client reconnecting...');
      });

      client.on('end', () => {
        console.log('[Redis] Client connection closed');
      });

      // Connect with timeout
      await Promise.race([
        client.connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        )
      ]);
    } catch (error) {
      console.error('[Redis] Failed to connect:', error);
      connectionFailed = true;
      client = null;
      return null;
    }
  }

  return client;
}

/**
 * Set a key with optional expiration (in seconds)
 */
export async function set(
  key: string,
  value: string,
  expirationSeconds?: number
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return; // Gracefully skip if Redis unavailable

  if (expirationSeconds) {
    await redis.setEx(key, expirationSeconds, value);
  } else {
    await redis.set(key, value);
  }
}

/**
 * Get a key value
 */
export async function get(key: string): Promise<string | null> {
  const redis = await getRedisClient();
  if (!redis) return null; // Return null if Redis unavailable
  return await redis.get(key);
}

/**
 * Delete one or more keys
 */
export async function del(...keys: string[]): Promise<number> {
  const redis = await getRedisClient();
  if (!redis) return 0; // Return 0 if Redis unavailable
  return await redis.del(keys);
}

/**
 * Check if a key exists
 */
export async function exists(key: string): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false; // Return false if Redis unavailable
  const count = await redis.exists(key);
  return count > 0;
}

/**
 * Set key expiration time (in seconds)
 */
export async function expire(key: string, seconds: number): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) return false; // Return false if Redis unavailable
  return await redis.expire(key, seconds);
}

/**
 * Get remaining time to live for a key (in seconds)
 */
export async function ttl(key: string): Promise<number> {
  const redis = await getRedisClient();
  if (!redis) return -1; // Return -1 if Redis unavailable
  return await redis.ttl(key);
}

/**
 * Store object as JSON string
 */
export async function setJSON(
  key: string,
  value: any,
  expirationSeconds?: number
): Promise<void> {
  await set(key, JSON.stringify(value), expirationSeconds);
}

/**
 * Retrieve and parse JSON object
 */
export async function getJSON<T = any>(key: string): Promise<T | null> {
  const value = await get(key);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[Redis] JSON parse error for key:', key, error);
    return null;
  }
}

/**
 * Increment a numeric value
 */
export async function incr(key: string): Promise<number> {
  const redis = await getRedisClient();
  if (!redis) return 0; // Return 0 if Redis unavailable
  return await redis.incr(key);
}

/**
 * Decrement a numeric value
 */
export async function decr(key: string): Promise<number> {
  const redis = await getRedisClient();
  if (!redis) return 0; // Return 0 if Redis unavailable
  return await redis.decr(key);
}

/**
 * Get all keys matching a pattern
 */
export async function keys(pattern: string): Promise<string[]> {
  const redis = await getRedisClient();
  if (!redis) return []; // Return empty array if Redis unavailable
  return await redis.keys(pattern);
}

/**
 * Delete all keys matching a pattern
 */
export async function delPattern(pattern: string): Promise<number> {
  const matchingKeys = await keys(pattern);
  if (matchingKeys.length === 0) return 0;
  return await del(...matchingKeys);
}

/**
 * Close Redis connection (useful for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    console.log('[Redis] Client closed');
  }
}

/**
 * Check Redis connection health
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) return false; // Return false if Redis unavailable
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('[Redis] Health check failed:', error);
    return false;
  }
}

// ============================================================================
// Cache Layer (T212)
// ============================================================================

/**
 * Cache key namespaces
 */
export const CacheNamespace = {
  PRODUCTS: 'products',
  COURSES: 'courses',
  EVENTS: 'events',
  CART: 'cart',
  USER: 'user',
} as const;

/**
 * Default cache TTLs (in seconds)
 */
export const CacheTTL = {
  PRODUCTS: 300,       // 5 minutes
  COURSES: 600,        // 10 minutes
  EVENTS: 600,         // 10 minutes
  CART: 1800,          // 30 minutes
  USER: 900,           // 15 minutes
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
} as const;

/**
 * Generate a standardized cache key
 *
 * @param namespace - Cache namespace (e.g., 'products', 'courses')
 * @param identifier - Unique identifier for the cached item
 * @param suffix - Optional suffix for additional specificity
 * @returns Formatted cache key
 *
 * @example
 * generateCacheKey('products', 'list', 'all') // => 'products:list:all'
 * generateCacheKey('courses', '123') // => 'courses:123'
 */
export function generateCacheKey(
  namespace: string,
  identifier: string,
  suffix?: string
): string {
  const parts = [namespace, identifier];
  // Only add suffix if it's not undefined and not empty string
  if (suffix && suffix.length > 0) parts.push(suffix);
  return parts.join(':');
}

/**
 * Get cached data with automatic JSON parsing
 *
 * @param key - Cache key
 * @returns Parsed data or null if not found/expired
 *
 * @example
 * const products = await getCached<Product[]>('products:list:all');
 * if (products) {
 *   return products; // Cache hit
 * }
 */
export async function getCached<T = any>(key: string): Promise<T | null> {
  try {
    const value = await getJSON<T>(key);
    if (value) {
      console.log(`[Cache] HIT: ${key}`);
    } else {
      console.log(`[Cache] MISS: ${key}`);
    }
    return value;
  } catch (error) {
    console.error(`[Cache] Error getting key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached data with automatic JSON serialization
 *
 * @param key - Cache key
 * @param data - Data to cache (will be JSON serialized)
 * @param ttlSeconds - Time to live in seconds (optional)
 *
 * @example
 * await setCached('products:list:all', products, CacheTTL.PRODUCTS);
 */
export async function setCached<T = any>(
  key: string,
  data: T,
  ttlSeconds?: number
): Promise<void> {
  try {
    await setJSON(key, data, ttlSeconds);
    console.log(`[Cache] SET: ${key} (TTL: ${ttlSeconds || 'none'}s)`);
  } catch (error) {
    console.error(`[Cache] Error setting key ${key}:`, error);
  }
}

/**
 * Invalidate cache by pattern
 *
 * Deletes all keys matching the given pattern.
 * Use with caution as it scans all keys.
 *
 * @param pattern - Pattern to match (e.g., 'products:*' or 'courses:123:*')
 * @returns Number of keys deleted
 *
 * @example
 * // Invalidate all product caches
 * await invalidateCache('products:*');
 *
 * // Invalidate specific course and related caches
 * await invalidateCache('courses:123*');
 */
export async function invalidateCache(pattern: string): Promise<number> {
  try {
    const deletedCount = await delPattern(pattern);
    console.log(`[Cache] INVALIDATE: ${pattern} (${deletedCount} keys deleted)`);
    return deletedCount;
  } catch (error) {
    console.error(`[Cache] Error invalidating pattern ${pattern}:`, error);
    return 0;
  }
}

/**
 * Invalidate all caches for a specific namespace
 *
 * @param namespace - Cache namespace to invalidate
 * @returns Number of keys deleted
 *
 * @example
 * await invalidateNamespace(CacheNamespace.PRODUCTS);
 */
export async function invalidateNamespace(namespace: string): Promise<number> {
  return await invalidateCache(`${namespace}:*`);
}

/**
 * Get or set cached data (cache-aside pattern)
 *
 * Checks cache first, if miss, calls the provided function,
 * caches the result, and returns it.
 *
 * @param key - Cache key
 * @param fetchFn - Function to fetch data on cache miss
 * @param ttlSeconds - Time to live in seconds
 * @returns Cached or freshly fetched data
 *
 * @example
 * const products = await getOrSet(
 *   'products:list:all',
 *   () => fetchProductsFromDB(),
 *   CacheTTL.PRODUCTS
 * );
 */
export async function getOrSet<T = any>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  // Try to get from cache
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch data
  console.log(`[Cache] FETCH: ${key}`);
  const data = await fetchFn();

  // Store in cache
  await setCached(key, data, ttlSeconds);

  return data;
}

/**
 * Flush all caches
 *
 * WARNING: This will delete ALL keys in the Redis database.
 * Use only in development or for complete cache resets.
 *
 * @returns true if successful
 */
export async function flushAllCache(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn('[Cache] Redis not available - cannot flush cache');
      return false;
    }
    await redis.flushDb();
    console.log('[Cache] FLUSH: All caches cleared');
    return true;
  } catch (error) {
    console.error('[Cache] Error flushing cache:', error);
    return false;
  }
}

/**
 * Get cache statistics
 *
 * @returns Cache statistics including total keys and memory usage
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  keysByNamespace: Record<string, number>;
  memoryUsage?: string;
}> {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.warn('[Cache] Redis not available - returning empty stats');
      return {
        totalKeys: 0,
        keysByNamespace: {},
      };
    }

    const allKeys = await redis.keys('*');
    const totalKeys = allKeys.length;

    // Count keys by namespace
    const keysByNamespace: Record<string, number> = {};
    for (const key of allKeys) {
      const namespace = key.split(':')[0];
      if (namespace) {
        keysByNamespace[namespace] = (keysByNamespace[namespace] || 0) + 1;
      }
    }

    // Get memory info (requires INFO command)
    let memoryUsage: string | undefined;
    try {
      const info = await redis.info('memory');
      if (info) {
        const match = info.match(/used_memory_human:(.+)/);
        if (match && match[1]) {
          memoryUsage = match[1].trim();
        }
      }
    } catch (err) {
      // INFO command might not be available in all Redis setups
      console.warn('[Cache] Could not get memory usage:', err);
    }

    return {
      totalKeys,
      keysByNamespace,
      memoryUsage,
    };
  } catch (error) {
    console.error('[Cache] Error getting cache stats:', error);
    return {
      totalKeys: 0,
      keysByNamespace: {},
    };
  }
}

// Export client for advanced usage
export { client };
export default getRedisClient;
