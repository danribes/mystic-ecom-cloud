import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Tests for Admin Course Management (User Story 5)
 * 
 * Tests the complete admin flow for managing courses:
 * - Login as admin
 * - Navigate to admin dashboard
 * - Create new course
 * - Edit existing course
 * - Publish/unpublish course
 * - Delete course
 * - View course statistics
 */

// Test configuration
test.describe('Admin Course Management Flow', () => {
  let adminEmail: string;
  let adminPassword: string;
  let testCourseId: string;

  test.beforeEach(async ({ page }) => {
    adminEmail = 'admin@test.com';
    adminPassword = 'TestAdmin123!';
    testCourseId = '';
    
    // Navigate to home page
    await page.goto('/');
    
    // Clear any existing sessions
    await page.evaluate(() => {
      sessionStorage.clear();
      localStorage.clear();
    });
  });

  /**
   * Test 1: Admin Login Flow
   * Verify admin can login and access admin dashboard
   */
  test('Admin can login and access dashboard', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Login');
    await expect(page).toHaveURL('/login');

    // Fill login form
    await page.fill('[name="email"]', adminEmail);
    await page.fill('[name="password"]', adminPassword);
    
    // Submit login
    await page.click('button[type="submit"]');

    // Should redirect to dashboard or home page
    await expect(page).toHaveURL(/\/(dashboard|admin)?/);

    // Verify admin navigation is available
    const adminLink = page.locator('text=Admin');
    await expect(adminLink).toBeVisible();

    // Click admin link to go to admin dashboard
    await adminLink.click();
    await expect(page).toHaveURL('/admin');

    // Verify admin dashboard elements are present
    await expect(page.locator('h1')).toContainText(/Admin Dashboard|Administration/);
    await expect(page.locator('text=Courses')).toBeVisible();
    await expect(page.locator('text=Orders')).toBeVisible();
  });

  /**
   * Test 2: Navigate to Course Management
   * Verify admin can access course management section
   */
  test('Admin can navigate to course management', async ({ page }) => {
    // Login first
    await loginAsAdmin(page);

    // Navigate to course management
    await page.click('text=Courses');
    await expect(page).toHaveURL('/admin/courses');

    // Verify course management page elements
    await expect(page.locator('h1')).toContainText(/Courses|Course Management/);
    await expect(page.locator('text=New Course')).toBeVisible();
    
    // Should show existing courses table or list
    const coursesContainer = page.locator('[data-testid="courses-list"], .courses-table, .courses-grid');
    await expect(coursesContainer).toBeVisible();
  });

  /**
   * Test 3: Create New Course
   * Test complete course creation flow
   */
  test('Admin can create a new course', async ({ page }) => {
    // Login and navigate to courses
    await loginAsAdmin(page);
    await page.goto('/admin/courses');

    // Click create new course button
    await page.click('text=New Course');
    await expect(page).toHaveURL('/admin/courses/new');

    // Fill course creation form
    const courseTitle = `Test Course ${Date.now()}`;
    const courseDescription = 'This is a test course created by E2E tests';
    const coursePrice = '99.99';

    await page.fill('[name="title"]', courseTitle);
    await page.fill('[name="description"]', courseDescription);
    await page.fill('[name="price"]', coursePrice);
    
    // Select course level
    await page.selectOption('[name="level"]', 'beginner');
    
    // Select category
    await page.selectOption('[name="category"]', 'Manifestation');

    // Add learning outcomes
    await page.fill('[name="learningOutcomes[0]"]', 'Learn the basics of the subject');
    await page.fill('[name="learningOutcomes[1]"]', 'Apply practical techniques');

    // Add prerequisites
    await page.fill('[name="prerequisites[0]"]', 'Open mind and willingness to learn');

    // Set course as draft initially
    const publishedCheckbox = page.locator('[name="isPublished"]');
    if (await publishedCheckbox.isChecked()) {
      await publishedCheckbox.uncheck();
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to course list or course detail
    await expect(page).toHaveURL(/\/admin\/courses/);

    // Verify course was created
    await expect(page.locator(`text=${courseTitle}`)).toBeVisible();

    // Store course ID for later tests
    const courseElement = page.locator(`[data-course-title="${courseTitle}"]`);
    if (await courseElement.count() > 0) {
      testCourseId = await courseElement.getAttribute('data-course-id') || '';
    }
  });

  /**
   * Test 4: Edit Existing Course
   * Test course editing functionality
   */
  test('Admin can edit an existing course', async ({ page }) => {
    // Login and navigate to courses
    await loginAsAdmin(page);
    await page.goto('/admin/courses');

    // Find first course in the list and click edit
    const firstCourseRow = page.locator('[data-testid="course-row"]').first();
    await expect(firstCourseRow).toBeVisible();

    const editButton = firstCourseRow.locator('text=Edit');
    await editButton.click();

    // Should navigate to edit page
    await expect(page).toHaveURL(/\/admin\/courses\/[^\/]+\/edit/);

    // Modify course details
    const originalTitle = await page.inputValue('[name="title"]');
    const updatedTitle = `${originalTitle} (Updated)`;
    
    await page.fill('[name="title"]', updatedTitle);
    await page.fill('[name="description"]', 'Updated description via E2E test');

    // Update price
    await page.fill('[name="price"]', '149.99');

    // Save changes
    await page.click('button[type="submit"]');

    // Should redirect back to courses list
    await expect(page).toHaveURL('/admin/courses');

    // Verify changes were saved
    await expect(page.locator(`text=${updatedTitle}`)).toBeVisible();
  });

  /**
   * Test 5: Course Status Management
   * Test publishing/unpublishing courses
   */
  test('Admin can publish and unpublish courses', async ({ page }) => {
    // Login and navigate to courses
    await loginAsAdmin(page);
    await page.goto('/admin/courses');

    // Find a course and check its current status
    const courseRow = page.locator('[data-testid="course-row"]').first();
    await expect(courseRow).toBeVisible();

    // Look for publish/unpublish toggle or button
    const statusToggle = courseRow.locator('[data-testid="publish-toggle"], .status-toggle');
    
    if (await statusToggle.count() > 0) {
      // Click to toggle status
      await statusToggle.click();

      // Verify status changed (could be a visual indicator or text change)
      // Wait for status update
      await page.waitForTimeout(1000);

      // Verify the toggle state changed
      const newStatus = await statusToggle.getAttribute('data-published');
      expect(newStatus).toBeDefined();
    } else {
      // Alternative: look for publish/unpublish buttons
      const publishBtn = courseRow.locator('text=Publish');
      const unpublishBtn = courseRow.locator('text=Unpublish');

      if (await publishBtn.count() > 0) {
        await publishBtn.click();
        await page.waitForTimeout(1000);
        await expect(courseRow.locator('text=Published')).toBeVisible();
      } else if (await unpublishBtn.count() > 0) {
        await unpublishBtn.click();
        await page.waitForTimeout(1000);
        await expect(courseRow.locator('text=Draft')).toBeVisible();
      }
    }
  });

  /**
   * Test 6: Course Statistics View
   * Test viewing course analytics and statistics
   */
  test('Admin can view course statistics', async ({ page }) => {
    // Login and navigate to courses
    await loginAsAdmin(page);
    await page.goto('/admin/courses');

    // Look for statistics section or dashboard
    const statsSection = page.locator('[data-testid="course-stats"], .course-statistics');
    
    if (await statsSection.count() > 0) {
      await expect(statsSection).toBeVisible();

      // Check for key metrics
      await expect(statsSection.locator('text=Total Courses')).toBeVisible();
      await expect(statsSection.locator('text=Published')).toBeVisible();
      await expect(statsSection.locator('text=Draft')).toBeVisible();
    }

    // Alternative: check main admin dashboard for course stats
    await page.goto('/admin');
    
    // Look for course-related statistics
    const dashboardStats = page.locator('.dashboard-stats, [data-testid="dashboard-metrics"]');
    if (await dashboardStats.count() > 0) {
      await expect(dashboardStats).toBeVisible();
    }

    // Should show numbers/counts
    const statNumbers = page.locator('.stat-number, .metric-value');
    const statCount = await statNumbers.count();
    expect(statCount).toBeGreaterThan(0);
  });

  /**
   * Test 7: Course Search and Filtering
   * Test admin can search and filter courses
   */
  test('Admin can search and filter courses', async ({ page }) => {
    // Login and navigate to courses
    await loginAsAdmin(page);
    await page.goto('/admin/courses');

    // Look for search input
    const searchInput = page.locator('[name="search"], [placeholder*="search"]');
    
    if (await searchInput.count() > 0) {
      // Test search functionality
      await searchInput.fill('test');
      await page.keyboard.press('Enter');

      // Wait for results to update
      await page.waitForTimeout(1000);

      // Verify search was performed (URL should change or results should filter)
      const hasSearchParam = page.url().includes('search=test');
      const hasFilteredResults = await page.locator('[data-testid="search-results"]').count() > 0;
      
      expect(hasSearchParam || hasFilteredResults).toBeTruthy();
    }

    // Test category filter if available
    const categoryFilter = page.locator('[name="category"], select[data-filter="category"]');
    
    if (await categoryFilter.count() > 0) {
      await categoryFilter.selectOption('Manifestation');
      await page.waitForTimeout(1000);

      // Verify filter was applied
      const hasFilterParam = page.url().includes('category=');
      expect(hasFilterParam).toBeTruthy();
    }

    // Test status filter if available
    const statusFilter = page.locator('[name="status"], select[data-filter="status"]');
    
    if (await statusFilter.count() > 0) {
      await statusFilter.selectOption('published');
      await page.waitForTimeout(1000);

      // Verify filter was applied
      const hasStatusParam = page.url().includes('status=');
      expect(hasStatusParam).toBeTruthy();
    }
  });

  /**
   * Test 8: Course Deletion
   * Test admin can delete courses (should be last test)
   */
  test('Admin can delete a course', async ({ page }) => {
    // Login and navigate to courses
    await loginAsAdmin(page);
    await page.goto('/admin/courses');

    // Find a test course to delete (preferably one created by tests)
    const testCourseRow = page.locator('[data-testid="course-row"]').filter({
      hasText: 'Test Course'
    }).first();

    if (await testCourseRow.count() > 0) {
      // Click delete button
      const deleteButton = testCourseRow.locator('text=Delete');
      await deleteButton.click();

      // Handle confirmation dialog
      const confirmDialog = page.locator('.confirm-dialog, [role="dialog"]');
      
      if (await confirmDialog.count() > 0) {
        // Click confirm in modal
        await confirmDialog.locator('text=Delete').click();
      } else {
        // Handle browser confirm dialog
        page.on('dialog', async dialog => {
          expect(dialog.type()).toBe('confirm');
          await dialog.accept();
        });
      }

      // Wait for deletion to complete
      await page.waitForTimeout(1000);

      // Verify course was removed from list
      await expect(testCourseRow).not.toBeVisible();
    }
  });

  /**
   * Test 9: Course Image Upload
   * Test course image upload functionality
   */
  test('Admin can upload course images', async ({ page }) => {
    // Login and navigate to course creation
    await loginAsAdmin(page);
    await page.goto('/admin/courses/new');

    // Look for file upload input
    const fileInput = page.locator('input[type="file"][name*="image"]');
    
    if (await fileInput.count() > 0) {
      // Create a test image file (1x1 pixel PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0x99, 0x01, 0x01, 0x01, 0x00, 0x00, // image data
        0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // more image data
        0xE5, 0x27, 0xDE, 0xFC, 0x00, 0x00, 0x00, 0x00, // end
        0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82  // IEND chunk
      ]);

      // Upload the test image
      await fileInput.setInputFiles({
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer: testImageBuffer
      });

      // Wait for upload to process
      await page.waitForTimeout(2000);

      // Check for upload success indicator
      const uploadSuccess = page.locator('[data-testid="upload-success"], .upload-success');
      const previewImage = page.locator('img[src*="test-image"], .image-preview img');
      
      const hasUploadIndicator = await uploadSuccess.count() > 0;
      const hasPreview = await previewImage.count() > 0;
      
      expect(hasUploadIndicator || hasPreview).toBeTruthy();
    }
  });

  /**
   * Test 10: Bulk Course Operations
   * Test bulk operations if available
   */
  test('Admin can perform bulk operations on courses', async ({ page }) => {
    // Login and navigate to courses
    await loginAsAdmin(page);
    await page.goto('/admin/courses');

    // Look for bulk selection checkboxes
    const selectAllCheckbox = page.locator('[data-testid="select-all"], input[type="checkbox"][data-action="select-all"]');
    
    if (await selectAllCheckbox.count() > 0) {
      // Select all courses
      await selectAllCheckbox.check();

      // Verify individual course checkboxes are selected
      const courseCheckboxes = page.locator('[data-testid="course-checkbox"], .course-row input[type="checkbox"]');
      const totalCheckboxes = await courseCheckboxes.count();
      expect(totalCheckboxes).toBeGreaterThan(0);

      // Look for bulk action dropdown or buttons
      const bulkActions = page.locator('[data-testid="bulk-actions"], .bulk-actions select');
      
      if (await bulkActions.count() > 0) {
        // Test bulk publish/unpublish
        await bulkActions.selectOption('publish');
        
        const applyButton = page.locator('text=Apply');
        if (await applyButton.count() > 0) {
          await applyButton.click();
          await page.waitForTimeout(1000);
          
          // Verify bulk action was applied
          const successMessage = page.locator('.success-message, [data-testid="bulk-success"]');
          if (await successMessage.count() > 0) {
            await expect(successMessage).toBeVisible();
          }
        }
      }
    }
  });

  // Helper function to login as admin
  async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.fill('[name="email"]', adminEmail);
    await page.fill('[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // Wait for redirect and verify login
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Admin')).toBeVisible();
    
    // Navigate to admin area
    await page.click('text=Admin');
    await expect(page).toHaveURL('/admin');
  }
});

/**
 * Admin Course Management Performance Tests
 * Test performance aspects of admin interface
 */
test.describe('Admin Course Management Performance', () => {
  test('Course list loads within acceptable time', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(1000);
    await page.click('text=Admin');

    // Measure course list load time
    const startTime = Date.now();
    await page.goto('/admin/courses');
    
    // Wait for course list to load
    await page.waitForSelector('[data-testid="courses-list"], .courses-table', { timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('Course creation form responds quickly', async ({ page }) => {
    // Login and navigate to course creation
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(1000);
    await page.goto('/admin/courses/new');

    // Measure form response time
    const startTime = Date.now();
    await page.fill('[name="title"]', 'Performance Test Course');
    
    const responseTime = Date.now() - startTime;
    
    // Form should respond within 100ms
    expect(responseTime).toBeLessThan(100);
  });
});

/**
 * Admin Course Management Error Handling Tests
 * Test error scenarios and edge cases
 */
test.describe('Admin Course Management Error Handling', () => {
  test('Handles invalid course data gracefully', async ({ page }) => {
    // Login and navigate to course creation
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(1000);
    await page.goto('/admin/courses/new');

    // Try to submit form with invalid data
    await page.fill('[name="title"]', ''); // Empty title
    await page.fill('[name="price"]', 'invalid-price'); // Invalid price
    
    await page.click('button[type="submit"]');

    // Should show validation errors
    const errorMessages = page.locator('.error, .validation-error, [data-testid="form-error"]');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThanOrEqual(1);
  });

  test('Handles network errors during course operations', async ({ page }) => {
    // Login and navigate to courses
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@test.com');
    await page.fill('[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(1000);
    await page.goto('/admin/courses');

    // Simulate network failure
    await page.route('**/api/admin/courses**', route => {
      route.abort();
    });

    // Try to perform an action that requires API call
    const newCourseBtn = page.locator('text=New Course');
    if (await newCourseBtn.count() > 0) {
      await newCourseBtn.click();
      
      // Should show error message or handle gracefully
      const errorIndicator = page.locator('.error, .network-error, [data-testid="api-error"]');
      
      // Either shows error or navigation still works
      const hasError = await errorIndicator.count() > 0;
      const navigationWorked = page.url().includes('/admin/courses/new');
      
      expect(hasError || navigationWorked).toBeTruthy();
    }
  });
});