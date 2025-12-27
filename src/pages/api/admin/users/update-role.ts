/**
 * POST /api/admin/users/update-role
 *
 * Update a user's role (admin only)
 *
 * Request Body:
 * {
 *   userId: string,
 *   role: 'user' | 'admin'
 * }
 *
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 *
 * Errors:
 * - 401: Not authenticated
 * - 403: Not admin
 * - 400: Invalid input
 * - 404: User not found
 * - 500: Server error
 */

import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '@/lib/auth/session';
import { updateUserRole } from '@/services/user.service';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  normalizeError,
  logError,
} from '@/lib/errors';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    const session = await getSessionFromRequest(cookies);
    if (!session) {
      throw new AuthenticationError('You must be logged in to perform this action');
    }

    // Check admin role
    if (session.role !== 'admin') {
      throw new AuthorizationError('Only administrators can change user roles');
    }

    // Parse request body
    let body: { userId?: string; role?: string };
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON in request body');
    }

    const { userId, role } = body;

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new ValidationError('User ID is required');
    }

    // Validate role
    if (!role || (role !== 'user' && role !== 'admin')) {
      throw new ValidationError('Role must be either "user" or "admin"');
    }

    // Update the user's role
    const result = await updateUserRole(userId, role, session.userId);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: result.message,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const normalizedError = normalizeError(error);
    logError(normalizedError, { context: 'update_user_role_api' });

    // Determine appropriate status code
    let status = 500;
    if (normalizedError.code === 'AUTHENTICATION_ERROR') {
      status = 401;
    } else if (normalizedError.code === 'AUTHORIZATION_ERROR') {
      status = 403;
    } else if (normalizedError.code === 'VALIDATION_ERROR') {
      status = 400;
    } else if (normalizedError.code === 'NOT_FOUND') {
      status = 404;
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: normalizedError.message,
        code: normalizedError.code,
      }),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
