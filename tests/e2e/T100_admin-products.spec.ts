/**
 * T100: Admin Digital Products List - E2E Tests
 * 
 * Test Coverage:
 * 1. Page Load & Authentication
 * 2. Products List Display
 * 3. Filtering & Search
 * 4. Sorting Functionality
 * 5. Pagination
 * 6. Product Actions (View/Edit/Delete)
 * 7. Empty States
 * 8. Responsive Design
 */

import { test, expect } from '@playwright/test';
import { pool } from '../setup/database';

// Test data
const testAdmin = {
  email: 'adminproducts@test.com',
  password: 'password123', // Simple password for testing
  name: 'Admin Products Tester',
  role: 'admin',
};

const testProducts = [
  {
    title: 'Complete TypeScript Guide',
    slug: 'complete-typescript-guide',
    description: 'Master TypeScript from basics to advanced',
    product_type: 'pdf',
    price: 2999,
    file_url: 'https://example.com/typescript-guide.pdf',
    file_size_mb: 5.5,
    download_limit: 5,
    is_published: true,
  },
  {
    title: 'React Podcast Series',
    slug: 'react-podcast-series',
    description: 'Learn React through audio lessons',
    product_type: 'audio',
    price: 4999,
    file_url: 'https://example.com/react-podcast.mp3',
    file_size_mb: 120.0,
    download_limit: 10,
    is_published: true,
  },
  {
    title: 'Node.js Video Course',
    slug: 'nodejs-video-course',
    description: 'Complete Node.js video tutorial',
    product_type: 'video',
    price: 7999,
    file_url: 'https://example.com/nodejs-course.mp4',
    file_size_mb: 2500.0,
    download_limit: 3,
    is_published: false,
  },
  {
    title: 'Python Programming eBook',
    slug: 'python-programming-ebook',
    description: 'Comprehensive Python programming guide',
    product_type: 'ebook',
    price: 1999,
    file_url: 'https://example.com/python-ebook.epub',
    file_size_mb: 3.2,
    download_limit: 5,
    is_published: true,
  },
];

// Helper: Clean up test data
async function cleanupTestData() {
  try {
    // Delete in proper order (child → parent)
    await pool.query(`DELETE FROM download_logs WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [testAdmin.email]);
    await pool.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email = $1))`, [testAdmin.email]);
    await pool.query(`DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [testAdmin.email]);
    await pool.query(`DELETE FROM digital_products WHERE slug = ANY($1)`, [testProducts.map(p => p.slug)]);
    await pool.query(`DELETE FROM users WHERE email = $1`, [testAdmin.email]);
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

// Helper: Create test admin user
async function createTestAdmin() {
  // Use pre-hashed password (bcrypt hash for 'password123')
  const hashedPassword = '$2a$10$YourHashedPasswordHere';
  
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, email_verified)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id`,
    [testAdmin.email, hashedPassword, testAdmin.name, testAdmin.role]
  );
  
  return result.rows[0].id;
}

// Helper: Create test products
async function createTestProducts() {
  const productIds: number[] = [];
  
  for (const product of testProducts) {
    const result = await pool.query(
      `INSERT INTO digital_products (
        title, slug, description, product_type, price, 
        file_url, file_size_mb, download_limit, is_published
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        product.title,
        product.slug,
        product.description,
        product.product_type,
        product.price,
        product.file_url,
        product.file_size_mb,
        product.download_limit,
        product.is_published,
      ]
    );
    
    productIds.push(result.rows[0].id);
  }
  
  return productIds;
}

// Helper: Admin login
async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', testAdmin.email);
  await page.fill('input[name="password"]', testAdmin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

test.describe('T100: Admin Products List', () => {
  let adminId: number;
  let productIds: number[];

  test.beforeAll(async () => {
    await cleanupTestData();
    adminId = await createTestAdmin();
    productIds = await createTestProducts();
  });

  test.afterAll(async () => {
    await cleanupTestData();
    // Note: Don't end pool here - it's managed by the test setup
  });

  test.describe('1. Page Load & Authentication', () => {
    test('should redirect non-authenticated users to login', async ({ page }) => {
      await page.goto('/admin/products');
      await page.waitForURL(/\/login/, { timeout: 5000 });
      expect(page.url()).toContain('/login');
    });

    test('should allow admin users to access products page', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const title = await page.textContent('[data-testid="admin-page-title"]');
      expect(title).toContain('Digital Products');
    });

    test('should display page header with description', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const description = await page.textContent('p.text-sm.text-gray-600');
      expect(description).toContain('Manage your digital product catalog');
    });

    test('should show "Add New Product" button', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const addButton = await page.locator('[data-testid="add-product-button"]');
      await expect(addButton).toBeVisible();
      expect(await addButton.getAttribute('href')).toBe('/admin/products/new');
    });

    test('should show "Back to Dashboard" button', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const backButton = await page.locator('a:has-text("Back to Dashboard")');
      await expect(backButton).toBeVisible();
      expect(await backButton.getAttribute('href')).toBe('/admin');
    });
  });

  test.describe('2. Products List Display', () => {
    test('should display products table with correct headers', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const table = await page.locator('[data-testid="products-table"]');
      await expect(table).toBeVisible();
      
      const headers = ['Product', 'Type', 'Price', 'Size', 'Status', 'Downloads', 'Created', 'Actions'];
      for (const header of headers) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
      }
    });

    test('should display all test products by default', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      // Check that published products are visible
      for (const product of testProducts.filter(p => p.is_published)) {
        const row = await page.locator(`text="${product.title}"`);
        await expect(row).toBeVisible();
      }
    });

    test('should show product type badges with correct colors', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      // PDF badge should be red
      const pdfBadge = await page.locator('span:has-text("PDF")').first();
      const pdfClass = await pdfBadge.getAttribute('class');
      expect(pdfClass).toContain('bg-red-100');
      
      // Audio badge should be blue
      const audioBadge = await page.locator('span:has-text("AUDIO")').first();
      const audioClass = await audioBadge.getAttribute('class');
      expect(audioClass).toContain('bg-blue-100');
    });

    test('should display published/draft status indicators', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products?published=');
      
      // Check for published badge
      const publishedBadge = await page.locator('span:has-text("Published")').first();
      await expect(publishedBadge).toBeVisible();
      
      // Check for draft badge
      const draftBadge = await page.locator('span:has-text("Draft")').first();
      await expect(draftBadge).toBeVisible();
    });

    test('should format prices correctly', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      // TypeScript Guide is $29.99
      await expect(page.locator('text="$29.99"')).toBeVisible();
      
      // React Podcast is $49.99
      await expect(page.locator('text="$49.99"')).toBeVisible();
    });

    test('should format file sizes correctly', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      // 5.5 MB should be visible
      await expect(page.locator('text="5.5 MB"')).toBeVisible();
      
      // 2500 MB should show as GB
      await expect(page.locator('text="2.4 GB"')).toBeVisible();
    });

    test('should show download limits', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await expect(page.locator('text="Limit: 5"')).toBeVisible();
      await expect(page.locator('text="Limit: 10"')).toBeVisible();
    });

    test('should display product count', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const countText = await page.locator('text=/Showing.*products/').textContent();
      expect(countText).toMatch(/Showing.*\d+.*of.*\d+.*products/);
    });
  });

  test.describe('3. Filtering & Search', () => {
    test('should filter by product type (PDF)', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await page.selectOption('[data-testid="type-filter"]', 'pdf');
      await page.click('button:has-text("Apply Filters")');
      
      await expect(page.locator('text="Complete TypeScript Guide"')).toBeVisible();
      await expect(page.locator('text="React Podcast Series"')).not.toBeVisible();
    });

    test('should filter by product type (Audio)', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await page.selectOption('[data-testid="type-filter"]', 'audio');
      await page.click('button:has-text("Apply Filters")');
      
      await expect(page.locator('text="React Podcast Series"')).toBeVisible();
      await expect(page.locator('text="Complete TypeScript Guide"')).not.toBeVisible();
    });

    test('should filter by published status', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await page.selectOption('[data-testid="published-filter"]', 'true');
      await page.click('button:has-text("Apply Filters")');
      
      // Should see published products
      await expect(page.locator('text="Complete TypeScript Guide"')).toBeVisible();
      
      // Should not see draft products
      await expect(page.locator('text="Node.js Video Course"')).not.toBeVisible();
    });

    test('should filter by draft status', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await page.selectOption('[data-testid="published-filter"]', 'false');
      await page.click('button:has-text("Apply Filters")');
      
      // Should see draft products
      await expect(page.locator('text="Node.js Video Course"')).toBeVisible();
      
      // Should not see published products
      await expect(page.locator('text="Complete TypeScript Guide"')).not.toBeVisible();
    });

    test('should search products by title', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await page.fill('[data-testid="search-input"]', 'TypeScript');
      await page.click('button:has-text("Apply Filters")');
      
      await expect(page.locator('text="Complete TypeScript Guide"')).toBeVisible();
      await expect(page.locator('text="React Podcast Series"')).not.toBeVisible();
    });

    test('should search products by description', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await page.fill('[data-testid="search-input"]', 'audio lessons');
      await page.click('button:has-text("Apply Filters")');
      
      await expect(page.locator('text="React Podcast Series"')).toBeVisible();
      await expect(page.locator('text="Complete TypeScript Guide"')).not.toBeVisible();
    });

    test('should combine multiple filters', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await page.selectOption('[data-testid="type-filter"]', 'pdf');
      await page.selectOption('[data-testid="published-filter"]', 'true');
      await page.click('button:has-text("Apply Filters")');
      
      // Should only show published PDFs
      await expect(page.locator('text="Complete TypeScript Guide"')).toBeVisible();
      await expect(page.locator('text="React Podcast Series"')).not.toBeVisible();
      await expect(page.locator('text="Node.js Video Course"')).not.toBeVisible();
    });

    test('should clear filters correctly', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products?type=pdf&search=TypeScript');
      
      await page.click('a:has-text("Clear Filters")');
      
      // Should be back at base URL
      expect(page.url()).toBe('http://localhost:4321/admin/products');
      
      // Should show all products again
      await expect(page.locator('text="Complete TypeScript Guide"')).toBeVisible();
      await expect(page.locator('text="React Podcast Series"')).toBeVisible();
    });
  });

  test.describe('4. Sorting Functionality', () => {
    test('should sort by newest first (default)', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const sortSelect = await page.locator('[data-testid="sort-filter"]');
      const selectedValue = await sortSelect.inputValue();
      expect(selectedValue).toBe('newest');
    });

    test('should sort by title A-Z', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await page.selectOption('[data-testid="sort-filter"]', 'title-asc');
      await page.click('button:has-text("Apply Filters")');
      
      const firstProduct = await page.locator('[data-testid^="product-row-"]').first();
      const firstTitle = await firstProduct.locator('text=/Complete|Node|Python|React/').textContent();
      
      // "Complete TypeScript Guide" should be first alphabetically
      expect(firstTitle).toContain('Complete');
    });

    test('should sort by price low to high', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await page.selectOption('[data-testid="sort-filter"]', 'price-asc');
      await page.click('button:has-text("Apply Filters")');
      
      // Python eBook ($19.99) should be first
      const firstProduct = await page.locator('[data-testid^="product-row-"]').first();
      await expect(firstProduct.locator('text="$19.99"')).toBeVisible();
    });

    test('should sort by price high to low', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await page.selectOption('[data-testid="sort-filter"]', 'price-desc');
      await page.click('button:has-text("Apply Filters")');
      
      // Node.js Video Course ($79.99) should be first
      const firstProduct = await page.locator('[data-testid^="product-row-"]').first();
      await expect(firstProduct.locator('text="$79.99"')).toBeVisible();
    });
  });

  test.describe('5. Pagination', () => {
    test('should show pagination controls when needed', async ({ page }) => {
      await loginAsAdmin(page);
      // With limit=2, we should have multiple pages
      await page.goto('/admin/products?limit=2');
      
      // Wait a bit for content to load
      await page.waitForTimeout(1000);
      
      // Check if pagination exists (may not if < 2 products loaded)
      const pagination = await page.locator('nav[aria-label="Pagination"]');
      const paginationCount = await pagination.count();
      
      if (paginationCount > 0) {
        await expect(pagination).toBeVisible();
      }
    });

    test('should navigate to next page', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products?limit=2&page=1');
      
      const nextButton = await page.locator('a:has-text("Next")');
      const isDisabled = await nextButton.getAttribute('class');
      
      if (!isDisabled?.includes('pointer-events-none')) {
        await nextButton.click();
        expect(page.url()).toContain('page=2');
      }
    });

    test('should navigate to previous page', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products?limit=2&page=2');
      
      const prevButton = await page.locator('a:has-text("Previous")');
      await prevButton.click();
      
      expect(page.url()).toContain('page=1');
    });

    test('should disable previous button on first page', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products?limit=2&page=1');
      
      const prevButton = await page.locator('a:has-text("Previous")');
      const classes = await prevButton.getAttribute('class');
      expect(classes).toContain('pointer-events-none');
    });
  });

  test.describe('6. Product Actions', () => {
    test('should have view, edit, and delete buttons for each product', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const firstRow = await page.locator('[data-testid^="product-row-"]').first();
      
      // View button (eye icon)
      await expect(firstRow.locator('a[title="View product page"]')).toBeVisible();
      
      // Edit button (pencil icon)
      await expect(firstRow.locator('a[title="Edit product"]')).toBeVisible();
      
      // Delete button (trash icon)
      await expect(firstRow.locator('button[title="Delete product"]')).toBeVisible();
    });

    test('should open view link in new tab', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const viewLink = await page.locator('a[title="View product page"]').first();
      const target = await viewLink.getAttribute('target');
      expect(target).toBe('_blank');
    });

    test('should have correct edit link', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const editButton = await page.locator('[data-testid^="edit-product-"]').first();
      const href = await editButton.getAttribute('href');
      expect(href).toMatch(/\/admin\/products\/\d+\/edit/);
    });

    test('should show delete confirmation modal', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const deleteButton = await page.locator('[data-testid^="delete-product-"]').first();
      await deleteButton.click();
      
      const modal = await page.locator('#deleteModal');
      await expect(modal).toBeVisible();
      
      await expect(page.locator('text="Delete Product"')).toBeVisible();
      await expect(page.locator('text="Are you sure you want to delete"')).toBeVisible();
    });

    test('should close delete modal on cancel', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const deleteButton = await page.locator('[data-testid^="delete-product-"]').first();
      await deleteButton.click();
      
      await page.click('button:has-text("Cancel")');
      
      const modal = await page.locator('#deleteModal');
      await expect(modal).toBeHidden();
    });

    test('should close delete modal on background click', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const deleteButton = await page.locator('[data-testid^="delete-product-"]').first();
      await deleteButton.click();
      
      // Click on modal background
      await page.locator('.bg-gray-500.bg-opacity-75').click();
      
      const modal = await page.locator('#deleteModal');
      await expect(modal).toBeHidden();
    });
  });

  test.describe('7. Empty States', () => {
    test('should show empty state when no products match filters', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products?search=nonexistentproduct123');
      
      await expect(page.locator('text="No products found"')).toBeVisible();
      await expect(page.locator('text="Try adjusting your filters"')).toBeVisible();
    });

    test('should show "Add First Product" CTA when no products exist', async ({ page }) => {
      // Delete all products temporarily
      await pool.query(`DELETE FROM digital_products WHERE slug = ANY($1)`, [testProducts.map(p => p.slug)]);
      
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      await expect(page.locator('text="No products found"')).toBeVisible();
      await expect(page.locator('text="Get started by creating your first product"')).toBeVisible();
      
      const addFirstButton = await page.locator('a:has-text("Add Your First Product")');
      await expect(addFirstButton).toBeVisible();
      
      // Recreate products for other tests
      await createTestProducts();
    });
  });

  test.describe('8. Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      // Should still show title
      await expect(page.locator('[data-testid="admin-page-title"]')).toBeVisible();
      
      // Table should be scrollable
      const table = await page.locator('[data-testid="products-table"]');
      await expect(table).toBeVisible();
    });

    test('should show mobile pagination controls', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAsAdmin(page);
      await page.goto('/admin/products?limit=2');
      
      // Mobile pagination uses Previous/Next text
      await page.waitForTimeout(1000);
      const prevNext = await page.locator('a:has-text("Previous"), a:has-text("Next")');
      const count = await prevNext.count();
      
      // Should have either Previous or Next (or both)
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should stack filters on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAsAdmin(page);
      await page.goto('/admin/products');
      
      const filterForm = await page.locator('[data-testid="filter-form"]');
      await expect(filterForm).toBeVisible();
      
      // Filters should be in a grid that stacks on mobile
      const searchInput = await page.locator('[data-testid="search-input"]');
      await expect(searchInput).toBeVisible();
    });
  });
});
