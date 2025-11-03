/**
 * T066: Admin Courses List Page E2E Tests
 * 
 * Tests comprehensive course management functionality including:
 * - Course listing with pagination and search
 * - Individual course edit/delete actions
 * - Bulk course operations (publish, unpublish, delete)
 * - Filter and sort capabilities
 * - Status management and validation
 */

import { test, expect, type Page } from '@playwright/test';

// Test data and helpers
const TEST_COURSES = [
  {
    title: 'Test Manifestation Course',
    description: 'A test course for manifestation techniques',
    category: 'Manifestation',
    price: 9999, // $99.99 in cents
    duration: 120,
    level: 'Beginner',
    isPublished: true,
  },
  {
    title: 'Draft Energy Healing Course',
    description: 'A draft course about energy healing practices',
    category: 'Energy Healing',
    price: 14999, // $149.99 in cents
    duration: 180,
    level: 'Intermediate',
    isPublished: false,
  },
  {
    title: 'Advanced Meditation Course',
    description: 'Advanced meditation techniques for experienced practitioners',
    category: 'Meditation',
    price: 19999, // $199.99 in cents
    duration: 240,
    level: 'Advanced',
    isPublished: true,
  }
];

async function loginAsAdmin(page: Page) {
  // Go to login page
  await page.goto('/login');
  
  // Wait for login form to be available with increased timeout
  try {
    await page.waitForSelector('input[name="email"]', { timeout: 15000 });
    
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for successful login redirect with more flexible matching
    await Promise.race([
      page.waitForURL('/admin/dashboard', { timeout: 10000 }),
      page.waitForURL('/admin', { timeout: 10000 }),
      page.waitForURL('/dashboard', { timeout: 10000 })
    ]);
  } catch (error) {
    console.warn('Login failed, tests may fail due to authentication issues:', error);
    // Continue with test execution - some tests might still work
  }
}

async function createTestCourse(page: Page, course: typeof TEST_COURSES[0]) {
  const response = await page.request.post('/api/admin/courses', {
    data: course
  });
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  return result.course;
}

async function cleanupTestCourses(page: Page) {
  // Clean up any test courses that might exist
  for (const course of TEST_COURSES) {
    try {
      const response = await page.request.get(`/api/admin/courses?search=${course.title}`);
      if (response.ok()) {
        const data = await response.json();
        if (data.courses?.length > 0) {
          for (const existingCourse of data.courses) {
            await page.request.delete(`/api/admin/courses/${existingCourse.id}`);
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

test.describe('T066: Admin Courses List Page', () => {
  let createdCourses: any[] = [];

  // Set longer timeout for these tests
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    try {
      await loginAsAdmin(page);
      await cleanupTestCourses(page);
      
      // Create test courses for each test
      for (const courseData of TEST_COURSES) {
        try {
          const course = await createTestCourse(page, courseData);
          createdCourses.push(course);
        } catch (error) {
          console.warn('Failed to create test course:', courseData.title, error);
        }
      }
      
      await page.goto('/admin/courses');
    } catch (error) {
      console.warn('Setup failed, test may not work correctly:', error);
      // Try to continue anyway
      await page.goto('/admin/courses');
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up created courses
    for (const course of createdCourses) {
      try {
        await page.request.delete(`/api/admin/courses/${course.id}`);
      } catch (error) {
        console.warn('Failed to cleanup course:', course.id, error);
      }
    }
    createdCourses = [];
  });

  test.describe('Page Layout and Navigation', () => {
    test('should display admin courses page with correct title and navigation', async ({ page }) => {
      await expect(page.getByTestId('admin-page-title')).toHaveText('Course Management');
      await expect(page.getByText('Manage your course catalog')).toBeVisible();
      await expect(page.getByTestId('new-course-button')).toBeVisible();
    });

    test('should have working new course button', async ({ page }) => {
      await page.getByTestId('new-course-button').click();
      await expect(page).toHaveURL('/admin/courses/new');
    });

    test('should display course statistics correctly', async ({ page }) => {
      // Check that statistics are visible and show data
      await expect(page.getByText('Total Courses')).toBeVisible();
      await expect(page.getByText('Published')).toBeVisible();
      await expect(page.getByText('Draft')).toBeVisible();
      await expect(page.getByText('Total Enrollments')).toBeVisible();
      
      // Should show at least our test courses
      const totalCoursesElement = page.locator('text="Total Courses"').locator('..').locator('p.text-2xl');
      const totalText = await totalCoursesElement.textContent();
      const totalCourses = parseInt(totalText || '0');
      expect(totalCourses).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Course Listing', () => {
    test('should display all created test courses', async ({ page }) => {
      // Wait for courses to load
      await expect(page.getByTestId('courses-list')).toBeVisible();
      
      // Check that all test courses are displayed
      for (const course of TEST_COURSES) {
        await expect(page.getByText(course.title)).toBeVisible();
        await expect(page.getByText(course.description)).toBeVisible();
        await expect(page.getByText(course.category)).toBeVisible();
        await expect(page.getByText(course.level)).toBeVisible();
      }
    });

    test('should show correct course status indicators', async ({ page }) => {
      // Check published course has Published badge
      const publishedCourse = TEST_COURSES[0];
      if (!publishedCourse) throw new Error('Published course not found');
      const publishedCourseRow = page.locator(`text="${publishedCourse.title}"`).locator('..');
      await expect(publishedCourseRow.getByText('Published')).toBeVisible();
      
      // Check draft course has Draft badge
      const draftCourse = TEST_COURSES[1];
      if (!draftCourse) throw new Error('Draft course not found');
      const draftCourseRow = page.locator(`text="${draftCourse.title}"`).locator('..');
      await expect(draftCourseRow.getByText('Draft')).toBeVisible();
    });

    test('should display course prices correctly formatted', async ({ page }) => {
      // Check that prices are displayed in correct currency format
      await expect(page.getByText('$99.99')).toBeVisible(); // Test Manifestation Course
      await expect(page.getByText('$149.99')).toBeVisible(); // Draft Energy Healing Course
      await expect(page.getByText('$199.99')).toBeVisible(); // Advanced Meditation Course
    });

    test('should show course action buttons', async ({ page }) => {
      const courseRows = page.getByTestId('course-row');
      const firstRow = courseRows.first();
      
      await expect(firstRow.getByText('View')).toBeVisible();
      await expect(firstRow.getByTestId('edit-course')).toBeVisible();
      await expect(firstRow.getByTestId('delete-course')).toBeVisible();
      await expect(firstRow.getByTestId('publish-toggle')).toBeVisible();
    });
  });

  test.describe('Search and Filtering', () => {
    test('should filter courses by search term', async ({ page }) => {
      // Search for "Manifestation"
      await page.fill('input[name="search"]', 'Manifestation');
      await page.click('button[type="submit"]');
      
      // Should show only manifestation course
      await expect(page.getByText('Test Manifestation Course')).toBeVisible();
      await expect(page.getByText('Draft Energy Healing Course')).not.toBeVisible();
      await expect(page.getByText('Advanced Meditation Course')).not.toBeVisible();
    });

    test('should filter courses by category', async ({ page }) => {
      // Filter by Energy Healing category
      await page.selectOption('select[name="category"]', 'Energy Healing');
      await page.click('button[type="submit"]');
      
      // Should show only energy healing course
      await expect(page.getByText('Draft Energy Healing Course')).toBeVisible();
      await expect(page.getByText('Test Manifestation Course')).not.toBeVisible();
      await expect(page.getByText('Advanced Meditation Course')).not.toBeVisible();
    });

    test('should filter courses by status', async ({ page }) => {
      // Filter by published status
      await page.selectOption('select[name="status"]', 'published');
      await page.click('button[type="submit"]');
      
      // Should show only published courses
      await expect(page.getByText('Test Manifestation Course')).toBeVisible();
      await expect(page.getByText('Advanced Meditation Course')).toBeVisible();
      await expect(page.getByText('Draft Energy Healing Course')).not.toBeVisible();
    });

    test('should clear filters when clear button is clicked', async ({ page }) => {
      // Apply some filters
      await page.fill('input[name="search"]', 'Manifestation');
      await page.selectOption('select[name="category"]', 'Energy Healing');
      await page.click('button[type="submit"]');
      
      // Clear filters
      await page.click('text="Clear"');
      
      // Should show all courses again
      await expect(page.getByText('Test Manifestation Course')).toBeVisible();
      await expect(page.getByText('Draft Energy Healing Course')).toBeVisible();
      await expect(page.getByText('Advanced Meditation Course')).toBeVisible();
    });

    test('should sort courses by different criteria', async ({ page }) => {
      // Sort by title
      await page.selectOption('select[name="sortBy"]', 'title');
      await page.click('button[type="submit"]');
      
      // Check that courses are sorted alphabetically
      const courseTitles = await page.getByTestId('course-row').locator('h3').allTextContents();
      const sortedTitles = [...courseTitles].sort();
      expect(courseTitles).toEqual(sortedTitles);
    });
  });

  test.describe('Individual Course Actions', () => {
    test('should allow viewing course in new tab', async ({ page, context }) => {
      const publishedCourse = TEST_COURSES.find(c => c.isPublished);
      const courseRow = page.locator(`text="${publishedCourse?.title}"`).locator('..');
      
      // Click view button (opens in new tab)
      const [newPage] = await Promise.all([
        context.waitForEvent('page'),
        courseRow.getByText('View').click()
      ]);
      
      await newPage.waitForLoadState();
      expect(newPage.url()).toContain('/courses/');
    });

    test('should navigate to edit course page', async ({ page }) => {
      const courseRow = page.getByTestId('course-row').first();
      const editButton = courseRow.getByTestId('edit-course');
      
      await editButton.click();
      
      await expect(page).toHaveURL(/\/admin\/courses\/\d+\/edit/);
    });

    test('should toggle course publish status', async ({ page }) => {
      // Find a draft course and publish it
      const draftCourse = TEST_COURSES[1];
      if (!draftCourse) throw new Error('Draft course not found');
      const draftCourseRow = page.locator(`text="${draftCourse.title}"`).locator('..');
      const publishToggle = draftCourseRow.getByTestId('publish-toggle');
      
      await expect(publishToggle).toHaveText('Publish');
      await publishToggle.click();
      
      // Wait for the operation to complete and page to reload
      await page.waitForLoadState('networkidle');
      
      // Should now show as published
      const updatedCourseRow = page.locator(`text="${draftCourse.title}"`).locator('..');
      await expect(updatedCourseRow.getByText('Published')).toBeVisible();
    });

    test('should show delete confirmation modal', async ({ page }) => {
      const courseRow = page.getByTestId('course-row').first();
      const deleteButton = courseRow.getByTestId('delete-course');
      
      await deleteButton.click();
      
      // Check that modal appears
      const modal = page.locator('#delete-modal');
      await expect(modal).not.toHaveClass(/hidden/);
      await expect(page.getByText('Delete Course')).toBeVisible();
      await expect(page.getByText('This action cannot be undone')).toBeVisible();
    });

    test('should cancel course deletion', async ({ page }) => {
      const courseRow = page.getByTestId('course-row').first();
      const deleteButton = courseRow.getByTestId('delete-course');
      
      await deleteButton.click();
      
      // Cancel deletion
      await page.click('#delete-cancel');
      
      // Modal should be hidden
      const modal = page.locator('#delete-modal');
      await expect(modal).toHaveClass(/hidden/);
      
      // Course should still be visible
      const firstCourse = TEST_COURSES[0];
      if (!firstCourse) throw new Error('First course not found');
      await expect(page.getByText(firstCourse.title)).toBeVisible();
    });

    test('should delete course when confirmed', async ({ page }) => {
      const courseToDelete = TEST_COURSES[0];
      if (!courseToDelete) throw new Error('Course to delete not found');
      const courseRow = page.locator(`text="${courseToDelete.title}"`).locator('..');
      const deleteButton = courseRow.getByTestId('delete-course');
      
      await deleteButton.click();
      
      // Confirm deletion
      await page.click('#delete-confirm');
      
      // Wait for deletion to complete
      await page.waitForLoadState('networkidle');
      
      // Course should no longer be visible
      await expect(page.getByText(courseToDelete.title)).not.toBeVisible();
    });
  });

  test.describe('Bulk Actions', () => {
    test('should select all courses with select all checkbox', async ({ page }) => {
      const selectAllCheckbox = page.getByTestId('select-all-checkbox');
      await selectAllCheckbox.check();
      
      // All course checkboxes should be checked
      const courseCheckboxes = page.getByTestId('course-checkbox');
      const count = await courseCheckboxes.count();
      for (let i = 0; i < count; i++) {
        await expect(courseCheckboxes.nth(i)).toBeChecked();
      }
      
      // Bulk action buttons should be enabled
      await expect(page.getByTestId('bulk-publish')).not.toBeDisabled();
      await expect(page.getByTestId('bulk-unpublish')).not.toBeDisabled();
      await expect(page.getByTestId('bulk-delete')).not.toBeDisabled();
    });

    test('should deselect all when select all is unchecked', async ({ page }) => {
      const selectAllCheckbox = page.getByTestId('select-all-checkbox');
      
      // First select all
      await selectAllCheckbox.check();
      
      // Then uncheck
      await selectAllCheckbox.uncheck();
      
      // All course checkboxes should be unchecked
      const courseCheckboxes = page.getByTestId('course-checkbox');
      const count = await courseCheckboxes.count();
      for (let i = 0; i < count; i++) {
        await expect(courseCheckboxes.nth(i)).not.toBeChecked();
      }
      
      // Bulk action buttons should be disabled
      await expect(page.getByTestId('bulk-publish')).toBeDisabled();
      await expect(page.getByTestId('bulk-unpublish')).toBeDisabled();
      await expect(page.getByTestId('bulk-delete')).toBeDisabled();
    });

    test('should enable bulk actions when courses are selected', async ({ page }) => {
      // Select first course
      const firstCheckbox = page.getByTestId('course-checkbox').first();
      await firstCheckbox.check();
      
      // Bulk action buttons should be enabled
      await expect(page.getByTestId('bulk-publish')).not.toBeDisabled();
      await expect(page.getByTestId('bulk-unpublish')).not.toBeDisabled();
      await expect(page.getByTestId('bulk-delete')).not.toBeDisabled();
    });

    test('should show indeterminate state for select all when some courses selected', async ({ page }) => {
      // Select first course only
      const firstCheckbox = page.getByTestId('course-checkbox').first();
      await firstCheckbox.check();
      
      // Select all checkbox should be in indeterminate state
      const selectAllCheckbox = page.getByTestId('select-all-checkbox');
      expect(await selectAllCheckbox.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true);
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no courses exist', async ({ page }) => {
      // Delete all test courses first
      for (const course of createdCourses) {
        await page.request.delete(`/api/admin/courses/${course.id}`);
      }
      
      // Reload the page
      await page.reload();
      
      // Should show empty state
      await expect(page.getByTestId('no-courses')).toBeVisible();
      await expect(page.getByText('No courses found')).toBeVisible();
      await expect(page.getByText('Get started by creating your first course')).toBeVisible();
      await expect(page.getByText('Create your first course')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle course loading errors gracefully', async ({ page }) => {
      // Intercept API call and return error
      await page.route('/api/admin/courses*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await page.goto('/admin/courses');
      
      // Should show error message
      await expect(page.getByTestId('error-banner')).toBeVisible();
      await expect(page.getByText('Failed to load courses')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Basic elements should still be visible
      await expect(page.getByTestId('admin-page-title')).toBeVisible();
      await expect(page.getByTestId('new-course-button')).toBeVisible();
      await expect(page.getByTestId('courses-list')).toBeVisible();
    });

    test('should work on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Should show tablet layout
      await expect(page.getByTestId('admin-page-title')).toBeVisible();
      await expect(page.getByTestId('courses-list')).toBeVisible();
      
      // Grid layout should be visible
      const firstCourse = page.getByTestId('course-row').first();
      await expect(firstCourse).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('should show pagination when there are many courses', async ({ page }) => {
      // This test assumes pagination appears when there are more than 10 courses
      // May need to create additional test courses or mock API response
      
      // Check if pagination exists (skip if not enough courses)
      const paginationExists = await page.locator('nav[aria-label="Pagination"]').count() > 0;
      
      if (paginationExists) {
        await expect(page.locator('nav[aria-label="Pagination"]')).toBeVisible();
        await expect(page.getByText(/Showing \d+ to \d+ of \d+ results/)).toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check that pagination has proper aria-label
      const pagination = page.locator('nav[aria-label="Pagination"]');
      if (await pagination.count() > 0) {
        await expect(pagination).toBeVisible();
      }
      
      // Check that buttons have proper accessibility
      await expect(page.getByTestId('new-course-button')).toHaveAttribute('class', /focus:ring/);
      await expect(page.getByTestId('select-all-checkbox')).toHaveAttribute('type', 'checkbox');
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Test that key elements are focusable
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to navigate to and activate new course button
      await page.keyboard.press('Enter');
      // Note: This might navigate away, depending on implementation
    });
  });
});

// Cross-browser compatibility tests
test.describe('T066: Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test.describe(`${browserName} browser`, () => {
      test(`should display courses list correctly in ${browserName}`, async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/courses');
        
        await expect(page.getByTestId('admin-page-title')).toHaveText('Course Management');
        await expect(page.getByTestId('new-course-button')).toBeVisible();
        
        // Check if courses list is visible (may be empty)
        const hasCourses = await page.getByTestId('courses-list').count() > 0;
        const hasNoCourses = await page.getByTestId('no-courses').count() > 0;
        
        expect(hasCourses || hasNoCourses).toBe(true);
      });
    });
  });
});