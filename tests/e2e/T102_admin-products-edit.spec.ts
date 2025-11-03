/**
 * T102: E2E Tests for Admin Edit Digital Product Page
 * 
 * Tests for editing existing digital products
 */

import { test, expect } from '@playwright/test';

const TEST_ADMIN_EMAIL = 'test-admin@example.com';
const TEST_ADMIN_PASSWORD = 'test-admin-password';

// Test product data
const TEST_PRODUCT = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'Test Product for Edit',
  slug: 'test-product-for-edit',
  description: 'Test description for editing',
  price: 29.99,
  product_type: 'pdf',
  file_url: 'https://storage.example.com/test.pdf',
  file_size_mb: 5.5,
  preview_url: 'https://storage.example.com/test-preview.pdf',
  image_url: 'https://storage.example.com/test-image.jpg',
  download_limit: 5,
  is_published: true
};

test.describe('Admin Products Edit Page - Authentication', () => {
  
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/admin/products/00000000-0000-0000-0000-000000000001/edit');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
  
});

test.describe('Admin Products Edit Page - Page Structure', () => {
  
  test('should display page title and header', async ({ page }) => {
    // Setup: Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Navigate to edit page
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Check page title
    const pageTitle = page.getByTestId('page-title');
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toHaveText('Edit Product');
    
    // Check back button
    const backButton = page.locator('a[href="/admin/products"]').first();
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Back to Products');
  });
  
  test('should display all four form sections', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Check all section headers
    await expect(page.locator('text=Basic Information')).toBeVisible();
    await expect(page.locator('text=Product Details')).toBeVisible();
    await expect(page.locator('text=Files & Media')).toBeVisible();
    await expect(page.locator('text=Publishing Options')).toBeVisible();
  });
  
  test('should display product form with data-testid', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const form = page.getByTestId('product-form');
    await expect(form).toBeVisible();
  });
  
  test('should display metadata section with timestamps', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Check for metadata labels
    await expect(page.locator('text=Created')).toBeVisible();
    await expect(page.locator('text=Last Updated')).toBeVisible();
  });
  
});

test.describe('Admin Products Edit Page - Data Loading', () => {
  
  test('should redirect to products list with error if product not found', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Try to edit non-existent product
    await page.goto('/admin/products/99999999-9999-9999-9999-999999999999/edit');
    
    // Should redirect to products list with error
    await expect(page).toHaveURL(/\/admin\/products\?error=not-found/);
  });
  
  test('should redirect if no ID provided', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Try to navigate without ID (invalid route)
    await page.goto('/admin/products//edit');
    
    // Should redirect back to products list
    await expect(page).toHaveURL(/\/admin\/products/);
  });
  
});

test.describe('Admin Products Edit Page - Form Pre-population', () => {
  
  test('should pre-populate title field with existing value', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const titleInput = page.getByTestId('title-input');
    await expect(titleInput).toHaveValue(TEST_PRODUCT.title);
  });
  
  test('should pre-populate slug field with existing value', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const slugInput = page.getByTestId('slug-input');
    await expect(slugInput).toHaveValue(TEST_PRODUCT.slug);
    await expect(slugInput).toHaveAttribute('data-original-slug', TEST_PRODUCT.slug);
  });
  
  test('should pre-populate description field with existing value', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const descriptionInput = page.getByTestId('description-input');
    await expect(descriptionInput).toHaveValue(TEST_PRODUCT.description);
  });
  
  test('should pre-select product type dropdown', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const productTypeSelect = page.getByTestId('product-type-select');
    await expect(productTypeSelect).toHaveValue(TEST_PRODUCT.product_type);
  });
  
  test('should pre-populate price field with formatted value', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const priceInput = page.getByTestId('price-input');
    await expect(priceInput).toHaveValue(TEST_PRODUCT.price.toFixed(2));
  });
  
  test('should pre-populate file size field', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const fileSizeInput = page.getByTestId('file-size-input');
    await expect(fileSizeInput).toHaveValue(TEST_PRODUCT.file_size_mb.toFixed(2));
  });
  
  test('should pre-populate download limit field', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const downloadLimitInput = page.getByTestId('download-limit-input');
    await expect(downloadLimitInput).toHaveValue(TEST_PRODUCT.download_limit.toString());
  });
  
  test('should pre-populate all URL fields', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const fileUrlInput = page.getByTestId('file-url-input');
    await expect(fileUrlInput).toHaveValue(TEST_PRODUCT.file_url);
    
    const previewUrlInput = page.getByTestId('preview-url-input');
    await expect(previewUrlInput).toHaveValue(TEST_PRODUCT.preview_url);
    
    const imageUrlInput = page.getByTestId('image-url-input');
    await expect(imageUrlInput).toHaveValue(TEST_PRODUCT.image_url);
  });
  
  test('should check published checkbox if product is published', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const publishedCheckbox = page.getByTestId('is-published-checkbox');
    if (TEST_PRODUCT.is_published) {
      await expect(publishedCheckbox).toBeChecked();
    } else {
      await expect(publishedCheckbox).not.toBeChecked();
    }
  });
  
});

test.describe('Admin Products Edit Page - Slug Warning', () => {
  
  test('should show warning when slug is modified', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const slugInput = page.getByTestId('slug-input');
    const slugWarning = page.locator('#slugWarning');
    
    // Initially hidden
    await expect(slugWarning).toHaveCSS('display', 'none');
    
    // Change slug
    await slugInput.fill('new-different-slug');
    await slugInput.blur();
    
    // Warning should appear
    await expect(slugWarning).toHaveCSS('display', 'block');
    await expect(slugWarning).toContainText('Changing the slug will break existing links');
  });
  
  test('should hide warning when slug reverted to original', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const slugInput = page.getByTestId('slug-input');
    const slugWarning = page.locator('#slugWarning');
    
    // Change slug
    await slugInput.fill('new-slug');
    await slugInput.blur();
    await expect(slugWarning).toHaveCSS('display', 'block');
    
    // Revert to original
    await slugInput.fill(TEST_PRODUCT.slug);
    await slugInput.blur();
    await expect(slugWarning).toHaveCSS('display', 'none');
  });
  
});

test.describe('Admin Products Edit Page - Form Interactions', () => {
  
  test('should still auto-generate slug from title if slug is empty', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const titleInput = page.getByTestId('title-input');
    const slugInput = page.getByTestId('slug-input');
    
    // Clear slug
    await slugInput.fill('');
    
    // Change title
    await titleInput.fill('New Product Title');
    
    // Slug should auto-generate
    await expect(slugInput).toHaveValue('new-product-title');
  });
  
  test('should show image preview for valid image URL', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Image preview should be visible if product has image_url
    if (TEST_PRODUCT.image_url) {
      const imagePreview = page.locator('#imagePreview');
      await expect(imagePreview).toBeVisible();
      
      const previewImg = page.locator('#imagePreviewImg');
      await expect(previewImg).toHaveAttribute('src', TEST_PRODUCT.image_url);
    }
  });
  
  test('should update image preview when URL changes', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const imageUrlInput = page.getByTestId('image-url-input');
    const imagePreview = page.locator('#imagePreview');
    const previewImg = page.locator('#imagePreviewImg');
    
    // Change to new URL
    const newImageUrl = 'https://storage.example.com/new-image.jpg';
    await imageUrlInput.fill(newImageUrl);
    await imageUrlInput.blur();
    
    // Wait for preview to update
    await page.waitForTimeout(100);
    
    await expect(imagePreview).toBeVisible();
    await expect(previewImg).toHaveAttribute('src', newImageUrl);
  });
  
  test('should hide image preview for empty URL', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const imageUrlInput = page.getByTestId('image-url-input');
    const imagePreview = page.locator('#imagePreview');
    
    // Clear image URL
    await imageUrlInput.fill('');
    await imageUrlInput.blur();
    
    // Preview should be hidden
    await expect(imagePreview).toBeHidden();
  });
  
});

test.describe('Admin Products Edit Page - Form Validation', () => {
  
  test('should show error for empty title', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const titleInput = page.getByTestId('title-input');
    const saveButton = page.getByTestId('save-button');
    
    // Clear title
    await titleInput.fill('');
    
    // Try to submit
    await saveButton.click();
    
    // Error message should appear
    const errorMessage = page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
    await expect(page.locator('#errorMessageText')).toContainText('at least 3 characters');
  });
  
  test('should show error for invalid slug format', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const slugInput = page.getByTestId('slug-input');
    const saveButton = page.getByTestId('save-button');
    
    // Set invalid slug (uppercase and spaces)
    await slugInput.fill('Invalid Slug!');
    
    // Try to submit
    await saveButton.click();
    
    // Error message should appear
    const errorMessage = page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
    await expect(page.locator('#errorMessageText')).toContainText('lowercase letters, numbers, and hyphens');
  });
  
  test('should show error for short description', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const descriptionInput = page.getByTestId('description-input');
    const saveButton = page.getByTestId('save-button');
    
    // Set short description
    await descriptionInput.fill('Short');
    
    // Try to submit
    await saveButton.click();
    
    // Error message should appear
    const errorMessage = page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
    await expect(page.locator('#errorMessageText')).toContainText('at least 10 characters');
  });
  
  test('should show error for missing product type', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const productTypeSelect = page.getByTestId('product-type-select');
    const saveButton = page.getByTestId('save-button');
    
    // Clear selection
    await productTypeSelect.selectOption('');
    
    // Try to submit
    await saveButton.click();
    
    // Error message should appear
    const errorMessage = page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
    await expect(page.locator('#errorMessageText')).toContainText('select a product type');
  });
  
  test('should show error for negative price', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const priceInput = page.getByTestId('price-input');
    const saveButton = page.getByTestId('save-button');
    
    // Set negative price
    await priceInput.fill('-10');
    
    // Try to submit
    await saveButton.click();
    
    // Error message should appear
    const errorMessage = page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
    await expect(page.locator('#errorMessageText')).toContainText('cannot be negative');
  });
  
  test('should show error for empty file URL', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const fileUrlInput = page.getByTestId('file-url-input');
    const saveButton = page.getByTestId('save-button');
    
    // Clear file URL
    await fileUrlInput.fill('');
    
    // Try to submit
    await saveButton.click();
    
    // Error message should appear
    const errorMessage = page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
    await expect(page.locator('#errorMessageText')).toContainText('File URL is required');
  });
  
});

test.describe('Admin Products Edit Page - Form Submission', () => {
  
  test('should disable submit button during submission', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    const saveButton = page.getByTestId('save-button');
    
    // Submit form
    await saveButton.click();
    
    // Button should be disabled
    await expect(saveButton).toBeDisabled();
    await expect(saveButton).toHaveClass(/opacity-50/);
    await expect(saveButton).toHaveClass(/cursor-not-allowed/);
  });
  
  test('should submit product data to PUT endpoint', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Listen for API request
    const apiRequest = page.waitForRequest(request => 
      request.url().includes(`/api/admin/products/${TEST_PRODUCT.id}`) &&
      request.method() === 'PUT'
    );
    
    // Submit form
    const saveButton = page.getByTestId('save-button');
    await saveButton.click();
    
    // Verify request was made
    const request = await apiRequest;
    expect(request.method()).toBe('PUT');
  });
  
  test('should include all form fields in submission', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Capture API request payload
    let requestBody: any;
    page.on('request', request => {
      if (request.url().includes(`/api/admin/products/${TEST_PRODUCT.id}`) && request.method() === 'PUT') {
        requestBody = request.postDataJSON();
      }
    });
    
    // Submit form
    const saveButton = page.getByTestId('save-button');
    await saveButton.click();
    
    // Wait for request
    await page.waitForTimeout(500);
    
    // Verify all required fields are present
    expect(requestBody).toHaveProperty('title');
    expect(requestBody).toHaveProperty('slug');
    expect(requestBody).toHaveProperty('description');
    expect(requestBody).toHaveProperty('product_type');
    expect(requestBody).toHaveProperty('price');
    expect(requestBody).toHaveProperty('file_url');
    expect(requestBody).toHaveProperty('is_published');
  });
  
  test('should show success message after successful update', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Mock successful API response
    await page.route(`/api/admin/products/${TEST_PRODUCT.id}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true,
          product: { ...TEST_PRODUCT }
        })
      });
    });
    
    // Submit form
    const saveButton = page.getByTestId('save-button');
    await saveButton.click();
    
    // Success message should appear
    const successMessage = page.locator('#successMessage');
    await expect(successMessage).toBeVisible();
    await expect(page.locator('#successMessageText')).toContainText('updated successfully');
  });
  
  test('should redirect to products list after successful update', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Mock successful API response
    await page.route(`/api/admin/products/${TEST_PRODUCT.id}`, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true,
          product: { ...TEST_PRODUCT }
        })
      });
    });
    
    // Submit form
    const saveButton = page.getByTestId('save-button');
    await saveButton.click();
    
    // Should redirect after 2 seconds
    await page.waitForTimeout(2500);
    await expect(page).toHaveURL('/admin/products');
  });
  
  test('should show error message for failed update', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Mock failed API response
    await page.route(`/api/admin/products/${TEST_PRODUCT.id}`, route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Slug already exists'
        })
      });
    });
    
    // Submit form
    const saveButton = page.getByTestId('save-button');
    await saveButton.click();
    
    // Error message should appear
    const errorMessage = page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
    await expect(page.locator('#errorMessageText')).toContainText('Slug already exists');
  });
  
  test('should re-enable submit button after failed update', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Mock failed API response
    await page.route(`/api/admin/products/${TEST_PRODUCT.id}`, route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Internal server error'
        })
      });
    });
    
    const saveButton = page.getByTestId('save-button');
    
    // Submit form
    await saveButton.click();
    
    // Wait for error handling
    await page.waitForTimeout(500);
    
    // Button should be re-enabled
    await expect(saveButton).not.toBeDisabled();
    await expect(saveButton).not.toHaveClass(/opacity-50/);
  });
  
});

test.describe('Admin Products Edit Page - Cancel Button', () => {
  
  test('should navigate back to products list when cancel clicked', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.goto(`/admin/products/${TEST_PRODUCT.id}/edit`);
    
    // Click cancel button
    const cancelButton = page.locator('a[href="/admin/products"]').filter({ hasText: 'Cancel' });
    await cancelButton.click();
    
    // Should navigate to products list
    await expect(page).toHaveURL('/admin/products');
  });
  
});
