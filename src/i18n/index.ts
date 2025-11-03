/**
 * T125: i18n (Internationalization) Utility Functions
 *
 * Provides simple, lightweight i18n support for the Spirituality Platform.
 * Supports English (en) and Spanish (es) translations.
 *
 * Future: Can be integrated with astro-i18next or similar frameworks.
 */

import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';

// Supported locales
export type Locale = 'en' | 'es';

// Default locale
export const DEFAULT_LOCALE: Locale = 'en';

// All available locales
export const LOCALES: Locale[] = ['en', 'es'];

// Locale display names
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

// Translation type (inferred from English translations)
export type Translations = typeof enTranslations;

// Translation map
const translations: Record<Locale, Translations> = {
  en: enTranslations,
  es: esTranslations,
};

/**
 * Get translations for a specific locale
 */
export function getTranslations(locale: Locale = DEFAULT_LOCALE): Translations {
  return translations[locale] || translations[DEFAULT_LOCALE];
}

/**
 * Get a translated string by key path
 * Supports nested keys with dot notation (e.g., 'common.welcome')
 * Supports variable interpolation with {{variable}} syntax
 *
 * @param locale - The locale to use
 * @param key - The translation key (supports dot notation)
 * @param variables - Optional variables for interpolation
 * @returns The translated string
 *
 * @example
 * t('en', 'common.welcome') // "Welcome"
 * t('es', 'common.welcome') // "Bienvenido"
 * t('en', 'dashboard.welcome', { name: 'John' }) // "Welcome back, John!"
 */
export function t(
  locale: Locale,
  key: string,
  variables?: Record<string, string | number>
): string {
  const trans = getTranslations(locale);

  // Navigate through nested keys
  const keys = key.split('.');
  let value: any = trans;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Key not found, return the key itself as fallback
      console.warn(`[i18n] Translation key not found: ${key} (locale: ${locale})`);
      return key;
    }
  }

  // If value is not a string, return the key
  if (typeof value !== 'string') {
    console.warn(`[i18n] Translation value is not a string: ${key} (locale: ${locale})`);
    return key;
  }

  // Replace variables if provided
  if (variables) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return varName in variables ? String(variables[varName]) : match;
    });
  }

  return value;
}

/**
 * Validate that a string is a supported locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}

/**
 * Get the locale from a request (from URL, cookie, or Accept-Language header)
 *
 * Priority:
 * 1. URL parameter (?lang=es)
 * 2. Cookie (locale cookie)
 * 3. Accept-Language header
 * 4. Default locale (en)
 *
 * @param url - The request URL
 * @param cookieLocale - Locale from cookie (if any)
 * @param acceptLanguage - Accept-Language header (if any)
 * @returns The determined locale
 */
export function getLocaleFromRequest(
  url: URL,
  cookieLocale?: string,
  acceptLanguage?: string
): Locale {
  // 1. Check URL parameter
  const urlLocale = url.searchParams.get('lang');
  if (urlLocale && isValidLocale(urlLocale)) {
    return urlLocale;
  }

  // 2. Check cookie
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }

  // 3. Check Accept-Language header
  if (acceptLanguage) {
    // Parse Accept-Language header (format: "en-US,en;q=0.9,es;q=0.8")
    const preferredLang = acceptLanguage
      .split(',')[0]
      .split('-')[0]
      .toLowerCase();

    if (isValidLocale(preferredLang)) {
      return preferredLang;
    }
  }

  // 4. Default
  return DEFAULT_LOCALE;
}

/**
 * Format a number according to locale
 *
 * @param locale - The locale to use
 * @param value - The number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format currency according to locale
 *
 * @param locale - The locale to use
 * @param value - The amount in cents
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(
  locale: Locale,
  value: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value / 100); // Convert cents to dollars
}

/**
 * Format a date according to locale
 *
 * @param locale - The locale to use
 * @param date - The date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  locale: Locale,
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format a relative time according to locale (e.g., "2 days ago")
 *
 * @param locale - The locale to use
 * @param date - The date to compare
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  locale: Locale,
  date: Date | string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffYear) >= 1) return rtf.format(-diffYear, 'year');
  if (Math.abs(diffMonth) >= 1) return rtf.format(-diffMonth, 'month');
  if (Math.abs(diffDay) >= 1) return rtf.format(-diffDay, 'day');
  if (Math.abs(diffHour) >= 1) return rtf.format(-diffHour, 'hour');
  if (Math.abs(diffMin) >= 1) return rtf.format(-diffMin, 'minute');
  return rtf.format(-diffSec, 'second');
}

/**
 * Get locale-specific route path
 * Useful for generating URLs with locale prefixes
 *
 * @param locale - The locale
 * @param path - The path (without locale)
 * @returns The full path with locale prefix (if not default locale)
 *
 * @example
 * getLocalizedPath('en', '/courses') // "/courses" (default locale, no prefix)
 * getLocalizedPath('es', '/courses') // "/es/courses"
 */
export function getLocalizedPath(locale: Locale, path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Don't add prefix for default locale
  if (locale === DEFAULT_LOCALE) {
    return normalizedPath;
  }

  return `/${locale}${normalizedPath}`;
}

/**
 * Extract locale from a URL path
 *
 * @param path - The URL path
 * @returns The locale and the path without locale prefix
 *
 * @example
 * extractLocaleFromPath('/es/courses') // { locale: 'es', path: '/courses' }
 * extractLocaleFromPath('/courses') // { locale: 'en', path: '/courses' }
 */
export function extractLocaleFromPath(path: string): { locale: Locale; path: string } {
  const segments = path.split('/').filter(Boolean);

  if (segments.length > 0 && isValidLocale(segments[0])) {
    const locale = segments[0] as Locale;
    const remainingPath = '/' + segments.slice(1).join('/');
    return { locale, path: remainingPath };
  }

  return { locale: DEFAULT_LOCALE, path };
}
