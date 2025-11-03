/**
 * T103: Admin Products API - E2E Tests
 * 
 * Tests for admin product CRUD operations:
 * - Create product (POST /api/admin/products)
 * - List products with filters (GET /api/admin/products)
 * - Get single product (GET /api/admin/products/:id)
 * - Update product (PUT /api/admin/products/:id)
 * - Delete product (DELETE /api/admin/products/:id)
 */

import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// Create a dedicated test database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres_dev_password@localhost:5432/spirituality_platform',
});

// ==================== Test Data ====================

const adminUser = {
  id: '550e8400-e29b-41d4-a716-446655440103',
  email: 'admin-products@test.com',
  password: 'Admin123!@#',
  name: 'Product Admin',
  role: 'admin',
};

const testProduct = {
  title: 'Meditation Audio Collection',
  slug: 'meditation-audio-collection',
  description: 'A comprehensive collection of guided meditation audio tracks for deep relaxation and mindfulness practice.',
  price: 29.99,
  product_type: 'audio',
  file_url: 'https://example.com/files/meditation-audio.zip',
  file_size_mb: 125.5,
  preview_url: 'https://example.com/preview/meditation-sample.mp3',
  image_url: 'https://example.com/images/meditation-audio.jpg',
  download_limit: 5,
  is_published: true,
};

const testProduct2 = {
  title: 'Spiritual Wisdom eBook',
  slug: 'spiritual-wisdom-ebook',
  description: 'An enlightening ebook exploring ancient spiritual wisdom and modern practices.',
  price: 19.99,
  product_type: 'ebook',
  file_url: 'https://example.com/files/spiritual-wisdom.epub',
  file_size_mb: 5.2,
  preview_url: 'https://example.com/preview/spiritual-wisdom-sample.pdf',
  image_url: 'https://example.com/images/spiritual-wisdom.jpg',
  download_limit: 3,
  is_published: false,
};

// ==================== Setup & Teardown ====================

test.beforeAll(async () => {
  // Create admin user
  const hashedPassword = await bcrypt.hash(adminUser.password, 10);
  
  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, role, email_verified)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = $3, name = $4, role = $5`,
    [adminUser.id, adminUser.email, hashedPassword, adminUser.name, adminUser.role]
  );
});

test.beforeEach(async () => {
  // Clean up products before each test
  await pool.query('DELETE FROM digital_products WHERE slug LIKE $1', ['%test%']);
  await pool.query('DELETE FROM digital_products WHERE slug IN ($1, $2)', [testProduct.slug, testProduct2.slug]);
});

test.afterAll(async () => {
  // Clean up
  await pool.query('DELETE FROM users WHERE email = $1', [adminUser.email]);
  await pool.query('DELETE FROM digital_products WHERE slug IN ($1, $2)', [testProduct.slug, testProduct2.slug]);
  await pool.end();
});

// ==================== Helper Functions ====================

async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', adminUser.email);
  await page.fill('input[name="password"]', adminUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 5000 });
}

async function createProductViaAPI(page: any, productData: any) {
  const response = await page.request.post('/api/admin/products', {
    data: productData,
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.data;
}

async function createCompletedOrder(productId: string, userId: string) {
  const orderId = '650e8400-e29b-41d4-a716-446655440009';
  
  await pool.query(
    `INSERT INTO orders (id, user_id, status, subtotal, tax, total, created_at)
     VALUES ($1, $2, 'completed', 2999, 0, 2999, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [orderId, userId]
  );
  
  await pool.query(
    `INSERT INTO order_items (order_id, digital_product_id, item_type, quantity, price)
     VALUES ($1, $2, 'digital_product', 1, 2999)
     ON CONFLICT DO NOTHING`,
    [orderId, productId]
  );
  
  return orderId;
}

// ==================== Test Suite ====================

test.describe('Admin Products API - T103', () => {
  
  // ==================== CREATE PRODUCT TESTS ====================
  
  test('should create a new product via POST /api/admin/products', async ({ page }) => {
    await loginAsAdmin(page);
    
    const response = await page.request.post('/api/admin/products', {
      data: testProduct,
    });
    
    expect(response.status()).toBe(201);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.id).toBeDefined();
    expect(result.data.title).toBe(testProduct.title);
    expect(result.data.slug).toBe(testProduct.slug);
    expect(result.data.price).toBe(testProduct.price.toString());
    expect(result.data.product_type).toBe(testProduct.product_type);
    expect(result.data.is_published).toBe(testProduct.is_published);
  });

  test('should reject duplicate slug when creating product', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Create first product
    await createProductViaAPI(page, testProduct);
    
    // Try to create second product with same slug
    const response = await page.request.post('/api/admin/products', {
      data: testProduct,
    });
    
    expect(response.status()).toBe(409);
    
    const result = await response.json();
    expect(result.error).toContain('slug already exists');
  });

  test('should validate product data when creating', async ({ page }) => {
    await loginAsAdmin(page);
    
    const invalidProduct = {
      title: 'AB', // Too short
      slug: 'Invalid Slug!', // Invalid characters
      description: 'Short', // Too short
      price: -10, // Negative price
      product_type: 'invalid-type', // Invalid type
      file_url: 'not-a-url', // Invalid URL
      download_limit: 0, // Too low
    };
    
    const response = await page.request.post('/api/admin/products', {
      data: invalidProduct,
    });
    
    expect(response.status()).toBe(400);
    
    const result = await response.json();
    expect(result.error).toBe('Invalid product data');
    expect(result.details).toBeDefined();
    expect(result.details.length).toBeGreaterThan(0);
  });

  test('should reject product creation without authentication', async ({ page }) => {
    // Don't login
    const response = await page.request.post('/api/admin/products', {
      data: testProduct,
    });
    
    expect(response.status()).toBe(401);
    
    const result = await response.json();
    expect(result.error).toContain('Authentication required');
  });

  // ==================== LIST PRODUCTS TESTS ====================

  test('should list all products with statistics', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Create test products
    await createProductViaAPI(page, testProduct);
    await createProductViaAPI(page, testProduct2);
    
    const response = await page.request.get('/api/admin/products');
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.products).toBeDefined();
    expect(result.data.products.length).toBeGreaterThanOrEqual(2);
    expect(result.data.count).toBeGreaterThanOrEqual(2);
    
    // Check statistics are included
    const product = result.data.products.find((p: any) => p.slug === testProduct.slug);
    expect(product).toBeDefined();
    expect(product.sales_count).toBeDefined();
    expect(product.total_revenue).toBeDefined();
    expect(product.total_downloads).toBeDefined();
  });

  test('should filter products by publish status', async ({ page }) => {
    await loginAsAdmin(page);
    
    await createProductViaAPI(page, testProduct); // published
    await createProductViaAPI(page, testProduct2); // unpublished
    
    // Filter by published
    let response = await page.request.get('/api/admin/products?status=published');
    let result = await response.json();
    
    expect(result.data.products.every((p: any) => p.is_published === true)).toBe(true);
    
    // Filter by unpublished
    response = await page.request.get('/api/admin/products?status=unpublished');
    result = await response.json();
    
    expect(result.data.products.every((p: any) => p.is_published === false)).toBe(true);
  });

  test('should filter products by type', async ({ page }) => {
    await loginAsAdmin(page);
    
    await createProductViaAPI(page, testProduct); // audio
    await createProductViaAPI(page, testProduct2); // ebook
    
    const response = await page.request.get('/api/admin/products?type=audio');
    const result = await response.json();
    
    expect(result.data.products.every((p: any) => p.product_type === 'audio')).toBe(true);
  });

  test('should search products by title and description', async ({ page }) => {
    await loginAsAdmin(page);
    
    await createProductViaAPI(page, testProduct);
    
    const response = await page.request.get('/api/admin/products?search=meditation');
    const result = await response.json();
    
    expect(result.data.products.length).toBeGreaterThanOrEqual(1);
    expect(result.data.products.some((p: any) => 
      p.title.toLowerCase().includes('meditation') || 
      p.description.toLowerCase().includes('meditation')
    )).toBe(true);
  });

  test('should filter products by price range', async ({ page }) => {
    await loginAsAdmin(page);
    
    await createProductViaAPI(page, testProduct); // 29.99
    await createProductViaAPI(page, testProduct2); // 19.99
    
    const response = await page.request.get('/api/admin/products?minPrice=20&maxPrice=30');
    const result = await response.json();
    
    expect(result.data.products.every((p: any) => 
      parseFloat(p.price) >= 20 && parseFloat(p.price) <= 30
    )).toBe(true);
  });

  test('should sort products correctly', async ({ page }) => {
    await loginAsAdmin(page);
    
    await createProductViaAPI(page, testProduct);
    await createProductViaAPI(page, testProduct2);
    
    // Sort by price ascending
    let response = await page.request.get('/api/admin/products?sortBy=price-asc');
    let result = await response.json();
    
    const prices = result.data.products.map((p: any) => parseFloat(p.price));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    
    // Sort by title
    response = await page.request.get('/api/admin/products?sortBy=title-asc');
    result = await response.json();
    
    const titles = result.data.products.map((p: any) => p.title);
    expect(titles).toEqual([...titles].sort());
  });

  // ==================== GET SINGLE PRODUCT TESTS ====================

  test('should get single product with detailed statistics', async ({ page }) => {
    await loginAsAdmin(page);
    
    const product = await createProductViaAPI(page, testProduct);
    
    const response = await page.request.get(`/api/admin/products/${product.id}`);
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(product.id);
    expect(result.data.sales_count).toBeDefined();
    expect(result.data.total_revenue).toBeDefined();
    expect(result.data.total_downloads).toBeDefined();
    expect(result.data.unique_downloaders).toBeDefined();
  });

  test('should return 404 for non-existent product', async ({ page }) => {
    await loginAsAdmin(page);
    
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await page.request.get(`/api/admin/products/${fakeId}`);
    
    expect(response.status()).toBe(404);
    
    const result = await response.json();
    expect(result.error).toContain('not found');
  });

  // ==================== UPDATE PRODUCT TESTS ====================

  test('should update product via PUT /api/admin/products/:id', async ({ page }) => {
    await loginAsAdmin(page);
    
    const product = await createProductViaAPI(page, testProduct);
    
    const updatedData = {
      ...testProduct,
      title: 'Updated Meditation Audio',
      price: 39.99,
      is_published: false,
    };
    
    const response = await page.request.put(`/api/admin/products/${product.id}`, {
      data: updatedData,
    });
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.title).toBe('Updated Meditation Audio');
    expect(result.data.price).toBe('39.99');
    expect(result.data.is_published).toBe(false);
  });

  test('should validate slug uniqueness when updating', async ({ page }) => {
    await loginAsAdmin(page);
    
    const product1 = await createProductViaAPI(page, testProduct);
    const product2 = await createProductViaAPI(page, testProduct2);
    
    // Try to update product2 with product1's slug
    const updatedData = {
      ...testProduct2,
      slug: testProduct.slug,
    };
    
    const response = await page.request.put(`/api/admin/products/${product2.id}`, {
      data: updatedData,
    });
    
    expect(response.status()).toBe(400);
    
    const result = await response.json();
    expect(result.error).toContain('slug already exists');
  });

  test('should allow updating product with same slug', async ({ page }) => {
    await loginAsAdmin(page);
    
    const product = await createProductViaAPI(page, testProduct);
    
    const updatedData = {
      ...testProduct,
      title: 'Updated Title',
      // Keep same slug
      slug: testProduct.slug,
    };
    
    const response = await page.request.put(`/api/admin/products/${product.id}`, {
      data: updatedData,
    });
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result.data.title).toBe('Updated Title');
    expect(result.data.slug).toBe(testProduct.slug);
  });

  test('should return 404 when updating non-existent product', async ({ page }) => {
    await loginAsAdmin(page);
    
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await page.request.put(`/api/admin/products/${fakeId}`, {
      data: testProduct,
    });
    
    expect(response.status()).toBe(404);
  });

  // ==================== DELETE PRODUCT TESTS ====================

  test('should delete product with no sales', async ({ page }) => {
    await loginAsAdmin(page);
    
    const product = await createProductViaAPI(page, testProduct);
    
    const response = await page.request.delete(`/api/admin/products/${product.id}`);
    
    expect(response.ok()).toBeTruthy();
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.message).toContain('deleted successfully');
    
    // Verify product is deleted
    const getResponse = await page.request.get(`/api/admin/products/${product.id}`);
    expect(getResponse.status()).toBe(404);
  });

  test('should prevent deletion of product with completed sales', async ({ page }) => {
    await loginAsAdmin(page);
    
    const product = await createProductViaAPI(page, testProduct);
    
    // Create a completed order with this product
    await createCompletedOrder(product.id, adminUser.id);
    
    const response = await page.request.delete(`/api/admin/products/${product.id}`);
    
    expect(response.status()).toBe(400);
    
    const result = await response.json();
    expect(result.error).toContain('Cannot delete product');
    expect(result.error).toContain('completed sale');
  });

  test('should return 404 when deleting non-existent product', async ({ page }) => {
    await loginAsAdmin(page);
    
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await page.request.delete(`/api/admin/products/${fakeId}`);
    
    expect(response.status()).toBe(404);
  });

  // ==================== AUTHORIZATION TESTS ====================

  test('should reject non-admin user access', async ({ page, browser }) => {
    // Create regular user
    const regularUser = {
      email: 'regular@test.com',
      password: 'User123!@#',
      name: 'Regular User',
      role: 'user',
    };
    
    const hashedPassword = await bcrypt.hash(regularUser.password, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role, email_verified)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [regularUser.email, hashedPassword, regularUser.name, regularUser.role]
    );
    
    // Login as regular user
    await page.goto('/login');
    await page.fill('input[name="email"]', regularUser.email);
    await page.fill('input[name="password"]', regularUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
    
    // Try to access admin endpoint
    const response = await page.request.get('/api/admin/products');
    
    expect(response.status()).toBe(403);
    
    const result = await response.json();
    expect(result.error).toContain('Admin access required');
    
    // Cleanup
    await pool.query('DELETE FROM users WHERE email = $1', [regularUser.email]);
  });

  // ==================== COMPLEX SCENARIO TESTS ====================

  test('should handle complete product lifecycle', async ({ page }) => {
    await loginAsAdmin(page);
    
    // 1. Create product
    let response = await page.request.post('/api/admin/products', {
      data: { ...testProduct, is_published: false },
    });
    expect(response.status()).toBe(201);
    let result = await response.json();
    const productId = result.data.id;
    
    // 2. Verify product is in list (unpublished)
    response = await page.request.get('/api/admin/products?status=unpublished');
    result = await response.json();
    expect(result.data.products.some((p: any) => p.id === productId)).toBe(true);
    
    // 3. Update product (publish it)
    response = await page.request.put(`/api/admin/products/${productId}`, {
      data: { ...testProduct, is_published: true, price: 34.99 },
    });
    expect(response.ok()).toBeTruthy();
    
    // 4. Verify product is now published
    response = await page.request.get(`/api/admin/products/${productId}`);
    result = await response.json();
    expect(result.data.is_published).toBe(true);
    expect(result.data.price).toBe('34.99');
    
    // 5. Delete product
    response = await page.request.delete(`/api/admin/products/${productId}`);
    expect(response.ok()).toBeTruthy();
    
    // 6. Verify product is deleted
    response = await page.request.get(`/api/admin/products/${productId}`);
    expect(response.status()).toBe(404);
  });

  test('should display accurate sales statistics', async ({ page }) => {
    await loginAsAdmin(page);
    
    const product = await createProductViaAPI(page, testProduct);
    
    // Create multiple orders
    await createCompletedOrder(product.id, adminUser.id);
    
    // Get product with stats
    const response = await page.request.get(`/api/admin/products/${product.id}`);
    const result = await response.json();
    
    expect(result.data.sales_count).toBeGreaterThanOrEqual(1);
    expect(result.data.total_revenue).toBeGreaterThan(0);
  });
});
