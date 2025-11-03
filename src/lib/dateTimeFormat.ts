/**
 * Date/Time Formatting Utilities (T171)
 *
 * Locale-aware date and time formatting using Intl.DateTimeFormat.
 * Provides consistent formatting across the application for different locales.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
 */

export type Locale = 'en' | 'es';

/**
 * Format a date in short format (e.g., "11/02/2025" for en, "02/11/2025" for es)
 *
 * @param date - Date to format
 * @param locale - Language code ('en' or 'es')
 * @returns Formatted date string
 *
 * @example
 * formatDateShort(new Date('2025-11-02'), 'en') // "11/2/2025"
 * formatDateShort(new Date('2025-11-02'), 'es') // "2/11/2025"
 */
export function formatDateShort(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Format a date in medium format (e.g., "Nov 2, 2025" for en, "2 nov 2025" for es)
 *
 * @param date - Date to format
 * @param locale - Language code ('en' or 'es')
 * @returns Formatted date string
 *
 * @example
 * formatDateMedium(new Date('2025-11-02'), 'en') // "Nov 2, 2025"
 * formatDateMedium(new Date('2025-11-02'), 'es') // "2 nov 2025"
 */
export function formatDateMedium(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Format a date in long format (e.g., "November 2, 2025" for en, "2 de noviembre de 2025" for es)
 *
 * @param date - Date to format
 * @param locale - Language code ('en' or 'es')
 * @returns Formatted date string
 *
 * @example
 * formatDateLong(new Date('2025-11-02'), 'en') // "November 2, 2025"
 * formatDateLong(new Date('2025-11-02'), 'es') // "2 de noviembre de 2025"
 */
export function formatDateLong(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Format a date in full format with weekday (e.g., "Saturday, November 2, 2025")
 *
 * @param date - Date to format
 * @param locale - Language code ('en' or 'es')
 * @returns Formatted date string
 *
 * @example
 * formatDateFull(new Date('2025-11-02'), 'en') // "Sunday, November 2, 2025"
 * formatDateFull(new Date('2025-11-02'), 'es') // "domingo, 2 de noviembre de 2025"
 */
export function formatDateFull(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Format time in short format (e.g., "2:30 PM" for en, "14:30" for es)
 *
 * @param date - Date/time to format
 * @param locale - Language code ('en' or 'es')
 * @returns Formatted time string
 *
 * @example
 * formatTime(new Date('2025-11-02T14:30:00'), 'en') // "2:30 PM"
 * formatTime(new Date('2025-11-02T14:30:00'), 'es') // "14:30"
 */
export function formatTime(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format time with seconds (e.g., "2:30:45 PM" for en, "14:30:45" for es)
 *
 * @param date - Date/time to format
 * @param locale - Language code ('en' or 'es')
 * @returns Formatted time string with seconds
 *
 * @example
 * formatTimeWithSeconds(new Date('2025-11-02T14:30:45'), 'en') // "2:30:45 PM"
 * formatTimeWithSeconds(new Date('2025-11-02T14:30:45'), 'es') // "14:30:45"
 */
export function formatTimeWithSeconds(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(dateObj);
}

/**
 * Format date and time together (e.g., "Nov 2, 2025, 2:30 PM")
 *
 * @param date - Date/time to format
 * @param locale - Language code ('en' or 'es')
 * @returns Formatted date and time string
 *
 * @example
 * formatDateTime(new Date('2025-11-02T14:30:00'), 'en') // "Nov 2, 2025, 2:30 PM"
 * formatDateTime(new Date('2025-11-02T14:30:00'), 'es') // "2 nov 2025, 14:30"
 */
export function formatDateTime(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format date and time in long format
 *
 * @param date - Date/time to format
 * @param locale - Language code ('en' or 'es')
 * @returns Formatted date and time string
 *
 * @example
 * formatDateTimeLong(new Date('2025-11-02T14:30:00'), 'en') // "November 2, 2025 at 2:30 PM"
 * formatDateTimeLong(new Date('2025-11-02T14:30:00'), 'es') // "2 de noviembre de 2025, 14:30"
 */
export function formatDateTimeLong(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format a relative time string (e.g., "2 hours ago", "in 3 days")
 *
 * @param date - Date to compare against now
 * @param locale - Language code ('en' or 'es')
 * @returns Relative time string
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000), 'en') // "1 hour ago"
 * formatRelativeTime(new Date(Date.now() + 86400000), 'es') // "en 1 día"
 */
export function formatRelativeTime(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  // Choose the appropriate unit based on the time difference
  if (Math.abs(diffYear) >= 1) {
    return rtf.format(diffYear, 'year');
  } else if (Math.abs(diffMonth) >= 1) {
    return rtf.format(diffMonth, 'month');
  } else if (Math.abs(diffWeek) >= 1) {
    return rtf.format(diffWeek, 'week');
  } else if (Math.abs(diffDay) >= 1) {
    return rtf.format(diffDay, 'day');
  } else if (Math.abs(diffHour) >= 1) {
    return rtf.format(diffHour, 'hour');
  } else if (Math.abs(diffMin) >= 1) {
    return rtf.format(diffMin, 'minute');
  } else {
    return rtf.format(diffSec, 'second');
  }
}

/**
 * Format month and year (e.g., "November 2025", "noviembre de 2025")
 *
 * @param date - Date to format
 * @param locale - Language code ('en' or 'es')
 * @returns Formatted month and year string
 *
 * @example
 * formatMonthYear(new Date('2025-11-02'), 'en') // "November 2025"
 * formatMonthYear(new Date('2025-11-02'), 'es') // "noviembre de 2025"
 */
export function formatMonthYear(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
  }).format(dateObj);
}

/**
 * Format weekday name (e.g., "Monday", "lunes")
 *
 * @param date - Date to format
 * @param locale - Language code ('en' or 'es')
 * @returns Weekday name
 *
 * @example
 * formatWeekday(new Date('2025-11-03'), 'en') // "Monday"
 * formatWeekday(new Date('2025-11-03'), 'es') // "lunes"
 */
export function formatWeekday(date: Date | string, locale: Locale = 'en'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
  }).format(dateObj);
}

/**
 * Format date range (e.g., "Nov 2 - Nov 5, 2025")
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @param locale - Language code ('en' or 'es')
 * @returns Formatted date range string
 *
 * @example
 * formatDateRange(new Date('2025-11-02'), new Date('2025-11-05'), 'en') // "Nov 2 – 5, 2025"
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  locale: Locale = 'en'
): string {
  const startObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const endObj = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Check if dates are in the same year and month
  const sameYear = startObj.getFullYear() === endObj.getFullYear();
  const sameMonth = sameYear && startObj.getMonth() === endObj.getMonth();

  if (sameMonth) {
    // Same month: "Nov 2 - 5, 2025"
    const startDay = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(startObj);
    const endFormatted = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(endObj);
    return `${startDay} – ${endFormatted}`;
  } else if (sameYear) {
    // Same year: "Nov 2 - Dec 5, 2025"
    const startFormatted = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
    }).format(startObj);
    const endFormatted = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(endObj);
    return `${startFormatted} – ${endFormatted}`;
  } else {
    // Different years: "Nov 2, 2025 - Jan 5, 2026"
    const startFormatted = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(startObj);
    const endFormatted = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(endObj);
    return `${startFormatted} – ${endFormatted}`;
  }
}

/**
 * Check if a date is today
 *
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();

  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is in the past
 *
 * @param date - Date to check
 * @returns True if date is in the past
 */
export function isPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 *
 * @param date - Date to check
 * @returns True if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.getTime() > Date.now();
}

/**
 * Get the number of days between two dates
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days (can be negative if endDate is before startDate)
 */
export function daysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
