/**
 * Debug endpoint to test session creation
 * POST /api/debug-session
 */

import type { APIRoute } from 'astro';
import { initEnv, getEnv } from '@/lib/env';
import { getRedisClient, checkConnection } from '@/lib/redis';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { isProduction, getSessionCookieOptions } from '@/lib/cookieConfig';

export const POST: APIRoute = async (context) => {
  const { cookies, locals } = context;

  const steps: Record<string, any> = {};

  try {
    // Step 1: Initialize environment
    steps['1_init_env'] = { started: true };
    const runtime = (locals as any).runtime;
    if (runtime?.env) {
      initEnv(runtime.env);
      steps['1_init_env'].success = true;
    } else {
      steps['1_init_env'].error = 'No runtime.env available';
    }

    // Step 2: Check environment variables
    steps['2_env_vars'] = {
      UPSTASH_REDIS_REST_URL: !!getEnv('UPSTASH_REDIS_REST_URL'),
      UPSTASH_REDIS_REST_TOKEN: !!getEnv('UPSTASH_REDIS_REST_TOKEN'),
    };

    // Step 3: Check production detection
    steps['3_production_check'] = {
      isProduction: isProduction(),
      NODE_ENV: process.env.NODE_ENV,
      CF_PAGES: process.env.CF_PAGES,
    };

    // Step 4: Check cookie options
    steps['4_cookie_options'] = {
      options: getSessionCookieOptions(86400, true),
    };

    // Step 5: Check Redis connection
    steps['5_redis'] = { started: true };
    const redis = await getRedisClient();
    if (redis) {
      steps['5_redis'].client_available = true;
      const pong = await checkConnection();
      steps['5_redis'].ping = pong;
    } else {
      steps['5_redis'].client_available = false;
      steps['5_redis'].error = 'Redis client not available';
    }

    // Step 6: Test session creation
    steps['6_create_session'] = { started: true };
    const testSessionId = await createSession(
      'test-user-id',
      'test@test.com',
      'Test User',
      'user'
    );
    steps['6_create_session'].success = true;
    steps['6_create_session'].sessionId = testSessionId.substring(0, 10) + '...';

    // Step 7: Test setting session cookie
    steps['7_set_cookie'] = { started: true };
    try {
      setSessionCookie(cookies, testSessionId, false);
      steps['7_set_cookie'].success = true;
    } catch (cookieError) {
      steps['7_set_cookie'].error = cookieError instanceof Error ? cookieError.message : String(cookieError);
    }

    return new Response(JSON.stringify({ success: true, steps }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      steps,
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
