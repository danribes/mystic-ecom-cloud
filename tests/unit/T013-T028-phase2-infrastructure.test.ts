/**
 * Phase 2 Infrastructure Test
 * 
 * Tests database connection, Redis, password hashing, and validation utilities.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { checkConnection as checkDb, query, closePool } from '@/lib/db';
import { checkConnection as checkRedis, set, get, del, closeRedis } from '@/lib/redis';
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/lib/auth/password';
import { slugify, formatPrice, truncate, chunk } from '@/lib/utils';
import { emailSchema, passwordSchema, loginSchema } from '@/lib/validation';

describe('Phase 2: Foundational Infrastructure', () => {
  afterAll(async () => {
    // Clean up connections
    await closePool();
    await closeRedis();
  });

  describe('Database Connection Pool', () => {
    it('should connect to PostgreSQL', async () => {
      const isConnected = await checkDb();
      expect(isConnected).toBe(true);
    });

    it('should query the database', async () => {
      const result = await query('SELECT NOW() as now');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].now).toBeDefined();
    });

    it('should list all tables', async () => {
      const result = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      
      const tableNames = result.rows.map((row) => row.table_name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('courses');
      expect(tableNames).toContain('events');
      expect(tableNames).toContain('orders');
    });
  });

  describe('Redis Client', () => {
    it('should connect to Redis', async () => {
      const isConnected = await checkRedis();
      expect(isConnected).toBe(true);
    });

    it('should set and get values', async () => {
      await set('test:key', 'test value');
      const value = await get('test:key');
      expect(value).toBe('test value');
      await del('test:key');
    });

    it('should handle expiration', async () => {
      await set('test:expire', 'expires soon', 1); // 1 second
      const value = await get('test:expire');
      expect(value).toBe('expires soon');
      
      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const expiredValue = await get('test:expire');
      expect(expiredValue).toBeNull();
    });
  });

  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'MySecure123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'MySecure123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'MySecure123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword', hash);
      
      expect(isValid).toBe(false);
    });

    it('should validate password strength', () => {
      const weak = validatePasswordStrength('weak');
      expect(weak.isValid).toBe(false);
      
      const strong = validatePasswordStrength('Strong123!');
      expect(strong.isValid).toBe(true);
    });
  });

  describe('Validation Utilities', () => {
    it('should validate email', () => {
      const validEmail = emailSchema.safeParse('test@example.com');
      expect(validEmail.success).toBe(true);
      
      const invalidEmail = emailSchema.safeParse('invalid-email');
      expect(invalidEmail.success).toBe(false);
    });

    it('should validate password', () => {
      const validPassword = passwordSchema.safeParse('Strong123!');
      expect(validPassword.success).toBe(true);
      
      const weakPassword = passwordSchema.safeParse('weak');
      expect(weakPassword.success).toBe(false);
    });

    it('should validate login credentials', () => {
      const validLogin = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(validLogin.success).toBe(true);
      
      const invalidLogin = loginSchema.safeParse({
        email: 'invalid',
        password: '',
      });
      expect(invalidLogin.success).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should format prices', () => {
      expect(formatPrice(1999)).toBe('$19.99');
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(100000)).toBe('$1,000.00');
    });

    it('should create slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('This is a Test!')).toBe('this-is-a-test');
      expect(slugify('  Spaces  ')).toBe('spaces');
    });

    it('should truncate text', () => {
      const long = 'This is a very long text that needs to be truncated';
      expect(truncate(long, 20)).toBe('This is a very long...');
      
      const short = 'Short';
      expect(truncate(short, 20)).toBe('Short');
    });

    it('should chunk arrays', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const chunks = chunk(arr, 3);
      
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
    });
  });
});
