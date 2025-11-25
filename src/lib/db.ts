/**
 * Database Connection Pool (T209: Type-safe, T211: Graceful Shutdown)
 *
 * PostgreSQL connection pool using pg package with proper
 * configuration for production and development environments.
 *
 * Features:
 * - All 'any' types replaced with proper TypeScript types for type safety (T209)
 * - Connection pool monitoring and health checks (T211)
 * - Auto-recovery on connection failures (T211)
 * - Graceful shutdown support (T211)
 */

import { Pool, type PoolConfig, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import type { SqlParams, TransactionCallback, DatabaseRow } from '@/types/database';
import { logger } from './logger';

// Database configuration
const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX || '20', 10), // Maximum pool size
  min: parseInt(process.env.DB_POOL_MIN || '2', 10), // Minimum pool size
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10), // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10), // 10 seconds
  // Enable query logging in development
  ...(process.env.NODE_ENV === 'development' && {
    log: (msg: string) => console.log('[DB]', msg),
  }),
};

// Create pool instance
let pool: Pool | null = null;
let connectionFailed = false;

/**
 * Check if database is configured
 */
function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Connection pool statistics (T211)
 */
export interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  slowQueries: number;
  errors: number;
  lastError: Date | null;
  uptime: number;
  startTime: Date;
}

let poolStats: PoolStats = {
  totalConnections: 0,
  idleConnections: 0,
  waitingClients: 0,
  totalQueries: 0,
  slowQueries: 0,
  errors: 0,
  lastError: null,
  uptime: 0,
  startTime: new Date(),
};

/**
 * Health check interval (T211)
 */
let healthCheckInterval: NodeJS.Timeout | null = null;
const HEALTH_CHECK_INTERVAL = parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000', 10); // 30 seconds

/**
 * Auto-recovery settings (T211)
 */
const MAX_RECONNECT_ATTEMPTS = parseInt(process.env.DB_MAX_RECONNECT_ATTEMPTS || '5', 10);
let reconnectAttempts = 0;
let isRecovering = false;

/**
 * Get or create database connection pool
 * Returns null if DATABASE_URL is not configured
 */
export function getPool(): Pool | null {
  // Check if database is configured
  if (!isDatabaseConfigured()) {
    if (pool === null && !connectionFailed) {
      logger.warn('[DB] DATABASE_URL not configured - Database features disabled');
      connectionFailed = true; // Prevent repeated warnings
    }
    return null;
  }

  // If previous connection failed, don't retry
  if (connectionFailed) {
    return null;
  }

  if (!pool) {
    try {
      pool = new Pool(config);
      poolStats.startTime = new Date();

      // Handle pool errors with auto-recovery (T211)
      pool.on('error', async (err) => {
        logger.error(`Unexpected database pool error: ${err.message}`, { error: err });
        poolStats.errors++;
        poolStats.lastError = new Date();

        // Attempt auto-recovery (but don't exit on failure)
        if (!isRecovering && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          await attemptRecovery();
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          logger.error(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
          connectionFailed = true;
          // Don't call process.exit() - let the app continue without database
        }
      });

      // Monitor pool events (T211)
      pool.on('connect', () => {
        poolStats.totalConnections++;
        logger.debug('[DB] New client connected to pool');

        // Reset reconnect attempts on successful connection
        reconnectAttempts = 0;
        isRecovering = false;
        connectionFailed = false;
      });

      pool.on('acquire', () => {
        logger.debug('[DB] Client acquired from pool');
      });

      pool.on('remove', () => {
        poolStats.totalConnections--;
        logger.debug('[DB] Client removed from pool');
      });

      // Start health check monitoring (T211)
      startHealthCheckMonitoring();
    } catch (error) {
      logger.error(`[DB] Failed to create pool: ${error instanceof Error ? error.message : String(error)}`);
      connectionFailed = true;
      pool = null;
      return null;
    }
  }

  return pool;
}

/**
 * Attempt connection recovery (T211)
 */
async function attemptRecovery(): Promise<void> {
  if (isRecovering) return;

  isRecovering = true;
  reconnectAttempts++;

  logger.warn(`Attempting database recovery (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

  try {
    // Close current pool
    if (pool) {
      await pool.end();
      pool = null;
    }

    // Wait before reconnecting (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Create new pool
    pool = new Pool(config);

    // Test connection
    const isHealthy = await checkConnection();
    if (isHealthy) {
      logger.info('Database connection recovered successfully');
      reconnectAttempts = 0;
      isRecovering = false;
    } else {
      throw new Error('Health check failed after recovery attempt');
    }
  } catch (error) {
    logger.error(`Recovery attempt ${reconnectAttempts} failed: ${error instanceof Error ? error.message : String(error)}`);
    isRecovering = false;

    // Retry if under max attempts
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setTimeout(() => attemptRecovery(), 1000);
    }
  }
}

/**
 * Start health check monitoring (T211)
 */
function startHealthCheckMonitoring(): void {
  if (healthCheckInterval) {
    return; // Already monitoring
  }

  healthCheckInterval = setInterval(async () => {
    const isHealthy = await checkConnection();

    if (!isHealthy) {
      logger.warn('Database health check failed, attempting recovery...');
      await attemptRecovery();
    } else {
      logger.debug('Database health check passed');
    }

    // Update uptime
    poolStats.uptime = Date.now() - poolStats.startTime.getTime();
  }, HEALTH_CHECK_INTERVAL);

  logger.info(`Database health check monitoring started (interval: ${HEALTH_CHECK_INTERVAL}ms)`);
}

/**
 * Stop health check monitoring (T211)
 */
function stopHealthCheckMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    logger.info('Database health check monitoring stopped');
  }
}

/**
 * Execute a query with automatic connection handling
 * T209: Properly typed - no 'any' types
 * T211: Added statistics tracking
 */
export async function query<T extends QueryResultRow = DatabaseRow>(
  text: string,
  params?: SqlParams
): Promise<QueryResult<T>> {
  const pool = getPool();

  // Return empty result if pool unavailable
  if (!pool) {
    logger.warn('[DB] Query attempted but database not available');
    return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] } as QueryResult<T>;
  }

  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Update statistics (T211)
    poolStats.totalQueries++;

    // Track slow queries
    const slowQueryThreshold = parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '1000', 10);
    if (duration > slowQueryThreshold) {
      poolStats.slowQueries++;
      logger.warn(`[DB] Slow query (${duration}ms): ${text.substring(0, 100)}`);
    }

    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      logger.debug(`[DB] Query took ${duration}ms: ${text.substring(0, 100)}`);
    }

    return result;
  } catch (error) {
    poolStats.errors++;
    poolStats.lastError = new Date();

    logger.error(`[DB] Query error: ${error instanceof Error ? error.message : String(error)}`);
    logger.error(`[DB] Query: ${text}`);
    logger.error(`[DB] Params: ${JSON.stringify(params)}`);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * Returns null if database not available
 */
export async function getClient(): Promise<PoolClient | null> {
  const pool = getPool();
  if (!pool) {
    logger.warn('[DB] getClient() called but database not available');
    return null;
  }
  return await pool.connect();
}

/**
 * Execute a transaction with automatic rollback on error
 * T209: Properly typed callback parameter
 * Throws error if database not available
 */
export async function transaction<T>(
  callback: TransactionCallback<T>
): Promise<T> {
  const client = await getClient();

  if (!client) {
    throw new Error('[DB] Transaction attempted but database not available');
  }

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the connection pool (useful for graceful shutdown)
 * T211: Enhanced with health check cleanup
 */
export async function closePool(): Promise<void> {
  if (pool) {
    // Stop health check monitoring first (T211)
    stopHealthCheckMonitoring();

    // End all connections
    await pool.end();
    pool = null;
    logger.info('[DB] Connection pool closed');
  }
}

/**
 * Check database connection health
 * T211: Enhanced with better error handling
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as now');
    return result.rows.length > 0;
  } catch (error) {
    logger.error(`[DB] Health check failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Get connection pool statistics (T211)
 *
 * @returns Current pool statistics
 */
export function getPoolStats(): PoolStats {
  const currentPool = pool;

  // Update real-time stats if pool exists
  if (currentPool) {
    poolStats.idleConnections = currentPool.idleCount;
    poolStats.waitingClients = currentPool.waitingCount;
    poolStats.totalConnections = currentPool.totalCount;
    poolStats.uptime = Date.now() - poolStats.startTime.getTime();
  }

  return { ...poolStats };
}

/**
 * Get pool health status (T211)
 *
 * @returns Health status object
 */
export function getPoolHealth(): {
  healthy: boolean;
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
  errors: number;
  lastError: Date | null;
  uptime: number;
  utilizationPercent: number;
} {
  const stats = getPoolStats();
  const maxConnections = parseInt(process.env.DB_POOL_MAX || '20', 10);
  const utilizationPercent = (stats.totalConnections / maxConnections) * 100;

  return {
    healthy: stats.errors === 0 || (Date.now() - (stats.lastError?.getTime() || 0) > 60000),
    totalConnections: stats.totalConnections,
    idleConnections: stats.idleConnections,
    waitingClients: stats.waitingClients,
    errors: stats.errors,
    lastError: stats.lastError,
    uptime: stats.uptime,
    utilizationPercent: Math.round(utilizationPercent),
  };
}

/**
 * Reset pool statistics (T211)
 *
 * Useful for testing or after recovering from errors
 */
export function resetPoolStats(): void {
  poolStats = {
    totalConnections: pool?.totalCount || 0,
    idleConnections: pool?.idleCount || 0,
    waitingClients: pool?.waitingCount || 0,
    totalQueries: 0,
    slowQueries: 0,
    errors: 0,
    lastError: null,
    uptime: Date.now() - poolStats.startTime.getTime(),
    startTime: poolStats.startTime,
  };

  logger.info('[DB] Pool statistics reset');
}

/**
 * Log pool status (T211)
 *
 * Useful for debugging and monitoring
 */
export function logPoolStatus(): void {
  const stats = getPoolStats();
  const health = getPoolHealth();

  logger.info('[DB] Pool Status:', {
    health: health.healthy ? 'HEALTHY' : 'UNHEALTHY',
    connections: `${stats.totalConnections} total, ${stats.idleConnections} idle, ${stats.waitingClients} waiting`,
    queries: `${stats.totalQueries} total, ${stats.slowQueries} slow`,
    errors: stats.errors,
    utilization: `${health.utilizationPercent}%`,
    uptime: `${Math.round(stats.uptime / 1000)}s`,
  });
}

// Export getPool function for direct access
// Note: Don't call getPool() here - let it be called lazily when needed
export { getPool as default };
