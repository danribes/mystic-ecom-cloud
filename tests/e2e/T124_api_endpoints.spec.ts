/**
 * T124: API Endpoints for Lesson Progress - Test Suite
 *
 * Tests the lesson tracking API endpoints:
 * - POST /api/lessons/[lessonId]/start - Start/resume lesson
 * - PUT /api/lessons/[lessonId]/time - Update time spent
 * - POST /api/lessons/[lessonId]/complete - Mark lesson complete
 * - GET /api/courses/[courseId]/progress - Get course progress
 */

import { test, expect } from '@playwright/test';
import { pool } from '../setup/database';
import { createTestUser, loginAsUser, cleanupTestUser } from '../helpers/auth';

// Test data constants
const TEST_COURSE_ID = '880e8400-e29b-41d4-a716-446655440001';

test.describe('T124: Lesson Progress API Endpoints', () => {
  let testUser: any;
  let authCookie: string;

  test.beforeAll(async ({ browser }) => {
    // Create test user with unique email
    const uniqueEmail = `test-api-endpoints-${Date.now()}-${Math.random().toString(36).substring(2)}@example.com`;
    testUser = await createTestUser({
      email: uniqueEmail,
      password: 'testpass123',
      name: 'Test API User'
    });

    // Create test course
    await pool.query(
      `INSERT INTO courses (id, title, slug, description, price, instructor_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [TEST_COURSE_ID, 'Test API Course', 'test-api-course', 'Course for API testing', 99.99, testUser.id]
    );

    // Login to get authentication cookie
    const page = await browser.newPage();
    await loginAsUser(page, testUser.email, 'testpass123');
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'session');
    authCookie = sessionCookie?.value || '';
    await page.close();
  });

  test.afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM lesson_progress WHERE user_id = $1', [testUser.id]);
    await pool.query('DELETE FROM course_progress WHERE user_id = $1', [testUser.id]);
    await pool.query('DELETE FROM courses WHERE id = $1', [TEST_COURSE_ID]);
    await cleanupTestUser(testUser.id);
  });

  test.describe('POST /api/lessons/[lessonId]/start', () => {
    test('should start a new lesson successfully', async ({ request }) => {
      const lessonId = 'lesson-1-intro';
      const response = await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Lesson started');
      expect(data.data).toMatchObject({
        lessonId,
        courseId: TEST_COURSE_ID,
        completed: false,
        timeSpentSeconds: 0,
        attempts: 0
      });
      expect(data.data.progressId).toBeDefined();
      expect(data.data.firstStartedAt).toBeDefined();
      expect(data.data.lastAccessedAt).toBeDefined();
    });

    test('should resume an existing lesson', async ({ request }) => {
      const lessonId = 'lesson-2-basics';
      // Start lesson first
      await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      // Try to start again (should resume)
      const response = await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Lesson resumed');
      expect(data.data.lessonId).toBe(lessonId);
    });

    test('should require authentication', async ({ request }) => {
      const lessonId = 'lesson-3-advanced';
      const response = await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: { 'Content-Type': 'application/json' }
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    test('should validate courseId format', async ({ request }) => {
      const lessonId = 'lesson-4-validation';
      const response = await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: 'invalid-uuid' },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
    });
  });

  test.describe('PUT /api/lessons/[lessonId]/time', () => {
    test('should update time spent on lesson', async ({ request }) => {
      const lessonId = 'lesson-5-time-tracking';
      // Start lesson first
      await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      // Update time
      const response = await request.put(`/api/lessons/${lessonId}/time`, {
        data: {
          courseId: TEST_COURSE_ID,
          timeSpentSeconds: 300 // 5 minutes
        },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Lesson time updated successfully');
      expect(data.data.timeSpentSeconds).toBe(300);
      expect(data.data.completed).toBe(false);
    });

    test('should accumulate time spent', async ({ request }) => {
      const lessonId = 'lesson-6-time-accumulation';
      // Start lesson
      await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      // Add 2 minutes
      await request.put(`/api/lessons/${lessonId}/time`, {
        data: { courseId: TEST_COURSE_ID, timeSpentSeconds: 120 },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      // Add another 3 minutes
      const response = await request.put(`/api/lessons/${lessonId}/time`, {
        data: { courseId: TEST_COURSE_ID, timeSpentSeconds: 180 },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data.timeSpentSeconds).toBe(300); // 2 + 3 minutes
    });

    test('should reject negative time values', async ({ request }) => {
      const lessonId = 'lesson-7-negative-time';
      await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      const response = await request.put(`/api/lessons/${lessonId}/time`, {
        data: { courseId: TEST_COURSE_ID, timeSpentSeconds: -60 },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
    });

    test('should return 404 for non-existent lesson progress', async ({ request }) => {
      const lessonId = 'lesson-8-non-existent';
      const response = await request.put(`/api/lessons/${lessonId}/time`, {
        data: { courseId: TEST_COURSE_ID, timeSpentSeconds: 60 },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Lesson progress not found. Start the lesson first.');
    });
  });

  test.describe('POST /api/lessons/[lessonId]/complete', () => {
    test('should mark lesson as completed', async ({ request }) => {
      const lessonId = 'lesson-9-completion';
      // Start lesson
      await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      // Complete lesson
      const response = await request.post(`/api/lessons/${lessonId}/complete`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Lesson completed successfully');
      expect(data.data.completed).toBe(true);
      expect(data.data.attempts).toBe(1);
      expect(data.data.completedAt).toBeDefined();
    });

    test('should increment attempts on completion', async ({ request }) => {
      const lessonId = 'lesson-10-attempts';
      // Start lesson
      await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      // Complete twice (should increment attempts)
      await request.post(`/api/lessons/${lessonId}/complete`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      const response = await request.post(`/api/lessons/${lessonId}/complete`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data.attempts).toBe(2);
    });

    test('should accept optional score parameter', async ({ request }) => {
      const lessonId = 'lesson-11-scoring';
      // Start lesson
      await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      // Complete with score
      const response = await request.post(`/api/lessons/${lessonId}/complete`, {
        data: { courseId: TEST_COURSE_ID, score: 85 },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.data.score).toBe(85);
    });

    test('should reject invalid score values', async ({ request }) => {
      const lessonId = 'lesson-12-invalid-score';
      await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      const response = await request.post(`/api/lessons/${lessonId}/complete`, {
        data: { courseId: TEST_COURSE_ID, score: 150 }, // Invalid: > 100
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request data');
    });

    test('should return current status for already completed lessons', async ({ request }) => {
      const lessonId = 'lesson-13-already-complete';
      // Start and complete lesson
      await request.post(`/api/lessons/${lessonId}/start`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      await request.post(`/api/lessons/${lessonId}/complete`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      // Try to complete again
      const response = await request.post(`/api/lessons/${lessonId}/complete`, {
        data: { courseId: TEST_COURSE_ID },
        headers: {
          'Cookie': `session=${authCookie}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Lesson was already completed');
      expect(data.data.completed).toBe(true);
    });
  });

  test.describe('GET /api/courses/[courseId]/progress', () => {
    test('should return comprehensive course progress', async ({ request }) => {
      // Create some lesson progress first
      const lessons = ['lesson-a', 'lesson-b', 'lesson-c'];
      for (const lessonId of lessons) {
        await request.post(`/api/lessons/${lessonId}/start`, {
          data: { courseId: TEST_COURSE_ID },
          headers: {
            'Cookie': `session=${authCookie}`,
            'Content-Type': 'application/json'
          }
        });

        // Add some time
        await request.put(`/api/lessons/${lessonId}/time`, {
          data: { courseId: TEST_COURSE_ID, timeSpentSeconds: 120 },
          headers: {
            'Cookie': `session=${authCookie}`,
            'Content-Type': 'application/json'
          }
        });

        // Complete first two lessons
        if (lessonId !== 'lesson-c') {
          await request.post(`/api/lessons/${lessonId}/complete`, {
            data: { courseId: TEST_COURSE_ID, score: 90 },
            headers: {
              'Cookie': `session=${authCookie}`,
              'Content-Type': 'application/json'
            }
          });
        }
      }

      // Get course progress
      const response = await request.get(`/api/courses/${TEST_COURSE_ID}/progress`, {
        headers: { 'Cookie': `session=${authCookie}` }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.courseId).toBe(TEST_COURSE_ID);
      expect(data.data.lessonProgress).toHaveLength(3);

      // Check statistics
      const stats = data.data.statistics;
      expect(stats.totalLessons).toBe(3);
      expect(stats.completedLessons).toBe(2);
      expect(stats.completionRate).toBe(67); // 2/3 rounded
      expect(stats.totalTimeSpentSeconds).toBe(360); // 3 lessons × 120 seconds
      expect(stats.averageScore).toBe(90);
      expect(stats.currentLesson).toBeDefined();
      expect(stats.currentLesson.lessonId).toBe('lesson-c'); // Incomplete lesson
    });

    test('should return empty progress for course with no lessons started', async ({ request }) => {
      const response = await request.get(`/api/courses/${TEST_COURSE_ID}/progress`, {
        headers: { 'Cookie': `session=${authCookie}` }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.statistics.totalLessons).toBeGreaterThanOrEqual(0);
      expect(data.data.statistics.completedLessons).toBe(0);
      expect(data.data.statistics.currentLesson).toBeNull();
    });

    test('should require authentication', async ({ request }) => {
      const response = await request.get(`/api/courses/${TEST_COURSE_ID}/progress`);

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });
  });
});