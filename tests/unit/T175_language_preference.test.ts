/**
 * T175: User Language Preference Tests
 * Tests for managing user language preferences in the database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '../../src/lib/db';
import {
  getUserLanguagePreference,
  updateUserLanguagePreference,
  getUserProfile,
} from '@/lib/userPreferences';

describe('User Language Preference (T175)', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Run migration to add preferred_language column
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en'
        CHECK (preferred_language IN ('en', 'es'))
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language)
    `);

    // Create a test user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, preferred_language)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['test-lang@example.com', 'hash123', 'Test User', 'en']
    );
    testUserId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  describe('getUserLanguagePreference', () => {
    it('should return user preferred language', async () => {
      const language = await getUserLanguagePreference(testUserId);
      expect(language).toBe('en');
    });

    it('should return default language for non-existent user', async () => {
      const language = await getUserLanguagePreference('00000000-0000-0000-0000-000000000000');
      expect(language).toBe('en');
    });

    it('should always return a valid locale', async () => {
      const language = await getUserLanguagePreference(testUserId);
      expect(['en', 'es']).toContain(language);
    });
  });

  describe('updateUserLanguagePreference', () => {
    it('should update user language to Spanish', async () => {
      const result = await updateUserLanguagePreference(testUserId, 'es');
      expect(result.success).toBe(true);

      const language = await getUserLanguagePreference(testUserId);
      expect(language).toBe('es');
    });

    it('should update user language back to English', async () => {
      // First set to Spanish
      await updateUserLanguagePreference(testUserId, 'es');

      // Then update to English
      const result = await updateUserLanguagePreference(testUserId, 'en');
      expect(result.success).toBe(true);

      const language = await getUserLanguagePreference(testUserId);
      expect(language).toBe('en');
    });

    it('should reject invalid language', async () => {
      const result = await updateUserLanguagePreference(testUserId, 'fr');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid language');
    });

    it('should reject empty language', async () => {
      const result = await updateUserLanguagePreference(testUserId, '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid language');
    });

    it('should fail for non-existent user', async () => {
      const result = await updateUserLanguagePreference(
        '00000000-0000-0000-0000-000000000000',
        'es'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    it('should handle multiple updates correctly', async () => {
      await updateUserLanguagePreference(testUserId, 'es');
      let language = await getUserLanguagePreference(testUserId);
      expect(language).toBe('es');

      await updateUserLanguagePreference(testUserId, 'en');
      language = await getUserLanguagePreference(testUserId);
      expect(language).toBe('en');

      await updateUserLanguagePreference(testUserId, 'es');
      language = await getUserLanguagePreference(testUserId);
      expect(language).toBe('es');

      // Reset to English
      await updateUserLanguagePreference(testUserId, 'en');
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile with language preference', async () => {
      const profile = await getUserProfile(testUserId);

      expect(profile).not.toBeNull();
      expect(profile?.id).toBe(testUserId);
      expect(profile?.email).toBe('test-lang@example.com');
      expect(profile?.name).toBe('Test User');
      expect(profile?.preferredLanguage).toBe('en');
      expect(profile?.createdAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent user', async () => {
      const profile = await getUserProfile('00000000-0000-0000-0000-000000000000');
      expect(profile).toBeNull();
    });

    it('should reflect updated language preference', async () => {
      // Update to Spanish
      await updateUserLanguagePreference(testUserId, 'es');

      const profile = await getUserProfile(testUserId);
      expect(profile?.preferredLanguage).toBe('es');

      // Reset to English
      await updateUserLanguagePreference(testUserId, 'en');
    });

    it('should have correct property types', async () => {
      const profile = await getUserProfile(testUserId);

      expect(typeof profile?.id).toBe('string');
      expect(typeof profile?.email).toBe('string');
      expect(typeof profile?.name).toBe('string');
      expect(typeof profile?.preferredLanguage).toBe('string');
      expect(profile?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Database Integration', () => {
    it('should persist language preference across sessions', async () => {
      // Set to Spanish
      await updateUserLanguagePreference(testUserId, 'es');

      // Simulate new session by querying directly
      const result = await pool.query(
        'SELECT preferred_language FROM users WHERE id = $1',
        [testUserId]
      );

      expect(result.rows[0].preferred_language).toBe('es');

      // Reset
      await updateUserLanguagePreference(testUserId, 'en');
    });

    it('should update timestamp when preference changes', async () => {
      // Get initial timestamp
      const before = await pool.query(
        'SELECT updated_at FROM users WHERE id = $1',
        [testUserId]
      );
      const beforeTime = before.rows[0].updated_at;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 100));
      await updateUserLanguagePreference(testUserId, 'es');

      // Get new timestamp
      const after = await pool.query(
        'SELECT updated_at FROM users WHERE id = $1',
        [testUserId]
      );
      const afterTime = after.rows[0].updated_at;

      expect(new Date(afterTime).getTime()).toBeGreaterThan(new Date(beforeTime).getTime());

      // Reset
      await updateUserLanguagePreference(testUserId, 'en');
    });

    it('should enforce check constraint for valid languages', async () => {
      // Try to insert invalid language directly
      await expect(
        pool.query(
          'UPDATE users SET preferred_language = $1 WHERE id = $2',
          ['invalid', testUserId]
        )
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null userId gracefully', async () => {
      const language = await getUserLanguagePreference(null as any);
      expect(language).toBe('en');
    });

    it('should handle undefined userId gracefully', async () => {
      const language = await getUserLanguagePreference(undefined as any);
      expect(language).toBe('en');
    });

    it('should handle special characters in userId gracefully', async () => {
      const language = await getUserLanguagePreference('invalid-uuid');
      expect(language).toBe('en');
    });
  });

  describe('Type Consistency', () => {
    it('should always return Locale type from getUserLanguagePreference', async () => {
      const language = await getUserLanguagePreference(testUserId);
      expect(typeof language).toBe('string');
      expect(['en', 'es']).toContain(language);
    });

    it('should return object with success property from update', async () => {
      const result = await updateUserLanguagePreference(testUserId, 'es');
      expect(typeof result).toBe('object');
      expect('success' in result).toBe(true);
      expect(typeof result.success).toBe('boolean');

      // Reset
      await updateUserLanguagePreference(testUserId, 'en');
    });
  });
});
