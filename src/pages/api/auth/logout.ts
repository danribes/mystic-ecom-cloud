/**
 * User Logout API Endpoint
 * POST /api/auth/logout
 * 
 * Destroys user session and clears cookie.
 */

import type { APIRoute } from 'astro';
import { logout } from '@/lib/auth/session';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    // Destroy session and clear cookie
    await logout(cookies);

    console.log('[LOGOUT] User logged out successfully');

    // Redirect to login page with success message
    return redirect('/login?success=logout');
  } catch (error) {
    console.error('[LOGOUT] Error:', error);
    // Still redirect to login even on error
    return redirect('/login');
  }
};

/**
 * GET support for convenience (logout links)
 * Redirects to POST endpoint
 */
export const GET: APIRoute = async ({ redirect }) => {
  return redirect('/api/auth/logout', 307); // 307 = Temporary Redirect with method preservation
};
