/**
 * Environment Configuration Validation
 *
 * This module validates all required environment variables on application startup.
 * If any critical configuration is missing or invalid, the application will fail
 * fast with a clear error message, preventing runtime failures.
 *
 * Usage:
 * ```typescript
 * import { config, validateConfig } from './lib/config';
 *
 * // Validate on startup (in astro.config.mjs or middleware)
 * validateConfig();
 *
 * // Access validated config throughout the app
 * const dbUrl = config.DATABASE_URL;
 * ```
 */

import { z } from 'zod';

/**
 * Zod schema for environment variables
 *
 * This schema defines all required and optional environment variables
 * with their validation rules.
 */
const envSchema = z.object({
  // Database Configuration (REQUIRED)
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
      'DATABASE_URL must be a PostgreSQL URL (postgres:// or postgresql://)'
    ),

  // Redis Configuration (REQUIRED)
  REDIS_URL: z
    .string()
    .min(1, 'REDIS_URL is required')
    .refine(
      (val) => val.startsWith('redis://') || val.startsWith('rediss://'),
      'REDIS_URL must be a Redis URL (redis:// or rediss:// for TLS)'
    ),

  // Authentication & Session (REQUIRED)
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters for security')
    .refine(
      (val) => val !== 'your-secret-key-here-change-in-production',
      'SESSION_SECRET must not use default value'
    ),

  // Stripe Payment Integration (REQUIRED)
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, 'STRIPE_SECRET_KEY is required')
    .startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_')
    .refine(
      (val) => !val.includes('your-stripe-secret-key'),
      'STRIPE_SECRET_KEY must not use placeholder value'
    ),

  STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'STRIPE_PUBLISHABLE_KEY is required')
    .startsWith('pk_', 'STRIPE_PUBLISHABLE_KEY must start with pk_'),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, 'STRIPE_WEBHOOK_SECRET is required')
    .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_')
    .refine(
      (val) => !val.includes('your-webhook-secret'),
      'STRIPE_WEBHOOK_SECRET must not use placeholder value'
    ),

  // Email Service (REQUIRED)
  RESEND_API_KEY: z
    .string()
    .min(1, 'RESEND_API_KEY is required for sending emails')
    .startsWith('re_', 'RESEND_API_KEY must start with re_'),

  EMAIL_FROM: z
    .string()
    .min(1, 'EMAIL_FROM is required')
    .email('EMAIL_FROM must be a valid email address'),

  // Twilio WhatsApp Integration (OPTIONAL)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  TWILIO_ADMIN_WHATSAPP: z.string().optional(),

  // Application URLs (REQUIRED)
  BASE_URL: z
    .string()
    .min(1, 'BASE_URL is required for generating absolute URLs')
    .url('BASE_URL must be a valid URL'),

  // File Upload Configuration
  DOWNLOAD_TOKEN_SECRET: z
    .string()
    .min(32, 'DOWNLOAD_TOKEN_SECRET must be at least 32 characters')
    .refine(
      (val) => val !== 'your-secret-key-change-in-production',
      'DOWNLOAD_TOKEN_SECRET must not use default value'
    ),

  // Cloudflare Configuration (OPTIONAL - for video integration)
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),

  // Node Environment (defaults to 'development')
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Port (defaults to 4321 for Astro)
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').default('4321'),

  // Admin Bypass Flag (MUST NOT be true in production)
  BYPASS_ADMIN_AUTH: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.toLowerCase() !== 'true',
      'BYPASS_ADMIN_AUTH must not be enabled (security risk)'
    ),
});

/**
 * Type-safe environment configuration
 */
export type Config = z.infer<typeof envSchema>;

/**
 * Validated environment configuration
 * This is populated after calling validateConfig()
 */
let validatedConfig: Config | null = null;

/**
 * Get the validated configuration
 *
 * @throws {Error} If configuration has not been validated yet
 * @returns {Config} Validated configuration object
 */
export function getConfig(): Config {
  if (!validatedConfig) {
    throw new Error(
      'Configuration not validated. Call validateConfig() first during application startup.'
    );
  }
  return validatedConfig;
}

/**
 * Validate environment variables on application startup
 *
 * This function should be called as early as possible in the application
 * lifecycle (e.g., in astro.config.mjs or root middleware).
 *
 * If validation fails, the application will exit with a detailed error message.
 *
 * @param {boolean} throwOnError - If true, throws error instead of exiting process (useful for tests)
 * @throws {Error} If throwOnError is true and validation fails
 */
export function validateConfig(throwOnError = false): void {
  try {
    console.log('[Config] Validating environment variables...');

    // Parse and validate environment variables
    validatedConfig = envSchema.parse(process.env);

    // Additional production checks
    if (validatedConfig.NODE_ENV === 'production') {
      // Ensure no bypass flags in production
      if (process.env.BYPASS_ADMIN_AUTH === 'true') {
        throw new Error(
          'FATAL: BYPASS_ADMIN_AUTH is enabled in production. This is a critical security risk!'
        );
      }

      // Ensure using production Stripe keys
      if (validatedConfig.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        console.warn(
          '[Config] WARNING: Using Stripe test keys in production environment'
        );
      }

      // Ensure HTTPS in production
      if (!validatedConfig.BASE_URL.startsWith('https://')) {
        console.warn(
          '[Config] WARNING: BASE_URL should use HTTPS in production'
        );
      }
    }

    console.log('[Config] ✓ Environment validation successful');
    console.log(`[Config] - Environment: ${validatedConfig.NODE_ENV}`);
    console.log(`[Config] - Base URL: ${validatedConfig.BASE_URL}`);
    console.log(
      `[Config] - Database: ${validatedConfig.DATABASE_URL.substring(0, 20)}...`
    );
    console.log(
      `[Config] - Redis: ${validatedConfig.REDIS_URL.substring(0, 20)}...`
    );
  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('FATAL ERROR: Environment Variable Validation Failed');
    console.error('='.repeat(80) + '\n');

    if (error instanceof z.ZodError) {
      console.error('Missing or invalid environment variables:\n');

      error.errors.forEach((err) => {
        const path = err.path.join('.');
        console.error(`  ❌ ${path}: ${err.message}`);
      });

      console.error('\n' + '-'.repeat(80));
      console.error('How to fix:');
      console.error('  1. Copy .env.example to .env');
      console.error('  2. Fill in all required values');
      console.error('  3. Restart the application');
      console.error('-'.repeat(80) + '\n');
    } else {
      console.error(error);
    }

    if (throwOnError) {
      throw error;
    } else {
      process.exit(1);
    }
  }
}

/**
 * Check if a specific environment variable is configured
 *
 * @param {keyof Config} key - Environment variable key
 * @returns {boolean} True if the variable is configured
 */
export function isConfigured(key: keyof Config): boolean {
  const cfg = getConfig();
  const value = cfg[key];
  return value !== undefined && value !== null && value !== '';
}

/**
 * Get environment-specific configuration
 */
export const isDevelopment = () => getConfig().NODE_ENV === 'development';
export const isProduction = () => getConfig().NODE_ENV === 'production';
export const isTest = () => getConfig().NODE_ENV === 'test';

/**
 * Type-safe access to validated config
 * This is the recommended way to access configuration throughout the app
 */
export const config = new Proxy({} as Config, {
  get(_target, prop: string) {
    const cfg = getConfig();
    return cfg[prop as keyof Config];
  },
});

/**
 * Export the schema for testing purposes
 */
export { envSchema };
