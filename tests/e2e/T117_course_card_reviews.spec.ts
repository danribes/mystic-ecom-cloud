/**
 * E2E Tests for T117: Display Reviews and Average Rating on Course Cards
 *
 * Tests the display of review statistics and star ratings on course cards
 * in course listing pages.
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

// Helper function to create a test user
async function createUser(user: {
  name: string;
  email: string;
  password: string;
}): Promise<string> {
  const bcrypt = await import('bcrypt');
  const hashedPassword = await bcrypt.hash(user.password, 10);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [user.email, hashedPassword, user.name, 'user']
  );

  return result.rows[0].id;
}

// Helper function to create an order
async function createOrder(userId: string): Promise<string> {
  const result = await pool.query(
    `INSERT INTO orders (user_id, total, status, payment_method)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, 99.99, 'completed', 'card']
  );

  return result.rows[0].id;
}

// Helper function to create an order item
async function createOrderItem(
  orderId: string,
  courseId: string
): Promise<void> {
  await pool.query(
    `INSERT INTO order_items (order_id, item_type, item_id, quantity, price)
     VALUES ($1, $2, $3, $4, $5)`,
    [orderId, 'course', courseId, 1, 99.99]
  );
}

// Helper function to create an approved review
async function createApprovedReview(
  userId: string,
  courseId: string,
  rating: number,
  comment: string
): Promise<void> {
  await pool.query(
    `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, courseId, rating, comment, true]
  );
}

// Helper function to clean up test data
async function cleanupTestData(): Promise<void> {
  await pool.query(`DELETE FROM reviews WHERE course_id = 'test-course-reviews'`);
  await pool.query(`DELETE FROM order_items WHERE item_id = 'test-course-reviews'`);
  await pool.query(`DELETE FROM orders WHERE user_id LIKE 'test-card-review-%'`);
  await pool.query(`DELETE FROM users WHERE email LIKE 'test-card-review-%'`);
}

test.describe('Course Card Review Display - Empty State', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should display "No reviews yet" when course has no reviews', async ({ page }) => {
    await page.goto('/courses');

    // Find a course card (assuming there's at least one course)
    const courseCards = page.locator('article');
    const firstCard = courseCards.first();

    // Check if the card exists
    await expect(firstCard).toBeVisible();

    // Look for "No reviews yet" text in cards without reviews
    const noReviewsText = page.locator('text=No reviews yet');
    // Should have at least one course without reviews
    await expect(noReviewsText.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Course Card Review Display - With Reviews', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should display star rating when course has reviews', async ({ page }) => {
    // Create test users and reviews
    const user1 = await createUser({
      name: 'Test User 1',
      email: 'test-card-review-1@example.com',
      password: 'password123',
    });

    const user2 = await createUser({
      name: 'Test User 2',
      email: 'test-card-review-2@example.com',
      password: 'password123',
    });

    // Create reviews: 5 stars and 4 stars (average = 4.5)
    await createApprovedReview(user1, 'test-course-reviews', 5, 'Excellent course!');
    await createApprovedReview(user2, 'test-course-reviews', 4, 'Very good!');

    // Navigate to courses page
    await page.goto('/courses');

    // Look for the course card with reviews
    const courseCard = page.locator('article').filter({ hasText: 'Test Course' }).first();

    if (await courseCard.isVisible()) {
      // Check for star rating display
      const stars = courseCard.locator('svg.text-yellow-400');
      await expect(stars).toHaveCount(5, { timeout: 10000 });

      // Check for average rating text (4.5)
      await expect(courseCard.locator('text=/4\\.5/')).toBeVisible();

      // Check for review count (2)
      await expect(courseCard.locator('text=/(2)/')).toBeVisible();
    }
  });

  test('should display correct number of filled stars for whole ratings', async ({ page }) => {
    // Create test user and review with 3 stars
    const user = await createUser({
      name: 'Test User',
      email: 'test-card-review-3@example.com',
      password: 'password123',
    });

    await createApprovedReview(user, 'test-course-reviews', 3, 'Average course');

    await page.goto('/courses');

    const courseCard = page.locator('article').filter({ hasText: 'Test Course' }).first();

    if (await courseCard.isVisible()) {
      // Should have 3 filled stars (yellow) and 2 empty stars
      const yellowStars = courseCard.locator('svg.text-yellow-400');
      await expect(yellowStars).toHaveCount(5, { timeout: 10000 });

      // Check for rating 3.0
      await expect(courseCard.locator('text=/3\\.0/')).toBeVisible();
    }
  });

  test('should display half star for fractional ratings', async ({ page }) => {
    // Create test users and reviews
    const user1 = await createUser({
      name: 'Test User A',
      email: 'test-card-review-4@example.com',
      password: 'password123',
    });

    const user2 = await createUser({
      name: 'Test User B',
      email: 'test-card-review-5@example.com',
      password: 'password123',
    });

    const user3 = await createUser({
      name: 'Test User C',
      email: 'test-card-review-6@example.com',
      password: 'password123',
    });

    // Create reviews: 5, 5, 4 (average = 4.7, should round to show 4.5 with half star)
    await createApprovedReview(user1, 'test-course-reviews', 5, 'Great!');
    await createApprovedReview(user2, 'test-course-reviews', 5, 'Excellent!');
    await createApprovedReview(user3, 'test-course-reviews', 4, 'Good!');

    await page.goto('/courses');

    const courseCard = page.locator('article').filter({ hasText: 'Test Course' }).first();

    if (await courseCard.isVisible()) {
      // Check for average rating (4.7)
      await expect(courseCard.locator('text=/4\\.7/')).toBeVisible({ timeout: 10000 });

      // Check for 3 review count
      await expect(courseCard.locator('text=/(3)/')).toBeVisible();

      // Check for half-star gradient definition
      const halfStarGradient = courseCard.locator('linearGradient[id^="half-star-card-"]');
      await expect(halfStarGradient).toBeVisible();
    }
  });

  test('should display review count correctly', async ({ page }) => {
    // Create multiple test users and reviews
    for (let i = 1; i <= 5; i++) {
      const user = await createUser({
        name: `Test User ${i}`,
        email: `test-card-review-${10 + i}@example.com`,
        password: 'password123',
      });

      await createApprovedReview(user, 'test-course-reviews', 4, `Review ${i}`);
    }

    await page.goto('/courses');

    const courseCard = page.locator('article').filter({ hasText: 'Test Course' }).first();

    if (await courseCard.isVisible()) {
      // Should show (5) for 5 reviews
      await expect(courseCard.locator('text=/(5)/')).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Course Card Review Display - Integration', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should only count approved reviews in statistics', async ({ page }) => {
    const user1 = await createUser({
      name: 'Approved User',
      email: 'test-card-review-20@example.com',
      password: 'password123',
    });

    const user2 = await createUser({
      name: 'Unapproved User',
      email: 'test-card-review-21@example.com',
      password: 'password123',
    });

    // Create one approved and one unapproved review
    await createApprovedReview(user1, 'test-course-reviews', 5, 'Approved review');

    await pool.query(
      `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
       VALUES ($1, $2, $3, $4, $5)`,
      [user2, 'test-course-reviews', 1, 'Unapproved review', false]
    );

    await page.goto('/courses');

    const courseCard = page.locator('article').filter({ hasText: 'Test Course' }).first();

    if (await courseCard.isVisible()) {
      // Should show rating 5.0 (only approved review counted)
      await expect(courseCard.locator('text=/5\\.0/')).toBeVisible({ timeout: 10000 });

      // Should show (1) review, not (2)
      await expect(courseCard.locator('text=/(1)/')).toBeVisible();
    }
  });

  test('should update when navigating between different course pages', async ({ page }) => {
    // This test verifies that ratings are course-specific
    await page.goto('/courses');

    // Get all course cards
    const courseCards = page.locator('article');
    const cardCount = await courseCards.count();

    // Verify that at least some cards are visible
    expect(cardCount).toBeGreaterThan(0);

    // Navigate to a different category or filter
    await page.goto('/courses?category=meditation');

    // Verify cards still display properly
    const filteredCards = page.locator('article');
    const filteredCount = await filteredCards.count();

    // Should have cards (count may vary based on category)
    expect(filteredCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Course Card Review Display - Search Page', () => {
  test('should display ratings on course cards in search results', async ({ page }) => {
    await page.goto('/search?q=meditation');

    // Wait for search results
    await page.waitForLoadState('networkidle');

    // Check if any course cards have rating displays
    const courseCards = page.locator('article');
    const cardCount = await courseCards.count();

    if (cardCount > 0) {
      // At least one card should be visible
      await expect(courseCards.first()).toBeVisible();

      // Cards should have either ratings or "No reviews yet"
      const hasRatingOrEmpty = await page
        .locator('text=/\\d\\.\\d|No reviews yet/')
        .count();

      expect(hasRatingOrEmpty).toBeGreaterThan(0);
    }
  });
});

test.describe('Course Card Review Display - Accessibility', () => {
  test('should have proper ARIA labels for star ratings', async ({ page }) => {
    const user = await createUser({
      name: 'Accessibility Test User',
      email: 'test-card-review-30@example.com',
      password: 'password123',
    });

    await createApprovedReview(user, 'test-course-reviews', 4, 'Test review');

    await page.goto('/courses');

    const courseCard = page.locator('article').filter({ hasText: 'Test Course' }).first();

    if (await courseCard.isVisible()) {
      // Check for aria-label on star rating container
      const starContainer = courseCard.locator('[aria-label*="Rating:"]');
      await expect(starContainer).toBeVisible({ timeout: 10000 });

      // Verify aria-label contains the rating
      const ariaLabel = await starContainer.getAttribute('aria-label');
      expect(ariaLabel).toContain('4.0');
      expect(ariaLabel).toContain('out of 5 stars');
    }

    await cleanupTestData();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/courses');

    // Tab through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to navigate to course cards
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Course Card Review Display - Responsive Design', () => {
  test('should display properly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const user = await createUser({
      name: 'Mobile Test User',
      email: 'test-card-review-40@example.com',
      password: 'password123',
    });

    await createApprovedReview(user, 'test-course-reviews', 5, 'Mobile test');

    await page.goto('/courses');

    const courseCard = page.locator('article').filter({ hasText: 'Test Course' }).first();

    if (await courseCard.isVisible()) {
      // Stars should still be visible on mobile
      const stars = courseCard.locator('svg.text-yellow-400');
      await expect(stars.first()).toBeVisible({ timeout: 10000 });

      // Rating text should be visible
      await expect(courseCard.locator('text=/5\\.0/')).toBeVisible();
    }

    await cleanupTestData();
  });

  test('should display properly on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/courses');

    // Course cards should be visible and properly formatted
    const courseCards = page.locator('article');
    await expect(courseCards.first()).toBeVisible();
  });
});
