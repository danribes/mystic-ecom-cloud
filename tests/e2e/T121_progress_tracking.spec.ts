/**
 * T121: Progress Tracking Tests
 * Comprehensive E2E tests for course progress tracking functionality
 * 
 * Test Coverage:
 * - Getting progress for courses
 * - Marking lessons as complete/incomplete
 * - Progress percentage calculations
 * - Last accessed timestamp updates
 * - Progress statistics
 * - Bulk progress retrieval
 * - Reset functionality
 * - Error handling
 */

import { test, expect } from '@playwright/test';
import { ProgressService } from '../../src/lib/progress';
import pool from '../../src/lib/db';

// Test data
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_COURSE_ID = '660e8400-e29b-41d4-a716-446655440001';
const TEST_COURSE_ID_2 = '660e8400-e29b-41d4-a716-446655440002';
const TOTAL_LESSONS = 10;

// Helper function to clean up test data
async function cleanupTestData() {
  await pool.query(
    'DELETE FROM course_progress WHERE user_id = $1',
    [TEST_USER_ID]
  );
}

// Helper function to create test progress record
async function createTestProgress(courseId: string, completedLessons: string[], percentage: number) {
  await pool.query(
    `INSERT INTO course_progress (
      user_id, 
      course_id, 
      completed_lessons, 
      progress_percentage,
      last_accessed_at
    ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
    [TEST_USER_ID, courseId, JSON.stringify(completedLessons), percentage]
  );
}

test.describe('T121: Progress Tracking - Get Progress', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should return null when no progress exists', async () => {
    const progress = await ProgressService.getCourseProgress(TEST_USER_ID, TEST_COURSE_ID);
    
    expect(progress).toBeNull();
  });

  test('should return progress when it exists', async () => {
    const completedLessons = ['lesson-1', 'lesson-2'];
    await createTestProgress(TEST_COURSE_ID, completedLessons, 20);

    const progress = await ProgressService.getCourseProgress(TEST_USER_ID, TEST_COURSE_ID);
    
    expect(progress).not.toBeNull();
    expect(progress?.userId).toBe(TEST_USER_ID);
    expect(progress?.courseId).toBe(TEST_COURSE_ID);
    expect(progress?.completedLessons).toEqual(completedLessons);
    expect(progress?.progressPercentage).toBe(20);
  });

  test('should get all user progress records', async () => {
    await createTestProgress(TEST_COURSE_ID, ['lesson-1'], 10);
    await createTestProgress(TEST_COURSE_ID_2, ['lesson-1', 'lesson-2'], 20);

    const allProgress = await ProgressService.getUserProgress(TEST_USER_ID);
    
    expect(allProgress).toHaveLength(2);
    expect(allProgress[0]?.courseId).toBeTruthy();
    expect(allProgress[1]?.courseId).toBeTruthy();
  });

  test('should filter out completed courses when requested', async () => {
    // Create in-progress course
    await createTestProgress(TEST_COURSE_ID, ['lesson-1'], 10);
    
    // Create completed course
    await pool.query(
      `INSERT INTO course_progress (
        user_id, 
        course_id, 
        completed_lessons, 
        progress_percentage,
        completed_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [TEST_USER_ID, TEST_COURSE_ID_2, JSON.stringify(['lesson-1']), 100]
    );

    const inProgressOnly = await ProgressService.getUserProgress(TEST_USER_ID, { 
      includeCompleted: false 
    });
    
    expect(inProgressOnly).toHaveLength(1);
    expect(inProgressOnly[0]?.courseId).toBe(TEST_COURSE_ID);
  });
});

test.describe('T121: Progress Tracking - Mark Lessons Complete', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should create new progress record when marking first lesson', async () => {
    const progress = await ProgressService.markLessonComplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-1',
      totalLessons: TOTAL_LESSONS,
    });
    
    expect(progress).not.toBeNull();
    expect(progress.completedLessons).toEqual(['lesson-1']);
    expect(progress.progressPercentage).toBe(10); // 1/10 = 10%
    expect(progress.completedAt).toBeNull();
  });

  test('should update existing progress when marking additional lesson', async () => {
    // Create initial progress
    await createTestProgress(TEST_COURSE_ID, ['lesson-1'], 10);

    // Mark second lesson complete
    const progress = await ProgressService.markLessonComplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-2',
      totalLessons: TOTAL_LESSONS,
    });
    
    expect(progress.completedLessons).toEqual(['lesson-1', 'lesson-2']);
    expect(progress.progressPercentage).toBe(20); // 2/10 = 20%
    expect(progress.completedAt).toBeNull();
  });

  test('should not duplicate lesson if already completed', async () => {
    await createTestProgress(TEST_COURSE_ID, ['lesson-1'], 10);

    // Mark same lesson again
    const progress = await ProgressService.markLessonComplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-1',
      totalLessons: TOTAL_LESSONS,
    });
    
    expect(progress.completedLessons).toEqual(['lesson-1']);
    expect(progress.progressPercentage).toBe(10);
  });

  test('should set completedAt when course reaches 100%', async () => {
    // Create progress with 9/10 lessons
    const lessons = Array.from({ length: 9 }, (_, i) => `lesson-${i + 1}`);
    await createTestProgress(TEST_COURSE_ID, lessons, 90);

    // Complete final lesson
    const progress = await ProgressService.markLessonComplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-10',
      totalLessons: TOTAL_LESSONS,
    });
    
    expect(progress.progressPercentage).toBe(100);
    expect(progress.completedAt).not.toBeNull();
  });

  test('should calculate correct percentage for various lesson counts', async () => {
    // Test with 3 lessons
    const progress1 = await ProgressService.markLessonComplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-1',
      totalLessons: 3,
    });
    expect(progress1.progressPercentage).toBe(33); // 1/3 = 33%

    await cleanupTestData();

    // Test with 5 lessons
    const progress2 = await ProgressService.markLessonComplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-1',
      totalLessons: 5,
    });
    expect(progress2.progressPercentage).toBe(20); // 1/5 = 20%
  });
});

test.describe('T121: Progress Tracking - Mark Lessons Incomplete', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should return null when no progress exists', async () => {
    const progress = await ProgressService.markLessonIncomplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-1',
      totalLessons: TOTAL_LESSONS,
    });
    
    expect(progress).toBeNull();
  });

  test('should remove lesson from completed list', async () => {
    await createTestProgress(TEST_COURSE_ID, ['lesson-1', 'lesson-2'], 20);

    const progress = await ProgressService.markLessonIncomplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-2',
      totalLessons: TOTAL_LESSONS,
    });
    
    expect(progress?.completedLessons).toEqual(['lesson-1']);
    expect(progress?.progressPercentage).toBe(10); // 1/10 = 10%
  });

  test('should clear completedAt when unmarking lesson from completed course', async () => {
    // Create completed course
    const allLessons = Array.from({ length: 10 }, (_, i) => `lesson-${i + 1}`);
    await pool.query(
      `INSERT INTO course_progress (
        user_id, 
        course_id, 
        completed_lessons, 
        progress_percentage,
        completed_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [TEST_USER_ID, TEST_COURSE_ID, JSON.stringify(allLessons), 100]
    );

    // Unmark one lesson
    const progress = await ProgressService.markLessonIncomplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-10',
      totalLessons: TOTAL_LESSONS,
    });
    
    expect(progress?.progressPercentage).toBe(90);
    expect(progress?.completedAt).toBeNull();
  });

  test('should handle unmarking lesson not in completed list', async () => {
    await createTestProgress(TEST_COURSE_ID, ['lesson-1'], 10);

    const progress = await ProgressService.markLessonIncomplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-5', // Not completed
      totalLessons: TOTAL_LESSONS,
    });
    
    expect(progress?.completedLessons).toEqual(['lesson-1']);
    expect(progress?.progressPercentage).toBe(10);
  });
});

test.describe('T121: Progress Tracking - Reset and Update', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should reset course progress', async () => {
    await createTestProgress(TEST_COURSE_ID, ['lesson-1', 'lesson-2'], 20);

    const result = await ProgressService.resetCourseProgress(TEST_USER_ID, TEST_COURSE_ID);
    
    expect(result).toBe(true);

    const progress = await ProgressService.getCourseProgress(TEST_USER_ID, TEST_COURSE_ID);
    expect(progress).toBeNull();
  });

  test('should return false when resetting non-existent progress', async () => {
    const result = await ProgressService.resetCourseProgress(TEST_USER_ID, TEST_COURSE_ID);
    
    expect(result).toBe(false);
  });

  test('should update last accessed timestamp on existing progress', async () => {
    await createTestProgress(TEST_COURSE_ID, ['lesson-1'], 10);

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    await ProgressService.updateLastAccessed(TEST_USER_ID, TEST_COURSE_ID);

    const progress = await ProgressService.getCourseProgress(TEST_USER_ID, TEST_COURSE_ID);
    
    expect(progress?.lastAccessedAt).toBeTruthy();
  });

  test('should create new progress record when updating last accessed on non-existent record', async () => {
    await ProgressService.updateLastAccessed(TEST_USER_ID, TEST_COURSE_ID);

    const progress = await ProgressService.getCourseProgress(TEST_USER_ID, TEST_COURSE_ID);
    
    expect(progress).not.toBeNull();
    expect(progress?.progressPercentage).toBe(0);
    expect(progress?.completedLessons).toEqual([]);
  });
});

test.describe('T121: Progress Tracking - Statistics', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should return zero stats for user with no progress', async () => {
    const stats = await ProgressService.getProgressStats(TEST_USER_ID);
    
    expect(stats.totalCourses).toBe(0);
    expect(stats.completedCourses).toBe(0);
    expect(stats.inProgressCourses).toBe(0);
    expect(stats.totalLessonsCompleted).toBe(0);
    expect(stats.averageProgress).toBe(0);
  });

  test('should calculate stats correctly for multiple courses', async () => {
    // In-progress course 1
    await createTestProgress(TEST_COURSE_ID, ['lesson-1', 'lesson-2'], 20);
    
    // In-progress course 2
    await createTestProgress(TEST_COURSE_ID_2, ['lesson-1'], 10);

    // Completed course
    const courseId3 = '660e8400-e29b-41d4-a716-446655440003';
    await pool.query(
      `INSERT INTO course_progress (
        user_id, 
        course_id, 
        completed_lessons, 
        progress_percentage,
        completed_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [TEST_USER_ID, courseId3, JSON.stringify(['lesson-1', 'lesson-2', 'lesson-3']), 100]
    );

    const stats = await ProgressService.getProgressStats(TEST_USER_ID);
    
    expect(stats.totalCourses).toBe(3);
    expect(stats.completedCourses).toBe(1);
    expect(stats.inProgressCourses).toBe(2);
    expect(stats.totalLessonsCompleted).toBe(6); // 2 + 1 + 3
    expect(stats.averageProgress).toBeGreaterThan(0);
  });
});

test.describe('T121: Progress Tracking - Bulk Operations', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should return empty map for empty course list', async () => {
    const progressMap = await ProgressService.getBulkCourseProgress(TEST_USER_ID, []);
    
    expect(progressMap.size).toBe(0);
  });

  test('should retrieve progress for multiple courses', async () => {
    await createTestProgress(TEST_COURSE_ID, ['lesson-1'], 10);
    await createTestProgress(TEST_COURSE_ID_2, ['lesson-1', 'lesson-2'], 20);

    const progressMap = await ProgressService.getBulkCourseProgress(
      TEST_USER_ID,
      [TEST_COURSE_ID, TEST_COURSE_ID_2]
    );
    
    expect(progressMap.size).toBe(2);
    expect(progressMap.get(TEST_COURSE_ID)?.progressPercentage).toBe(10);
    expect(progressMap.get(TEST_COURSE_ID_2)?.progressPercentage).toBe(20);
  });

  test('should only return progress for courses that exist', async () => {
    await createTestProgress(TEST_COURSE_ID, ['lesson-1'], 10);

    const progressMap = await ProgressService.getBulkCourseProgress(
      TEST_USER_ID,
      [TEST_COURSE_ID, TEST_COURSE_ID_2, '660e8400-e29b-41d4-a716-446655440003']
    );
    
    expect(progressMap.size).toBe(1);
    expect(progressMap.has(TEST_COURSE_ID)).toBe(true);
    expect(progressMap.has(TEST_COURSE_ID_2)).toBe(false);
  });
});

test.describe('T121: Progress Tracking - Helper Functions', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should check if lesson is completed', async () => {
    await createTestProgress(TEST_COURSE_ID, ['lesson-1', 'lesson-2'], 20);

    const isCompleted1 = await ProgressService.isLessonCompleted(
      TEST_USER_ID,
      TEST_COURSE_ID,
      'lesson-1'
    );
    const isCompleted5 = await ProgressService.isLessonCompleted(
      TEST_USER_ID,
      TEST_COURSE_ID,
      'lesson-5'
    );
    
    expect(isCompleted1).toBe(true);
    expect(isCompleted5).toBe(false);
  });

  test('should return false for lesson in non-existent progress', async () => {
    const isCompleted = await ProgressService.isLessonCompleted(
      TEST_USER_ID,
      TEST_COURSE_ID,
      'lesson-1'
    );
    
    expect(isCompleted).toBe(false);
  });

  test('should get completion percentage', async () => {
    await createTestProgress(TEST_COURSE_ID, ['lesson-1', 'lesson-2'], 20);

    const percentage = await ProgressService.getCompletionPercentage(
      TEST_USER_ID,
      TEST_COURSE_ID
    );
    
    expect(percentage).toBe(20);
  });

  test('should return 0 for completion percentage of non-existent progress', async () => {
    const percentage = await ProgressService.getCompletionPercentage(
      TEST_USER_ID,
      TEST_COURSE_ID
    );
    
    expect(percentage).toBe(0);
  });
});

test.describe('T121: Progress Tracking - Error Handling', () => {
  test('should handle invalid user ID gracefully', async () => {
    await expect(async () => {
      await ProgressService.getCourseProgress('invalid-uuid', TEST_COURSE_ID);
    }).rejects.toThrow();
  });

  test('should handle invalid course ID gracefully', async () => {
    await expect(async () => {
      await ProgressService.getCourseProgress(TEST_USER_ID, 'invalid-uuid');
    }).rejects.toThrow();
  });

  test('should handle database connection errors', async () => {
    // This test would require mocking the database connection
    // For now, we'll test that errors are properly thrown
    const invalidUserId = 'not-a-uuid-at-all';
    
    await expect(async () => {
      await ProgressService.markLessonComplete({
        userId: invalidUserId,
        courseId: TEST_COURSE_ID,
        lessonId: 'lesson-1',
        totalLessons: 10,
      });
    }).rejects.toThrow();
  });
});
