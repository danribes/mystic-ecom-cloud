/**
 * Email Verification Utilities
 *
 * Generate and validate email verification tokens
 * (Cloudflare Workers compatible - uses Web Crypto API)
 */

/**
 * Generate a secure random verification token
 * (Cloudflare Workers compatible - uses Web Crypto API)
 */
export function generateVerificationToken(): string {
  // Use Web Crypto API which is available in Cloudflare Workers
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  // Convert to hex string
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate token expiration time (24 hours from now)
 */
export function getTokenExpiration(): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 24);
  return expiration;
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expirationDate: Date): boolean {
  return new Date() > expirationDate;
}
