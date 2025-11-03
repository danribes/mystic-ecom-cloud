/**
 * Course Detail API Endpoint
 * 
 * GET /api/courses/:id
 * - Get a specific course by ID
 * 
 * PUT /api/courses/:id
 * - Update a course (admin/instructor only)
 * 
 * DELETE /api/courses/:id
 * - Delete a course (admin/instructor only)
 */

import type { APIRoute } from 'astro';
import { 
  getCourseById,
  updateCourse,
  deleteCourse,
  type UpdateCourseInput
} from '@/services/course.service';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';

// ==================== Validation Schemas ====================

const UpdateCourseSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  slug: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(500).optional(),
  longDescription: z.string().optional(),
  price: z.number().min(0).optional(),
  duration: z.number().min(1).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  category: z.string().min(2).max(100).optional(),
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

function isAuthenticated(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  return !!authHeader;
}

function hasInstructorRole(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  // TODO: Decode JWT and check user.role === 'admin' || user.role === 'instructor'
  return !!authHeader;
}

// ==================== GET Handler ====================

/**
 * GET /api/courses/:id
 * Get course details by ID
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'Course ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const course = await getCourseById(id);

    return new Response(
      JSON.stringify({
        success: true,
        data: course,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching course:', error);

    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
        error: 'Failed to fetch course',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// ==================== PUT Handler ====================

/**
 * PUT /api/courses/:id
 * Update a course (admin/instructor only)
 */
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'Course ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
    const validatedData = UpdateCourseSchema.safeParse(body);

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

    const courseInput: UpdateCourseInput = validatedData.data;
    const course = await updateCourse(id, courseInput);

    return new Response(
      JSON.stringify({
        success: true,
        data: course,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating course:', error);

    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
        error: 'Failed to update course',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// ==================== DELETE Handler ====================

/**
 * DELETE /api/courses/:id
 * Soft delete a course (admin/instructor only)
 */
export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({
          error: 'Course ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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

    await deleteCourse(id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Course deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error deleting course:', error);

    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
        error: 'Failed to delete course',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
