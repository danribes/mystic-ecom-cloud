/**
 * Currency Formatting Utilities
 * T172: Add currency formatting per locale (Intl.NumberFormat)
 *
 * Provides locale-aware currency formatting using native Intl.NumberFormat API.
 * Supports multiple currencies and locales with automatic formatting rules.
 */

import type { Locale } from './i18n';

/**
 * Supported currency codes (ISO 4217)
 */
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'MXN' | 'CAD' | 'AUD';

/**
 * Currency configuration mapping locale to default currency
 */
const LOCALE_CURRENCY_MAP: Record<Locale, CurrencyCode> = {
  en: 'USD',
  es: 'MXN', // Mexican Peso for Spanish locale
};

/**
 * Format a number as currency with locale-specific formatting
 *
 * @param amount - The amount to format
 * @param locale - The locale for formatting (defaults to 'en')
 * @param currency - The currency code (defaults to locale's default currency)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, 'en', 'USD'); // "$1,234.56"
 * formatCurrency(1234.56, 'es', 'MXN'); // "$1,234.56"
 * formatCurrency(1234.56, 'en', 'EUR'); // "€1,234.56"
 */
export function formatCurrency(
  amount: number,
  locale: Locale = 'en',
  currency?: CurrencyCode
): string {
  const currencyCode = currency || LOCALE_CURRENCY_MAP[locale];

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

/**
 * Format a number as currency without decimals
 *
 * @param amount - The amount to format
 * @param locale - The locale for formatting (defaults to 'en')
 * @param currency - The currency code (defaults to locale's default currency)
 * @returns Formatted currency string without decimal places
 *
 * @example
 * formatCurrencyWhole(1234.56, 'en', 'USD'); // "$1,235"
 * formatCurrencyWhole(1234.56, 'es', 'MXN'); // "$1,235"
 */
export function formatCurrencyWhole(
  amount: number,
  locale: Locale = 'en',
  currency?: CurrencyCode
): string {
  const currencyCode = currency || LOCALE_CURRENCY_MAP[locale];

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as currency with accounting notation (negative values in parentheses)
 *
 * @param amount - The amount to format
 * @param locale - The locale for formatting (defaults to 'en')
 * @param currency - The currency code (defaults to locale's default currency)
 * @returns Formatted currency string in accounting notation
 *
 * @example
 * formatCurrencyAccounting(-1234.56, 'en', 'USD'); // "($1,234.56)"
 * formatCurrencyAccounting(1234.56, 'en', 'USD'); // "$1,234.56"
 */
export function formatCurrencyAccounting(
  amount: number,
  locale: Locale = 'en',
  currency?: CurrencyCode
): string {
  const currencyCode = currency || LOCALE_CURRENCY_MAP[locale];

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    currencySign: 'accounting',
  }).format(amount);
}

/**
 * Format a number as currency with a specific number of decimal places
 *
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (0-20)
 * @param locale - The locale for formatting (defaults to 'en')
 * @param currency - The currency code (defaults to locale's default currency)
 * @returns Formatted currency string with specified decimals
 *
 * @example
 * formatCurrencyWithDecimals(1234.5678, 3, 'en', 'USD'); // "$1,234.568"
 * formatCurrencyWithDecimals(1234.5, 4, 'en', 'USD'); // "$1,234.5000"
 */
export function formatCurrencyWithDecimals(
  amount: number,
  decimals: number,
  locale: Locale = 'en',
  currency?: CurrencyCode
): string {
  const currencyCode = currency || LOCALE_CURRENCY_MAP[locale];

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format a number as currency with compact notation (K, M, B)
 *
 * @param amount - The amount to format
 * @param locale - The locale for formatting (defaults to 'en')
 * @param currency - The currency code (defaults to locale's default currency)
 * @returns Formatted compact currency string
 *
 * @example
 * formatCurrencyCompact(1234, 'en', 'USD'); // "$1.2K"
 * formatCurrencyCompact(1234567, 'en', 'USD'); // "$1.2M"
 * formatCurrencyCompact(1234567890, 'en', 'USD'); // "$1.2B"
 */
export function formatCurrencyCompact(
  amount: number,
  locale: Locale = 'en',
  currency?: CurrencyCode
): string {
  const currencyCode = currency || LOCALE_CURRENCY_MAP[locale];

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Format a number as decimal (no currency symbol)
 *
 * @param amount - The number to format
 * @param locale - The locale for formatting (defaults to 'en')
 * @param decimals - Number of decimal places (defaults to 2)
 * @returns Formatted decimal string
 *
 * @example
 * formatDecimal(1234.56, 'en'); // "1,234.56"
 * formatDecimal(1234.56, 'es'); // "1.234,56"
 * formatDecimal(1234.567, 'en', 3); // "1,234.567"
 */
export function formatDecimal(
  amount: number,
  locale: Locale = 'en',
  decimals: number = 2
): string {
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format a number as percentage
 *
 * @param value - The value to format (0.15 = 15%)
 * @param locale - The locale for formatting (defaults to 'en')
 * @param decimals - Number of decimal places (defaults to 0)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercent(0.15, 'en'); // "15%"
 * formatPercent(0.1567, 'en', 2); // "15.67%"
 * formatPercent(0.15, 'es'); // "15 %"
 */
export function formatPercent(
  value: number,
  locale: Locale = 'en',
  decimals: number = 0
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number with thousands separators
 *
 * @param amount - The number to format
 * @param locale - The locale for formatting (defaults to 'en')
 * @returns Formatted number string with thousand separators
 *
 * @example
 * formatNumber(1234567, 'en'); // "1,234,567"
 * formatNumber(1234567, 'es'); // "1.234.567"
 */
export function formatNumber(amount: number, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a price range
 *
 * @param minPrice - Minimum price
 * @param maxPrice - Maximum price
 * @param locale - The locale for formatting (defaults to 'en')
 * @param currency - The currency code (defaults to locale's default currency)
 * @returns Formatted price range string
 *
 * @example
 * formatPriceRange(10, 100, 'en', 'USD'); // "$10 - $100"
 * formatPriceRange(10, 100, 'es', 'EUR'); // "10 € - 100 €"
 */
export function formatPriceRange(
  minPrice: number,
  maxPrice: number,
  locale: Locale = 'en',
  currency?: CurrencyCode
): string {
  const min = formatCurrency(minPrice, locale, currency);
  const max = formatCurrency(maxPrice, locale, currency);
  return `${min} - ${max}`;
}

/**
 * Get the currency symbol for a given currency code
 *
 * @param currency - The currency code
 * @param locale - The locale for formatting (defaults to 'en')
 * @returns Currency symbol
 *
 * @example
 * getCurrencySymbol('USD', 'en'); // "$"
 * getCurrencySymbol('EUR', 'en'); // "€"
 * getCurrencySymbol('GBP', 'en'); // "£"
 */
export function getCurrencySymbol(
  currency: CurrencyCode,
  locale: Locale = 'en'
): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'symbol',
  }).format(0);

  // Extract just the currency symbol
  return formatted.replace(/[\d.,\s]/g, '');
}

/**
 * Get the currency name for a given currency code
 *
 * @param currency - The currency code
 * @param locale - The locale for formatting (defaults to 'en')
 * @returns Currency name
 *
 * @example
 * getCurrencyName('USD', 'en'); // "US Dollar"
 * getCurrencyName('EUR', 'en'); // "Euro"
 * getCurrencyName('MXN', 'es'); // "peso mexicano"
 */
export function getCurrencyName(
  currency: CurrencyCode,
  locale: Locale = 'en'
): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'name',
  }).format(0);

  // Extract the currency name (remove digits, symbols, and common formatting)
  return formatted.replace(/[\d.,\s$€£]/g, '').trim();
}

/**
 * Parse a formatted currency string to a number
 * Note: This is a simple implementation and may not work for all locales/formats
 *
 * @param currencyString - The formatted currency string
 * @param locale - The locale used for formatting (defaults to 'en')
 * @returns Parsed number or NaN if parsing fails
 *
 * @example
 * parseCurrency("$1,234.56", 'en'); // 1234.56
 * parseCurrency("1.234,56 €", 'es'); // 1234.56
 */
export function parseCurrency(
  currencyString: string,
  locale: Locale = 'en'
): number {
  // Remove currency symbols and common characters
  let cleaned = currencyString.replace(/[^\d.,-]/g, '');

  // Handle different decimal separators based on locale
  if (locale === 'es') {
    // Spanish uses . for thousands and , for decimal
    cleaned = cleaned.replace(/\./g, '').replace(/,/, '.');
  } else {
    // English uses , for thousands and . for decimal
    cleaned = cleaned.replace(/,/g, '');
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? NaN : parsed;
}

/**
 * Check if a value is a valid price (positive number)
 *
 * @param value - The value to check
 * @returns True if valid price, false otherwise
 *
 * @example
 * isValidPrice(10.5); // true
 * isValidPrice(-5); // false
 * isValidPrice(0); // true
 * isValidPrice(NaN); // false
 */
export function isValidPrice(value: number): boolean {
  return !isNaN(value) && isFinite(value) && value >= 0;
}

/**
 * Calculate discount percentage
 *
 * @param originalPrice - Original price
 * @param discountedPrice - Discounted price
 * @returns Discount percentage (0-1 scale)
 *
 * @example
 * calculateDiscount(100, 80); // 0.2 (20% discount)
 * calculateDiscount(50, 40); // 0.2 (20% discount)
 */
export function calculateDiscount(
  originalPrice: number,
  discountedPrice: number
): number {
  if (originalPrice <= 0 || discountedPrice < 0 || discountedPrice > originalPrice) {
    return 0;
  }
  return (originalPrice - discountedPrice) / originalPrice;
}

/**
 * Format discount percentage
 *
 * @param originalPrice - Original price
 * @param discountedPrice - Discounted price
 * @param locale - The locale for formatting (defaults to 'en')
 * @returns Formatted discount percentage string
 *
 * @example
 * formatDiscount(100, 80, 'en'); // "20%"
 * formatDiscount(50, 40, 'en'); // "20%"
 */
export function formatDiscount(
  originalPrice: number,
  discountedPrice: number,
  locale: Locale = 'en'
): string {
  const discount = calculateDiscount(originalPrice, discountedPrice);
  return formatPercent(discount, locale, 0);
}

/**
 * Calculate tax amount
 *
 * @param amount - The base amount
 * @param taxRate - Tax rate (0.15 = 15%)
 * @returns Tax amount
 *
 * @example
 * calculateTax(100, 0.15); // 15
 * calculateTax(50, 0.08); // 4
 */
export function calculateTax(amount: number, taxRate: number): number {
  return amount * taxRate;
}

/**
 * Calculate total with tax
 *
 * @param amount - The base amount
 * @param taxRate - Tax rate (0.15 = 15%)
 * @returns Total amount including tax
 *
 * @example
 * calculateTotalWithTax(100, 0.15); // 115
 * calculateTotalWithTax(50, 0.08); // 54
 */
export function calculateTotalWithTax(amount: number, taxRate: number): number {
  return amount * (1 + taxRate);
}

/**
 * Format a price with tax information
 *
 * @param amount - The base amount
 * @param taxRate - Tax rate (0.15 = 15%)
 * @param locale - The locale for formatting (defaults to 'en')
 * @param currency - The currency code (defaults to locale's default currency)
 * @returns Object with formatted base, tax, and total amounts
 *
 * @example
 * formatPriceWithTax(100, 0.15, 'en', 'USD');
 * // { base: "$100.00", tax: "$15.00", total: "$115.00" }
 */
export function formatPriceWithTax(
  amount: number,
  taxRate: number,
  locale: Locale = 'en',
  currency?: CurrencyCode
): { base: string; tax: string; total: string } {
  const tax = calculateTax(amount, taxRate);
  const total = calculateTotalWithTax(amount, taxRate);

  return {
    base: formatCurrency(amount, locale, currency),
    tax: formatCurrency(tax, locale, currency),
    total: formatCurrency(total, locale, currency),
  };
}

/**
 * Get the default currency for a locale
 *
 * @param locale - The locale
 * @returns Default currency code for the locale
 *
 * @example
 * getDefaultCurrency('en'); // "USD"
 * getDefaultCurrency('es'); // "MXN"
 */
export function getDefaultCurrency(locale: Locale): CurrencyCode {
  return LOCALE_CURRENCY_MAP[locale];
}
