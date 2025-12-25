/**
 * Environment Variables Bridge for Cloudflare Workers
 *
 * In Cloudflare Workers, secrets are available via `locals.runtime.env`,
 * not `process.env`. This module provides a way to access them.
 */

// Global storage for runtime environment
let runtimeEnv: Record<string, string> | null = null;

/**
 * Initialize the environment from Astro locals
 * Call this early in middleware or API routes
 */
export function initEnv(env: Record<string, string>): void {
  runtimeEnv = env;
}

/**
 * Get an environment variable
 * Checks runtime env first (Cloudflare), then process.env (Node.js)
 */
export function getEnv(key: string): string | undefined {
  // Check runtime env (Cloudflare Workers)
  if (runtimeEnv && runtimeEnv[key]) {
    return runtimeEnv[key];
  }
  // Fall back to process.env (Node.js)
  return process.env[key];
}

/**
 * Check if an environment variable is set
 */
export function hasEnv(key: string): boolean {
  return !!getEnv(key);
}

/**
 * Get the current runtime environment object
 */
export function getRuntimeEnv(): Record<string, string> | null {
  return runtimeEnv;
}
