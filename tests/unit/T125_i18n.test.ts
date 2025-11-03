/**
 * T125: i18n Structure Tests
 *
 * Tests for internationalization utility functions.
 * Verifies translation loading, formatting, locale detection, and routing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  type Locale,
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_NAMES,
  getTranslations,
  t,
  isValidLocale,
  getLocaleFromRequest,
  formatNumber,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getLocalizedPath,
  extractLocaleFromPath,
} from '../../src/i18n/index';

describe('T125: i18n Structure', () => {
  describe('Constants', () => {
    it('should have correct default locale', () => {
      expect(DEFAULT_LOCALE).toBe('en');
    });

    it('should have all supported locales', () => {
      expect(LOCALES).toEqual(['en', 'es']);
      expect(LOCALES).toHaveLength(2);
    });

    it('should have locale display names', () => {
      expect(LOCALE_NAMES.en).toBe('English');
      expect(LOCALE_NAMES.es).toBe('Español');
    });
  });

  describe('getTranslations()', () => {
    it('should return English translations by default', () => {
      const translations = getTranslations();
      expect(translations).toBeDefined();
      expect(translations.common).toBeDefined();
      expect(translations.common.welcome).toBe('Welcome');
    });

    it('should return English translations for en locale', () => {
      const translations = getTranslations('en');
      expect(translations.common.welcome).toBe('Welcome');
    });

    it('should return Spanish translations for es locale', () => {
      const translations = getTranslations('es');
      expect(translations.common.welcome).toBe('Bienvenido');
    });

    it('should fallback to default locale for invalid locale', () => {
      // @ts-expect-error: Testing invalid locale
      const translations = getTranslations('fr');
      expect(translations.common.welcome).toBe('Welcome');
    });
  });

  describe('t() - Translation Function', () => {
    describe('Simple translations', () => {
      it('should translate simple English keys', () => {
        expect(t('en', 'common.welcome')).toBe('Welcome');
        expect(t('en', 'common.login')).toBe('Login');
        expect(t('en', 'common.logout')).toBe('Logout');
      });

      it('should translate simple Spanish keys', () => {
        expect(t('es', 'common.welcome')).toBe('Bienvenido');
        expect(t('es', 'common.login')).toBe('Iniciar sesión');
        expect(t('es', 'common.logout')).toBe('Cerrar sesión');
      });

      it('should translate nested keys', () => {
        expect(t('en', 'nav.home')).toBe('Home');
        expect(t('en', 'auth.signIn')).toBe('Sign In');
        expect(t('en', 'courses.title')).toBe('Courses');
      });

      it('should translate deeply nested keys', () => {
        expect(t('en', 'dashboard.stats.coursesEnrolled')).toBe('Courses Enrolled');
        expect(t('es', 'dashboard.stats.coursesEnrolled')).toBe('Cursos Inscritos');
      });
    });

    describe('Variable interpolation', () => {
      it('should interpolate single variable', () => {
        const result = t('en', 'dashboard.welcome', { name: 'John' });
        expect(result).toBe('Welcome back, John!');
      });

      it('should interpolate single variable in Spanish', () => {
        const result = t('es', 'dashboard.welcome', { name: 'Juan' });
        expect(result).toBe('¡Bienvenido de nuevo, Juan!');
      });

      it('should interpolate numeric variables', () => {
        const result = t('en', 'events.spotsLeft', { count: 5 });
        expect(result).toBe('5 spots left');
      });

      it('should interpolate numeric variables in Spanish', () => {
        const result = t('es', 'events.spotsLeft', { count: 3 });
        expect(result).toBe('3 lugares disponibles');
      });

      it('should interpolate multiple variables', () => {
        const result = t('en', 'search.resultsFor', { query: 'meditation' });
        expect(result).toBe('Results for "meditation"');
      });

      it('should handle missing variables gracefully', () => {
        const result = t('en', 'dashboard.welcome', {});
        expect(result).toBe('Welcome back, {{name}}!');
      });

      it('should convert numbers to strings', () => {
        const result = t('en', 'pagination.showing', { start: 1, end: 10, total: 100 });
        expect(result).toBe('Showing 1 to 10 of 100');
      });
    });

    describe('Error handling', () => {
      it('should return key for non-existent key', () => {
        const result = t('en', 'nonexistent.key');
        expect(result).toBe('nonexistent.key');
      });

      it('should return key for non-existent nested key', () => {
        const result = t('en', 'common.nonexistent.nested');
        expect(result).toBe('common.nonexistent.nested');
      });

      it('should return key when value is not a string', () => {
        const result = t('en', 'common');
        expect(result).toBe('common');
      });

      it('should handle empty key gracefully', () => {
        const result = t('en', '');
        expect(result).toBe('');
      });
    });
  });

  describe('isValidLocale()', () => {
    it('should return true for valid locales', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('es')).toBe(true);
    });

    it('should return false for invalid locales', () => {
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale('de')).toBe(false);
      expect(isValidLocale('invalid')).toBe(false);
      expect(isValidLocale('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isValidLocale('EN')).toBe(false);
      expect(isValidLocale('Es')).toBe(false);
    });
  });

  describe('getLocaleFromRequest()', () => {
    it('should prioritize URL parameter', () => {
      const url = new URL('http://example.com?lang=es');
      const locale = getLocaleFromRequest(url, 'en', 'en-US');
      expect(locale).toBe('es');
    });

    it('should use cookie if no URL parameter', () => {
      const url = new URL('http://example.com');
      const locale = getLocaleFromRequest(url, 'es', 'en-US');
      expect(locale).toBe('es');
    });

    it('should use Accept-Language if no URL or cookie', () => {
      const url = new URL('http://example.com');
      const locale = getLocaleFromRequest(url, undefined, 'es-ES,es;q=0.9');
      expect(locale).toBe('es');
    });

    it('should extract language from complex Accept-Language', () => {
      const url = new URL('http://example.com');
      const locale = getLocaleFromRequest(url, undefined, 'en-US,en;q=0.9,es;q=0.8');
      expect(locale).toBe('en');
    });

    it('should fallback to default locale', () => {
      const url = new URL('http://example.com');
      const locale = getLocaleFromRequest(url);
      expect(locale).toBe('en');
    });

    it('should ignore invalid URL locale', () => {
      const url = new URL('http://example.com?lang=invalid');
      const locale = getLocaleFromRequest(url, 'es');
      expect(locale).toBe('es');
    });

    it('should ignore invalid cookie locale', () => {
      const url = new URL('http://example.com');
      const locale = getLocaleFromRequest(url, 'invalid', 'es-ES');
      expect(locale).toBe('es');
    });

    it('should handle Accept-Language with region codes', () => {
      const url = new URL('http://example.com');
      const locale = getLocaleFromRequest(url, undefined, 'es-MX');
      expect(locale).toBe('es');
    });
  });

  describe('formatNumber()', () => {
    it('should format numbers in English locale', () => {
      const result = formatNumber('en', 1234567.89);
      expect(result).toBe('1,234,567.89');
    });

    it('should format numbers in Spanish locale', () => {
      const result = formatNumber('es', 1234567.89);
      // Spanish uses period for thousands, comma for decimals
      expect(result).toBe('1.234.567,89');
    });

    it('should format integers', () => {
      expect(formatNumber('en', 1000)).toBe('1,000');
      expect(formatNumber('es', 1000)).toBe('1000');
    });

    it('should support custom formatting options', () => {
      const result = formatNumber('en', 0.1234, {
        style: 'percent',
        minimumFractionDigits: 2,
      });
      expect(result).toBe('12.34%');
    });

    it('should handle zero', () => {
      expect(formatNumber('en', 0)).toBe('0');
      expect(formatNumber('es', 0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber('en', -1234.56)).toBe('-1,234.56');
    });
  });

  describe('formatCurrency()', () => {
    it('should format currency in English locale (USD)', () => {
      const result = formatCurrency('en', 1234567); // 1234567 cents = $12,345.67
      expect(result).toBe('$12,345.67');
    });

    it('should format currency in Spanish locale (USD)', () => {
      const result = formatCurrency('es', 1234567);
      expect(result).toContain('12.345,67');
      expect(result).toContain('US$');
    });

    it('should support custom currency', () => {
      const result = formatCurrency('en', 100000, 'EUR'); // €1,000.00
      expect(result).toContain('1,000.00');
      expect(result).toContain('€');
    });

    it('should handle zero', () => {
      const result = formatCurrency('en', 0);
      expect(result).toBe('$0.00');
    });

    it('should handle small amounts', () => {
      const result = formatCurrency('en', 99); // $0.99
      expect(result).toBe('$0.99');
    });

    it('should handle negative amounts', () => {
      const result = formatCurrency('en', -5000); // -$50.00
      expect(result).toContain('-');
      expect(result).toContain('50.00');
    });
  });

  describe('formatDate()', () => {
    const testDate = new Date('2025-01-15T10:30:00Z');

    it('should format date in English locale', () => {
      const result = formatDate('en', testDate);
      expect(result).toContain('2025');
      expect(result).toContain('1'); // Month or day
    });

    it('should format date in Spanish locale', () => {
      const result = formatDate('es', testDate);
      expect(result).toContain('2025');
    });

    it('should accept string dates', () => {
      const result = formatDate('en', '2025-01-15');
      expect(result).toContain('2025');
    });

    it('should support custom formatting options', () => {
      const result = formatDate('en', testDate, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      expect(result).toContain('January');
      expect(result).toContain('2025');
    });

    it('should format short dates', () => {
      const result = formatDate('en', testDate, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/2025/);
    });

    it('should include time when specified', () => {
      const result = formatDate('en', testDate, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      expect(result).toContain('2025');
    });
  });

  describe('formatRelativeTime()', () => {
    beforeEach(() => {
      // Mock current time for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should format seconds ago', () => {
      const pastDate = new Date('2025-01-15T11:59:30Z');
      const result = formatRelativeTime('en', pastDate);
      expect(result).toContain('30 seconds ago');
    });

    it('should format minutes ago', () => {
      const pastDate = new Date('2025-01-15T11:55:00Z');
      const result = formatRelativeTime('en', pastDate);
      expect(result).toContain('5 minutes ago');
    });

    it('should format hours ago', () => {
      const pastDate = new Date('2025-01-15T10:00:00Z');
      const result = formatRelativeTime('en', pastDate);
      expect(result).toContain('2 hours ago');
    });

    it('should format days ago', () => {
      const pastDate = new Date('2025-01-13T12:00:00Z');
      const result = formatRelativeTime('en', pastDate);
      expect(result).toContain('2 days ago');
    });

    it('should format months ago', () => {
      const pastDate = new Date('2024-11-15T12:00:00Z');
      const result = formatRelativeTime('en', pastDate);
      expect(result).toContain('2 months ago');
    });

    it('should format years ago', () => {
      const pastDate = new Date('2023-01-15T12:00:00Z');
      const result = formatRelativeTime('en', pastDate);
      expect(result).toContain('2 years ago');
    });

    it('should format in Spanish locale', () => {
      const pastDate = new Date('2025-01-15T11:55:00Z');
      const result = formatRelativeTime('es', pastDate);
      expect(result).toContain('hace');
    });

    it('should accept string dates', () => {
      const result = formatRelativeTime('en', '2025-01-15T11:55:00Z');
      expect(result).toContain('minutes ago');
    });
  });

  describe('getLocalizedPath()', () => {
    it('should not add prefix for default locale (en)', () => {
      expect(getLocalizedPath('en', '/courses')).toBe('/courses');
      expect(getLocalizedPath('en', '/dashboard')).toBe('/dashboard');
    });

    it('should add locale prefix for non-default locale', () => {
      expect(getLocalizedPath('es', '/courses')).toBe('/es/courses');
      expect(getLocalizedPath('es', '/dashboard')).toBe('/es/dashboard');
    });

    it('should handle paths without leading slash', () => {
      expect(getLocalizedPath('es', 'courses')).toBe('/es/courses');
      expect(getLocalizedPath('en', 'courses')).toBe('/courses');
    });

    it('should handle root path', () => {
      expect(getLocalizedPath('es', '/')).toBe('/es/');
      expect(getLocalizedPath('en', '/')).toBe('/');
    });

    it('should handle paths with query parameters', () => {
      expect(getLocalizedPath('es', '/courses?filter=new')).toBe('/es/courses?filter=new');
    });

    it('should handle nested paths', () => {
      expect(getLocalizedPath('es', '/courses/123/lessons')).toBe('/es/courses/123/lessons');
    });
  });

  describe('extractLocaleFromPath()', () => {
    it('should extract Spanish locale from path', () => {
      const result = extractLocaleFromPath('/es/courses');
      expect(result.locale).toBe('es');
      expect(result.path).toBe('/courses');
    });

    it('should extract English locale from path', () => {
      const result = extractLocaleFromPath('/en/dashboard');
      expect(result.locale).toBe('en');
      expect(result.path).toBe('/dashboard');
    });

    it('should return default locale for path without locale', () => {
      const result = extractLocaleFromPath('/courses');
      expect(result.locale).toBe('en');
      expect(result.path).toBe('/courses');
    });

    it('should handle root path', () => {
      const result = extractLocaleFromPath('/');
      expect(result.locale).toBe('en');
      expect(result.path).toBe('/');
    });

    it('should handle path with locale prefix only', () => {
      const result = extractLocaleFromPath('/es');
      expect(result.locale).toBe('es');
      expect(result.path).toBe('/');
    });

    it('should handle nested paths with locale', () => {
      const result = extractLocaleFromPath('/es/courses/123/lessons');
      expect(result.locale).toBe('es');
      expect(result.path).toBe('/courses/123/lessons');
    });

    it('should ignore invalid locale in path', () => {
      const result = extractLocaleFromPath('/fr/courses');
      expect(result.locale).toBe('en');
      expect(result.path).toBe('/fr/courses');
    });

    it('should handle paths with query parameters', () => {
      const result = extractLocaleFromPath('/es/courses?filter=new');
      expect(result.locale).toBe('es');
      expect(result.path).toBe('/courses?filter=new');
    });
  });

  describe('Integration tests', () => {
    it('should work together: detect locale and get translation', () => {
      const url = new URL('http://example.com?lang=es');
      const locale = getLocaleFromRequest(url);
      const greeting = t(locale, 'common.welcome');
      expect(greeting).toBe('Bienvenido');
    });

    it('should work together: locale path and extraction', () => {
      const localizedPath = getLocalizedPath('es', '/courses');
      expect(localizedPath).toBe('/es/courses');

      const extracted = extractLocaleFromPath(localizedPath);
      expect(extracted.locale).toBe('es');
      expect(extracted.path).toBe('/courses');
    });

    it('should provide consistent round-trip for paths', () => {
      const originalPath = '/courses/123';
      const localized = getLocalizedPath('es', originalPath);
      const extracted = extractLocaleFromPath(localized);

      expect(extracted.path).toBe(originalPath);
      expect(extracted.locale).toBe('es');
    });

    it('should handle complete user flow', () => {
      // 1. User visits with Spanish preference
      const url = new URL('http://example.com');
      const locale = getLocaleFromRequest(url, undefined, 'es-MX');
      expect(locale).toBe('es');

      // 2. Get localized path for navigation
      const coursesPath = getLocalizedPath(locale, '/courses');
      expect(coursesPath).toBe('/es/courses');

      // 3. Display translated content
      const title = t(locale, 'courses.title');
      expect(title).toBe('Cursos');

      // 4. Format price
      const price = formatCurrency(locale, 9999);
      expect(price).toContain('99,99');
    });
  });
});
