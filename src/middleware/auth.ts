/**
 * Authentication Middleware
 *
 * Protects routes that require user authentication.
 * Redirects unauthenticated users to login page.
 */

import { defineMiddleware } from 'astro:middleware';
import { getSessionFromRequest } from '@/lib/auth/session';
import { initEnv } from '@/lib/env';
import { extractLocaleFromPath } from '@/i18n';

/**
 * Auth middleware to protect routes
 *
 * Usage in pages:
 * export const prerender = false; // Required for SSR
 *
 * const session = await getSessionFromRequest(Astro.cookies);
 * if (!session) {
 *   return Astro.redirect('/login');
 * }
 */
export const onRequest = defineMiddleware(async (context, next) => {
  try {
    const { url, cookies, redirect, locals } = context;

    // Initialize environment variables from Cloudflare runtime
    // This makes secrets available to library code via getEnv()
    const runtime = (locals as any).runtime;
    if (runtime?.env) {
      initEnv(runtime.env);
    }

    // Extract clean path without locale prefix (e.g., /en/courses -> /courses)
    const { path: cleanPath } = extractLocaleFromPath(url.pathname);

    // Skip middleware for public routes
    const publicPaths = [
      '/',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/api/health',
      '/api/auth/',
      '/api/checkout/',
      '/api/search',
      '/courses',
      '/events',
      '/shop',
      '/about',
      '/cart',
      '/checkout',
      '/products',
    ];

    // Check if current path is public (using clean path without locale prefix)
    const isPublicPath = publicPaths.some((path) => {
      if (path === '/') {
        return cleanPath === path;
      }
      return cleanPath.startsWith(path);
    });

    // Allow public static assets
    if (
      url.pathname.startsWith('/_') ||
      url.pathname.startsWith('/public/') ||
      url.pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf)$/)
    ) {
      return next();
    }

    // Skip auth check for public paths
    if (isPublicPath) {
      return next();
    }

    // Get session from cookies
    const session = await getSessionFromRequest(cookies);

    // If no session, redirect to login
    if (!session) {
      // Store the intended destination
      const redirectUrl = new URL('/login', url.origin);
      redirectUrl.searchParams.set('redirect', url.pathname);
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
  } catch (error) {
    // If auth middleware fails, log error and continue to allow public access
    console.error('[auth] Middleware error:', error);

    // Extract clean path without locale prefix for public path check
    const { path: cleanPath } = extractLocaleFromPath(context.url.pathname);

    // For public paths, continue anyway
    const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/api/health', '/api/auth/', '/api/checkout/', '/api/search', '/courses', '/events', '/shop', '/about', '/cart', '/checkout', '/products'];
    const isPublicPath = publicPaths.some((path) => {
      if (path === '/') {
        return cleanPath === path;
      }
      return cleanPath.startsWith(path);
    });

    if (isPublicPath || context.url.pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf)$/)) {
      // Allow public paths to continue
      return next();
    }

    // For protected paths, redirect to login if auth fails
    const redirectUrl = new URL('/login', context.url.origin);
    redirectUrl.searchParams.set('redirect', context.url.pathname);
    redirectUrl.searchParams.set('error', 'auth_error');
    return context.redirect(redirectUrl.toString());
  }
});
