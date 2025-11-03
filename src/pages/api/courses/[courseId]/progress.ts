/**
 * T124: Course Progress API Endpoint
 * GET /api/courses/[courseId]/progress
 *
 * Returns comprehensive progress data for a course including:
 * - Course-level progress from course_progress table
 * - Detailed lesson progress from lesson_progress table
 * - Aggregated statistics (time spent, completion rates, scores)
 */

import type { APIRoute } from 'astro';
import { getPool } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';

export const GET: APIRoute = async ({ cookies, params }) => {
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

    // Get course ID from URL params
    const courseId = params.courseId;
    if (!courseId || typeof courseId !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Course ID is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = session.userId;
    const pool = getPool();

    // Get course-level progress from course_progress table
    const courseProgressResult = await pool.query(
      `SELECT id, progress, completed_lessons, total_lessons, time_spent_seconds,
              last_accessed_at, completed_at, created_at, updated_at
       FROM course_progress
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    // Get detailed lesson progress from lesson_progress table
    const lessonProgressResult = await pool.query(
      `SELECT id, lesson_id, completed, time_spent_seconds, attempts, score,
              first_started_at, last_accessed_at, completed_at
       FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2
       ORDER BY first_started_at ASC`,
      [userId, courseId]
    );

    // Calculate aggregated statistics
    const lessonProgress = lessonProgressResult.rows;
    const totalLessons = lessonProgress.length;
    const completedLessons = lessonProgress.filter(lp => lp.completed).length;
    const totalTimeSpent = lessonProgress.reduce((sum, lp) => sum + lp.time_spent_seconds, 0);
    const totalAttempts = lessonProgress.reduce((sum, lp) => sum + lp.attempts, 0);
    const averageScore = lessonProgress.length > 0
      ? Math.round(lessonProgress
          .filter(lp => lp.score !== null)
          .reduce((sum, lp) => sum + (lp.score || 0), 0) /
          lessonProgress.filter(lp => lp.score !== null).length)
      : null;

    // Find current lesson (first incomplete lesson, or most recently accessed if all complete)
    let currentLesson = null;
    if (totalLessons > 0) {
      const incompleteLessons = lessonProgress.filter(lp => !lp.completed);
      if (incompleteLessons.length > 0) {
        // First incomplete lesson
        currentLesson = incompleteLessons[0];
      } else {
        // All complete - most recently accessed
        currentLesson = lessonProgress.reduce((latest, current) =>
          new Date(current.last_accessed_at) > new Date(latest.last_accessed_at) ? current : latest
        );
      }
    }

    const courseProgress = courseProgressResult.rows[0] || null;

    const responseData = {
      courseId,
      userId,
      courseProgress: courseProgress ? {
        id: courseProgress.id,
        progress: courseProgress.progress,
        completedLessons: courseProgress.completed_lessons,
        totalLessons: courseProgress.total_lessons,
        timeSpentSeconds: courseProgress.time_spent_seconds,
        lastAccessedAt: courseProgress.last_accessed_at,
        completedAt: courseProgress.completed_at,
        createdAt: courseProgress.created_at,
        updatedAt: courseProgress.updated_at,
      } : null,
      lessonProgress: lessonProgress.map(lp => ({
        id: lp.id,
        lessonId: lp.lesson_id,
        completed: lp.completed,
        timeSpentSeconds: lp.time_spent_seconds,
        attempts: lp.attempts,
        score: lp.score,
        firstStartedAt: lp.first_started_at,
        lastAccessedAt: lp.last_accessed_at,
        completedAt: lp.completed_at,
      })),
      statistics: {
        totalLessons,
        completedLessons,
        completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        totalTimeSpentSeconds: totalTimeSpent,
        totalAttempts,
        averageScore,
        currentLesson: currentLesson ? {
          id: currentLesson.id,
          lessonId: currentLesson.lesson_id,
          completed: currentLesson.completed,
          lastAccessedAt: currentLesson.last_accessed_at,
        } : null,
      }
    };

    console.log('[COURSE_PROGRESS] Retrieved progress:', {
      userId,
      courseId,
      totalLessons,
      completedLessons,
      totalTimeSpent
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[COURSE_PROGRESS] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while retrieving course progress'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};