/**
 * Debug endpoint to check environment variables
 * TEMPORARY - Remove after debugging
 */

import type { APIRoute } from 'astro';
import { getEnv, hasEnv } from '../../lib/env';
import { checkConnection, query } from '../../lib/db';

export const GET: APIRoute = async ({ locals }) => {
  // Check various ways to access environment variables
  const envInfo = {
    // Check process.env
    processEnv: {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET',
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'SET (hidden)' : 'NOT SET',
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'SET (hidden)' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    },
    // Check getEnv (env bridge)
    getEnvBridge: {
      DATABASE_URL: getEnv('DATABASE_URL') ? 'SET (hidden)' : 'NOT SET',
      UPSTASH_REDIS_REST_URL: getEnv('UPSTASH_REDIS_REST_URL') ? 'SET (hidden)' : 'NOT SET',
      UPSTASH_REDIS_REST_TOKEN: getEnv('UPSTASH_REDIS_REST_TOKEN') ? 'SET (hidden)' : 'NOT SET',
      hasDatabase: hasEnv('DATABASE_URL'),
      hasRedisUrl: hasEnv('UPSTASH_REDIS_REST_URL'),
      hasRedisToken: hasEnv('UPSTASH_REDIS_REST_TOKEN'),
    },
    // Check raw runtime.env values (showing first 10 chars only)
    runtimeValues: (locals as any)?.runtime?.env ? {
      DATABASE_URL: (locals as any).runtime.env.DATABASE_URL?.substring(0, 15) + '...' || 'undefined',
      UPSTASH_REDIS_REST_URL: (locals as any).runtime.env.UPSTASH_REDIS_REST_URL?.substring(0, 15) + '...' || 'undefined',
      UPSTASH_REDIS_REST_TOKEN: (locals as any).runtime.env.UPSTASH_REDIS_REST_TOKEN?.substring(0, 15) + '...' || 'undefined',
    } : 'NOT Available',
    // Check if runtime is available
    hasRuntime: !!(locals as any)?.runtime,
    runtimeEnv: (locals as any)?.runtime?.env ? 'Available' : 'NOT Available',
    // List runtime env keys if available
    runtimeEnvKeys: (locals as any)?.runtime?.env
      ? Object.keys((locals as any).runtime.env)
      : [],
  };

  // Test database connection
  let dbTest: any = { status: 'not_tested' };
  try {
    const isConnected = await checkConnection();
    if (isConnected) {
      dbTest = { status: 'connected', message: 'Database connection successful' };
    } else {
      // Try a direct query to get more info
      const result = await query('SELECT 1 as test');
      dbTest = {
        status: 'check_returned_false',
        rowCount: result.rowCount,
        rows: result.rows.length,
      };
    }
  } catch (error) {
    dbTest = {
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 200) : undefined,
    };
  }

  return new Response(JSON.stringify({ ...envInfo, dbTest }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
