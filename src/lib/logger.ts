/**
 * Structured Logging System
 *
 * This module provides a production-ready logging system using Pino.
 * It replaces console.log statements throughout the application with
 * structured, leveled logging that:
 * - Prevents sensitive data (passwords, tokens, PII) from being logged
 * - Provides different log levels (debug, info, warn, error)
 * - Works efficiently in production (JSON output)
 * - Provides pretty printing in development
 * - Supports contextual logging (request IDs, user IDs)
 *
 * Usage:
 * ```typescript
 * import { logger } from './lib/logger';
 *
 * logger.info('User logged in', { userId: user.id });
 * logger.error('Database connection failed', { error });
 * logger.debug('Query executed', { query, duration });
 * ```
 */

import pino from 'pino';

/**
 * Environment detection (independent of config to avoid circular dependencies)
 */
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = () => NODE_ENV === 'development';
const isTest = () => NODE_ENV === 'test';
const isProduction = () => NODE_ENV === 'production';
const isCloudflarePages = () => process.env.CF_PAGES === '1' || process.env.CLOUDFLARE_PAGES === '1';

/**
 * List of sensitive field names that should never be logged
 * These will be redacted automatically
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'password_hash',
  'newPassword',
  'oldPassword',
  'currentPassword',
  'token',
  'accessToken',
  'refreshToken',
  'sessionToken',
  'apiKey',
  'api_key',
  'secret',
  'secretKey',
  'secret_key',
  'privateKey',
  'private_key',
  'stripeKey',
  'stripe_key',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'ssn',
  'social_security_number',
  'authorization',
  'cookie',
  'cookies',
];

/**
 * List of PII (Personally Identifiable Information) field names
 * These are redacted in production to comply with privacy regulations
 */
const PII_FIELDS = [
  'email',
  'phoneNumber',
  'phone_number',
  'phone',
  'address',
  'streetAddress',
  'street_address',
  'postalCode',
  'postal_code',
  'zipCode',
  'zip_code',
  'ipAddress',
  'ip_address',
  'ip',
  'fullName',
  'full_name',
  'firstName',
  'first_name',
  'lastName',
  'last_name',
  'dateOfBirth',
  'date_of_birth',
  'dob',
];

/**
 * Sanitize an object by redacting sensitive fields
 * T209: Properly typed - uses unknown instead of any
 *
 * @param obj - Object to sanitize
 * @param redactPII - Whether to redact PII fields (default: production only)
 * @param visited - WeakSet to track visited objects (for circular reference detection)
 * @returns Sanitized object
 */
export function sanitize(
  obj: unknown,
  redactPII: boolean = !isDevelopment(),
  visited: WeakSet<object> = new WeakSet()
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Check for circular references
  if (visited.has(obj)) {
    return '[Circular]';
  }

  // Mark this object as visited
  visited.add(obj);

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, redactPII, visited));
  }

  // Handle Error objects
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: isDevelopment() ? obj.stack : undefined,
    };
  }

  // Handle plain objects
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Redact sensitive fields
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Redact PII in production
    if (redactPII && PII_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
      sanitized[key] = '[PII_REDACTED]';
      continue;
    }

    // Recursively sanitize nested objects
    sanitized[key] = sanitize(value, redactPII, visited);
  }

  return sanitized;
}

/**
 * Create the Pino logger instance
 *
 * NOTE: Cloudflare Pages/Workers doesn't support pino-pretty transport
 * because it requires Node.js APIs that aren't available in the Workers runtime.
 * We disable the transport in Cloudflare environments and use plain JSON output.
 */
const logger = pino({
  level: (() => {
    if (isTest()) return 'silent'; // No logs in tests
    if (isDevelopment()) return 'debug'; // Verbose in development
    return process.env.LOG_LEVEL || 'info'; // Configurable in production
  })(),

  // Pretty print in development ONLY if not in Cloudflare Pages
  // pino-pretty doesn't work in Cloudflare Workers environment
  transport: isDevelopment() && !isCloudflarePages()
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,

  // Base fields included in all logs
  base: {
    env: process.env.NODE_ENV || 'development',
  },

  // Redact sensitive fields at the Pino level (defense in depth)
  redact: {
    paths: SENSITIVE_FIELDS,
    censor: '[REDACTED]',
  },

  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
});

/**
 * Enhanced logger with sanitization
 * T209: Properly typed - uses unknown instead of any
 */
export const log = {
  /**
   * Debug level - Development only, detailed diagnostic information
   */
  debug: (message: string, data?: unknown) => {
    logger.debug(sanitize(data), message);
  },

  /**
   * Info level - General informational messages
   */
  info: (message: string, data?: unknown) => {
    logger.info(sanitize(data), message);
  },

  /**
   * Warn level - Warning messages for potentially harmful situations
   */
  warn: (message: string, data?: unknown) => {
    logger.warn(sanitize(data), message);
  },

  /**
   * Error level - Error messages for error events
   */
  error: (message: string, data?: unknown) => {
    logger.error(sanitize(data), message);
  },

  /**
   * Fatal level - Very severe error events that might cause application to abort
   */
  fatal: (message: string, data?: unknown) => {
    logger.fatal(sanitize(data), message);
  },

  /**
   * Create a child logger with additional context
   *
   * Useful for request-specific logging:
   * ```typescript
   * const requestLogger = log.child({ requestId: '123' });
   * requestLogger.info('Processing request');
   * ```
   */
  child: (bindings: Record<string, unknown>) => {
    const childLogger = logger.child(sanitize(bindings) as Record<string, unknown>);
    return {
      debug: (message: string, data?: unknown) => childLogger.debug(sanitize(data), message),
      info: (message: string, data?: unknown) => childLogger.info(sanitize(data), message),
      warn: (message: string, data?: unknown) => childLogger.warn(sanitize(data), message),
      error: (message: string, data?: unknown) => childLogger.error(sanitize(data), message),
      fatal: (message: string, data?: unknown) => childLogger.fatal(sanitize(data), message),
    };
  },
};

/**
 * Helper functions for common logging patterns
 */

/**
 * Log database query execution
 * T209: Properly typed params
 */
export function logQuery(query: string, duration: number, params?: unknown[]) {
  log.debug('Database query executed', {
    query: query.substring(0, 500), // Truncate long queries
    duration,
    paramsCount: params?.length || 0,
  });
}

/**
 * Log API request
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  userId?: string
) {
  log.info('API request', {
    method,
    path,
    statusCode,
    duration,
    userId,
  });
}

/**
 * Log authentication events
 * T209: Properly typed details
 */
export function logAuth(event: 'login' | 'logout' | 'register' | 'failed_login', userId?: string, details?: unknown) {
  log.info(`Auth: ${event}`, {
    event,
    userId,
    ...(typeof sanitize(details) === 'object' && sanitize(details) !== null ? sanitize(details) as object : {}),
  });
}

/**
 * Log payment events (extra careful with PII)
 * T209: Properly typed details
 */
export function logPayment(
  event: 'initiated' | 'succeeded' | 'failed' | 'refunded',
  amount: number,
  currency: string,
  userId?: string,
  details?: unknown
) {
  log.info(`Payment: ${event}`, {
    event,
    amount,
    currency,
    userId,
    ...(typeof sanitize(details, true) === 'object' && sanitize(details, true) !== null ? sanitize(details, true) as object : {}),
  });
}

/**
 * Log security events
 * T209: Properly typed details
 */
export function logSecurity(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: unknown
) {
  const logFn = severity === 'critical' ? log.fatal : severity === 'high' ? log.error : log.warn;

  logFn(`Security: ${event}`, {
    event,
    severity,
    ...(typeof sanitize(details) === 'object' && sanitize(details) !== null ? sanitize(details) as object : {}),
  });
}

/**
 * Log performance metrics
 * T209: Properly typed metadata
 */
export function logPerformance(operation: string, duration: number, metadata?: unknown) {
  const level = duration > 1000 ? 'warn' : 'debug';

  log[level](`Performance: ${operation}`, {
    operation,
    duration,
    slow: duration > 1000,
    ...(typeof sanitize(metadata) === 'object' && sanitize(metadata) !== null ? sanitize(metadata) as object : {}),
  });
}

/**
 * Backward compatibility: Export logger for direct Pino usage
 * (Use `log` instead for automatic sanitization)
 */
export { logger };

/**
 * Export default for convenience
 */
export default log;
