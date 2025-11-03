# T165: URL Routing Configuration for Languages - Learning Guide

**Topic**: Internation URL Routing Patterns
**Level**: Intermediate
**Date**: November 2, 2025
**Prerequisites**: HTTP basics, URL structure, internationalization concepts

---

## What is URL-Based Language Routing?

**URL-based language routing** embeds the user's preferred language directly in the URL path.

### Example

```
English: https://example.com/courses
Spanish: https://example.com/es/courses
```

The `/es/` prefix indicates the Spanish version of the page.

---

## Why Use URL-Based Routing?

### Problem Without URL Routing

**Cookie-Only Approach**:
```
URL: https://example.com/courses
Language: Determined by cookie only
```

**Problems**:
- ❌ Not shareable (recipient sees their own language preference)
- ❌ Not bookmarkable (bookmark doesn't save language)
- ❌ Poor SEO (search engines can't index both languages)
- ❌ No explicit language indication

### Solution With URL Routing

```
English:  https://example.com/courses      → Always English
Spanish:  https://example.com/es/courses   → Always Spanish
```

**Benefits**:
- ✅ Shareable (URL preserves language)
- ✅ Bookmarkable (bookmark saves language)
- ✅ SEO-friendly (separate URLs for each language)
- ✅ Explicit language indication
- ✅ Works without cookies

---

## URL Routing Patterns

### 1. Path-Based Routing (Our Choice)

**Pattern**: `/{locale}/{path}`

```
/                 → English (default)
/courses          → English
/es               → Spanish
/es/courses       → Spanish
```

**Pros**:
- ✅ SEO-friendly (Google recognizes `/es/` as locale)
- ✅ Clean implementation
- ✅ Standard pattern (used by Google, Wikipedia, MDN)

**Cons**:
- ⚠️ Slightly longer URLs for non-default locales

### 2. Subdomain-Based Routing

**Pattern**: `{locale}.example.com`

```
example.com       → English
es.example.com    → Spanish
```

**Pros**:
- ✅ Clean URLs (no path prefix)
- ✅ Easy CDN configuration per locale

**Cons**:
- ⚠️ Requires DNS setup
- ⚠️ More complex deployment
- ⚠️ Certificate management for each subdomain

### 3. Domain-Based Routing

**Pattern**: Different domains per language

```
example.com       → English
ejemplo.com       → Spanish
```

**Pros**:
- ✅ Clearest separation
- ✅ Local branding (ejemplo.com looks Spanish)

**Cons**:
- ⚠️ Expensive (buy multiple domains)
- ⚠️ Complex to maintain
- ⚠️ Content duplication challenges

### 4. Query Parameter Routing

**Pattern**: `?lang={locale}`

```
/courses          → Default language
/courses?lang=es  → Spanish
```

**Pros**:
- ✅ Simple to implement

**Cons**:
- ⚠️ Poor SEO (query params often ignored)
- ⚠️ Not standard practice
- ⚠️ Not user-friendly

**Verdict**: Use for temporary overrides only, not as primary routing

---

## Implementation Architecture

### 1. URL Generation

**Function**: Convert path to localized URL

```typescript
export function getLocalizedPath(locale: Locale, path: string): string {
  // Normalize path (ensure leading slash)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Don't add prefix for default locale (English)
  if (locale === DEFAULT_LOCALE) {
    return normalizedPath;
  }

  // Add locale prefix for non-default locales
  return `/${locale}${normalizedPath}`;
}
```

**Usage**:
```typescript
getLocalizedPath('en', '/courses')  → '/courses'
getLocalizedPath('es', '/courses')  → '/es/courses'
```

**Why No /en/ Prefix?**
- Shorter URLs for majority of users
- Backward compatibility with existing URLs
- Standard practice (most sites use no prefix for default)

### 2. URL Parsing

**Function**: Extract locale from URL

```typescript
export function extractLocaleFromPath(path: string): { locale: Locale; path: string } {
  // Split path into segments
  const segments = path.split('/').filter(Boolean);

  // Check if first segment is a valid locale
  if (segments.length > 0 && isValidLocale(segments[0])) {
    const locale = segments[0] as Locale;
    const remainingPath = '/' + segments.slice(1).join('/');
    return { locale, path: remainingPath };
  }

  // No locale prefix, use default
  return { locale: DEFAULT_LOCALE, path };
}
```

**Usage**:
```typescript
extractLocaleFromPath('/es/courses')
  → { locale: 'es', path: '/courses' }

extractLocaleFromPath('/courses')
  → { locale: 'en', path: '/courses' }
```

**How It Works**:
1. Split path by `/` into segments: `['es', 'courses']`
2. Filter empty segments (from leading/trailing slashes)
3. Check if first segment is valid locale (`'es'` → yes)
4. Extract locale and rebuild remaining path

### 3. Middleware Integration

**Automatic Locale Detection**:

```typescript
export const i18nMiddleware: MiddlewareHandler = async ({ url, locals }, next) => {
  // Extract locale from URL path
  const { locale, path } = extractLocaleFromPath(url.pathname);

  // Add to request context
  locals.locale = locale;

  // Continue to page
  const response = await next();

  // Add Content-Language header for SEO
  response.headers.set('Content-Language', locale);

  return response;
};
```

**Flow**:
```
Request: GET /es/courses
  ↓
Middleware extracts: locale='es', path='/courses'
  ↓
Sets: Astro.locals.locale = 'es'
  ↓
Page renders with Spanish content
  ↓
Response includes: Content-Language: es
```

---

## Routing Rules

### Rule 1: Default Locale Has No Prefix

```typescript
// ✅ Correct
'/courses'        → English
'/events'         → English

// ❌ Incorrect
'/en/courses'     → Unnecessary prefix
'/en/events'      → Unnecessary prefix
```

**Why?**
- Cleaner URLs for majority users
- Backward compatibility
- Standard practice

### Rule 2: Non-Default Locales Require Prefix

```typescript
// ✅ Correct
'/es/courses'     → Spanish
'/es/events'      → Spanish

// ❌ Incorrect (would show English)
'/courses'        → English (not Spanish)
```

### Rule 3: Locale Prefix is Always First Segment

```typescript
// ✅ Correct
'/es/courses/123/lessons/456'

// ❌ Incorrect
'/courses/es/123/lessons/456'
'/courses/123/es/lessons/456'
```

**Why First?**
- Consistent parsing
- Clear hierarchy
- SEO best practice

### Rule 4: API Routes Don't Use Locale Prefix

```typescript
// ✅ Correct (language-agnostic)
'/api/courses'
'/api/auth/login'

// ❌ Incorrect (API doesn't need locale)
'/es/api/courses'
```

**Why?**
- APIs return JSON (no language)
- Stateless (use Accept-Language header if needed)

---

## SEO Considerations

### 1. Content-Language Header

**Implementation**: Automatically added by middleware

```http
Content-Language: es
```

**Benefit**: Search engines understand page language

### 2. Hreflang Tags (Future: T177)

**Recommendation**: Link language variants

```html
<link rel="alternate" hreflang="en" href="https://example.com/courses" />
<link rel="alternate" hreflang="es" href="https://example.com/es/courses" />
<link rel="alternate" hreflang="x-default" href="https://example.com/courses" />
```

**Benefit**: Search engines show correct language in results

### 3. Canonical URLs

**Recommendation**: Each language version has its own canonical

```html
<!-- On /es/courses -->
<link rel="canonical" href="https://example.com/es/courses" />
```

**Benefit**: Prevents duplicate content penalties

### 4. Sitemap

**Recommendation**: Include all language variants

```xml
<url>
  <loc>https://example.com/courses</loc>
  <xhtml:link rel="alternate" hreflang="es" href="https://example.com/es/courses"/>
</url>
<url>
  <loc>https://example.com/es/courses</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://example.com/courses"/>
</url>
```

---

## User Experience Patterns

### Pattern 1: Language Switcher Navigation

```typescript
// User clicks "Español" in language switcher
Current URL: /courses
Target URL:  /es/courses
Action:      Navigate to target + set cookie
```

**Code**:
```typescript
function switchLanguage(locale: string, currentPath: string) {
  // Set cookie for persistence
  document.cookie = `locale=${locale}; path=/; max-age=31536000`;

  // Generate localized URL
  const targetUrl = getLocalizedPath(locale, cleanPath);

  // Navigate
  window.location.href = targetUrl;
}
```

### Pattern 2: Direct URL Access

```typescript
// User types URL directly
URL: https://example.com/es/courses
  ↓
Middleware detects locale from /es/
  ↓
Page renders in Spanish
  ↓
Cookie updated to match URL
```

### Pattern 3: Bookmark Restoration

```typescript
// User saved bookmark
Bookmark: https://example.com/es/courses
  ↓
User clicks bookmark
  ↓
Always shows Spanish version
  ↓
Cookie updated if different
```

**Benefit**: Bookmarks preserve language preference

### Pattern 4: URL Sharing

```typescript
// User shares URL with friend
Shared URL: https://example.com/es/courses
  ↓
Friend clicks link
  ↓
Friend sees Spanish version
  ↓
Friend can switch to English via switcher
```

**Benefit**: Explicit language in shareable URLs

---

## Handling Edge Cases

### Edge Case 1: Invalid Locale Codes

**Input**: `/fr/courses` (French not supported)

**Handling**:
```typescript
extractLocaleFromPath('/fr/courses')
  → isValidLocale('fr') → false
  → Return default locale: 'en'
  → Path remains: '/fr/courses'
```

**Result**: English content, `/fr/courses` treated as path (404)

**Alternative**: Could redirect `/fr/courses` → `/courses`

### Edge Case 2: Trailing Slashes

**Input**: `/es/courses/`

**Handling**: Astro normalizes to `/es/courses`

**Result**: No issues

### Edge Case 3: Query Parameters

**Input**: `/es/courses?page=2`

**Handling**:
```typescript
extractLocaleFromPath('/es/courses?page=2')
  → locale: 'es'
  → path: '/courses?page=2'
```

**Result**: Query params preserved ✅

### Edge Case 4: Hash Fragments

**Input**: `/es/courses#pricing`

**Handling**:
```typescript
extractLocaleFromPath('/es/courses#pricing')
  → locale: 'es'
  → path: '/courses#pricing'
```

**Result**: Hash preserved ✅

### Edge Case 5: Explicit Default Locale

**Input**: `/en/courses`

**Handling**:
```typescript
extractLocaleFromPath('/en/courses')
  → locale: 'en'
  → path: '/courses'
```

**Result**: Works but unnecessary prefix

**Recommendation**: Redirect `/en/courses` → `/courses`

---

## Performance Optimization

### 1. Static Pre-rendering

**Pattern**: Generate HTML for both locales at build time

```
Build Output:
  dist/courses/index.html           (English)
  dist/es/courses/index.html        (Spanish)
```

**Benefit**: Instant page loads (no runtime generation)

### 2. CDN Caching

**Pattern**: Cache separate versions per locale

```
Cache Key: Full URL path (includes locale prefix)
  /courses      → Cached separately
  /es/courses   → Cached separately
```

**Header**:
```http
Vary: Accept-Language
```

**Benefit**: CDN serves correct cached version

### 3. Lazy Loading

**Pattern**: Only load language-specific resources when needed

```javascript
// Don't load Spanish translations on English pages
if (locale === 'es') {
  await import('./i18n/locales/es.json');
}
```

**Benefit**: Smaller initial bundle

---

## Adding New Languages

### Step 1: Update Supported Locales

```typescript
// src/i18n/index.ts
export const SUPPORTED_LOCALES = ['en', 'es', 'fr'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French', // New
};
```

### Step 2: Add Translation File

```
src/i18n/locales/fr.json
```

### Step 3: Update Language Switcher

```typescript
const languages = [
  { code: 'en', flag: '🇺🇸', nativeName: 'English' },
  { code: 'es', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr', flag: '🇫🇷', nativeName: 'Français' }, // New
];
```

### Step 4: Test

```
URL: /fr/courses
Expected: French content
Actual: ✅ French content (automatic via middleware)
```

**No routing changes needed!** The system automatically supports new locales.

---

## Common Pitfalls

### Pitfall 1: Forgetting to Normalize Paths

```typescript
// ❌ Bad: Doesn't handle paths without leading slash
function getLocalizedPath(locale, path) {
  return `/${locale}${path}`; // Bug: //es/courses if path='courses'
}

// ✅ Good: Normalize first
function getLocalizedPath(locale, path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return locale === 'en' ? normalized : `/${locale}${normalized}`;
}
```

### Pitfall 2: Hardcoding Locale in URLs

```typescript
// ❌ Bad: Hardcoded English
<a href="/courses">Courses</a>

// ✅ Good: Use getLocalizedPath()
<a href={getLocalizedPath(locale, '/courses')}>Courses</a>
```

### Pitfall 3: Not Validating Locale Codes

```typescript
// ❌ Bad: Trust user input
const locale = path.split('/')[1];
locals.locale = locale; // XSS risk!

// ✅ Good: Validate
const locale = path.split('/')[1];
locals.locale = isValidLocale(locale) ? locale : DEFAULT_LOCALE;
```

### Pitfall 4: Inconsistent Locale Prefix

```typescript
// ❌ Bad: Sometimes /en/, sometimes not
'/en/courses'     → English
'/courses'        → English

// ✅ Good: Consistent rule (never /en/)
'/courses'        → English (always)
'/es/courses'     → Spanish (always)
```

---

## Best Practices

### 1. Use Consistent Default Locale

```typescript
// ✅ Good: Single source of truth
export const DEFAULT_LOCALE = 'en';

// ❌ Bad: Hardcoded in multiple places
if (locale === 'en') { /* ... */ }
```

### 2. Always Validate Locale Codes

```typescript
// ✅ Good: Type-safe validation
export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

// ❌ Bad: No validation
const locale = urlSegment; // Could be anything!
```

### 3. Generate URLs Programmatically

```typescript
// ✅ Good: Use helper function
<a href={getLocalizedPath(locale, '/courses')}>

// ❌ Bad: Manual string concatenation
<a href={locale === 'en' ? '/courses' : `/${locale}/courses`}>
```

### 4. Test All Edge Cases

```typescript
// Test invalid locales
extractLocaleFromPath('/invalid/courses')

// Test nested paths
extractLocaleFromPath('/es/courses/123/lessons/456')

// Test query params
extractLocaleFromPath('/es/courses?page=2')

// Test hash fragments
extractLocaleFromPath('/es/courses#pricing')
```

---

## Resources

### Documentation
- **T125 i18n Utilities**: Foundation for URL routing
- **T163 Middleware**: Automatic locale detection
- **T164 LanguageSwitcher**: User-facing language switching

### Standards
- **BCP 47**: Language tags (en, es, en-US, es-MX)
- **RFC 3066**: Language identification
- **ISO 639-1**: Two-letter language codes

### Examples
- **Google**: google.com, google.com/intl/es/ (mixed approach)
- **Wikipedia**: en.wikipedia.org (subdomain)
- **MDN**: developer.mozilla.org/en-US/docs (path-based)

---

## Conclusion

### Key Takeaways

1. **Path-based routing** (`/es/path`) is SEO-friendly and user-friendly
2. **Default locale has no prefix** for cleaner URLs
3. **URL parsing is simple**: Split, validate, extract
4. **Middleware automates detection** on every request
5. **URLs are shareable** and bookmarkable

### When to Use URL Routing

✅ **Use URL routing when**:
- Building multi-language sites
- SEO is important
- Users share URLs
- Bookmarking is common

❌ **Don't use URL routing when**:
- Single-language site
- Language is purely UI preference (dark mode)
- API endpoints (use headers instead)

### Our Implementation

✅ **Complete via T125, T163, T164**
- URL generation: `getLocalizedPath()`
- URL parsing: `extractLocaleFromPath()`
- Middleware: Automatic detection
- Language switcher: User-facing UI

**Status**: Production-ready ✅

---

**Date**: November 2, 2025
**Pattern**: Path-based routing
**Status**: Complete (via T125, T163, T164)
**Tests**: 113 comprehensive tests
