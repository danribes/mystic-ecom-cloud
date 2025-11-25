/**
 * Health Check Endpoint
 * T218 - Add health check endpoint for monitoring
 *
 * Provides system health status for:
 * - Load balancers (Cloudflare, AWS ELB, etc.)
 * - Monitoring systems (Datadog, New Relic, Prometheus, etc.)
 * - Uptime monitors (UptimeRobot, Pingdom, etc.)
 *
 * Checks:
 * - Database connectivity (PostgreSQL)
 * - Redis connectivity
 * - System uptime
 * - Application version
 *
 * Returns:
 * - 200 OK: All systems healthy
 * - 503 Service Unavailable: One or more systems down
 *
 * Usage:
 * - GET /api/health - Full health check
 * - Use for load balancer health checks
 * - Use for monitoring and alerting
 */

import type { APIRoute } from 'astro';
import { getPool } from '../../lib/db';
import { getRedisClient } from '../../lib/redis';
import { captureException, addBreadcrumb } from '../../lib/sentry';

// Application start time for uptime calculation
const START_TIME = Date.now();

// Version from package.json
const VERSION = '0.0.1';

/**
 * Health Check Response Interface
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: {
    seconds: number;
    human: string;
  };
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}

interface ServiceStatus {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    const pool = getPool();

    // Check if database is configured
    if (!pool) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'down',
        responseTime,
        error: 'Database not configured (DATABASE_URL missing)',
      };
    }

    // Run a simple query to verify connection
    await pool.query('SELECT 1 as health_check');

    const responseTime = Date.now() - startTime;

    addBreadcrumb({
      message: 'Database health check passed',
      category: 'health',
      level: 'info',
      data: { responseTime },
    });

    return {
      status: 'up',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('[Health Check] Database check failed:', error);

    // Log to Sentry
    captureException(error, {
      context: 'health_check',
      service: 'database',
      responseTime,
    });

    addBreadcrumb({
      message: 'Database health check failed',
      category: 'health',
      level: 'error',
      data: { responseTime },
    });

    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    const redis = await getRedisClient();

    // Check if Redis is configured
    if (!redis) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'down',
        responseTime,
        error: 'Redis not configured (REDIS_URL missing)',
      };
    }

    // Ping Redis to verify connection
    await redis.ping();

    const responseTime = Date.now() - startTime;

    addBreadcrumb({
      message: 'Redis health check passed',
      category: 'health',
      level: 'info',
      data: { responseTime },
    });

    return {
      status: 'up',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('[Health Check] Redis check failed:', error);

    // Log to Sentry
    captureException(error, {
      context: 'health_check',
      service: 'redis',
      responseTime,
    });

    addBreadcrumb({
      message: 'Redis health check failed',
      category: 'health',
      level: 'error',
      data: { responseTime },
    });

    return {
      status: 'down',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    };
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Determine overall system status
 */
function determineOverallStatus(
  database: ServiceStatus,
  redis: ServiceStatus
): 'healthy' | 'degraded' | 'unhealthy' {
  const dbDown = database.status === 'down';
  const redisDown = redis.status === 'down';

  if (dbDown && redisDown) {
    return 'unhealthy'; // Both critical services down
  }

  if (dbDown) {
    return 'unhealthy'; // Database is critical
  }

  if (redisDown) {
    return 'degraded'; // Redis down, but app can function (sessions may be lost)
  }

  return 'healthy';
}

/**
 * GET /api/health
 *
 * Returns health check status
 */
export const GET: APIRoute = async () => {
  try {
    // Log health check request
    addBreadcrumb({
      message: 'Health check requested',
      category: 'health',
      level: 'info',
    });

    // Check all services in parallel
    const [database, redis] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    // Calculate uptime
    const uptimeSeconds = (Date.now() - START_TIME) / 1000;

    // Determine overall status
    const overallStatus = determineOverallStatus(database, redis);

    // Build response
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: VERSION,
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        human: formatUptime(uptimeSeconds),
      },
      services: {
        database,
        redis,
      },
    };

    // Log overall status
    addBreadcrumb({
      message: `Health check completed: ${overallStatus}`,
      category: 'health',
      level: overallStatus === 'healthy' ? 'info' : 'warning',
      data: { status: overallStatus },
    });

    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 503;

    return new Response(JSON.stringify(response, null, 2), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        // Cache control: Don't cache health checks
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    // Unexpected error in health check itself
    console.error('[Health Check] Unexpected error:', error);

    // Log to Sentry
    captureException(error, {
      context: 'health_check',
      service: 'health_endpoint',
    });

    const errorResponse = {
      status: 'unhealthy' as const,
      timestamp: new Date().toISOString(),
      version: VERSION,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      uptime: {
        seconds: Math.floor((Date.now() - START_TIME) / 1000),
        human: formatUptime((Date.now() - START_TIME) / 1000),
      },
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  }
};
