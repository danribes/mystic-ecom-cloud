/**
 * Resend Email Verification API Endpoint
 * POST /api/auth/resend-verification
 * 
 * Resends verification email to users who haven't verified their email.
 */

import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { generateVerificationToken, getTokenExpiration } from '@/lib/auth/verification';
import { sendRegistrationEmail } from '@/lib/email';
import { z } from 'zod';

const resendSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    // Parse form data
    const formData = await request.formData();
    const data = {
      email: formData.get('email') as string,
    };

    // Validate input
    const validation = resendSchema.safeParse(data);
    if (!validation.success) {
      console.error('[RESEND-VERIFICATION] Validation error:', validation.error.errors);
      return redirect('/login?error=invalid_email');
    }

    const { email } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const pool = getPool();

    // Find user
    const result = await pool.query(
      `SELECT id, name, email, email_verified
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists for security
      console.error('[RESEND-VERIFICATION] User not found:', normalizedEmail);
      return redirect('/login?success=verification_sent');
    }

    const user = result.rows[0];

    // Check if already verified
    if (user.email_verified) {
      console.log('[RESEND-VERIFICATION] Email already verified:', normalizedEmail);
      return redirect('/login?success=already_verified');
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = getTokenExpiration();

    // Update user with new token
    await pool.query(
      `UPDATE users
       SET email_verification_token = $1,
           email_verification_expires = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [verificationToken, verificationExpires, user.id]
    );

    // Send verification email
    const verificationUrl = `${new URL(request.url).origin}/api/auth/verify-email?token=${verificationToken}`;
    const emailResult = await sendRegistrationEmail({
      userName: user.name,
      userEmail: normalizedEmail,
      verificationLink: verificationUrl,
    });

    if (!emailResult.success) {
      console.error('[RESEND-VERIFICATION] Failed to send email:', emailResult.error);
      return redirect('/login?error=email_send_failed');
    }

    console.log('[RESEND-VERIFICATION] Verification email resent:', { email: normalizedEmail });
    return redirect('/login?success=verification_sent');
  } catch (error) {
    console.error('[RESEND-VERIFICATION] Error:', error);
    return redirect('/login?error=server_error');
  }
};
