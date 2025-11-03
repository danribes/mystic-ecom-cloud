/**
 * Course List API Endpoint
 * 
 * GET /api/courses
 * - List all published courses with filtering, search, and pagination
 * - Supports query parameters: page, limit, category, level, search, etc.
 * 
 * POST /api/courses
 * - Create a new course (admin/instructor only)
 */

import type { APIRoute } from 'astro';
import { 
  listCourses, 
  createCourse,
  type ListCoursesOptions,
  type CreateCourseInput
} from '@/services/course.service';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';

// ==================== Validation Schemas ====================

const ListCoursesQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 12),
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  minPrice: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  maxPrice: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  search: z.string().optional(),
  tags: z.string().optional().transform(val => val ? val.split(',') : undefined),
  isFeatured: z.string().optional().transform(val => val === 'true' ? true : undefined),
  sortBy: z.enum(['createdAt', 'price', 'enrollmentCount', 'avgRating', 'title']).optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional(),
});

const CreateCourseSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(200),
  description: z.string().min(10).max(500),
  longDescription: z.string().optional(),
  instructorId: z.string().uuid(),
  price: z.number().min(0),
  duration: z.number().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  category: z.string().min(2).max(100),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  previewVideoUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  learningOutcomes: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  curriculum: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number(),
    lessons: z.array(z.object({
      title: z.string(),
      duration: z.number(),
      type: z.enum(['video', 'text', 'quiz', 'assignment']),
      videoUrl: z.string().url().optional(),
      content: z.string().optional(),
      order: z.number(),
    })),
  })).optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// ==================== Helper Functions ====================

/**
 * Check if user is authenticated (simple session check)
 * In production, this should validate JWT or session token
 */
function isAuthenticated(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  // For now, just check if Authorization header exists
  // TODO: Implement proper JWT validation
  return !!authHeader;
}

/**
 * Check if user is admin or instructor
 * In production, decode JWT and check role
 */
function hasInstructorRole(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  // TODO: Decode JWT and check user.role === 'admin' || user.role === 'instructor'
  return !!authHeader;
}

// ==================== GET Handler ====================

/**
 * GET /api/courses
 * List published courses with filtering and pagination
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = ListCoursesQuerySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid query parameters',
          details: validatedQuery.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const options: ListCoursesOptions = {
      ...validatedQuery.data,
      isPublished: true, // Only show published courses to public
    };

    const result = await listCourses(options);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error listing courses:', error);

    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch courses',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// ==================== POST Handler ====================

/**
 * POST /api/courses
 * Create a new course (admin/instructor only)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Check authentication and authorization
    if (!isAuthenticated(request)) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!hasInstructorRole(request)) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient permissions. Instructor or admin role required.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateCourseSchema.safeParse(body);

    if (!validatedData.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid course data',
          details: validatedData.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const courseInput: CreateCourseInput = validatedData.data;
    const course = await createCourse(courseInput);

    return new Response(
      JSON.stringify({
        success: true,
        data: course,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating course:', error);

    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to create course',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
