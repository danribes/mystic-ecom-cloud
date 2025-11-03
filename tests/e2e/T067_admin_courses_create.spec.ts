import { test, expect } from '@playwright/test';
import { 
  createTestUser, 
  loginAsUser,
  cleanupTestUser 
} from '../helpers/auth';
import type { User } from '@/types';

test.describe('Admin Course Creation (T067)', () => {
  let testUser: User;

  test.beforeAll(async () => {
    // Create test admin user
    testUser = await createTestUser({ role: 'admin' });
  });

  test.afterAll(async () => {
    await cleanupTestUser(testUser.id);
  });

  test('should create a new course successfully', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/admin/courses/new');

    // Basic Information
    await page.fill('#title', 'Test Course');
    await page.fill('#slug', 'test-course');
    await page.fill('#description', 'A test course description');
    await page.fill('#longDescription', 'A longer test course description with more details');

    // Course Details
    await page.fill('#price', '9900'); // $99.00
    await page.fill('#duration', '3600'); // 1 hour
    await page.selectOption('#level', 'beginner');
    await page.fill('#category', 'Testing');
    await page.fill('#tags', 'test, automation, e2e');

    // Media Files - Skip file uploads in this test (not required fields)
    // The FileUpload component is now integrated but we'll test it separately in T070

    // Learning Content
    await page.fill('#learningOutcomes', 'Outcome 1\nOutcome 2\nOutcome 3');
    await page.fill('#prerequisites', 'Prereq 1\nPrereq 2');

    // Status
    await page.check('input[name="isPublished"]');

    // Submit form - be specific to target the form's submit button
    await page.click('#courseForm button[type="submit"]');

    // Wait for redirect to course list
    await page.waitForURL('/admin/courses');
    
    // Verify course appears in list - use more specific selectors to avoid strict mode violations
    await expect(page.locator('text=Test Course').first()).toBeVisible();
    await expect(page.locator('text=A test course description').first()).toBeVisible();
  });

  test('should show validation errors for required fields', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/admin/courses/new');
    await expect(page).toHaveURL('/admin/courses/new');
    
    // Wait for form to be ready
    await page.waitForSelector('#courseForm', { timeout: 10000 });
    await page.waitForTimeout(1000); // Give scripts extra time to attach event listeners

    // Submit empty form - trigger submit event directly instead of clicking
    await page.evaluate(() => {
      const form = document.getElementById('courseForm') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    
    // Wait longer for validation to run (toast animation takes time)
    await page.waitForTimeout(500);
    
    // Check if we're still on the same page (validation should prevent navigation)
    await expect(page).toHaveURL('/admin/courses/new');

    // Check for toast error message - use first() to avoid strict mode violation
    const toastContainer = page.locator('div').filter({ hasText: 'Please fill in all required fields' }).first();
    await expect(toastContainer).toBeVisible({ timeout: 2000 });

    // Our custom validation should set aria-invalid on the first invalid field
    const titleInput = page.locator('#title');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveAttribute('aria-invalid', 'true');

    // Fill only required fields
    await page.fill('#title', 'Minimal Course');
    await page.fill('#slug', 'minimal-course');
    await page.fill('#description', 'Minimal description');
    await page.fill('#price', '1000');
    await page.fill('#duration', '1800');
    await page.selectOption('#level', 'beginner');
    await page.fill('#category', 'Test');

    // Submit form - be specific to target the form's submit button
    await page.click('#courseForm button[type="submit"]');

    // Should redirect after successful creation
    await page.waitForURL('/admin/courses');
    await expect(page.getByText('Minimal Course').first()).toBeVisible();
  });

  test('should auto-generate slug from title', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/admin/courses/new');

    // Type a title with special characters - use type() to trigger input events naturally
    const titleInput = page.locator('#title');
    await titleInput.click();
    await titleInput.type('This is a Complex Title! (With Special Characters) & Spaces');
    
    // Wait for slug to be generated
    await page.waitForTimeout(100);
    
    // Check auto-generated slug
    await expect(page.locator('#slug')).toHaveValue('this-is-a-complex-title-with-special-characters-spaces');
  });

  test('should allow navigation back to course list', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testUser.email);
    
    // Navigate to new course page
    await page.goto('/admin/courses/new');

    // Click cancel button
    await page.click('a:has-text("Cancel")');

    // Verify redirect to course list
    await expect(page).toHaveURL('/admin/courses');
  });
});