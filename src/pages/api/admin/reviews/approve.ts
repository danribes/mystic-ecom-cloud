/**
 * PUT /api/admin/reviews/approve
 *
 * Approve a pending review (admin only)
 *
 * Request Body:
 * {
 *   reviewId: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   review: { id, isApproved, updatedAt, ... }
 * }
 *
 * Errors:
 * - 401: Not authenticated
 * - 403: Not admin
 * - 400: Invalid input
 * - 404: Review not found
 * - 500: Server error
 */

import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '@/lib/auth/session';
import { ReviewService } from '@/lib/reviews';
import { getPool } from '@/lib/db';
import { sendReviewApprovalEmail } from '@/lib/email';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  normalizeError,
  logError,
} from '@/lib/errors';

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    const session = await getSessionFromRequest(cookies);
    if (!session) {
      throw new AuthenticationError('You must be logged in to perform this action');
    }

    // Check admin role
    if (session.role !== 'admin') {
      throw new AuthorizationError('Only administrators can approve reviews');
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (err) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const { reviewId } = body;

    // Validate reviewId
    if (!reviewId || typeof reviewId !== 'string') {
      throw new ValidationError('Review ID is required');
    }

    // Approve the review
    const reviewService = new ReviewService(getPool());
    const review = await reviewService.approveReview(reviewId);

    // Get review details with user and course information for email - T120
    const reviewDetails = await reviewService.getReviewById(reviewId);
    const baseUrl = process.env.BASE_URL || 'http://localhost:4321';
    const reviewUrl = `${baseUrl}/courses/${reviewDetails.courseId}#review-${reviewDetails.id}`;

    // Send approval email notification - T120
    try {
      await sendReviewApprovalEmail({
        userName: reviewDetails.userName,
        userEmail: reviewDetails.userEmail,
        courseTitle: reviewDetails.courseTitle,
        rating: reviewDetails.rating,
        comment: reviewDetails.comment,
        reviewUrl: reviewUrl,
      });
      console.log(`[T120] Approval email sent to ${reviewDetails.userEmail} for review ${reviewId}`);
    } catch (emailError) {
      // Log email error but don't fail the request
      logError(emailError, { context: 'sendReviewApprovalEmail', reviewId, userEmail: reviewDetails.userEmail });
      console.warn(`[T120] Failed to send approval email for review ${reviewId}:`, emailError);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        review: {
          id: review.id,
          isApproved: review.isApproved,
          updatedAt: review.updatedAt,
        },
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
    logError(normalizedError, { context: 'approve_review_api' });

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
        error: normalizedError.message,
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
