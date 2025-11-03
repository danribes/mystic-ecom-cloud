/**
 * Course API Endpoints Tests
 * 
 * Tests for GET /api/courses, POST /api/courses, GET /api/courses/:id,
 * PUT /api/courses/:id, DELETE /api/courses/:id, GET /api/courses/slug/:slug,
 * and GET /api/courses/featured
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as getCourses, POST as createCourse } from '@/pages/api/courses/index';
import { GET as getCourseById, PUT as updateCourse, DELETE as deleteCourse } from '@/pages/api/courses/[id]';
import { GET as getCourseBySlug } from '@/pages/api/courses/slug/[slug]';
import { GET as getFeaturedCourses } from '@/pages/api/courses/featured';
import * as courseService from '@/services/course.service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { Course } from '@/types';

// ==================== Mock Data ====================

const mockCourse: Course = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Introduction to Meditation',
  slug: 'introduction-to-meditation',
  description: 'Learn the basics of meditation',
  longDescription: 'A comprehensive course on meditation techniques',
  instructorId: '123e4567-e89b-12d3-a456-426614174001',
  instructorName: 'John Doe',
  instructorAvatar: 'https://example.com/avatar.jpg',
  price: 4999,
  duration: 3600,
  level: 'beginner',
  category: 'Meditation',
  imageUrl: 'https://example.com/image.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  previewVideoUrl: 'https://example.com/preview.mp4',
  tags: ['meditation', 'mindfulness'],
  learningOutcomes: ['Learn basic techniques'],
  prerequisites: [],
  curriculum: [
    {
      title: 'Introduction',
      description: 'Getting started',
      order: 1,
      lessons: [
        {
          title: 'Welcome',
          duration: 300,
          type: 'video',
          videoUrl: 'https://example.com/lesson1.mp4',
          order: 1,
        },
      ],
    },
  ],
  enrollmentCount: 150,
  avgRating: 4.5,
  reviewCount: 30,
  isPublished: true,
  isFeatured: false,
  publishedAt: new Date('2025-01-01'),
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2025-01-15'),
};

// Helper to serialize course for comparison (dates become strings)
const mockCourseJSON = JSON.parse(JSON.stringify(mockCourse));

const mockPaginatedCourses = {
  courses: [mockCourse],
  total: 1,
  page: 1,
  limit: 12,
  totalPages: 1,
};

// ==================== Helper Functions ====================

function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}): Request {
  const url = options.url || 'http://localhost:4321/api/courses';
  const headers = new Headers(options.headers || {});
  
  const init: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
    headers.set('Content-Type', 'application/json');
  }

  return new Request(url, init);
}

function createMockUrl(searchParams: Record<string, string> = {}): URL {
  const url = new URL('http://localhost:4321/api/courses');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

async function parseResponse(response: Response) {
  return JSON.parse(await response.text());
}

// ==================== Tests ====================

describe('Course API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== GET /api/courses ====================

  describe('GET /api/courses', () => {
    it('should list courses successfully', async () => {
      vi.spyOn(courseService, 'listCourses').mockResolvedValue(mockPaginatedCourses);

      const request = createMockRequest();
      const url = createMockUrl();
      const response = await getCourses({ request, url } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.courses).toHaveLength(1);
      expect(data.data.total).toBe(1);
      expect(courseService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        isPublished: true,
      });
    });

    it('should filter by category', async () => {
      vi.spyOn(courseService, 'listCourses').mockResolvedValue(mockPaginatedCourses);

      const request = createMockRequest();
      const url = createMockUrl({ category: 'Meditation' });
      const response = await getCourses({ request, url } as any);

      expect(response.status).toBe(200);
      expect(courseService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        category: 'Meditation',
        isPublished: true,
      });
    });

    it('should filter by level', async () => {
      vi.spyOn(courseService, 'listCourses').mockResolvedValue(mockPaginatedCourses);

      const request = createMockRequest();
      const url = createMockUrl({ level: 'beginner' });
      const response = await getCourses({ request, url } as any);

      expect(response.status).toBe(200);
      expect(courseService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        level: 'beginner',
        isPublished: true,
      });
    });

    it('should handle search query', async () => {
      vi.spyOn(courseService, 'listCourses').mockResolvedValue(mockPaginatedCourses);

      const request = createMockRequest();
      const url = createMockUrl({ search: 'meditation' });
      const response = await getCourses({ request, url } as any);

      expect(response.status).toBe(200);
      expect(courseService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        search: 'meditation',
        isPublished: true,
      });
    });

    it('should handle pagination parameters', async () => {
      vi.spyOn(courseService, 'listCourses').mockResolvedValue(mockPaginatedCourses);

      const request = createMockRequest();
      const url = createMockUrl({ page: '2', limit: '24' });
      const response = await getCourses({ request, url } as any);

      expect(response.status).toBe(200);
      expect(courseService.listCourses).toHaveBeenCalledWith({
        page: 2,
        limit: 24,
        isPublished: true,
      });
    });

    it('should handle price filters', async () => {
      vi.spyOn(courseService, 'listCourses').mockResolvedValue(mockPaginatedCourses);

      const request = createMockRequest();
      const url = createMockUrl({ minPrice: '1000', maxPrice: '5000' });
      const response = await getCourses({ request, url } as any);

      expect(response.status).toBe(200);
      expect(courseService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        minPrice: 1000,
        maxPrice: 5000,
        isPublished: true,
      });
    });

    it('should handle tags filter', async () => {
      vi.spyOn(courseService, 'listCourses').mockResolvedValue(mockPaginatedCourses);

      const request = createMockRequest();
      const url = createMockUrl({ tags: 'meditation,mindfulness' });
      const response = await getCourses({ request, url } as any);

      expect(response.status).toBe(200);
      expect(courseService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        tags: ['meditation', 'mindfulness'],
        isPublished: true,
      });
    });

    it('should handle featured filter', async () => {
      vi.spyOn(courseService, 'listCourses').mockResolvedValue(mockPaginatedCourses);

      const request = createMockRequest();
      const url = createMockUrl({ isFeatured: 'true' });
      const response = await getCourses({ request, url } as any);

      expect(response.status).toBe(200);
      expect(courseService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        isFeatured: true,
        isPublished: true,
      });
    });

    it('should handle sorting parameters', async () => {
      vi.spyOn(courseService, 'listCourses').mockResolvedValue(mockPaginatedCourses);

      const request = createMockRequest();
      const url = createMockUrl({ sortBy: 'price', sortOrder: 'DESC' });
      const response = await getCourses({ request, url } as any);

      expect(response.status).toBe(200);
      expect(courseService.listCourses).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        sortBy: 'price',
        sortOrder: 'DESC',
        isPublished: true,
      });
    });

    it('should return 400 for invalid query parameters', async () => {
      const request = createMockRequest();
      const url = createMockUrl({ level: 'invalid-level' });
      const response = await getCourses({ request, url } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
      expect(data.details).toBeDefined();
    });

    it('should handle service errors', async () => {
      vi.spyOn(courseService, 'listCourses').mockRejectedValue(new Error('Database error'));

      const request = createMockRequest();
      const url = createMockUrl();
      const response = await getCourses({ request, url } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch courses');
    });
  });

  // ==================== POST /api/courses ====================

  describe('POST /api/courses', () => {
    const validCourseInput = {
      title: 'New Course',
      slug: 'new-course',
      description: 'A new course description',
      instructorId: '123e4567-e89b-12d3-a456-426614174001',
      price: 4999,
      duration: 3600,
      level: 'beginner' as const,
      category: 'Meditation',
    };

    it('should create course successfully with authentication', async () => {
      vi.spyOn(courseService, 'createCourse').mockResolvedValue(mockCourse);

      const request = createMockRequest({
        method: 'POST',
        headers: { Authorization: 'Bearer token123' },
        body: validCourseInput,
      });
      const response = await createCourse({ request } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockCourse.id);
      expect(data.data.title).toBe(mockCourse.title);
    });

    it('should return 401 without authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: validCourseInput,
      });
      const response = await createCourse({ request } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should validate required fields', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { Authorization: 'Bearer token123' },
        body: { title: 'Too short' },
      });
      const response = await createCourse({ request } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid course data');
      expect(data.details).toBeDefined();
    });

    it('should handle validation errors from service', async () => {
      vi.spyOn(courseService, 'createCourse').mockRejectedValue(
        new ValidationError('Slug already exists')
      );

      const request = createMockRequest({
        method: 'POST',
        headers: { Authorization: 'Bearer token123' },
        body: validCourseInput,
      });
      const response = await createCourse({ request } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Slug already exists');
    });
  });

  // ==================== GET /api/courses/:id ====================

  describe('GET /api/courses/:id', () => {
    it('should get course by ID successfully', async () => {
      vi.spyOn(courseService, 'getCourseById').mockResolvedValue(mockCourse);

      const response = await getCourseById({
        params: { id: mockCourse.id },
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockCourse.id);
      expect(data.data.title).toBe(mockCourse.title);
    });

    it('should return 400 if ID is missing', async () => {
      const response = await getCourseById({
        params: {},
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Course ID is required');
    });

    it('should return 404 if course not found', async () => {
      vi.spyOn(courseService, 'getCourseById').mockRejectedValue(
        new NotFoundError('Course')
      );

      const response = await getCourseById({
        params: { id: 'non-existent-id' },
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Course not found');
    });
  });

  // ==================== PUT /api/courses/:id ====================

  describe('PUT /api/courses/:id', () => {
    const updateData = {
      title: 'Updated Course Title',
      price: 5999,
    };

    it('should update course successfully with authentication', async () => {
      vi.spyOn(courseService, 'updateCourse').mockResolvedValue({
        ...mockCourse,
        ...updateData,
      });

      const request = createMockRequest({
        method: 'PUT',
        headers: { Authorization: 'Bearer token123' },
        body: updateData,
      });
      const response = await updateCourse({
        params: { id: mockCourse.id },
        request,
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe('Updated Course Title');
    });

    it('should return 401 without authentication', async () => {
      const request = createMockRequest({
        method: 'PUT',
        body: updateData,
      });
      const response = await updateCourse({
        params: { id: mockCourse.id },
        request,
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 if course not found', async () => {
      vi.spyOn(courseService, 'updateCourse').mockRejectedValue(
        new NotFoundError('Course')
      );

      const request = createMockRequest({
        method: 'PUT',
        headers: { Authorization: 'Bearer token123' },
        body: updateData,
      });
      const response = await updateCourse({
        params: { id: 'non-existent-id' },
        request,
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Course not found');
    });
  });

  // ==================== DELETE /api/courses/:id ====================

  describe('DELETE /api/courses/:id', () => {
    it('should delete course successfully with authentication', async () => {
      vi.spyOn(courseService, 'deleteCourse').mockResolvedValue(undefined);

      const request = createMockRequest({
        method: 'DELETE',
        headers: { Authorization: 'Bearer token123' },
      });
      const response = await deleteCourse({
        params: { id: mockCourse.id },
        request,
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Course deleted successfully');
    });

    it('should return 401 without authentication', async () => {
      const request = createMockRequest({ method: 'DELETE' });
      const response = await deleteCourse({
        params: { id: mockCourse.id },
        request,
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 if course not found', async () => {
      vi.spyOn(courseService, 'deleteCourse').mockRejectedValue(
        new NotFoundError('Course')
      );

      const request = createMockRequest({
        method: 'DELETE',
        headers: { Authorization: 'Bearer token123' },
      });
      const response = await deleteCourse({
        params: { id: 'non-existent-id' },
        request,
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Course not found');
    });
  });

  // ==================== GET /api/courses/slug/:slug ====================

  describe('GET /api/courses/slug/:slug', () => {
    it('should get course by slug successfully', async () => {
      vi.spyOn(courseService, 'getCourseBySlug').mockResolvedValue(mockCourse);

      const response = await getCourseBySlug({
        params: { slug: 'introduction-to-meditation' },
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockCourse.id);
      expect(data.data.slug).toBe(mockCourse.slug);
    });

    it('should return 400 if slug is missing', async () => {
      const response = await getCourseBySlug({
        params: {},
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Course slug is required');
    });

    it('should return 404 if course not found', async () => {
      vi.spyOn(courseService, 'getCourseBySlug').mockRejectedValue(
        new NotFoundError('Course')
      );

      const response = await getCourseBySlug({
        params: { slug: 'non-existent-slug' },
      } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(404);
      expect(data.error).toBe('Course not found');
    });
  });

  // ==================== GET /api/courses/featured ====================

  describe('GET /api/courses/featured', () => {
    it('should get featured courses with default limit', async () => {
      vi.spyOn(courseService, 'getFeaturedCourses').mockResolvedValue([mockCourse]);

      const url = createMockUrl();
      const response = await getFeaturedCourses({ url } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].id).toBe(mockCourse.id);
      expect(courseService.getFeaturedCourses).toHaveBeenCalledWith(6);
    });

    it('should respect custom limit parameter', async () => {
      vi.spyOn(courseService, 'getFeaturedCourses').mockResolvedValue([mockCourse]);

      const url = createMockUrl({ limit: '10' });
      const response = await getFeaturedCourses({ url } as any);

      expect(response.status).toBe(200);
      expect(courseService.getFeaturedCourses).toHaveBeenCalledWith(10);
    });

    it('should return 400 for invalid limit', async () => {
      const url = createMockUrl({ limit: '100' });
      const response = await getFeaturedCourses({ url } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid limit parameter');
    });

    it('should handle service errors', async () => {
      vi.spyOn(courseService, 'getFeaturedCourses').mockRejectedValue(
        new Error('Database error')
      );

      const url = createMockUrl();
      const response = await getFeaturedCourses({ url } as any);
      const data = await parseResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch featured courses');
    });
  });
});
