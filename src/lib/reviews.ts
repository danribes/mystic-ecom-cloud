/**
 * Review Service
 *
 * Handles all CRUD operations for course reviews including creation, retrieval,
 * approval/rejection, and statistics calculations.
 *
 * Business Rules:
 * - Users can only review courses they have purchased (verified purchase)
 * - One review per user per course (enforced by DB unique constraint)
 * - Reviews require admin approval before appearing publicly
 * - Ratings must be between 1-5 stars
 * - Users can update their own reviews before approval
 */

import type { Pool } from 'pg';
import { getPool } from '@/lib/db';
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError } from '@/lib/errors';

// ==================== Types ====================

export interface Review {
  id: string;
  userId: string;
  courseId: string;
  rating: number; // 1-5
  comment: string | null;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Joined fields from other tables
  userName?: string;
  userEmail?: string;
  courseTitle?: string;
}

export interface ReviewWithDetails extends Review {
  userName: string;
  userEmail: string;
  courseTitle: string;
  isVerifiedPurchase: boolean;
}

export interface CreateReviewInput {
  userId: string;
  courseId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}

export interface ListReviewsOptions {
  courseId?: string;
  userId?: string;
  isApproved?: boolean;
  minRating?: number;
  maxRating?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'rating' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedReviews {
  reviews: ReviewWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CourseReviewStats {
  courseId: string;
  totalReviews: number;
  approvedReviews: number;
  avgRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// ==================== Service Class ====================

export class ReviewService {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || getPool();
  }

  /**
   * Create a new review for a course
   *
   * Validates:
   * - User has purchased the course
   * - Rating is between 1-5
   * - User hasn't already reviewed this course
   *
   * @throws ValidationError if inputs are invalid
   * @throws AuthorizationError if user hasn't purchased course
   * @throws DatabaseError if unique constraint violated (duplicate review)
   */
  async createReview(input: CreateReviewInput): Promise<Review> {
    // Validate rating
    if (!input.rating || input.rating < 1 || input.rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    // Validate required fields
    if (!input.userId || !input.courseId) {
      throw new ValidationError('User ID and Course ID are required');
    }

    // Trim comment if provided
    const comment = input.comment?.trim() || null;

    // Check if user has purchased the course
    const purchaseCheck = await this.pool.query(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1
         AND oi.course_id = $2
         AND o.status = 'completed'
       LIMIT 1`,
      [input.userId, input.courseId]
    );

    if (purchaseCheck.rows.length === 0) {
      throw new AuthorizationError('You can only review courses you have purchased');
    }

    try {
      const result = await this.pool.query(
        `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
         VALUES ($1, $2, $3, $4, false)
         RETURNING
           id,
           user_id as "userId",
           course_id as "courseId",
           rating,
           comment,
           is_approved as "isApproved",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [input.userId, input.courseId, input.rating, comment]
      );

      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation - user already reviewed this course
        throw new DatabaseError('You have already reviewed this course. You can update your existing review instead.');
      }
      throw new DatabaseError(`Failed to create review: ${error.message}`);
    }
  }

  /**
   * Update an existing review
   *
   * Users can only update their own reviews and only if not yet approved
   * (once approved, reviews are locked to prevent abuse)
   *
   * @throws NotFoundError if review doesn't exist
   * @throws AuthorizationError if user doesn't own the review
   * @throws ValidationError if review is already approved
   */
  async updateReview(reviewId: string, userId: string, input: UpdateReviewInput): Promise<Review> {
    // Validate rating if provided
    if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    // Check review exists and user owns it
    const existingReview = await this.pool.query(
      `SELECT is_approved, user_id FROM reviews WHERE id = $1`,
      [reviewId]
    );

    if (existingReview.rows.length === 0) {
      throw new NotFoundError('Review not found');
    }

    if (existingReview.rows[0].user_id !== userId) {
      throw new AuthorizationError('You can only update your own reviews');
    }

    if (existingReview.rows[0].is_approved) {
      throw new ValidationError('Cannot update an approved review. Please contact support if you need to make changes.');
    }

    // Build update fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.rating !== undefined) {
      updates.push(`rating = $${paramIndex++}`);
      values.push(input.rating);
    }

    if (input.comment !== undefined) {
      updates.push(`comment = $${paramIndex++}`);
      values.push(input.comment?.trim() || null);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(reviewId);

    const result = await this.pool.query(
      `UPDATE reviews
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING
         id,
         user_id as "userId",
         course_id as "courseId",
         rating,
         comment,
         is_approved as "isApproved",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      values
    );

    return result.rows[0];
  }

  /**
   * Get a single review by ID with full details
   *
   * @throws NotFoundError if review doesn't exist
   */
  async getReviewById(reviewId: string): Promise<ReviewWithDetails> {
    const result = await this.pool.query(
      `SELECT
         r.id,
         r.user_id as "userId",
         r.course_id as "courseId",
         r.rating,
         r.comment,
         r.is_approved as "isApproved",
         r.created_at as "createdAt",
         r.updated_at as "updatedAt",
         u.name as "userName",
         u.email as "userEmail",
         c.title as "courseTitle",
         CASE
           WHEN EXISTS (
             SELECT 1 FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE o.user_id = r.user_id
               AND oi.course_id = r.course_id
               AND o.status = 'completed'
           ) THEN true
           ELSE false
         END as "isVerifiedPurchase"
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN courses c ON r.course_id = c.id
       WHERE r.id = $1`,
      [reviewId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Review not found');
    }

    return result.rows[0];
  }

  /**
   * Get reviews with filtering, pagination, and sorting
   *
   * By default, only returns approved reviews for public display.
   * Admin can set isApproved=false to see pending reviews.
   */
  async getReviews(options: ListReviewsOptions = {}): Promise<PaginatedReviews> {
    const {
      courseId,
      userId,
      isApproved = true, // Default to approved only
      minRating,
      maxRating,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (courseId) {
      conditions.push(`r.course_id = $${paramIndex++}`);
      values.push(courseId);
    }

    if (userId) {
      conditions.push(`r.user_id = $${paramIndex++}`);
      values.push(userId);
    }

    if (isApproved !== undefined) {
      conditions.push(`r.is_approved = $${paramIndex++}`);
      values.push(isApproved);
    }

    if (minRating !== undefined) {
      conditions.push(`r.rating >= $${paramIndex++}`);
      values.push(minRating);
    }

    if (maxRating !== undefined) {
      conditions.push(`r.rating <= $${paramIndex++}`);
      values.push(maxRating);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate and build ORDER BY clause
    const validSortFields = ['createdAt', 'rating', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Map camelCase to snake_case for SQL
    const sortFieldMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      rating: 'rating'
    };
    const sqlSortField = sortFieldMap[sortField];

    // Calculate pagination
    const offset = (page - 1) * limit;
    values.push(limit + 1); // Fetch one extra to check if there are more
    const limitParam = paramIndex++;
    values.push(offset);
    const offsetParam = paramIndex++;

    // Get reviews with details
    const reviewsResult = await this.pool.query(
      `SELECT
         r.id,
         r.user_id as "userId",
         r.course_id as "courseId",
         r.rating,
         r.comment,
         r.is_approved as "isApproved",
         r.created_at as "createdAt",
         r.updated_at as "updatedAt",
         u.name as "userName",
         u.email as "userEmail",
         c.title as "courseTitle",
         CASE
           WHEN EXISTS (
             SELECT 1 FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE o.user_id = r.user_id
               AND oi.course_id = r.course_id
               AND o.status = 'completed'
           ) THEN true
           ELSE false
         END as "isVerifiedPurchase"
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN courses c ON r.course_id = c.id
       ${whereClause}
       ORDER BY r.${sqlSortField} ${order}
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values
    );

    // Check if there are more results
    const hasMore = reviewsResult.rows.length > limit;
    const reviews = hasMore ? reviewsResult.rows.slice(0, limit) : reviewsResult.rows;

    // Get total count (for pagination info)
    const countValues = values.slice(0, -2); // Remove limit and offset
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total
       FROM reviews r
       ${whereClause}`,
      countValues
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages,
      hasMore
    };
  }

  /**
   * Approve a review (admin only)
   *
   * @throws NotFoundError if review doesn't exist
   */
  async approveReview(reviewId: string): Promise<Review> {
    const result = await this.pool.query(
      `UPDATE reviews
       SET is_approved = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING
         id,
         user_id as "userId",
         course_id as "courseId",
         rating,
         comment,
         is_approved as "isApproved",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [reviewId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Review not found');
    }

    return result.rows[0];
  }

  /**
   * Reject a review (admin only)
   *
   * Sets is_approved to false. Reviews can be re-approved later if needed.
   *
   * @throws NotFoundError if review doesn't exist
   */
  async rejectReview(reviewId: string): Promise<Review> {
    const result = await this.pool.query(
      `UPDATE reviews
       SET is_approved = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING
         id,
         user_id as "userId",
         course_id as "courseId",
         rating,
         comment,
         is_approved as "isApproved",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [reviewId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Review not found');
    }

    return result.rows[0];
  }

  /**
   * Delete a review
   *
   * Permanently removes a review from the database.
   * Admins can delete any review. Users can delete their own unapproved reviews.
   *
   * @throws NotFoundError if review doesn't exist
   * @throws AuthorizationError if user doesn't own the review (non-admin)
   */
  async deleteReview(reviewId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    // Check review exists
    const existingReview = await this.pool.query(
      `SELECT user_id, is_approved FROM reviews WHERE id = $1`,
      [reviewId]
    );

    if (existingReview.rows.length === 0) {
      throw new NotFoundError('Review not found');
    }

    // Authorization check
    if (!isAdmin) {
      if (existingReview.rows[0].user_id !== userId) {
        throw new AuthorizationError('You can only delete your own reviews');
      }
      if (existingReview.rows[0].is_approved) {
        throw new AuthorizationError('Cannot delete an approved review. Please contact support.');
      }
    }

    await this.pool.query(`DELETE FROM reviews WHERE id = $1`, [reviewId]);
  }

  /**
   * Get review statistics for a course
   *
   * Calculates average rating, total reviews, and rating distribution
   * Only counts approved reviews for public stats
   */
  async getCourseReviewStats(courseId: string): Promise<CourseReviewStats> {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total_reviews,
         COUNT(*) FILTER (WHERE is_approved = true) as approved_reviews,
         COALESCE(AVG(rating) FILTER (WHERE is_approved = true), 0) as avg_rating,
         COUNT(*) FILTER (WHERE rating = 1 AND is_approved = true) as rating_1,
         COUNT(*) FILTER (WHERE rating = 2 AND is_approved = true) as rating_2,
         COUNT(*) FILTER (WHERE rating = 3 AND is_approved = true) as rating_3,
         COUNT(*) FILTER (WHERE rating = 4 AND is_approved = true) as rating_4,
         COUNT(*) FILTER (WHERE rating = 5 AND is_approved = true) as rating_5
       FROM reviews
       WHERE course_id = $1`,
      [courseId]
    );

    const row = result.rows[0];

    return {
      courseId,
      totalReviews: parseInt(row.total_reviews),
      approvedReviews: parseInt(row.approved_reviews),
      avgRating: parseFloat(row.avg_rating).toFixed(1) as any,
      ratingDistribution: {
        1: parseInt(row.rating_1),
        2: parseInt(row.rating_2),
        3: parseInt(row.rating_3),
        4: parseInt(row.rating_4),
        5: parseInt(row.rating_5)
      }
    };
  }

  /**
   * Check if a user has purchased and can review a course
   *
   * Returns true if user has completed an order containing the course
   */
  async canUserReviewCourse(userId: string, courseId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1
         AND oi.course_id = $2
         AND o.status = 'completed'
       LIMIT 1`,
      [userId, courseId]
    );

    return result.rows.length > 0;
  }

  /**
   * Check if a user has already reviewed a course
   *
   * Returns the existing review if found, null otherwise
   */
  async getUserReviewForCourse(userId: string, courseId: string): Promise<Review | null> {
    const result = await this.pool.query(
      `SELECT
         id,
         user_id as "userId",
         course_id as "courseId",
         rating,
         comment,
         is_approved as "isApproved",
         created_at as "createdAt",
         updated_at as "updatedAt"
       FROM reviews
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get pending reviews count (for admin dashboard)
   */
  async getPendingReviewsCount(): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count FROM reviews WHERE is_approved = false`
    );
    return parseInt(result.rows[0].count);
  }
}

// ==================== Export Factory Function ====================

/**
 * Create a new ReviewService instance
 *
 * @param pool Optional PostgreSQL pool (uses default if not provided)
 */
export function createReviewService(pool?: Pool): ReviewService {
  return new ReviewService(pool);
}

// Export default instance
export const reviewService = new ReviewService();
