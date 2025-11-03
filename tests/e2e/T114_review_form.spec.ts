/**
 * T114: E2E Tests for Review Submission Form
 *
 * Tests the review form functionality on course detail pages:
 * - Form visibility for authenticated/unauthenticated users
 * - Form visibility for users who have/haven't purchased
 * - Star rating selection
 * - Review submission
 * - Validation and error handling
 * - Existing review display
 */

import { test, expect, type Page } from '@playwright/test';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'spirituality_platform',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
});

// Test data
const testCourseSlug = 'quantum-manifestation-mastery';
const testCourseId = '1'; // Mock course ID

// Helper to generate unique test user
const generateTestUser = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    name: `Test User ${timestamp}`,
    email: `test.review.${timestamp}.${random}@example.com`,
    password: 'TestPassword123!',
  };
};

// Helper to register and login a user
async function registerAndLogin(page: Page, user: { name: string; email: string; password: string }) {
  // Register
  await page.goto('/register');
  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirm_password"]', user.password);
  await page.check('input[name="terms"]');
  await Promise.all([
    page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);

  // If redirected to login, login
  if (page.url().includes('/login')) {
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await Promise.all([
      page.waitForURL('/dashboard', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);
  }
}

// Helper to get user ID from database
async function getUserId(email: string): Promise<string | null> {
  const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// Helper to create a completed order for a user
async function createCompletedOrder(userId: string, courseId: string): Promise<void> {
  // Create order
  const orderResult = await pool.query(
    `INSERT INTO orders (user_id, total_amount, currency, status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, 199.00, 'USD', 'completed']
  );
  const orderId = orderResult.rows[0].id;

  // Create order item
  await pool.query(
    `INSERT INTO order_items (order_id, course_id, item_type, title, price, quantity)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [orderId, courseId, 'course', 'Quantum Manifestation Mastery', 199.00, 1]
  );
}

// Helper to cleanup test data
async function cleanupTestUser(email: string): Promise<void> {
  const userId = await getUserId(email);
  if (userId) {
    // Delete reviews
    await pool.query('DELETE FROM reviews WHERE user_id = $1', [userId]);
    // Delete order items and orders
    await pool.query(
      'DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)',
      [userId]
    );
    await pool.query('DELETE FROM orders WHERE user_id = $1', [userId]);
    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }
}

test.describe('Review Form - Visibility and Access Control', () => {
  test('should show login prompt for unauthenticated users', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Should see login prompt
    await expect(page.locator('text=Please log in to write a review')).toBeVisible();
    // Use more specific locator - the login link within the review form section
    await expect(page.locator('.bg-blue-50 a[href="/login"]')).toBeVisible();

    // Should NOT see the form
    await expect(page.locator('#review-form')).not.toBeVisible();
  });

  test('should show purchase required message for non-purchasers', async ({ page }) => {
    const user = generateTestUser();

    try {
      // Register and login
      await registerAndLogin(page, user);

      // Navigate to course page
      await page.goto(`/courses/${testCourseSlug}`);

      // Should see purchase required message
      await expect(page.locator('text=You must purchase this course before you can write a review')).toBeVisible();

      // Should NOT see the form
      await expect(page.locator('#review-form')).not.toBeVisible();
    } finally {
      await cleanupTestUser(user.email);
    }
  });

  test('should show review form for users who purchased', async ({ page }) => {
    const user = generateTestUser();

    try {
      // Register and login
      await registerAndLogin(page, user);
      const userId = await getUserId(user.email);
      expect(userId).not.toBeNull();

      // Create completed order
      await createCompletedOrder(userId!, testCourseId);

      // Navigate to course page
      await page.goto(`/courses/${testCourseSlug}`);

      // Should see the review form
      await expect(page.locator('#review-form')).toBeVisible();
      await expect(page.locator('#star-rating')).toBeVisible();
      await expect(page.locator('#comment')).toBeVisible();
      await expect(page.locator('#submit-button')).toBeVisible();
    } finally {
      await cleanupTestUser(user.email);
    }
  });

  test('should show existing review instead of form', async ({ page }) => {
    const user = generateTestUser();

    try {
      // Register and login
      await registerAndLogin(page, user);
      const userId = await getUserId(user.email);
      expect(userId).not.toBeNull();

      // Create completed order
      await createCompletedOrder(userId!, testCourseId);

      // Create existing review
      await pool.query(
        `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, testCourseId, 5, 'Great course!', false]
      );

      // Navigate to course page
      await page.goto(`/courses/${testCourseSlug}`);

      // Should see existing review message
      await expect(page.locator('text=You have already reviewed this course')).toBeVisible();
      await expect(page.locator('text=Great course!')).toBeVisible();

      // Should NOT see the form
      await expect(page.locator('#review-form')).not.toBeVisible();
    } finally {
      await cleanupTestUser(user.email);
    }
  });
});

test.describe('Review Form - Star Rating Interaction', () => {
  let user: { name: string; email: string; password: string };
  let userId: string | null;

  test.beforeEach(async ({ page }) => {
    user = generateTestUser();
    await registerAndLogin(page, user);
    userId = await getUserId(user.email);
    expect(userId).not.toBeNull();
    await createCompletedOrder(userId!, testCourseId);
    await page.goto(`/courses/${testCourseSlug}`);
  });

  test.afterEach(async () => {
    await cleanupTestUser(user.email);
  });

  test('should highlight stars on hover', async ({ page }) => {
    const starButtons = page.locator('.star-button');

    // Hover over 3rd star
    await starButtons.nth(2).hover();

    // First 3 stars should be yellow, rest should be gray
    for (let i = 0; i < 5; i++) {
      const svg = starButtons.nth(i).locator('svg');
      if (i < 3) {
        await expect(svg).toHaveClass(/text-yellow-400/);
      } else {
        await expect(svg).toHaveClass(/text-gray-300/);
      }
    }
  });

  test('should select rating on click', async ({ page }) => {
    const starButtons = page.locator('.star-button');
    const ratingText = page.locator('#rating-text');

    // Click 4th star
    await starButtons.nth(3).click();

    // Should show rating text
    await expect(ratingText).toContainText('Very Good');

    // Hidden input should have value 4
    const ratingInput = page.locator('#rating-input');
    await expect(ratingInput).toHaveValue('4');
  });

  test('should show correct rating labels', async ({ page }) => {
    const starButtons = page.locator('.star-button');
    const ratingText = page.locator('#rating-text');
    const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

    for (let i = 0; i < 5; i++) {
      await starButtons.nth(i).click();
      await expect(ratingText).toContainText(labels[i]);
    }
  });
});

test.describe('Review Form - Submission', () => {
  let user: { name: string; email: string; password: string };
  let userId: string | null;

  test.beforeEach(async ({ page }) => {
    user = generateTestUser();
    await registerAndLogin(page, user);
    userId = await getUserId(user.email);
    expect(userId).not.toBeNull();
    await createCompletedOrder(userId!, testCourseId);
    await page.goto(`/courses/${testCourseSlug}`);
  });

  test.afterEach(async () => {
    await cleanupTestUser(user.email);
  });

  test('should require rating before submission', async ({ page }) => {
    // Try to submit without rating
    await page.click('#submit-button');

    // Should show error
    await expect(page.locator('#rating-error')).toBeVisible();
  });

  test('should submit review with rating only', async ({ page }) => {
    // Select 5 stars
    await page.locator('.star-button').nth(4).click();

    // Submit form
    await page.click('#submit-button');

    // Should show loading state
    await expect(page.locator('#submit-loading')).toBeVisible();

    // Should show success message
    await expect(page.locator('#form-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Thank you for your review!')).toBeVisible();

    // Verify review in database
    const reviewResult = await pool.query(
      'SELECT * FROM reviews WHERE user_id = $1 AND course_id = $2',
      [userId, testCourseId]
    );
    expect(reviewResult.rows.length).toBe(1);
    expect(reviewResult.rows[0].rating).toBe(5);
    expect(reviewResult.rows[0].comment).toBeNull();
    expect(reviewResult.rows[0].is_approved).toBe(false);
  });

  test('should submit review with rating and comment', async ({ page }) => {
    const testComment = 'This is an excellent course! Highly recommended.';

    // Select 5 stars
    await page.locator('.star-button').nth(4).click();

    // Fill comment
    await page.fill('#comment', testComment);

    // Verify character count updates
    await expect(page.locator('#char-count')).toContainText(`${testComment.length} / 1000`);

    // Submit form
    await page.click('#submit-button');

    // Should show success message
    await expect(page.locator('#form-success')).toBeVisible({ timeout: 10000 });

    // Verify review in database
    const reviewResult = await pool.query(
      'SELECT * FROM reviews WHERE user_id = $1 AND course_id = $2',
      [userId, testCourseId]
    );
    expect(reviewResult.rows.length).toBe(1);
    expect(reviewResult.rows[0].rating).toBe(5);
    expect(reviewResult.rows[0].comment).toBe(testComment);
  });

  test('should enforce comment length limit', async ({ page }) => {
    const longComment = 'a'.repeat(1001);

    // Select 5 stars
    await page.locator('.star-button').nth(4).click();

    // Try to fill long comment (should be truncated by maxlength)
    await page.fill('#comment', longComment);

    // Textarea should only have 1000 characters
    const textareaValue = await page.locator('#comment').inputValue();
    expect(textareaValue.length).toBe(1000);
  });

  test('should show character count warning when approaching limit', async ({ page }) => {
    const comment = 'a'.repeat(950);

    await page.fill('#comment', comment);

    // Character count should turn red
    const charCount = page.locator('#char-count');
    await expect(charCount).toHaveClass(/text-red-500/);
  });

  test('should reload page after successful submission', async ({ page }) => {
    // Select 5 stars
    await page.locator('.star-button').nth(4).click();

    // Submit form
    await page.click('#submit-button');

    // Wait for page reload (with increased timeout)
    await page.waitForURL(`/courses/${testCourseSlug}`, { timeout: 15000 });

    // After reload, should see existing review message
    await expect(page.locator('text=You have already reviewed this course')).toBeVisible();
  });
});

test.describe('Review Form - Error Handling', () => {
  let user: { name: string; email: string; password: string };
  let userId: string | null;

  test.beforeEach(async ({ page }) => {
    user = generateTestUser();
    await registerAndLogin(page, user);
    userId = await getUserId(user.email);
    expect(userId).not.toBeNull();
    await createCompletedOrder(userId!, testCourseId);
    await page.goto(`/courses/${testCourseSlug}`);
  });

  test.afterEach(async () => {
    await cleanupTestUser(user.email);
  });

  test('should handle duplicate review submission gracefully', async ({ page }) => {
    // Submit first review directly to DB
    await pool.query(
      `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, testCourseId, 5, 'First review', false]
    );

    // Reload page - should now show existing review
    await page.reload();
    await expect(page.locator('text=You have already reviewed this course')).toBeVisible();
  });
});

// Cleanup after all tests
test.afterAll(async () => {
  await pool.end();
});
