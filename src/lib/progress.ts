/**
 * Progress Tracking Service
 * Handles all course progress tracking operations including lesson completion,
 * progress percentage calculation, and progress retrieval
 */

import pool from './db';
import type { PoolClient } from 'pg';
import { logError } from './errors';

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  completedLessons: string[]; // Array of lesson IDs
  progressPercentage: number;
  lastAccessedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonProgressUpdate {
  userId: string;
  courseId: string;
  lessonId: string;
  totalLessons: number;
}

export interface ProgressStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalLessonsCompleted: number;
  averageProgress: number;
}

/**
 * Get progress for a specific course and user
 */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<CourseProgress | null> {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        user_id as "userId",
        course_id as "courseId",
        completed_lessons as "completedLessons",
        progress_percentage as "progressPercentage",
        last_accessed_at as "lastAccessedAt",
        completed_at as "completedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM course_progress
      WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logError(error, { context: 'getCourseProgress', userId, courseId });
    throw error;
  }
}

/**
 * Get all progress records for a user
 */
export async function getUserProgress(
  userId: string,
  options: { includeCompleted?: boolean } = {}
): Promise<CourseProgress[]> {
  const { includeCompleted = true } = options;

  try {
    let query = `
      SELECT 
        id,
        user_id as "userId",
        course_id as "courseId",
        completed_lessons as "completedLessons",
        progress_percentage as "progressPercentage",
        last_accessed_at as "lastAccessedAt",
        completed_at as "completedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM course_progress
      WHERE user_id = $1
    `;

    if (!includeCompleted) {
      query += ' AND completed_at IS NULL';
    }

    query += ' ORDER BY last_accessed_at DESC';

    const result = await pool.query(query, [userId]);

    return result.rows;
  } catch (error) {
    logError(error, { context: 'getUserProgress', userId });
    throw error;
  }
}

/**
 * Mark a lesson as complete
 */
export async function markLessonComplete(
  data: LessonProgressUpdate
): Promise<CourseProgress> {
  const { userId, courseId, lessonId, totalLessons } = data;

  try {
    // First, check if progress record exists
    const existing = await getCourseProgress(userId, courseId);

    if (existing) {
      // Update existing record
      // Add lesson to completedLessons if not already there
      const completedLessons = existing.completedLessons || [];
      
      if (!completedLessons.includes(lessonId)) {
        completedLessons.push(lessonId);
      }

      // Calculate new progress percentage
      const progressPercentage = Math.round((completedLessons.length / totalLessons) * 100);

      // Check if course is now complete
      const completedAt = progressPercentage === 100 ? new Date() : null;

      const result = await pool.query(
        `UPDATE course_progress
        SET 
          completed_lessons = $1,
          progress_percentage = $2,
          last_accessed_at = CURRENT_TIMESTAMP,
          completed_at = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $4 AND course_id = $5
        RETURNING 
          id,
          user_id as "userId",
          course_id as "courseId",
          completed_lessons as "completedLessons",
          progress_percentage as "progressPercentage",
          last_accessed_at as "lastAccessedAt",
          completed_at as "completedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"`,
        [JSON.stringify(completedLessons), progressPercentage, completedAt, userId, courseId]
      );

      return result.rows[0];
    } else {
      // Create new record
      const completedLessons = [lessonId];
      const progressPercentage = Math.round((1 / totalLessons) * 100);
      const completedAt = progressPercentage === 100 ? new Date() : null;

      const result = await pool.query(
        `INSERT INTO course_progress (
          user_id,
          course_id,
          completed_lessons,
          progress_percentage,
          last_accessed_at,
          completed_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
        RETURNING 
          id,
          user_id as "userId",
          course_id as "courseId",
          completed_lessons as "completedLessons",
          progress_percentage as "progressPercentage",
          last_accessed_at as "lastAccessedAt",
          completed_at as "completedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"`,
        [userId, courseId, JSON.stringify(completedLessons), progressPercentage, completedAt]
      );

      return result.rows[0];
    }
  } catch (error) {
    logError(error, { context: 'markLessonComplete', userId, courseId, lessonId });
    throw error;
  }
}

/**
 * Mark a lesson as incomplete
 */
export async function markLessonIncomplete(
  data: LessonProgressUpdate
): Promise<CourseProgress | null> {
  const { userId, courseId, lessonId, totalLessons } = data;

  try {
    const existing = await getCourseProgress(userId, courseId);

    if (!existing) {
      return null;
    }

    // Remove lesson from completedLessons
    const completedLessons = existing.completedLessons || [];
    const updatedLessons = completedLessons.filter((id: string) => id !== lessonId);

    // Calculate new progress percentage
    const progressPercentage = Math.round((updatedLessons.length / totalLessons) * 100);

    // If we're unchecking, the course is no longer complete
    const completedAt = null;

    const result = await pool.query(
      `UPDATE course_progress
      SET 
        completed_lessons = $1,
        progress_percentage = $2,
        last_accessed_at = CURRENT_TIMESTAMP,
        completed_at = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $4 AND course_id = $5
      RETURNING 
        id,
        user_id as "userId",
        course_id as "courseId",
        completed_lessons as "completedLessons",
        progress_percentage as "progressPercentage",
        last_accessed_at as "lastAccessedAt",
        completed_at as "completedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"`,
      [JSON.stringify(updatedLessons), progressPercentage, completedAt, userId, courseId]
    );

    return result.rows[0];
  } catch (error) {
    logError(error, { context: 'markLessonIncomplete', userId, courseId, lessonId });
    throw error;
  }
}

/**
 * Reset progress for a course
 */
export async function resetCourseProgress(
  userId: string,
  courseId: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM course_progress
      WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    logError(error, { context: 'resetCourseProgress', userId, courseId });
    throw error;
  }
}

/**
 * Update last accessed timestamp
 */
export async function updateLastAccessed(
  userId: string,
  courseId: string
): Promise<void> {
  try {
    // First check if record exists
    const existing = await getCourseProgress(userId, courseId);

    if (existing) {
      // Update existing record
      await pool.query(
        `UPDATE course_progress
        SET 
          last_accessed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND course_id = $2`,
        [userId, courseId]
      );
    } else {
      // Create new record with 0% progress
      await pool.query(
        `INSERT INTO course_progress (
          user_id,
          course_id,
          completed_lessons,
          progress_percentage,
          last_accessed_at
        ) VALUES ($1, $2, '[]', 0, CURRENT_TIMESTAMP)`,
        [userId, courseId]
      );
    }
  } catch (error) {
    logError(error, { context: 'updateLastAccessed', userId, courseId });
    throw error;
  }
}

/**
 * Get progress statistics for a user
 */
export async function getProgressStats(userId: string): Promise<ProgressStats> {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as "totalCourses",
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as "completedCourses",
        COUNT(CASE WHEN completed_at IS NULL AND progress_percentage > 0 THEN 1 END) as "inProgressCourses",
        SUM(jsonb_array_length(completed_lessons)) as "totalLessonsCompleted",
        COALESCE(AVG(progress_percentage), 0) as "averageProgress"
      FROM course_progress
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        totalLessonsCompleted: 0,
        averageProgress: 0,
      };
    }

    const stats = result.rows[0];
    
    return {
      totalCourses: parseInt(stats.totalCourses) || 0,
      completedCourses: parseInt(stats.completedCourses) || 0,
      inProgressCourses: parseInt(stats.inProgressCourses) || 0,
      totalLessonsCompleted: parseInt(stats.totalLessonsCompleted) || 0,
      averageProgress: Math.round(parseFloat(stats.averageProgress)) || 0,
    };
  } catch (error) {
    logError(error, { context: 'getProgressStats', userId });
    throw error;
  }
}

/**
 * Get progress for multiple courses at once
 */
export async function getBulkCourseProgress(
  userId: string,
  courseIds: string[]
): Promise<Map<string, CourseProgress>> {
  if (courseIds.length === 0) {
    return new Map();
  }

  try {
    const result = await pool.query(
      `SELECT 
        id,
        user_id as "userId",
        course_id as "courseId",
        completed_lessons as "completedLessons",
        progress_percentage as "progressPercentage",
        last_accessed_at as "lastAccessedAt",
        completed_at as "completedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM course_progress
      WHERE user_id = $1 AND course_id = ANY($2)`,
      [userId, courseIds]
    );

    const progressMap = new Map<string, CourseProgress>();
    
    for (const row of result.rows) {
      progressMap.set(row.courseId, row);
    }

    return progressMap;
  } catch (error) {
    logError(error, { context: 'getBulkCourseProgress', userId, courseIds: courseIds.length });
    throw error;
  }
}

/**
 * Check if a specific lesson is completed
 */
export async function isLessonCompleted(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<boolean> {
  try {
    const progress = await getCourseProgress(userId, courseId);
    
    if (!progress) {
      return false;
    }

    return progress.completedLessons.includes(lessonId);
  } catch (error) {
    logError(error, { context: 'isLessonCompleted', userId, courseId, lessonId });
    throw error;
  }
}

/**
 * Get completion percentage for a course
 */
export async function getCompletionPercentage(
  userId: string,
  courseId: string
): Promise<number> {
  try {
    const progress = await getCourseProgress(userId, courseId);
    
    return progress?.progressPercentage || 0;
  } catch (error) {
    logError(error, { context: 'getCompletionPercentage', userId, courseId });
    throw error;
  }
}

/**
 * T123: Get lesson-level progress for a user's course
 * Fetches data from lesson_progress table (T122)
 */
export interface LessonProgress {
  lessonId: string;
  lessonTitle?: string;
  completed: boolean;
  timeSpentSeconds: number;
  attempts: number;
  score: number | null;
  firstStartedAt: Date;
  lastAccessedAt: Date;
  completedAt: Date | null;
}

export async function getLessonProgress(
  userId: string,
  courseId: string
): Promise<LessonProgress[]> {
  try {
    const result = await pool.query(
      `SELECT 
        lesson_id,
        completed,
        time_spent_seconds,
        attempts,
        score,
        first_started_at,
        last_accessed_at,
        completed_at
       FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2
       ORDER BY first_started_at ASC`,
      [userId, courseId]
    );

    return result.rows.map(row => ({
      lessonId: row.lesson_id,
      completed: row.completed,
      timeSpentSeconds: row.time_spent_seconds,
      attempts: row.attempts,
      score: row.score,
      firstStartedAt: row.first_started_at,
      lastAccessedAt: row.last_accessed_at,
      completedAt: row.completed_at,
    }));
  } catch (error) {
    logError(error, { context: 'getLessonProgress', userId, courseId });
    throw error;
  }
}

/**
 * T123: Get aggregated stats from lesson progress
 */
export interface AggregateStats {
  totalTimeSpent: number; // seconds
  averageScore: number | null; // average of all quiz scores
  totalAttempts: number;
  completedLessons: number;
  difficultLessons: string[]; // lessonIds with high attempts (>=3)
}

export async function getAggregatedStats(
  userId: string,
  courseId: string
): Promise<AggregateStats> {
  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(time_spent_seconds), 0) as total_time,
        AVG(score) FILTER (WHERE score IS NOT NULL) as avg_score,
        COALESCE(SUM(attempts), 0) as total_attempts,
        COUNT(*) FILTER (WHERE completed = true) as completed_count,
        ARRAY_AGG(lesson_id) FILTER (WHERE attempts >= 3) as difficult_lessons
       FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );

    const row = result.rows[0];
    return {
      totalTimeSpent: parseInt(row.total_time) || 0,
      averageScore: row.avg_score ? parseFloat(row.avg_score) : null,
      totalAttempts: parseInt(row.total_attempts) || 0,
      completedLessons: parseInt(row.completed_count) || 0,
      difficultLessons: row.difficult_lessons || [],
    };
  } catch (error) {
    logError(error, { context: 'getAggregatedStats', userId, courseId });
    throw error;
  }
}

/**
 * T123: Get current/next lesson for resume functionality
 * Returns the first incomplete lesson, or most recently accessed if all complete
 */
export async function getCurrentLesson(
  userId: string,
  courseId: string
): Promise<string | null> {
  try {
    // First try to find first incomplete lesson
    const incompleteResult = await pool.query(
      `SELECT lesson_id
       FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2 AND completed = false
       ORDER BY first_started_at ASC
       LIMIT 1`,
      [userId, courseId]
    );

    if (incompleteResult.rows.length > 0) {
      return incompleteResult.rows[0].lesson_id;
    }

    // If all complete, return most recently accessed
    const recentResult = await pool.query(
      `SELECT lesson_id
       FROM lesson_progress
       WHERE user_id = $1 AND course_id = $2
       ORDER BY last_accessed_at DESC
       LIMIT 1`,
      [userId, courseId]
    );

    return recentResult.rows.length > 0 ? recentResult.rows[0].lesson_id : null;
  } catch (error) {
    logError(error, { context: 'getCurrentLesson', userId, courseId });
    throw error;
  }
}

/**
 * T123: Get combined course and lesson progress data
 * Useful for CourseProgressCard component
 */
export interface CourseWithLessonProgress {
  courseId: string;
  courseTitle?: string;
  courseSlug?: string;
  courseThumbnailUrl?: string;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  totalTimeSpent: number;
  averageScore: number | null;
  lastAccessedAt: Date | null;
  nextLessonId: string | null;
  isCompleted: boolean;
  lessonProgress: LessonProgress[];
}

export async function getCourseWithLessonProgress(
  userId: string,
  courseId: string
): Promise<CourseWithLessonProgress | null> {
  try {
    // Get course progress from T121
    const courseProgress = await getCourseProgress(userId, courseId);
    if (!courseProgress) {
      return null;
    }

    // Get lesson progress from T122
    const lessonProgress = await getLessonProgress(userId, courseId);
    
    // Get aggregated stats
    const stats = await getAggregatedStats(userId, courseId);
    
    // Get current lesson
    const nextLessonId = await getCurrentLesson(userId, courseId);

    return {
      courseId: courseProgress.courseId,
      progressPercentage: courseProgress.progressPercentage,
      completedLessons: stats.completedLessons,
      totalLessons: courseProgress.completedLessons.length, // Total lessons from JSONB array
      totalTimeSpent: stats.totalTimeSpent,
      averageScore: stats.averageScore,
      lastAccessedAt: courseProgress.lastAccessedAt,
      nextLessonId,
      isCompleted: courseProgress.progressPercentage >= 100,
      lessonProgress,
    };
  } catch (error) {
    logError(error, { context: 'getCourseWithLessonProgress', userId, courseId });
    throw error;
  }
}

export const ProgressService = {
  getCourseProgress,
  getUserProgress,
  markLessonComplete,
  markLessonIncomplete,
  resetCourseProgress,
  updateLastAccessed,
  getProgressStats,
  getBulkCourseProgress,
  isLessonCompleted,
  getCompletionPercentage,
  // T123: Lesson-level progress functions
  getLessonProgress,
  getAggregatedStats,
  getCurrentLesson,
  getCourseWithLessonProgress,
};
