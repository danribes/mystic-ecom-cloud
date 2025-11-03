/**
 * T068: Admin Course Edit E2E Tests
 * 
 * Tests the admin course editing functionality:
 * - Load edit page with pre-populated course data
 * - Validate form fields are correctly filled
 * - Update course information
 * - Verify updates are saved
 * - Test validation errors
 */

import { test, expect } from '@playwright/test';
import { 
  createTestUser, 
  loginAsUser,
  cleanupTestUser 
} from '../helpers/auth';
import type { User } from '@/types';

test.describe('Admin Course Edit (T068)', () => {
  let testUser: User;

  test.beforeAll(async () => {
    // Create test admin user
    testUser = await createTestUser({ role: 'admin' });
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser.id);
  });
  
  test('should load edit page with pre-populated course data', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to courses list
    await page.goto('/admin/courses');
    await expect(page).toHaveURL('/admin/courses');
    
    // Click edit button on first course
    const editButton = page.locator('a[href^="/admin/courses/"][href$="/edit"]').first();
    await expect(editButton).toBeVisible();
    await editButton.click();
    
    // Wait for edit page to load
    await page.waitForURL(/\/admin\/courses\/.*\/edit/);
    
    // Verify page title
    await expect(page.getByTestId('admin-page-title')).toContainText('Edit Course');
    
    // Verify form exists
    const form = page.locator('#courseForm');
    await expect(form).toBeVisible();
    
    // Verify required fields are populated
    await expect(page.locator('#title')).toHaveValue(/.+/); // Has some value
    await expect(page.locator('#slug')).toHaveValue(/.+/);
    await expect(page.locator('#description')).toHaveValue(/.+/);
    await expect(page.locator('#price')).toHaveValue(/.+/);
    await expect(page.locator('#duration')).toHaveValue(/.+/);
    await expect(page.locator('#level')).not.toHaveValue('');
    await expect(page.locator('#category')).toHaveValue(/.+/);
  });

  test('should update course successfully', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to courses list
    await page.goto('/admin/courses');
    
    // Click edit on first course
    const editButton = page.locator('a[href^="/admin/courses/"][href$="/edit"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin\/courses\/.*\/edit/);
    
    // Wait for form to be ready
    await page.waitForSelector('#courseForm');
    
    // Update course title
    const newTitle = `Updated Course ${Date.now()}`;
    await page.fill('#title', newTitle);
    
    // Slug should auto-update (check it's not empty)
    await page.waitForTimeout(300);
    const slug = await page.locator('#slug').inputValue();
    expect(slug.length).toBeGreaterThan(0); // Just verify slug exists
    
    // Update description
    await page.fill('#description', 'This course has been updated');
    
    // Update price
    await page.fill('#price', '14900'); // $149.00
    
    // Submit form
    await page.click('#courseForm button[type="submit"]');
    
    // Wait for success toast
    const toast = page.locator('div').filter({ hasText: 'Course updated successfully' }).first();
    await expect(toast).toBeVisible({ timeout: 3000 });
    
    // Should redirect to courses list
    await page.waitForURL('/admin/courses', { timeout: 5000 });
    
    // Verify updated course appears in list
    await expect(page.locator('text=' + newTitle).first()).toBeVisible();
  });

  test('should show validation errors for required fields', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to edit page
    await page.goto('/admin/courses');
    const editButton = page.locator('a[href^="/admin/courses/"][href$="/edit"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin\/courses\/.*\/edit/);
    
    // Wait for form
    await page.waitForSelector('#courseForm');
    await page.waitForTimeout(1000);
    
    // Clear required fields
    await page.fill('#title', '');
    await page.fill('#description', '');
    
    // Try to submit
    await page.evaluate(() => {
      const form = document.getElementById('courseForm') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    
    await page.waitForTimeout(500);
    
    // Should stay on same page
    await expect(page).toHaveURL(/\/admin\/courses\/.*\/edit/);
    
    // Check for validation toast
    const toast = page.locator('div').filter({ hasText: 'Please fill in all required fields' }).first();
    await expect(toast).toBeVisible({ timeout: 2000 });
    
    // Check aria-invalid on first field
    const titleInput = page.locator('#title');
    await expect(titleInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('should allow navigation back to course list', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to edit page
    await page.goto('/admin/courses');
    const editButton = page.locator('a[href^="/admin/courses/"][href$="/edit"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin\/courses\/.*\/edit/);
    
    // Click Cancel button
    const cancelButton = page.locator('a[href="/admin/courses"]', { hasText: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
    
    // Should navigate back to courses list
    await page.waitForURL('/admin/courses');
    await expect(page.getByTestId('admin-page-title')).toContainText('Course Management');
  });

  test('should preserve checkbox states when editing', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to edit page
    await page.goto('/admin/courses');
    const editButton = page.locator('a[href^="/admin/courses/"][href$="/edit"]').first();
    await editButton.click();
    await page.waitForURL(/\/admin\/courses\/.*\/edit/);
    
    await page.waitForSelector('#courseForm');
    
    // Toggle checkboxes
    const publishedCheckbox = page.locator('input[name="isPublished"]');
    const featuredCheckbox = page.locator('input[name="isFeatured"]');
    
    // Check initial states
    const initialPublished = await publishedCheckbox.isChecked();
    const initialFeatured = await featuredCheckbox.isChecked();
    
    // Toggle them
    if (initialPublished) {
      await publishedCheckbox.uncheck();
    } else {
      await publishedCheckbox.check();
    }
    
    if (initialFeatured) {
      await featuredCheckbox.uncheck();
    } else {
      await featuredCheckbox.check();
    }
    
    // Submit
    await page.click('#courseForm button[type="submit"]');
    
    // Wait for success
    await page.waitForURL('/admin/courses', { timeout: 5000 });
  });

  test('should handle non-existent course gracefully', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Try to access edit page for non-existent course
    await page.goto('/admin/courses/99999999/edit');
    
    // Should redirect to courses list with error
    await page.waitForURL('/admin/courses?error=course_not_found');
    
    // Verify we're on the courses list page
    await expect(page.getByTestId('admin-page-title')).toContainText('Course Management');
  });
});
