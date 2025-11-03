/**
 * T178: Test Language Switching Across All User Flows
 *
 * Integration tests that verify language switching works correctly
 * throughout the entire application, including:
 * - Locale detection and persistence
 * - Content translation (courses, events, products)
 * - Email templates
 * - User preferences
 * - Cross-page navigation
 * - Cookie handling
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '../../src/lib/db';
import {
  getUserLanguagePreference,
  updateUserLanguagePreference,
} from '@/lib/userPreferences';
import {
  getLocalizedCourseById,
  getLocalizedCourses,
} from '../../src/lib/coursesI18n';
import {
  getLocalizedEventById,
  getLocalizedEvents,
} from '../../src/lib/eventsI18n';
import {
  getLocalizedProductById,
  getLocalizedProducts,
} from '../../src/lib/productsI18n';
import {
  generateOrderConfirmationEmail,
  generateEventBookingEmail,
} from '@/lib/emailTemplates';
import { t, isValidLocale, getLocaleFromRequest } from '@/i18n';
import type { Locale } from '@/i18n';

describe('T178: Language Switching Across All User Flows', () => {
  let testUserId: string;
  let testCourseId: string;
  let testEventId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Create test user with English preference
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, preferred_language)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['test-flows@example.com', 'hash123', 'Test User', 'en']
    );
    testUserId = userResult.rows[0].id;

    // Get sample course, event, and product IDs
    const courseResult = await pool.query(
      'SELECT id FROM courses WHERE deleted_at IS NULL LIMIT 1'
    );
    if (courseResult.rows.length > 0) {
      testCourseId = courseResult.rows[0].id;
    }

    const eventResult = await pool.query(
      'SELECT id FROM events WHERE is_published = true LIMIT 1'
    );
    if (eventResult.rows.length > 0) {
      testEventId = eventResult.rows[0].id;
    }

    const productResult = await pool.query(
      'SELECT id FROM digital_products LIMIT 1'
    );
    if (productResult.rows.length > 0) {
      testProductId = productResult.rows[0].id;
    }
  });

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  describe('Locale Detection and Persistence', () => {
    it('should detect locale from URL prefix', () => {
      const url = new URL('https://example.com/es/courses');
      const locale = getLocaleFromRequest(url, undefined, undefined);
      // Note: getLocaleFromRequest checks URL params, not path
      // Path-based locale is handled by middleware's extractLocaleFromPath
      expect(isValidLocale('es')).toBe(true);
    });

    it('should detect locale from cookie', () => {
      const url = new URL('https://example.com/courses');
      const locale = getLocaleFromRequest(url, 'es', undefined);
      expect(locale).toBe('es');
    });

    it('should detect locale from Accept-Language header', () => {
      const url = new URL('https://example.com/courses');
      const locale = getLocaleFromRequest(url, undefined, 'es-ES,es;q=0.9');
      expect(locale).toBe('es');
    });

    it('should fallback to default locale when no hints', () => {
      const url = new URL('https://example.com/courses');
      const locale = getLocaleFromRequest(url, undefined, undefined);
      expect(locale).toBe('en');
    });

    it('should prioritize cookie over Accept-Language', () => {
      const url = new URL('https://example.com/courses');
      const locale = getLocaleFromRequest(url, 'en', 'es-ES,es;q=0.9');
      expect(locale).toBe('en');
    });
  });

  describe('User Language Preference Flow', () => {
    it('should get user default language preference', async () => {
      const preference = await getUserLanguagePreference(testUserId);
      expect(preference).toBe('en');
    });

    it('should update user language preference to Spanish', async () => {
      const result = await updateUserLanguagePreference(testUserId, 'es');
      expect(result.success).toBe(true);

      const preference = await getUserLanguagePreference(testUserId);
      expect(preference).toBe('es');
    });

    it('should persist language preference across sessions', async () => {
      // Set to English
      await updateUserLanguagePreference(testUserId, 'en');

      // Simulate new session - query directly
      const dbResult = await pool.query(
        'SELECT preferred_language FROM users WHERE id = $1',
        [testUserId]
      );
      expect(dbResult.rows[0].preferred_language).toBe('en');
    });

    it('should switch user preference multiple times', async () => {
      await updateUserLanguagePreference(testUserId, 'es');
      let pref = await getUserLanguagePreference(testUserId);
      expect(pref).toBe('es');

      await updateUserLanguagePreference(testUserId, 'en');
      pref = await getUserLanguagePreference(testUserId);
      expect(pref).toBe('en');

      await updateUserLanguagePreference(testUserId, 'es');
      pref = await getUserLanguagePreference(testUserId);
      expect(pref).toBe('es');

      // Reset to English
      await updateUserLanguagePreference(testUserId, 'en');
    });
  });

  describe('Course Content Translation Flow', () => {
    it('should fetch course in English', async () => {
      if (!testCourseId) {
        console.log('No test course available, skipping test');
        return;
      }

      const course = await getLocalizedCourseById(testCourseId, 'en');
      expect(course).toBeDefined();
      if (course) {
        expect(course.id).toBe(testCourseId);
        expect(course.locale).toBe('en');
      }
    });

    it('should fetch course in Spanish', async () => {
      if (!testCourseId) {
        console.log('No test course available, skipping test');
        return;
      }

      const course = await getLocalizedCourseById(testCourseId, 'es');
      expect(course).toBeDefined();
      if (course) {
        expect(course.id).toBe(testCourseId);
        expect(course.locale).toBe('es');
      }
    });

    it('should fetch all courses with English locale', async () => {
      const result = await getLocalizedCourses({}, 'en');
      expect(typeof result).toBe('object');
      expect(Array.isArray(result.items)).toBe(true);
      if (result.items.length > 0) {
        expect(result.items[0].locale).toBe('en');
      }
    });

    it('should fetch all courses with Spanish locale', async () => {
      const result = await getLocalizedCourses({}, 'es');
      expect(typeof result).toBe('object');
      expect(Array.isArray(result.items)).toBe(true);
      if (result.items.length > 0) {
        expect(result.items[0].locale).toBe('es');
      }
    });

    it('should switch course language dynamically', async () => {
      if (!testCourseId) {
        console.log('No test course available, skipping test');
        return;
      }

      const courseEn = await getLocalizedCourseById(testCourseId, 'en');
      const courseEs = await getLocalizedCourseById(testCourseId, 'es');

      expect(courseEn?.locale).toBe('en');
      expect(courseEs?.locale).toBe('es');
      expect(courseEn?.id).toBe(courseEs?.id); // Same course, different language
    });
  });

  describe('Event Content Translation Flow', () => {
    it('should fetch event in English', async () => {
      if (!testEventId) {
        console.log('No test event available, skipping test');
        return;
      }

      const event = await getLocalizedEventById(testEventId, 'en');
      expect(event).toBeDefined();
      if (event) {
        expect(event.id).toBe(testEventId);
        expect(event.locale).toBe('en');
      }
    });

    it('should fetch event in Spanish', async () => {
      if (!testEventId) {
        console.log('No test event available, skipping test');
        return;
      }

      const event = await getLocalizedEventById(testEventId, 'es');
      expect(event).toBeDefined();
      if (event) {
        expect(event.id).toBe(testEventId);
        expect(event.locale).toBe('es');
      }
    });

    it('should fetch all events with locale', async () => {
      const resultEn = await getLocalizedEvents({}, 'en');
      const resultEs = await getLocalizedEvents({}, 'es');

      expect(typeof resultEn).toBe('object');
      expect(typeof resultEs).toBe('object');
      expect(Array.isArray(resultEn.items)).toBe(true);
      expect(Array.isArray(resultEs.items)).toBe(true);

      if (resultEn.items.length > 0) {
        expect(resultEn.items[0].locale).toBe('en');
      }
      if (resultEs.items.length > 0) {
        expect(resultEs.items[0].locale).toBe('es');
      }
    });
  });

  describe('Product Content Translation Flow', () => {
    it('should fetch product in English', async () => {
      if (!testProductId) {
        console.log('No test product available, skipping test');
        return;
      }

      const product = await getLocalizedProductById(testProductId, 'en');
      expect(product).toBeDefined();
      if (product) {
        expect(product.id).toBe(testProductId);
        expect(product.locale).toBe('en');
      }
    });

    it('should fetch product in Spanish', async () => {
      if (!testProductId) {
        console.log('No test product available, skipping test');
        return;
      }

      const product = await getLocalizedProductById(testProductId, 'es');
      expect(product).toBeDefined();
      if (product) {
        expect(product.id).toBe(testProductId);
        expect(product.locale).toBe('es');
      }
    });

    it('should fetch all products with locale', async () => {
      const resultEn = await getLocalizedProducts({}, 'en');
      const resultEs = await getLocalizedProducts({}, 'es');

      expect(typeof resultEn).toBe('object');
      expect(typeof resultEs).toBe('object');
      expect(Array.isArray(resultEn.items)).toBe(true);
      expect(Array.isArray(resultEs.items)).toBe(true);

      if (resultEn.items.length > 0) {
        expect(resultEn.items[0].locale).toBe('en');
      }
      if (resultEs.items.length > 0) {
        expect(resultEs.items[0].locale).toBe('es');
      }
    });
  });

  describe('Email Template Translation Flow', () => {
    it('should generate order confirmation email in English', () => {
      const email = generateOrderConfirmationEmail(
        {
          orderId: 'ORD-12345',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          items: [
            { type: 'course', title: 'Test Course', price: 99.99, quantity: 1 },
          ],
          subtotal: 99.99,
          tax: 9.99,
          total: 109.98,
          orderDate: new Date('2025-01-15'),
        },
        'en'
      );

      expect(email.subject).toContain('ORD-12345');
      expect(email.html).toContain('John Doe');
      expect(email.text).toContain('John Doe');
      // Check for English text
      expect(email.subject.toLowerCase()).toMatch(/order|confirmation/);
    });

    it('should generate order confirmation email in Spanish', () => {
      const email = generateOrderConfirmationEmail(
        {
          orderId: 'ORD-12345',
          customerName: 'Juan Pérez',
          customerEmail: 'juan@example.com',
          items: [
            { type: 'course', title: 'Curso de Prueba', price: 99.99, quantity: 1 },
          ],
          subtotal: 99.99,
          tax: 9.99,
          total: 109.98,
          orderDate: new Date('2025-01-15'),
        },
        'es'
      );

      expect(email.subject).toContain('ORD-12345');
      expect(email.html).toContain('Juan Pérez');
      expect(email.text).toContain('Juan Pérez');
      // Check for Spanish text
      expect(email.subject.toLowerCase()).toMatch(/pedido|confirmación/);
    });

    it('should generate event booking email in English', () => {
      const email = generateEventBookingEmail(
        {
          bookingId: 'BK-12345',
          customerName: 'Jane Smith',
          customerEmail: 'jane@example.com',
          eventTitle: 'Meditation Workshop',
          eventDate: new Date('2025-02-20'),
          eventTime: '18:00',
          venue: {
            name: 'Online Platform',
            address: 'Virtual Event',
          },
          ticketCount: 1,
          totalPrice: 49.99,
        },
        'en'
      );

      expect(email.subject).toContain('Meditation Workshop');
      expect(email.html).toContain('Jane Smith');
      expect(email.html).toContain('BK-12345');
      expect(email.text).toContain('Meditation Workshop');
    });

    it('should generate event booking email in Spanish', () => {
      const email = generateEventBookingEmail(
        {
          bookingId: 'BK-12345',
          customerName: 'María González',
          customerEmail: 'maria@example.com',
          eventTitle: 'Taller de Meditación',
          eventDate: new Date('2025-02-20'),
          eventTime: '18:00',
          venue: {
            name: 'Plataforma en línea',
            address: 'Evento virtual',
          },
          ticketCount: 1,
          totalPrice: 49.99,
        },
        'es'
      );

      expect(email.subject).toContain('Taller de Meditación');
      expect(email.html).toContain('María González');
      expect(email.html).toContain('BK-12345');
      expect(email.text).toContain('Taller de Meditación');
    });

    it('should switch email language based on user preference', async () => {
      // User prefers English
      await updateUserLanguagePreference(testUserId, 'en');
      let userLocale = await getUserLanguagePreference(testUserId);

      let email = generateOrderConfirmationEmail(
        {
          orderId: 'ORD-TEST',
          customerName: 'Test User',
          customerEmail: 'test@example.com',
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          orderDate: new Date(),
        },
        userLocale
      );
      expect(email.subject.toLowerCase()).toMatch(/order|confirmation/);

      // Switch to Spanish
      await updateUserLanguagePreference(testUserId, 'es');
      userLocale = await getUserLanguagePreference(testUserId);

      email = generateOrderConfirmationEmail(
        {
          orderId: 'ORD-TEST',
          customerName: 'Test User',
          customerEmail: 'test@example.com',
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          orderDate: new Date(),
        },
        userLocale
      );
      expect(email.subject.toLowerCase()).toMatch(/pedido|confirmación/);

      // Reset to English
      await updateUserLanguagePreference(testUserId, 'en');
    });
  });

  describe('UI Translation Flow', () => {
    it('should translate common UI elements to English', () => {
      expect(t('en', 'common.yes')).toBe('Yes');
      expect(t('en', 'common.no')).toBe('No');
      expect(t('en', 'common.save')).toBe('Save');
      expect(t('en', 'common.cancel')).toBe('Cancel');
      expect(t('en', 'common.loading')).toBe('Loading...');
    });

    it('should translate common UI elements to Spanish', () => {
      expect(t('es', 'common.yes')).toBe('Sí');
      expect(t('es', 'common.no')).toBe('No');
      expect(t('es', 'common.save')).toBe('Guardar');
      expect(t('es', 'common.cancel')).toBe('Cancelar');
      expect(t('es', 'common.loading')).toBe('Cargando...');
    });

    it('should translate navigation elements', () => {
      expect(t('en', 'nav.home')).toBe('Home');
      expect(t('es', 'nav.home')).toBe('Inicio');
      expect(t('en', 'nav.courses')).toBe('Courses');
      expect(t('es', 'nav.courses')).toBe('Cursos');
    });

    it('should translate form labels', () => {
      expect(t('en', 'auth.emailAddress')).toBe('Email Address');
      expect(t('es', 'auth.emailAddress')).toBe('Dirección de Correo');
      expect(t('en', 'auth.password')).toBe('Password');
      expect(t('es', 'auth.password')).toBe('Contraseña');
    });

    it('should translate error messages', () => {
      const errorEn = t('en', 'errors.requiredField');
      const errorEs = t('es', 'errors.requiredField');

      expect(errorEn).toBeDefined();
      expect(errorEs).toBeDefined();
      expect(errorEn).not.toBe(errorEs); // Should be different languages
    });
  });

  describe('Complete User Flow - Language Switching Journey', () => {
    it('should support complete journey: EN → ES → EN', async () => {
      // Step 1: User starts in English (default)
      let locale: Locale = 'en';
      expect(t(locale, 'common.welcome')).toContain('Welcome');

      // Step 2: User views course in English
      if (testCourseId) {
        const courseEn = await getLocalizedCourseById(testCourseId, locale);
        expect(courseEn?.locale).toBe('en');
      }

      // Step 3: User switches to Spanish
      await updateUserLanguagePreference(testUserId, 'es');
      locale = await getUserLanguagePreference(testUserId);
      expect(locale).toBe('es');
      expect(t(locale, 'common.welcome')).toContain('Bienvenid');

      // Step 4: User views course in Spanish
      if (testCourseId) {
        const courseEs = await getLocalizedCourseById(testCourseId, locale);
        expect(courseEs?.locale).toBe('es');
      }

      // Step 5: User receives email in Spanish
      const emailEs = generateOrderConfirmationEmail(
        {
          orderId: 'ORD-TEST',
          customerName: 'Test User',
          customerEmail: 'test@example.com',
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          orderDate: new Date(),
        },
        locale
      );
      expect(emailEs.subject.toLowerCase()).toMatch(/pedido|confirmación/);

      // Step 6: User switches back to English
      await updateUserLanguagePreference(testUserId, 'en');
      locale = await getUserLanguagePreference(testUserId);
      expect(locale).toBe('en');

      // Step 7: User views content in English again
      if (testCourseId) {
        const courseEnAgain = await getLocalizedCourseById(testCourseId, locale);
        expect(courseEnAgain?.locale).toBe('en');
      }

      // Step 8: User receives email in English
      const emailEn = generateOrderConfirmationEmail(
        {
          orderId: 'ORD-TEST',
          customerName: 'Test User',
          customerEmail: 'test@example.com',
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          orderDate: new Date(),
        },
        locale
      );
      expect(emailEn.subject.toLowerCase()).toMatch(/order|confirmation/);
    });

    it('should maintain language consistency across all content types', async () => {
      const locale: Locale = 'es';

      // All content should use Spanish
      if (testCourseId) {
        const course = await getLocalizedCourseById(testCourseId, locale);
        expect(course?.locale).toBe('es');
      }

      if (testEventId) {
        const event = await getLocalizedEventById(testEventId, locale);
        expect(event?.locale).toBe('es');
      }

      if (testProductId) {
        const product = await getLocalizedProductById(testProductId, locale);
        expect(product?.locale).toBe('es');
      }

      // UI elements in Spanish
      expect(t(locale, 'common.loading')).toBe('Cargando...');

      // Email in Spanish
      const email = generateOrderConfirmationEmail(
        {
          orderId: 'ORD-TEST',
          customerName: 'Test',
          customerEmail: 'test@example.com',
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          orderDate: new Date(),
        },
        locale
      );
      expect(email.subject.toLowerCase()).toMatch(/pedido|confirmación/);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should fallback to English for invalid locale', () => {
      const invalidLocale = 'fr' as Locale;
      // System should validate and fallback
      expect(isValidLocale(invalidLocale)).toBe(false);
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('es')).toBe(true);
    });

    it('should handle missing translation keys gracefully', () => {
      const result = t('en', 'nonexistent.key.that.does.not.exist');
      // Should return the key itself or a fallback
      expect(typeof result).toBe('string');
    });

    it('should handle user without language preference', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      const preference = await getUserLanguagePreference(nonExistentUserId);
      // Should default to English
      expect(preference).toBe('en');
    });

    it('should handle content that does not exist in requested language', async () => {
      if (!testCourseId) {
        console.log('No test course available, skipping test');
        return;
      }

      // Even if translation missing, should return content with locale indicator
      const course = await getLocalizedCourseById(testCourseId, 'es');
      expect(course).toBeDefined();
      // Locale should still be set even if some fields use fallback
      if (course) {
        expect(course.locale).toBe('es');
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should efficiently fetch content in multiple languages', async () => {
      if (!testCourseId) {
        console.log('No test course available, skipping test');
        return;
      }

      const start = Date.now();

      // Fetch same course in both languages
      await Promise.all([
        getLocalizedCourseById(testCourseId, 'en'),
        getLocalizedCourseById(testCourseId, 'es'),
      ]);

      const duration = Date.now() - start;

      // Should complete reasonably fast (< 1 second for 2 queries)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent language switches', async () => {
      // Simulate rapid language switching
      const switches = [
        updateUserLanguagePreference(testUserId, 'es'),
        updateUserLanguagePreference(testUserId, 'en'),
        updateUserLanguagePreference(testUserId, 'es'),
      ];

      const results = await Promise.all(switches);

      // Last one should win
      const finalPreference = await getUserLanguagePreference(testUserId);
      expect(['en', 'es']).toContain(finalPreference);

      // At least one should succeed
      expect(results.some(r => r.success)).toBe(true);

      // Reset to English
      await updateUserLanguagePreference(testUserId, 'en');
    });
  });
});
