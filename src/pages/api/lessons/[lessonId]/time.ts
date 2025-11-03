/**
 * T124: Update Lesson Time API Endpoint
 * PUT /api/lessons/[lessonId]/time
 *
 * Updates the time spent on a lesson for the authenticated user.
 * Adds to the existing time_spent_seconds value.
 */

import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { z } from 'zod';

// Validation schema for time update request
const updateTimeSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
  timeSpentSeconds: z.number().int().min(0, 'Time spent must be non-negative'),
});

export const PUT: APIRoute = async ({ request, cookies, params }) => {
  try {
    // Check authentication
    const session = await getSessionFromRequest(cookies);
    if (!session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get lesson ID from URL params
    const lessonId = params.lessonId;
    if (!lessonId || typeof lessonId !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Lesson ID is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const validation = updateTimeSchema.safeParse(body);

    if (!validation.success) {
      console.error('[UPDATE_LESSON_TIME] Validation error:', validation.error.errors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { courseId, timeSpentSeconds } = validation.data;
    const userId = session.userId;

    const pool = getPool();

    // Check if lesson progress exists
    const existingProgress = await pool.query(
      `SELECT id, time_spent_seconds, completed, last_accessed_at
       FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2 AND lesson_id = $3`,
      [userId, courseId, lessonId]
    );

    if (existingProgress.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Lesson progress not found. Start the lesson first.'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const currentProgress = existingProgress.rows[0];
    const newTimeSpent = currentProgress.time_spent_seconds + timeSpentSeconds;
    const now = new Date();

    // Update time spent and last accessed
    const updateResult = await pool.query(
      `UPDATE lesson_progress
       SET time_spent_seconds = $1, last_accessed_at = $2, updated_at = $2
       WHERE user_id = $3 AND course_id = $4 AND lesson_id = $5
       RETURNING id, time_spent_seconds, completed, last_accessed_at`,
      [newTimeSpent, now, userId, courseId, lessonId]
    );

    const updatedProgress = updateResult.rows[0];

    console.log('[UPDATE_LESSON_TIME] Time updated:', {
      userId,
      courseId,
      lessonId,
      addedSeconds: timeSpentSeconds,
      totalSeconds: updatedProgress.time_spent_seconds
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lesson time updated successfully',
        data: {
          progressId: updatedProgress.id,
          lessonId,
          courseId,
          timeSpentSeconds: updatedProgress.time_spent_seconds,
          completed: updatedProgress.completed,
          lastAccessedAt: updatedProgress.last_accessed_at,
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[UPDATE_LESSON_TIME] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while updating lesson time'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};