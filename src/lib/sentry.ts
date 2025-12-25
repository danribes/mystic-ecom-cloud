/**
 * Sentry Error Tracking Configuration
 *
 * Cloudflare Workers compatible version.
 * Provides stub functions when @sentry/node is not available.
 *
 * Features:
 * - Graceful degradation when Sentry is not available
 * - Console logging fallback for error tracking
 * - Compatible with Cloudflare Workers runtime
 */

// Sentry is not compatible with Cloudflare Workers
// Provide stub implementations that log to console

let isInitialized = false;

/**
 * Severity level type (compatible with Sentry's SeverityLevel)
 */
export type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

/**
 * Initialize Sentry for error tracking
 * In Cloudflare Workers, this is a no-op
 */
export function initSentry(): void {
  const environment = process.env.NODE_ENV || 'development';
  console.log(`ℹ️  Sentry not initialized (environment: ${environment}, Cloudflare Workers mode)`);
  isInitialized = true;
}

/**
 * Capture an exception and log it
 *
 * @param error - The error to capture
 * @param context - Additional context to attach to the error
 */
export function captureException(error: Error | unknown, context?: Record<string, unknown>): string {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.error('[Sentry Stub] Exception captured:', {
    id: errorId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  });

  return errorId;
}

/**
 * Capture a message and log it
 *
 * @param message - The message to capture
 * @param level - The severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
  context?: Record<string, unknown>
): string {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const logFn = level === 'error' || level === 'fatal' ? console.error :
                level === 'warning' ? console.warn :
                console.log;

  logFn('[Sentry Stub] Message captured:', {
    id: messageId,
    message,
    level,
    context,
  });

  return messageId;
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
  [key: string]: unknown;
} | null): void {
  if (user) {
    console.log('[Sentry Stub] User context set:', { id: user.id, email: user.email });
  } else {
    console.log('[Sentry Stub] User context cleared');
  }
}

/**
 * Add breadcrumb for debugging
 *
 * @param breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb: {
  message?: string;
  category?: string;
  level?: SeverityLevel;
  data?: Record<string, unknown>;
}): void {
  // No-op in stub mode - breadcrumbs are typically too verbose for console
}

/**
 * Start a new transaction for performance monitoring
 *
 * @param name - Transaction name
 * @param op - Operation type
 */
export function startTransaction(name: string, op: string): null {
  // No-op in stub mode
  return null;
}

/**
 * Wrap a function to automatically capture errors
 *
 * @param fn - Function to wrap
 */
export function wrapHandler<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return ((...args: unknown[]) => {
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
  return (error: Error, req: unknown, res: unknown, next: (err?: unknown) => void) => {
    captureException(error);
    next(error);
  };
}

/**
 * Close Sentry client and flush remaining events
 *
 * @param timeout - Timeout in milliseconds
 */
export async function closeSentry(timeout: number = 2000): Promise<boolean> {
  return true;
}

/**
 * Flush pending events to Sentry
 *
 * @param timeout - Timeout in milliseconds
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  return true;
}

// Stub Sentry object for compatibility
export const Sentry = {
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  close: closeSentry,
  flush: flushSentry,
  setContext: (name: string, context: Record<string, unknown>) => {},
  Integrations: {},
};
