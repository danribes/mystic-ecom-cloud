import type { Page } from '@playwright/test';
import type { User, UserRole } from '../../src/types';
import { pool } from '../setup/database';
import { hashPassword } from '../../src/lib/auth';

interface CreateUserOptions {
  role?: UserRole;
  email?: string;
  password?: string;
  name?: string;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(options: CreateUserOptions = {}): Promise<User> {
  const {
    role = 'user',
    email = `test-${Date.now()}-${Math.random().toString(36).substring(2)}@example.com`,
    password = 'testpass123',
    name = 'Test User'
  } = options;

  const hashedPassword = await hashPassword(password);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, role, created_at, updated_at`,
    [email, hashedPassword, name, role]
  );

  // Store password for login helper
  const user = result.rows[0];
  (user as any).password = password;

  return user;
}

/**
 * Login as a user in Playwright
 */
export async function loginAsUser(page: Page, email: string, password: string = 'testpass123') {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

/**
 * Clean up a test user from the database
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
}