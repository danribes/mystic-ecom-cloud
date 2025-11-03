/**
 * T173: Page Translation Helpers
 *
 * Helper utilities to make using translations in Astro pages easier.
 * Provides a convenient way to get the translate function with the current locale.
 */

import { t, type Locale } from '@/i18n';

/**
 * Create a translation function bound to a specific locale
 *
 * @param locale - The locale to use for translations
 * @returns A translation function pre-bound to the locale
 *
 * @example
 * const translate = getTranslate(Astro.locals.locale || 'en');
 * const title = translate('home.heroTitle');
 */
export function getTranslate(locale: Locale) {
  return (key: string, variables?: Record<string, string | number>) =>
    t(locale, key, variables);
}

/**
 * Get the locale from Astro.locals with fallback
 *
 * @param locals - Astro.locals object
 * @returns The locale (defaults to 'en')
 */
export function getLocale(locals: any): Locale {
  return (locals?.locale as Locale) || 'en';
}

/**
 * Shorthand to get both locale and translate function
 *
 * @param locals - Astro.locals object
 * @returns Object with locale and translate function
 *
 * @example
 * const { locale, t: translate } = useTranslations(Astro.locals);
 * const title = translate('home.heroTitle');
 */
export function useTranslations(locals: any) {
  const locale = getLocale(locals);
  const translate = getTranslate(locale);
  return { locale, t: translate };
}
