/**
 * T175: User Language Preference Management
 *
 * Functions to manage user language preferences in the database.
 */

import pool from './db';
import type { Locale } from '@/i18n';
import { isValidLocale } from '@/i18n';

/**
 * Get user's preferred language from database
 *
 * @param userId - User ID
 * @returns User's preferred language or 'en' as default
 */
export async function getUserLanguagePreference(userId: string): Promise<Locale> {
  try {
    const result = await pool.query(
      'SELECT preferred_language FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return 'en'; // Default to English if user not found
    }

    const preference = result.rows[0].preferred_language;
    return isValidLocale(preference) ? preference : 'en';
  } catch (error) {
    console.error('[getUserLanguagePreference] Error:', error);
    return 'en'; // Default to English on error
  }
}

/**
 * Update user's language preference in database
 *
 * @param userId - User ID
 * @param language - New language preference ('en' or 'es')
 * @returns Success status
 */
export async function updateUserLanguagePreference(
  userId: string,
  language: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate language
    if (!isValidLocale(language)) {
      return {
        success: false,
        error: 'Invalid language. Must be "en" or "es".',
      };
    }

    // Update database
    const result = await pool.query(
      `UPDATE users
       SET preferred_language = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, preferred_language`,
      [language, userId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'User not found.',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateUserLanguagePreference] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user profile with language preference
 *
 * @param userId - User ID
 * @returns User profile data including language preference
 */
export async function getUserProfile(userId: string): Promise<{
  id: string;
  email: string;
  name: string;
  preferredLanguage: Locale;
  whatsapp?: string;
  createdAt: Date;
} | null> {
  try {
    const result = await pool.query(
      `SELECT id, email, name, preferred_language, whatsapp, created_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      preferredLanguage: isValidLocale(user.preferred_language)
        ? user.preferred_language
        : 'en',
      whatsapp: user.whatsapp,
      createdAt: user.created_at,
    };
  } catch (error) {
    console.error('[getUserProfile] Error:', error);
    return null;
  }
}
