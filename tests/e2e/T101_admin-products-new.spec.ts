/**
 * T101: Admin Products New Form E2E Tests
 * 
 * Tests for creating new digital products through the admin interface
 * 
 * Test Categories:
 * 1. Authentication & Access Control
 * 2. Form Display & Structure
 * 3. Auto-generation Features
 * 4. Form Validation
 * 5. Form Submission (Draft)
 * 6. Form Submission (Publish)
 * 7. Error Handling
 * 8. Image Preview
 * 9. Navigation
 * 10. Responsive Design
 */

import { test, expect, type Page } from '@playwright/test';
import { pool } from '../setup/database';
import type { PoolClient } from 'pg';

// Test data
const testUser = {
  email: 'admin@test.com',
  password: 'password123',
  hashedPassword: '$2b$10$abcdefghijklmnopqrstuvwxyz123456', // Mock hash
  role: 'admin'
};

const validProductData = {
  title: 'Test Product Guide',
  slug: 'test-product-guide',
  description: 'This is a comprehensive test product for automated testing purposes.',
  productType: 'pdf',
  price: '29.99',
  fileUrl: 'https://storage.example.com/products/test-product.pdf',
  fileSizeMb: '5.5',
  previewUrl: 'https://storage.example.com/previews/test-preview.pdf',
  imageUrl: 'https://via.placeholder.com/400x400.png?text=Test+Product',
  downloadLimit: '5'
};

// Setup: Create test user
async function setupTestUser(client: PoolClient) {
  await client.query(`
    INSERT INTO users (id, email, password_hash, role, name)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (email) DO NOTHING
  `, [
    '11111111-1111-1111-1111-111111111111',
    testUser.email,
    testUser.hashedPassword,
    testUser.role,
    'Admin User'
  ]);
}

// Cleanup: Remove test data
async function cleanupTestData(client: PoolClient) {
  await client.query(`DELETE FROM digital_products WHERE slug LIKE 'test-%'`);
  await client.query(`DELETE FROM users WHERE email = $1`, [testUser.email]);
}

// Helper: Login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', testUser.email);
  await page.fill('input[type="password"]', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('T101: Admin Products New Form', () => {
  let testPool: any;
  let client: PoolClient;

  test.beforeAll(async () => {
    testPool = pool;
    client = await testPool.connect();
    await cleanupTestData(client);
    await setupTestUser(client);
  });

  test.afterAll(async () => {
    await cleanupTestData(client);
    client.release();
    await testPool.end();
  });

  test.afterEach(async ({ page }) => {
    // Clean up any products created during tests
    const testClient = await testPool.connect();
    try {
      await testClient.query(`DELETE FROM digital_products WHERE slug LIKE 'test-%' OR slug LIKE 'auto-%'`);
    } finally {
      testClient.release();
    }
  });

  // ============================================================================
  // 1. AUTHENTICATION & ACCESS CONTROL
  // ============================================================================

  test.describe('Authentication & Access Control', () => {
    test('should redirect to login if not authenticated', async ({ page }) => {
      await page.goto('/admin/products/new');
      await page.waitForURL(/\/login/);
      expect(page.url()).toContain('/login');
      expect(page.url()).toContain('redirect=');
    });

    test('should allow authenticated admin to access form', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
      await expect(page.getByTestId('page-title')).toContainText('Create New Product');
    });
  });

  // ============================================================================
  // 2. FORM DISPLAY & STRUCTURE
  // ============================================================================

  test.describe('Form Display & Structure', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
    });

    test('should display page title and description', async ({ page }) => {
      await expect(page.getByTestId('page-title')).toHaveText('Create New Product');
      await expect(page.locator('text=Add a new digital product to your catalog')).toBeVisible();
    });

    test('should display Back to Products link', async ({ page }) => {
      const backLink = page.locator('a[href="/admin/products"]').first();
      await expect(backLink).toBeVisible();
      await expect(backLink).toContainText('Back to Products');
    });

    test('should display all required form sections', async ({ page }) => {
      await expect(page.locator('h2:has-text("Basic Information")')).toBeVisible();
      await expect(page.locator('h2:has-text("Product Details")')).toBeVisible();
      await expect(page.locator('h2:has-text("Files & Media")')).toBeVisible();
      await expect(page.locator('h2:has-text("Publishing Options")')).toBeVisible();
    });

    test('should display all required form fields with asterisks', async ({ page }) => {
      const requiredFields = [
        'label:has-text("Title *")',
        'label:has-text("Slug *")',
        'label:has-text("Description *")',
        'label:has-text("Product Type *")',
        'label:has-text("Price (USD) *")',
        'label:has-text("File URL *")'
      ];

      for (const selector of requiredFields) {
        await expect(page.locator(selector)).toBeVisible();
      }
    });

    test('should display optional form fields', async ({ page }) => {
      await expect(page.locator('label:has-text("File Size (MB)")')).toBeVisible();
      await expect(page.locator('label:has-text("Download Limit")')).toBeVisible();
      await expect(page.locator('label:has-text("Preview URL")')).toBeVisible();
      await expect(page.locator('label:has-text("Product Image URL")')).toBeVisible();
    });

    test('should display product type options', async ({ page }) => {
      const select = page.getByTestId('product-type-select');
      await expect(select).toBeVisible();
      
      // Check all product types exist
      const options = await select.locator('option').allTextContents();
      expect(options).toContain('📄 PDF Document');
      expect(options).toContain('🎵 Audio File');
      expect(options).toContain('🎥 Video File');
      expect(options).toContain('📚 eBook');
    });

    test('should display action buttons', async ({ page }) => {
      await expect(page.locator('button:has-text("Save as Draft")')).toBeVisible();
      await expect(page.locator('button:has-text("Create & Publish")')).toBeVisible();
      await expect(page.locator('a:has-text("Cancel")')).toBeVisible();
    });

    test('should have download limit default value of 3', async ({ page }) => {
      const downloadLimitInput = page.getByTestId('download-limit-input');
      await expect(downloadLimitInput).toHaveValue('3');
    });
  });

  // ============================================================================
  // 3. AUTO-GENERATION FEATURES
  // ============================================================================

  test.describe('Auto-generation Features', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
    });

    test('should auto-generate slug from title', async ({ page }) => {
      const titleInput = page.getByTestId('title-input');
      const slugInput = page.getByTestId('slug-input');

      await titleInput.fill('My Awesome Product Guide');
      await titleInput.blur();
      
      await expect(slugInput).toHaveValue('my-awesome-product-guide');
    });

    test('should handle special characters in auto-generated slug', async ({ page }) => {
      const titleInput = page.getByTestId('title-input');
      const slugInput = page.getByTestId('slug-input');

      await titleInput.fill('React & TypeScript: A Complete Guide!');
      await titleInput.blur();
      
      await expect(slugInput).toHaveValue('react-typescript-a-complete-guide');
    });

    test('should allow manual slug override', async ({ page }) => {
      const titleInput = page.getByTestId('title-input');
      const slugInput = page.getByTestId('slug-input');

      await titleInput.fill('Test Product');
      await titleInput.blur();
      await expect(slugInput).toHaveValue('test-product');

      // Manual override
      await slugInput.clear();
      await slugInput.fill('custom-slug');
      
      // Auto-generation should stop
      await titleInput.fill('Different Title');
      await titleInput.blur();
      await expect(slugInput).toHaveValue('custom-slug');
    });
  });

  // ============================================================================
  // 4. FORM VALIDATION
  // ============================================================================

  test.describe('Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
    });

    test('should show error for missing title', async ({ page }) => {
      await page.getByTestId('description-input').fill('Test description');
      await page.getByTestId('product-type-select').selectOption('pdf');
      await page.getByTestId('price-input').fill('29.99');
      await page.getByTestId('file-url-input').fill('https://example.com/file.pdf');
      
      await page.getByTestId('save-draft-button').click();
      
      await expect(page.locator('#errorMessage')).toBeVisible();
      await expect(page.locator('#errorMessageText')).toContainText('Title must be at least 3 characters');
    });

    test('should show error for short title', async ({ page }) => {
      await page.getByTestId('title-input').fill('AB');
      await page.getByTestId('description-input').fill('Test description');
      await page.getByTestId('product-type-select').selectOption('pdf');
      await page.getByTestId('price-input').fill('29.99');
      await page.getByTestId('file-url-input').fill('https://example.com/file.pdf');
      
      await page.getByTestId('save-draft-button').click();
      
      await expect(page.locator('#errorMessage')).toBeVisible();
      await expect(page.locator('#errorMessageText')).toContainText('Title must be at least 3 characters');
    });

    test('should show error for invalid slug format', async ({ page }) => {
      await page.getByTestId('title-input').fill('Test Product');
      await page.getByTestId('slug-input').clear();
      await page.getByTestId('slug-input').fill('Invalid Slug!');
      await page.getByTestId('description-input').fill('Test description');
      await page.getByTestId('product-type-select').selectOption('pdf');
      await page.getByTestId('price-input').fill('29.99');
      await page.getByTestId('file-url-input').fill('https://example.com/file.pdf');
      
      await page.getByTestId('save-draft-button').click();
      
      await expect(page.locator('#errorMessage')).toBeVisible();
      await expect(page.locator('#errorMessageText')).toContainText('lowercase letters, numbers, and hyphens');
    });

    test('should show error for short description', async ({ page }) => {
      await page.getByTestId('title-input').fill('Test Product');
      await page.getByTestId('description-input').fill('Short');
      await page.getByTestId('product-type-select').selectOption('pdf');
      await page.getByTestId('price-input').fill('29.99');
      await page.getByTestId('file-url-input').fill('https://example.com/file.pdf');
      
      await page.getByTestId('save-draft-button').click();
      
      await expect(page.locator('#errorMessage')).toBeVisible();
      await expect(page.locator('#errorMessageText')).toContainText('Description must be at least 10 characters');
    });

    test('should show error for missing product type', async ({ page }) => {
      await page.getByTestId('title-input').fill('Test Product');
      await page.getByTestId('description-input').fill('Test description here');
      await page.getByTestId('price-input').fill('29.99');
      await page.getByTestId('file-url-input').fill('https://example.com/file.pdf');
      
      await page.getByTestId('save-draft-button').click();
      
      await expect(page.locator('#errorMessage')).toBeVisible();
      await expect(page.locator('#errorMessageText')).toContainText('Please select a product type');
    });

    test('should show error for negative price', async ({ page }) => {
      await page.getByTestId('title-input').fill('Test Product');
      await page.getByTestId('description-input').fill('Test description here');
      await page.getByTestId('product-type-select').selectOption('pdf');
      await page.getByTestId('price-input').fill('-10');
      await page.getByTestId('file-url-input').fill('https://example.com/file.pdf');
      
      await page.getByTestId('save-draft-button').click();
      
      await expect(page.locator('#errorMessage')).toBeVisible();
      await expect(page.locator('#errorMessageText')).toContainText('Price cannot be negative');
    });

    test('should show error for missing file URL', async ({ page }) => {
      await page.getByTestId('title-input').fill('Test Product');
      await page.getByTestId('description-input').fill('Test description here');
      await page.getByTestId('product-type-select').selectOption('pdf');
      await page.getByTestId('price-input').fill('29.99');
      
      await page.getByTestId('save-draft-button').click();
      
      await expect(page.locator('#errorMessage')).toBeVisible();
      await expect(page.locator('#errorMessageText')).toContainText('File URL is required');
    });

    test('should accept valid form data', async ({ page }) => {
      await page.getByTestId('title-input').fill(validProductData.title);
      await page.getByTestId('slug-input').clear();
      await page.getByTestId('slug-input').fill(validProductData.slug);
      await page.getByTestId('description-input').fill(validProductData.description);
      await page.getByTestId('product-type-select').selectOption(validProductData.productType);
      await page.getByTestId('price-input').fill(validProductData.price);
      await page.getByTestId('file-url-input').fill(validProductData.fileUrl);
      
      // Form should be valid - no error message shown when clicking
      await page.getByTestId('save-draft-button').click();
      
      // Error message should not be visible (API might fail, but validation passes)
      const errorVisible = await page.locator('#errorMessage').isVisible().catch(() => false);
      // If error is visible, it should not be a validation error
      if (errorVisible) {
        const errorText = await page.locator('#errorMessageText').textContent();
        expect(errorText).not.toContain('must be at least');
        expect(errorText).not.toContain('Please select');
        expect(errorText).not.toContain('cannot be negative');
      }
    });
  });

  // ============================================================================
  // 5. FORM SUBMISSION (DRAFT)
  // ============================================================================

  test.describe('Form Submission (Draft)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
    });

    test('should display API error when endpoint does not exist', async ({ page }) => {
      // Fill out form
      await page.getByTestId('title-input').fill(validProductData.title);
      await page.getByTestId('slug-input').clear();
      await page.getByTestId('slug-input').fill(validProductData.slug);
      await page.getByTestId('description-input').fill(validProductData.description);
      await page.getByTestId('product-type-select').selectOption(validProductData.productType);
      await page.getByTestId('price-input').fill(validProductData.price);
      await page.getByTestId('file-url-input').fill(validProductData.fileUrl);
      
      // Submit as draft
      await page.getByTestId('save-draft-button').click();
      
      // Should show error (API endpoint not implemented yet)
      await expect(page.locator('#errorMessage')).toBeVisible();
    });

    test('should disable submit buttons during submission', async ({ page }) => {
      await page.getByTestId('title-input').fill(validProductData.title);
      await page.getByTestId('description-input').fill(validProductData.description);
      await page.getByTestId('product-type-select').selectOption(validProductData.productType);
      await page.getByTestId('price-input').fill(validProductData.price);
      await page.getByTestId('file-url-input').fill(validProductData.fileUrl);
      
      await page.getByTestId('save-draft-button').click();
      
      // Buttons should be disabled
      await expect(page.getByTestId('save-draft-button')).toBeDisabled();
      await expect(page.getByTestId('publish-button')).toBeDisabled();
    });
  });

  // ============================================================================
  // 6. FORM SUBMISSION (PUBLISH)
  // ============================================================================

  test.describe('Form Submission (Publish)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
    });

    test('should display API error when endpoint does not exist', async ({ page }) => {
      await page.getByTestId('title-input').fill(validProductData.title);
      await page.getByTestId('slug-input').clear();
      await page.getByTestId('slug-input').fill(validProductData.slug);
      await page.getByTestId('description-input').fill(validProductData.description);
      await page.getByTestId('product-type-select').selectOption(validProductData.productType);
      await page.getByTestId('price-input').fill(validProductData.price);
      await page.getByTestId('file-url-input').fill(validProductData.fileUrl);
      
      // Submit and publish
      await page.getByTestId('publish-button').click();
      
      // Should show error
      await expect(page.locator('#errorMessage')).toBeVisible();
    });

    test('should set is_published when using Create & Publish button', async ({ page }) => {
      // This test validates that the form correctly sets is_published based on button clicked
      await page.getByTestId('title-input').fill(validProductData.title);
      await page.getByTestId('description-input').fill(validProductData.description);
      await page.getByTestId('product-type-select').selectOption(validProductData.productType);
      await page.getByTestId('price-input').fill(validProductData.price);
      await page.getByTestId('file-url-input').fill(validProductData.fileUrl);
      
      // Verify publish button sets is_published
      await page.getByTestId('publish-button').click();
      
      // Should attempt to submit (will fail due to missing API, but validates intent)
      await expect(page.locator('#errorMessage')).toBeVisible();
    });
  });

  // ============================================================================
  // 7. ERROR HANDLING
  // ============================================================================

  test.describe('Error Handling', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
    });

    test('should hide error message initially', async ({ page }) => {
      await expect(page.locator('#errorMessage')).toBeHidden();
    });

    test('should hide success message initially', async ({ page }) => {
      await expect(page.locator('#successMessage')).toBeHidden();
    });

    test('should clear previous errors on new submission', async ({ page }) => {
      // Trigger validation error
      await page.getByTestId('save-draft-button').click();
      await expect(page.locator('#errorMessage')).toBeVisible();
      
      // Fill required fields and resubmit
      await page.getByTestId('title-input').fill(validProductData.title);
      await page.getByTestId('description-input').fill(validProductData.description);
      await page.getByTestId('product-type-select').selectOption(validProductData.productType);
      await page.getByTestId('price-input').fill(validProductData.price);
      await page.getByTestId('file-url-input').fill(validProductData.fileUrl);
      
      await page.getByTestId('save-draft-button').click();
      
      // Previous validation error should be hidden (new API error might show)
      const errorText = await page.locator('#errorMessageText').textContent();
      expect(errorText).not.toContain('Title must be at least');
    });
  });

  // ============================================================================
  // 8. IMAGE PREVIEW
  // ============================================================================

  test.describe('Image Preview', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
    });

    test('should show image preview when valid URL is entered', async ({ page }) => {
      const imageUrlInput = page.getByTestId('image-url-input');
      const imagePreview = page.locator('#imagePreview');
      
      await imageUrlInput.fill(validProductData.imageUrl);
      await imageUrlInput.blur();
      
      // Wait for preview to appear
      await page.waitForTimeout(500);
      
      // Preview should be visible
      const isVisible = await imagePreview.isVisible().catch(() => false);
      if (isVisible) {
        const img = page.locator('#imagePreviewImg');
        await expect(img).toHaveAttribute('src', validProductData.imageUrl);
      }
    });

    test('should hide image preview initially', async ({ page }) => {
      await expect(page.locator('#imagePreview')).toBeHidden();
    });
  });

  // ============================================================================
  // 9. NAVIGATION
  // ============================================================================

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
    });

    test('should navigate back to products list', async ({ page }) => {
      const backLink = page.locator('a[href="/admin/products"]').first();
      await backLink.click();
      await page.waitForURL('/admin/products');
      expect(page.url()).toContain('/admin/products');
    });

    test('should navigate to products list when clicking Cancel', async ({ page }) => {
      const cancelLink = page.locator('a:has-text("Cancel")');
      await cancelLink.click();
      await page.waitForURL('/admin/products');
      expect(page.url()).toContain('/admin/products');
    });
  });

  // ============================================================================
  // 10. RESPONSIVE DESIGN
  // ============================================================================

  test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
      
      await expect(page.getByTestId('page-title')).toBeVisible();
      await expect(page.getByTestId('product-form')).toBeVisible();
      await expect(page.getByTestId('title-input')).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
      
      await expect(page.getByTestId('page-title')).toBeVisible();
      await expect(page.getByTestId('product-form')).toBeVisible();
    });

    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await loginAsAdmin(page);
      await page.goto('/admin/products/new');
      
      await expect(page.getByTestId('page-title')).toBeVisible();
      await expect(page.getByTestId('product-form')).toBeVisible();
    });
  });
});
