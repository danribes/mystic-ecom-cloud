/**
 * Admin Middleware
 * 
 * Protects admin-only routes.
 * Requires user to be authenticated AND have admin role.
 * Redirects non-admin users to home page with error message.
 */

import { defineMiddleware } from 'astro:middleware';
import { getSessionFromRequest } from '@/lib/auth/session';

/**
 * Admin middleware to protect admin routes
 * 
 * Usage: Apply to routes under /admin/* or specific admin pages
 * 
 * This middleware checks:
 * 1. User is authenticated
 * 2. User has 'admin' role
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect, locals } = context;

  // Only apply to admin routes
  if (!url.pathname.startsWith('/admin')) {
    return next();
  }

  // Get session from cookies
  const session = await getSessionFromRequest(cookies);

  // If no session, redirect to login
  if (!session) {
    const redirectUrl = new URL('/login', url.origin);
    redirectUrl.searchParams.set('redirect', url.pathname);
    redirectUrl.searchParams.set('error', 'admin_auth_required');
    return redirect(redirectUrl.toString());
  }

  // Check if user is admin
  if (session.role !== 'admin') {
    const redirectUrl = new URL('/', url.origin);
    redirectUrl.searchParams.set('error', 'admin_access_denied');
    return redirect(redirectUrl.toString());
  }

  // Attach session to locals for use in pages
  locals.session = session;
  locals.user = {
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };

  return next();
});
