/**
 * T171: Date/Time Formatting - Test Suite
 *
 * Tests locale-aware date and time formatting using Intl.DateTimeFormat.
 * Verifies correct formatting for English and Spanish locales.
 */

import { describe, it, expect } from 'vitest';
import {
  formatDateShort,
  formatDateMedium,
  formatDateLong,
  formatDateFull,
  formatTime,
  formatTimeWithSeconds,
  formatDateTime,
  formatDateTimeLong,
  formatRelativeTime,
  formatMonthYear,
  formatWeekday,
  formatDateRange,
  isToday,
  isPast,
  isFuture,
  daysBetween,
} from '../../src/lib/dateTimeFormat';

describe('T171: Date/Time Formatting', () => {
  const testDate = new Date('2025-11-02T14:30:45Z'); // Sunday, November 2, 2025, 2:30:45 PM
  const testDateString = '2025-11-02T14:30:45Z';

  describe('formatDateShort', () => {
    it('should format date in short format for English', () => {
      const result = formatDateShort(testDate, 'en');
      expect(result).toMatch(/11\/2\/2025/);
    });

    it('should format date in short format for Spanish', () => {
      const result = formatDateShort(testDate, 'es');
      expect(result).toMatch(/2\/11\/2025/);
    });

    it('should accept string dates', () => {
      const result = formatDateShort(testDateString, 'en');
      expect(result).toMatch(/11\/2\/2025/);
    });

    it('should default to English if no locale provided', () => {
      const result = formatDateShort(testDate);
      expect(result).toMatch(/11\/2\/2025/);
    });
  });

  describe('formatDateMedium', () => {
    it('should format date in medium format for English', () => {
      const result = formatDateMedium(testDate, 'en');
      expect(result).toContain('Nov');
      expect(result).toContain('2');
      expect(result).toContain('2025');
    });

    it('should format date in medium format for Spanish', () => {
      const result = formatDateMedium(testDate, 'es');
      expect(result).toContain('nov');
      expect(result).toContain('2');
      expect(result).toContain('2025');
    });
  });

  describe('formatDateLong', () => {
    it('should format date in long format for English', () => {
      const result = formatDateLong(testDate, 'en');
      expect(result).toContain('November');
      expect(result).toContain('2');
      expect(result).toContain('2025');
    });

    it('should format date in long format for Spanish', () => {
      const result = formatDateLong(testDate, 'es');
      expect(result).toContain('noviembre');
      expect(result).toContain('2');
      expect(result).toContain('2025');
    });
  });

  describe('formatDateFull', () => {
    it('should format date with weekday for English', () => {
      const result = formatDateFull(testDate, 'en');
      expect(result).toContain('Sunday');
      expect(result).toContain('November');
      expect(result).toContain('2');
      expect(result).toContain('2025');
    });

    it('should format date with weekday for Spanish', () => {
      const result = formatDateFull(testDate, 'es');
      expect(result).toContain('domingo');
      expect(result).toContain('noviembre');
      expect(result).toContain('2');
      expect(result).toContain('2025');
    });
  });

  describe('formatTime', () => {
    it('should format time for English', () => {
      const result = formatTime(testDate, 'en');
      // Time will vary based on timezone, just check it's formatted
      expect(result).toMatch(/\d{1,2}:\d{2}/);
      expect(typeof result).toBe('string');
    });

    it('should format time for Spanish', () => {
      const result = formatTime(testDate, 'es');
      // Time will vary based on timezone, just check it's formatted
      expect(result).toMatch(/\d{1,2}:\d{2}/);
      expect(typeof result).toBe('string');
    });

    it('should accept string dates', () => {
      const result = formatTime(testDateString, 'es');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatTimeWithSeconds', () => {
    it('should format time with seconds for English', () => {
      const result = formatTimeWithSeconds(testDate, 'en');
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
      expect(typeof result).toBe('string');
    });

    it('should format time with seconds for Spanish', () => {
      const result = formatTimeWithSeconds(testDate, 'es');
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time for English', () => {
      const result = formatDateTime(testDate, 'en');
      expect(result).toContain('Nov');
      expect(result).toContain('2');
      expect(result).toContain('2025');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should format date and time for Spanish', () => {
      const result = formatDateTime(testDate, 'es');
      expect(result).toContain('nov');
      expect(result).toContain('2');
      expect(result).toContain('2025');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatDateTimeLong', () => {
    it('should format long date and time for English', () => {
      const result = formatDateTimeLong(testDate, 'en');
      expect(result).toContain('November');
      expect(result).toContain('2');
      expect(result).toContain('2025');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should format long date and time for Spanish', () => {
      const result = formatDateTimeLong(testDate, 'es');
      expect(result).toContain('noviembre');
      expect(result).toContain('2');
      expect(result).toContain('2025');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('formatRelativeTime', () => {
    it('should format relative time for past dates in English', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const result = formatRelativeTime(pastDate, 'en');
      expect(result).toMatch(/hour|ago/i);
    });

    it('should format relative time for past dates in Spanish', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const result = formatRelativeTime(pastDate, 'es');
      expect(result).toMatch(/hora/i);
    });

    it('should format relative time for future dates in English', () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day from now
      const result = formatRelativeTime(futureDate, 'en');
      expect(result).toMatch(/day|tomorrow/i);
    });

    it('should format relative time for future dates in Spanish', () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day from now
      const result = formatRelativeTime(futureDate, 'es');
      expect(result).toMatch(/día|mañana/i);
    });

    it('should handle dates far in the past', () => {
      const pastDate = new Date(Date.now() - 31536000000); // 1 year ago
      const result = formatRelativeTime(pastDate, 'en');
      expect(result).toMatch(/year|ago/i);
    });

    it('should handle dates far in the future', () => {
      const futureDate = new Date(Date.now() + 31536000000); // 1 year from now
      const result = formatRelativeTime(futureDate, 'en');
      expect(result).toMatch(/year|in/i);
    });
  });

  describe('formatMonthYear', () => {
    it('should format month and year for English', () => {
      const result = formatMonthYear(testDate, 'en');
      expect(result).toContain('November');
      expect(result).toContain('2025');
    });

    it('should format month and year for Spanish', () => {
      const result = formatMonthYear(testDate, 'es');
      expect(result).toContain('noviembre');
      expect(result).toContain('2025');
    });
  });

  describe('formatWeekday', () => {
    it('should format weekday for English', () => {
      const result = formatWeekday(testDate, 'en');
      expect(result).toBe('Sunday');
    });

    it('should format weekday for Spanish', () => {
      const result = formatWeekday(testDate, 'es');
      expect(result).toBe('domingo');
    });

    it('should work with Monday', () => {
      const monday = new Date('2025-11-03');
      const resultEn = formatWeekday(monday, 'en');
      const resultEs = formatWeekday(monday, 'es');
      expect(resultEn).toBe('Monday');
      expect(resultEs).toBe('lunes');
    });
  });

  describe('formatDateRange', () => {
    it('should format date range in same month', () => {
      const start = new Date('2025-11-02');
      const end = new Date('2025-11-05');
      const result = formatDateRange(start, end, 'en');
      expect(result).toContain('Nov');
      expect(result).toContain('2');
      expect(result).toContain('5');
      expect(result).toContain('2025');
    });

    it('should format date range across months', () => {
      const start = new Date('2025-11-28');
      const end = new Date('2025-12-05');
      const result = formatDateRange(start, end, 'en');
      expect(result).toContain('Nov');
      expect(result).toContain('Dec');
    });

    it('should format date range across years', () => {
      const start = new Date('2025-12-28');
      const end = new Date('2026-01-05');
      const result = formatDateRange(start, end, 'en');
      expect(result).toContain('2025');
      expect(result).toContain('2026');
    });

    it('should work with Spanish locale', () => {
      const start = new Date('2025-11-02');
      const end = new Date('2025-11-05');
      const result = formatDateRange(start, end, 'es');
      expect(result).toContain('nov');
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });

    it('should work with string dates', () => {
      const todayStr = new Date().toISOString();
      expect(isToday(todayStr)).toBe(true);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      const past = new Date('2020-01-01');
      expect(isPast(past)).toBe(true);
    });

    it('should return false for future dates', () => {
      const future = new Date('2030-01-01');
      expect(isPast(future)).toBe(false);
    });

    it('should work with string dates', () => {
      expect(isPast('2020-01-01')).toBe(true);
      expect(isPast('2030-01-01')).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const future = new Date('2030-01-01');
      expect(isFuture(future)).toBe(true);
    });

    it('should return false for past dates', () => {
      const past = new Date('2020-01-01');
      expect(isFuture(past)).toBe(false);
    });

    it('should work with string dates', () => {
      expect(isFuture('2030-01-01')).toBe(true);
      expect(isFuture('2020-01-01')).toBe(false);
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between two dates', () => {
      const start = new Date('2025-11-01');
      const end = new Date('2025-11-05');
      expect(daysBetween(start, end)).toBe(4);
    });

    it('should return negative for reversed dates', () => {
      const start = new Date('2025-11-05');
      const end = new Date('2025-11-01');
      expect(daysBetween(start, end)).toBe(-4);
    });

    it('should return 0 for same date', () => {
      const date = new Date('2025-11-01');
      expect(daysBetween(date, date)).toBe(0);
    });

    it('should work with string dates', () => {
      expect(daysBetween('2025-11-01', '2025-11-05')).toBe(4);
    });

    it('should calculate days across months', () => {
      const start = new Date('2025-10-28');
      const end = new Date('2025-11-02');
      expect(daysBetween(start, end)).toBe(5);
    });

    it('should calculate days across years', () => {
      const start = new Date('2025-12-30');
      const end = new Date('2026-01-02');
      expect(daysBetween(start, end)).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year dates', () => {
      const leapDay = new Date('2024-02-29');
      const result = formatDateLong(leapDay, 'en');
      expect(result).toContain('February');
      expect(result).toContain('29');
    });

    it('should handle year boundaries', () => {
      const newYear = new Date('2025-01-01T00:00:00');
      const result = formatDateTime(newYear, 'en');
      expect(result).toContain('Jan');
      expect(result).toContain('1');
      expect(result).toContain('2025');
    });

    it('should handle midnight times', () => {
      const midnight = new Date('2025-11-02T00:00:00');
      const result = formatTime(midnight, 'en');
      expect(result).toMatch(/12:00|0:00/);
    });

    it('should handle noon times', () => {
      const noon = new Date('2025-11-02T12:00:00');
      const result = formatTime(noon, 'en');
      expect(result).toMatch(/12:00/);
    });
  });

  describe('Type Consistency', () => {
    it('all functions should return strings', () => {
      expect(typeof formatDateShort(testDate)).toBe('string');
      expect(typeof formatDateMedium(testDate)).toBe('string');
      expect(typeof formatDateLong(testDate)).toBe('string');
      expect(typeof formatDateFull(testDate)).toBe('string');
      expect(typeof formatTime(testDate)).toBe('string');
      expect(typeof formatTimeWithSeconds(testDate)).toBe('string');
      expect(typeof formatDateTime(testDate)).toBe('string');
      expect(typeof formatDateTimeLong(testDate)).toBe('string');
      expect(typeof formatRelativeTime(testDate)).toBe('string');
      expect(typeof formatMonthYear(testDate)).toBe('string');
      expect(typeof formatWeekday(testDate)).toBe('string');
    });

    it('boolean functions should return booleans', () => {
      expect(typeof isToday(testDate)).toBe('boolean');
      expect(typeof isPast(testDate)).toBe('boolean');
      expect(typeof isFuture(testDate)).toBe('boolean');
    });

    it('daysBetween should return a number', () => {
      expect(typeof daysBetween(testDate, testDate)).toBe('number');
    });
  });
});
