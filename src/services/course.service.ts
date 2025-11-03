/**
 * Course Service
 * 
 * Handles all CRUD operations, search, filtering, and pagination for courses.
 * Uses PostgreSQL for persistence.
 */

import type { Pool } from 'pg';
import { getPool } from '@/lib/db';
import type { Course, CourseLevel, CourseSection } from '@/types';
import { ValidationError, NotFoundError, DatabaseError } from '@/lib/errors';

// ==================== Types ====================

export interface CreateCourseInput {
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  instructorId: string;
  price: number;
  duration: number;
  level: CourseLevel;
  category: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  tags?: string[];
  learningOutcomes?: string[];
  prerequisites?: string[];
  curriculum?: CourseSection[];
  isPublished?: boolean;
  isFeatured?: boolean;
}

export interface UpdateCourseInput {
  title?: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  price?: number;
  duration?: number;
  level?: CourseLevel;
  category?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  tags?: string[];
  learningOutcomes?: string[];
  prerequisites?: string[];
  curriculum?: CourseSection[];
  isPublished?: boolean;
  isFeatured?: boolean;
}

export interface ListCoursesOptions {
  page?: number;
  limit?: number;
  category?: string;
  level?: CourseLevel;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  tags?: string[];
  isPublished?: boolean;
  isFeatured?: boolean;
  sortBy?: 'createdAt' | 'price' | 'enrollmentCount' | 'avgRating' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedCourses {
  courses: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CourseStats {
  totalEnrollments: number;
  avgRating: number;
  reviewCount: number;
  completionRate?: number;
}

// ==================== Helper Functions ====================

/**
 * Map database row to Course object
 */
function mapRowToCourse(row: any): Course {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    longDescription: row.long_description,
    instructorId: row.instructor_id,
    instructorName: row.instructor_name,
    instructorAvatar: row.instructor_avatar,
    price: parseInt(row.price, 10),
    duration: parseInt(row.duration, 10),
    level: row.level,
    category: row.category,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    previewVideoUrl: row.preview_video_url,
    tags: row.tags || [],
    learningOutcomes: row.learning_outcomes || [],
    prerequisites: row.prerequisites || [],
    curriculum: row.curriculum || [],
    enrollmentCount: parseInt(row.enrollment_count || '0', 10),
    avgRating: row.avg_rating ? parseFloat(row.avg_rating) : undefined,
    reviewCount: parseInt(row.review_count || '0', 10),
    isPublished: row.is_published,
    isFeatured: row.is_featured,
    publishedAt: row.published_at ? new Date(row.published_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

/**
 * Generate unique slug by appending number if needed
 */
async function generateUniqueSlug(pool: Pool, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const query = excludeId
      ? 'SELECT id FROM courses WHERE slug = $1 AND id != $2 AND deleted_at IS NULL'
      : 'SELECT id FROM courses WHERE slug = $1 AND deleted_at IS NULL';
    
    const params = excludeId ? [slug, excludeId] : [slug];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// ==================== Course Service ====================

/**
 * Create a new course
 */
export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const pool = getPool();

  // Validate required fields
  if (!input.title || input.title.trim().length === 0) {
    throw new ValidationError('Title is required', { title: 'Title cannot be empty' });
  }

  if (!input.description || input.description.trim().length === 0) {
    throw new ValidationError('Description is required', { description: 'Description cannot be empty' });
  }

  if (!input.instructorId) {
    throw new ValidationError('Instructor ID is required', { instructorId: 'Instructor ID cannot be empty' });
  }

  if (input.price < 0) {
    throw new ValidationError('Price cannot be negative', { price: 'Price must be non-negative' });
  }

  // Verify instructor exists
  const instructorCheck = await pool.query(
    'SELECT id, name FROM users WHERE id = $1 AND deleted_at IS NULL',
    [input.instructorId]
  );

  if (instructorCheck.rows.length === 0) {
    throw new NotFoundError('Instructor not found');
  }

  const instructor = instructorCheck.rows[0];

  // Generate unique slug
  const uniqueSlug = await generateUniqueSlug(pool, input.slug);

  try {
    const result = await pool.query(
      `INSERT INTO courses (
        title, slug, description, long_description, instructor_id,
        price, duration, level, category, image_url, thumbnail_url,
        preview_video_url, tags, learning_outcomes, prerequisites,
        curriculum, is_published, is_featured, published_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        CASE WHEN $17 = true THEN NOW() ELSE NULL END
      ) RETURNING *`,
      [
        input.title,
        uniqueSlug,
        input.description,
        input.longDescription || null,
        input.instructorId,
        input.price,
        input.duration,
        input.level,
        input.category,
        input.imageUrl || null,
        input.thumbnailUrl || null,
        input.previewVideoUrl || null,
        JSON.stringify(input.tags || []),
        JSON.stringify(input.learningOutcomes || []),
        JSON.stringify(input.prerequisites || []),
        JSON.stringify(input.curriculum || []),
        input.isPublished ?? false,
        input.isFeatured ?? false,
      ]
    );

    const course = mapRowToCourse(result.rows[0]);
    course.instructorName = instructor.name;
    course.instructorAvatar = instructor.avatar_url;
    
    return course;
  } catch (error: any) {
    throw new DatabaseError(`Failed to create course: ${error.message}`);
  }
}

/**
 * Get course by ID
 */
export async function getCourseById(id: string): Promise<Course> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT c.*, u.name as instructor_name
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Course not found');
    }

    return mapRowToCourse(result.rows[0]);
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to get course: ${error.message}`);
  }
}

/**
 * Get course by slug
 */
export async function getCourseBySlug(slug: string): Promise<Course> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `SELECT c.*, u.name as instructor_name
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE c.slug = $1 AND c.deleted_at IS NULL`,
      [slug]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Course not found');
    }

    return mapRowToCourse(result.rows[0]);
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to get course by slug: ${error.message}`);
  }
}

/**
 * Update course
 */
export async function updateCourse(id: string, input: UpdateCourseInput): Promise<Course> {
  const pool = getPool();

  // Verify course exists
  const existingCourse = await getCourseById(id);

  // Validate price if provided
  if (input.price !== undefined && input.price < 0) {
    throw new ValidationError('Price cannot be negative', { price: 'Price must be non-negative' });
  }

  // Generate unique slug if slug is being updated
  let uniqueSlug = input.slug;
  if (input.slug && input.slug !== existingCourse.slug) {
    uniqueSlug = await generateUniqueSlug(pool, input.slug, id);
  }

  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(input.title);
  }
  if (uniqueSlug !== undefined && uniqueSlug !== existingCourse.slug) {
    updates.push(`slug = $${paramIndex++}`);
    values.push(uniqueSlug);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.longDescription !== undefined) {
    updates.push(`long_description = $${paramIndex++}`);
    values.push(input.longDescription);
  }
  if (input.price !== undefined) {
    updates.push(`price = $${paramIndex++}`);
    values.push(input.price);
  }
  if (input.duration !== undefined) {
    updates.push(`duration = $${paramIndex++}`);
    values.push(input.duration);
  }
  if (input.level !== undefined) {
    updates.push(`level = $${paramIndex++}`);
    values.push(input.level);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(input.category);
  }
  if (input.imageUrl !== undefined) {
    updates.push(`image_url = $${paramIndex++}`);
    values.push(input.imageUrl);
  }
  if (input.thumbnailUrl !== undefined) {
    updates.push(`thumbnail_url = $${paramIndex++}`);
    values.push(input.thumbnailUrl);
  }
  if (input.previewVideoUrl !== undefined) {
    updates.push(`preview_video_url = $${paramIndex++}`);
    values.push(input.previewVideoUrl);
  }
  if (input.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    values.push(JSON.stringify(input.tags));
  }
  if (input.learningOutcomes !== undefined) {
    updates.push(`learning_outcomes = $${paramIndex++}`);
    values.push(JSON.stringify(input.learningOutcomes));
  }
  if (input.prerequisites !== undefined) {
    updates.push(`prerequisites = $${paramIndex++}`);
    values.push(JSON.stringify(input.prerequisites));
  }
  if (input.curriculum !== undefined) {
    updates.push(`curriculum = $${paramIndex++}`);
    values.push(JSON.stringify(input.curriculum));
  }
  if (input.isPublished !== undefined) {
    updates.push(`is_published = $${paramIndex++}`);
    values.push(input.isPublished);
    
    // Set published_at when publishing for the first time
    if (input.isPublished && !existingCourse.publishedAt) {
      updates.push(`published_at = NOW()`);
    }
  }
  if (input.isFeatured !== undefined) {
    updates.push(`is_featured = $${paramIndex++}`);
    values.push(input.isFeatured);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE courses 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Course not found');
    }

    return getCourseById(id);
  } catch (error: any) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError(`Failed to update course: ${error.message}`);
  }
}

/**
 * Delete course (soft delete)
 */
export async function deleteCourse(id: string): Promise<void> {
  const pool = getPool();

  try {
    const result = await pool.query(
      'UPDATE courses SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Course not found');
    }
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to delete course: ${error.message}`);
  }
}

/**
 * List courses with filtering, search, and pagination
 */
export async function listCourses(options: ListCoursesOptions = {}): Promise<PaginatedCourses> {
  const pool = getPool();

  const {
    page = 1,
    limit = 10,
    category,
    level,
    minPrice,
    maxPrice,
    search,
    tags,
    isPublished,
    isFeatured,
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = options;

  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions: string[] = ['c.deleted_at IS NULL'];
  const values: any[] = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`c.category = $${paramIndex++}`);
    values.push(category);
  }

  if (level) {
    conditions.push(`c.level = $${paramIndex++}`);
    values.push(level);
  }

  if (minPrice !== undefined) {
    conditions.push(`c.price >= $${paramIndex++}`);
    values.push(minPrice);
  }

  if (maxPrice !== undefined) {
    conditions.push(`c.price <= $${paramIndex++}`);
    values.push(maxPrice);
  }

  if (search) {
    conditions.push(`(
      c.title ILIKE $${paramIndex} OR 
      c.description ILIKE $${paramIndex} OR
      c.category ILIKE $${paramIndex}
    )`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  if (tags && tags.length > 0) {
    conditions.push(`c.tags ?| $${paramIndex++}`);
    values.push(tags);
  }

  if (isPublished !== undefined) {
    conditions.push(`c.is_published = $${paramIndex++}`);
    values.push(isPublished);
  }

  if (isFeatured !== undefined) {
    conditions.push(`c.is_featured = $${paramIndex++}`);
    values.push(isFeatured);
  }

  const whereClause = conditions.join(' AND ');

  // Map sortBy to column name
  const sortColumnMap: Record<string, string> = {
    createdAt: 'c.created_at',
    price: 'c.price',
    enrollmentCount: 'c.enrollment_count',
    avgRating: 'c.avg_rating',
    title: 'c.title',
  };

  const sortColumn = sortColumnMap[sortBy] || 'c.created_at';

  try {
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM courses c WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const result = await pool.query(
      `SELECT c.*, u.name as instructor_name
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    const courses = result.rows.map(mapRowToCourse);
    const totalPages = Math.ceil(total / limit);

    return {
      courses,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error: any) {
    throw new DatabaseError(`Failed to list courses: ${error.message}`);
  }
}

/**
 * Get featured courses
 */
export async function getFeaturedCourses(limit: number = 6): Promise<Course[]> {
  const result = await listCourses({
    isFeatured: true,
    isPublished: true,
    limit,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });

  return result.courses;
}

/**
 * Get courses by instructor
 */
export async function getCoursesByInstructor(instructorId: string, isPublished?: boolean): Promise<Course[]> {
  const pool = getPool();

  const conditions = ['c.instructor_id = $1', 'c.deleted_at IS NULL'];
  const values: any[] = [instructorId];

  if (isPublished !== undefined) {
    conditions.push('c.is_published = $2');
    values.push(isPublished);
  }

  const whereClause = conditions.join(' AND ');

  try {
    const result = await pool.query(
      `SELECT c.*, u.name as instructor_name, u.avatar_url as instructor_avatar
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
       WHERE ${whereClause}
       ORDER BY c.created_at DESC`,
      values
    );

    return result.rows.map(mapRowToCourse);
  } catch (error: any) {
    throw new DatabaseError(`Failed to get courses by instructor: ${error.message}`);
  }
}

/**
 * Increment enrollment count
 */
export async function incrementEnrollmentCount(courseId: string): Promise<void> {
  const pool = getPool();

  try {
    const result = await pool.query(
      'UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = $1 AND deleted_at IS NULL',
      [courseId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Course not found');
    }
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to increment enrollment count: ${error.message}`);
  }
}

/**
 * Get course statistics
 */
export async function getCourseStats(courseId: string): Promise<CourseStats> {
  const pool = getPool();

  try {
    // Get enrollment count and review stats
    const courseResult = await pool.query(
      `SELECT 
        c.enrollment_count,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as review_count
       FROM courses c
       LEFT JOIN reviews r ON c.id = r.course_id AND r.deleted_at IS NULL
       WHERE c.id = $1 AND c.deleted_at IS NULL
       GROUP BY c.id, c.enrollment_count`,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      throw new NotFoundError('Course not found');
    }

    const row = courseResult.rows[0];

    return {
      totalEnrollments: parseInt(row.enrollment_count || '0', 10),
      avgRating: parseFloat(row.avg_rating) || 0,
      reviewCount: parseInt(row.review_count || '0', 10),
    };
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Failed to get course stats: ${error.message}`);
  }
}

/**
 * Publish a course
 */
export async function publishCourse(courseId: string): Promise<Course> {
  return updateCourse(courseId, { isPublished: true });
}

/**
 * Unpublish a course
 */
export async function unpublishCourse(courseId: string): Promise<Course> {
  return updateCourse(courseId, { isPublished: false });
}
