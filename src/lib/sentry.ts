/**
 * Sentry Error Tracking Configuration
 *
 * This module initializes and configures Sentry for error tracking
 * and performance monitoring in production.
 *
 * Features:
 * - Automatic error capture
 * - Performance monitoring
 * - Release tracking
 * - User context tracking
 * - Custom error reporting
 */

import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry for error tracking
 *
 * Only initializes in production if SENTRY_DSN is configured
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN || import.meta.env?.SENTRY_DSN;
  const environment = process.env.NODE_ENV || import.meta.env?.MODE || 'development';

  // Only initialize in production or if explicitly configured
  if (dsn && (environment === 'production' || process.env.SENTRY_ENABLED === 'true')) {
    try {
      // Build integrations array with fallback for compatibility
      const integrations: any[] = [];

      // Try to add Http integration if available (compatibility with different Sentry versions)
      try {
        if (Sentry.Integrations && typeof Sentry.Integrations.Http === 'function') {
          integrations.push(new Sentry.Integrations.Http({ tracing: true }));
        }
      } catch (err) {
        console.warn('[Sentry] Http integration not available:', err);
      }

      // Try to add Express integration if available
      try {
        if (Sentry.Integrations && typeof Sentry.Integrations.Express === 'function') {
          integrations.push(new Sentry.Integrations.Express({ app: undefined }));
        }
      } catch (err) {
        console.warn('[Sentry] Express integration not available:', err);
      }

      Sentry.init({
        dsn,
        environment,

        // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
        // In production, you may want to reduce this to 0.1 (10%) or lower
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

        // Set sampling rate for profiling
        profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

        // Release tracking
        release: process.env.npm_package_version,

        // Ignore common errors
        ignoreErrors: [
          // Browser extensions
          'top.GLOBALS',
          'chrome-extension://',
          'moz-extension://',

          // Network errors
          'Network request failed',
          'NetworkError',
          'Failed to fetch',

          // User cancelled actions
          'AbortError',
          'The user aborted a request',
        ],

        // Before send hook to filter/modify events
        beforeSend(event, hint) {
          // Don't send events in development unless explicitly enabled
          if (environment === 'development' && process.env.SENTRY_ENABLED !== 'true') {
            return null;
          }

          // Filter out sensitive data from URLs
          if (event.request?.url) {
            event.request.url = filterSensitiveData(event.request.url);
          }

          // Filter sensitive data from breadcrumbs
          if (event.breadcrumbs) {
            event.breadcrumbs = event.breadcrumbs.map(breadcrumb => ({
              ...breadcrumb,
              data: breadcrumb.data ? filterSensitiveObject(breadcrumb.data) : undefined,
            }));
          }

          return event;
        },

        // Integrations (only if available)
        ...(integrations.length > 0 && { integrations }),
      });

      console.log(`✅ Sentry initialized in ${environment} mode`);
    } catch (error) {
      // Gracefully handle Sentry initialization errors
      console.warn('[Sentry] Failed to initialize:', error);
      console.log('ℹ️  Application will continue without Sentry error tracking');
    }
  } else {
    console.log(`ℹ️  Sentry not initialized (environment: ${environment}, DSN configured: ${!!dsn})`);
  }
}

/**
 * Capture an exception and send to Sentry
 *
 * @param error - The error to capture
 * @param context - Additional context to attach to the error
 */
export function captureException(error: Error | unknown, context?: Record<string, any>): string {
  if (context) {
    Sentry.setContext('custom', context);
  }

  return Sentry.captureException(error);
}

/**
 * Capture a message and send to Sentry
 *
 * @param message - The message to capture
 * @param level - The severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): string {
  if (context) {
    Sentry.setContext('custom', context);
  }

  return Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 *
 * @param user - User information to attach to errors
 */
export function setUser(user: {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
} | null): void {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 *
 * @param breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb: {
  message?: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}): void {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a new transaction for performance monitoring
 *
 * @param name - Transaction name
 * @param op - Operation type
 */
export function startTransaction(name: string, op: string): any {
  try {
    // Try the new API first (Sentry v7+)
    if (typeof (Sentry as any).startSpan === 'function') {
      return (Sentry as any).startSpan({ name, op }, (span: any) => span);
    }

    // Fall back to deprecated API (Sentry v6)
    if (typeof (Sentry as any).startTransaction === 'function') {
      return (Sentry as any).startTransaction({ name, op });
    }

    console.warn('[Sentry] startTransaction/startSpan not available');
    return null;
  } catch (error) {
    console.warn('[Sentry] Error starting transaction:', error);
    return null;
  }
}

/**
 * Wrap a function to automatically capture errors
 *
 * @param fn - Function to wrap
 */
export function wrapHandler<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureException(error);
          throw error;
        });
      }

      return result;
    } catch (error) {
      captureException(error);
      throw error;
    }
  }) as T;
}

/**
 * Express/API middleware for error tracking
 */
export function sentryErrorMiddleware() {
  return (error: Error, req: any, res: any, next: any) => {
    // Capture the error
    captureException(error, {
      url: req.url,
      method: req.method,
      headers: filterSensitiveObject(req.headers),
      body: req.body ? filterSensitiveObject(req.body) : undefined,
      query: req.query ? filterSensitiveObject(req.query) : undefined,
    });

    // Pass to next error handler
    next(error);
  };
}

/**
 * Filter sensitive data from strings (URLs, etc.)
 *
 * @param str - String to filter
 */
function filterSensitiveData(str: string): string {
  // Remove tokens from URLs
  str = str.replace(/([?&])(token|apikey|api_key|secret|password|auth)=[^&]*/gi, '$1$2=REDACTED');

  // Remove JWT tokens
  str = str.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer REDACTED');

  return str;
}

/**
 * Filter sensitive data from objects
 *
 * @param obj - Object to filter
 */
function filterSensitiveObject(obj: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'apikey',
    'api_key',
    'auth',
    'authorization',
    'cookie',
    'session',
    'csrf',
    'credit_card',
    'card_number',
    'cvv',
    'ssn',
  ];

  const filtered: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if key contains sensitive data
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      filtered[key] = 'REDACTED';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively filter nested objects
      filtered[key] = filterSensitiveObject(value);
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

/**
 * Close Sentry client and flush remaining events
 *
 * @param timeout - Timeout in milliseconds
 */
export async function closeSentry(timeout: number = 2000): Promise<boolean> {
  return await Sentry.close(timeout);
}

/**
 * Flush pending events to Sentry
 *
 * @param timeout - Timeout in milliseconds
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  return await Sentry.flush(timeout);
}

// Export Sentry for advanced usage
export { Sentry };
