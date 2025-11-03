/**
 * Internationalized Content Utilities (T167)
 *
 * Helper functions to retrieve localized content from database entities
 * that have multilingual fields (courses, events, digital products).
 *
 * Pattern: For each translatable field, we store:
 * - English version in the base field (e.g., `title`)
 * - Spanish version in the `_es` field (e.g., `title_es`)
 * - Future languages can be added similarly (e.g., `title_fr`)
 *
 * These utilities automatically select the correct field based on the current locale,
 * falling back to English if the translation is not available.
 */

import type { Locale } from '../i18n';
import type { Course, Event, DigitalProduct } from '../types';

/**
 * Get localized field value from an entity
 *
 * @param entity - The entity containing multilingual fields
 * @param field - The base field name (e.g., 'title', 'description')
 * @param locale - The desired locale ('en' or 'es')
 * @returns The localized value, falling back to English if translation not available
 *
 * @example
 * const course = { title: 'Meditation 101', titleEs: 'Meditación 101' };
 * getLocalizedField(course, 'title', 'es'); // Returns: 'Meditación 101'
 * getLocalizedField(course, 'title', 'en'); // Returns: 'Meditation 101'
 */
export function getLocalizedField<T extends Record<string, any>>(
  entity: T,
  field: string,
  locale: Locale
): any {
  // For English or when locale is default, return the base field
  if (locale === 'en') {
    return entity[field];
  }

  // For other locales, try to get the localized version
  // Pattern: field + locale suffix (e.g., 'title' + 'Es' = 'titleEs')
  const localizedFieldName = field + locale.charAt(0).toUpperCase() + locale.slice(1);
  const localizedValue = entity[localizedFieldName as keyof T];

  // Fall back to English if translation doesn't exist or is empty
  if (localizedValue === null || localizedValue === undefined || localizedValue === '') {
    return entity[field];
  }

  return localizedValue;
}

/**
 * Get localized course title
 *
 * @param course - The course entity
 * @param locale - The desired locale
 * @returns Localized title or English fallback
 */
export function getCourseTitle(course: Partial<Course>, locale: Locale): string {
  return getLocalizedField(course, 'title', locale);
}

/**
 * Get localized course description
 *
 * @param course - The course entity
 * @param locale - The desired locale
 * @returns Localized description or English fallback
 */
export function getCourseDescription(course: Partial<Course>, locale: Locale): string {
  return getLocalizedField(course, 'description', locale);
}

/**
 * Get localized course long description
 *
 * @param course - The course entity
 * @param locale - The desired locale
 * @returns Localized long description or English fallback
 */
export function getCourseLongDescription(course: Partial<Course>, locale: Locale): string | undefined {
  return getLocalizedField(course, 'longDescription', locale);
}

/**
 * Get localized course learning outcomes
 *
 * @param course - The course entity
 * @param locale - The desired locale
 * @returns Localized learning outcomes array or English fallback
 */
export function getCourseLearningOutcomes(course: Partial<Course>, locale: Locale): string[] {
  return getLocalizedField(course, 'learningOutcomes', locale) || [];
}

/**
 * Get localized course prerequisites
 *
 * @param course - The course entity
 * @param locale - The desired locale
 * @returns Localized prerequisites array or English fallback
 */
export function getCoursePrerequisites(course: Partial<Course>, locale: Locale): string[] {
  return getLocalizedField(course, 'prerequisites', locale) || [];
}

/**
 * Get localized course curriculum
 *
 * @param course - The course entity
 * @param locale - The desired locale
 * @returns Localized curriculum or English fallback
 */
export function getCourseCurriculum(course: Partial<Course>, locale: Locale): any[] {
  return getLocalizedField(course, 'curriculum', locale) || [];
}

/**
 * Get localized event title
 *
 * @param event - The event entity
 * @param locale - The desired locale
 * @returns Localized title or English fallback
 */
export function getEventTitle(event: Partial<Event>, locale: Locale): string {
  return getLocalizedField(event, 'title', locale);
}

/**
 * Get localized event description
 *
 * @param event - The event entity
 * @param locale - The desired locale
 * @returns Localized description or English fallback
 */
export function getEventDescription(event: Partial<Event>, locale: Locale): string {
  return getLocalizedField(event, 'description', locale);
}

/**
 * Get localized event long description
 *
 * @param event - The event entity
 * @param locale - The desired locale
 * @returns Localized long description or English fallback
 */
export function getEventLongDescription(event: Partial<Event>, locale: Locale): string | undefined {
  return getLocalizedField(event, 'longDescription', locale);
}

/**
 * Get localized product title
 *
 * @param product - The digital product entity
 * @param locale - The desired locale
 * @returns Localized title or English fallback
 */
export function getProductTitle(product: Partial<DigitalProduct>, locale: Locale): string {
  return getLocalizedField(product, 'title', locale);
}

/**
 * Get localized product description
 *
 * @param product - The digital product entity
 * @param locale - The desired locale
 * @returns Localized description or English fallback
 */
export function getProductDescription(product: Partial<DigitalProduct>, locale: Locale): string {
  return getLocalizedField(product, 'description', locale);
}

/**
 * Get localized product long description
 *
 * @param product - The digital product entity
 * @param locale - The desired locale
 * @returns Localized long description or English fallback
 */
export function getProductLongDescription(product: Partial<DigitalProduct>, locale: Locale): string | undefined {
  return getLocalizedField(product, 'longDescription', locale);
}

/**
 * Get fully localized course object
 *
 * Returns a new course object with localized fields replacing the base fields.
 * This is useful when you want to display a course entirely in a specific language.
 *
 * @param course - The course entity with both English and translated fields
 * @param locale - The desired locale
 * @returns A new course object with localized content
 *
 * @example
 * const course = {
 *   id: '123',
 *   title: 'Meditation',
 *   titleEs: 'Meditación',
 *   description: 'Learn to meditate',
 *   descriptionEs: 'Aprende a meditar'
 * };
 *
 * const localizedCourse = getLocalizedCourse(course, 'es');
 * // Returns: { id: '123', title: 'Meditación', description: 'Aprende a meditar', ... }
 */
export function getLocalizedCourse(course: Course, locale: Locale): Course {
  if (locale === 'en') {
    return course;
  }

  return {
    ...course,
    title: getCourseTitle(course, locale),
    description: getCourseDescription(course, locale),
    longDescription: getCourseLongDescription(course, locale),
    learningOutcomes: getCourseLearningOutcomes(course, locale),
    prerequisites: getCoursePrerequisites(course, locale),
    curriculum: getCourseCurriculum(course, locale),
  };
}

/**
 * Get fully localized event object
 *
 * @param event - The event entity
 * @param locale - The desired locale
 * @returns A new event object with localized content
 */
export function getLocalizedEvent(event: Event, locale: Locale): Event {
  if (locale === 'en') {
    return event;
  }

  return {
    ...event,
    title: getEventTitle(event, locale),
    description: getEventDescription(event, locale),
    longDescription: getEventLongDescription(event, locale),
  };
}

/**
 * Get fully localized product object
 *
 * @param product - The digital product entity
 * @param locale - The desired locale
 * @returns A new product object with localized content
 */
export function getLocalizedProduct(product: DigitalProduct, locale: Locale): DigitalProduct {
  if (locale === 'en') {
    return product;
  }

  return {
    ...product,
    title: getProductTitle(product, locale),
    description: getProductDescription(product, locale),
    longDescription: getProductLongDescription(product, locale),
  };
}

/**
 * SQL helper: Get the correct column name for a locale
 *
 * This is useful when building SQL queries that need to select
 * the correct localized column.
 *
 * @param baseColumn - The base column name (e.g., 'title')
 * @param locale - The desired locale
 * @returns The column name to use in SQL (e.g., 'title_es')
 *
 * @example
 * const titleColumn = getSQLColumn('title', 'es'); // Returns: 'title_es'
 * const query = `SELECT ${titleColumn} FROM courses WHERE id = $1`;
 */
export function getSQLColumn(baseColumn: string, locale: Locale): string {
  if (locale === 'en') {
    return baseColumn;
  }

  // Convert camelCase to snake_case and add locale suffix
  // e.g., 'longDescription' -> 'long_description_es'
  const snakeCase = baseColumn.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  return `${snakeCase}_${locale}`;
}

/**
 * SQL helper: Get COALESCE expression for fallback
 *
 * Creates a SQL COALESCE expression that tries the localized column first,
 * then falls back to the English column if the translation is NULL or empty.
 *
 * @param baseColumn - The base column name
 * @param locale - The desired locale
 * @param alias - Optional alias for the result column
 * @returns SQL COALESCE expression
 *
 * @example
 * getSQLCoalesce('title', 'es', 'title');
 * // Returns: "COALESCE(NULLIF(title_es, ''), title) AS title"
 *
 * const query = `SELECT ${getSQLCoalesce('title', 'es')} FROM courses`;
 * // For Spanish: tries title_es first, falls back to title if empty/null
 */
export function getSQLCoalesce(baseColumn: string, locale: Locale, alias?: string): string {
  const resultAlias = alias || baseColumn;

  if (locale === 'en') {
    return `${baseColumn} AS ${resultAlias}`;
  }

  const localizedColumn = getSQLColumn(baseColumn, locale);
  return `COALESCE(NULLIF(${localizedColumn}, ''), ${baseColumn}) AS ${resultAlias}`;
}
