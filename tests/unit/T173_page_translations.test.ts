/**
 * T173: Page Translations Tests
 * Tests for page translation helper utilities
 */

import { describe, it, expect } from 'vitest';
import { getTranslate, getLocale, useTranslations } from '@/lib/pageTranslations';

describe('Page Translations (T173)', () => {
  describe('getTranslate', () => {
    it('should return a translation function bound to English', () => {
      const translate = getTranslate('en');
      expect(typeof translate).toBe('function');
      const result = translate('common.welcome');
      expect(result).toBe('Welcome');
    });

    it('should return a translation function bound to Spanish', () => {
      const translate = getTranslate('es');
      const result = translate('common.welcome');
      expect(result).toBe('Bienvenido');
    });

    it('should support variable interpolation', () => {
      const translate = getTranslate('en');
      const result = translate('dashboard.welcome', { name: 'John' });
      expect(result).toBe('Welcome back, John!');
    });

    it('should work with nested keys', () => {
      const translate = getTranslate('en');
      const result = translate('nav.home');
      expect(result).toBe('Home');
    });
  });

  describe('getLocale', () => {
    it('should return locale from locals', () => {
      const locals = { locale: 'es' };
      const result = getLocale(locals);
      expect(result).toBe('es');
    });

    it('should return default locale when not set', () => {
      const locals = {};
      const result = getLocale(locals);
      expect(result).toBe('en');
    });

    it('should return default locale for undefined locals', () => {
      const result = getLocale(undefined);
      expect(result).toBe('en');
    });

    it('should return default locale for null locals', () => {
      const result = getLocale(null);
      expect(result).toBe('en');
    });
  });

  describe('useTranslations', () => {
    it('should return locale and translate function for English', () => {
      const locals = { locale: 'en' };
      const { locale, t: translate } = useTranslations(locals);

      expect(locale).toBe('en');
      expect(typeof translate).toBe('function');
      expect(translate('common.welcome')).toBe('Welcome');
    });

    it('should return locale and translate function for Spanish', () => {
      const locals = { locale: 'es' };
      const { locale, t: translate } = useTranslations(locals);

      expect(locale).toBe('es');
      expect(typeof translate).toBe('function');
      expect(translate('common.welcome')).toBe('Bienvenido');
    });

    it('should work with undefined locals', () => {
      const { locale, t: translate } = useTranslations(undefined);

      expect(locale).toBe('en');
      expect(translate('common.welcome')).toBe('Welcome');
    });
  });

  describe('Translation Keys', () => {
    describe('Homepage Translations', () => {
      it('should have English homepage translations', () => {
        const translate = getTranslate('en');

        expect(translate('home.heroTitle')).toBe('Transform Your Reality Through');
        expect(translate('home.heroSubtitle')).toBe('Quantum Healing');
        expect(translate('home.heroDescription')).toContain('Unlock your infinite potential');
        expect(translate('home.browseAllCourses')).toBe('Browse All Courses');
        expect(translate('home.learnMore')).toBe('Learn More');
      });

      it('should have Spanish homepage translations', () => {
        const translate = getTranslate('es');

        expect(translate('home.heroTitle')).toBe('Transforma tu Realidad a través de la');
        expect(translate('home.heroSubtitle')).toBe('Sanación Cuántica');
        expect(translate('home.heroDescription')).toContain('Desbloquea tu potencial infinito');
        expect(translate('home.browseAllCourses')).toBe('Explorar Todos los Cursos');
        expect(translate('home.learnMore')).toBe('Saber Más');
      });

      it('should have featured courses section translations', () => {
        const translateEn = getTranslate('en');
        const translateEs = getTranslate('es');

        expect(translateEn('home.featuredCoursesTitle')).toBe('⭐ Featured Courses');
        expect(translateEs('home.featuredCoursesTitle')).toBe('⭐ Cursos Destacados');

        expect(translateEn('home.featuredCoursesDescription')).toContain('transformative');
        expect(translateEs('home.featuredCoursesDescription')).toContain('transformadoras');
      });

      it('should have new arrivals section translations', () => {
        const translateEn = getTranslate('en');
        const translateEs = getTranslate('es');

        expect(translateEn('home.newArrivalsTitle')).toBe('🆕 New Arrivals');
        expect(translateEs('home.newArrivalsTitle')).toBe('🆕 Nuevos Llegados');
      });

      it('should have CTA section translations', () => {
        const translateEn = getTranslate('en');
        const translateEs = getTranslate('es');

        expect(translateEn('home.ctaTitle')).toBe('Ready to Begin Your Transformation?');
        expect(translateEs('home.ctaTitle')).toBe('¿Listo para Comenzar tu Transformación?');

        expect(translateEn('home.startLearningToday')).toBe('Start Learning Today');
        expect(translateEs('home.startLearningToday')).toBe('Comienza a Aprender Hoy');
      });
    });

    describe('Courses Translations', () => {
      it('should have course-related translations', () => {
        const translateEn = getTranslate('en');
        const translateEs = getTranslate('es');

        expect(translateEn('courses.title')).toBe('Courses');
        expect(translateEs('courses.title')).toBe('Cursos');

        expect(translateEn('courses.browseCourses')).toBe('Browse Courses');
        expect(translateEs('courses.browseCourses')).toBe('Explorar Cursos');
      });

      it('should have course level translations', () => {
        const translateEn = getTranslate('en');
        const translateEs = getTranslate('es');

        expect(translateEn('courses.beginner')).toBe('Beginner');
        expect(translateEs('courses.beginner')).toBe('Principiante');

        expect(translateEn('courses.intermediate')).toBe('Intermediate');
        expect(translateEs('courses.intermediate')).toBe('Intermedio');

        expect(translateEn('courses.advanced')).toBe('Advanced');
        expect(translateEs('courses.advanced')).toBe('Avanzado');
      });
    });

    describe('Events Translations', () => {
      it('should have event-related translations', () => {
        const translateEn = getTranslate('en');
        const translateEs = getTranslate('es');

        expect(translateEn('events.title')).toBe('Events');
        expect(translateEs('events.title')).toBe('Eventos');

        expect(translateEn('events.browseEvents')).toBe('Browse Events');
        expect(translateEs('events.browseEvents')).toBe('Explorar Eventos');
      });
    });

    describe('Products Translations', () => {
      it('should have product-related translations', () => {
        const translateEn = getTranslate('en');
        const translateEs = getTranslate('es');

        expect(translateEn('products.title')).toBe('Products');
        expect(translateEs('products.title')).toBe('Productos');

        expect(translateEn('products.browseProducts')).toBe('Browse Products');
        expect(translateEs('products.browseProducts')).toBe('Explorar Productos');
      });
    });

    describe('Dashboard Translations', () => {
      it('should have dashboard translations', () => {
        const translateEn = getTranslate('en');
        const translateEs = getTranslate('es');

        expect(translateEn('dashboard.title')).toBe('Dashboard');
        expect(translateEs('dashboard.title')).toBe('Panel de Control');

        expect(translateEn('dashboard.overview')).toBe('Overview');
        expect(translateEs('dashboard.overview')).toBe('Resumen');
      });

      it('should have dashboard stats translations', () => {
        const translateEn = getTranslate('en');
        const translateEs = getTranslate('es');

        expect(translateEn('dashboard.stats.coursesEnrolled')).toBe('Courses Enrolled');
        expect(translateEs('dashboard.stats.coursesEnrolled')).toBe('Cursos Inscritos');
      });
    });

    describe('Navigation Translations', () => {
      it('should have navigation translations', () => {
        const translateEn = getTranslate('en');
        const translateEs = getTranslate('es');

        expect(translateEn('nav.home')).toBe('Home');
        expect(translateEs('nav.home')).toBe('Inicio');

        expect(translateEn('nav.courses')).toBe('Courses');
        expect(translateEs('nav.courses')).toBe('Cursos');

        expect(translateEn('nav.events')).toBe('Events');
        expect(translateEs('nav.events')).toBe('Eventos');

        expect(translateEn('nav.products')).toBe('Products');
        expect(translateEs('nav.products')).toBe('Productos');

        expect(translateEn('nav.dashboard')).toBe('Dashboard');
        expect(translateEs('nav.dashboard')).toBe('Panel');
      });
    });
  });

  describe('Type Safety', () => {
    it('should always return strings from translate function', () => {
      const translate = getTranslate('en');

      const result1 = translate('common.welcome');
      const result2 = translate('nav.home');
      const result3 = translate('courses.title');

      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
      expect(typeof result3).toBe('string');
    });

    it('should always return locale as string', () => {
      const result1 = getLocale({ locale: 'en' });
      const result2 = getLocale({ locale: 'es' });
      const result3 = getLocale({});

      expect(typeof result1).toBe('string');
      expect(typeof result2).toBe('string');
      expect(typeof result3).toBe('string');
    });
  });
});
