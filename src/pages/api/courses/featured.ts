/**
 * Featured Courses API Endpoint
 * 
 * GET /api/courses/featured
 * - Get featured courses (homepage, promotions)
 */

import type { APIRoute } from 'astro';
import { getFeaturedCourses } from '@/services/course.service';

/**
 * GET /api/courses/featured
 * Get featured courses with optional limit
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 6;

    if (isNaN(limit) || limit < 1 || limit > 50) {
      return new Response(
        JSON.stringify({
          error: 'Invalid limit parameter. Must be between 1 and 50.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const courses = await getFeaturedCourses(limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: courses,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching featured courses:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch featured courses',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
