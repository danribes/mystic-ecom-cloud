/**
 * Debug endpoint to check environment variables
 * TEMPORARY - Remove after debugging
 */

import type { APIRoute } from 'astro';

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
    // Check if runtime is available
    hasRuntime: !!(locals as any)?.runtime,
    runtimeEnv: (locals as any)?.runtime?.env ? 'Available' : 'NOT Available',
    // List runtime env keys if available
    runtimeEnvKeys: (locals as any)?.runtime?.env
      ? Object.keys((locals as any).runtime.env)
      : [],
  };

  return new Response(JSON.stringify(envInfo, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
