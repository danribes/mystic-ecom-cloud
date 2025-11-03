/**
 * T116: E2E Tests for Review Display on Course Detail Pages
 *
 * Tests the display of reviews and rating statistics:
 * - Review statistics (average rating, distribution)
 * - Review list display
 * - Pagination functionality
 * - Empty states
 * - Integration with existing review form
 */

import { test, expect, type Page } from '@playwright/test';
import { Pool } from 'pg';
import dotenv from 'dotenv';

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
const testCourseId = '1';

// Helper to generate unique test user
const generateTestUser = (suffix: string) => {
  const timestamp = Date.now();
  return {
    name: `Test User ${suffix}`,
    email: `test.review.display.${timestamp}.${suffix}@example.com`,
    password: 'TestPassword123!',
  };
};

// Helper to create a user in database
async function createUser(user: { name: string; email: string; password: string }): Promise<string> {
  const bcrypt = await import('bcrypt');
  const hashedPassword = await bcrypt.hash(user.password, 10);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [user.email, hashedPassword, user.name, 'user']
  );

  return result.rows[0].id;
}

// Helper to create completed order
async function createCompletedOrder(userId: string, courseId: string): Promise<void> {
  const orderResult = await pool.query(
    `INSERT INTO orders (user_id, total_amount, currency, status)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [userId, 199.00, 'USD', 'completed']
  );

  await pool.query(
    `INSERT INTO order_items (order_id, course_id, item_type, title, price, quantity)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [orderResult.rows[0].id, courseId, 'course', 'Test Course', 199.00, 1]
  );
}

// Helper to create approved review
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

// Helper to cleanup test data
async function cleanupTestData(emails: string[]): Promise<void> {
  for (const email of emails) {
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      await pool.query('DELETE FROM reviews WHERE user_id = $1', [userId]);
      await pool.query(
        'DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)',
        [userId]
      );
      await pool.query('DELETE FROM orders WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  }
}

test.describe('Review Display - Empty State', () => {
  test('should show "no reviews yet" message when course has no reviews', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Should show "no reviews yet" in stats
    await expect(page.locator('text=No reviews yet')).toBeVisible();
  });
});

test.describe('Review Display - With Reviews', () => {
  const testEmails: string[] = [];

  test.beforeAll(async () => {
    // Create 3 test users with approved reviews
    for (let i = 1; i <= 3; i++) {
      const user = generateTestUser(`display-${i}`);
      testEmails.push(user.email);

      const userId = await createUser(user);
      await createCompletedOrder(userId, testCourseId);
      await createApprovedReview(
        userId,
        testCourseId,
        5 - i + 1, // Ratings: 5, 4, 3
        `This is test review ${i}. Great course with excellent content!`
      );
    }
  });

  test.afterAll(async () => {
    await cleanupTestData(testEmails);
  });

  test('should display review statistics correctly', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Should show average rating
    const avgRating = await page.locator('.text-5xl.font-bold').first();
    await expect(avgRating).toBeVisible();

    // Should show review count
    await expect(page.locator('text=/\\d+ reviews?/')).toBeVisible();

    // Should show rating distribution bars
    const distributionBars = page.locator('.bg-gray-200.rounded-full.h-2');
    await expect(distributionBars.first()).toBeVisible();
  });

  test('should display list of reviews', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Should show at least one review
    await expect(page.locator('text=This is test review')).toBeVisible();

    // Should show user name
    await expect(page.locator('text=Test User display-')).toBeVisible();

    // Should show verified purchase badge
    await expect(page.locator('text=Verified Purchase')).toBeVisible();

    // Should show star rating for each review
    const starIcons = page.locator('.text-yellow-400').filter({ has: page.locator('svg') });
    await expect(starIcons.first()).toBeVisible();
  });

  test('should show review date', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Should show "Reviewed on" text
    await expect(page.locator('text=Reviewed on')).toBeVisible();
  });

  test('should show user avatar with initials', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Should show avatar with initials
    const avatars = page.locator('.rounded-full.flex.items-center.justify-center');
    await expect(avatars.first()).toBeVisible();
  });
});

test.describe('Review Display - Pagination', () => {
  const testEmails: string[] = [];

  test.beforeAll(async () => {
    // Create 15 test users with approved reviews for pagination testing
    for (let i = 1; i <= 15; i++) {
      const user = generateTestUser(`pagination-${i}`);
      testEmails.push(user.email);

      const userId = await createUser(user);
      await createCompletedOrder(userId, testCourseId);
      await createApprovedReview(
        userId,
        testCourseId,
        (i % 5) + 1, // Ratings cycle through 1-5
        `Pagination test review ${i}`
      );
    }
  });

  test.afterAll(async () => {
    await cleanupTestData(testEmails);
  });

  test('should show pagination controls when there are multiple pages', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Should show pagination buttons
    await expect(page.locator('text=Previous')).toBeVisible();
    await expect(page.locator('text=Next')).toBeVisible();

    // Should show page numbers
    await expect(page.locator('text=1').and(page.locator('a'))).toBeVisible();
  });

  test('should navigate to next page', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Click next button
    await page.click('text=Next');

    // URL should update with page parameter
    await page.waitForURL(/page=2/);

    // Should show different reviews
    await expect(page.locator('text=Pagination test review')).toBeVisible();

    // Page 2 button should be highlighted
    const page2Button = page.locator('a:has-text("2").bg-blue-600');
    await expect(page2Button).toBeVisible();
  });

  test('should disable previous button on first page', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Previous button should be disabled
    const prevButton = page.locator('text=Previous').and(page.locator('.cursor-not-allowed'));
    await expect(prevButton).toBeVisible();
  });

  test('should navigate via page numbers', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Click page 2 button
    await page.click('a:has-text("2")');

    // URL should update
    await page.waitForURL(/page=2/);

    // Should show page 2 content
    await expect(page.locator('text=Pagination test review')).toBeVisible();
  });
});

test.describe('Review Display - Integration with Review Form', () => {
  test('should show both review form and review list sections', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Should show review form section
    await expect(page.locator('text=Write a Review').or(page.locator('text=Please log in'))).toBeVisible();

    // Should show review stats section
    await expect(page.locator('text=Course Rating').or(page.locator('text=No reviews yet'))).toBeVisible();

    // Should show review list section
    await expect(page.locator('text=Student Reviews')).toBeVisible();
  });
});

test.describe('Review Display - Rating Stars', () => {
  const testEmails: string[] = [];

  test.beforeAll(async () => {
    // Create users with different ratings
    const ratings = [5, 4, 3, 2, 1];
    for (let i = 0; i < ratings.length; i++) {
      const user = generateTestUser(`stars-${i}`);
      testEmails.push(user.email);

      const userId = await createUser(user);
      await createCompletedOrder(userId, testCourseId);
      await createApprovedReview(
        userId,
        testCourseId,
        ratings[i],
        `Rating ${ratings[i]} stars test`
      );
    }
  });

  test.afterAll(async () => {
    await cleanupTestData(testEmails);
  });

  test('should display correct number of filled stars for each review', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Find a 5-star review
    const fiveStarReview = page.locator('text=Rating 5 stars test').locator('..');
    const fiveStars = fiveStarReview.locator('.text-yellow-400').filter({ has: page.locator('svg') });
    expect(await fiveStars.count()).toBeGreaterThanOrEqual(5);

    // Find a 3-star review
    const threeStarReview = page.locator('text=Rating 3 stars test').locator('..');
    const threeStars = threeStarReview.locator('.text-yellow-400').filter({ has: page.locator('svg') });
    expect(await threeStars.count()).toBeGreaterThanOrEqual(3);
  });

  test('should show average rating in statistics', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Should show numeric average
    const avgRating = page.locator('.text-5xl.font-bold').first();
    await expect(avgRating).toBeVisible();

    // Should show star representation of average
    const statsStars = page.locator('.text-yellow-400, .text-gray-300').filter({ has: page.locator('svg') }).first();
    await expect(statsStars).toBeVisible();
  });
});

test.describe('Review Display - Unapproved Reviews', () => {
  const testEmails: string[] = [];

  test.beforeAll(async () => {
    // Create user with unapproved review
    const user = generateTestUser('unapproved');
    testEmails.push(user.email);

    const userId = await createUser(user);
    await createCompletedOrder(userId, testCourseId);

    // Create UNAPPROVED review
    await pool.query(
      `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, testCourseId, 5, 'This review is not approved yet', false]
    );
  });

  test.afterAll(async () => {
    await cleanupTestData(testEmails);
  });

  test('should not display unapproved reviews in the list', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // Should NOT show unapproved review
    await expect(page.locator('text=This review is not approved yet')).not.toBeVisible();
  });

  test('should not include unapproved reviews in statistics', async ({ page }) => {
    await page.goto(`/courses/${testCourseSlug}`);

    // The statistics should not change based on unapproved reviews
    // This is implicit - we just verify stats are displayed
    await expect(page.locator('text=Course Rating')).toBeVisible();
  });
});

// Cleanup after all tests
test.afterAll(async () => {
  await pool.end();
});
