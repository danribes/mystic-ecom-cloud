import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { pool } from '../setup/database';

/**
 * E2E Tests for Digital Product Purchase Flow
 * Tests the complete user journey of discovering, purchasing, and downloading digital products
 * 
 * IMPORTANT: Run with specific path to avoid vitest/Playwright conflicts:
 *   ✅ npx playwright test tests/e2e/T091
 *   ✅ npx playwright test tests/e2e/T091_product-purchase.spec.ts
 * 
 * This test covers:
 * - Digital products catalog browsing
 * - Product search and filtering (by type, price)
 * - Product detail viewing
 * - Product purchase flow
 * - Immediate download link generation
 * - Re-download from user dashboard
 * - Download tracking and limits
 */

interface TestUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
}

interface TestProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  product_type: 'pdf' | 'audio' | 'video' | 'ebook';
  file_url: string;
  file_size_mb: number;
  download_limit: number;
  is_published: boolean;
}

interface TestOrder {
  id: string;
  user_id: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  total_amount: number;
}

test.describe('T091: Digital Product Purchase Flow', () => {
  let testUser: TestUser;
  let testProduct1: TestProduct; // PDF product
  let testProduct2: TestProduct; // Audio product
  let testProduct3: TestProduct; // Video product

  test.beforeAll(async () => {
    // Clean up any existing test data first (with CASCADE to remove related records)
    await pool.query('DELETE FROM download_logs WHERE user_id IN (SELECT id FROM users WHERE email = $1)', ['productbuyer@test.com']);
    await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email = $1))', ['productbuyer@test.com']);
    await pool.query('DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email = $1)', ['productbuyer@test.com']);
    await pool.query('DELETE FROM digital_products WHERE slug IN ($1, $2, $3)', [
      'meditation-guide-pdf',
      'guided-meditation-audio',
      'yoga-flow-video'
    ]);
    await pool.query('DELETE FROM users WHERE email = $1', ['productbuyer@test.com']);
    
    // Create test user
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, password_hash, name
    `, [
      'productbuyer@test.com',
      '$2a$10$YourHashedPasswordHere', // bcrypt hash for 'password123'
      'Product Buyer',
      'user'
    ]);
    testUser = userResult.rows[0];

    // Create test products
    const product1Result = await pool.query(`
      INSERT INTO digital_products (
        title, slug, description, price, product_type, 
        file_url, file_size_mb, download_limit, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      'Meditation Guide PDF',
      'meditation-guide-pdf',
      'A comprehensive guide to meditation practices with step-by-step instructions.',
      29.99,
      'pdf',
      'https://example.com/files/meditation-guide.pdf',
      2.5,
      3,
      true
    ]);
    testProduct1 = product1Result.rows[0];

    const product2Result = await pool.query(`
      INSERT INTO digital_products (
        title, slug, description, price, product_type, 
        file_url, file_size_mb, download_limit, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      'Guided Meditation Audio',
      'guided-meditation-audio',
      'Peaceful guided meditation sessions for daily practice.',
      19.99,
      'audio',
      'https://example.com/files/guided-meditation.mp3',
      45.8,
      5,
      true
    ]);
    testProduct2 = product2Result.rows[0];

    const product3Result = await pool.query(`
      INSERT INTO digital_products (
        title, slug, description, price, product_type, 
        file_url, file_size_mb, download_limit, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      'Yoga Flow Video Course',
      'yoga-flow-video',
      'Complete yoga flow sequences for beginners and advanced practitioners.',
      49.99,
      'video',
      'https://example.com/files/yoga-flow.mp4',
      1250.5,
      3,
      true
    ]);
    testProduct3 = product3Result.rows[0];
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testUser?.id) {
      await pool.query('DELETE FROM download_logs WHERE user_id = $1', [testUser.id]);
      await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [testUser.id]);
      await pool.query('DELETE FROM orders WHERE user_id = $1', [testUser.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
    if (testProduct1?.id) {
      await pool.query('DELETE FROM digital_products WHERE id = $1', [testProduct1.id]);
    }
    if (testProduct2?.id) {
      await pool.query('DELETE FROM digital_products WHERE id = $1', [testProduct2.id]);
    }
    if (testProduct3?.id) {
      await pool.query('DELETE FROM digital_products WHERE id = $1', [testProduct3.id]);
    }
  });

  /**
   * Helper function to login as test user
   */
  async function loginAsTestUser(page: Page) {
    await page.goto('/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|products)/);
  }

  test.describe('Product Catalog Browsing', () => {
    test('should display products catalog page', async ({ page }) => {
      await page.goto('/products');
      
      // Check page title and header
      await expect(page).toHaveTitle(/Products|Digital Products/i);
      await expect(page.locator('h1')).toContainText(/Products|Digital Products/i);
      
      // Verify products are displayed
      await expect(page.locator(`text=${testProduct1.title}`)).toBeVisible();
      await expect(page.locator(`text=${testProduct2.title}`)).toBeVisible();
      await expect(page.locator(`text=${testProduct3.title}`)).toBeVisible();
    });

    test('should display product cards with correct information', async ({ page }) => {
      await page.goto('/products');
      
      // Check first product card
      const product1Card = page.locator(`[data-product-slug="${testProduct1.slug}"]`).first();
      await expect(product1Card).toBeVisible();
      await expect(product1Card).toContainText(testProduct1.title);
      await expect(product1Card).toContainText('$29.99');
      await expect(product1Card).toContainText('2.5 MB');
      await expect(product1Card).toContainText(/PDF/i);
      
      // Check second product card
      const product2Card = page.locator(`[data-product-slug="${testProduct2.slug}"]`).first();
      await expect(product2Card).toContainText(testProduct2.title);
      await expect(product2Card).toContainText('$19.99');
      await expect(product2Card).toContainText('45.8 MB');
      await expect(product2Card).toContainText(/Audio/i);
      
      // Check third product card
      const product3Card = page.locator(`[data-product-slug="${testProduct3.slug}"]`).first();
      await expect(product3Card).toContainText(testProduct3.title);
      await expect(product3Card).toContainText('$49.99');
      await expect(product3Card).toContainText('1250.5 MB');
      await expect(product3Card).toContainText(/Video/i);
    });

    test('should filter products by type', async ({ page }) => {
      await page.goto('/products');
      
      // Filter by PDF
      await page.click('button:has-text("PDF")');
      await expect(page.locator(`text=${testProduct1.title}`)).toBeVisible();
      await expect(page.locator(`text=${testProduct2.title}`)).not.toBeVisible();
      
      // Filter by Audio
      await page.click('button:has-text("Audio")');
      await expect(page.locator(`text=${testProduct2.title}`)).toBeVisible();
      await expect(page.locator(`text=${testProduct1.title}`)).not.toBeVisible();
      
      // Clear filters
      await page.click('button:has-text("All")');
      await expect(page.locator(`text=${testProduct1.title}`)).toBeVisible();
      await expect(page.locator(`text=${testProduct2.title}`)).toBeVisible();
    });

    test('should sort products by price', async ({ page }) => {
      await page.goto('/products');
      
      // Sort by price ascending
      await page.selectOption('select[name="sort"]', 'price-asc');
      
      const productTitles = await page.locator('[data-product-slug]').allTextContents();
      // Cheapest should appear first: Audio ($19.99), then PDF ($29.99), then Video ($49.99)
      expect(productTitles[0]).toContain('Audio');
      
      // Sort by price descending
      await page.selectOption('select[name="sort"]', 'price-desc');
      const productTitlesDesc = await page.locator('[data-product-slug]').allTextContents();
      // Most expensive should appear first: Video ($49.99)
      expect(productTitlesDesc[0]).toContain('Video');
    });
  });

  test.describe('Product Detail View', () => {
    test('should navigate to product detail page', async ({ page }) => {
      await page.goto('/products');
      
      // Click on product card
      await page.click(`[data-product-slug="${testProduct1.slug}"]`);
      
      // Verify we're on the product detail page
      await expect(page).toHaveURL(new RegExp(`/products/${testProduct1.slug}`));
      await expect(page.locator('h1')).toContainText(testProduct1.title);
    });

    test('should display complete product information', async ({ page }) => {
      await page.goto(`/products/${testProduct1.slug}`);
      
      // Check title and description
      await expect(page.locator('h1')).toContainText(testProduct1.title);
      await expect(page.locator('text=' + testProduct1.description)).toBeVisible();
      
      // Check price
      await expect(page.locator('text=$29.99')).toBeVisible();
      
      // Check file details
      await expect(page.locator('text=/2.5 MB/i')).toBeVisible();
      await expect(page.locator('text=/PDF/i')).toBeVisible();
      await expect(page.locator('text=/3 downloads/i')).toBeVisible();
      
      // Check Buy Now button exists
      await expect(page.locator('button:has-text("Buy Now")')).toBeVisible();
    });

    test('should show preview if available', async ({ page }) => {
      // Add preview URL to product
      await pool.query(
        'UPDATE digital_products SET preview_url = $1 WHERE id = $2',
        ['https://example.com/previews/meditation-guide-preview.pdf', testProduct1.id]
      );
      
      await page.goto(`/products/${testProduct1.slug}`);
      
      // Check for preview link/button
      const previewButton = page.locator('a:has-text("Preview"), button:has-text("Preview")');
      await expect(previewButton).toBeVisible();
      
      // Clean up
      await pool.query(
        'UPDATE digital_products SET preview_url = NULL WHERE id = $1',
        [testProduct1.id]
      );
    });
  });

  test.describe('Product Purchase Flow', () => {
    test('should redirect to login if not authenticated', async ({ page }) => {
      await page.goto(`/products/${testProduct1.slug}`);
      
      // Click Buy Now button
      await page.click('button:has-text("Buy Now")');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should initiate purchase when authenticated', async ({ page }) => {
      await loginAsTestUser(page);
      await page.goto(`/products/${testProduct1.slug}`);
      
      // Click Buy Now button
      await page.click('button:has-text("Buy Now")');
      
      // Should go to checkout or show payment modal
      await page.waitForURL(/\/(checkout|products\/.*)/);
      
      // Should see payment form or confirmation
      const hasCheckoutForm = await page.locator('form#payment-form, [data-stripe-element]').count() > 0;
      const hasConfirmButton = await page.locator('button:has-text("Confirm Purchase")').count() > 0;
      
      expect(hasCheckoutForm || hasConfirmButton).toBeTruthy();
    });

    test('should complete purchase and create order', async ({ page }) => {
      await loginAsTestUser(page);
      await page.goto(`/products/${testProduct1.slug}`);
      
      // Click Buy Now
      await page.click('button:has-text("Buy Now")');
      await page.waitForTimeout(1000);
      
      // Fill in mock payment details (if payment form present)
      const hasPaymentForm = await page.locator('input[name="cardNumber"]').count() > 0;
      if (hasPaymentForm) {
        await page.fill('input[name="cardNumber"]', '4242424242424242');
        await page.fill('input[name="cardExpiry"]', '12/25');
        await page.fill('input[name="cardCvc"]', '123');
      }
      
      // Complete purchase
      await page.click('button:has-text("Complete Purchase"), button:has-text("Confirm Purchase")');
      
      // Wait for success
      await page.waitForSelector('text=/success|thank you|download/i', { timeout: 10000 });
      
      // Verify order was created in database
      const orderResult = await pool.query(
        'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [testUser.id]
      );
      
      expect(orderResult.rows.length).toBeGreaterThan(0);
      const order = orderResult.rows[0];
      expect(order.status).toBe('completed');
      expect(parseFloat(order.total_amount)).toBe(29.99);
      
      // Verify order item was created
      const orderItemResult = await pool.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [order.id]
      );
      
      expect(orderItemResult.rows.length).toBe(1);
      const orderItem = orderItemResult.rows[0];
      expect(orderItem.digital_product_id).toBe(testProduct1.id);
      expect(orderItem.item_type).toBe('digital_product');
      expect(parseFloat(orderItem.price)).toBe(29.99);
    });

    test('should show immediate download link after purchase', async ({ page }) => {
      await loginAsTestUser(page);
      
      // Create a completed order for the product
      const orderResult = await pool.query(`
        INSERT INTO orders (user_id, status, total_amount)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testUser.id, 'completed', 29.99]);
      const orderId = orderResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO order_items (order_id, digital_product_id, item_type, title, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, testProduct1.id, 'digital_product', testProduct1.title, 29.99]);
      
      // Go to success/confirmation page
      await page.goto(`/products/${testProduct1.slug}/success?order=${orderId}`);
      
      // Should see download button
      const downloadButton = page.locator('a:has-text("Download"), button:has-text("Download")');
      await expect(downloadButton).toBeVisible();
      
      // Check download link format
      const downloadLink = await downloadButton.getAttribute('href');
      expect(downloadLink).toContain('/api/products/download');
      expect(downloadLink).toContain(testProduct1.id);
    });

    test('should generate secure download token', async ({ page }) => {
      await loginAsTestUser(page);
      
      // Create order
      const orderResult = await pool.query(`
        INSERT INTO orders (user_id, status, total_amount)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testUser.id, 'completed', 29.99]);
      const orderId = orderResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO order_items (order_id, digital_product_id, item_type, title, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, testProduct1.id, 'digital_product', testProduct1.title, 29.99]);
      
      await page.goto(`/products/${testProduct1.slug}/success?order=${orderId}`);
      
      // Get download link
      const downloadButton = page.locator('a:has-text("Download"), button:has-text("Download")').first();
      const downloadLink = await downloadButton.getAttribute('href');
      
      // Verify link contains token parameter
      expect(downloadLink).toMatch(/token=[a-zA-Z0-9_-]+/);
      
      // Link should be time-limited (check for expiry parameter)
      expect(downloadLink).toMatch(/expires=[0-9]+/);
    });
  });

  test.describe('Download Management', () => {
    test('should track downloads in database', async ({ page }) => {
      await loginAsTestUser(page);
      
      // Create order
      const orderResult = await pool.query(`
        INSERT INTO orders (user_id, status, total_amount)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testUser.id, 'completed', 29.99]);
      const orderId = orderResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO order_items (order_id, digital_product_id, item_type, title, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, testProduct1.id, 'digital_product', testProduct1.title, 29.99]);
      
      // Request download
      const response = await page.goto(`/api/products/download/${testProduct1.id}?order=${orderId}`);
      
      // Verify download was tracked
      const downloadLog = await pool.query(
        'SELECT * FROM download_logs WHERE user_id = $1 AND digital_product_id = $2 ORDER BY downloaded_at DESC LIMIT 1',
        [testUser.id, testProduct1.id]
      );
      
      expect(downloadLog.rows.length).toBe(1);
      expect(downloadLog.rows[0].order_id).toBe(orderId);
    });

    test('should enforce download limits', async ({ page }) => {
      await loginAsTestUser(page);
      
      // Create order for product with 3 download limit
      const orderResult = await pool.query(`
        INSERT INTO orders (user_id, status, total_amount)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testUser.id, 'completed', 29.99]);
      const orderId = orderResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO order_items (order_id, digital_product_id, item_type, title, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, testProduct1.id, 'digital_product', testProduct1.title, 29.99]);
      
      // Create 3 download logs (at the limit)
      for (let i = 0; i < 3; i++) {
        await pool.query(`
          INSERT INTO download_logs (user_id, digital_product_id, order_id)
          VALUES ($1, $2, $3)
        `, [testUser.id, testProduct1.id, orderId]);
      }
      
      // Try to download again (should be blocked)
      const response = await page.goto(`/api/products/download/${testProduct1.id}?order=${orderId}`);
      
      // Should get error or redirect to limit exceeded page
      const responseText = await response?.text() || '';
      expect(responseText).toMatch(/limit exceeded|maximum downloads|no more downloads/i);
    });

    test('should allow re-download from user dashboard', async ({ page }) => {
      await loginAsTestUser(page);
      
      // Create order
      const orderResult = await pool.query(`
        INSERT INTO orders (user_id, status, total_amount)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testUser.id, 'completed', 29.99]);
      const orderId = orderResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO order_items (order_id, digital_product_id, item_type, title, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, testProduct1.id, 'digital_product', testProduct1.title, 29.99]);
      
      // Go to user dashboard/my-products page
      await page.goto('/dashboard/my-products');
      
      // Should see purchased product
      await expect(page.locator(`text=${testProduct1.title}`)).toBeVisible();
      
      // Should have download button
      const downloadButton = page.locator(`[data-product-id="${testProduct1.id}"] a:has-text("Download"), [data-product-id="${testProduct1.id}"] button:has-text("Download")`);
      await expect(downloadButton).toBeVisible();
      
      // Check download count display
      await expect(page.locator('text=/0 of 3 downloads/i, text=/downloads: 0\/3/i')).toBeVisible();
    });

    test('should display download history', async ({ page }) => {
      await loginAsTestUser(page);
      
      // Create order
      const orderResult = await pool.query(`
        INSERT INTO orders (user_id, status, total_amount)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testUser.id, 'completed', 29.99]);
      const orderId = orderResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO order_items (order_id, digital_product_id, item_type, title, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, testProduct1.id, 'digital_product', testProduct1.title, 29.99]);
      
      // Create download log
      await pool.query(`
        INSERT INTO download_logs (user_id, digital_product_id, order_id)
        VALUES ($1, $2, $3)
      `, [testUser.id, testProduct1.id, orderId]);
      
      // Go to dashboard
      await page.goto('/dashboard/my-products');
      
      // Should show download count updated
      await expect(page.locator('text=/1 of 3 downloads/i, text=/downloads: 1\/3/i')).toBeVisible();
      
      // Click to view download history
      const historyButton = page.locator('button:has-text("History"), a:has-text("History")');
      if (await historyButton.count() > 0) {
        await historyButton.click();
        
        // Should see download date/time
        await expect(page.locator('text=/downloaded/i')).toBeVisible();
      }
    });
  });

  test.describe('Purchase Validation', () => {
    test('should prevent purchasing same product twice', async ({ page }) => {
      await loginAsTestUser(page);
      
      // Create existing order
      const orderResult = await pool.query(`
        INSERT INTO orders (user_id, status, total_amount)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testUser.id, 'completed', 29.99]);
      const orderId = orderResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO order_items (order_id, digital_product_id, item_type, title, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, testProduct1.id, 'digital_product', testProduct1.title, 29.99]);
      
      // Try to purchase again
      await page.goto(`/products/${testProduct1.slug}`);
      
      // Buy Now button should be replaced with "Already Owned" or "Download" button
      const buyButton = page.locator('button:has-text("Buy Now")');
      const alreadyOwnedText = page.locator('text=/already own|already purchased/i');
      const downloadButton = page.locator('a:has-text("Download"), button:has-text("Download")');
      
      const hasBuyButton = await buyButton.count() > 0;
      const hasAlreadyOwnedText = await alreadyOwnedText.count() > 0;
      const hasDownloadButton = await downloadButton.count() > 0;
      
      expect(hasBuyButton).toBe(false);
      expect(hasAlreadyOwnedText || hasDownloadButton).toBe(true);
    });

    test('should handle cancelled orders correctly', async ({ page }) => {
      await loginAsTestUser(page);
      
      // Create cancelled order
      const orderResult = await pool.query(`
        INSERT INTO orders (user_id, status, total_amount)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [testUser.id, 'cancelled', 29.99]);
      const orderId = orderResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO order_items (order_id, digital_product_id, item_type, title, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, testProduct1.id, 'digital_product', testProduct1.title, 29.99]);
      
      // Should still be able to purchase
      await page.goto(`/products/${testProduct1.slug}`);
      await expect(page.locator('button:has-text("Buy Now")')).toBeVisible();
      
      // Should NOT show download button
      const downloadButton = page.locator('a:has-text("Download")').first();
      const hasDownloadButton = await downloadButton.count() > 0;
      
      // If download button exists, verify it's not for this cancelled order
      if (hasDownloadButton) {
        const href = await downloadButton.getAttribute('href');
        expect(href).not.toContain(orderId);
      }
    });

    test('should validate order belongs to user', async ({ page }) => {
      await loginAsTestUser(page);
      
      // Create order for different user
      const otherUserResult = await pool.query(`
        INSERT INTO users (email, password_hash, name, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['otheruser@test.com', '$2a$10$hash', 'Other User', 'user']);
      const otherUserId = otherUserResult.rows[0].id;
      
      const orderResult = await pool.query(`
        INSERT INTO orders (user_id, status, total_amount)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [otherUserId, 'completed', 29.99]);
      const orderId = orderResult.rows[0].id;
      
      await pool.query(`
        INSERT INTO order_items (order_id, digital_product_id, item_type, title, price)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, testProduct1.id, 'digital_product', testProduct1.title, 29.99]);
      
      // Try to download using other user's order
      const response = await page.goto(`/api/products/download/${testProduct1.id}?order=${orderId}`);
      
      // Should get error (unauthorized)
      expect(response?.status()).toBe(403);
      
      // Clean up
      await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
      await pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
    });
  });

  test.describe('Search and Filtering', () => {
    test('should search products by title', async ({ page }) => {
      await page.goto('/products');
      
      // Search for "meditation"
      await page.fill('input[name="search"], input[placeholder*="search" i]', 'meditation');
      await page.keyboard.press('Enter');
      
      // Should show both meditation products
      await expect(page.locator(`text=${testProduct1.title}`)).toBeVisible();
      await expect(page.locator(`text=${testProduct2.title}`)).toBeVisible();
      
      // Should not show yoga product
      await expect(page.locator(`text=${testProduct3.title}`)).not.toBeVisible();
    });

    test('should filter by price range', async ({ page }) => {
      await page.goto('/products');
      
      // Set price range to show only products under $30
      await page.fill('input[name="minPrice"]', '0');
      await page.fill('input[name="maxPrice"]', '30');
      await page.click('button:has-text("Apply")');
      
      // Should show products under $30
      await expect(page.locator(`text=${testProduct1.title}`)).toBeVisible(); // $29.99
      await expect(page.locator(`text=${testProduct2.title}`)).toBeVisible(); // $19.99
      
      // Should not show expensive product
      await expect(page.locator(`text=${testProduct3.title}`)).not.toBeVisible(); // $49.99
    });

    test('should filter by multiple product types', async ({ page }) => {
      await page.goto('/products');
      
      // Select PDF and Audio filters
      await page.click('input[type="checkbox"][value="pdf"]');
      await page.click('input[type="checkbox"][value="audio"]');
      
      // Should show PDF and Audio products
      await expect(page.locator(`text=${testProduct1.title}`)).toBeVisible();
      await expect(page.locator(`text=${testProduct2.title}`)).toBeVisible();
      
      // Should not show Video product
      await expect(page.locator(`text=${testProduct3.title}`)).not.toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/products');
      
      // Products should stack vertically
      const productCards = page.locator('[data-product-slug]');
      expect(await productCards.count()).toBeGreaterThan(0);
      
      // Mobile menu should be accessible
      const mobileMenu = page.locator('button[aria-label*="menu" i]');
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu).toBeVisible();
      }
    });

    test('should handle product detail on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`/products/${testProduct1.slug}`);
      
      // Content should be readable
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Buy Now")')).toBeVisible();
      
      // Buy button should be easily tappable (not too small)
      const buyButton = page.locator('button:has-text("Buy Now")');
      const box = await buyButton.boundingBox();
      expect(box?.height).toBeGreaterThan(40); // At least 40px tall for touch
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid product slug', async ({ page }) => {
      const response = await page.goto('/products/non-existent-product');
      
      // Should show 404 or error message
      expect(response?.status()).toBe(404);
      await expect(page.locator('text=/not found|404/i')).toBeVisible();
    });

    test('should handle download errors gracefully', async ({ page }) => {
      await loginAsTestUser(page);
      
      // Try to download without owning the product
      const response = await page.goto(`/api/products/download/${testProduct1.id}`);
      
      // Should get error
      expect(response?.status()).toBe(403);
      
      const responseText = await response?.text() || '';
      expect(responseText).toMatch(/not purchased|unauthorized|access denied/i);
    });

    test('should handle payment failures', async ({ page }) => {
      await loginAsTestUser(page);
      await page.goto(`/products/${testProduct1.slug}`);
      
      // Click Buy Now
      await page.click('button:has-text("Buy Now")');
      await page.waitForTimeout(1000);
      
      // Use invalid card number (if payment form exists)
      const hasPaymentForm = await page.locator('input[name="cardNumber"]').count() > 0;
      if (hasPaymentForm) {
        await page.fill('input[name="cardNumber"]', '4000000000000002'); // Card that will be declined
        await page.fill('input[name="cardExpiry"]', '12/25');
        await page.fill('input[name="cardCvc"]', '123');
        
        await page.click('button:has-text("Complete Purchase")');
        
        // Should show error message
        await expect(page.locator('text=/payment failed|declined|error/i')).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
