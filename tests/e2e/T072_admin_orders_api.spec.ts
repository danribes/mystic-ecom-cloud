/**
 * T072 E2E Tests: Admin Orders API Endpoint
 * 
 * Tests the GET /api/admin/orders endpoint with:
 * - Authentication/authorization checks
 * - Query parameter filtering (status, search, dates, itemType)
 * - JSON response format
 * - CSV export format
 * - Data validation
 */

import { test, expect } from '@playwright/test';
import { pool } from '../setup/database';
import { createTestUser, cleanupTestUser, loginAsUser } from '../helpers/auth';
import type { User } from '@/types';

// Test data
let testUser: User;
let testAdmin: User;
let testCourseId: string;
let testOrder1Id: string;
let testOrder2Id: string;
let testOrder3Id: string;

// Store session cookies for API calls
let adminCookies: string = '';
let userCookies: string = '';

test.describe('T072: Admin Orders API Endpoint', () => {
  test.beforeAll(async ({ browser }) => {
    // Clean up any existing test users first
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [
      'admin-orders-api@test.com',
      'user-orders-api@test.com'
    ]);

    // Create test users using helper function (properly hashes passwords)
    testAdmin = await createTestUser({ role: 'admin', email: 'admin-orders-api@test.com', password: 'password123' });
    testUser = await createTestUser({ role: 'user', email: 'user-orders-api@test.com', password: 'password123' });

    // Login users and get session cookies
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAsUser(adminPage, testAdmin.email, 'password123');
    const adminCookiesArray = await adminContext.cookies();
    adminCookies = adminCookiesArray.map(c => `${c.name}=${c.value}`).join('; ');
    await adminContext.close();

    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await loginAsUser(userPage, testUser.email, 'password123');
    const userCookiesArray = await userContext.cookies();
    userCookies = userCookiesArray.map(c => `${c.name}=${c.value}`).join('; ');
    await userContext.close();

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create test course for order items
      const courseResult = await client.query(
        `INSERT INTO courses (title, slug, description, instructor_id, price, duration, level, category, is_published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING id`,
        ['API Test Course', 'api-test-course', 'Course for API testing', testAdmin.id, 4999, 120, 'beginner', 'Testing', true]
      );
      testCourseId = courseResult.rows[0].id;

      // Create test orders with different statuses and dates
      // Order 1: Completed order from 5 days ago
      const order1Result = await client.query(
        `INSERT INTO orders (user_id, status, total_amount, stripe_payment_intent_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
         RETURNING id`,
        [testUser.id, 'completed', 99.99, 'pi_test_completed']
      );
      testOrder1Id = order1Result.rows[0].id;

      await client.query(
        `INSERT INTO order_items (order_id, item_type, course_id, title, price, quantity, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '5 days')`,
        [testOrder1Id, 'course', testCourseId, 'API Test Course', 99.99, 1]
      );

      // Order 2: Pending order from 2 days ago
      const order2Result = await client.query(
        `INSERT INTO orders (user_id, status, total_amount, created_at, updated_at)
         VALUES ($1, $2, $3, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
         RETURNING id`,
        [testUser.id, 'pending', 49.99]
      );
      testOrder2Id = order2Result.rows[0].id;

      await client.query(
        `INSERT INTO order_items (order_id, item_type, course_id, title, price, quantity, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '2 days')`,
        [testOrder2Id, 'course', testCourseId, 'API Test Course', 49.99, 1]
      );

      // Order 3: Cancelled order from today
      const order3Result = await client.query(
        `INSERT INTO orders (user_id, status, total_amount, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [testUser.id, 'cancelled', 79.99]
      );
      testOrder3Id = order3Result.rows[0].id;

      await client.query(
        `INSERT INTO order_items (order_id, item_type, course_id, title, price, quantity, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [testOrder3Id, 'course', testCourseId, 'API Test Course', 79.99, 1]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  test.afterAll(async () => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      
      // Clean up test data
      if (testOrder1Id) {
        await client.query('DELETE FROM order_items WHERE order_id = $1', [testOrder1Id]);
        await client.query('DELETE FROM orders WHERE id = $1', [testOrder1Id]);
      }
      if (testOrder2Id) {
        await client.query('DELETE FROM order_items WHERE order_id = $1', [testOrder2Id]);
        await client.query('DELETE FROM orders WHERE id = $1', [testOrder2Id]);
      }
      if (testOrder3Id) {
        await client.query('DELETE FROM order_items WHERE order_id = $1', [testOrder3Id]);
        await client.query('DELETE FROM orders WHERE id = $1', [testOrder3Id]);
      }
      if (testCourseId) await client.query('DELETE FROM courses WHERE id = $1', [testCourseId]);
      if (testUser) await cleanupTestUser(testUser.id);
      if (testAdmin) await cleanupTestUser(testAdmin.id);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Cleanup error:', error);
    } finally {
      client.release();
    }
  });

  test('should require authentication', async ({ request }) => {
    const response = await request.get('/api/admin/orders');
    
    expect(response.status()).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Authentication required');
  });

  test('should require admin role', async ({ request }) => {
    // Make API request with user session (not admin)
    const response = await request.get('/api/admin/orders', {
      headers: { 'Cookie': userCookies }
    });
    
    expect(response.status()).toBe(403);
    const json = await response.json();
    expect(json.error).toBe('Admin access required');
  });

  test('should return all orders for admin in JSON format', async ({ request }) => {
    const response = await request.get('/api/admin/orders', {
      headers: { 'Cookie': adminCookies }
    });
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.orders).toBeDefined();
    expect(Array.isArray(json.data.orders)).toBe(true);
    expect(json.data.count).toBeGreaterThanOrEqual(3);
  });

  test('should filter orders by status', async ({ request }) => {
    const response = await request.get('/api/admin/orders?status=completed', {
      headers: { 'Cookie': adminCookies }
    });
    
    expect(response.status()).toBe(200);
    const json = await response.json();
    
    expect(json.data.orders).toBeDefined();
    expect(json.data.filters.status).toBe('completed');
    
    // All returned orders should have completed status
    for (const order of json.data.orders) {
      expect(order.status).toBe('completed');
    }
  });

  test('should filter orders by search query (email)', async ({ request }) => {
    const response = await request.get('/api/admin/orders?search=user-orders-api', {
      headers: { 'Cookie': adminCookies }
    });
    
    expect(response.status()).toBe(200);
    const json = await response.json();
    
    expect(json.data.orders).toBeDefined();
    expect(json.data.count).toBeGreaterThanOrEqual(3);
    
    // All orders should be from the searched user
    for (const order of json.data.orders) {
      expect(order.userEmail).toContain('user-orders-api');
    }
  });

  test('should filter orders by date range', async ({ request }) => {
    // Get orders from last 3 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);
    
    const response = await request.get(
      `/api/admin/orders?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      { headers: { 'Cookie': adminCookies } }
    );
    
    expect(response.status()).toBe(200);
    const json = await response.json();
    
    expect(json.data.orders).toBeDefined();
    
    // Should include order2 (2 days ago) and order3 (today)
    // Should NOT include order1 (5 days ago)
    const orderIds = json.data.orders.map((o: any) => o.id);
    expect(orderIds).toContain(testOrder2Id);
    expect(orderIds).toContain(testOrder3Id);
  });

  test('should filter orders by item type', async ({ request }) => {
    const response = await request.get('/api/admin/orders?itemType=course', {
      headers: { 'Cookie': adminCookies }
    });
    
    expect(response.status()).toBe(200);
    const json = await response.json();
    
    expect(json.data.orders).toBeDefined();
    expect(json.data.filters.itemType).toBe('course');
    
    // All orders should contain at least one course item
    for (const order of json.data.orders) {
      const hasCourseItem = order.items.some((item: any) => item.itemType === 'course');
      expect(hasCourseItem).toBe(true);
    }
  });

  test('should combine multiple filters', async ({ request }) => {
    const response = await request.get('/api/admin/orders?status=pending&search=user-orders', {
      headers: { 'Cookie': adminCookies }
    });
    
    expect(response.status()).toBe(200);
    const json = await response.json();
    
    expect(json.data.orders).toBeDefined();
    
    // All orders should match both filters
    for (const order of json.data.orders) {
      expect(order.status).toBe('pending');
      expect(order.userEmail).toContain('user-orders');
    }
  });

  test('should export orders to CSV format', async ({ request }) => {
    const response = await request.get('/api/admin/orders?format=csv', {
      headers: { 'Cookie': adminCookies }
    });
    
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/csv');
    expect(response.headers()['content-disposition']).toContain('attachment');
    expect(response.headers()['content-disposition']).toContain('orders-export-');
    
    const csvText = await response.text();
    
    // Should have CSV headers
    expect(csvText).toContain('Order ID');
    expect(csvText).toContain('User Email');
    expect(csvText).toContain('Status');
    expect(csvText).toContain('Total');
    
    // Should have data rows (at least our 3 test orders)
    const lines = csvText.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(4); // Header + 3 orders + possible empty line
  });

  test('should include order items in response', async ({ request }) => {
    const response = await request.get('/api/admin/orders', {
      headers: { 'Cookie': adminCookies }
    });
    
    expect(response.status()).toBe(200);
    const json = await response.json();
    
    // Find one of our test orders
    const testOrder = json.data.orders.find((o: any) => o.id === testOrder1Id);
    expect(testOrder).toBeDefined();
    
    // Should have items array
    expect(testOrder.items).toBeDefined();
    expect(Array.isArray(testOrder.items)).toBe(true);
    expect(testOrder.items.length).toBeGreaterThan(0);
    
    // Items should have required fields
    const item = testOrder.items[0];
    expect(item.itemType).toBeDefined();
    expect(item.itemTitle).toBeDefined();
    expect(item.price).toBeDefined();
    expect(item.quantity).toBeDefined();
  });

  test('should handle invalid query parameters gracefully', async ({ request }) => {
    // Invalid status value
    const response = await request.get('/api/admin/orders?status=invalid_status', {
      headers: { 'Cookie': adminCookies }
    });
    
    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.error).toBe('Invalid query parameters');
    expect(json.details).toBeDefined();
  });

  test('should return empty array when no orders match filters', async ({ request }) => {
    // Search for non-existent email
    const response = await request.get('/api/admin/orders?search=nonexistent@example.com', {
      headers: { 'Cookie': adminCookies }
    });
    
    expect(response.status()).toBe(200);
    const json = await response.json();
    
    expect(json.success).toBe(true);
    expect(json.data.orders).toEqual([]);
    expect(json.data.count).toBe(0);
  });
});
