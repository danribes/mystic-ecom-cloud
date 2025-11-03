/**
 * T176: Translation Management Library
 *
 * Functions for managing multilingual content translations
 * in the admin interface
 */

import pool from './db';
import type { Locale } from '@/i18n';

export interface TranslationStatus {
  contentType: 'course' | 'event' | 'product';
  contentId: string;
  title: string;
  titleEs: string | null;
  description: string;
  descriptionEs: string | null;
  isComplete: boolean;
  completionPercentage: number;
}

export interface CourseTranslation {
  id: string;
  title: string;
  titleEs: string | null;
  description: string;
  descriptionEs: string | null;
  slug: string;
}

export interface EventTranslation {
  id: string;
  title: string;
  titleEs: string | null;
  description: string;
  descriptionEs: string | null;
  slug: string;
}

export interface ProductTranslation {
  id: string;
  title: string;
  titleEs: string | null;
  description: string;
  descriptionEs: string | null;
  slug: string;
}

export interface TranslationStatistics {
  totalCourses: number;
  translatedCourses: number;
  totalEvents: number;
  translatedEvents: number;
  totalProducts: number;
  translatedProducts: number;
  overallCompletion: number;
}

/**
 * Get translation statistics for all content types
 */
export async function getTranslationStatistics(): Promise<TranslationStatistics> {
  try {
    // Count courses
    const coursesResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN title_es IS NOT NULL AND description_es IS NOT NULL THEN 1 END) as translated
      FROM courses
      WHERE deleted_at IS NULL
    `);

    // Count events
    const eventsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN title_es IS NOT NULL AND description_es IS NOT NULL THEN 1 END) as translated
      FROM events
    `);

    // Count products
    const productsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN title_es IS NOT NULL AND description_es IS NOT NULL THEN 1 END) as translated
      FROM digital_products
    `);

    const totalCourses = parseInt(coursesResult.rows[0]?.total || '0');
    const translatedCourses = parseInt(coursesResult.rows[0]?.translated || '0');
    const totalEvents = parseInt(eventsResult.rows[0]?.total || '0');
    const translatedEvents = parseInt(eventsResult.rows[0]?.translated || '0');
    const totalProducts = parseInt(productsResult.rows[0]?.total || '0');
    const translatedProducts = parseInt(productsResult.rows[0]?.translated || '0');

    const totalContent = totalCourses + totalEvents + totalProducts;
    const translatedContent = translatedCourses + translatedEvents + translatedProducts;
    const overallCompletion = totalContent > 0
      ? Math.round((translatedContent / totalContent) * 100)
      : 0;

    return {
      totalCourses,
      translatedCourses,
      totalEvents,
      translatedEvents,
      totalProducts,
      translatedProducts,
      overallCompletion,
    };
  } catch (error) {
    console.error('[getTranslationStatistics] Error:', error);
    throw error;
  }
}

/**
 * Get all courses with translation status
 */
export async function getCourseTranslations(): Promise<CourseTranslation[]> {
  try {
    const result = await pool.query(`
      SELECT id, title, title_es, description, description_es, slug
      FROM courses
      WHERE deleted_at IS NULL
      ORDER BY title ASC
    `);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      titleEs: row.title_es,
      description: row.description,
      descriptionEs: row.description_es,
      slug: row.slug,
    }));
  } catch (error) {
    console.error('[getCourseTranslations] Error:', error);
    throw error;
  }
}

/**
 * Get all events with translation status
 */
export async function getEventTranslations(): Promise<EventTranslation[]> {
  try {
    const result = await pool.query(`
      SELECT id, title, title_es, description, description_es, slug
      FROM events
      ORDER BY title ASC
    `);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      titleEs: row.title_es,
      description: row.description,
      descriptionEs: row.description_es,
      slug: row.slug,
    }));
  } catch (error) {
    console.error('[getEventTranslations] Error:', error);
    throw error;
  }
}

/**
 * Get all products with translation status
 */
export async function getProductTranslations(): Promise<ProductTranslation[]> {
  try {
    const result = await pool.query(`
      SELECT id, title, title_es, description, description_es, slug
      FROM digital_products
      ORDER BY title ASC
    `);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      titleEs: row.title_es,
      description: row.description,
      descriptionEs: row.description_es,
      slug: row.slug,
    }));
  } catch (error) {
    console.error('[getProductTranslations] Error:', error);
    throw error;
  }
}

/**
 * Update course translation
 */
export async function updateCourseTranslation(
  courseId: string,
  titleEs: string,
  descriptionEs: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pool.query(
      `UPDATE courses
       SET title_es = $1, description_es = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING id`,
      [titleEs, descriptionEs, courseId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Course not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateCourseTranslation] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update event translation
 */
export async function updateEventTranslation(
  eventId: string,
  titleEs: string,
  descriptionEs: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pool.query(
      `UPDATE events
       SET title_es = $1, description_es = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id`,
      [titleEs, descriptionEs, eventId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Event not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateEventTranslation] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update product translation
 */
export async function updateProductTranslation(
  productId: string,
  titleEs: string,
  descriptionEs: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await pool.query(
      `UPDATE digital_products
       SET title_es = $1, description_es = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id`,
      [titleEs, descriptionEs, productId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Product not found' };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateProductTranslation] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if translation is complete
 */
export function isTranslationComplete(
  titleEs: string | null,
  descriptionEs: string | null
): boolean {
  return titleEs !== null && titleEs.trim() !== '' &&
         descriptionEs !== null && descriptionEs.trim() !== '';
}

/**
 * Calculate translation completion percentage
 */
export function calculateCompletionPercentage(
  titleEs: string | null,
  descriptionEs: string | null
): number {
  let completed = 0;
  let total = 2;

  if (titleEs && titleEs.trim() !== '') completed++;
  if (descriptionEs && descriptionEs.trim() !== '') completed++;

  return Math.round((completed / total) * 100);
}
