/**
 * T122: Lesson Progress Table Tests
 * Tests for the lesson_progress database table structure and operations
 */

import { test, expect } from '@playwright/test';
import pool from '../../src/lib/db';

// Test data constants
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_COURSE_ID = '660e8400-e29b-41d4-a716-446655440001';
const TEST_LESSON_ID_1 = 'lesson-intro-001';
const TEST_LESSON_ID_2 = 'lesson-basics-002';
const TEST_LESSON_ID_3 = 'lesson-advanced-003';

// Helper function to clean up test data
async function cleanupTestData() {
  try {
    await pool.query('DELETE FROM lesson_progress WHERE user_id = $1', [TEST_USER_ID]);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Helper function to create test lesson progress
async function createTestLessonProgress(
  lessonId: string,
  completed: boolean = false,
  timeSpent: number = 0,
  attempts: number = 0,
  score?: number
) {
  const result = await pool.query(
    `INSERT INTO lesson_progress 
    (user_id, course_id, lesson_id, completed, time_spent_seconds, attempts, score, completed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      TEST_USER_ID,
      TEST_COURSE_ID,
      lessonId,
      completed,
      timeSpent,
      attempts,
      score || null,
      completed ? new Date() : null,
    ]
  );
  return result.rows[0];
}

test.describe('Lesson Progress Table - Schema Validation', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should create lesson_progress table with correct structure', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'lesson_progress'
      ORDER BY ordinal_position
    `);

    expect(result.rows.length).toBeGreaterThan(0);

    const columns = result.rows.map((row) => row.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('user_id');
    expect(columns).toContain('course_id');
    expect(columns).toContain('lesson_id');
    expect(columns).toContain('completed');
    expect(columns).toContain('time_spent_seconds');
    expect(columns).toContain('attempts');
    expect(columns).toContain('score');
    expect(columns).toContain('first_started_at');
    expect(columns).toContain('last_accessed_at');
    expect(columns).toContain('completed_at');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
  });

  test('should have correct data types for all columns', async () => {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'lesson_progress'
    `);

    const typeMap = Object.fromEntries(
      result.rows.map((row) => [row.column_name, row.data_type])
    );

    expect(typeMap['id']).toBe('uuid');
    expect(typeMap['user_id']).toBe('uuid');
    expect(typeMap['course_id']).toBe('uuid');
    expect(typeMap['lesson_id']).toBe('character varying');
    expect(typeMap['completed']).toBe('boolean');
    expect(typeMap['time_spent_seconds']).toBe('integer');
    expect(typeMap['attempts']).toBe('integer');
    expect(typeMap['score']).toBe('integer');
    expect(typeMap['first_started_at']).toBe('timestamp with time zone');
    expect(typeMap['last_accessed_at']).toBe('timestamp with time zone');
    expect(typeMap['completed_at']).toBe('timestamp with time zone');
    expect(typeMap['created_at']).toBe('timestamp with time zone');
    expect(typeMap['updated_at']).toBe('timestamp with time zone');
  });

  test('should have unique constraint on (user_id, course_id, lesson_id)', async () => {
    const result = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'lesson_progress' AND constraint_type = 'UNIQUE'
    `);

    expect(result.rows.length).toBeGreaterThan(0);
  });

  test('should have foreign key constraints on user_id and course_id', async () => {
    const result = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'lesson_progress' AND constraint_type = 'FOREIGN KEY'
    `);

    expect(result.rows.length).toBeGreaterThanOrEqual(2);
  });

  test('should have indexes on key columns', async () => {
    const result = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'lesson_progress'
    `);

    const indexes = result.rows.map((row) => row.indexname);
    expect(indexes.some((idx) => idx.includes('user_id'))).toBe(true);
    expect(indexes.some((idx) => idx.includes('course_id'))).toBe(true);
    expect(indexes.some((idx) => idx.includes('lesson_id'))).toBe(true);
  });
});

test.describe('Lesson Progress Table - CRUD Operations', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should insert new lesson progress record', async () => {
    const result = await pool.query(
      `INSERT INTO lesson_progress 
      (user_id, course_id, lesson_id, completed, time_spent_seconds)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [TEST_USER_ID, TEST_COURSE_ID, TEST_LESSON_ID_1, false, 0]
    );

    expect(result.rows[0]).toBeDefined();
    expect(result.rows[0].user_id).toBe(TEST_USER_ID);
    expect(result.rows[0].course_id).toBe(TEST_COURSE_ID);
    expect(result.rows[0].lesson_id).toBe(TEST_LESSON_ID_1);
    expect(result.rows[0].completed).toBe(false);
    expect(result.rows[0].time_spent_seconds).toBe(0);
    expect(result.rows[0].id).toBeDefined();
  });

  test('should retrieve lesson progress by user and course', async () => {
    await createTestLessonProgress(TEST_LESSON_ID_1, false, 120);
    await createTestLessonProgress(TEST_LESSON_ID_2, true, 300);

    const result = await pool.query(
      `SELECT * FROM lesson_progress 
       WHERE user_id = $1 AND course_id = $2
       ORDER BY lesson_id`,
      [TEST_USER_ID, TEST_COURSE_ID]
    );

    expect(result.rows.length).toBe(2);
    expect(result.rows[0].lesson_id).toBe(TEST_LESSON_ID_1);
    expect(result.rows[0].completed).toBe(false);
    expect(result.rows[1].lesson_id).toBe(TEST_LESSON_ID_2);
    expect(result.rows[1].completed).toBe(true);
  });

  test('should update lesson progress', async () => {
    const created = await createTestLessonProgress(TEST_LESSON_ID_1, false, 120);

    const result = await pool.query(
      `UPDATE lesson_progress 
       SET completed = $1, time_spent_seconds = $2, completed_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [true, 180, created.id]
    );

    expect(result.rows[0].completed).toBe(true);
    expect(result.rows[0].time_spent_seconds).toBe(180);
    expect(result.rows[0].completed_at).not.toBeNull();
  });

  test('should delete lesson progress', async () => {
    const created = await createTestLessonProgress(TEST_LESSON_ID_1);

    const deleteResult = await pool.query(
      'DELETE FROM lesson_progress WHERE id = $1 RETURNING id',
      [created.id]
    );

    expect(deleteResult.rows[0].id).toBe(created.id);

    const checkResult = await pool.query(
      'SELECT * FROM lesson_progress WHERE id = $1',
      [created.id]
    );

    expect(checkResult.rows.length).toBe(0);
  });
});

test.describe('Lesson Progress Table - Time Tracking', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should track time spent on lesson', async () => {
    const progress = await createTestLessonProgress(TEST_LESSON_ID_1, false, 0);

    // Simulate user spending time
    await pool.query(
      'UPDATE lesson_progress SET time_spent_seconds = time_spent_seconds + $1 WHERE id = $2',
      [60, progress.id]
    );

    await pool.query(
      'UPDATE lesson_progress SET time_spent_seconds = time_spent_seconds + $1 WHERE id = $2',
      [120, progress.id]
    );

    const result = await pool.query('SELECT * FROM lesson_progress WHERE id = $1', [
      progress.id,
    ]);

    expect(result.rows[0].time_spent_seconds).toBe(180); // 60 + 120
  });

  test('should update last_accessed_at on activity', async () => {
    const progress = await createTestLessonProgress(TEST_LESSON_ID_1);
    const originalTime = progress.last_accessed_at;

    // Wait a bit and update
    await new Promise((resolve) => setTimeout(resolve, 100));

    await pool.query(
      'UPDATE lesson_progress SET last_accessed_at = NOW() WHERE id = $1',
      [progress.id]
    );

    const result = await pool.query('SELECT * FROM lesson_progress WHERE id = $1', [
      progress.id,
    ]);

    expect(new Date(result.rows[0].last_accessed_at).getTime()).toBeGreaterThan(
      new Date(originalTime).getTime()
    );
  });

  test('should set completed_at when lesson is marked complete', async () => {
    const progress = await createTestLessonProgress(TEST_LESSON_ID_1, false);

    expect(progress.completed_at).toBeNull();

    await pool.query(
      'UPDATE lesson_progress SET completed = true, completed_at = NOW() WHERE id = $1',
      [progress.id]
    );

    const result = await pool.query('SELECT * FROM lesson_progress WHERE id = $1', [
      progress.id,
    ]);

    expect(result.rows[0].completed).toBe(true);
    expect(result.rows[0].completed_at).not.toBeNull();
  });
});

test.describe('Lesson Progress Table - Attempts and Scoring', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should track number of attempts', async () => {
    const progress = await createTestLessonProgress(TEST_LESSON_ID_1, false, 0, 0);

    // Simulate multiple attempts
    for (let i = 0; i < 3; i++) {
      await pool.query(
        'UPDATE lesson_progress SET attempts = attempts + 1 WHERE id = $1',
        [progress.id]
      );
    }

    const result = await pool.query('SELECT * FROM lesson_progress WHERE id = $1', [
      progress.id,
    ]);

    expect(result.rows[0].attempts).toBe(3);
  });

  test('should store lesson score', async () => {
    const progress = await createTestLessonProgress(TEST_LESSON_ID_1, true, 300, 2, 85);

    expect(progress.score).toBe(85);
    expect(progress.attempts).toBe(2);
    expect(progress.completed).toBe(true);
  });

  test('should enforce score range (0-100)', async () => {
    await expect(
      pool.query(
        `INSERT INTO lesson_progress 
        (user_id, course_id, lesson_id, score)
        VALUES ($1, $2, $3, $4)`,
        [TEST_USER_ID, TEST_COURSE_ID, TEST_LESSON_ID_1, 150]
      )
    ).rejects.toThrow();
  });

  test('should allow null score', async () => {
    const progress = await createTestLessonProgress(TEST_LESSON_ID_1, true, 300, 1);

    expect(progress.score).toBeNull();
    expect(progress.completed).toBe(true);
  });
});

test.describe('Lesson Progress Table - Constraints', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should prevent duplicate lesson progress for same user/course/lesson', async () => {
    await createTestLessonProgress(TEST_LESSON_ID_1);

    await expect(
      createTestLessonProgress(TEST_LESSON_ID_1)
    ).rejects.toThrow();
  });

  test('should allow same lesson for different users', async () => {
    await createTestLessonProgress(TEST_LESSON_ID_1);

    const result = await pool.query(
      `INSERT INTO lesson_progress 
      (user_id, course_id, lesson_id)
      VALUES ($1, $2, $3)
      RETURNING *`,
      ['660e8400-e29b-41d4-a716-446655440002', TEST_COURSE_ID, TEST_LESSON_ID_1]
    );

    expect(result.rows[0]).toBeDefined();
    expect(result.rows[0].lesson_id).toBe(TEST_LESSON_ID_1);

    // Cleanup additional user
    await pool.query('DELETE FROM lesson_progress WHERE user_id = $1', [
      '660e8400-e29b-41d4-a716-446655440002',
    ]);
  });

  test('should enforce non-negative time_spent_seconds', async () => {
    await expect(
      pool.query(
        `INSERT INTO lesson_progress 
        (user_id, course_id, lesson_id, time_spent_seconds)
        VALUES ($1, $2, $3, $4)`,
        [TEST_USER_ID, TEST_COURSE_ID, TEST_LESSON_ID_1, -100]
      )
    ).rejects.toThrow();
  });

  test('should enforce non-negative attempts', async () => {
    await expect(
      pool.query(
        `INSERT INTO lesson_progress 
        (user_id, course_id, lesson_id, attempts)
        VALUES ($1, $2, $3, $4)`,
        [TEST_USER_ID, TEST_COURSE_ID, TEST_LESSON_ID_1, -5]
      )
    ).rejects.toThrow();
  });
});

test.describe('Lesson Progress Table - Queries and Analytics', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should get all completed lessons for a user', async () => {
    await createTestLessonProgress(TEST_LESSON_ID_1, true, 180);
    await createTestLessonProgress(TEST_LESSON_ID_2, false, 60);
    await createTestLessonProgress(TEST_LESSON_ID_3, true, 240);

    const result = await pool.query(
      `SELECT * FROM lesson_progress 
       WHERE user_id = $1 AND course_id = $2 AND completed = true
       ORDER BY completed_at`,
      [TEST_USER_ID, TEST_COURSE_ID]
    );

    expect(result.rows.length).toBe(2);
    expect(result.rows[0].lesson_id).toBe(TEST_LESSON_ID_1);
    expect(result.rows[1].lesson_id).toBe(TEST_LESSON_ID_3);
  });

  test('should calculate total time spent on course', async () => {
    await createTestLessonProgress(TEST_LESSON_ID_1, true, 180);
    await createTestLessonProgress(TEST_LESSON_ID_2, false, 120);
    await createTestLessonProgress(TEST_LESSON_ID_3, true, 240);

    const result = await pool.query(
      `SELECT SUM(time_spent_seconds) as total_time
       FROM lesson_progress 
       WHERE user_id = $1 AND course_id = $2`,
      [TEST_USER_ID, TEST_COURSE_ID]
    );

    expect(result.rows[0].total_time).toBe('540'); // 180 + 120 + 240
  });

  test('should calculate average score for completed lessons', async () => {
    await createTestLessonProgress(TEST_LESSON_ID_1, true, 180, 1, 80);
    await createTestLessonProgress(TEST_LESSON_ID_2, true, 120, 2, 90);
    await createTestLessonProgress(TEST_LESSON_ID_3, true, 240, 1, 85);

    const result = await pool.query(
      `SELECT AVG(score)::INTEGER as avg_score
       FROM lesson_progress 
       WHERE user_id = $1 AND course_id = $2 AND completed = true AND score IS NOT NULL`,
      [TEST_USER_ID, TEST_COURSE_ID]
    );

    expect(result.rows[0].avg_score).toBe(85); // (80 + 90 + 85) / 3 = 85
  });

  test('should get lessons with most attempts', async () => {
    await createTestLessonProgress(TEST_LESSON_ID_1, true, 180, 1, 80);
    await createTestLessonProgress(TEST_LESSON_ID_2, true, 120, 5, 90);
    await createTestLessonProgress(TEST_LESSON_ID_3, true, 240, 3, 85);

    const result = await pool.query(
      `SELECT lesson_id, attempts
       FROM lesson_progress 
       WHERE user_id = $1 AND course_id = $2
       ORDER BY attempts DESC
       LIMIT 1`,
      [TEST_USER_ID, TEST_COURSE_ID]
    );

    expect(result.rows[0].lesson_id).toBe(TEST_LESSON_ID_2);
    expect(result.rows[0].attempts).toBe(5);
  });
});

test.describe('Lesson Progress Table - Trigger Tests', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should auto-update updated_at timestamp on changes', async () => {
    const progress = await createTestLessonProgress(TEST_LESSON_ID_1);
    const originalUpdatedAt = progress.updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 100));

    await pool.query(
      'UPDATE lesson_progress SET time_spent_seconds = $1 WHERE id = $2',
      [120, progress.id]
    );

    const result = await pool.query('SELECT * FROM lesson_progress WHERE id = $1', [
      progress.id,
    ]);

    expect(new Date(result.rows[0].updated_at).getTime()).toBeGreaterThan(
      new Date(originalUpdatedAt).getTime()
    );
  });

  test('should cascade delete when user is deleted', async () => {
    // This test assumes we have a test user we can delete
    // In a real scenario, you'd create a test user first
    const testUserId = '770e8400-e29b-41d4-a716-446655440099';

    // Create a test user (simplified - in real tests you'd use proper user creation)
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [testUserId, 'test-cascade@example.com', 'hash', 'Test User', 'user']
    );

    // Create lesson progress for test user
    await pool.query(
      `INSERT INTO lesson_progress (user_id, course_id, lesson_id)
       VALUES ($1, $2, $3)`,
      [testUserId, TEST_COURSE_ID, TEST_LESSON_ID_1]
    );

    // Delete the user
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);

    // Check that lesson progress was cascade deleted
    const result = await pool.query(
      'SELECT * FROM lesson_progress WHERE user_id = $1',
      [testUserId]
    );

    expect(result.rows.length).toBe(0);
  });
});
