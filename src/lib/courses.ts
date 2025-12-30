/**
 * Course Service
 * Handles all course-related database operations including catalog browsing, filtering, and enrollment
 *
 * T212: Added caching layer for performance optimization
 */

import { getPool } from './db';
import type { Pool, PoolClient } from 'pg';
import {
  generateCacheKey,
  getCached,
  setCached,
  invalidateCache,
  CacheNamespace,
  CacheTTL,
} from './redis';

export interface Course {
  id: number;
  title: string;
  description: string;
  long_description: string | null;
  instructor: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  original_price: number | null;
  duration_hours: number;
  thumbnail_url: string | null;
  video_url: string | null;
  rating: number | null;
  review_count: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GetCoursesFilters {
  category?: string;
  level?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  limit?: number;
  offset?: number;
  isFeatured?: boolean;
  sortBy?: 'createdAt' | 'price' | 'rating' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface GetCoursesResult {
  items: Course[];
  total: number;
  hasMore: boolean;
}

/**
 * Get courses with optional filtering
 *
 * T212: Added caching with 10-minute TTL
 */
export async function getCourses(filters: GetCoursesFilters = {}): Promise<GetCoursesResult> {
  const {
    category,
    level,
    minPrice,
    maxPrice,
    minRating,
    search,
    limit = 12,
    offset = 0,
    isFeatured,
    sortBy = 'rating',
    sortOrder = 'desc',
  } = filters;

  // Generate cache key based on filters
  const cacheKey = generateCacheKey(
    CacheNamespace.COURSES,
    'list',
    JSON.stringify(filters)
  );

  // Try to get from cache
  const cached = await getCached<GetCoursesResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  let query = `
    SELECT 
      c.*,
      COALESCE(AVG(r.rating), 0) as rating,
      COUNT(DISTINCT r.id) as review_count
    FROM courses c
    LEFT JOIN reviews r ON c.id = r.course_id AND r.is_approved = true
    WHERE c.is_published = true
  `;

  const params: any[] = [];
  let paramIndex = 1;

  // Category filter
  // NOTE: Category column doesn't exist in schema - filter disabled
  // if (category && category !== 'all') {
  //   query += ` AND c.category = $${paramIndex}`;
  //   params.push(category);
  //   paramIndex++;
  // }

  // Level filter
  if (level && level !== 'all') {
    query += ` AND c.level = $${paramIndex}`;
    params.push(level);
    paramIndex++;
  }

  // Price range filter
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

  // Search filter
  if (search && search.trim()) {
    query += ` AND (
      c.title ILIKE $${paramIndex} OR
      c.description ILIKE $${paramIndex} OR
      c.instructor ILIKE $${paramIndex}
    )`;
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }

  // Featured filter
  if (isFeatured !== undefined) {
    query += ` AND c.is_featured = $${paramIndex}`;
    params.push(isFeatured);
    paramIndex++;
  }

  // Group by for aggregates
  query += ` GROUP BY c.id`;

  // Rating filter (applied after aggregation)
  if (minRating !== undefined && minRating > 0) {
    query += ` HAVING COALESCE(AVG(r.rating), 0) >= $${paramIndex}`;
    params.push(minRating);
    paramIndex++;
  }

  // Dynamic sorting
  const sortColumn = {
    createdAt: 'c.created_at',
    price: 'c.price',
    rating: 'rating',
    title: 'c.title',
  }[sortBy] || 'rating';

  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortColumn} ${order}, c.created_at DESC`;

  // Pagination
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit + 1); // Fetch one extra to check if there are more
  params.push(offset);

  try {
    const pool = getPool();
    if (!pool) {
      console.warn('[courses] Database not available for getCourses');
      return { items: [], total: 0, hasMore: false };
    }

    const result = await pool.query(query, params);
    const hasMore = result.rows.length > limit;
    const items = hasMore ? result.rows.slice(0, limit) : result.rows;

    // Get total count (without pagination)
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM courses c
      LEFT JOIN reviews r ON c.id = r.course_id AND r.is_approved = true
      WHERE c.is_published = true
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    // NOTE: Category column doesn't exist in schema - filter disabled
    // if (category && category !== 'all') {
    //   countQuery += ` AND c.category = $${countParamIndex}`;
    //   countParams.push(category);
    //   countParamIndex++;
    // }

    if (level && level !== 'all') {
      countQuery += ` AND c.level = $${countParamIndex}`;
      countParams.push(level);
      countParamIndex++;
    }

    if (minPrice !== undefined && minPrice >= 0) {
      countQuery += ` AND c.price >= $${countParamIndex}`;
      countParams.push(minPrice);
      countParamIndex++;
    }

    if (maxPrice !== undefined && maxPrice >= 0) {
      countQuery += ` AND c.price <= $${countParamIndex}`;
      countParams.push(maxPrice);
      countParamIndex++;
    }

    if (search && search.trim()) {
      countQuery += ` AND (
        c.title ILIKE $${countParamIndex} OR
        c.description ILIKE $${countParamIndex} OR
        c.instructor ILIKE $${countParamIndex}
      )`;
      countParams.push(`%${search.trim()}%`);
      countParamIndex++;
    }

    // Rating filter for count query
    if (minRating !== undefined && minRating > 0) {
      countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT c.id
          FROM courses c
          LEFT JOIN reviews r ON c.id = r.course_id AND r.is_approved = true
          WHERE c.is_published = true
          ${level && level !== 'all' ? `AND c.level = $${countParams.length + 1}` : ''}
          ${minPrice !== undefined && minPrice >= 0 ? `AND c.price >= $${countParams.length + 1}` : ''}
          ${maxPrice !== undefined && maxPrice >= 0 ? `AND c.price <= $${countParams.length + 1}` : ''}
          ${search ? `AND (c.title ILIKE $${countParams.length + 1} OR c.description ILIKE $${countParams.length + 1} OR c.instructor ILIKE $${countParams.length + 1})` : ''}
          GROUP BY c.id
          HAVING COALESCE(AVG(r.rating), 0) >= $${countParams.length + 1}
        ) as filtered_courses
      `;
      countParams.push(minRating);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    const coursesResult = {
      items,
      total,
      hasMore,
    };

    // Store in cache
    await setCached(cacheKey, coursesResult, CacheTTL.COURSES);

    return coursesResult;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw new Error('Failed to fetch courses');
  }
}

/**
 * Get a single course by ID
 *
 * T212: Added caching with 10-minute TTL
 */
export async function getCourseById(id: number): Promise<Course | null> {
  const cacheKey = generateCacheKey(CacheNamespace.COURSES, id.toString());

  // Try to get from cache
  const cached = await getCached<Course | null>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  try {
    const pool = getPool();
    if (!pool) {
      console.warn('[courses] Database not available for getCourseById');
      return null;
    }

    const query = `
      SELECT
        c.*,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT r.id) as review_count
      FROM courses c
      LEFT JOIN reviews r ON c.id = r.course_id AND r.is_approved = true
      WHERE c.id = $1 AND c.is_published = true
      GROUP BY c.id
    `;

    const result = await pool.query(query, [id]);
    const course = result.rows.length === 0 ? null : result.rows[0];

    // Store in cache
    await setCached(cacheKey, course, CacheTTL.COURSES);

    return course;
  } catch (error) {
    console.error('Error fetching course by ID:', error);
    throw new Error('Failed to fetch course');
  }
}

/**
 * Get a single course by slug
 *
 * T212: Added caching with 10-minute TTL
 */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const cacheKey = generateCacheKey(CacheNamespace.COURSES, 'slug', slug);

  // Try to get from cache
  const cached = await getCached<Course | null>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  try {
    const pool = getPool();
    if (!pool) {
      console.warn('[courses] Database not available for getCourseBySlug');
      return null;
    }

    const query = `
      SELECT
        c.*,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT r.id) as review_count
      FROM courses c
      LEFT JOIN reviews r ON c.id = r.course_id AND r.is_approved = true
      WHERE c.slug = $1 AND c.is_published = true
      GROUP BY c.id
    `;

    const result = await pool.query(query, [slug]);
    const course = result.rows.length === 0 ? null : result.rows[0];

    // Store in cache
    await setCached(cacheKey, course, CacheTTL.COURSES);

    return course;
  } catch (error) {
    console.error('Error fetching course by slug:', error);
    throw new Error('Failed to fetch course');
  }
}

/**
 * Enroll a user in a course
 */
export async function enrollUser(userId: number, courseId: number, client?: PoolClient): Promise<void> {
  const pool = getPool();
  const db = client || pool;

  if (!db) {
    throw new Error('[courses] Database not available for enrollUser');
  }

  try {
    // Check if already enrolled
    const checkQuery = 'SELECT id FROM course_enrollments WHERE user_id = $1 AND course_id = $2';
    const checkResult = await db.query(checkQuery, [userId, courseId]);

    if (checkResult.rows.length > 0) {
      throw new Error('User is already enrolled in this course');
    }

    // Create enrollment
    const insertQuery = `
      INSERT INTO course_enrollments (user_id, course_id, enrolled_at, progress)
      VALUES ($1, $2, NOW(), 0)
    `;

    await db.query(insertQuery, [userId, courseId]);
  } catch (error) {
    console.error('Error enrolling user:', error);
    throw error;
  }
}

/**
 * Check if user is enrolled in a course
 */
export async function isUserEnrolled(userId: number, courseId: number): Promise<boolean> {
  try {
    const pool = getPool();
    if (!pool) {
      console.warn('[courses] Database not available for isUserEnrolled');
      return false;
    }

    const query = 'SELECT id FROM course_enrollments WHERE user_id = $1 AND course_id = $2';
    const result = await pool.query(query, [userId, courseId]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return false;
  }
}

/**
 * Get user's enrolled courses
 */
export async function getUserEnrolledCourses(userId: number): Promise<Course[]> {
  try {
    const pool = getPool();
    if (!pool) {
      console.warn('[courses] Database not available for getUserEnrolledCourses');
      return [];
    }

    const query = `
      SELECT
        c.*,
        ce.enrolled_at,
        ce.progress,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT r.id) as review_count
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      LEFT JOIN reviews r ON c.id = r.course_id AND r.is_approved = true
      WHERE ce.user_id = $1
      GROUP BY c.id, ce.enrolled_at, ce.progress
      ORDER BY ce.enrolled_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    throw new Error('Failed to fetch enrolled courses');
  }
}

/**
 * Get all unique categories
 */
export async function getCategories(): Promise<string[]> {
  try {
    const pool = getPool();
    if (!pool) {
      console.warn('[courses] Database not available for getCategories');
      return [];
    }

    const query = `
      SELECT DISTINCT category
      FROM courses
      WHERE is_published = true AND category IS NOT NULL
      ORDER BY category
    `;

    const result = await pool.query(query);
    return result.rows.map(row => row.category);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// ============================================================================
// Cache Invalidation (T212)
// ============================================================================

/**
 * Invalidate all course caches
 *
 * Call this function when:
 * - A course is created, updated, or deleted
 * - Course data changes (price, title, etc.)
 * - Course publication status changes
 * - Reviews are added/updated (affects rating)
 *
 * @returns Number of cache keys deleted
 *
 * @example
 * await invalidateCourseCache();
 */
export async function invalidateCourseCache(): Promise<number> {
  return await invalidateCache(`${CacheNamespace.COURSES}:*`);
}

/**
 * Invalidate cache for a specific course
 *
 * More targeted than invalidateCourseCache(), only invalidates
 * caches related to a specific course.
 *
 * @param courseId - Course ID to invalidate
 * @returns Number of cache keys deleted
 *
 * @example
 * await invalidateCourseCacheById(123);
 */
export async function invalidateCourseCacheById(courseId: number): Promise<number> {
  let deletedCount = 0;

  // Invalidate specific course cache
  const courseKey = generateCacheKey(CacheNamespace.COURSES, courseId.toString());
  deletedCount += await invalidateCache(courseKey);

  // Invalidate all list caches (since course might appear in lists)
  deletedCount += await invalidateCache(`${CacheNamespace.COURSES}:list:*`);

  return deletedCount;
}

/**
 * Invalidate cache for a course by slug
 *
 * @param slug - Course slug to invalidate
 * @returns Number of cache keys deleted
 *
 * @example
 * await invalidateCourseCacheBySlug('my-course');
 */
export async function invalidateCourseCacheBySlug(slug: string): Promise<number> {
  let deletedCount = 0;

  // Invalidate specific slug cache
  const slugKey = generateCacheKey(CacheNamespace.COURSES, 'slug', slug);
  deletedCount += await invalidateCache(slugKey);

  // Invalidate all list caches
  deletedCount += await invalidateCache(`${CacheNamespace.COURSES}:list:*`);

  return deletedCount;
}
