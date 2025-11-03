/**
 * T167: Multilingual Database Schema Tests
 *
 * Tests for multilingual content support in database schema and TypeScript types.
 * Verifies that Spanish language fields are correctly added to courses, events, and products.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../../src/lib/db';
import {
  getLocalizedField,
  getCourseTitle,
  getCourseDescription,
  getCourseLongDescription,
  getCourseLearningOutcomes,
  getCoursePrerequisites,
  getLocalizedCourse,
  getLocalizedEvent,
  getLocalizedProduct,
  getSQLColumn,
  getSQLCoalesce,
} from '../../src/lib/i18nContent';
import type { Course, Event, DigitalProduct } from '../../src/types';

describe('T167: Multilingual Database Schema', () => {
  describe('Database Schema Verification', () => {
    it('should have Spanish columns in courses table', async () => {
      const result = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'courses'
          AND column_name LIKE '%_es%'
        ORDER BY column_name;
      `);

      const columns = result.rows.map(row => row.column_name);

      expect(columns).toContain('title_es');
      expect(columns).toContain('description_es');
      expect(columns).toContain('long_description_es');
      expect(columns).toContain('learning_outcomes_es');
      expect(columns).toContain('prerequisites_es');
      expect(columns).toContain('curriculum_es');
    });

    it('should have Spanish columns in events table', async () => {
      const result = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'events'
          AND column_name LIKE '%_es%'
        ORDER BY column_name;
      `);

      const columns = result.rows.map(row => row.column_name);

      expect(columns).toContain('title_es');
      expect(columns).toContain('description_es');
      expect(columns).toContain('long_description_es');
      expect(columns).toContain('venue_name_es');
      expect(columns).toContain('venue_address_es');
    });

    it('should have Spanish columns in digital_products table', async () => {
      const result = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'digital_products'
          AND column_name LIKE '%_es%'
        ORDER BY column_name;
      `);

      const columns = result.rows.map(row => row.column_name);

      expect(columns).toContain('title_es');
      expect(columns).toContain('description_es');
      expect(columns).toContain('long_description_es');
    });

    it('should allow NULL values for Spanish columns in courses', async () => {
      const result = await pool.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'courses'
          AND column_name IN ('title_es', 'description_es', 'curriculum_es')
        ORDER BY column_name;
      `);

      result.rows.forEach(row => {
        expect(row.is_nullable).toBe('YES');
      });
    });

    it('should have correct data types for Spanish columns', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'courses'
          AND column_name IN ('title_es', 'description_es', 'learning_outcomes_es', 'curriculum_es')
        ORDER BY column_name;
      `);

      const dataTypes: Record<string, string> = {};
      result.rows.forEach(row => {
        dataTypes[row.column_name] = row.data_type;
      });

      expect(dataTypes.title_es).toBe('character varying');
      expect(dataTypes.description_es).toBe('text');
      expect(dataTypes.learning_outcomes_es).toBe('ARRAY');
      expect(dataTypes.curriculum_es).toBe('jsonb');
    });
  });

  describe('I18n Content Helper Functions', () => {
    describe('getLocalizedField', () => {
      it('should return English field for en locale', () => {
        const entity = {
          title: 'Meditation Course',
          titleEs: 'Curso de Meditación'
        };

        const result = getLocalizedField(entity, 'title', 'en');
        expect(result).toBe('Meditation Course');
      });

      it('should return Spanish field for es locale', () => {
        const entity = {
          title: 'Meditation Course',
          titleEs: 'Curso de Meditación'
        };

        const result = getLocalizedField(entity, 'title', 'es');
        expect(result).toBe('Curso de Meditación');
      });

      it('should fall back to English if Spanish field is null', () => {
        const entity = {
          title: 'Meditation Course',
          titleEs: null
        };

        const result = getLocalizedField(entity, 'title', 'es');
        expect(result).toBe('Meditation Course');
      });

      it('should fall back to English if Spanish field is empty string', () => {
        const entity = {
          title: 'Meditation Course',
          titleEs: ''
        };

        const result = getLocalizedField(entity, 'title', 'es');
        expect(result).toBe('Meditation Course');
      });

      it('should fall back to English if Spanish field is undefined', () => {
        const entity = {
          title: 'Meditation Course'
        };

        const result = getLocalizedField(entity, 'title', 'es');
        expect(result).toBe('Meditation Course');
      });
    });

    describe('Course-specific helpers', () => {
      const mockCourse: Partial<Course> = {
        title: 'Advanced Meditation',
        titleEs: 'Meditación Avanzada',
        description: 'Learn advanced techniques',
        descriptionEs: 'Aprende técnicas avanzadas',
        longDescription: 'A comprehensive guide to meditation',
        longDescriptionEs: 'Una guía completa de meditación',
        learningOutcomes: ['Master breathing', 'Find inner peace'],
        learningOutcomesEs: ['Dominar la respiración', 'Encontrar paz interior'],
        prerequisites: ['Basic meditation'],
        prerequisitesEs: ['Meditación básica'],
        curriculum: [{ title: 'Introduction', order: 1 }],
        curriculumEs: [{ title: 'Introducción', order: 1 }],
      };

      it('should get localized course title', () => {
        expect(getCourseTitle(mockCourse, 'en')).toBe('Advanced Meditation');
        expect(getCourseTitle(mockCourse, 'es')).toBe('Meditación Avanzada');
      });

      it('should get localized course description', () => {
        expect(getCourseDescription(mockCourse, 'en')).toBe('Learn advanced techniques');
        expect(getCourseDescription(mockCourse, 'es')).toBe('Aprende técnicas avanzadas');
      });

      it('should get localized course long description', () => {
        expect(getCourseLongDescription(mockCourse, 'en')).toBe('A comprehensive guide to meditation');
        expect(getCourseLongDescription(mockCourse, 'es')).toBe('Una guía completa de meditación');
      });

      it('should get localized learning outcomes', () => {
        const enOutcomes = getCourseLearningOutcomes(mockCourse, 'en');
        expect(enOutcomes).toEqual(['Master breathing', 'Find inner peace']);

        const esOutcomes = getCourseLearningOutcomes(mockCourse, 'es');
        expect(esOutcomes).toEqual(['Dominar la respiración', 'Encontrar paz interior']);
      });

      it('should get localized prerequisites', () => {
        const enPrereqs = getCoursePrerequisites(mockCourse, 'en');
        expect(enPrereqs).toEqual(['Basic meditation']);

        const esPrereqs = getCoursePrerequisites(mockCourse, 'es');
        expect(esPrereqs).toEqual(['Meditación básica']);
      });

      it('should get fully localized course object', () => {
        const localizedCourse = getLocalizedCourse(mockCourse as Course, 'es');

        expect(localizedCourse.title).toBe('Meditación Avanzada');
        expect(localizedCourse.description).toBe('Aprende técnicas avanzadas');
        expect(localizedCourse.longDescription).toBe('Una guía completa de meditación');
        expect(localizedCourse.learningOutcomes).toEqual(['Dominar la respiración', 'Encontrar paz interior']);
        expect(localizedCourse.prerequisites).toEqual(['Meditación básica']);
      });

      it('should return same object for English locale', () => {
        const originalCourse = mockCourse as Course;
        const localizedCourse = getLocalizedCourse(originalCourse, 'en');

        expect(localizedCourse).toBe(originalCourse);
      });
    });

    describe('Event-specific helpers', () => {
      const mockEvent: Partial<Event> = {
        title: 'Meditation Retreat',
        titleEs: 'Retiro de Meditación',
        description: 'Weekend retreat',
        descriptionEs: 'Retiro de fin de semana',
        longDescription: 'A transformative weekend experience',
        longDescriptionEs: 'Una experiencia transformadora de fin de semana',
      };

      it('should get fully localized event object', () => {
        const localizedEvent = getLocalizedEvent(mockEvent as Event, 'es');

        expect(localizedEvent.title).toBe('Retiro de Meditación');
        expect(localizedEvent.description).toBe('Retiro de fin de semana');
        expect(localizedEvent.longDescription).toBe('Una experiencia transformadora de fin de semana');
      });
    });

    describe('Product-specific helpers', () => {
      const mockProduct: Partial<DigitalProduct> = {
        title: 'Meditation Guide PDF',
        titleEs: 'Guía de Meditación PDF',
        description: 'Comprehensive meditation guide',
        descriptionEs: 'Guía completa de meditación',
        longDescription: 'Everything you need to know about meditation',
        longDescriptionEs: 'Todo lo que necesitas saber sobre meditación',
      };

      it('should get fully localized product object', () => {
        const localizedProduct = getLocalizedProduct(mockProduct as DigitalProduct, 'es');

        expect(localizedProduct.title).toBe('Guía de Meditación PDF');
        expect(localizedProduct.description).toBe('Guía completa de meditación');
        expect(localizedProduct.longDescription).toBe('Todo lo que necesitas saber sobre meditación');
      });
    });

    describe('SQL Helper Functions', () => {
      it('should get correct SQL column name for English', () => {
        expect(getSQLColumn('title', 'en')).toBe('title');
        expect(getSQLColumn('description', 'en')).toBe('description');
      });

      it('should get correct SQL column name for Spanish', () => {
        expect(getSQLColumn('title', 'es')).toBe('title_es');
        expect(getSQLColumn('description', 'es')).toBe('description_es');
      });

      it('should convert camelCase to snake_case', () => {
        expect(getSQLColumn('longDescription', 'es')).toBe('long_description_es');
        expect(getSQLColumn('learningOutcomes', 'es')).toBe('learning_outcomes_es');
      });

      it('should generate COALESCE expression for English', () => {
        const result = getSQLCoalesce('title', 'en', 'title');
        expect(result).toBe('title AS title');
      });

      it('should generate COALESCE expression for Spanish', () => {
        const result = getSQLCoalesce('title', 'es', 'title');
        expect(result).toBe("COALESCE(NULLIF(title_es, ''), title) AS title");
      });

      it('should use column name as alias if not provided', () => {
        const result = getSQLCoalesce('description', 'es');
        expect(result).toBe("COALESCE(NULLIF(description_es, ''), description) AS description");
      });
    });
  });

  describe('Database Integration Tests', () => {
    let testCourseId: string;
    let testEventId: string;
    let testProductId: string;

    beforeAll(async () => {
      // Create test course with multilingual content
      const courseResult = await pool.query(`
        INSERT INTO courses (
          title, slug, description, price, is_published,
          title_es, description_es, long_description_es,
          learning_outcomes_es, prerequisites_es
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10
        )
        RETURNING id
      `, [
        'Test Meditation Course',
        'test-meditation-course-t167',
        'Learn to meditate',
        9999,
        true,
        'Curso de Meditación de Prueba',
        'Aprende a meditar',
        'Una descripción larga en español',
        ['Resultado 1', 'Resultado 2'],
        ['Prerrequisito 1']
      ]);

      testCourseId = courseResult.rows[0].id;

      // Create test event with multilingual content
      const eventResult = await pool.query(`
        INSERT INTO events (
          title, slug, description, price, event_date, duration_hours,
          venue_name, venue_address, venue_city, venue_country,
          capacity, available_spots, is_published,
          title_es, description_es, venue_name_es, venue_address_es
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17
        )
        RETURNING id
      `, [
        'Test Meditation Retreat',
        'test-retreat-t167',
        'Weekend retreat',
        19999,
        new Date('2025-12-01'),
        48,
        'Meditation Center',
        '123 Peace Street',
        'Barcelona',
        'Spain',
        50,
        50,
        true,
        'Retiro de Meditación de Prueba',
        'Retiro de fin de semana',
        'Centro de Meditación',
        'Calle de la Paz 123'
      ]);

      testEventId = eventResult.rows[0].id;

      // Create test product with multilingual content
      const productResult = await pool.query(`
        INSERT INTO digital_products (
          title, slug, description, price, product_type, file_url,
          is_published, title_es, description_es, long_description_es
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        RETURNING id
      `, [
        'Test Meditation Guide',
        'test-guide-t167',
        'PDF meditation guide',
        4999,
        'pdf',
        '/files/test.pdf',
        true,
        'Guía de Meditación de Prueba',
        'Guía de meditación en PDF',
        'Guía completa en español'
      ]);

      testProductId = productResult.rows[0].id;
    });

    afterAll(async () => {
      // Clean up test data
      await pool.query('DELETE FROM courses WHERE id = $1', [testCourseId]);
      await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
      await pool.query('DELETE FROM digital_products WHERE id = $1', [testProductId]);
    });

    it('should insert and retrieve Spanish course content', async () => {
      const result = await pool.query(`
        SELECT title, title_es, description, description_es,
               learning_outcomes_es, prerequisites_es
        FROM courses
        WHERE id = $1
      `, [testCourseId]);

      const course = result.rows[0];

      expect(course.title).toBe('Test Meditation Course');
      expect(course.title_es).toBe('Curso de Meditación de Prueba');
      expect(course.description).toBe('Learn to meditate');
      expect(course.description_es).toBe('Aprende a meditar');
      expect(course.learning_outcomes_es).toEqual(['Resultado 1', 'Resultado 2']);
      expect(course.prerequisites_es).toEqual(['Prerrequisito 1']);
    });

    it('should insert and retrieve Spanish event content', async () => {
      const result = await pool.query(`
        SELECT title, title_es, description, description_es,
               venue_name, venue_name_es, venue_address, venue_address_es
        FROM events
        WHERE id = $1
      `, [testEventId]);

      const event = result.rows[0];

      expect(event.title).toBe('Test Meditation Retreat');
      expect(event.title_es).toBe('Retiro de Meditación de Prueba');
      expect(event.venue_name).toBe('Meditation Center');
      expect(event.venue_name_es).toBe('Centro de Meditación');
    });

    it('should insert and retrieve Spanish product content', async () => {
      const result = await pool.query(`
        SELECT title, title_es, description, description_es,
               long_description_es
        FROM digital_products
        WHERE id = $1
      `, [testProductId]);

      const product = result.rows[0];

      expect(product.title).toBe('Test Meditation Guide');
      expect(product.title_es).toBe('Guía de Meditación de Prueba');
      expect(product.description).toBe('PDF meditation guide');
      expect(product.description_es).toBe('Guía de meditación en PDF');
      expect(product.long_description_es).toBe('Guía completa en español');
    });

    it('should use COALESCE to fall back to English when Spanish is NULL', async () => {
      // Create a course without Spanish translation
      const result = await pool.query(`
        INSERT INTO courses (title, slug, description, price, is_published)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        'English Only Course',
        'english-only-t167',
        'English description',
        5000,
        true
      ]);

      const courseId = result.rows[0].id;

      try {
        const queryResult = await pool.query(`
          SELECT
            COALESCE(NULLIF(title_es, ''), title) AS title,
            COALESCE(NULLIF(description_es, ''), description) AS description
          FROM courses
          WHERE id = $1
        `, [courseId]);

        const course = queryResult.rows[0];

        expect(course.title).toBe('English Only Course');
        expect(course.description).toBe('English description');
      } finally {
        await pool.query('DELETE FROM courses WHERE id = $1', [courseId]);
      }
    });
  });
});
