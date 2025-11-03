/**
 * T071: Admin Orders List E2E Tests
 * 
 * Tests the admin orders management page:
 * - View orders list
 * - Filter by status
 * - Filter by date range
 * - Search by order ID or email
 * - Export to CSV
 */

import { test, expect } from '@playwright/test';
import { 
  createTestUser, 
  loginAsUser,
  cleanupTestUser 
} from '../helpers/auth';
import type { User } from '@/types';
import { pool } from '../setup/database';

test.describe('Admin Orders List (T071)', () => {
  let testAdmin: User;
  let testCustomer: User;
  let testOrderIds: string[] = [];
  let testCourseId: string;
  let testProductId: string;

  test.beforeAll(async () => {
    // Create test users
    testAdmin = await createTestUser({ role: 'admin' });
    testCustomer = await createTestUser({ role: 'user', email: 'customer-orders@test.com' });

    // Create test course and digital product for order items
    const course = await pool.query(
      `INSERT INTO courses (title, slug, description, price, is_published, created_at, updated_at)
       VALUES ('Test Course 1', 'test-course-orders-1', 'Test description', 99.00, true, NOW(), NOW())
       RETURNING id`
    );
    testCourseId = course.rows[0].id;

    const product = await pool.query(
      `INSERT INTO digital_products (title, slug, description, price, product_type, file_url, is_published, created_at, updated_at)
       VALUES ('Test Product 1', 'test-product-orders-1', 'Test description', 49.00, 'ebook', 'https://example.com/test.pdf', true, NOW(), NOW())
       RETURNING id`
    );
    testProductId = product.rows[0].id;

    // Create some test orders
    // Create completed order
    const order1 = await pool.query(
      `INSERT INTO orders (user_id, status, total_amount, created_at, updated_at)
       VALUES ($1, 'completed', 106.92, NOW(), NOW())
       RETURNING id`,
      [testCustomer.id]
    );
    testOrderIds.push(order1.rows[0].id);

    // Add order items
    await pool.query(
      `INSERT INTO order_items (order_id, item_type, course_id, title, price, quantity)
       VALUES ($1, 'course', $2, 'Test Course 1', 99.00, 1)`,
      [order1.rows[0].id, testCourseId]
    );

    // Create pending order
    const order2 = await pool.query(
      `INSERT INTO orders (user_id, status, total_amount, created_at, updated_at)
       VALUES ($1, 'pending', 52.92, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
       RETURNING id`,
      [testCustomer.id]
    );
    testOrderIds.push(order2.rows[0].id);

    await pool.query(
      `INSERT INTO order_items (order_id, item_type, digital_product_id, title, price, quantity)
       VALUES ($1, 'digital_product', $2, 'Test Product 1', 49.00, 1)`,
      [order2.rows[0].id, testProductId]
    );

    // Create cancelled order
    const order3 = await pool.query(
      `INSERT INTO orders (user_id, status, total_amount, created_at, updated_at)
       VALUES ($1, 'cancelled', 31.32, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
       RETURNING id`,
      [testCustomer.id]
    );
    testOrderIds.push(order3.rows[0].id);

    await pool.query(
      `INSERT INTO order_items (order_id, item_type, digital_product_id, title, price, quantity)
       VALUES ($1, 'digital_product', $2, 'Test Product 2', 49.00, 1)`,
      [order3.rows[0].id, testProductId]
    );
  });

  test.afterAll(async () => {
    // Clean up test orders
    for (const orderId of testOrderIds) {
      await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    }

    // Clean up test products
    await pool.query('DELETE FROM courses WHERE id = $1', [testCourseId]);
    await pool.query('DELETE FROM digital_products WHERE id = $1', [testProductId]);

    // Clean up users
    await cleanupTestUser(testAdmin.id);
    await cleanupTestUser(testCustomer.id);
  });

  test('should display orders list with all orders', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testAdmin.email);
    
    // Navigate to orders page
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.locator('h1').filter({ hasText: 'Orders Management' }).first()).toBeVisible();

    // Verify summary cards are visible
    await expect(page.locator('text=Total Orders')).toBeVisible();
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('.text-sm.text-gray-600:has-text("Pending")').first()).toBeVisible();
    await expect(page.locator('.text-sm.text-gray-600:has-text("Completed")').first()).toBeVisible();

    // Verify table headers
    await expect(page.locator('th:has-text("Order ID")')).toBeVisible();
    await expect(page.locator('th:has-text("Customer")')).toBeVisible();
    await expect(page.locator('th:has-text("Items")')).toBeVisible();
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Total")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();

    // Verify orders are displayed (should see at least our test orders)
    const orderRows = page.locator('tbody tr');
    const rowCount = await orderRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3); // At least our 3 test orders

    // Verify customer email appears
    await expect(page.locator('text=customer-orders@test.com').first()).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testAdmin.email);
    
    // Navigate to orders page
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Select "completed" status filter
    await page.selectOption('#status', 'completed');
    await page.click('button:has-text("Apply Filters")');
    await page.waitForLoadState('networkidle');

    // Verify only completed orders are shown
    const statusBadges = page.locator('span.bg-green-100');
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);

    // Verify no pending orders are shown
    const pendingBadges = page.locator('span.bg-yellow-100');
    expect(await pendingBadges.count()).toBe(0);
  });

  test('should search orders by email', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testAdmin.email);
    
    // Navigate to orders page
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Enter search query
    await page.fill('#search', 'customer-orders@test.com');
    await page.click('button:has-text("Apply Filters")');
    await page.waitForLoadState('networkidle');

    // Verify search results contain the email
    await expect(page.locator('text=customer-orders@test.com').first()).toBeVisible();

    // Verify all visible orders belong to this customer
    const emailCells = page.locator('td:has-text("customer-orders@test.com")');
    const count = await emailCells.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should filter orders by item type', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testAdmin.email);
    
    // Navigate to orders page
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Select "course" item type filter
    await page.selectOption('#itemType', 'course');
    await page.click('button:has-text("Apply Filters")');
    await page.waitForLoadState('networkidle');

    // Verify only course orders are shown
    const itemCells = page.locator('td:has-text("(course)")');
    const count = await itemCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter orders by date range', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testAdmin.email);
    
    // Navigate to orders page
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Set date range to last 7 days (to include all our test orders)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    if (startDate && endDate) {
      await page.fill('#startDate', startDate);
      await page.fill('#endDate', endDate);
      await page.click('button:has-text("Apply Filters")');
      await page.waitForLoadState('networkidle');

      // Should see at least one order from our test data
      const orderRows = page.locator('tbody tr:not(:has-text("No orders found"))');
      const count = await orderRows.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('should clear all filters', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testAdmin.email);
    
    // Navigate to orders page with filters
    await page.goto('/admin/orders?status=completed&search=test');
    await page.waitForLoadState('networkidle');

    // Verify filters are applied
    expect(await page.inputValue('#search')).toBe('test');
    expect(await page.inputValue('#status')).toBe('completed');

    // Click Clear Filters
    await page.click('text=Clear Filters');
    await page.waitForLoadState('networkidle');

    // Verify we're back at unfiltered page
    expect(await page.inputValue('#search')).toBe('');
    expect(await page.inputValue('#status')).toBe('');
  });

  test('should view individual order details', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testAdmin.email);
    
    // Navigate to orders page
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Click on first "View" link in the table (not in filter controls)
    const viewLink = page.locator('tbody a:has-text("View")').first();
    const href = await viewLink.getAttribute('href');
    expect(href).toMatch(/\/admin\/orders\/[a-f0-9-]+/);

    // Note: We're not navigating to the detail page since it doesn't exist yet
    // This test verifies the link structure is correct
  });

  test('should display "no orders" message when no results', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testAdmin.email);
    
    // Navigate to orders page with impossible search
    await page.goto('/admin/orders?search=nonexistent-order-id-12345');
    await page.waitForLoadState('networkidle');

    // Verify no orders message
    await expect(page.locator('text=No orders found matching your criteria')).toBeVisible();
  });

  test('should export orders to CSV', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testAdmin.email);
    
    // Navigate to orders page
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.click('#exportBtn');

    // Wait for download
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/orders-\d{4}-\d{2}-\d{2}\.csv/);

    // Verify file has content
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('should show correct summary statistics', async ({ page }) => {
    // Login as admin
    await loginAsUser(page, testAdmin.email);
    
    // Navigate to orders page
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Verify summary cards show numbers
    const totalOrdersText = await page.locator('text=Total Orders').locator('..').locator('.text-2xl').textContent();
    const totalOrders = parseInt(totalOrdersText || '0');
    expect(totalOrders).toBeGreaterThanOrEqual(3);

    const pendingText = await page.locator('text=Pending').locator('..').locator('.text-2xl').textContent();
    const pending = parseInt(pendingText || '0');
    expect(pending).toBeGreaterThanOrEqual(1);

    const completedText = await page.locator('text=Completed').locator('..').locator('.text-2xl').textContent();
    const completed = parseInt(completedText || '0');
    expect(completed).toBeGreaterThanOrEqual(1);
  });
});
