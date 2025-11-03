# T172: Currency Formatting - Learning Guide

## What Was Implemented

T172 implements comprehensive locale-aware currency and number formatting utilities using native JavaScript Intl.NumberFormat API. The library provides 20 functions covering currency formatting, number formatting, percentage display, and business calculations (tax, discounts).

## Key Concepts

### 1. Intl.NumberFormat API
The native JavaScript API for formatting numbers according to locale-specific conventions.

```typescript
const formatter = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD'
});

formatter.format(1234.56);
// Output: "$1,234.56"
```

### 2. Currency Codes (ISO 4217)
International standard three-letter currency codes:
- **USD**: US Dollar
- **EUR**: Euro
- **GBP**: British Pound
- **MXN**: Mexican Peso
- **CAD**: Canadian Dollar
- **AUD**: Australian Dollar

### 3. Locale-Currency Mapping
Different locales have default currencies:
```typescript
const LOCALE_CURRENCY_MAP: Record<Locale, CurrencyCode> = {
  en: 'USD',  // US Dollar for English
  es: 'MXN',  // Mexican Peso for Spanish
};
```

### 4. Number Notation Styles
- **Standard**: Full number with decimals (1,234.56)
- **Compact**: Abbreviated with K/M/B (1.2K, 1.2M, 1.2B)
- **Accounting**: Negative values in parentheses (($100.00))

## Core Functions

### Currency Formatting

**formatCurrency(amount, locale, currency)**
```typescript
formatCurrency(1234.56, 'en', 'USD');  // "$1,234.56"
formatCurrency(1234.56, 'es', 'EUR');  // "1.234,56 €"
formatCurrency(1234.56, 'en');         // "$1,234.56" (default USD)
```

**formatCurrencyWhole(amount, locale, currency)**
```typescript
formatCurrencyWhole(1234.56, 'en', 'USD');  // "$1,235" (rounded)
formatCurrencyWhole(99.5, 'en', 'USD');     // "$100"
```

**formatCurrencyAccounting(amount, locale, currency)**
```typescript
formatCurrencyAccounting(100, 'en', 'USD');   // "$100.00"
formatCurrencyAccounting(-100, 'en', 'USD');  // "($100.00)"
```

**formatCurrencyWithDecimals(amount, decimals, locale, currency)**
```typescript
formatCurrencyWithDecimals(1234.5678, 3, 'en', 'USD');  // "$1,234.568"
formatCurrencyWithDecimals(1234.5, 0, 'en', 'USD');     // "$1,235"
formatCurrencyWithDecimals(1234.5, 4, 'en', 'USD');     // "$1,234.5000"
```

**formatCurrencyCompact(amount, locale, currency)**
```typescript
formatCurrencyCompact(1234, 'en', 'USD');           // "$1.2K"
formatCurrencyCompact(1234567, 'en', 'USD');        // "$1.2M"
formatCurrencyCompact(1234567890, 'en', 'USD');     // "$1.2B"
```

### Number Formatting

**formatDecimal(amount, locale, decimals)**
```typescript
formatDecimal(1234.56, 'en');      // "1,234.56"
formatDecimal(1234.56, 'es');      // "1.234,56"
formatDecimal(1234.567, 'en', 3);  // "1,234.567"
```

**formatNumber(amount, locale)**
```typescript
formatNumber(1234567, 'en');  // "1,234,567"
formatNumber(1234567, 'es');  // "1.234.567"
formatNumber(1234.56, 'en');  // "1,235" (no decimals)
```

**formatPercent(value, locale, decimals)**
```typescript
formatPercent(0.15, 'en');        // "15%"
formatPercent(0.1567, 'en', 2);   // "15.67%"
formatPercent(1.5, 'en');         // "150%"
```

### Specialized Functions

**formatPriceRange(minPrice, maxPrice, locale, currency)**
```typescript
formatPriceRange(10, 100, 'en', 'USD');  // "$10 - $100"
formatPriceRange(10, 100, 'es', 'EUR');  // "10 € - 100 €"
```

**getCurrencySymbol(currency, locale)**
```typescript
getCurrencySymbol('USD', 'en');  // "$"
getCurrencySymbol('EUR', 'en');  // "€"
getCurrencySymbol('GBP', 'en');  // "£"
```

**getCurrencyName(currency, locale)**
```typescript
getCurrencyName('USD', 'en');  // "US Dollar"
getCurrencyName('EUR', 'en');  // "Euro"
getCurrencyName('USD', 'es');  // "dólar estadounidense"
```

### Parsing and Validation

**parseCurrency(currencyString, locale)**
```typescript
parseCurrency("$1,234.56", 'en');    // 1234.56
parseCurrency("1.234,56 €", 'es');   // 1234.56
parseCurrency("invalid", 'en');      // NaN
```

**isValidPrice(value)**
```typescript
isValidPrice(10.5);    // true
isValidPrice(0);       // true
isValidPrice(-5);      // false
isValidPrice(NaN);     // false
isValidPrice(Infinity); // false
```

### Business Logic

**calculateDiscount(originalPrice, discountedPrice)**
```typescript
calculateDiscount(100, 80);  // 0.2 (20% discount)
calculateDiscount(100, 50);  // 0.5 (50% discount)
calculateDiscount(100, 100); // 0 (no discount)
```

**formatDiscount(originalPrice, discountedPrice, locale)**
```typescript
formatDiscount(100, 80, 'en');  // "20%"
formatDiscount(100, 75, 'es');  // "25 %"
```

**calculateTax(amount, taxRate)**
```typescript
calculateTax(100, 0.15);  // 15
calculateTax(50, 0.08);   // 4
```

**calculateTotalWithTax(amount, taxRate)**
```typescript
calculateTotalWithTax(100, 0.15);  // 115
calculateTotalWithTax(50, 0.08);   // 54
```

**formatPriceWithTax(amount, taxRate, locale, currency)**
```typescript
formatPriceWithTax(100, 0.15, 'en', 'USD');
// Returns: {
//   base: "$100.00",
//   tax: "$15.00",
//   total: "$115.00"
// }
```

## Implementation Patterns

### Basic Structure
```typescript
export function formatCurrency(
  amount: number,
  locale: Locale = 'en',
  currency?: CurrencyCode
): string {
  // 1. Get currency code (use default if not provided)
  const currencyCode = currency || LOCALE_CURRENCY_MAP[locale];

  // 2. Create formatter with locale and options
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}
```

### Custom Decimal Precision
```typescript
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
```

### Compact Notation
```typescript
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
```

## Usage in Astro Pages

```astro
---
import {
  formatCurrency,
  formatPriceRange,
  formatDiscount,
  formatPriceWithTax,
  formatCurrencyCompact,
  isValidPrice
} from '@/lib/currencyFormat';

const locale = Astro.locals.locale || 'en';
const product = await getLocalizedProductById(id, locale);
const TAX_RATE = 0.15; // 15% tax
---

<div class="product-card">
  <h2>{product.title}</h2>

  <!-- Regular price -->
  {isValidPrice(product.price) && (
    <p class="text-2xl font-bold">
      {formatCurrency(product.price, locale)}
    </p>
  )}

  <!-- Price range for variable pricing -->
  {product.minPrice && product.maxPrice && (
    <p class="text-gray-600">
      {formatPriceRange(product.minPrice, product.maxPrice, locale)}
    </p>
  )}

  <!-- Discount badge -->
  {product.originalPrice && product.originalPrice > product.price && (
    <div class="flex gap-2 items-center">
      <span class="line-through text-gray-500">
        {formatCurrency(product.originalPrice, locale)}
      </span>
      <span class="bg-red-500 text-white px-2 py-1 rounded text-sm font-bold">
        {formatDiscount(product.originalPrice, product.price, locale)} OFF
      </span>
    </div>
  )}

  <!-- Tax breakdown -->
  {(() => {
    const breakdown = formatPriceWithTax(product.price, TAX_RATE, locale);
    return (
      <div class="bg-gray-100 p-4 rounded mt-4">
        <div class="flex justify-between">
          <span>Subtotal:</span>
          <span>{breakdown.base}</span>
        </div>
        <div class="flex justify-between text-gray-600">
          <span>Tax (15%):</span>
          <span>{breakdown.tax}</span>
        </div>
        <div class="flex justify-between font-bold text-lg border-t pt-2 mt-2">
          <span>Total:</span>
          <span>{breakdown.total}</span>
        </div>
      </div>
    );
  })()}

  <!-- Compact display for large numbers -->
  {product.totalRevenue && (
    <p class="text-sm text-gray-500">
      Revenue: {formatCurrencyCompact(product.totalRevenue, locale)}
    </p>
  )}
</div>
```

## Usage in Components

```typescript
import {
  formatCurrency,
  formatPercent,
  formatNumber
} from '@/lib/currencyFormat';

interface Props {
  price: number;
  quantity: number;
  discountRate?: number;
  locale: 'en' | 'es';
}

const { price, quantity, discountRate, locale } = Astro.props;

const subtotal = price * quantity;
const discount = discountRate ? subtotal * discountRate : 0;
const total = subtotal - discount;

const formattedPrice = formatCurrency(price, locale);
const formattedTotal = formatCurrency(total, locale);
const formattedDiscount = discountRate
  ? formatPercent(discountRate, locale)
  : null;
const formattedQuantity = formatNumber(quantity, locale);
```

## Benefits

1. **No Dependencies**: Uses native browser APIs (Intl.NumberFormat)
2. **Automatic Localization**: Formats adapt to locale conventions
3. **Type Safe**: TypeScript ensures correct usage
4. **Comprehensive**: Covers all common use cases
5. **Flexible**: Supports multiple currencies and custom options
6. **Business Ready**: Includes tax and discount calculations
7. **Consistent**: Single source of truth for number/currency formatting

## Locale Differences

### Number Separators
- **English (en)**:
  - Thousands: comma (1,234,567)
  - Decimal: period (1,234.56)
- **Spanish (es)**:
  - Thousands: period (1.234.567)
  - Decimal: comma (1.234,56)

### Currency Display
- **English USD**: $1,234.56 (symbol before)
- **Spanish MXN**: 1.234,56 MXN or $1.234,56 (varies)
- **English EUR**: €1,234.56
- **Spanish EUR**: 1.234,56 € (symbol after)

### Percentage
- **English**: 15% (no space)
- **Spanish**: 15 % (with space)

### Compact Notation
- **English**: 1.2K, 1.2M, 1.2B
- **Spanish**: 1,2 mil, 1,2 M, 1200 M

## Common Patterns

### Product Pricing Display
```typescript
const product = {
  price: 99.99,
  originalPrice: 149.99,
  currency: 'USD'
};

const price = formatCurrency(product.price, locale, product.currency);
const original = formatCurrency(product.originalPrice, locale, product.currency);
const discount = formatDiscount(product.originalPrice, product.price, locale);
```

### Shopping Cart Totals
```typescript
const items = [
  { price: 50, quantity: 2 },
  { price: 30, quantity: 1 }
];

const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
const taxRate = 0.15;
const breakdown = formatPriceWithTax(subtotal, taxRate, locale);

// breakdown.base: "$130.00"
// breakdown.tax: "$19.50"
// breakdown.total: "$149.50"
```

### Revenue Dashboard
```typescript
const metrics = {
  totalRevenue: 1234567,
  averageOrder: 85.50,
  conversionRate: 0.0342
};

const revenue = formatCurrencyCompact(metrics.totalRevenue, locale);
const avgOrder = formatCurrency(metrics.averageOrder, locale);
const conversion = formatPercent(metrics.conversionRate, locale, 2);

// revenue: "$1.2M"
// avgOrder: "$85.50"
// conversion: "3.42%"
```

### Invoice Display
```typescript
const invoice = {
  items: [
    { name: 'Course A', price: 100, quantity: 1 },
    { name: 'Course B', price: 150, quantity: 2 }
  ],
  taxRate: 0.15
};

const subtotal = invoice.items.reduce(
  (sum, item) => sum + (item.price * item.quantity),
  0
);

const { base, tax, total } = formatPriceWithTax(subtotal, invoice.taxRate, locale);
```

## Testing Considerations

### Locale-Specific Behavior
Tests must account for locale variations:

```typescript
// ✅ Good: Flexible matching
expect(formatCurrency(100, 'es', 'MXN')).toMatch(/MXN|\$/);

// ❌ Bad: Assumes specific format
expect(formatCurrency(100, 'es', 'MXN')).toContain('$');
```

### Floating Point Precision
Use `toBeCloseTo()` for calculations:

```typescript
// ✅ Good: Accounts for floating point
expect(calculateTotalWithTax(100, 0.15)).toBeCloseTo(115, 2);

// ❌ Bad: May fail due to precision
expect(calculateTotalWithTax(100, 0.15)).toBe(115);
```

## Integration with Other Tasks

- **T125**: Locale utilities provide the `Locale` type
- **T163**: Middleware sets `Astro.locals.locale`
- **T168, T169, T170**: Format prices in translated content
- **T171**: Date/time formatting companion

## Next Steps

- Use throughout application for consistent price display
- Replace hardcoded currency formatting
- Integrate with e-commerce checkout flow
- Add currency conversion if supporting multiple regions
- Consider adding more currencies (JPY, CNY, INR, etc.)

## Conclusion

T172 provides a comprehensive, locale-aware currency and number formatting library covering all common use cases. By leveraging native Intl.NumberFormat API, it provides automatic localization without external dependencies while maintaining type safety and consistent formatting across the spirituality e-commerce platform.
