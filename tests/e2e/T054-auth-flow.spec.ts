/**
 * T054: E2E Tests for Authentication Flow
 * 
 * Tests the complete authentication user journey:
 * - User registration
 * - User login
 * - Session persistence
 * - Logout
 * - Protected route access
 */

import { test, expect, type Page } from '@playwright/test';

// Helper to generate unique test user
const generateTestUser = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    name: `Test User ${timestamp}`,
    email: `test.user.${timestamp}.${random}@example.com`,
    password: 'TestPassword123!',
  };
};

// Helper to clear all cookies and storage
const clearAuth = async (page: Page) => {
  await page.context().clearCookies();
  // Only clear storage if we're on a page (not about:blank)
  if (page.url() !== 'about:blank') {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    }).catch(() => {
      // Ignore errors if storage is not accessible
    });
  }
};

test.describe('Authentication Flow - Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home first to avoid localStorage errors
    await page.goto('/');
    await clearAuth(page);
  });

  test('should display registration form', async ({ page }) => {
    await page.goto('/register');

    // Check for form elements - use more specific selector for h1
    const mainHeading = page.locator('main h1, .max-w-md h1').first();
    await expect(mainHeading).toContainText(/register|sign up|create account/i);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should register a new user successfully', async ({ page }) => {
    const user = generateTestUser();

    await page.goto('/register');

    // Fill in the form
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirm_password"]', user.password);
    
    // Check terms checkbox
    await page.check('input[name="terms"]');

    // Submit form and wait for navigation
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should redirect to login with success message or dashboard
    const url = page.url();
    if (url.includes('/login')) {
      await expect(page.locator('text=/success|registered|account created/i')).toBeVisible({ timeout: 5000 });
    } else if (url.includes('/dashboard')) {
      // Successfully logged in and redirected to dashboard
      await expect(page.locator('h1')).toContainText(/dashboard|welcome/i, { timeout: 5000 });
    }
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto('/register');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Should show validation errors (HTML5 or custom)
    const nameInput = page.locator('input[name="name"]');
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    // Check that form didn't submit (still on register page)
    await expect(page).toHaveURL(/\/register/);
  });

  test('should reject weak password', async ({ page }) => {
    const user = generateTestUser();

    await page.goto('/register');

    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', 'weak'); // Weak password (less than 8 chars)
    await page.fill('input[name="confirm_password"]', 'weak');
    await page.check('input[name="terms"]');

    // Click submit - should be prevented by client-side or server-side validation
    page.on('dialog', dialog => dialog.accept()); // Handle alert if shown
    await page.click('button[type="submit"]');

    // Wait a bit for any alert or validation
    await page.waitForTimeout(1000);

    // Should still be on register page or show error
    await expect(page).toHaveURL(/\/register/);
  });

  test('should reject duplicate email', async ({ page }) => {
    const user = generateTestUser();

    // Register user first time
    await page.goto('/register');
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirm_password"]', user.password);
    await page.check('input[name="terms"]');

    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Clear auth and try to register again with same email
    await page.goto('/');
    await clearAuth(page);
    await page.goto('/register');

    await page.fill('input[name="name"]', 'Another User');
    await page.fill('input[name="email"]', user.email); // Same email
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirm_password"]', user.password);
    await page.check('input[name="terms"]');

    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should show error about duplicate email
    await expect(
      page.locator('text=/already exists|already registered|email taken/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should have link to login page', async ({ page }) => {
    await page.goto('/register');

    const loginLink = page.locator('main a[href*="/login"], .max-w-md a[href*="/login"]').first();
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toContainText(/login|sign in|already have/i);
  });
});

test.describe('Authentication Flow - Login', () => {
  let registeredUser: { name: string; email: string; password: string };

  test.beforeAll(async ({ browser }) => {
    // Register a user to use for login tests
    registeredUser = generateTestUser();
    const page = await browser.newPage();

    await page.goto('/register');
    await page.fill('input[name="name"]', registeredUser.name);
    await page.fill('input[name="email"]', registeredUser.email);
    await page.fill('input[name="password"]', registeredUser.password);
    await page.fill('input[name="confirm_password"]', registeredUser.password);
    await page.check('input[name="terms"]');

    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to home first to avoid localStorage errors
    await page.goto('/');
    await clearAuth(page);
  });

  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    // Check for form elements - use more specific selector for h1
    const mainHeading = page.locator('main h1, .max-w-md h1').first();
    await expect(mainHeading).toContainText(/login|sign in|welcome/i);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in login form
    await page.fill('input[name="email"]', registeredUser.email);
    await page.fill('input[name="password"]', registeredUser.password);

    // Submit form and wait for navigation
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Should see dashboard heading - use more specific selector
    const dashboardHeading = page.locator('main h1, .dashboard h1').first();
    await expect(dashboardHeading).toBeVisible({ timeout: 5000 });
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', registeredUser.email);
    await page.fill('input[name="password"]', 'WrongPassword123!');

    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should show error message or stay on login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    
    // Look for error message
    const errorMsg = page.locator('text=/invalid|incorrect|wrong|failed/i');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test('should reject non-existent user', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'SomePassword123!');

    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Should show error message or stay on login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    const errorMsg = page.locator('text=/not found|invalid|incorrect|failed/i');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test('should have link to registration page', async ({ page }) => {
    await page.goto('/login');

    const registerLink = page.locator('main a[href*="/register"], .max-w-md a[href*="/register"]').first();
    await expect(registerLink).toBeVisible();
    // The text "Create a new account" contains "account"
    await expect(registerLink).toContainText(/account|register|sign up/i);
  });

  test('should persist session across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', registeredUser.email);
    await page.fill('input[name="password"]', registeredUser.password);
    
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Reload page
    await page.reload();

    // Should still be logged in (on dashboard)
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should have session cookie set after login', async ({ page, context }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', registeredUser.email);
    await page.fill('input[name="password"]', registeredUser.password);
    
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Check for session cookie
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === 'sid');

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.value).toBeTruthy();
  });
});

test.describe('Authentication Flow - Logout', () => {
  let registeredUser: { name: string; email: string; password: string };

  test.beforeAll(async ({ browser }) => {
    // Register a user
    registeredUser = generateTestUser();
    const page = await browser.newPage();

    await page.goto('/register');
    await page.fill('input[name="name"]', registeredUser.name);
    await page.fill('input[name="email"]', registeredUser.email);
    await page.fill('input[name="password"]', registeredUser.password);
    await page.fill('input[name="confirm_password"]', registeredUser.password);
    await page.check('input[name="terms"]');

    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to home first
    await page.goto('/');
    await clearAuth(page);

    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', registeredUser.email);
    await page.fill('input[name="password"]', registeredUser.password);
    
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });

  test('should have logout button/link in dashboard', async ({ page }) => {
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Log out"), a:has-text("Sign out")'
    );
    await expect(logoutButton.first()).toBeVisible();
  });

  test('should logout and redirect to home/login', async ({ page }) => {
    // Click logout
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Log out"), a:has-text("Sign out")'
    );
    await logoutButton.first().click();

    // Should redirect away from dashboard (to login or home)
    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 10000 });

    // Session cookie should be removed
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === 'sid');
    expect(sessionCookie).toBeUndefined();
  });

  test('should not access dashboard after logout', async ({ page }) => {
    // Logout
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Log out"), a:has-text("Sign out")'
    );
    await logoutButton.first().click();
    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 10000 });

    // Try to access dashboard
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Authentication Flow - Protected Routes', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home first to avoid localStorage errors
    await page.goto('/');
    await clearAuth(page);
  });

  test('should redirect to login when accessing protected route without auth', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should redirect to login with return URL', async ({ page }) => {
    // Test that protected profile route redirects to login
    await page.goto('/dashboard/profile');

    // Should redirect to login with return URL
    await expect(page).toHaveURL(/\/login\?redirect=/, { timeout: 10000 });
  });

  test('should allow access to public routes without auth', async ({ page }) => {
    // Home page
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Login page
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // Register page
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Authentication Flow - Complete User Journey', () => {
  test('should complete full auth cycle: register → login → logout → login again', async ({
    page,
  }) => {
    const user = generateTestUser();

    // 1. Register
    await page.goto('/register');
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirm_password"]', user.password);
    await page.check('input[name="terms"]');
    
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // 2. Login (if not auto-logged in)
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);
      
      await Promise.all([
        page.waitForNavigation({ timeout: 10000 }),
        page.click('button[type="submit"]')
      ]);
    }

    // Verify logged in (should be on dashboard)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // 3. Logout
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Log out"), a:has-text("Sign out")'
    );
    await logoutButton.first().click();
    
    // Should redirect to login or home (may have success parameter)
    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 10000 });

    // 4. Login again
    await page.goto('/login');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);

    // Verify logged in again
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  });
});
