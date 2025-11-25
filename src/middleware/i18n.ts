/**
 * Internationalization (i18n) Middleware
 *
 * Detects user's preferred language and adds locale information to request context.
 * Integrates with T125 i18n infrastructure.
 *
 * Features:
 * - Multi-source locale detection (URL, cookie, Accept-Language header)
 * - Cookie-based locale persistence
 * - Request context enrichment
 * - Locale validation and fallback
 *
 * WCAG 2.1 Compliance:
 * - 3.1.1 Language of Page (Level A)
 * - 3.1.2 Language of Parts (Level AA)
 */

import type { MiddlewareHandler } from 'astro';
import { defineMiddleware } from 'astro:middleware';
import {
  type Locale,
  DEFAULT_LOCALE,
  isValidLocale,
  getLocaleFromRequest,
  extractLocaleFromPath,
} from '../i18n';

/**
 * Locale cookie configuration
 */
const LOCALE_COOKIE_NAME = 'locale';
const LOCALE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Extended Astro.locals with locale information
 */
declare global {
  namespace App {
    interface Locals {
      locale: Locale;
      defaultLocale: Locale;
    }
  }
}

/**
 * i18n Middleware Handler
 *
 * Detects user's preferred locale from multiple sources and adds it to request context.
 * Priority: URL prefix > URL parameter > Cookie > Accept-Language > Default
 */
export const i18nMiddleware: MiddlewareHandler = async ({ request, cookies, locals, url }, next) => {
  try {
    // Step 1: Extract locale from URL path (e.g., /es/courses)
    const { locale: pathLocale, path: cleanPath } = extractLocaleFromPath(url.pathname);

    // Step 2: Get locale from cookie
    const cookieLocale = cookies.get(LOCALE_COOKIE_NAME)?.value;

    // Step 3: Get Accept-Language header
    const acceptLanguage = request.headers.get('accept-language') || undefined;

    // Step 4: Detect locale with priority order
    let detectedLocale: Locale;

    if (pathLocale !== DEFAULT_LOCALE) {
      // URL path has explicit locale prefix (e.g., /es/courses)
      detectedLocale = pathLocale;
    } else {
      // No URL prefix, check other sources
      detectedLocale = getLocaleFromRequest(url, cookieLocale, acceptLanguage);
    }

    // Step 5: Add locale to request context
    locals.locale = detectedLocale;
    locals.defaultLocale = DEFAULT_LOCALE;

    // Step 6: Persist locale in cookie if changed or not set
    const currentCookieLocale = cookies.get(LOCALE_COOKIE_NAME)?.value;
    if (currentCookieLocale !== detectedLocale) {
      try {
        cookies.set(LOCALE_COOKIE_NAME, detectedLocale, {
          path: '/',
          maxAge: LOCALE_COOKIE_MAX_AGE,
          httpOnly: false, // Allow JavaScript access for client-side language switching
          sameSite: 'lax',
          // Use environment detection that works in all environments
          secure: process.env.NODE_ENV === 'production' || process.env.CF_PAGES === '1',
        });
      } catch (cookieError) {
        // Cookie setting failed, but don't block the request
        console.warn('[i18n] Failed to set locale cookie:', cookieError);
      }
    }

    // Step 7: Continue to next middleware/route
    const response = await next();

    // Step 8: Add Content-Language header to response (WCAG 3.1.1)
    try {
      response.headers.set('Content-Language', detectedLocale);
    } catch (headerError) {
      // Header setting failed, but don't block the response
      console.warn('[i18n] Failed to set Content-Language header:', headerError);
    }

    return response;
  } catch (error) {
    // If i18n middleware fails, log error but continue with defaults
    console.error('[i18n] Middleware error:', error);

    // Set default locale
    locals.locale = DEFAULT_LOCALE;
    locals.defaultLocale = DEFAULT_LOCALE;

    // Continue to next middleware
    return await next();
  }
};

/**
 * Astro middleware definition
 */
export const onRequest = defineMiddleware(i18nMiddleware);
