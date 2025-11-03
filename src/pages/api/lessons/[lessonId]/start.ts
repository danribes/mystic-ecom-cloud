/**
 * T124: Start Lesson API Endpoint
 * POST /api/lessons/[lessonId]/start
 *
 * Starts or resumes a lesson for the authenticated user.
 * Creates or updates lesson_progress record with initial access.
 */

import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { z } from 'zod';

// Validation schema for start lesson request
const startLessonSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
});

export const POST: APIRoute = async ({ request, cookies, params }) => {
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
    const validation = startLessonSchema.safeParse(body);

    if (!validation.success) {
      console.error('[START_LESSON] Validation error:', validation.error.errors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { courseId } = validation.data;
    const userId = session.userId;

    const pool = getPool();

    // Check if lesson progress already exists
    const existingProgress = await pool.query(
      `SELECT id, completed, time_spent_seconds, attempts, first_started_at, last_accessed_at
       FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2 AND lesson_id = $3`,
      [userId, courseId, lessonId]
    );

    let progressRecord;
    const now = new Date();

    if (existingProgress.rows.length > 0) {
      // Update existing record - just update last_accessed_at
      const updateResult = await pool.query(
        `UPDATE lesson_progress
         SET last_accessed_at = $1, updated_at = $1
         WHERE user_id = $2 AND course_id = $3 AND lesson_id = $4
         RETURNING id, completed, time_spent_seconds, attempts, first_started_at, last_accessed_at`,
        [now, userId, courseId, lessonId]
      );
      progressRecord = updateResult.rows[0];

      console.log('[START_LESSON] Resumed existing lesson:', {
        userId,
        courseId,
        lessonId,
        progressId: progressRecord.id
      });
    } else {
      // Create new lesson progress record
      const insertResult = await pool.query(
        `INSERT INTO lesson_progress (
          user_id, course_id, lesson_id, completed, time_spent_seconds,
          attempts, first_started_at, last_accessed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, completed, time_spent_seconds, attempts, first_started_at, last_accessed_at`,
        [userId, courseId, lessonId, false, 0, 0, now, now, now, now]
      );
      progressRecord = insertResult.rows[0];

      console.log('[START_LESSON] Started new lesson:', {
        userId,
        courseId,
        lessonId,
        progressId: progressRecord.id
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: existingProgress.rows.length > 0 ? 'Lesson resumed' : 'Lesson started',
        data: {
          progressId: progressRecord.id,
          lessonId,
          courseId,
          completed: progressRecord.completed,
          timeSpentSeconds: progressRecord.time_spent_seconds,
          attempts: progressRecord.attempts,
          firstStartedAt: progressRecord.first_started_at,
          lastAccessedAt: progressRecord.last_accessed_at,
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[START_LESSON] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while starting the lesson'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};