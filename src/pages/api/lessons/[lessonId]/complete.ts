/**
 * T124: Complete Lesson API Endpoint
 * POST /api/lessons/[lessonId]/complete
 *
 * Marks a lesson as completed for the authenticated user.
 * Updates completion status, increments attempts, and sets completion timestamp.
 */

import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { z } from 'zod';

// Validation schema for complete lesson request
const completeLessonSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
  score: z.number().int().min(0).max(100).optional(), // Optional quiz score 0-100
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
    const validation = completeLessonSchema.safeParse(body);

    if (!validation.success) {
      console.error('[COMPLETE_LESSON] Validation error:', validation.error.errors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { courseId, score } = validation.data;
    const userId = session.userId;

    const pool = getPool();

    // Check if lesson progress exists
    const existingProgress = await pool.query(
      `SELECT id, completed, attempts, completed_at, score as current_score
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

    // If already completed, return current status
    if (currentProgress.completed) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Lesson was already completed',
          data: {
            progressId: currentProgress.id,
            lessonId,
            courseId,
            completed: true,
            attempts: currentProgress.attempts,
            score: currentProgress.current_score,
            completedAt: currentProgress.completed_at,
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const now = new Date();
    const newAttempts = currentProgress.attempts + 1;

    // Update lesson as completed
    const updateFields = ['completed = $1', 'attempts = $2', 'completed_at = $3', 'last_accessed_at = $3', 'updated_at = $3'];
    const updateValues = [true, newAttempts, now];
    let paramIndex = 4;

    // Include score if provided
    if (score !== undefined) {
      updateFields.push(`score = $${paramIndex}`);
      updateValues.push(score);
      paramIndex++;
    }

    updateValues.push(userId, courseId, lessonId);

    const updateQuery = `
      UPDATE lesson_progress
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramIndex} AND course_id = $${paramIndex + 1} AND lesson_id = $${paramIndex + 2}
      RETURNING id, completed, attempts, score, completed_at, last_accessed_at
    `;

    const updateResult = await pool.query(updateQuery, updateValues);
    const updatedProgress = updateResult.rows[0];

    console.log('[COMPLETE_LESSON] Lesson completed:', {
      userId,
      courseId,
      lessonId,
      attempts: updatedProgress.attempts,
      score: updatedProgress.score,
      progressId: updatedProgress.id
    });

    // TODO: Future enhancement - update course_progress.completed_lessons JSONB array
    // This would require checking if all lessons in the course are now complete

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lesson completed successfully',
        data: {
          progressId: updatedProgress.id,
          lessonId,
          courseId,
          completed: updatedProgress.completed,
          attempts: updatedProgress.attempts,
          score: updatedProgress.score,
          completedAt: updatedProgress.completed_at,
          lastAccessedAt: updatedProgress.last_accessed_at,
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[COMPLETE_LESSON] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while completing the lesson'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};