/**
 * Admin Authentication Utilities
 * Helper functions for admin route protection
 */

import type { AstroCookies } from 'astro';
import { getSessionFromRequest } from '@/lib/auth/session';

export interface AdminAuthResult {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user?: {
    name: string;
    email: string;
    role: string;
    userId: string;
  };
  redirectUrl?: string;
}

/**
 * Check if user has admin access
 * Returns auth result with redirect URL if needed
 */
export async function checkAdminAuth(cookies: AstroCookies, currentPath: string): Promise<AdminAuthResult> {
  // Development mode bypass - if Redis is not available, allow access for testing
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_AUTH === 'true') {
    return {
      isAuthenticated: true,
      isAdmin: true,
      user: {
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
        userId: 'test-admin-id',
      }
    };
  }

  try {
    const session = await getSessionFromRequest(cookies);
    
    if (!session) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        redirectUrl: `/login?redirect=${encodeURIComponent(currentPath)}`
      };
    }

    if (session.role !== 'admin') {
      return {
        isAuthenticated: true,
        isAdmin: false,
        redirectUrl: '/unauthorized'
      };
    }

    return {
      isAuthenticated: true,
      isAdmin: true,
      user: {
        name: session.name,
        email: session.email,
        role: session.role,
        userId: session.userId,
      }
    };
  } catch (error) {
    // If session check fails (e.g., Redis connection issue), redirect to login
    console.error('Admin auth check failed:', error);
    return {
      isAuthenticated: false,
      isAdmin: false,
      redirectUrl: `/login?redirect=${encodeURIComponent(currentPath)}`
    };
  }
}

/**
 * Require admin authentication - throws redirect if not authorized
 */
export async function requireAdmin(cookies: AstroCookies, currentPath: string) {
  const authResult = await checkAdminAuth(cookies, currentPath);
  
  if (authResult.redirectUrl) {
    throw new Response(null, {
      status: 302,
      headers: {
        Location: authResult.redirectUrl
      }
    });
  }
  
  return authResult.user!;
}