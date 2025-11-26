/**
 * Course Service with I18n Support (T168)
 *
 * Locale-aware functions for retrieving course content in multiple languages.
 * Uses the multilingual schema from T167 and i18nContent helpers.
 */

import { getPool } from './db';
import type { Locale } from '../i18n';
import { getSQLCoalesce } from './i18nContent';

export interface LocalizedCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription?: string;
  price: number;
  imageUrl?: string;
  level: string;
  durationHours?: number;
  learningOutcomes: string[];
  prerequisites: string[];
  curriculum: any;
  isPublished: boolean;
  avgRating?: number;
  reviewCount: number;
  enrollmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetLocalizedCoursesFilters {
  category?: string;
  level?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  limit?: number;
  offset?: number;
  locale?: Locale;
}

/**
 * Get a single course by ID with localized content
 *
 * @param id - Course ID
 * @param locale - Desired language locale ('en' or 'es')
 * @returns Localized course data or null if not found
 */
export async function getLocalizedCourseById(
  id: string,
  locale: Locale = 'en'
): Promise<LocalizedCourse | null> {
  const query = `
    SELECT
      c.id,
      c.slug,
      ${getSQLCoalesce('title', locale)},
      ${getSQLCoalesce('description', locale)},
      c.price,
      c.image_url,
      c.level,
      c.duration_hours,
      c.is_published,
      c.created_at,
      c.updated_at,
      -- Get localized arrays
      COALESCE(
        CASE
          WHEN $2 = 'es' AND c.learning_outcomes_es IS NOT NULL
          THEN c.learning_outcomes_es
          ELSE c.learning_outcomes
        END,
        ARRAY[]::TEXT[]
      ) as learning_outcomes,
      COALESCE(
        CASE
          WHEN $2 = 'es' AND c.prerequisites_es IS NOT NULL
          THEN c.prerequisites_es
          ELSE c.prerequisites
        END,
        ARRAY[]::TEXT[]
      ) as prerequisites,
      -- Get localized curriculum
      COALESCE(
        CASE
          WHEN $2 = 'es' AND c.curriculum_es IS NOT NULL
          THEN c.curriculum_es
          ELSE c.curriculum
        END,
        '{}'::JSONB
      ) as curriculum,
      -- Aggregated stats
      COALESCE(AVG(r.rating), 0) as avg_rating,
      COUNT(DISTINCT r.id)::INTEGER as review_count,
      0::INTEGER as enrollment_count
    FROM courses c
    LEFT JOIN reviews r ON c.id = r.course_id AND r.is_approved = true
    WHERE c.id = $1
    GROUP BY c.id
  `;

  try {
    const pool = getPool();
    if (!pool) {
      console.warn('[T168] Database not available for getLocalizedCourseById');
      return null;
    }

    const result = await pool.query(query, [id, locale]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      longDescription: row.long_description,
      price: parseFloat(row.price),
      imageUrl: row.image_url,
      level: row.level,
      durationHours: row.duration_hours,
      learningOutcomes: row.learning_outcomes || [],
      prerequisites: row.prerequisites || [],
      curriculum: row.curriculum || {},
      isPublished: row.is_published,
      avgRating: parseFloat(row.avg_rating) || undefined,
      reviewCount: row.review_count || 0,
      enrollmentCount: row.enrollment_count || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('[T168] Error fetching localized course:', error);
    throw error;
  }
}

/**
 * Get a course by slug with localized content
 *
 * @param slug - Course slug
 * @param locale - Desired language locale
 * @returns Localized course data or null if not found
 */
export async function getLocalizedCourseBySlug(
  slug: string,
  locale: Locale = 'en'
): Promise<LocalizedCourse | null> {
  const query = `
    SELECT
      c.id,
      c.slug,
      ${getSQLCoalesce('title', locale)},
      ${getSQLCoalesce('description', locale)},
      c.price,
      c.image_url,
      c.level,
      c.duration_hours,
      c.is_published,
      c.created_at,
      c.updated_at,
      COALESCE(
        CASE
          WHEN $2 = 'es' AND c.learning_outcomes_es IS NOT NULL
          THEN c.learning_outcomes_es
          ELSE c.learning_outcomes
        END,
        ARRAY[]::TEXT[]
      ) as learning_outcomes,
      COALESCE(
        CASE
          WHEN $2 = 'es' AND c.prerequisites_es IS NOT NULL
          THEN c.prerequisites_es
          ELSE c.prerequisites
        END,
        ARRAY[]::TEXT[]
      ) as prerequisites,
      COALESCE(
        CASE
          WHEN $2 = 'es' AND c.curriculum_es IS NOT NULL
          THEN c.curriculum_es
          ELSE c.curriculum
        END,
        '{}'::JSONB
      ) as curriculum,
      COALESCE(AVG(r.rating), 0) as avg_rating,
      COUNT(DISTINCT r.id)::INTEGER as review_count,
      0::INTEGER as enrollment_count
    FROM courses c
    LEFT JOIN reviews r ON c.id = r.course_id AND r.is_approved = true
    WHERE c.slug = $1 AND c.is_published = true
    GROUP BY c.id
  `;

  try {
    const pool = getPool();
    if (!pool) {
      console.warn('[T168] Database not available for getLocalizedCourseBySlug');
      return null;
    }

    const result = await pool.query(query, [slug, locale]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      longDescription: row.long_description,
      price: parseFloat(row.price),
      imageUrl: row.image_url,
      level: row.level,
      durationHours: row.duration_hours,
      learningOutcomes: row.learning_outcomes || [],
      prerequisites: row.prerequisites || [],
      curriculum: row.curriculum || {},
      isPublished: row.is_published,
      avgRating: parseFloat(row.avg_rating) || undefined,
      reviewCount: row.review_count || 0,
      enrollmentCount: row.enrollment_count || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('[T168] Error fetching localized course by slug:', error);
    throw error;
  }
}

/**
 * Get multiple courses with localized content and filtering
 *
 * @param filters - Filter options including locale
 * @returns Localized courses with pagination info
 */
export async function getLocalizedCourses(
  filters: GetLocalizedCoursesFilters = {}
): Promise<{ items: LocalizedCourse[]; total: number; hasMore: boolean }> {
  const {
    category,
    level,
    minPrice,
    maxPrice,
    minRating,
    search,
    limit = 12,
    offset = 0,
    locale = 'en',
  } = filters;

  let query = `
    SELECT
      c.id,
      c.slug,
      ${getSQLCoalesce('title', locale)},
      ${getSQLCoalesce('description', locale)},
      c.price,
      c.image_url,
      c.level,
      c.duration_hours,
      c.is_published,
      c.created_at,
      c.updated_at,
      COALESCE(AVG(r.rating), 0) as avg_rating,
      COUNT(DISTINCT r.id)::INTEGER as review_count,
      0::INTEGER as enrollment_count
    FROM courses c
    LEFT JOIN reviews r ON c.id = r.course_id AND r.is_approved = true
    WHERE c.is_published = true
  `;

  const params: any[] = [];
  let paramIndex = 1;

  // Category filter
  if (category && category !== 'all') {
    query += ` AND c.category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  // Level filter
  if (level && level !== 'all') {
    query += ` AND c.level = $${paramIndex}`;
    params.push(level);
    paramIndex++;
  }

  // Price range
  if (minPrice !== undefined && minPrice >= 0) {
    query += ` AND c.price >= $${paramIndex}`;
    params.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined && maxPrice >= 0) {
    query += ` AND c.price <= $${paramIndex}`;
    params.push(maxPrice);
    paramIndex++;
  }

  // Search in both English and Spanish fields
  if (search && search.trim()) {
    if (locale === 'es') {
      query += ` AND (
        c.title ILIKE $${paramIndex} OR
        c.title_es ILIKE $${paramIndex} OR
        c.description ILIKE $${paramIndex} OR
        c.description_es ILIKE $${paramIndex}
      )`;
    } else {
      query += ` AND (
        c.title ILIKE $${paramIndex} OR
        c.description ILIKE $${paramIndex}
      )`;
    }
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }

  query += ` GROUP BY c.id`;

  // Rating filter (after aggregation)
  if (minRating !== undefined && minRating > 0) {
    query += ` HAVING COALESCE(AVG(r.rating), 0) >= $${paramIndex}`;
    params.push(minRating);
    paramIndex++;
  }

  query += ` ORDER BY avg_rating DESC, c.created_at DESC`;
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit + 1); // Fetch one extra to check for more
  params.push(offset);

  try {
    const pool = getPool();
    if (!pool) {
      console.warn('[T168] Database not available for getLocalizedCourses');
      return { items: [], total: 0, hasMore: false };
    }

    const result = await pool.query(query, params);
    const hasMore = result.rows.length > limit;
    const items = (hasMore ? result.rows.slice(0, limit) : result.rows).map(row => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      longDescription: row.long_description,
      price: parseFloat(row.price),
      imageUrl: row.image_url,
      level: row.level,
      durationHours: row.duration_hours,
      learningOutcomes: [],
      prerequisites: [],
      curriculum: {},
      isPublished: row.is_published,
      avgRating: parseFloat(row.avg_rating) || undefined,
      reviewCount: row.review_count || 0,
      enrollmentCount: row.enrollment_count || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    // Get total count
    const countQuery = `SELECT COUNT(DISTINCT c.id) as total FROM courses c WHERE c.is_published = true`;
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0]?.total || '0');

    return { items, total, hasMore };
  } catch (error) {
    console.error('[T168] Error fetching localized courses:', error);
    throw error;
  }
}
