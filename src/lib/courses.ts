/**
 * Course Service
 * Handles all course-related database operations including catalog browsing, filtering, and enrollment
 */

import pool from './db';
import type { PoolClient } from 'pg';

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
}

export interface GetCoursesResult {
  items: Course[];
  total: number;
  hasMore: boolean;
}

/**
 * Get courses with optional filtering
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
  } = filters;

  let query = `
    SELECT 
      c.*,
      COALESCE(AVG(r.rating), 0) as rating,
      COUNT(DISTINCT r.id) as review_count
    FROM courses c
    LEFT JOIN reviews r ON c.id = r.course_id AND r.approved = true
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

  // Group by for aggregates
  query += ` GROUP BY c.id`;

  // Rating filter (applied after aggregation)
  if (minRating !== undefined && minRating > 0) {
    query += ` HAVING COALESCE(AVG(r.rating), 0) >= $${paramIndex}`;
    params.push(minRating);
    paramIndex++;
  }

  // Order by rating and created date
  query += ` ORDER BY rating DESC, c.created_at DESC`;

  // Pagination
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit + 1); // Fetch one extra to check if there are more
  params.push(offset);

  try {
    const result = await pool.query(query, params);
    const hasMore = result.rows.length > limit;
    const items = hasMore ? result.rows.slice(0, limit) : result.rows;

    // Get total count (without pagination)
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM courses c
      LEFT JOIN reviews r ON c.id = r.course_id AND r.approved = true
      WHERE c.is_published = true
    `;

    const countParams: any[] = [];
    let countParamIndex = 1;

    if (category && category !== 'all') {
      countQuery += ` AND c.category = $${countParamIndex}`;
      countParams.push(category);
      countParamIndex++;
    }

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
          LEFT JOIN reviews r ON c.id = r.course_id AND r.approved = true
          WHERE c.is_published = true
          ${category && category !== 'all' ? 'AND c.category = $1' : ''}
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

    return {
      items,
      total,
      hasMore,
    };
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw new Error('Failed to fetch courses');
  }
}

/**
 * Get a single course by ID
 */
export async function getCourseById(id: number): Promise<Course | null> {
  try {
    const query = `
      SELECT 
        c.*,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT r.id) as review_count
      FROM courses c
      LEFT JOIN reviews r ON c.id = r.course_id AND r.approved = true
      WHERE c.id = $1 AND c.is_published = true
      GROUP BY c.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching course by ID:', error);
    throw new Error('Failed to fetch course');
  }
}

/**
 * Get a single course by slug
 */
export async function getCourseBySlug(slug: string): Promise<Course | null> {
  try {
    const query = `
      SELECT 
        c.*,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT r.id) as review_count
      FROM courses c
      LEFT JOIN reviews r ON c.id = r.course_id AND r.approved = true
      WHERE c.slug = $1 AND c.is_published = true
      GROUP BY c.id
    `;

    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching course by slug:', error);
    throw new Error('Failed to fetch course');
  }
}

/**
 * Enroll a user in a course
 */
export async function enrollUser(userId: number, courseId: number, client?: PoolClient): Promise<void> {
  const db = client || pool;

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
    const query = `
      SELECT 
        c.*,
        ce.enrolled_at,
        ce.progress,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT r.id) as review_count
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      LEFT JOIN reviews r ON c.id = r.course_id AND r.approved = true
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
