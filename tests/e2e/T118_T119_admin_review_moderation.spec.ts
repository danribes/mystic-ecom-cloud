/**
 * E2E Tests for T118 & T119: Admin Review Moderation
 *
 * Tests the admin pending reviews page and approve/reject API endpoints.
 */

import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection pool
let pool: Pool;

test.beforeAll(async () => {
  pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'lms_db',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  });
});

test.afterAll(async () => {
  await pool.end();
});

// Helper: Create admin user
async function createAdminUser(): Promise<{ id: string; email: string; password: string }> {
  const bcrypt = await import('bcrypt');
  const email = 'admin-test@example.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if admin already exists
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    return { id: existing.rows[0].id, email, password };
  }

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [email, hashedPassword, 'Admin User', 'admin']
  );

  return { id: result.rows[0].id, email, password };
}

// Helper: Create regular user
async function createUser(email: string, name: string): Promise<string> {
  const bcrypt = await import('bcrypt');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [email, hashedPassword, name, 'user']
  );

  return result.rows[0].id;
}

// Helper: Create pending review
async function createPendingReview(
  userId: string,
  courseId: string,
  rating: number,
  comment: string
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, courseId, rating, comment, false]
  );

  return result.rows[0].id;
}

// Helper: Cleanup test data
async function cleanupTestData(): Promise<void> {
  await pool.query(`DELETE FROM reviews WHERE course_id = 'test-admin-course'`);
  await pool.query(`DELETE FROM users WHERE email LIKE 'test-admin-reviewer-%'`);
}

// Helper: Login as admin
async function loginAsAdmin(page: any, admin: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"]', admin.email);
  await page.fill('input[name="password"]', admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);
}

test.describe('Admin Pending Reviews Page - T118', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should require admin authentication', async ({ page }) => {
    // Try to access without login
    await page.goto('/admin/reviews/pending');

    // Should redirect to login
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('should display pending reviews list for admin', async ({ page }) => {
    const admin = await createAdminUser();
    const user = await createUser('test-admin-reviewer-1@example.com', 'Test Reviewer');

    // Create pending reviews
    await createPendingReview(user, 'test-admin-course', 5, 'Great course!');
    await createPendingReview(user, 'test-admin-course', 4, 'Very good.');

    // Login as admin
    await loginAsAdmin(page, admin);

    // Navigate to pending reviews
    await page.goto('/admin/reviews/pending');

    // Should see page title
    await expect(page.locator('h1')).toContainText('Pending Reviews');

    // Should see review cards
    const reviewCards = page.locator('[data-review-id]');
    await expect(reviewCards).toHaveCount(2, { timeout: 10000 });
  });

  test('should display empty state when no pending reviews', async ({ page }) => {
    const admin = await createAdminUser();

    await loginAsAdmin(page, admin);
    await page.goto('/admin/reviews/pending');

    // Should see empty state
    await expect(page.locator('text=No Pending Reviews')).toBeVisible({ timeout: 10000 });
  });

  test('should display review details correctly', async ({ page }) => {
    const admin = await createAdminUser();
    const user = await createUser('test-admin-reviewer-2@example.com', 'John Doe');

    await createPendingReview(user, 'test-admin-course', 5, 'Excellent course! Highly recommended.');

    await loginAsAdmin(page, admin);
    await page.goto('/admin/reviews/pending');

    // Check review content
    await expect(page.locator('text=Excellent course! Highly recommended.')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();

    // Check rating stars (5 stars)
    const stars = page.locator('svg.text-yellow-400');
    await expect(stars).toHaveCount(5);
  });

  test('should show verified purchase badge', async ({ page }) => {
    const admin = await createAdminUser();
    const user = await createUser('test-admin-reviewer-3@example.com', 'Jane Smith');

    // Create order for verified purchase
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, total, status, payment_method)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [user, 99.99, 'completed', 'card']
    );

    await pool.query(
      `INSERT INTO order_items (order_id, item_type, item_id, quantity, price)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderResult.rows[0].id, 'course', 'test-admin-course', 1, 99.99]
    );

    await createPendingReview(user, 'test-admin-course', 5, 'Verified purchase review');

    await loginAsAdmin(page, admin);
    await page.goto('/admin/reviews/pending');

    // Should show verified purchase badge
    await expect(page.locator('text=Verified Purchase')).toBeVisible({ timeout: 10000 });

    // Cleanup order
    await pool.query(`DELETE FROM order_items WHERE order_id = $1`, [orderResult.rows[0].id]);
    await pool.query(`DELETE FROM orders WHERE id = $1`, [orderResult.rows[0].id]);
  });

  test('should filter by rating', async ({ page }) => {
    const admin = await createAdminUser();
    const user = await createUser('test-admin-reviewer-4@example.com', 'Reviewer');

    await createPendingReview(user, 'test-admin-course', 5, 'Five stars');
    await createPendingReview(user, 'test-admin-course', 3, 'Three stars');

    await loginAsAdmin(page, admin);
    await page.goto('/admin/reviews/pending');

    // Select minRating filter
    await page.selectOption('select[name="minRating"]', '5');

    // Should only show 5-star review
    await expect(page.locator('text=Five stars')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Three stars')).not.toBeVisible();
  });

  test('should sort reviews', async ({ page }) => {
    const admin = await createAdminUser();
    const user = await createUser('test-admin-reviewer-5@example.com', 'Reviewer');

    await createPendingReview(user, 'test-admin-course', 5, 'First review');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await createPendingReview(user, 'test-admin-course', 3, 'Second review');

    await loginAsAdmin(page, admin);
    await page.goto('/admin/reviews/pending');

    // Default sort is newest first
    const firstReview = page.locator('[data-review-id]').first();
    await expect(firstReview).toContainText('Second review');

    // Change to oldest first
    await page.selectOption('select[name="sortOrder"]', 'ASC');

    // Now first review should be "First review"
    const firstReviewAfterSort = page.locator('[data-review-id]').first();
    await expect(firstReviewAfterSort).toContainText('First review', { timeout: 10000 });
  });
});

test.describe('Approve/Reject API Endpoints - T119', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should approve review via API', async ({ page }) => {
    const admin = await createAdminUser();
    const user = await createUser('test-admin-reviewer-6@example.com', 'Reviewer');

    const reviewId = await createPendingReview(user, 'test-admin-course', 5, 'Test review');

    await loginAsAdmin(page, admin);
    await page.goto('/admin/reviews/pending');

    // Click approve button
    const approveBtn = page.locator(`button.approve-btn[data-review-id="${reviewId}"]`);
    await approveBtn.click();

    // Confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Should show success toast
    await expect(page.locator('text=/approved successfully/i')).toBeVisible({ timeout: 5000 });

    // Verify in database
    const result = await pool.query('SELECT is_approved FROM reviews WHERE id = $1', [reviewId]);
    expect(result.rows[0].is_approved).toBe(true);
  });

  test('should reject review via API', async ({ page }) => {
    const admin = await createAdminUser();
    const user = await createUser('test-admin-reviewer-7@example.com', 'Reviewer');

    const reviewId = await createPendingReview(user, 'test-admin-course', 2, 'Test review');

    await loginAsAdmin(page, admin);
    await page.goto('/admin/reviews/pending');

    // Click reject button
    const rejectBtn = page.locator(`button.reject-btn[data-review-id="${reviewId}"]`);
    await rejectBtn.click();

    // Confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Should show success toast
    await expect(page.locator('text=/rejected successfully/i')).toBeVisible({ timeout: 5000 });

    // Verify in database - review should still exist but not approved
    const result = await pool.query('SELECT is_approved FROM reviews WHERE id = $1', [reviewId]);
    expect(result.rows[0].is_approved).toBe(false);
  });

  test('should require admin role for approve API', async ({ page, request }) => {
    const user = await createUser('test-admin-reviewer-8@example.com', 'Regular User');
    const reviewId = await createPendingReview(user, 'test-admin-course', 5, 'Test');

    // Try to approve as non-admin (should fail)
    const response = await request.put('/api/admin/reviews/approve', {
      data: { reviewId },
    });

    expect(response.status()).toBe(403);
  });

  test('should require admin role for reject API', async ({ page, request }) => {
    const user = await createUser('test-admin-reviewer-9@example.com', 'Regular User');
    const reviewId = await createPendingReview(user, 'test-admin-course', 5, 'Test');

    // Try to reject as non-admin (should fail)
    const response = await request.put('/api/admin/reviews/reject', {
      data: { reviewId },
    });

    expect(response.status()).toBe(403);
  });

  test('should handle invalid review ID', async ({ page, request }) => {
    const admin = await createAdminUser();

    // Login as admin first (to get session cookie)
    await loginAsAdmin(page, admin);

    // Try to approve non-existent review
    const response = await request.put('/api/admin/reviews/approve', {
      data: { reviewId: 'invalid-id-12345' },
    });

    expect(response.status()).toBe(404);
  });

  test('should validate request body', async ({ page, request }) => {
    const admin = await createAdminUser();
    await loginAsAdmin(page, admin);

    // Try to approve without reviewId
    const response = await request.put('/api/admin/reviews/approve', {
      data: {},
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Integration - Review Moderation Workflow', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('complete workflow: submit -> approve -> visible on course page', async ({ page }) => {
    const admin = await createAdminUser();
    const user = await createUser('test-admin-reviewer-10@example.com', 'Test User');

    // Create pending review
    const reviewId = await createPendingReview(user, 'test-admin-course', 5, 'Amazing course!');

    // Admin approves review
    await loginAsAdmin(page, admin);
    await page.goto('/admin/reviews/pending');

    const approveBtn = page.locator(`button.approve-btn[data-review-id="${reviewId}"]`);
    await approveBtn.click();

    page.on('dialog', (dialog) => dialog.accept());

    await expect(page.locator('text=/approved successfully/i')).toBeVisible({ timeout: 5000 });

    // Now check if review is visible on course page
    await page.goto(`/courses/test-admin-course`);

    // Should see the approved review
    await expect(page.locator('text=Amazing course!')).toBeVisible({ timeout: 10000 });
  });

  test('rejected reviews should not appear on course page', async ({ page }) => {
    const admin = await createAdminUser();
    const user = await createUser('test-admin-reviewer-11@example.com', 'Test User');

    const reviewId = await createPendingReview(user, 'test-admin-course', 1, 'Bad course');

    // Admin rejects review
    await loginAsAdmin(page, admin);
    await page.goto('/admin/reviews/pending');

    const rejectBtn = page.locator(`button.reject-btn[data-review-id="${reviewId}"]`);
    await rejectBtn.click();

    page.on('dialog', (dialog) => dialog.accept());

    await expect(page.locator('text=/rejected successfully/i')).toBeVisible({ timeout: 5000 });

    // Check course page - review should NOT be visible
    await page.goto(`/courses/test-admin-course`);

    await expect(page.locator('text=Bad course')).not.toBeVisible();
  });
});

test.describe('Pagination', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should paginate when more than 20 reviews', async ({ page }) => {
    const admin = await createAdminUser();
    const user = await createUser('test-admin-reviewer-12@example.com', 'Reviewer');

    // Create 25 pending reviews
    for (let i = 1; i <= 25; i++) {
      await createPendingReview(user, 'test-admin-course', 5, `Review ${i}`);
    }

    await loginAsAdmin(page, admin);
    await page.goto('/admin/reviews/pending');

    // Should show 20 reviews on page 1
    const reviewCards = page.locator('[data-review-id]');
    await expect(reviewCards).toHaveCount(20, { timeout: 10000 });

    // Should have pagination controls
    await expect(page.locator('text=Next')).toBeVisible();

    // Go to page 2
    await page.click('text=Next');

    // Should show remaining 5 reviews
    const reviewCardsPage2 = page.locator('[data-review-id]');
    await expect(reviewCardsPage2).toHaveCount(5, { timeout: 10000 });
  });
});
