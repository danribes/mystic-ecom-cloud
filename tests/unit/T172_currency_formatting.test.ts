/**
 * T172: Currency Formatting Tests
 * Tests for locale-aware currency formatting using Intl.NumberFormat
 */

import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyWhole,
  formatCurrencyAccounting,
  formatCurrencyWithDecimals,
  formatCurrencyCompact,
  formatDecimal,
  formatPercent,
  formatNumber,
  formatPriceRange,
  getCurrencySymbol,
  getCurrencyName,
  parseCurrency,
  isValidPrice,
  calculateDiscount,
  formatDiscount,
  calculateTax,
  calculateTotalWithTax,
  formatPriceWithTax,
  getDefaultCurrency,
} from '@/lib/currencyFormat';

describe('Currency Formatting (T172)', () => {
  const testAmount = 1234.56;

  describe('formatCurrency', () => {
    it('should format USD in English', () => {
      const result = formatCurrency(testAmount, 'en', 'USD');
      expect(result).toContain('1,234');
      expect(result).toContain('56');
      expect(result).toContain('$');
    });

    it('should format MXN in Spanish', () => {
      const result = formatCurrency(testAmount, 'es', 'MXN');
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('56');
      // Spanish locale may show MXN or $
      expect(result).toMatch(/MXN|\$/);
    });

    it('should format EUR in English', () => {
      const result = formatCurrency(testAmount, 'en', 'EUR');
      expect(result).toContain('1,234');
      expect(result).toContain('56');
      expect(result).toContain('€');
    });

    it('should format GBP in English', () => {
      const result = formatCurrency(testAmount, 'en', 'GBP');
      expect(result).toContain('1,234');
      expect(result).toContain('56');
      expect(result).toContain('£');
    });

    it('should use default currency for locale when not specified', () => {
      const resultEn = formatCurrency(testAmount, 'en');
      expect(resultEn).toContain('$'); // USD

      const resultEs = formatCurrency(testAmount, 'es');
      // Spanish locale may show MXN or $
      expect(resultEs).toMatch(/MXN|\$/);
    });

    it('should default to English locale', () => {
      const result = formatCurrency(testAmount);
      expect(result).toContain('$');
      expect(typeof result).toBe('string');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0, 'en', 'USD');
      expect(result).toContain('0');
      expect(result).toContain('$');
    });

    it('should handle negative values', () => {
      const result = formatCurrency(-100, 'en', 'USD');
      expect(result).toContain('100');
      expect(result).toContain('$');
    });
  });

  describe('formatCurrencyWhole', () => {
    it('should format without decimals in English', () => {
      const result = formatCurrencyWhole(1234.56, 'en', 'USD');
      expect(result).toContain('1,235'); // Rounded
      expect(result).toContain('$');
      expect(result).not.toContain('.56');
    });

    it('should format without decimals in Spanish', () => {
      const result = formatCurrencyWhole(1234.56, 'es', 'EUR');
      expect(result).toContain('1');
      expect(result).toContain('235');
      expect(result).toContain('€');
    });

    it('should round correctly', () => {
      const result = formatCurrencyWhole(99.5, 'en', 'USD');
      expect(result).toContain('100');
    });
  });

  describe('formatCurrencyAccounting', () => {
    it('should format positive values normally', () => {
      const result = formatCurrencyAccounting(100, 'en', 'USD');
      expect(result).toContain('100');
      expect(result).toContain('$');
      expect(result).not.toContain('(');
    });

    it('should format negative values with parentheses', () => {
      const result = formatCurrencyAccounting(-100, 'en', 'USD');
      expect(result).toContain('100');
      expect(result).toContain('$');
      expect(result).toContain('(');
      expect(result).toContain(')');
    });
  });

  describe('formatCurrencyWithDecimals', () => {
    it('should format with 3 decimals', () => {
      const result = formatCurrencyWithDecimals(1234.5678, 3, 'en', 'USD');
      expect(result).toContain('1,234');
      expect(result).toContain('568');
    });

    it('should format with 0 decimals', () => {
      const result = formatCurrencyWithDecimals(1234.56, 0, 'en', 'USD');
      expect(result).toContain('1,235');
      expect(result).not.toContain('.');
    });

    it('should pad with zeros if needed', () => {
      const result = formatCurrencyWithDecimals(1234.5, 4, 'en', 'USD');
      expect(result).toContain('1,234');
      expect(result).toContain('5000');
    });
  });

  describe('formatCurrencyCompact', () => {
    it('should format thousands with K', () => {
      const result = formatCurrencyCompact(1234, 'en', 'USD');
      expect(result).toMatch(/\$.*1.*K/);
    });

    it('should format millions with M', () => {
      const result = formatCurrencyCompact(1234567, 'en', 'USD');
      expect(result).toMatch(/\$.*1.*M/);
    });

    it('should format billions with B', () => {
      const result = formatCurrencyCompact(1234567890, 'en', 'USD');
      expect(result).toMatch(/\$.*1.*B/);
    });

    it('should work with Spanish locale', () => {
      const result = formatCurrencyCompact(1234567, 'es', 'EUR');
      expect(result).toContain('M');
      expect(result).toContain('€');
    });
  });

  describe('formatDecimal', () => {
    it('should format decimal in English', () => {
      const result = formatDecimal(1234.56, 'en');
      expect(result).toBe('1,234.56');
    });

    it('should format decimal in Spanish', () => {
      const result = formatDecimal(1234.56, 'es');
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('56');
    });

    it('should respect custom decimal places', () => {
      const result = formatDecimal(1234.567, 'en', 3);
      expect(result).toBe('1,234.567');
    });

    it('should default to 2 decimals', () => {
      const result = formatDecimal(1234, 'en');
      expect(result).toBe('1,234.00');
    });
  });

  describe('formatPercent', () => {
    it('should format percentage in English', () => {
      const result = formatPercent(0.15, 'en');
      expect(result).toContain('15');
      expect(result).toContain('%');
    });

    it('should format percentage in Spanish', () => {
      const result = formatPercent(0.15, 'es');
      expect(result).toContain('15');
      expect(result).toContain('%');
    });

    it('should respect decimal places', () => {
      const result = formatPercent(0.1567, 'en', 2);
      expect(result).toContain('15.67');
      expect(result).toContain('%');
    });

    it('should default to 0 decimals', () => {
      const result = formatPercent(0.1567, 'en');
      expect(result).toContain('16'); // Rounded
      expect(result).toContain('%');
    });

    it('should handle values over 100%', () => {
      const result = formatPercent(1.5, 'en');
      expect(result).toContain('150');
      expect(result).toContain('%');
    });
  });

  describe('formatNumber', () => {
    it('should format number in English', () => {
      const result = formatNumber(1234567, 'en');
      expect(result).toBe('1,234,567');
    });

    it('should format number in Spanish', () => {
      const result = formatNumber(1234567, 'es');
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('567');
    });

    it('should not include decimals', () => {
      const result = formatNumber(1234.56, 'en');
      expect(result).toBe('1,235');
    });
  });

  describe('formatPriceRange', () => {
    it('should format price range in English', () => {
      const result = formatPriceRange(10, 100, 'en', 'USD');
      expect(result).toContain('$10');
      expect(result).toContain('$100');
      expect(result).toContain('-');
    });

    it('should format price range in Spanish', () => {
      const result = formatPriceRange(10, 100, 'es', 'EUR');
      expect(result).toContain('10');
      expect(result).toContain('100');
      expect(result).toContain('€');
      expect(result).toContain('-');
    });

    it('should use default currency', () => {
      const result = formatPriceRange(10, 100, 'en');
      expect(result).toContain('$');
    });
  });

  describe('getCurrencySymbol', () => {
    it('should get USD symbol', () => {
      const result = getCurrencySymbol('USD', 'en');
      expect(result).toBe('$');
    });

    it('should get EUR symbol', () => {
      const result = getCurrencySymbol('EUR', 'en');
      expect(result).toBe('€');
    });

    it('should get GBP symbol', () => {
      const result = getCurrencySymbol('GBP', 'en');
      expect(result).toBe('£');
    });

    it('should work with different locales', () => {
      const result = getCurrencySymbol('USD', 'es');
      // Spanish locale may show US$ instead of $
      expect(result).toMatch(/US\$|\$/);
    });
  });

  describe('getCurrencyName', () => {
    it('should get currency name in English', () => {
      const result = getCurrencyName('USD', 'en');
      expect(result.toLowerCase()).toContain('dollar');
    });

    it('should get currency name in Spanish', () => {
      const result = getCurrencyName('USD', 'es');
      expect(result.toLowerCase()).toContain('dólar');
    });

    it('should work with EUR', () => {
      const result = getCurrencyName('EUR', 'en');
      expect(result.toLowerCase()).toContain('euro');
    });
  });

  describe('parseCurrency', () => {
    it('should parse English currency format', () => {
      const result = parseCurrency('$1,234.56', 'en');
      expect(result).toBe(1234.56);
    });

    it('should parse Spanish currency format', () => {
      const result = parseCurrency('1.234,56 €', 'es');
      expect(result).toBe(1234.56);
    });

    it('should handle currency without thousands separator', () => {
      const result = parseCurrency('$123.45', 'en');
      expect(result).toBe(123.45);
    });

    it('should return NaN for invalid input', () => {
      const result = parseCurrency('invalid', 'en');
      expect(isNaN(result)).toBe(true);
    });

    it('should handle negative values', () => {
      const result = parseCurrency('-$100.00', 'en');
      expect(result).toBe(-100);
    });
  });

  describe('isValidPrice', () => {
    it('should return true for positive numbers', () => {
      expect(isValidPrice(10.5)).toBe(true);
      expect(isValidPrice(100)).toBe(true);
    });

    it('should return true for zero', () => {
      expect(isValidPrice(0)).toBe(true);
    });

    it('should return false for negative numbers', () => {
      expect(isValidPrice(-5)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(isValidPrice(NaN)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(isValidPrice(Infinity)).toBe(false);
      expect(isValidPrice(-Infinity)).toBe(false);
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate discount percentage', () => {
      const result = calculateDiscount(100, 80);
      expect(result).toBe(0.2);
    });

    it('should calculate 50% discount', () => {
      const result = calculateDiscount(100, 50);
      expect(result).toBe(0.5);
    });

    it('should return 0 for no discount', () => {
      const result = calculateDiscount(100, 100);
      expect(result).toBe(0);
    });

    it('should return 0 for invalid prices', () => {
      expect(calculateDiscount(0, 10)).toBe(0);
      expect(calculateDiscount(100, -10)).toBe(0);
      expect(calculateDiscount(100, 150)).toBe(0);
    });
  });

  describe('formatDiscount', () => {
    it('should format discount as percentage', () => {
      const result = formatDiscount(100, 80, 'en');
      expect(result).toContain('20');
      expect(result).toContain('%');
    });

    it('should format 50% discount', () => {
      const result = formatDiscount(100, 50, 'en');
      expect(result).toContain('50');
      expect(result).toContain('%');
    });

    it('should work with Spanish locale', () => {
      const result = formatDiscount(100, 75, 'es');
      expect(result).toContain('25');
      expect(result).toContain('%');
    });
  });

  describe('calculateTax', () => {
    it('should calculate 15% tax', () => {
      const result = calculateTax(100, 0.15);
      expect(result).toBe(15);
    });

    it('should calculate 8% tax', () => {
      const result = calculateTax(50, 0.08);
      expect(result).toBe(4);
    });

    it('should handle decimal amounts', () => {
      const result = calculateTax(99.99, 0.1);
      expect(result).toBeCloseTo(9.999, 2);
    });
  });

  describe('calculateTotalWithTax', () => {
    it('should calculate total with 15% tax', () => {
      const result = calculateTotalWithTax(100, 0.15);
      expect(result).toBeCloseTo(115, 2);
    });

    it('should calculate total with 8% tax', () => {
      const result = calculateTotalWithTax(50, 0.08);
      expect(result).toBe(54);
    });

    it('should handle decimal amounts', () => {
      const result = calculateTotalWithTax(99.99, 0.1);
      expect(result).toBeCloseTo(109.989, 2);
    });
  });

  describe('formatPriceWithTax', () => {
    it('should format price breakdown with tax', () => {
      const result = formatPriceWithTax(100, 0.15, 'en', 'USD');
      expect(result.base).toContain('100');
      expect(result.base).toContain('$');
      expect(result.tax).toContain('15');
      expect(result.tax).toContain('$');
      expect(result.total).toContain('115');
      expect(result.total).toContain('$');
    });

    it('should work with Spanish locale', () => {
      const result = formatPriceWithTax(100, 0.16, 'es', 'EUR');
      expect(result.base).toContain('100');
      expect(result.tax).toContain('16');
      expect(result.total).toContain('116');
      expect(result.base).toContain('€');
    });

    it('should use default currency', () => {
      const result = formatPriceWithTax(100, 0.15, 'en');
      expect(result.base).toContain('$');
      expect(result.tax).toContain('$');
      expect(result.total).toContain('$');
    });
  });

  describe('getDefaultCurrency', () => {
    it('should return USD for English', () => {
      expect(getDefaultCurrency('en')).toBe('USD');
    });

    it('should return MXN for Spanish', () => {
      expect(getDefaultCurrency('es')).toBe('MXN');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const result = formatCurrency(999999999.99, 'en', 'USD');
      expect(result).toContain('999,999,999');
    });

    it('should handle very small decimals', () => {
      const result = formatCurrency(0.01, 'en', 'USD');
      expect(result).toContain('0.01');
    });

    it('should handle zero correctly', () => {
      expect(formatCurrency(0, 'en', 'USD')).toContain('0');
      expect(formatPercent(0, 'en')).toContain('0');
      expect(formatDecimal(0, 'en')).toBe('0.00');
    });

    it('should handle fractional cents', () => {
      const result = formatCurrency(1.999, 'en', 'USD');
      expect(result).toContain('2.00');
    });
  });

  describe('Type Consistency', () => {
    it('should always return strings for formatting functions', () => {
      expect(typeof formatCurrency(100, 'en', 'USD')).toBe('string');
      expect(typeof formatDecimal(100, 'en')).toBe('string');
      expect(typeof formatPercent(0.5, 'en')).toBe('string');
      expect(typeof formatNumber(100, 'en')).toBe('string');
      expect(typeof getCurrencySymbol('USD', 'en')).toBe('string');
      expect(typeof getCurrencyName('USD', 'en')).toBe('string');
    });

    it('should return numbers for calculation functions', () => {
      expect(typeof calculateDiscount(100, 80)).toBe('number');
      expect(typeof calculateTax(100, 0.15)).toBe('number');
      expect(typeof calculateTotalWithTax(100, 0.15)).toBe('number');
      expect(typeof parseCurrency('$100', 'en')).toBe('number');
    });

    it('should return boolean for validation functions', () => {
      expect(typeof isValidPrice(100)).toBe('boolean');
      expect(typeof isValidPrice(-100)).toBe('boolean');
    });
  });
});
