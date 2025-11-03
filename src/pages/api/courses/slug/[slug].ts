/**
 * Course Slug API Endpoint
 * 
 * GET /api/courses/slug/:slug
 * - Get a specific course by slug (SEO-friendly)
 */

import type { APIRoute } from 'astro';
import { getCourseBySlug } from '@/services/course.service';
import { ValidationError, NotFoundError } from '@/lib/errors';

/**
 * GET /api/courses/slug/:slug
 * Get course details by slug
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    const { slug } = params;

    if (!slug) {
      return new Response(
        JSON.stringify({
          error: 'Course slug is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const course = await getCourseBySlug(slug);

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
    console.error('Error fetching course by slug:', error);

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
