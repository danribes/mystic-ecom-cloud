/**
 * T113: Review Service Unit Tests
 *
 * Comprehensive test suite for the review service including:
 * - Review creation with purchase verification
 * - Review updates with authorization
 * - Review retrieval with filtering and pagination
 * - Admin approval/rejection workflows
 * - Review deletion with authorization
 * - Course statistics calculation
 * - Helper methods for review eligibility
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getPool } from '@/lib/db';
import type { Pool } from 'pg';
import {
  ReviewService,
  createReviewService,
  type CreateReviewInput,
  type UpdateReviewInput,
  type ListReviewsOptions
} from '@/lib/reviews';
import { ValidationError, NotFoundError, AuthorizationError, DatabaseError } from '@/lib/errors';
import { hashPassword } from '@/lib/auth/password';

let pool: Pool;
let reviewService: ReviewService;

// Test data IDs
let testUserId: string;
let testUser2Id: string;
let testAdminId: string;
let testCourseId: string;
let testCourse2Id: string;
let testOrderId: string;
let testReviewId: string;

describe('T113: Review Service', () => {
  beforeAll(async () => {
    pool = getPool();
    reviewService = createReviewService(pool);
  });

  beforeEach(async () => {
    // Clean up existing test data
    await pool.query(`DELETE FROM reviews WHERE 1=1`);
    await pool.query(`DELETE FROM order_items WHERE 1=1`);
    await pool.query(`DELETE FROM orders WHERE 1=1`);
    await pool.query(`DELETE FROM courses WHERE title LIKE 'Test Course%'`);
    await pool.query(`DELETE FROM users WHERE email LIKE 'test%@review.test'`);

    // Create test users
    const hashedPassword = await hashPassword('password123');

    const user1Result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['testuser1@review.test', hashedPassword, 'Test User 1', 'user']
    );
    testUserId = user1Result.rows[0].id;

    const user2Result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['testuser2@review.test', hashedPassword, 'Test User 2', 'user']
    );
    testUser2Id = user2Result.rows[0].id;

    const adminResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['testadmin@review.test', hashedPassword, 'Test Admin', 'admin']
    );
    testAdminId = adminResult.rows[0].id;

    // Create test courses
    const course1Result = await pool.query(
      `INSERT INTO courses (title, slug, description, price, is_published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['Test Course 1', 'test-course-1-review', 'A test course for reviews', 99.99, true]
    );
    testCourseId = course1Result.rows[0].id;

    const course2Result = await pool.query(
      `INSERT INTO courses (title, slug, description, price, is_published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['Test Course 2', 'test-course-2-review', 'Another test course', 149.99, true]
    );
    testCourse2Id = course2Result.rows[0].id;

    // Create a completed order for testUser1 with testCourse1
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, total_amount, currency, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, 99.99, 'USD', 'completed']
    );
    testOrderId = orderResult.rows[0].id;

    await pool.query(
      `INSERT INTO order_items (order_id, course_id, item_type, title, price, quantity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testOrderId, testCourseId, 'course', 'Test Course 1', 99.99, 1]
    );
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query(`DELETE FROM reviews WHERE 1=1`);
    await pool.query(`DELETE FROM order_items WHERE 1=1`);
    await pool.query(`DELETE FROM orders WHERE 1=1`);
    await pool.query(`DELETE FROM courses WHERE title LIKE 'Test Course%'`);
    await pool.query(`DELETE FROM users WHERE email LIKE 'test%@review.test'`);
    await pool.end();
  });

  // ==================== Review Creation Tests ====================

  describe('createReview', () => {
    it('should create a review successfully for a purchased course', async () => {
      const input: CreateReviewInput = {
        userId: testUserId,
        courseId: testCourseId,
        rating: 5,
        comment: 'Excellent course! Highly recommended.'
      };

      const review = await reviewService.createReview(input);

      expect(review).toBeDefined();
      expect(review.id).toBeDefined();
      expect(review.userId).toBe(testUserId);
      expect(review.courseId).toBe(testCourseId);
      expect(review.rating).toBe(5);
      expect(review.comment).toBe('Excellent course! Highly recommended.');
      expect(review.isApproved).toBe(false); // New reviews not auto-approved
      expect(review.createdAt).toBeInstanceOf(Date);
      expect(review.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a review without a comment', async () => {
      const input: CreateReviewInput = {
        userId: testUserId,
        courseId: testCourseId,
        rating: 4
      };

      const review = await reviewService.createReview(input);

      expect(review).toBeDefined();
      expect(review.rating).toBe(4);
      expect(review.comment).toBeNull();
    });

    it('should trim whitespace from comments', async () => {
      const input: CreateReviewInput = {
        userId: testUserId,
        courseId: testCourseId,
        rating: 3,
        comment: '  Great course!  '
      };

      const review = await reviewService.createReview(input);

      expect(review.comment).toBe('Great course!');
    });

    it('should reject invalid rating (too low)', async () => {
      const input: CreateReviewInput = {
        userId: testUserId,
        courseId: testCourseId,
        rating: 0,
        comment: 'Bad rating'
      };

      await expect(reviewService.createReview(input)).rejects.toThrow(ValidationError);
      await expect(reviewService.createReview(input)).rejects.toThrow('Rating must be between 1 and 5');
    });

    it('should reject invalid rating (too high)', async () => {
      const input: CreateReviewInput = {
        userId: testUserId,
        courseId: testCourseId,
        rating: 6,
        comment: 'Bad rating'
      };

      await expect(reviewService.createReview(input)).rejects.toThrow(ValidationError);
    });

    it('should reject review for non-purchased course', async () => {
      const input: CreateReviewInput = {
        userId: testUserId,
        courseId: testCourse2Id, // Not purchased
        rating: 5,
        comment: 'Trying to review without purchase'
      };

      await expect(reviewService.createReview(input)).rejects.toThrow(AuthorizationError);
      await expect(reviewService.createReview(input)).rejects.toThrow('You can only review courses you have purchased');
    });

    it('should reject missing user ID', async () => {
      const input: CreateReviewInput = {
        userId: '',
        courseId: testCourseId,
        rating: 5,
        comment: 'Missing user'
      };

      await expect(reviewService.createReview(input)).rejects.toThrow(ValidationError);
      await expect(reviewService.createReview(input)).rejects.toThrow('User ID and Course ID are required');
    });

    it('should reject missing course ID', async () => {
      const input: CreateReviewInput = {
        userId: testUserId,
        courseId: '',
        rating: 5,
        comment: 'Missing course'
      };

      await expect(reviewService.createReview(input)).rejects.toThrow(ValidationError);
    });

    it('should reject duplicate review for same course', async () => {
      const input: CreateReviewInput = {
        userId: testUserId,
        courseId: testCourseId,
        rating: 5,
        comment: 'First review'
      };

      // Create first review
      await reviewService.createReview(input);

      // Try to create duplicate
      const duplicateInput: CreateReviewInput = {
        userId: testUserId,
        courseId: testCourseId,
        rating: 4,
        comment: 'Second review (should fail)'
      };

      await expect(reviewService.createReview(duplicateInput)).rejects.toThrow(DatabaseError);
      await expect(reviewService.createReview(duplicateInput)).rejects.toThrow('already reviewed this course');
    });

    it('should allow different users to review the same course', async () => {
      // Create order for user2
      const order2 = await pool.query(
        `INSERT INTO orders (user_id, total_amount, currency, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [testUser2Id, 99.99, 'USD', 'completed']
      );

      await pool.query(
        `INSERT INTO order_items (order_id, course_id, item_type, title, price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order2.rows[0].id, testCourseId, 'course', 'Test Course 1', 99.99, 1]
      );

      // User 1 review
      const review1 = await reviewService.createReview({
        userId: testUserId,
        courseId: testCourseId,
        rating: 5,
        comment: 'User 1 review'
      });

      // User 2 review
      const review2 = await reviewService.createReview({
        userId: testUser2Id,
        courseId: testCourseId,
        rating: 4,
        comment: 'User 2 review'
      });

      expect(review1.id).not.toBe(review2.id);
      expect(review1.userId).toBe(testUserId);
      expect(review2.userId).toBe(testUser2Id);
    });
  });

  // ==================== Review Update Tests ====================

  describe('updateReview', () => {
    beforeEach(async () => {
      // Create a review for update tests
      const review = await reviewService.createReview({
        userId: testUserId,
        courseId: testCourseId,
        rating: 3,
        comment: 'Original review'
      });
      testReviewId = review.id;
    });

    it('should update review rating', async () => {
      const updated = await reviewService.updateReview(testReviewId, testUserId, {
        rating: 5
      });

      expect(updated.rating).toBe(5);
      expect(updated.comment).toBe('Original review'); // Unchanged
    });

    it('should update review comment', async () => {
      const updated = await reviewService.updateReview(testReviewId, testUserId, {
        comment: 'Updated comment'
      });

      expect(updated.rating).toBe(3); // Unchanged
      expect(updated.comment).toBe('Updated comment');
    });

    it('should update both rating and comment', async () => {
      const updated = await reviewService.updateReview(testReviewId, testUserId, {
        rating: 4,
        comment: 'Updated both'
      });

      expect(updated.rating).toBe(4);
      expect(updated.comment).toBe('Updated both');
    });

    it('should reject update with invalid rating', async () => {
      await expect(
        reviewService.updateReview(testReviewId, testUserId, { rating: 0 })
      ).rejects.toThrow(ValidationError);

      await expect(
        reviewService.updateReview(testReviewId, testUserId, { rating: 6 })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject update by non-owner', async () => {
      await expect(
        reviewService.updateReview(testReviewId, testUser2Id, { rating: 4 })
      ).rejects.toThrow(AuthorizationError);
      await expect(
        reviewService.updateReview(testReviewId, testUser2Id, { rating: 4 })
      ).rejects.toThrow('You can only update your own reviews');
    });

    it('should reject update of approved review', async () => {
      // Approve the review
      await reviewService.approveReview(testReviewId);

      // Try to update
      await expect(
        reviewService.updateReview(testReviewId, testUserId, { rating: 5 })
      ).rejects.toThrow(ValidationError);
      await expect(
        reviewService.updateReview(testReviewId, testUserId, { rating: 5 })
      ).rejects.toThrow('Cannot update an approved review');
    });

    it('should reject update of non-existent review', async () => {
      await expect(
        reviewService.updateReview('00000000-0000-0000-0000-000000000000', testUserId, { rating: 4 })
      ).rejects.toThrow(NotFoundError);
    });

    it('should reject empty update', async () => {
      await expect(
        reviewService.updateReview(testReviewId, testUserId, {})
      ).rejects.toThrow(ValidationError);
      await expect(
        reviewService.updateReview(testReviewId, testUserId, {})
      ).rejects.toThrow('No fields to update');
    });
  });

  // ==================== Review Retrieval Tests ====================

  describe('getReviewById', () => {
    beforeEach(async () => {
      const review = await reviewService.createReview({
        userId: testUserId,
        courseId: testCourseId,
        rating: 4,
        comment: 'Test review'
      });
      testReviewId = review.id;
    });

    it('should retrieve review with full details', async () => {
      const review = await reviewService.getReviewById(testReviewId);

      expect(review).toBeDefined();
      expect(review.id).toBe(testReviewId);
      expect(review.userId).toBe(testUserId);
      expect(review.courseId).toBe(testCourseId);
      expect(review.rating).toBe(4);
      expect(review.comment).toBe('Test review');
      expect(review.userName).toBe('Test User 1');
      expect(review.userEmail).toBe('testuser1@review.test');
      expect(review.courseTitle).toBe('Test Course 1');
      expect(review.isVerifiedPurchase).toBe(true);
    });

    it('should throw NotFoundError for non-existent review', async () => {
      await expect(
        reviewService.getReviewById('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getReviews', () => {
    beforeEach(async () => {
      // Create order for testCourse2 so user can review it
      const order2 = await pool.query(
        `INSERT INTO orders (user_id, total_amount, currency, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [testUserId, 149.99, 'USD', 'completed']
      );

      await pool.query(
        `INSERT INTO order_items (order_id, course_id, item_type, title, price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order2.rows[0].id, testCourse2Id, 'course', 'Test Course 2', 149.99, 1]
      );

      // Create multiple reviews for testing - different courses
      await reviewService.createReview({
        userId: testUserId,
        courseId: testCourseId,
        rating: 5,
        comment: 'Excellent!'
      });

      await reviewService.createReview({
        userId: testUserId,
        courseId: testCourse2Id,
        rating: 3,
        comment: 'Good'
      });

      // Approve first review
      const allReviews = await pool.query(`SELECT id FROM reviews ORDER BY created_at ASC`);
      await reviewService.approveReview(allReviews.rows[0].id);
    });

    it('should return only approved reviews by default', async () => {
      const result = await reviewService.getReviews();

      expect(result.reviews.length).toBe(1);
      expect(result.reviews[0].isApproved).toBe(true);
      expect(result.total).toBe(1);
    });

    it('should return unapproved reviews when requested', async () => {
      const result = await reviewService.getReviews({ isApproved: false });

      expect(result.reviews.length).toBe(1);
      expect(result.reviews[0].isApproved).toBe(false);
    });

    it('should filter by course ID', async () => {
      const result = await reviewService.getReviews({
        courseId: testCourseId,
        isApproved: undefined // Get all reviews
      });

      expect(result.total).toBeGreaterThanOrEqual(1);
      result.reviews.forEach(review => {
        expect(review.courseId).toBe(testCourseId);
      });
    });

    it('should filter by user ID', async () => {
      const result = await reviewService.getReviews({
        userId: testUserId,
        isApproved: undefined
      });

      expect(result.total).toBeGreaterThanOrEqual(1);
      result.reviews.forEach(review => {
        expect(review.userId).toBe(testUserId);
      });
    });

    it('should filter by minimum rating', async () => {
      const result = await reviewService.getReviews({
        minRating: 4,
        isApproved: undefined
      });

      result.reviews.forEach(review => {
        expect(review.rating).toBeGreaterThanOrEqual(4);
      });
    });

    it('should filter by maximum rating', async () => {
      const result = await reviewService.getReviews({
        maxRating: 3,
        isApproved: undefined
      });

      result.reviews.forEach(review => {
        expect(review.rating).toBeLessThanOrEqual(3);
      });
    });

    it('should paginate results', async () => {
      const page1 = await reviewService.getReviews({
        page: 1,
        limit: 1,
        isApproved: undefined
      });

      expect(page1.reviews.length).toBeLessThanOrEqual(1);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(1);
      expect(page1.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should sort by rating ascending', async () => {
      const result = await reviewService.getReviews({
        sortBy: 'rating',
        sortOrder: 'ASC',
        isApproved: undefined
      });

      for (let i = 1; i < result.reviews.length; i++) {
        expect(result.reviews[i].rating).toBeGreaterThanOrEqual(result.reviews[i - 1].rating);
      }
    });

    it('should sort by rating descending', async () => {
      const result = await reviewService.getReviews({
        sortBy: 'rating',
        sortOrder: 'DESC',
        isApproved: undefined
      });

      for (let i = 1; i < result.reviews.length; i++) {
        expect(result.reviews[i].rating).toBeLessThanOrEqual(result.reviews[i - 1].rating);
      }
    });

    it('should include user and course details', async () => {
      const result = await reviewService.getReviews({ isApproved: undefined });

      result.reviews.forEach(review => {
        expect(review.userName).toBeDefined();
        expect(review.userEmail).toBeDefined();
        expect(review.courseTitle).toBeDefined();
        expect(review.isVerifiedPurchase).toBeDefined();
      });
    });

    it('should indicate hasMore correctly', async () => {
      const hashedPassword = await hashPassword('password123');

      // Create 3 more reviews (total 5 with the 2 from beforeEach)
      for (let i = 0; i < 3; i++) {
        const userResult = await pool.query(
          `INSERT INTO users (email, password_hash, name, role)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [`testuser-more-${i}@review.test`, hashedPassword, `More User ${i}`, 'user']
        );
        const userId = userResult.rows[0].id;

        // Create order
        const orderResult = await pool.query(
          `INSERT INTO orders (user_id, total_amount, currency, status)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [userId, 99.99, 'USD', 'completed']
        );

        await pool.query(
          `INSERT INTO order_items (order_id, course_id, item_type, title, price, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderResult.rows[0].id, testCourseId, 'course', 'Test Course 1', 99.99, 1]
        );

        await pool.query(
          `INSERT INTO reviews (user_id, course_id, rating, is_approved)
           VALUES ($1, $2, $3, $4)`,
          [userId, testCourseId, 4, true]
        );
      }

      const result = await reviewService.getReviews({
        limit: 3,
        isApproved: true
      });

      expect(result.hasMore).toBe(true);
    });
  });

  // ==================== Approval/Rejection Tests ====================

  describe('approveReview', () => {
    beforeEach(async () => {
      const review = await reviewService.createReview({
        userId: testUserId,
        courseId: testCourseId,
        rating: 4,
        comment: 'Pending review'
      });
      testReviewId = review.id;
    });

    it('should approve a review', async () => {
      const approved = await reviewService.approveReview(testReviewId);

      expect(approved.isApproved).toBe(true);
      expect(approved.id).toBe(testReviewId);
    });

    it('should throw NotFoundError for non-existent review', async () => {
      await expect(
        reviewService.approveReview('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError);
    });

    it('should allow re-approving an already approved review', async () => {
      await reviewService.approveReview(testReviewId);
      const reapproved = await reviewService.approveReview(testReviewId);

      expect(reapproved.isApproved).toBe(true);
    });
  });

  describe('rejectReview', () => {
    beforeEach(async () => {
      const review = await reviewService.createReview({
        userId: testUserId,
        courseId: testCourseId,
        rating: 4,
        comment: 'Review to reject'
      });
      testReviewId = review.id;
      await reviewService.approveReview(testReviewId);
    });

    it('should reject an approved review', async () => {
      const rejected = await reviewService.rejectReview(testReviewId);

      expect(rejected.isApproved).toBe(false);
      expect(rejected.id).toBe(testReviewId);
    });

    it('should throw NotFoundError for non-existent review', async () => {
      await expect(
        reviewService.rejectReview('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==================== Delete Review Tests ====================

  describe('deleteReview', () => {
    beforeEach(async () => {
      const review = await reviewService.createReview({
        userId: testUserId,
        courseId: testCourseId,
        rating: 4,
        comment: 'Review to delete'
      });
      testReviewId = review.id;
    });

    it('should allow user to delete their own unapproved review', async () => {
      await reviewService.deleteReview(testReviewId, testUserId, false);

      await expect(
        reviewService.getReviewById(testReviewId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should prevent user from deleting approved review', async () => {
      await reviewService.approveReview(testReviewId);

      await expect(
        reviewService.deleteReview(testReviewId, testUserId, false)
      ).rejects.toThrow(AuthorizationError);
      await expect(
        reviewService.deleteReview(testReviewId, testUserId, false)
      ).rejects.toThrow('Cannot delete an approved review');
    });

    it('should prevent user from deleting another user review', async () => {
      await expect(
        reviewService.deleteReview(testReviewId, testUser2Id, false)
      ).rejects.toThrow(AuthorizationError);
      await expect(
        reviewService.deleteReview(testReviewId, testUser2Id, false)
      ).rejects.toThrow('You can only delete your own reviews');
    });

    it('should allow admin to delete any review', async () => {
      await reviewService.approveReview(testReviewId);

      await reviewService.deleteReview(testReviewId, testAdminId, true);

      await expect(
        reviewService.getReviewById(testReviewId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-existent review', async () => {
      await expect(
        reviewService.deleteReview('00000000-0000-0000-0000-000000000000', testUserId, false)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==================== Statistics Tests ====================

  describe('getCourseReviewStats', () => {
    beforeEach(async () => {
      // Create multiple test users for reviews with different ratings
      const ratings = [5, 5, 4, 4, 3, 2, 1];
      const hashedPassword = await hashPassword('password123');

      for (let i = 0; i < ratings.length; i++) {
        // Create a unique user for each review
        const userResult = await pool.query(
          `INSERT INTO users (email, password_hash, name, role)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [`testuser-stats-${i}@review.test`, hashedPassword, `Stats User ${i}`, 'user']
        );
        const userId = userResult.rows[0].id;

        // Create order for this user
        const orderResult = await pool.query(
          `INSERT INTO orders (user_id, total_amount, currency, status)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [userId, 99.99, 'USD', 'completed']
        );

        await pool.query(
          `INSERT INTO order_items (order_id, course_id, item_type, title, price, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderResult.rows[0].id, testCourseId, 'course', 'Test Course 1', 99.99, 1]
        );

        // Create review
        await pool.query(
          `INSERT INTO reviews (user_id, course_id, rating, is_approved)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [userId, testCourseId, ratings[i], true]
        );
      }

      // Create one unapproved review with a different user
      const unapprovedUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['testuser-unapproved@review.test', hashedPassword, 'Unapproved User', 'user']
      );
      const unapprovedUserId = unapprovedUserResult.rows[0].id;

      const unapprovedOrderResult = await pool.query(
        `INSERT INTO orders (user_id, total_amount, currency, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [unapprovedUserId, 99.99, 'USD', 'completed']
      );

      await pool.query(
        `INSERT INTO order_items (order_id, course_id, item_type, title, price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [unapprovedOrderResult.rows[0].id, testCourseId, 'course', 'Test Course 1', 99.99, 1]
      );

      await pool.query(
        `INSERT INTO reviews (user_id, course_id, rating, is_approved)
         VALUES ($1, $2, $3, $4)`,
        [unapprovedUserId, testCourseId, 5, false]
      );
    });

    it('should calculate correct statistics', async () => {
      const stats = await reviewService.getCourseReviewStats(testCourseId);

      expect(stats.courseId).toBe(testCourseId);
      expect(stats.totalReviews).toBe(8); // 7 approved + 1 unapproved
      expect(stats.approvedReviews).toBe(7);
      expect(stats.ratingDistribution[5]).toBe(2);
      expect(stats.ratingDistribution[4]).toBe(2);
      expect(stats.ratingDistribution[3]).toBe(1);
      expect(stats.ratingDistribution[2]).toBe(1);
      expect(stats.ratingDistribution[1]).toBe(1);

      // Average: (5+5+4+4+3+2+1) / 7 = 24/7 = 3.4
      expect(parseFloat(stats.avgRating)).toBeCloseTo(3.4, 1);
    });

    it('should return zero stats for course with no reviews', async () => {
      const stats = await reviewService.getCourseReviewStats(testCourse2Id);

      expect(stats.totalReviews).toBe(0);
      expect(stats.approvedReviews).toBe(0);
      expect(stats.avgRating).toBe('0.0');
      expect(stats.ratingDistribution[1]).toBe(0);
      expect(stats.ratingDistribution[2]).toBe(0);
      expect(stats.ratingDistribution[3]).toBe(0);
      expect(stats.ratingDistribution[4]).toBe(0);
      expect(stats.ratingDistribution[5]).toBe(0);
    });

    it('should only count approved reviews in statistics', async () => {
      const stats = await reviewService.getCourseReviewStats(testCourseId);

      // Should not count the unapproved 5-star review in average
      expect(stats.approvedReviews).toBe(7);
      expect(stats.totalReviews).toBe(8);
    });
  });

  // ==================== Helper Methods Tests ====================

  describe('canUserReviewCourse', () => {
    it('should return true if user purchased the course', async () => {
      const canReview = await reviewService.canUserReviewCourse(testUserId, testCourseId);

      expect(canReview).toBe(true);
    });

    it('should return false if user has not purchased the course', async () => {
      const canReview = await reviewService.canUserReviewCourse(testUserId, testCourse2Id);

      expect(canReview).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const canReview = await reviewService.canUserReviewCourse(
        '00000000-0000-0000-0000-000000000000',
        testCourseId
      );

      expect(canReview).toBe(false);
    });
  });

  describe('getUserReviewForCourse', () => {
    beforeEach(async () => {
      const review = await reviewService.createReview({
        userId: testUserId,
        courseId: testCourseId,
        rating: 4,
        comment: 'User review'
      });
      testReviewId = review.id;
    });

    it('should return existing review if user has reviewed course', async () => {
      const review = await reviewService.getUserReviewForCourse(testUserId, testCourseId);

      expect(review).not.toBeNull();
      expect(review?.userId).toBe(testUserId);
      expect(review?.courseId).toBe(testCourseId);
      expect(review?.rating).toBe(4);
    });

    it('should return null if user has not reviewed course', async () => {
      const review = await reviewService.getUserReviewForCourse(testUserId, testCourse2Id);

      expect(review).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const review = await reviewService.getUserReviewForCourse(
        '00000000-0000-0000-0000-000000000000',
        testCourseId
      );

      expect(review).toBeNull();
    });
  });

  describe('getPendingReviewsCount', () => {
    it('should return correct count of pending reviews', async () => {
      const hashedPassword = await hashPassword('password123');

      // Create 3 unapproved reviews with different users
      for (let i = 0; i < 3; i++) {
        const userResult = await pool.query(
          `INSERT INTO users (email, password_hash, name, role)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [`testuser-pending-${i}@review.test`, hashedPassword, `Pending User ${i}`, 'user']
        );
        const userId = userResult.rows[0].id;

        // Create order
        const orderResult = await pool.query(
          `INSERT INTO orders (user_id, total_amount, currency, status)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [userId, 99.99, 'USD', 'completed']
        );

        await pool.query(
          `INSERT INTO order_items (order_id, course_id, item_type, title, price, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderResult.rows[0].id, testCourseId, 'course', 'Test Course 1', 99.99, 1]
        );

        await pool.query(
          `INSERT INTO reviews (user_id, course_id, rating, is_approved)
           VALUES ($1, $2, $3, $4)`,
          [userId, testCourseId, 4, false]
        );
      }

      // Create 2 approved reviews with different users
      for (let i = 0; i < 2; i++) {
        const userResult = await pool.query(
          `INSERT INTO users (email, password_hash, name, role)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [`testuser-approved-${i}@review.test`, hashedPassword, `Approved User ${i}`, 'user']
        );
        const userId = userResult.rows[0].id;

        // Create order
        const orderResult = await pool.query(
          `INSERT INTO orders (user_id, total_amount, currency, status)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [userId, 99.99, 'USD', 'completed']
        );

        await pool.query(
          `INSERT INTO order_items (order_id, course_id, item_type, title, price, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderResult.rows[0].id, testCourseId, 'course', 'Test Course 1', 99.99, 1]
        );

        await pool.query(
          `INSERT INTO reviews (user_id, course_id, rating, is_approved)
           VALUES ($1, $2, $3, $4)`,
          [userId, testCourseId, 5, true]
        );
      }

      const count = await reviewService.getPendingReviewsCount();

      expect(count).toBe(3);
    });

    it('should return zero when no pending reviews', async () => {
      // Create only approved reviews
      await pool.query(
        `INSERT INTO reviews (user_id, course_id, rating, is_approved)
         VALUES ($1, $2, $3, $4)`,
        [testUserId, testCourseId, 5, true]
      );

      const count = await reviewService.getPendingReviewsCount();

      expect(count).toBe(0);
    });
  });

  // ==================== Factory Function Test ====================

  describe('createReviewService', () => {
    it('should create a new ReviewService instance', () => {
      const service = createReviewService(pool);

      expect(service).toBeInstanceOf(ReviewService);
    });

    it('should use provided pool', async () => {
      const service = createReviewService(pool);

      const canReview = await service.canUserReviewCourse(testUserId, testCourseId);

      expect(canReview).toBe(true);
    });
  });
});
