/**
 * Email Verification Utilities
 *
 * Generate and validate email verification tokens
 */

// Web Crypto API compatible random bytes generator
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

// Convert Uint8Array to hex string
function toHex(bytes: Uint8Array): string {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure random verification token
 */
export function generateVerificationToken(): string {
  const bytes = getRandomBytes(32);
  return toHex(bytes);
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
