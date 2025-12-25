/**
 * Password Reset Utilities
 *
 * Implements secure password reset functionality with:
 * - Cryptographically secure token generation
 * - Time-limited tokens (1 hour expiration)
 * - One-time use tokens
 * - Token verification and validation
 *
 * Security Task: T203
 */

import { getPool } from './db';
import type { Pool } from 'pg';

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

/**
 * Password reset token record
 */
export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

/**
 * Generate a cryptographically secure reset token
 *
 * @returns {string} Base64URL encoded random token (32 bytes)
 */
export function generateResetToken(): string {
  const bytes = getRandomBytes(32);
  return toBase64Url(bytes);
}

/**
 * Create a password reset token for a user
 *
 * @param userEmail - User's email address
 * @returns {Promise<{ token: string; expiresAt: Date } | null>} Token and expiration, or null if user not found
 */
export async function createPasswordResetToken(
  userEmail: string
): Promise<{ token: string; expiresAt: Date; userId: string } | null> {
  const pool = getPool();

  try {
    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1 AND deleted_at IS NULL',
      [userEmail.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // User not found - return null but don't reveal this to prevent email enumeration
      return null;
    }

    const user = userResult.rows[0];

    // Generate secure token
    const token = generateResetToken();

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store token in database
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    return {
      token,
      expiresAt,
      userId: user.id,
    };
  } catch (error) {
    console.error('Error creating password reset token:', error);
    throw error;
  }
}

/**
 * Verify a password reset token
 *
 * Checks that:
 * - Token exists in database
 * - Token has not expired
 * - Token has not been used
 *
 * @param token - Reset token to verify
 * @returns {Promise<{ valid: boolean; userId?: string; error?: string }>} Verification result
 */
export async function verifyResetToken(
  token: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const pool = getPool();

  try {
    // Find token in database
    const result = await pool.query(
      `SELECT id, user_id, expires_at, used
       FROM password_reset_tokens
       WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid reset token' };
    }

    const resetToken = result.rows[0];

    // Check if token has been used
    if (resetToken.used) {
      return { valid: false, error: 'Reset token has already been used' };
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);

    if (now > expiresAt) {
      return { valid: false, error: 'Reset token has expired' };
    }

    // Token is valid
    return {
      valid: true,
      userId: resetToken.user_id,
    };
  } catch (error) {
    console.error('Error verifying reset token:', error);
    throw error;
  }
}

/**
 * Mark a reset token as used
 *
 * This prevents token reuse after password has been reset
 *
 * @param token - Reset token to mark as used
 * @returns {Promise<boolean>} True if token was marked as used
 */
export async function markTokenAsUsed(token: string): Promise<boolean> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `UPDATE password_reset_tokens
       SET used = true, used_at = NOW()
       WHERE token = $1 AND used = false`,
      [token]
    );

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Error marking token as used:', error);
    throw error;
  }
}

/**
 * Clean up expired reset tokens
 *
 * Removes tokens that are older than 24 hours (well past expiration)
 * Should be run periodically (e.g., daily cron job)
 *
 * @returns {Promise<number>} Number of tokens deleted
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `DELETE FROM password_reset_tokens
       WHERE created_at < NOW() - INTERVAL '24 hours'`
    );

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    throw error;
  }
}

/**
 * Invalidate all reset tokens for a user
 *
 * Useful when:
 * - User successfully resets password (invalidate all pending tokens)
 * - User requests new reset (invalidate old tokens)
 * - Security concern (force token refresh)
 *
 * @param userId - User ID to invalidate tokens for
 * @returns {Promise<number>} Number of tokens invalidated
 */
export async function invalidateUserTokens(userId: string): Promise<number> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `UPDATE password_reset_tokens
       SET used = true, used_at = NOW()
       WHERE user_id = $1 AND used = false`,
      [userId]
    );

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error invalidating user tokens:', error);
    throw error;
  }
}

/**
 * Check if user has recent reset request
 *
 * Prevents spam by checking if user has requested reset recently
 * Used for additional rate limiting beyond IP-based limits
 *
 * @param userEmail - User's email address
 * @param minutesThreshold - How recent to check (default: 5 minutes)
 * @returns {Promise<boolean>} True if user has recent reset request
 */
export async function hasRecentResetRequest(
  userEmail: string,
  minutesThreshold: number = 5
): Promise<boolean> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE u.email = $1
         AND prt.created_at > NOW() - INTERVAL '${minutesThreshold} minutes'`,
      [userEmail.toLowerCase()]
    );

    const count = parseInt(result.rows[0].count);
    return count > 0;
  } catch (error) {
    console.error('Error checking recent reset request:', error);
    // Fail open - allow request if check fails
    return false;
  }
}
