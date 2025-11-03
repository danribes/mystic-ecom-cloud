/**
 * User Login API Endpoint
 * POST /api/auth/login
 * 
 * Authenticates user credentials and creates session.
 */

import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { login } from '@/lib/auth/session';
import { z } from 'zod';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.string().nullable().optional(),
  redirect: z.string().nullable().optional(),
});

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Parse form data
    const formData = await request.formData();
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      remember: formData.get('remember') as string | null,
      redirect: formData.get('redirect') as string | null,
    };

    // Validate input
    const validation = loginSchema.safeParse(data);
    if (!validation.success) {
      console.error('[LOGIN] Validation error:', validation.error.errors);
      return redirect(`/login?error=validation_error`);
    }

    const { email, password, redirect: redirectPath } = validation.data;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get user from database
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, email, password_hash, name, role, email_verified 
       FROM users 
       WHERE email = $1 AND deleted_at IS NULL`,
      [normalizedEmail]
    );

    // Check if user exists
    if (result.rows.length === 0) {
      console.error('[LOGIN] User not found:', normalizedEmail);
      return redirect(`/login?error=invalid_credentials`);
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      console.error('[LOGIN] Invalid password for user:', normalizedEmail);
      return redirect(`/login?error=invalid_credentials`);
    }

    // Check if email is verified (optional - can be enforced or made optional)
    // Uncomment the following to require email verification before login:
    /*
    if (!user.email_verified) {
      console.error('[LOGIN] Email not verified for user:', normalizedEmail);
      return redirect(`/login?error=unverified_email`);
    }
    */

    // Create session
    await login(cookies, user.id, user.email, user.name, user.role);

    console.log('[LOGIN] User logged in:', { id: user.id, email: user.email, role: user.role });

    // Redirect to intended destination or dashboard
    const destination = redirectPath || '/dashboard';
    return redirect(destination);
  } catch (error) {
    console.error('[LOGIN] Error:', error);
    return redirect(`/login?error=server_error`);
  }
};
