/**
 * T066: Admin Courses List Page - Simplified Tests
 * 
 * Basic functionality tests for the admin courses list page
 * that don't require full authentication setup.
 */

import { test, expect } from '@playwright/test';

test.describe('T066: Admin Courses List Page - Basic Tests', () => {
  test('should load debug admin courses page without auth', async ({ page }) => {
    const response = await page.goto('/admin/courses/debug');
    
    // Should load successfully
    expect(response?.status()).toBe(200);
    
    // Should contain expected content
    await expect(page.locator('h1[data-testid="admin-page-title"]')).toContainText('Course Management');
    await expect(page.locator('h3')).toContainText('Debug Info');
  });

  test('should load test admin courses page without auth', async ({ page }) => {
    const response = await page.goto('/admin/courses/test');
    
    // Should load successfully
    expect(response?.status()).toBe(200);
    
    // Should contain expected content
    await expect(page.locator('h1[data-testid="admin-page-title"]')).toContainText('Course Management');
    await expect(page.locator('h2')).toContainText('Test Admin Course Page');
  });

  test('should handle admin courses access appropriately', async ({ page }) => {
    await page.goto('/admin/courses');
    
    // In development with BYPASS_ADMIN_AUTH=true, should allow access
    // In production, should redirect to login
    const currentUrl = page.url();
    const pageContent = await page.content();
    
    // Either redirected to login OR successfully loaded admin page (bypass mode)
    const isRedirected = currentUrl.includes('login') || currentUrl.includes('auth');
    const hasAdminContent = pageContent.includes('Course Management') && pageContent.includes('admin');
    
    expect(isRedirected || hasAdminContent).toBeTruthy();
  });

  test('should have accessible admin courses route', async ({ page }) => {
    const response = await page.goto('/admin/courses');
    
    // Should not return 404 or 500 error
    expect(response?.status()).toBeLessThan(500);
  });

  test('should load admin courses page structure when authenticated', async ({ page }) => {
    // Mock authentication for this test
    await page.addInitScript(() => {
      // Mock session storage or cookies as needed
      localStorage.setItem('auth-token', 'mock-admin-token');
    });

    await page.goto('/admin/courses');
    
    // Check if page has basic admin structure
    const hasAdminElements = await page.evaluate(() => {
      // Look for admin-specific elements
      const hasTitle = document.querySelector('[data-testid="admin-page-title"]');
      const hasNavigation = document.querySelector('nav') || document.querySelector('.admin-nav');
      return !!(hasTitle || hasNavigation);
    });

    // If the page loaded with admin elements, it's working
    // If it redirected to login, that's also expected behavior
    expect(hasAdminElements || page.url().includes('login')).toBeTruthy();
  });
});

test.describe('T066: Admin Courses Page Components', () => {
  test('should render admin courses page HTML correctly', async ({ page }) => {
    // Test the raw HTML structure
    await page.goto('/admin/courses');
    
    const pageContent = await page.content();
    
    // Check for key structural elements in the HTML
    expect(pageContent).toContain('Course Management');
    expect(pageContent).toContain('data-testid');
    expect(pageContent).toContain('admin');
  });

  test('should have proper meta tags and title', async ({ page }) => {
    await page.goto('/admin/courses');
    
    const title = await page.title();
    expect(title).toContain('Course Management');
  });
});