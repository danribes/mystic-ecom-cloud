/**
 * T163: i18n Middleware Tests
 *
 * Tests for internationalization middleware that detects user's preferred
 * language and adds locale information to request context.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { i18nMiddleware } from '../../src/middleware/i18n';
import type { MiddlewareHandler } from 'astro';

// Mock the i18n module
vi.mock('../../src/i18n', () => ({
  DEFAULT_LOCALE: 'en',
  isValidLocale: (locale: string) => ['en', 'es'].includes(locale),
  getLocaleFromRequest: (url: URL, cookieLocale?: string, acceptLanguage?: string) => {
    const urlLang = url.searchParams.get('lang');
    if (urlLang && ['en', 'es'].includes(urlLang)) return urlLang;
    if (cookieLocale && ['en', 'es'].includes(cookieLocale)) return cookieLocale;
    if (acceptLanguage?.startsWith('es')) return 'es';
    return 'en';
  },
  extractLocaleFromPath: (pathname: string) => {
    const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
    if (match && ['en', 'es'].includes(match[1])) {
      const locale = match[1] as 'en' | 'es';
      const path = pathname.slice(3) || '/';
      return { locale, path };
    }
    return { locale: 'en' as const, path: pathname };
  },
}));

// Helper to create mock context
function createMockContext(options: {
  pathname?: string;
  search?: string;
  cookieValue?: string;
  acceptLanguage?: string;
} = {}) {
  const {
    pathname = '/',
    search = '',
    cookieValue,
    acceptLanguage,
  } = options;

  const url = new URL(`https://example.com${pathname}${search}`);

  const cookies = {
    get: vi.fn((name: string) => {
      if (name === 'locale' && cookieValue) {
        return { value: cookieValue };
      }
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(),
  };

  const headers = new Headers();
  if (acceptLanguage) {
    headers.set('accept-language', acceptLanguage);
  }

  const request = new Request(url.toString(), { headers });

  const locals: any = {};

  const response = new Response('OK', { status: 200 });
  const next = vi.fn(async () => response);

  return {
    request,
    cookies,
    locals,
    url,
    next,
    response,
  };
}

describe('T163: i18n Middleware', () => {
  describe('Locale Detection', () => {
    it('should detect English as default locale', async () => {
      const ctx = createMockContext();

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('en');
      expect(ctx.locals.defaultLocale).toBe('en');
    });

    it('should detect locale from URL path prefix', async () => {
      const ctx = createMockContext({ pathname: '/es/courses' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('es');
    });

    it('should detect locale from URL query parameter', async () => {
      const ctx = createMockContext({ search: '?lang=es' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('es');
    });

    it('should detect locale from cookie', async () => {
      const ctx = createMockContext({ cookieValue: 'es' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('es');
    });

    it('should detect locale from Accept-Language header', async () => {
      const ctx = createMockContext({ acceptLanguage: 'es-ES,es;q=0.9' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('es');
    });

    it('should prioritize URL path over other sources', async () => {
      const ctx = createMockContext({
        pathname: '/es/courses',
        cookieValue: 'en',
        acceptLanguage: 'en-US',
      });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('es');
    });

    it('should prioritize URL query over cookie', async () => {
      const ctx = createMockContext({
        search: '?lang=es',
        cookieValue: 'en',
      });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('es');
    });

    it('should prioritize cookie over Accept-Language', async () => {
      const ctx = createMockContext({
        cookieValue: 'es',
        acceptLanguage: 'en-US',
      });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('es');
    });
  });

  describe('Cookie Persistence', () => {
    it('should set locale cookie when locale is detected', async () => {
      const ctx = createMockContext({ search: '?lang=es' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'locale',
        'es',
        expect.objectContaining({
          path: '/',
          maxAge: 365 * 24 * 60 * 60,
          httpOnly: false,
          sameSite: 'lax',
        })
      );
    });

    it('should not set cookie if locale unchanged', async () => {
      const ctx = createMockContext({ cookieValue: 'en' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.cookies.set).not.toHaveBeenCalled();
    });

    it('should update cookie when locale changes', async () => {
      const ctx = createMockContext({
        cookieValue: 'en',
        search: '?lang=es',
      });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'locale',
        'es',
        expect.any(Object)
      );
    });

    it('should set secure cookie in production', async () => {
      const originalEnv = import.meta.env.PROD;
      (import.meta.env as any).PROD = true;

      const ctx = createMockContext({ search: '?lang=es' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.cookies.set).toHaveBeenCalledWith(
        'locale',
        'es',
        expect.objectContaining({
          secure: true,
        })
      );

      (import.meta.env as any).PROD = originalEnv;
    });
  });

  describe('Response Headers', () => {
    it('should add Content-Language header to response', async () => {
      const ctx = createMockContext({ search: '?lang=es' });

      const response = await i18nMiddleware(ctx as any, ctx.next);

      expect(response.headers.get('Content-Language')).toBe('es');
    });

    it('should set Content-Language for default locale', async () => {
      const ctx = createMockContext();

      const response = await i18nMiddleware(ctx as any, ctx.next);

      expect(response.headers.get('Content-Language')).toBe('en');
    });
  });

  describe('Path Extraction', () => {
    it('should extract Spanish locale from /es/ paths', async () => {
      const ctx = createMockContext({ pathname: '/es/' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('es');
    });

    it('should extract Spanish locale from nested paths', async () => {
      const ctx = createMockContext({ pathname: '/es/courses/123' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('es');
    });

    it('should not extract invalid locale codes', async () => {
      const ctx = createMockContext({ pathname: '/fr/courses' });

      await i18nMiddleware(ctx as any, ctx.next);

      // Should fallback to default locale since 'fr' is not valid
      expect(ctx.locals.locale).toBe('en');
    });

    it('should handle root path without locale', async () => {
      const ctx = createMockContext({ pathname: '/' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('en');
    });
  });

  describe('Middleware Integration', () => {
    it('should call next middleware', async () => {
      const ctx = createMockContext();

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.next).toHaveBeenCalled();
    });

    it('should return response from next middleware', async () => {
      const ctx = createMockContext();

      const response = await i18nMiddleware(ctx as any, ctx.next);

      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });

    it('should enrich locals before calling next', async () => {
      const ctx = createMockContext();

      ctx.next = vi.fn(async () => {
        // Verify locals are set before next() is called
        expect(ctx.locals.locale).toBeDefined();
        expect(ctx.locals.defaultLocale).toBeDefined();
        return ctx.response;
      });

      await i18nMiddleware(ctx as any, ctx.next);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing Accept-Language header', async () => {
      const ctx = createMockContext();

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('en');
    });

    it('should handle empty cookie', async () => {
      const ctx = createMockContext({ cookieValue: undefined });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('en');
    });

    it('should handle query parameter without value', async () => {
      const ctx = createMockContext({ search: '?lang=' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('en');
    });

    it('should handle multiple query parameters', async () => {
      const ctx = createMockContext({ search: '?foo=bar&lang=es&baz=qux' });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('es');
    });

    it('should handle complex Accept-Language header', async () => {
      const ctx = createMockContext({
        acceptLanguage: 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7',
      });

      await i18nMiddleware(ctx as any, ctx.next);

      expect(ctx.locals.locale).toBe('en');
    });
  });

  describe('Type Safety', () => {
    it('should set locale as Locale type', async () => {
      const ctx = createMockContext();

      await i18nMiddleware(ctx as any, ctx.next);

      // TypeScript compile-time check
      const locale: 'en' | 'es' = ctx.locals.locale;
      expect(['en', 'es']).toContain(locale);
    });

    it('should set defaultLocale as Locale type', async () => {
      const ctx = createMockContext();

      await i18nMiddleware(ctx as any, ctx.next);

      const defaultLocale: 'en' | 'es' = ctx.locals.defaultLocale;
      expect(defaultLocale).toBe('en');
    });
  });
});
