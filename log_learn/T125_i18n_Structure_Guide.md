# T125: Internationalization (i18n) - Educational Guide

**Topic**: Building a Multi-Language Support System
**Level**: Intermediate
**Date**: November 2, 2025
**Technologies**: TypeScript, JSON, Intl API

---

## Table of Contents

1. [What is Internationalization (i18n)?](#what-is-internationalization-i18n)
2. [Why i18n Matters](#why-i18n-matters)
3. [Core Concepts](#core-concepts)
4. [Architecture Design](#architecture-design)
5. [Implementation Details](#implementation-details)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)
8. [Advanced Topics](#advanced-topics)
9. [Real-World Examples](#real-world-examples)
10. [Resources](#resources)

---

## What is Internationalization (i18n)?

### Definition

**Internationalization (i18n)** is the process of designing and developing software so it can be adapted to various languages and regions without engineering changes.

> The term "i18n" comes from the word "internationalization": **i** + 18 letters + **n**

### Related Concepts

- **Localization (l10n)**: Adapting content for specific locales (languages, regions)
- **Locale**: A combination of language and region (e.g., `en-US`, `es-MX`)
- **Translation**: Converting text from one language to another
- **Formatting**: Displaying numbers, dates, currency according to locale conventions

### i18n vs l10n

| Aspect | i18n | l10n |
|--------|------|------|
| **Focus** | Engineering/Architecture | Content/Translation |
| **When** | During development | After development |
| **Who** | Developers | Translators |
| **What** | Code structure | Text content |
| **Example** | Building translation system | Translating to Spanish |

---

## Why i18n Matters

### Business Benefits

1. **Market Expansion**: Reach users in different countries
2. **User Experience**: Users prefer content in their native language
3. **Competitive Advantage**: Many competitors don't offer multi-language support
4. **Compliance**: Some regions require local language support
5. **Revenue Growth**: Localized content can increase conversion by 70%+

### Technical Benefits

1. **Scalability**: Easy to add new languages
2. **Maintainability**: Centralized translation management
3. **Consistency**: Uniform terminology across application
4. **Testability**: Can test with different locales
5. **SEO**: Better search engine rankings in local markets

### User Benefits

1. **Accessibility**: Content accessible to non-English speakers
2. **Comprehension**: Better understanding in native language
3. **Trust**: Local language increases credibility
4. **Comfort**: Familiar formats (dates, numbers, currency)

---

## Core Concepts

### 1. Locale Codes

Standard format: `language-REGION`

**Examples**:
- `en` - English (any region)
- `en-US` - English (United States)
- `en-GB` - English (United Kingdom)
- `es` - Spanish (any region)
- `es-ES` - Spanish (Spain)
- `es-MX` - Spanish (Mexico)

**In Our Implementation**:
```typescript
export type Locale = 'en' | 'es'; // Simplified: language only
```

**Why simplified?** For most applications, language-level localization is sufficient. Regional differences can be added later if needed.

### 2. Translation Keys

Hierarchical keys using dot notation:

```typescript
'common.welcome' → "Welcome"
'auth.signIn' → "Sign In"
'dashboard.stats.coursesEnrolled' → "Courses Enrolled"
```

**Benefits of Dot Notation**:
- ✅ Organized by feature/domain
- ✅ Easy to understand structure
- ✅ Prevents key collisions
- ✅ Supports nesting

### 3. Variable Interpolation

Dynamic content in translations:

```typescript
// Translation
"dashboard.welcome": "Welcome back, {{name}}!"

// Usage
t('en', 'dashboard.welcome', { name: 'John' })
// Result: "Welcome back, John!"
```

**Syntax**: `{{variableName}}`

**Why Double Braces?**
- Clear distinction from normal text
- Familiar syntax (used by Handlebars, Mustache)
- Less likely to appear in regular content

### 4. Locale Detection

Multi-source detection with priority:

1. **URL Parameter**: `?lang=es` (highest priority - explicit user choice)
2. **Cookie**: `locale=es` (persisted preference)
3. **Accept-Language Header**: `es-MX,es;q=0.9` (browser preference)
4. **Default**: `en` (fallback)

**Why This Order?**
- User's explicit choice (URL) overrides everything
- Saved preference (cookie) overrides browser default
- Browser preference better than arbitrary default
- Default ensures app always works

---

## Architecture Design

### Directory Structure

```
src/i18n/
├── index.ts              # Core utilities and exports
└── locales/
    ├── en.json          # English translations
    ├── es.json          # Spanish translations
    └── fr.json          # (Future) French translations
```

**Why This Structure?**
- ✅ Clear separation of code and data
- ✅ Easy to add new locales
- ✅ Translations can be edited without touching code
- ✅ Can be managed by non-developers
- ✅ Version control tracks translation changes

### Data Format: JSON

```json
{
  "common": {
    "welcome": "Welcome",
    "login": "Login"
  },
  "auth": {
    "signIn": "Sign In"
  }
}
```

**Why JSON?**
- ✅ Simple, human-readable format
- ✅ Easy to edit (even in text editors)
- ✅ Standard format (tools, IDEs support it)
- ✅ No special dependencies needed
- ✅ Fast parsing in JavaScript
- ✅ Type-safe with TypeScript inference

**Alternatives Considered**:
- YAML: More complex, requires parser
- XML: Verbose, harder to read
- TypeScript: Requires compilation
- Database: Adds complexity, runtime overhead

### Type Safety

```typescript
import enTranslations from './locales/en.json';

export type Translations = typeof enTranslations;

const translations: Record<Locale, Translations> = {
  en: enTranslations,
  es: esTranslations, // TypeScript ensures structure matches
};
```

**Benefits**:
- ✅ Compile-time validation
- ✅ Autocomplete in IDE
- ✅ Refactoring support
- ✅ Catches missing translations
- ✅ Type inference from English (source of truth)

---

## Implementation Details

### 1. Translation Function

```typescript
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
      console.warn(`Translation key not found: ${key}`);
      return key; // Fallback: return key
    }
  }

  if (typeof value !== 'string') {
    console.warn(`Translation value is not a string: ${key}`);
    return key;
  }

  // Replace variables
  if (variables) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return varName in variables ? String(variables[varName]) : match;
    });
  }

  return value;
}
```

**Key Features**:

1. **Nested Key Navigation**: Split by `.` and traverse object
2. **Error Handling**: Return key if not found (graceful degradation)
3. **Console Warnings**: Alert developers about missing translations
4. **Variable Interpolation**: Regex replacement of `{{var}}`
5. **Type Coercion**: Convert numbers to strings automatically

**Why Return Key on Error?**
- Shows *something* to user (not blank)
- Makes missing translations obvious in UI
- Helps developers identify issues
- Better than crashing the app

### 2. Locale Detection

```typescript
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
    const preferredLang = acceptLanguage
      .split(',')[0]     // Take first preference
      .split('-')[0]     // Remove region code
      .toLowerCase();

    if (isValidLocale(preferredLang)) {
      return preferredLang;
    }
  }

  // 4. Default
  return DEFAULT_LOCALE;
}
```

**Why Validate Each Source?**
- Prevents injection attacks
- Ensures locale is supported
- Falls through to next source if invalid
- Type-safe return value

**Accept-Language Parsing**:
```
"es-MX,es;q=0.9,en;q=0.8"
       ↓
["es-MX", "es;q=0.9", "en;q=0.8"]  (split by comma)
       ↓
"es-MX"  (take first)
       ↓
["es", "MX"]  (split by dash)
       ↓
"es"  (take language)
       ↓
"es"  (lowercase)
```

### 3. Formatting with Intl API

The **Intl API** is a built-in JavaScript API for internationalization.

#### Number Formatting

```typescript
export function formatNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}
```

**Examples**:
```typescript
formatNumber('en', 1234567.89)  // "1,234,567.89"
formatNumber('es', 1234567.89)  // "1.234.567,89"
```

**What's Different?**
- English uses `,` for thousands, `.` for decimals
- Spanish uses `.` for thousands, `,` for decimals

#### Currency Formatting

```typescript
export function formatCurrency(
  locale: Locale,
  value: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value / 100);
}
```

**Why Divide by 100?**
- Store currency in **cents** (integers) to avoid floating-point errors
- Convert to dollars for display

**Examples**:
```typescript
formatCurrency('en', 5000)  // "$50.00"
formatCurrency('es', 5000)  // "50,00 US$"
```

#### Date Formatting

```typescript
export function formatDate(
  locale: Locale,
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}
```

**Flexibility**: Accept both Date objects and ISO strings

**Examples**:
```typescript
const date = new Date('2025-01-15');

formatDate('en', date)
// "1/15/2025"

formatDate('es', date)
// "15/1/2025"

formatDate('en', date, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})
// "January 15, 2025"
```

#### Relative Time Formatting

```typescript
export function formatRelativeTime(
  locale: Locale,
  date: Date | string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();

  // Calculate appropriate unit
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
```

**Smart Unit Selection**: Automatically chooses most appropriate unit

**Examples**:
```typescript
// 5 minutes ago
formatRelativeTime('en', pastDate)  // "5 minutes ago"
formatRelativeTime('es', pastDate)  // "hace 5 minutos"

// 2 days ago
formatRelativeTime('en', pastDate)  // "2 days ago"
formatRelativeTime('es', pastDate)  // "hace 2 días"
```

### 4. Localized Routing

#### Generate Localized Paths

```typescript
export function getLocalizedPath(locale: Locale, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (locale === DEFAULT_LOCALE) {
    return normalizedPath;  // No prefix for default
  }

  return `/${locale}${normalizedPath}`;
}
```

**URL Structure**:
```
English (default):  /courses
Spanish:            /es/courses
French:             /fr/courses
```

**Why No Prefix for Default?**
- Shorter URLs (SEO benefit)
- Backwards compatibility
- Cleaner for primary market

#### Extract Locale from Path

```typescript
export function extractLocaleFromPath(path: string): {
  locale: Locale;
  path: string;
} {
  const segments = path.split('/').filter(Boolean);

  if (segments.length > 0 && isValidLocale(segments[0])) {
    const locale = segments[0] as Locale;
    const remainingPath = '/' + segments.slice(1).join('/');
    return { locale, path: remainingPath };
  }

  return { locale: DEFAULT_LOCALE, path };
}
```

**Use Case**: Server-side routing

```typescript
// Request: /es/courses/123
const { locale, path } = extractLocaleFromPath(request.url.pathname);
// locale: 'es'
// path: '/courses/123'
```

---

## Best Practices

### 1. Organization

**Group by Feature**:
```json
{
  "courses": {
    "title": "Courses",
    "enroll": "Enroll Now"
  },
  "events": {
    "title": "Events",
    "book": "Book Now"
  }
}
```

**NOT by UI Location**:
```json
{
  "header": { ... },
  "sidebar": { ... },
  "footer": { ... }
}
```

**Why?** Features can move around UI, but their meaning stays the same.

### 2. Key Naming

**Use Descriptive Keys**:
```typescript
t('auth.signIn')        // ✅ Clear
t('button.label')       // ❌ Vague
```

**Use camelCase**:
```typescript
'dashboard.myCourses'   // ✅ Consistent
'dashboard.my_courses'  // ❌ Inconsistent
'dashboard.my-courses'  // ❌ Harder to type
```

**Avoid Generic Keys**:
```typescript
'courses.title'         // ✅ Specific to context
'title'                 // ❌ Too generic
```

### 3. Variable Naming

**Be Explicit**:
```typescript
"Welcome back, {{name}}!"           // ✅ Clear
"Welcome back, {{x}}!"              // ❌ Cryptic
```

**Use Singular Names**:
```typescript
"{{count}} items"                   // ✅
"{{itemCount}} items"               // ✅ Even better
"{{counts}} items"                  // ❌ Confusing
```

### 4. Default Locale

**Always maintain English** as source of truth:
1. All keys must exist in English
2. Use English for development
3. TypeScript types inferred from English
4. Other locales validated against English

### 5. Missing Translations

**Never crash, always show something**:
```typescript
// ✅ Good: Return key name
return key;

// ❌ Bad: Return empty string
return '';

// ❌ Bad: Throw error
throw new Error('Translation not found');
```

### 6. Testing

**Test with Multiple Locales**:
```typescript
it('should work in all locales', () => {
  for (const locale of LOCALES) {
    const result = t(locale, 'common.welcome');
    expect(result).toBeTruthy();
    expect(result).not.toBe('common.welcome'); // Should be translated
  }
});
```

---

## Common Pitfalls

### 1. ❌ Hardcoded Strings

**Bad**:
```typescript
<h1>Welcome</h1>
<button>Sign In</button>
```

**Good**:
```typescript
<h1>{t(locale, 'common.welcome')}</h1>
<button>{t(locale, 'auth.signIn')}</button>
```

### 2. ❌ String Concatenation

**Bad**:
```typescript
const message = "Welcome " + userName + "!";
```

**Why Bad?** Word order differs in languages:
- English: "Welcome John!"
- Spanish: "¡Bienvenido Juan!"
- Japanese: "ジョンさん、ようこそ！" (John-san, welcome!)

**Good**:
```typescript
const message = t(locale, 'dashboard.welcome', { name: userName });
// English: "Welcome back, {{name}}!"
// Spanish: "¡Bienvenido de nuevo, {{name}}!"
```

### 3. ❌ Assuming English Grammar

**Bad** (Singular vs Plural):
```typescript
const msg = `You have ${count} item${count !== 1 ? 's' : ''}`;
```

**Why Bad?** Pluralization rules differ:
- English: 1 item, 2 items
- Polish: 1 przedmiot, 2 przedmioty, 5 przedmiotów (3 forms!)
- Japanese: Always same form

**Better** (Future Enhancement):
```typescript
// Use ICU message format or dedicated pluralization
t(locale, 'cart.itemCount', { count }, { plural: true })
```

### 4. ❌ Embedded Formatting

**Bad**:
```typescript
// In JSON
"price": "$99.99"
```

**Why Bad?** Format changes by locale

**Good**:
```typescript
// In JSON
"priceLabel": "Price"

// In code
const price = formatCurrency(locale, 9999); // Formats based on locale
```

### 5. ❌ Splitting Sentences

**Bad**:
```json
{
  "welcome": "Welcome",
  "to": "to",
  "app": "Spirituality Platform"
}
```

```typescript
`${t('welcome')} ${t('to')} ${t('app')}`
```

**Why Bad?** Word order and grammar differ

**Good**:
```json
{
  "welcome": "Welcome to {{appName}}",
  "appName": "Spirituality Platform"
}
```

```typescript
t(locale, 'welcome', { appName: t(locale, 'appName') })
```

### 6. ❌ Locale in State Only

**Bad**:
```typescript
// Only client-side state
const [locale, setLocale] = useState('en');
```

**Why Bad?** Lost on page refresh, not SEO-friendly

**Good**:
```typescript
// Server-side detection + client-side state + cookie persistence
const locale = getLocaleFromRequest(url, cookies.get('locale'), headers.get('accept-language'));
```

### 7. ❌ Forgetting Edge Cases

**Bad**:
```typescript
const path = `/${locale}${originalPath}`;
// Result: /es/courses (✓)
// But also: /escourses (✗ if originalPath doesn't start with /)
```

**Good**:
```typescript
const normalizedPath = originalPath.startsWith('/') ? originalPath : `/${originalPath}`;
const path = `/${locale}${normalizedPath}`;
```

---

## Advanced Topics

### 1. Lazy Loading Translations

For large applications, load translations on-demand:

```typescript
const translations: Record<Locale, Promise<Translations>> = {
  en: import('./locales/en.json'),
  es: import('./locales/es.json'),
};

export async function getTranslationsAsync(locale: Locale) {
  return await translations[locale];
}
```

**Benefits**:
- Smaller initial bundle
- Faster page load
- Pay only for what you use

**Trade-offs**:
- Async complexity
- Possible loading delays
- Need loading states in UI

### 2. Pluralization

Different languages have different plural rules:

```typescript
// ICU Message Format example
{
  "cart.items": {
    "one": "{{count}} item",
    "other": "{{count}} items"
  }
}
```

**Libraries for Complex Pluralization**:
- **i18next**: Full-featured i18n library
- **Format.js**: ICU message format
- **Polyglot.js**: Lightweight with plural support

### 3. Context-Aware Translations

Same word, different meanings:

```json
{
  "common": {
    "save": "Save"  // Save a file
  },
  "finance": {
    "save": "Save"  // Save money
  }
}
```

In some languages, these need different translations.

### 4. Right-to-Left (RTL) Languages

For Arabic, Hebrew:

```typescript
export function isRTL(locale: Locale): boolean {
  return ['ar', 'he', 'fa'].includes(locale);
}
```

```html
<html dir={isRTL(locale) ? 'rtl' : 'ltr'}>
```

**CSS Implications**:
```css
margin-left: 10px;  /* ❌ Fixed direction */
margin-inline-start: 10px;  /* ✅ RTL-aware */
```

### 5. Translation Management

For larger projects:

**Option A: Translation Platform**
- Crowdin, Lokalise, Phrase
- UI for translators
- Automatic sync with codebase
- Translation memory
- Quality checks

**Option B: Git-Based Workflow**
- Translators edit JSON files
- Pull requests for translations
- Code review process
- Version control benefits

**Option C: CMS Integration**
- Store translations in database
- Admin UI for editing
- Real-time updates (no deploy needed)
- Audit trail

### 6. Translation Keys as Code

Generate TypeScript types from translations:

```typescript
// Generated from en.json
type TranslationKey =
  | 'common.welcome'
  | 'common.login'
  | 'auth.signIn'
  | 'auth.signUp'
  // ... all keys

function t(locale: Locale, key: TranslationKey, variables?: Record<string, string | number>): string
```

**Benefits**:
- Autocomplete for keys
- Compile-time key validation
- Refactoring support
- No typos in keys

**Tools**:
- `typesafe-i18n`
- `i18next` with `i18next-parser`
- Custom codegen script

### 7. SEO Optimization

**Structured URLs**:
```
example.com/en/courses       (English)
example.com/es/cursos        (Spanish - translated slug!)
```

**HTML Lang Attribute**:
```html
<html lang={locale}>
```

**Hreflang Tags**:
```html
<link rel="alternate" hreflang="en" href="example.com/courses" />
<link rel="alternate" hreflang="es" href="example.com/es/cursos" />
<link rel="alternate" hreflang="x-default" href="example.com/courses" />
```

**Sitemap per Locale**:
```
sitemap-en.xml
sitemap-es.xml
```

---

## Real-World Examples

### Example 1: E-Commerce Checkout

```typescript
// Product page
<h1>{t(locale, 'products.title')}</h1>
<p>{formatCurrency(locale, product.priceInCents, 'USD')}</p>
<button>{t(locale, 'products.addToCart')}</button>

// Cart
<h2>{t(locale, 'cart.title')}</h2>
<p>{t(locale, 'cart.items')}: {cartItemCount}</p>
<p>{t(locale, 'cart.total')}: {formatCurrency(locale, totalInCents)}</p>

// Checkout
<label>{t(locale, 'auth.emailAddress')}</label>
<input type="email" placeholder={t(locale, 'common.email')} />
```

### Example 2: User Dashboard

```typescript
// Welcome message
<h1>{t(locale, 'dashboard.welcome', { name: user.name })}</h1>

// Stats
<div>
  <span>{t(locale, 'dashboard.stats.coursesEnrolled')}:</span>
  <span>{formatNumber(locale, user.coursesEnrolled)}</span>
</div>

// Activity
<p>
  {t(locale, 'dashboard.lastLogin')}:{' '}
  {formatRelativeTime(locale, user.lastLoginAt)}
</p>
```

### Example 3: Form Validation

```typescript
// Validation messages in different languages
if (!email) {
  errors.email = t(locale, 'validation.required');
} else if (!isValidEmail(email)) {
  errors.email = t(locale, 'validation.invalidEmail');
}

if (password.length < 8) {
  errors.password = t(locale, 'validation.minLength', { min: 8 });
}
```

### Example 4: Locale Switcher Component

```astro
---
import { LOCALES, LOCALE_NAMES, getLocalizedPath } from '../i18n';

const currentLocale = Astro.locals.locale;
const currentPath = Astro.url.pathname;
---

<div class="locale-switcher">
  {LOCALES.map((locale) => (
    <a
      href={getLocalizedPath(locale, currentPath)}
      class={locale === currentLocale ? 'active' : ''}
      hreflang={locale}
    >
      {LOCALE_NAMES[locale]}
    </a>
  ))}
</div>
```

### Example 5: API Error Messages

```typescript
// API route
import { t } from '../../i18n';

export async function POST({ request, locals }) {
  const locale = locals.locale || 'en';

  try {
    // ... process request
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({
        error: t(locale, 'errors.invalidInput'),
        details: error.details
      }), { status: 400 });
    }

    return new Response(JSON.stringify({
      error: t(locale, 'errors.serverError')
    }), { status: 500 });
  }
}
```

---

## Performance Considerations

### Bundle Size

**Our Implementation**:
- English translations: ~9 KB
- Spanish translations: ~9 KB
- Utility code: ~8 KB
- **Total: ~26 KB** (uncompressed)

**With Gzip**: ~7-8 KB total

**For Comparison**:
- i18next library: ~30 KB (minified)
- Format.js: ~40 KB (minified)

### Runtime Performance

**Translation Lookup**: O(n) where n = key depth
- `common.welcome` → 2 lookups
- `dashboard.stats.coursesEnrolled` → 3 lookups

**Optimization**: For hot paths, consider caching:

```typescript
const translationCache = new Map<string, string>();

export function tCached(locale: Locale, key: string, variables?: Record<string, any>): string {
  if (!variables) {
    const cacheKey = `${locale}:${key}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }
  }

  const result = t(locale, key, variables);

  if (!variables) {
    translationCache.set(`${locale}:${key}`, result);
  }

  return result;
}
```

### Memory Usage

**Static Approach** (our implementation):
- All translations loaded at startup
- ~18 KB per locale in memory
- Fast access (no I/O)

**Dynamic Approach** (alternative):
- Load translations on-demand
- Minimal initial memory
- Slight delay on first access

### Network Optimization

For client-side apps:

1. **Code Splitting**: Bundle translations per route
2. **Lazy Loading**: Load locale when switched
3. **Compression**: Always serve gzipped
4. **CDN**: Cache translation files
5. **HTTP/2**: Parallel loading of multiple files

---

## Testing Strategies

### Unit Tests

Test individual functions:

```typescript
it('should translate keys', () => {
  expect(t('en', 'common.welcome')).toBe('Welcome');
});

it('should interpolate variables', () => {
  expect(t('en', 'dashboard.welcome', { name: 'John' }))
    .toBe('Welcome back, John!');
});
```

### Integration Tests

Test complete flows:

```typescript
it('should handle complete user flow', () => {
  const url = new URL('http://example.com?lang=es');
  const locale = getLocaleFromRequest(url);
  const greeting = t(locale, 'common.welcome');
  const path = getLocalizedPath(locale, '/courses');

  expect(locale).toBe('es');
  expect(greeting).toBe('Bienvenido');
  expect(path).toBe('/es/courses');
});
```

### E2E Tests

Test in real browser:

```typescript
test('should switch language', async ({ page }) => {
  await page.goto('/');
  expect(await page.textContent('h1')).toBe('Welcome');

  await page.click('[href="/es"]');
  expect(await page.textContent('h1')).toBe('Bienvenido');
});
```

### Visual Regression Testing

Ensure UI looks good in all languages:

```typescript
test('should display correctly in Spanish', async ({ page }) => {
  await page.goto('/es/courses');
  await expect(page).toHaveScreenshot('courses-es.png');
});
```

---

## Migration Guide

### From Hardcoded Strings

**Before**:
```typescript
<h1>Welcome</h1>
<p>Browse our courses</p>
```

**After**:
```typescript
<h1>{t(locale, 'common.welcome')}</h1>
<p>{t(locale, 'courses.browse')}</p>
```

**Steps**:
1. Extract all user-facing strings
2. Create translation keys
3. Add to en.json
4. Replace strings with `t()` calls
5. Translate to other languages

### From Another i18n Library

**From i18next**:
```typescript
// Before
import { useTranslation } from 'react-i18next';
const { t, i18n } = useTranslation();

// After
import { t } from '../i18n';
const locale = useLocale(); // Custom hook
```

**Migration Script**:
1. Export translations from old system
2. Transform to our JSON format
3. Update all `t()` calls to include locale
4. Remove old library

---

## Resources

### Official Documentation

- [MDN: Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [W3C: Language Tags](https://www.w3.org/International/articles/language-tags/)
- [Unicode CLDR](https://cldr.unicode.org/)

### Libraries

- **i18next**: https://www.i18next.com/
- **Format.js**: https://formatjs.io/
- **typesafe-i18n**: https://github.com/ivanhofer/typesafe-i18n
- **Polyglot.js**: https://airbnb.io/polyglot.js/

### Tools

- **Crowdin**: Translation management platform
- **Lokalise**: Localization platform
- **Phrase**: Translation management system
- **Transifex**: Localization platform

### Learning

- **"The Art of Internationalization"**: Book by Adam Asnes
- **Google's i18n Guide**: https://developers.google.com/international
- **Mozilla L10n Guide**: https://mozilla-l10n.github.io/documentation/

---

## Conclusion

Internationalization is not just about translating text—it's about:

✅ **Architecture**: Building systems that support multiple languages
✅ **User Experience**: Providing native-feeling experiences
✅ **Scalability**: Making it easy to add new languages
✅ **Maintainability**: Centralizing translation management
✅ **Performance**: Optimizing for bundle size and runtime speed
✅ **Quality**: Ensuring consistency and correctness

**Key Takeaways**:

1. **Plan Early**: i18n is easier to add from the start than retrofit
2. **Use Standards**: Leverage Intl API, standard locale codes
3. **Type Safety**: TypeScript helps catch translation errors
4. **Test Thoroughly**: Test with multiple locales, not just English
5. **Think Global**: Consider different date formats, currencies, text direction
6. **Keep Simple**: Start simple (like our implementation), add complexity as needed

Our T125 implementation provides a **solid foundation** that can scale from a simple bilingual app to a complex multi-language platform.

---

**Further Practice**:

1. Add a third language (French, German, or Portuguese)
2. Implement pluralization support
3. Create a translation validation script
4. Build an admin UI for managing translations
5. Add RTL language support
6. Implement translation fallback chain (en-GB → en → default)

---

**Questions for Reflection**:

1. Why do we use dot notation for translation keys?
2. What are the benefits of using the Intl API vs. custom formatting?
3. Why validate locale from each source (URL, cookie, header)?
4. When would you choose lazy loading vs. static loading?
5. How would you handle user-generated content in different languages?

---

**Date**: November 2, 2025
**Author**: Claude (AI Assistant)
**Status**: Educational Material - Ready for Learning
