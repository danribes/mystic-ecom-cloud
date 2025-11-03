/**
 * T070: File Upload Integration Tests
 * 
 * Tests the FileUpload component integration with course forms:
 * - Upload image during course creation
 * - Upload image during course editing
 * - Verify uploaded URLs are saved correctly
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.describe('FileUpload Integration (T070)', () => {
  let testUser: User;

  test.beforeAll(async () => {
    // Create test admin user
    testUser = await createTestUser({ role: 'admin' });
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser.id);
  });

  test('should upload image during course creation', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/admin/courses/new');
    await page.waitForLoadState('networkidle');

    // Upload main image using FileUpload component
    const testImagePath = join(__dirname, '../fixtures/test-image.png');
    const fileInput = page.locator('input[type="file"]#file-upload-imageUrl');
    await fileInput.setInputFiles(testImagePath);

    // Wait for upload to complete and progress to reach 100%
    await page.waitForTimeout(3000);

    // Verify the hidden input has been populated with the uploaded URL
    const hiddenInput = page.locator('input[type="hidden"]#imageUrl');
    const imageUrl = await hiddenInput.inputValue();
    expect(imageUrl).toBeTruthy();
    expect(imageUrl).toContain('/uploads/images/');
    
    // Verify preview is visible
    const previewImage = page.locator('[data-preview-image]').first();
    await expect(previewImage).toBeVisible();
  });

  test('should show preview of uploaded image', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/admin/courses/new');
    await page.waitForLoadState('networkidle');

    // Upload image
    const testImagePath = join(__dirname, '../fixtures/test-image.png');
    const fileInput = page.locator('input[type="file"]#file-upload-imageUrl');
    await fileInput.setInputFiles(testImagePath);

    // Wait for preview to appear
    await page.waitForSelector('[data-preview-area]:not(.hidden)', { timeout: 3000 });

    // Verify preview image is visible
    const previewImage = page.locator('[data-preview-image]').first();
    await expect(previewImage).toBeVisible();
    
    // Verify preview has a valid src
    const src = await previewImage.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toContain('data:image');
  });

  test('should allow removing uploaded image', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/admin/courses/new');
    await page.waitForLoadState('networkidle');

    // Upload image
    const testImagePath = join(__dirname, '../fixtures/test-image.png');
    const fileInput = page.locator('input[type="file"]#file-upload-imageUrl');
    await fileInput.setInputFiles(testImagePath);

    // Wait for preview and remove button to appear
    await page.waitForSelector('[data-preview-area]:not(.hidden)', { timeout: 3000 });
    const removeButton = page.locator('[data-remove-file]').first();
    await expect(removeButton).toBeVisible();

    // Click remove button
    await removeButton.click();

    // Wait for preview to disappear
    await page.waitForSelector('[data-preview-area].hidden', { timeout: 2000 });

    // Verify hidden input is cleared
    const hiddenInput = page.locator('input[type="hidden"]#imageUrl');
    const imageUrl = await hiddenInput.inputValue();
    expect(imageUrl).toBe('');
  });

  test('should upload multiple media types in one form', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/admin/courses/new');
    await page.waitForLoadState('networkidle');

    // Fill required fields
    await page.fill('#title', 'Course with Multiple Media');
    await page.fill('#slug', 'course-with-multiple-media');
    await page.fill('#description', 'Testing multiple file uploads');
    await page.fill('#price', '5000');
    await page.fill('#duration', '1800');
    await page.selectOption('#level', 'intermediate');
    await page.fill('#category', 'Testing');

    // Upload main image
    const testImagePath = join(__dirname, '../fixtures/test-image.png');
    const imageInput = page.locator('input[type="file"]#file-upload-imageUrl');
    await imageInput.setInputFiles(testImagePath);
    await page.waitForTimeout(1000);

    // Upload thumbnail
    const thumbnailInput = page.locator('input[type="file"]#file-upload-thumbnailUrl');
    await thumbnailInput.setInputFiles(testImagePath);
    await page.waitForTimeout(1000);

    // Verify both hidden inputs are populated
    const imageUrl = await page.locator('input[type="hidden"]#imageUrl').inputValue();
    const thumbnailUrl = await page.locator('input[type="hidden"]#thumbnailUrl').inputValue();
    
    expect(imageUrl).toBeTruthy();
    expect(imageUrl).toContain('/uploads/images/');
    expect(thumbnailUrl).toBeTruthy();
    expect(thumbnailUrl).toContain('/uploads/images/');
    
    // They should have different filenames
    expect(imageUrl).not.toBe(thumbnailUrl);
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/admin/courses/new');
    await page.waitForLoadState('networkidle');

    // Try to upload an invalid file type (text file for image field)
    const testFilePath = join(__dirname, '../fixtures/test-document.txt');
    const fileInput = page.locator('input[type="file"]#file-upload-imageUrl');
    await fileInput.setInputFiles(testFilePath);

    // Wait for error message
    await page.waitForSelector('[data-error-message]:not(.hidden)', { timeout: 3000 });

    // Verify error message is visible
    const errorMessage = page.locator('[data-error-message]').first();
    await expect(errorMessage).toBeVisible();
    
    // Verify hidden input is NOT populated
    const hiddenInput = page.locator('input[type="hidden"]#imageUrl');
    const imageUrl = await hiddenInput.inputValue();
    expect(imageUrl).toBe('');
  });
});
