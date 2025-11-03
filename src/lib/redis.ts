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

/**
 * Get or create Redis client
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (!client) {
    client = createClient(config) as RedisClientType;

    // Handle errors
    client.on('error', (err) => {
      console.error('[Redis] Client error:', err);
    });

    // Handle connection events
    client.on('connect', () => {
      console.log('[Redis] Client connecting...');
    });

    client.on('ready', () => {
      console.log('[Redis] Client ready');
    });

    client.on('reconnecting', () => {
      console.log('[Redis] Client reconnecting...');
    });

    client.on('end', () => {
      console.log('[Redis] Client connection closed');
    });

    // Connect
    await client.connect();
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
  return await redis.get(key);
}

/**
 * Delete one or more keys
 */
export async function del(...keys: string[]): Promise<number> {
  const redis = await getRedisClient();
  return await redis.del(keys);
}

/**
 * Check if a key exists
 */
export async function exists(key: string): Promise<boolean> {
  const redis = await getRedisClient();
  const count = await redis.exists(key);
  return count > 0;
}

/**
 * Set key expiration time (in seconds)
 */
export async function expire(key: string, seconds: number): Promise<boolean> {
  const redis = await getRedisClient();
  return await redis.expire(key, seconds);
}

/**
 * Get remaining time to live for a key (in seconds)
 */
export async function ttl(key: string): Promise<number> {
  const redis = await getRedisClient();
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
  return await redis.incr(key);
}

/**
 * Decrement a numeric value
 */
export async function decr(key: string): Promise<number> {
  const redis = await getRedisClient();
  return await redis.decr(key);
}

/**
 * Get all keys matching a pattern
 */
export async function keys(pattern: string): Promise<string[]> {
  const redis = await getRedisClient();
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
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('[Redis] Health check failed:', error);
    return false;
  }
}

// Export client for advanced usage
export { client };
export default getRedisClient;
