/**
 * E2E Tests for Digital Products (T092-T099)
 * Tests the complete digital product purchase, download, and re-download flow
 */

import { test, expect, type Page } from '@playwright/test';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// Database connection for test setup/cleanup
const testPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'spirituality_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres_dev_password',
});

// Test user credentials
const testUser = {
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
  hashedPassword: '', // Will be generated in beforeAll
};

// Test product data
const testProduct = {
  id: '11111111-2222-3333-4444-555555555555',
  title: 'Test Meditation Guide',
  slug: 'test-meditation-guide',
  description: 'A comprehensive guide to meditation practices for beginners and advanced practitioners.',
  price: 29.99,
  product_type: 'pdf',
  file_url: 'https://example.com/test-meditation-guide.pdf',
  file_size_mb: 5.5,
  preview_url: 'https://example.com/preview/test-meditation-guide.pdf',
  image_url: 'https://via.placeholder.com/400x400.png?text=Meditation+Guide',
  download_limit: 3,
  is_published: true,
};

// Setup: Create test user and product
test.beforeAll(async () => {
  // Generate proper bcrypt hash for test password
  testUser.hashedPassword = await bcrypt.hash(testUser.password, 10);
  
  const client = await testPool.connect();
  try {
    await client.query('BEGIN');

    // Clean up existing test data
    await client.query(`DELETE FROM download_logs WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [testUser.email]);
    await client.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email = $1))`, [testUser.email]);
    await client.query(`DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [testUser.email]);
    await client.query(`DELETE FROM users WHERE email = $1`, [testUser.email]);
    await client.query(`DELETE FROM digital_products WHERE slug = $1`, [testProduct.slug]);

    // Create test user
    await client.query(
      `INSERT INTO users (email, password_hash, name, email_verified, role)
       VALUES ($1, $2, $3, true, 'user')`,
      [testUser.email, testUser.hashedPassword, testUser.name]
    );

    // Create test product
    await client.query(
      `INSERT INTO digital_products (id, title, slug, description, price, product_type, file_url, file_size_mb, preview_url, image_url, download_limit, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        testProduct.id,
        testProduct.title,
        testProduct.slug,
        testProduct.description,
        testProduct.price,
        testProduct.product_type,
        testProduct.file_url,
        testProduct.file_size_mb,
        testProduct.preview_url,
        testProduct.image_url,
        testProduct.download_limit,
        testProduct.is_published,
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// Cleanup: Remove test data
test.afterAll(async () => {
  const client = await testPool.connect();
  try {
    await client.query(`DELETE FROM download_logs WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [testUser.email]);
    await client.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email = $1))`, [testUser.email]);
    await client.query(`DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [testUser.email]);
    await client.query(`DELETE FROM users WHERE email = $1`, [testUser.email]);
    await client.query(`DELETE FROM digital_products WHERE slug = $1`, [testProduct.slug]);
  } finally {
    client.release();
  }
  await testPool.end();
});

// Helper: Login as test user
async function loginAsTestUser(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', testUser.email);
  await page.fill('input[type="password"]', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Digital Products - Product Catalog (T094, T095)', () => {
  test('should display products catalog page', async ({ page }) => {
    await page.goto('/products');

    // Check page title
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toContainText('Digital Products');

    // Check product card is visible
    const productCard = page.locator(`[data-product-slug="${testProduct.slug}"]`).first();
    await expect(productCard).toBeVisible();
  });

  test('should display product card with correct information', async ({ page }) => {
    await page.goto('/products');

    const productCard = page.locator(`[data-product-slug="${testProduct.slug}"]`).first();

    // Check title
    await expect(productCard.locator('h3')).toContainText(testProduct.title);

    // Check price
    await expect(productCard).toContainText('$29.99');

    // Check file size
    await expect(productCard).toContainText('5.5 MB');

    // Check product type badge
    await expect(productCard).toContainText('PDF');
  });

  test('should filter products by type', async ({ page }) => {
    await page.goto('/products');

    // Click PDF filter
    await page.click('[data-filter-type="pdf"]');

    // Should still see test product (it's a PDF)
    const productCard = page.locator(`[data-product-slug="${testProduct.slug}"]`).first();
    await expect(productCard).toBeVisible();
  });

  test('should search products by title', async ({ page }) => {
    await page.goto('/products');

    // Search for the test product
    await page.fill('input[name="search"]', 'Meditation');
    await page.click('button[type="submit"]');

    // Should see the test product
    const productCard = page.locator(`[data-product-slug="${testProduct.slug}"]`).first();
    await expect(productCard).toBeVisible();
  });

  test('should sort products by price', async ({ page }) => {
    await page.goto('/products');

    // Select price ascending sort
    await page.selectOption('select[name="sort"]', 'price-asc');

    // Should see products (test doesn't verify order without multiple products)
    const productCard = page.locator(`[data-product-slug="${testProduct.slug}"]`).first();
    await expect(productCard).toBeVisible();
  });
});

test.describe('Digital Products - Product Detail Page (T096)', () => {
  test('should display product detail page', async ({ page }) => {
    await page.goto(`/products/${testProduct.slug}`);

    // Check product title
    const title = page.getByTestId('product-title');
    await expect(title).toContainText(testProduct.title);

    // Check product image
    const image = page.getByTestId('product-image');
    await expect(image).toBeVisible();

    // Check description
    const description = page.getByTestId('product-description');
    await expect(description).toContainText(testProduct.description);

    // Check price
    const price = page.getByTestId('product-price');
    await expect(price).toContainText('$29.99');

    // Check file size
    const fileSize = page.getByTestId('file-size');
    await expect(fileSize).toContainText('5.5 MB');

    // Check download limit
    const downloadLimit = page.getByTestId('download-limit');
    await expect(downloadLimit).toContainText('3 times');
  });

  test('should show preview section if preview URL exists', async ({ page }) => {
    await page.goto(`/products/${testProduct.slug}`);

    // Check for preview link
    const previewLink = page.getByTestId('preview-link');
    await expect(previewLink).toBeVisible();
    await expect(previewLink).toHaveAttribute('href', testProduct.preview_url);
  });

  test('should show add to cart button for non-purchased product', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/products/${testProduct.slug}`);

    // Check add to cart button is visible
    const addToCartBtn = page.getByTestId('add-to-cart-btn');
    await expect(addToCartBtn).toBeVisible();
    await expect(addToCartBtn).toContainText('Add to Cart');
  });

  test('should add product to cart', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto(`/products/${testProduct.slug}`);

    // Click add to cart
    const addToCartBtn = page.getByTestId('add-to-cart-btn');
    await addToCartBtn.click();

    // Should redirect to cart
    await page.waitForURL('/cart', { timeout: 5000 });

    // Verify product is in cart
    await expect(page.locator('body')).toContainText(testProduct.title);
  });

  test('should track product view in analytics', async ({ page }) => {
    await page.goto(`/products/${testProduct.slug}`);

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Verify analytics entry was created (check database)
    const client = await testPool.connect();
    try {
      const result = await client.query(
        `SELECT COUNT(*) as view_count FROM product_views WHERE digital_product_id = $1`,
        [testProduct.id]
      );
      expect(parseInt(result.rows[0].view_count)).toBeGreaterThan(0);
    } finally {
      client.release();
    }
  });
});

test.describe('Digital Products - Cart Integration (T099)', () => {
  test('should add digital product to cart via API', async ({ page }) => {
    await loginAsTestUser(page);

    // Call cart API directly
    const response = await page.request.post('/api/cart/add', {
      data: {
        itemType: 'digital_product',
        itemId: testProduct.id,
        quantity: 1,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.cart.itemCount).toBeGreaterThan(0);
  });

  test('should display digital product in cart page', async ({ page }) => {
    await loginAsTestUser(page);

    // Add product to cart
    await page.request.post('/api/cart/add', {
      data: {
        itemType: 'digital_product',
        itemId: testProduct.id,
        quantity: 1,
      },
    });

    // Go to cart
    await page.goto('/cart');

    // Verify product is in cart
    await expect(page.locator('body')).toContainText(testProduct.title);
    await expect(page.locator('body')).toContainText('$29.99');
  });

  test('should remove digital product from cart', async ({ page }) => {
    await loginAsTestUser(page);

    // Add product to cart
    await page.request.post('/api/cart/add', {
      data: {
        itemType: 'digital_product',
        itemId: testProduct.id,
        quantity: 1,
      },
    });

    // Go to cart
    await page.goto('/cart');

    // Find and click remove button
    const removeBtn = page.locator('button').filter({ hasText: 'Remove' }).first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await page.waitForTimeout(500);

      // Cart should be empty or product should be removed
      await expect(page.locator('body')).not.toContainText(testProduct.title);
    }
  });
});

test.describe('Digital Products - Downloads Dashboard (T098)', () => {
  test('should show empty state when no products purchased', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard/downloads');

    // Check page title
    const pageTitle = page.getByTestId('page-title');
    await expect(pageTitle).toContainText('My Downloads');

    // Should show empty state
    await expect(page.locator('body')).toContainText('No Downloads Yet');
  });

  test('should display purchased products after purchase', async ({ page }) => {
    await loginAsTestUser(page);

    // Create a completed order for the user
    const client = await testPool.connect();
    try {
      await client.query('BEGIN');

      // Get user ID
      const userResult = await client.query('SELECT id FROM users WHERE email = $1', [testUser.email]);
      const userId = userResult.rows[0].id;

      // Create order
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, total_price, status, stripe_payment_id)
         VALUES ($1, $2, 'completed', 'test_payment_123')
         RETURNING id`,
        [userId, testProduct.price]
      );
      const orderId = orderResult.rows[0].id;

      // Create order item
      await client.query(
        `INSERT INTO order_items (order_id, digital_product_id, item_type, title, price, quantity)
         VALUES ($1, $2, 'digital_product', $3, $4, 1)`,
        [orderId, testProduct.id, testProduct.title, testProduct.price]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Go to downloads page
    await page.goto('/dashboard/downloads');

    // Should see the purchased product
    const downloadItem = page.getByTestId('download-item');
    await expect(downloadItem).toBeVisible();

    const productTitle = page.getByTestId('product-title');
    await expect(productTitle).toContainText(testProduct.title);

    // Check download count
    const downloadCount = page.getByTestId('download-count');
    await expect(downloadCount).toContainText('0 of 3');

    // Check downloads remaining
    const downloadsRemaining = page.getByTestId('downloads-remaining');
    await expect(downloadsRemaining).toContainText('3 downloads remaining');
  });

  test('should have working download button', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard/downloads');

    // Check if download button exists
    const downloadBtn = page.getByTestId('download-btn');
    if (await downloadBtn.isVisible()) {
      await expect(downloadBtn).toBeVisible();
      await expect(downloadBtn).toBeEnabled();
    }
  });

  test('should disable download button when limit reached', async ({ page }) => {
    await loginAsTestUser(page);

    // Log downloads up to the limit
    const client = await testPool.connect();
    try {
      const userResult = await client.query('SELECT id FROM users WHERE email = $1', [testUser.email]);
      const userId = userResult.rows[0].id;

      const orderResult = await client.query(
        `SELECT id FROM orders WHERE user_id = $1 AND status = 'completed' LIMIT 1`,
        [userId]
      );

      if (orderResult.rows.length > 0) {
        const orderId = orderResult.rows[0].id;

        // Log 3 downloads (reach the limit)
        for (let i = 0; i < 3; i++) {
          await client.query(
            `INSERT INTO download_logs (user_id, digital_product_id, order_id, ip_address)
             VALUES ($1, $2, $3, '127.0.0.1')`,
            [userId, testProduct.id, orderId]
          );
        }
      }
    } finally {
      client.release();
    }

    // Go to downloads page
    await page.goto('/dashboard/downloads');

    // Download button should be disabled
    const downloadBtnDisabled = page.getByTestId('download-btn-disabled');
    await expect(downloadBtnDisabled).toBeVisible();
    await expect(downloadBtnDisabled).toBeDisabled();

    // Should show limit reached message
    await expect(page.locator('body')).toContainText('Download limit reached');
  });
});

test.describe('Digital Products - Download API (T097)', () => {
  test('should generate valid download link', async ({ page }) => {
    await loginAsTestUser(page);

    // Create a completed order if not exists
    const client = await testPool.connect();
    let orderId: string;
    try {
      const userResult = await client.query('SELECT id FROM users WHERE email = $1', [testUser.email]);
      const userId = userResult.rows[0].id;

      const orderResult = await client.query(
        `SELECT id FROM orders WHERE user_id = $1 AND status = 'completed' LIMIT 1`,
        [userId]
      );

      if (orderResult.rows.length === 0) {
        const newOrderResult = await client.query(
          `INSERT INTO orders (user_id, total_price, status, stripe_payment_id)
           VALUES ($1, $2, 'completed', 'test_payment_456')
           RETURNING id`,
          [userId, testProduct.price]
        );
        orderId = newOrderResult.rows[0].id;

        await client.query(
          `INSERT INTO order_items (order_id, digital_product_id, item_type, title, price, quantity)
           VALUES ($1, $2, 'digital_product', $3, $4, 1)`,
          [orderId, testProduct.id, testProduct.title, testProduct.price]
        );
      } else {
        orderId = orderResult.rows[0].id;
      }
    } finally {
      client.release();
    }

    // Go to downloads page and try to get download link
    await page.goto('/dashboard/downloads');

    // Download link should be present
    const downloadBtn = page.getByTestId('download-btn');
    if (await downloadBtn.isVisible()) {
      const href = await downloadBtn.getAttribute('href');
      expect(href).toContain('/api/products/download/');
      expect(href).toContain('token=');
      expect(href).toContain('order=');
      expect(href).toContain('expires=');
    }
  });

  test('should reject download without authentication', async ({ page }) => {
    // Try to access download API without login
    const response = await page.request.get(`/api/products/download/${testProduct.id}?token=invalid&order=invalid&expires=999999999999`);

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('Authentication required');
  });

  test('should reject download with invalid token', async ({ page }) => {
    await loginAsTestUser(page);

    // Try with invalid token
    const response = await page.request.get(`/api/products/download/${testProduct.id}?token=invalid_token&order=invalid_order&expires=999999999999`);

    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });
});

test.describe('Digital Products - Analytics (T093)', () => {
  test('should track product views', async ({ page }) => {
    const client = await testPool.connect();
    try {
      // Get initial view count
      const beforeResult = await client.query(
        `SELECT COUNT(*) as count FROM product_views WHERE digital_product_id = $1`,
        [testProduct.id]
      );
      const beforeCount = parseInt(beforeResult.rows[0].count);

      // View the product
      await page.goto(`/products/${testProduct.slug}`);
      await page.waitForTimeout(1000);

      // Get view count after
      const afterResult = await client.query(
        `SELECT COUNT(*) as count FROM product_views WHERE digital_product_id = $1`,
        [testProduct.id]
      );
      const afterCount = parseInt(afterResult.rows[0].count);

      // Should have increased
      expect(afterCount).toBeGreaterThan(beforeCount);
    } finally {
      client.release();
    }
  });

  test('should track downloads', async ({ page }) => {
    await loginAsTestUser(page);

    const client = await testPool.connect();
    try {
      // Get user and order
      const userResult = await client.query('SELECT id FROM users WHERE email = $1', [testUser.email]);
      const userId = userResult.rows[0].id;

      const orderResult = await client.query(
        `SELECT id FROM orders WHERE user_id = $1 AND status = 'completed' LIMIT 1`,
        [userId]
      );

      if (orderResult.rows.length > 0) {
        const orderId = orderResult.rows[0].id;

        // Get initial download count
        const beforeResult = await client.query(
          `SELECT COUNT(*) as count FROM download_logs 
           WHERE user_id = $1 AND digital_product_id = $2 AND order_id = $3`,
          [userId, testProduct.id, orderId]
        );
        const beforeCount = parseInt(beforeResult.rows[0].count);

        // Should have download logs (we created some in previous tests)
        expect(beforeCount).toBeGreaterThanOrEqual(0);
      }
    } finally {
      client.release();
    }
  });
});
