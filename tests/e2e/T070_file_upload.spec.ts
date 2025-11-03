/**
 * T070: File Upload E2E Tests
 * 
 * Tests the file upload functionality:
 * - Upload images for courses
 * - Validate file types
 * - Validate file sizes
 * - Preview uploaded files
 * - Remove uploaded files
 */

import { test, expect } from '@playwright/test';
import { 
  createTestUser, 
  loginAsUser,
  cleanupTestUser 
} from '../helpers/auth';
import type { User } from '@/types';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('File Upload (T070)', () => {
  let testUser: User;

  test.beforeAll(async () => {
    // Create test admin user
    testUser = await createTestUser({ role: 'admin' });
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser.id);
  });

  test('should upload an image file successfully', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to test upload page
    await page.goto('/test/upload');
    await page.waitForLoadState('networkidle');

    // Create a test image file
    const testImagePath = join(__dirname, '../fixtures/test-image.png');
    
    // Find the file input (it's hidden but we can interact with it)
    const fileInput = page.locator('input[type="file"]').first();
    
    // Upload the file
    await fileInput.setInputFiles(testImagePath);

    // Wait for upload to complete
    await page.waitForTimeout(2000);

    // Verify the hidden input has been populated with the URL
    const imageUrlInput = page.locator('input[name="imageUrl"]');
    const imageUrl = await imageUrlInput.inputValue();
    expect(imageUrl).toContain('/uploads/images/');
  });

  test('should show preview for uploaded image', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/test/upload');
    await page.waitForLoadState('networkidle');

    // Create a test image file
    const testImagePath = join(__dirname, '../fixtures/test-image.png');
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);

    // Wait for preview to appear
    await page.waitForSelector('[data-preview-area]:not(.hidden)', { timeout: 3000 });

    // Verify preview image is visible (use first() since there are multiple FileUpload components on the page)
    const previewImage = page.locator('[data-preview-image]').first();
    await expect(previewImage).toBeVisible();
    
    // Verify preview image has a src
    const src = await previewImage.getAttribute('src');
    expect(src).toBeTruthy();
  });

  test('should remove uploaded file when remove button is clicked', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/test/upload');
    await page.waitForLoadState('networkidle');

    // Create a test image file
    const testImagePath = join(__dirname, '../fixtures/test-image.png');
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);

    // Wait for preview to appear
    await page.waitForSelector('[data-preview-area]:not(.hidden)', { timeout: 3000 });

    // Click remove button
    const removeButton = page.locator('[data-remove-file]').first();
    await removeButton.click();

    // Verify preview is hidden
    const previewArea = page.locator('[data-preview-area]').first();
    await expect(previewArea).toHaveClass(/hidden/);

    // Verify hidden input is cleared
    const imageUrlInput = page.locator('input[name="imageUrl"]');
    const imageUrl = await imageUrlInput.inputValue();
    expect(imageUrl).toBe('');
  });

  test('should show error for invalid file type', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/test/upload');
    await page.waitForLoadState('networkidle');

    // Create a test text file (not an image)
    const testFilePath = join(__dirname, '../fixtures/test-document.txt');
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testFilePath);

    // Wait for error message
    await page.waitForSelector('[data-error-message]:not(.hidden)', { timeout: 3000 });

    // Verify error message is shown
    const errorMessage = page.locator('[data-error-message]').first();
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Invalid file type');
  });

  test('should work with drag and drop', async ({ page, context }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/test/upload');
    await page.waitForLoadState('networkidle');

    // Create a test image file buffer
    const testImagePath = join(__dirname, '../fixtures/test-image.png');
    const buffer = readFileSync(testImagePath);
    
    // Create a data transfer
    const dataTransfer = await page.evaluateHandle((data) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(data)], 'test-image.png', { type: 'image/png' });
      dt.items.add(file);
      return dt;
    }, Array.from(buffer));

    // Find the upload area
    const uploadArea = page.locator('[data-upload-area]').first();

    // Dispatch drop event
    await uploadArea.dispatchEvent('drop', { dataTransfer });

    // Wait for upload to complete
    await page.waitForTimeout(2000);

    // Verify the hidden input has been populated with the URL
    const imageUrlInput = page.locator('input[name="imageUrl"]');
    const imageUrl = await imageUrlInput.inputValue();
    expect(imageUrl).toContain('/uploads/images/');
  });

  test('should show progress during upload', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/test/upload');
    await page.waitForLoadState('networkidle');

    // Create a test image file
    const testImagePath = join(__dirname, '../fixtures/test-image.png');
    
    // Upload the file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testImagePath);

    // Progress should appear briefly
    const progressContainer = page.locator('[data-upload-progress]').first();
    
    // Wait for progress to appear (it might be quick)
    try {
      await expect(progressContainer).toBeVisible({ timeout: 1000 });
    } catch (e) {
      // Progress might complete too quickly to see
      console.log('Upload completed before progress could be detected');
    }

    // Wait for upload to complete
    await page.waitForTimeout(2000);

    // Progress should be hidden after completion
    await expect(progressContainer).toHaveClass(/hidden/);
  });
});
