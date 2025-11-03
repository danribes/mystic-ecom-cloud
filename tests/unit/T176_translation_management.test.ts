/**
 * T176: Translation Management Tests
 * Tests for admin translation management functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '../../src/lib/db';
import {
  getTranslationStatistics,
  getCourseTranslations,
  getEventTranslations,
  getProductTranslations,
  updateCourseTranslation,
  updateEventTranslation,
  updateProductTranslation,
  isTranslationComplete,
  calculateCompletionPercentage,
} from '@/lib/translationManager';

describe('T176: Translation Management', () => {
  let testCourseId: string;
  let testEventId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Create test course
    const courseResult = await pool.query(
      `INSERT INTO courses (title, description, slug, price, duration_hours, level)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['Test Course', 'Test Description', 'test-course', 99.99, 40, 'beginner']
    );
    testCourseId = courseResult.rows[0].id;

    // Create test event
    const eventResult = await pool.query(
      `INSERT INTO events (title, description, slug, price, event_date, duration_hours, venue_name, venue_address, venue_city, venue_country, capacity, available_spots)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      ['Test Event', 'Test Event Description', 'test-event', 49.99, new Date('2025-06-01'), 2, 'Test Venue', '123 Test St', 'Test City', 'Test Country', 50, 50]
    );
    testEventId = eventResult.rows[0].id;

    // Create test product
    const productResult = await pool.query(
      `INSERT INTO digital_products (title, description, slug, price, product_type, file_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      ['Test Product', 'Test Product Description', 'test-product', 29.99, 'ebook', '/files/test.pdf']
    );
    testProductId = productResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testCourseId) {
      await pool.query('DELETE FROM courses WHERE id = $1', [testCourseId]);
    }
    if (testEventId) {
      await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
    }
    if (testProductId) {
      await pool.query('DELETE FROM digital_products WHERE id = $1', [testProductId]);
    }
  });

  describe('getTranslationStatistics', () => {
    it('should return translation statistics', async () => {
      const stats = await getTranslationStatistics();

      expect(stats).toHaveProperty('totalCourses');
      expect(stats).toHaveProperty('translatedCourses');
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('translatedEvents');
      expect(stats).toHaveProperty('totalProducts');
      expect(stats).toHaveProperty('translatedProducts');
      expect(stats).toHaveProperty('overallCompletion');

      expect(typeof stats.totalCourses).toBe('number');
      expect(typeof stats.translatedCourses).toBe('number');
      expect(typeof stats.overallCompletion).toBe('number');
      expect(stats.overallCompletion).toBeGreaterThanOrEqual(0);
      expect(stats.overallCompletion).toBeLessThanOrEqual(100);
    });

    it('should count translated courses correctly', async () => {
      const stats = await getTranslationStatistics();
      expect(stats.translatedCourses).toBeLessThanOrEqual(stats.totalCourses);
    });

    it('should count translated events correctly', async () => {
      const stats = await getTranslationStatistics();
      expect(stats.translatedEvents).toBeLessThanOrEqual(stats.totalEvents);
    });

    it('should count translated products correctly', async () => {
      const stats = await getTranslationStatistics();
      expect(stats.translatedProducts).toBeLessThanOrEqual(stats.totalProducts);
    });
  });

  describe('getCourseTranslations', () => {
    it('should return list of courses with translation status', async () => {
      const courses = await getCourseTranslations();

      expect(Array.isArray(courses)).toBe(true);
      if (courses.length > 0) {
        expect(courses[0]).toHaveProperty('id');
        expect(courses[0]).toHaveProperty('title');
        expect(courses[0]).toHaveProperty('titleEs');
        expect(courses[0]).toHaveProperty('description');
        expect(courses[0]).toHaveProperty('descriptionEs');
        expect(courses[0]).toHaveProperty('slug');
      }
    });

    it('should include test course', async () => {
      const courses = await getCourseTranslations();
      const testCourse = courses.find(c => c.id === testCourseId);

      expect(testCourse).toBeDefined();
      expect(testCourse?.title).toBe('Test Course');
      expect(testCourse?.description).toBe('Test Description');
    });
  });

  describe('getEventTranslations', () => {
    it('should return list of events with translation status', async () => {
      const events = await getEventTranslations();

      expect(Array.isArray(events)).toBe(true);
      if (events.length > 0) {
        expect(events[0]).toHaveProperty('id');
        expect(events[0]).toHaveProperty('title');
        expect(events[0]).toHaveProperty('titleEs');
        expect(events[0]).toHaveProperty('description');
        expect(events[0]).toHaveProperty('descriptionEs');
      }
    });

    it('should include test event', async () => {
      const events = await getEventTranslations();
      const testEvent = events.find(e => e.id === testEventId);

      expect(testEvent).toBeDefined();
      expect(testEvent?.title).toBe('Test Event');
    });
  });

  describe('getProductTranslations', () => {
    it('should return list of products with translation status', async () => {
      const products = await getProductTranslations();

      expect(Array.isArray(products)).toBe(true);
      if (products.length > 0) {
        expect(products[0]).toHaveProperty('id');
        expect(products[0]).toHaveProperty('title');
        expect(products[0]).toHaveProperty('titleEs');
        expect(products[0]).toHaveProperty('description');
        expect(products[0]).toHaveProperty('descriptionEs');
      }
    });

    it('should include test product', async () => {
      const products = await getProductTranslations();
      const testProduct = products.find(p => p.id === testProductId);

      expect(testProduct).toBeDefined();
      expect(testProduct?.title).toBe('Test Product');
    });
  });

  describe('updateCourseTranslation', () => {
    it('should update course Spanish translation', async () => {
      const result = await updateCourseTranslation(
        testCourseId,
        'Curso de Prueba',
        'Descripción de Prueba'
      );

      expect(result.success).toBe(true);

      // Verify update
      const courses = await getCourseTranslations();
      const course = courses.find(c => c.id === testCourseId);
      expect(course?.titleEs).toBe('Curso de Prueba');
      expect(course?.descriptionEs).toBe('Descripción de Prueba');
    });

    it('should fail for non-existent course', async () => {
      const result = await updateCourseTranslation(
        '00000000-0000-0000-0000-000000000000',
        'Test',
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });

    it('should handle multiple updates', async () => {
      await updateCourseTranslation(testCourseId, 'First Update', 'First Description');
      await updateCourseTranslation(testCourseId, 'Second Update', 'Second Description');

      const courses = await getCourseTranslations();
      const course = courses.find(c => c.id === testCourseId);
      expect(course?.titleEs).toBe('Second Update');
      expect(course?.descriptionEs).toBe('Second Description');
    });
  });

  describe('updateEventTranslation', () => {
    it('should update event Spanish translation', async () => {
      const result = await updateEventTranslation(
        testEventId,
        'Evento de Prueba',
        'Descripción del Evento de Prueba'
      );

      expect(result.success).toBe(true);

      // Verify update
      const events = await getEventTranslations();
      const event = events.find(e => e.id === testEventId);
      expect(event?.titleEs).toBe('Evento de Prueba');
      expect(event?.descriptionEs).toBe('Descripción del Evento de Prueba');
    });

    it('should fail for non-existent event', async () => {
      const result = await updateEventTranslation(
        '00000000-0000-0000-0000-000000000000',
        'Test',
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Event not found');
    });
  });

  describe('updateProductTranslation', () => {
    it('should update product Spanish translation', async () => {
      const result = await updateProductTranslation(
        testProductId,
        'Producto de Prueba',
        'Descripción del Producto de Prueba'
      );

      expect(result.success).toBe(true);

      // Verify update
      const products = await getProductTranslations();
      const product = products.find(p => p.id === testProductId);
      expect(product?.titleEs).toBe('Producto de Prueba');
      expect(product?.descriptionEs).toBe('Descripción del Producto de Prueba');
    });

    it('should fail for non-existent product', async () => {
      const result = await updateProductTranslation(
        '00000000-0000-0000-0000-000000000000',
        'Test',
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
    });
  });

  describe('isTranslationComplete', () => {
    it('should return true when both fields are filled', () => {
      expect(isTranslationComplete('Spanish Title', 'Spanish Description')).toBe(true);
    });

    it('should return false when title is null', () => {
      expect(isTranslationComplete(null, 'Spanish Description')).toBe(false);
    });

    it('should return false when description is null', () => {
      expect(isTranslationComplete('Spanish Title', null)).toBe(false);
    });

    it('should return false when both are null', () => {
      expect(isTranslationComplete(null, null)).toBe(false);
    });

    it('should return false when title is empty string', () => {
      expect(isTranslationComplete('', 'Spanish Description')).toBe(false);
    });

    it('should return false when description is empty string', () => {
      expect(isTranslationComplete('Spanish Title', '')).toBe(false);
    });

    it('should return false when title is whitespace only', () => {
      expect(isTranslationComplete('   ', 'Spanish Description')).toBe(false);
    });

    it('should return false when description is whitespace only', () => {
      expect(isTranslationComplete('Spanish Title', '   ')).toBe(false);
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('should return 100% when both fields are filled', () => {
      expect(calculateCompletionPercentage('Spanish Title', 'Spanish Description')).toBe(100);
    });

    it('should return 50% when only title is filled', () => {
      expect(calculateCompletionPercentage('Spanish Title', null)).toBe(50);
    });

    it('should return 50% when only description is filled', () => {
      expect(calculateCompletionPercentage(null, 'Spanish Description')).toBe(50);
    });

    it('should return 0% when both fields are null', () => {
      expect(calculateCompletionPercentage(null, null)).toBe(0);
    });

    it('should return 0% when both fields are empty', () => {
      expect(calculateCompletionPercentage('', '')).toBe(0);
    });

    it('should return 0% when both fields are whitespace', () => {
      expect(calculateCompletionPercentage('   ', '   ')).toBe(0);
    });

    it('should handle mixed completion', () => {
      expect(calculateCompletionPercentage('Title', '')).toBe(50);
      expect(calculateCompletionPercentage('', 'Description')).toBe(50);
      expect(calculateCompletionPercentage('Title', '   ')).toBe(50);
    });
  });

  describe('Translation Workflow Integration', () => {
    it('should reflect updates in statistics', async () => {
      // Get initial stats
      const initialStats = await getTranslationStatistics();

      // Add translation to test course
      await updateCourseTranslation(
        testCourseId,
        'Curso de Prueba Integración',
        'Descripción de Prueba Integración'
      );

      // Get updated stats
      const updatedStats = await getTranslationStatistics();

      // Should have at least one translated course
      expect(updatedStats.translatedCourses).toBeGreaterThanOrEqual(1);
    });

    it('should maintain translation after retrieval', async () => {
      // Set translation
      await updateCourseTranslation(testCourseId, 'Consistent Title', 'Consistent Description');

      // Retrieve multiple times
      const courses1 = await getCourseTranslations();
      const courses2 = await getCourseTranslations();

      const course1 = courses1.find(c => c.id === testCourseId);
      const course2 = courses2.find(c => c.id === testCourseId);

      expect(course1?.titleEs).toBe(course2?.titleEs);
      expect(course1?.descriptionEs).toBe(course2?.descriptionEs);
    });
  });

  describe('Edge Cases', () => {
    it('should handle long Spanish text', async () => {
      const longTitle = 'A'.repeat(255);
      const longDescription = 'B'.repeat(1000);

      const result = await updateCourseTranslation(
        testCourseId,
        longTitle,
        longDescription
      );

      expect(result.success).toBe(true);

      const courses = await getCourseTranslations();
      const course = courses.find(c => c.id === testCourseId);
      expect(course?.titleEs).toBe(longTitle);
      expect(course?.descriptionEs).toBe(longDescription);
    });

    it('should handle special characters', async () => {
      const titleWithSpecial = 'Título con ñ, á, é, í, ó, ú, ü';
      const descriptionWithSpecial = 'Descripción con ¿caracteres? ¡especiales!';

      const result = await updateCourseTranslation(
        testCourseId,
        titleWithSpecial,
        descriptionWithSpecial
      );

      expect(result.success).toBe(true);

      const courses = await getCourseTranslations();
      const course = courses.find(c => c.id === testCourseId);
      expect(course?.titleEs).toBe(titleWithSpecial);
      expect(course?.descriptionEs).toBe(descriptionWithSpecial);
    });

    it('should handle line breaks in description', async () => {
      const descriptionWithBreaks = 'Line 1\nLine 2\nLine 3';

      const result = await updateCourseTranslation(
        testCourseId,
        'Test Title',
        descriptionWithBreaks
      );

      expect(result.success).toBe(true);

      const courses = await getCourseTranslations();
      const course = courses.find(c => c.id === testCourseId);
      expect(course?.descriptionEs).toBe(descriptionWithBreaks);
    });
  });
});
