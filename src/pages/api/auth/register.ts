/**
 * User Registration API Endpoint
 * POST /api/auth/register
 * 
 * Creates a new user account with hashed password.
 */

import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { generateVerificationToken, getTokenExpiration } from '@/lib/auth/verification';
import { sendRegistrationEmail } from '@/lib/email';
import { z } from 'zod';

// Validation schema
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  whatsapp: z.string().nullable().optional(),
  terms: z.string().refine((val) => val === 'on', {
    message: 'You must accept the terms and conditions',
  }),
  redirect: z.string().nullable().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    // Parse form data
    const formData = await request.formData();
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirm_password: formData.get('confirm_password') as string,
      whatsapp: formData.get('whatsapp') as string | null,
      terms: formData.get('terms') as string,
      redirect: formData.get('redirect') as string | null,
    };

    // Validate input
    const validation = registerSchema.safeParse(data);
    if (!validation.success) {
      console.error('[REGISTER] Validation error:', validation.error.errors);
      return redirect(`/register?error=validation_error`);
    }

    const { name, email, password, whatsapp, redirect: redirectPath } = validation.data;

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = getTokenExpiration();

    // Create user in database
    const pool = getPool();
    
    try {
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, whatsapp, role, email_verification_token, email_verification_expires)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, name, role`,
        [name, normalizedEmail, passwordHash, whatsapp || null, 'user', verificationToken, verificationExpires]
      );

      const user = result.rows[0];
      console.log('[REGISTER] User created:', { id: user.id, email: user.email });

      // Send verification email
      const verificationUrl = `${new URL(request.url).origin}/api/auth/verify-email?token=${verificationToken}`;
      const emailResult = await sendRegistrationEmail({
        userName: name,
        userEmail: normalizedEmail,
        verificationLink: verificationUrl,
      });

      if (!emailResult.success) {
        console.error('[REGISTER] Failed to send verification email:', emailResult.error);
        // Continue anyway - user can request new verification email later
      } else {
        console.log('[REGISTER] Verification email sent:', { email: normalizedEmail });
      }

      // Redirect to login with success message
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('success', 'registered');
      loginUrl.searchParams.set('verify', 'check_email');
      if (redirectPath) {
        loginUrl.searchParams.set('redirect', redirectPath);
      }

      return redirect(loginUrl.toString());
    } catch (dbError: any) {
      // Handle unique constraint violation (email already exists)
      if (dbError.code === '23505') {
        console.error('[REGISTER] Email already exists:', normalizedEmail);
        return redirect(`/register?error=email_exists`);
      }
      throw dbError;
    }
  } catch (error) {
    console.error('[REGISTER] Error:', error);
    return redirect(`/register?error=server_error`);
  }
};
