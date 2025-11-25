/**
 * CSRF Protection Implementation (T210: Enhanced Cookie Security)
 *
 * Implements double-submit cookie pattern for CSRF protection.
 * This prevents Cross-Site Request Forgery attacks on state-changing operations.
 *
 * Security: T201 - CSRF protection for all POST/PUT/DELETE endpoints
 * Security: T210 - Enhanced cookie security configuration
 *
 * How it works:
 * 1. Server generates random CSRF token
 * 2. Token sent to client in both cookie AND response body
 * 3. Client includes token in requests (header or form field)
 * 4. Server validates token from cookie matches token from request
 * 5. Attacker cannot read cookies due to Same-Origin Policy
 */

import type { AstroCookies, APIContext } from 'astro';
import { getCSRFCookieOptions, validateCookieSecurity } from './cookieConfig';

// Web Crypto API compatible random bytes generator
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

// Convert Uint8Array to base64url string
function toBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Timing-safe comparison using Web Crypto compatible approach
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * CSRF token configuration
 */
const CSRF_TOKEN_LENGTH = 32; // 256 bits
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_FORM_FIELD = 'csrf_token';
const CSRF_TOKEN_MAX_AGE = 60 * 60 * 2; // 2 hours

/**
 * Generate a cryptographically secure CSRF token
 * (Cloudflare Workers compatible - uses Web Crypto API)
 */
export function generateCSRFToken(): string {
<<<<<<< HEAD
  const bytes = getRandomBytes(CSRF_TOKEN_LENGTH);
  return toBase64Url(bytes);
=======
  // Use Web Crypto API which is available in Cloudflare Workers
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);

  // Convert to base64url encoding
  let binary = '';
  for (let i = 0; i < array.byteLength; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
>>>>>>> c56670b (Fix csrf.ts and verification.ts for Cloudflare Workers compatibility)
}

/**
 * Set CSRF token in cookie (T210: Enhanced Security)
 * This should be called when rendering forms or pages with state-changing actions
 */
export function setCSRFCookie(cookies: AstroCookies): string {
  // Check if token already exists
  let token = cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!token) {
    // Generate new token
    token = generateCSRFToken();

    // Get secure cookie options for CSRF tokens
    const options = getCSRFCookieOptions();

    // Validate security in production
    validateCookieSecurity(options);

    // Set cookie with secure options
    cookies.set(CSRF_COOKIE_NAME, token, options);
  }

  return token;
}

/**
 * Get CSRF token from cookie
 */
export function getCSRFTokenFromCookie(cookies: AstroCookies): string | undefined {
  return cookies.get(CSRF_COOKIE_NAME)?.value;
}

/**
 * Get CSRF token from request
 * Checks multiple locations: header, form field, query param (in that order)
 */
export function getCSRFTokenFromRequest(request: Request): string | undefined {
  // 1. Check header (preferred for API requests)
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }

  // 2. Check form data (for form submissions)
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/x-www-form-urlencoded') ||
      contentType?.includes('multipart/form-data')) {
    // Note: This requires the request body to be parsed
    // We'll handle this in the validation function
    return undefined; // Signal to check form data
  }

  // 3. Check URL query params (least preferred, only for non-sensitive operations)
  const url = new URL(request.url);
  const queryToken = url.searchParams.get(CSRF_FORM_FIELD);
  if (queryToken) {
    return queryToken;
  }

  return undefined;
}

/**
 * Extract CSRF token from form data
 */
async function getCSRFTokenFromFormData(request: Request): Promise<string | undefined> {
  try {
    const formData = await request.clone().formData();
    return formData.get(CSRF_FORM_FIELD) as string | undefined;
  } catch (error) {
    // Not form data or already consumed
    return undefined;
  }
}

/**
 * Validate CSRF token from request against cookie
 *
 * Returns true if:
 * - Both tokens exist
 * - Tokens match exactly
 * - Tokens are not empty
 *
 * Double-submit cookie pattern: Token in cookie must match token in request
 */
export async function validateCSRFToken(
  request: Request,
  cookies: AstroCookies
): Promise<boolean> {
  // Get token from cookie
  const cookieToken = getCSRFTokenFromCookie(cookies);
  if (!cookieToken) {
    console.warn('[CSRF] No CSRF token found in cookie');
    return false;
  }

  // Get token from request (header, form, or query)
  let requestToken = getCSRFTokenFromRequest(request);

  // If not found in header/query, try form data
  if (!requestToken) {
    requestToken = await getCSRFTokenFromFormData(request);
  }

  if (!requestToken) {
    console.warn('[CSRF] No CSRF token found in request');
    return false;
  }

  // Timing-safe comparison to prevent timing attacks
  if (cookieToken.length !== requestToken.length) {
    console.warn('[CSRF] Token length mismatch');
    return false;
  }

  // Use timing-safe comparison for constant-time comparison
  try {
    return timingSafeEqual(cookieToken, requestToken);
  } catch (error) {
    console.warn('[CSRF] Token comparison failed:', error);
    return false;
  }
}

/**
 * CSRF protection middleware for API routes
 *
 * Usage:
 * ```typescript
 * export const POST: APIRoute = async (context) => {
 *   const csrfValid = await validateCSRF(context);
 *   if (!csrfValid) {
 *     return new Response(JSON.stringify({ error: 'CSRF validation failed' }), {
 *       status: 403,
 *     });
 *   }
 *   // Process request...
 * };
 * ```
 */
export async function validateCSRF(context: APIContext): Promise<boolean> {
  const { request, cookies } = context;

  // Only validate state-changing methods
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // GET, HEAD, OPTIONS don't need CSRF protection
    return true;
  }

  return await validateCSRFToken(request, cookies);
}

/**
 * Higher-order function to wrap API routes with CSRF protection
 *
 * Usage:
 * ```typescript
 * export const POST = withCSRF(async (context) => {
 *   // Your handler code - CSRF already validated
 *   return new Response(JSON.stringify({ success: true }));
 * });
 * ```
 */
export function withCSRF(
  handler: (context: APIContext) => Promise<Response>
) {
  return async (context: APIContext): Promise<Response> => {
    const valid = await validateCSRF(context);

    if (!valid) {
      console.warn('[CSRF] Validation failed:', {
        method: context.request.method,
        url: context.request.url,
        ip: context.clientAddress,
      });

      // Return 403 Forbidden for CSRF failures
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CSRF validation failed',
          code: 'CSRF_TOKEN_INVALID',
          message: 'The request could not be authenticated. Please refresh the page and try again.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // CSRF valid, proceed with handler
    return handler(context);
  };
}

/**
 * Check if request should be exempt from CSRF validation
 * Typically used for webhooks with their own authentication
 */
export function isCSRFExempt(request: Request): boolean {
  const url = new URL(request.url);

  // Webhook endpoints are exempt (they use signature validation instead)
  const exemptPaths = [
    '/api/checkout/webhook',
    '/api/webhooks/',
  ];

  return exemptPaths.some(path => url.pathname.startsWith(path));
}

/**
 * Generate HTML hidden input field for forms
 *
 * Usage in .astro files:
 * ```astro
 * <form method="POST">
 *   {getCSRFInput(Astro.cookies)}
 *   <!-- other form fields -->
 * </form>
 * ```
 */
export function getCSRFInput(cookies: AstroCookies): string {
  const token = setCSRFCookie(cookies);
  return `<input type="hidden" name="${CSRF_FORM_FIELD}" value="${token}" />`;
}

/**
 * Get CSRF token for use in JavaScript (for AJAX requests)
 *
 * Usage in page/component:
 * ```astro
 * ---
 * const csrfToken = getCSRFToken(Astro.cookies);
 * ---
 * <script define:vars={{ csrfToken }}>
 *   fetch('/api/endpoint', {
 *     method: 'POST',
 *     headers: {
 *       'X-CSRF-Token': csrfToken,
 *       'Content-Type': 'application/json',
 *     },
 *     body: JSON.stringify(data),
 *   });
 * </script>
 * ```
 */
export function getCSRFToken(cookies: AstroCookies): string {
  return setCSRFCookie(cookies);
}

/**
 * Configuration export for easy access
 */
export const CSRFConfig = {
  COOKIE_NAME: CSRF_COOKIE_NAME,
  HEADER_NAME: CSRF_HEADER_NAME,
  FORM_FIELD: CSRF_FORM_FIELD,
  TOKEN_MAX_AGE: CSRF_TOKEN_MAX_AGE,
} as const;
