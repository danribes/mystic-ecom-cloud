/**
 * POST /api/reviews/submit
 *
 * Submit a review for a course
 *
 * Request Body:
 * {
 *   courseId: string,
 *   userId: string,
 *   rating: number (1-5),
 *   comment?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   review: { id, userId, courseId, rating, comment, isApproved, createdAt }
 * }
 *
 * Errors:
 * - 401: Not authenticated
 * - 400: Invalid input
 * - 403: User hasn't purchased course or already reviewed
 * - 500: Server error
 */

import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '@/lib/auth/session';
import { ReviewService } from '@/lib/reviews';
import { getPool } from '@/lib/db';
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
      throw new AuthenticationError('You must be logged in to submit a review');
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (err) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const { courseId, rating, comment } = body;

    // Validate courseId
    if (!courseId || typeof courseId !== 'string') {
      throw new ValidationError('Course ID is required');
    }

    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be a number between 1 and 5');
    }

    // Validate comment (optional)
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        throw new ValidationError('Comment must be a string');
      }
      if (comment.length > 1000) {
        throw new ValidationError('Comment must not exceed 1000 characters');
      }
    }

    // Verify that the request body userId matches the session userId
    // This prevents users from submitting reviews as other users
    const requestUserId = body.userId;
    if (requestUserId && requestUserId !== session.userId) {
      throw new AuthorizationError('You can only submit reviews for yourself');
    }

    // Create review using ReviewService
    const reviewService = new ReviewService(getPool());
    const review = await reviewService.createReview({
      userId: session.userId,
      courseId,
      rating,
      comment: comment || undefined,
    });

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        review: {
          id: review.id,
          userId: review.user_id,
          courseId: review.course_id,
          rating: review.rating,
          comment: review.comment,
          isApproved: review.is_approved,
          createdAt: review.created_at,
        },
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    // Log error
    logError(error, {
      endpoint: 'POST /api/reviews/submit',
      timestamp: new Date().toISOString(),
    });

    // Normalize error response
    const normalizedError = normalizeError(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: normalizedError.message,
          code: normalizedError.code,
          ...(normalizedError.fields ? { fields: normalizedError.fields } : {}),
        },
      }),
      {
        status: normalizedError.statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
