/**
 * Email Verification API Endpoint
 * GET /api/auth/verify-email?token=<verification_token>
 * 
 * Verifies user email address using the token sent via email.
 */

import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { isTokenExpired } from '@/lib/auth/verification';

export const GET: APIRoute = async ({ request, redirect }) => {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    // Validate token parameter
    if (!token) {
      console.error('[VERIFY-EMAIL] No token provided');
      return redirect('/login?error=invalid_token');
    }

    const pool = getPool();

    // Find user by verification token
    const result = await pool.query(
      `SELECT id, email, name, email_verified, email_verification_expires
       FROM users
       WHERE email_verification_token = $1 AND deleted_at IS NULL`,
      [token]
    );

    if (result.rows.length === 0) {
      console.error('[VERIFY-EMAIL] Invalid token');
      return redirect('/login?error=invalid_token');
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
      console.log('[VERIFY-EMAIL] Email already verified:', user.email);
      return redirect('/login?success=already_verified');
    }

    // Check if token has expired
    if (isTokenExpired(new Date(user.email_verification_expires))) {
      console.error('[VERIFY-EMAIL] Token expired for user:', user.email);
      return redirect('/login?error=token_expired');
    }

    // Verify the email
    await pool.query(
      `UPDATE users
       SET email_verified = true,
           email_verification_token = NULL,
           email_verification_expires = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id]
    );

    console.log('[VERIFY-EMAIL] Email verified successfully:', user.email);

    // Redirect to login with success message
    return redirect('/login?success=email_verified');
  } catch (error) {
    console.error('[VERIFY-EMAIL] Error:', error);
    return redirect('/login?error=verification_failed');
  }
};
