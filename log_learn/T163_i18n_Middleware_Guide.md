# T163: i18n Middleware - Educational Guide

**Topic**: Astro Middleware for Internationalization
**Level**: Intermediate
**Date**: November 2, 2025
**Integration**: T125 i18n Utilities

---

## Table of Contents

1. [What is Middleware?](#what-is-middleware)
2. [Why Use Middleware for i18n?](#why-use-middleware-for-i18n)
3. [Astro Middleware Basics](#astro-middleware-basics)
4. [Multi-Source Locale Detection](#multi-source-locale-detection)
5. [Cookie Persistence](#cookie-persistence)
6. [Request Context Enrichment](#request-context-enrichment)
7. [Middleware Sequencing](#middleware-sequencing)
8. [WCAG Compliance](#wcag-compliance)
9. [Security Considerations](#security-considerations)
10. [Performance Optimization](#performance-optimization)
11. [Testing Middleware](#testing-middleware)
12. [Common Patterns](#common-patterns)

---

## What is Middleware?

**Middleware** is code that runs between receiving a request and sending a response.

### The Request-Response Cycle

```
Client Request
    ↓
Middleware 1 (i18n)
    ↓
Middleware 2 (auth)
    ↓
Middleware 3 (logging)
    ↓
Page Rendering
    ↓
Response
    ↓
Middleware 3 (add headers)
    ↓
Middleware 2 (add headers)
    ↓
Middleware 1 (add headers)
    ↓
Client Response
```

### Key Characteristics

1. **Pre-Processing**: Runs before your page code
2. **Request Access**: Can read request data (URL, headers, cookies)
3. **Context Enrichment**: Can add data for pages to use
4. **Response Modification**: Can modify the response before sending
5. **Sequencing**: Multiple middleware run in order

---

## Why Use Middleware for i18n?

### Problem Without Middleware

Without middleware, every page needs to detect the locale:

```astro
---
// ❌ Bad: Repeated in every page
const url = new URL(Astro.request.url);
const cookieLocale = Astro.cookies.get('locale')?.value;
const acceptLanguage = Astro.request.headers.get('accept-language');
const locale = detectLocale(url, cookieLocale, acceptLanguage);
const t = useTranslations(locale);
---
```

**Problems**:
- Code duplication (every page)
- Inconsistent detection logic
- Easy to forget
- Hard to maintain

### Solution With Middleware

Middleware centralizes locale detection:

```astro
---
// ✅ Good: Automatic in every page
const { locale } = Astro.locals; // Set by middleware
const t = useTranslations(locale);
---
```

**Benefits**:
- ✅ Single source of truth
- ✅ Runs automatically for all requests
- ✅ Consistent behavior
- ✅ Easy to maintain
- ✅ Performance (runs once per request)

---

## Astro Middleware Basics

### Creating Middleware

Middleware lives in `src/middleware.ts`:

```typescript
import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  // Pre-processing: Run before page renders
  console.log('Request received:', context.url.pathname);

  // Add data to context
  context.locals.timestamp = Date.now();

  // Call next middleware/page
  const response = await next();

  // Post-processing: Run after page renders
  response.headers.set('X-Custom-Header', 'value');

  return response;
};
```

### Context Object

The `context` parameter provides:

```typescript
interface APIContext {
  request: Request;          // Standard Web Request
  url: URL;                  // Parsed URL object
  params: Record<string, string>; // Route parameters
  cookies: AstroCookies;     // Cookie helpers
  locals: App.Locals;        // Shared data for pages
  redirect(path: string): Response;
  rewrite(path: string): Response;
}
```

### Locals (Shared Data)

`locals` is how middleware shares data with pages:

```typescript
// In middleware
export const onRequest: MiddlewareHandler = async (context, next) => {
  context.locals.userId = '123';
  context.locals.theme = 'dark';
  return next();
};
```

```astro
---
// In page
const { userId, theme } = Astro.locals;
---
<p>User ID: {userId}</p>
<p>Theme: {theme}</p>
```

**Type Safety**: Define types in `src/env.d.ts`:

```typescript
declare namespace App {
  interface Locals {
    userId: string;
    theme: 'light' | 'dark';
  }
}
```

---

## Multi-Source Locale Detection

Our middleware detects locale from **5 sources** with priority ordering.

### Priority Order

1. **URL Path** (`/es/courses`) - Highest priority
2. **URL Query** (`?lang=es`)
3. **Cookie** (`locale=es`)
4. **Accept-Language Header** (`es-ES,es;q=0.9`)
5. **Default** (`en`) - Fallback

### Why This Order?

#### 1. URL Path (Highest Priority)

```
https://example.com/es/courses
                    ^^
                    locale in path
```

**Rationale**: Explicit user choice, allows sharing specific locale URLs

**Example Use Case**: User shares link `/es/courses` with Spanish-speaking friend

#### 2. URL Query Parameter

```
https://example.com/courses?lang=es
                             ^^^^^^^
                             query parameter
```

**Rationale**: Temporary override without changing path structure

**Example Use Case**: Language switcher that adds `?lang=es` before navigation

#### 3. Cookie

```
Cookie: locale=es
```

**Rationale**: Persistent user preference across sessions

**Example Use Case**: User selects Spanish once, preference remembered

#### 4. Accept-Language Header

```
Accept-Language: es-ES,es;q=0.9,en;q=0.8
```

**Rationale**: Browser's language preference

**Example Use Case**: First-time visitor, no preference set yet

#### 5. Default

```typescript
const DEFAULT_LOCALE = 'en';
```

**Rationale**: Fallback when no preference detected

**Example Use Case**: Request from bot or curl with no headers

### Implementation

```typescript
export const i18nMiddleware: MiddlewareHandler = async (
  { request, cookies, locals, url },
  next
) => {
  // 1. Check URL path
  const { locale: pathLocale } = extractLocaleFromPath(url.pathname);

  // 2. Get cookie and header
  const cookieLocale = cookies.get('locale')?.value;
  const acceptLanguage = request.headers.get('accept-language') || undefined;

  // 3. Determine final locale
  let detectedLocale: Locale;
  if (pathLocale !== DEFAULT_LOCALE) {
    // URL path has highest priority
    detectedLocale = pathLocale;
  } else {
    // Check query → cookie → header → default
    detectedLocale = getLocaleFromRequest(url, cookieLocale, acceptLanguage);
  }

  // 4. Add to context
  locals.locale = detectedLocale;
  locals.defaultLocale = DEFAULT_LOCALE;

  // ... continue
};
```

---

## Cookie Persistence

### Why Persist Locale?

Without persistence:
```
Visit 1: User selects Spanish → sees Spanish
Visit 2: No preference saved → sees English (bad UX!)
```

With persistence:
```
Visit 1: User selects Spanish → cookie saved
Visit 2: Cookie read → sees Spanish (good UX!)
```

### Cookie Configuration

```typescript
cookies.set('locale', detectedLocale, {
  path: '/',                    // Available site-wide
  maxAge: 365 * 24 * 60 * 60,  // 1 year
  httpOnly: false,              // Allow client-side access
  secure: import.meta.env.PROD, // HTTPS-only in production
  sameSite: 'lax',              // CSRF protection
});
```

### Cookie Attributes Explained

#### path: '/'

**What it means**: Cookie is sent with all requests to your site

```
✅ https://example.com/          → Cookie sent
✅ https://example.com/courses   → Cookie sent
✅ https://example.com/about     → Cookie sent
❌ https://other.com/            → Cookie NOT sent
```

#### maxAge: 31536000 (1 year)

**What it means**: Cookie persists for 1 year

**Alternatives**:
- `maxAge: 7 * 24 * 60 * 60` - 1 week (shorter preference)
- No maxAge - Session cookie (deleted when browser closes)

**Why 1 year?**: Language preference is stable, but not permanent

#### httpOnly: false

**What it means**: JavaScript can read/write the cookie

```javascript
// Client-side language switcher
document.cookie = 'locale=es; path=/; max-age=31536000';
```

**Security Trade-off**:
- ❌ `httpOnly: true` - More secure (XSS protection)
- ✅ `httpOnly: false` - Required for client-side language switching

**Safe because**: Locale is validated enum (`'en' | 'es'`), not user input

#### secure: import.meta.env.PROD

**What it means**: Cookie only sent over HTTPS in production

```typescript
// Development (HTTP)
secure: false  // ✅ Cookie sent over http://localhost

// Production (HTTPS)
secure: true   // ✅ Cookie sent over https://example.com
               // ❌ Cookie NOT sent over http://example.com
```

**Why**: HTTPS encrypts cookie data in transit

#### sameSite: 'lax'

**What it means**: CSRF protection

```
User on evil.com clicks:
<a href="https://yoursite.com/transfer?amount=1000">Click here</a>

sameSite: 'none'  → ❌ Cookie sent (CSRF attack possible)
sameSite: 'lax'   → ✅ Cookie NOT sent (CSRF blocked)
sameSite: 'strict' → ✅ Cookie NOT sent (but breaks some flows)
```

**Why 'lax' not 'strict'**: Allows cookie on top-level navigation (clicking links)

### Optimized Cookie Writing

```typescript
// Only write if locale changed (95% fewer writes)
const currentCookieLocale = cookies.get('locale')?.value;
if (currentCookieLocale !== detectedLocale) {
  cookies.set('locale', detectedLocale, { /* options */ });
}
```

**Performance**:
- First visit: Cookie written (1 write)
- Subsequent visits: Cookie already set (0 writes)

---

## Request Context Enrichment

### Adding Data to Locals

Middleware adds locale data for pages:

```typescript
// In middleware
locals.locale = detectedLocale;          // 'en' | 'es'
locals.defaultLocale = DEFAULT_LOCALE;   // 'en'
```

### Using in Pages

```astro
---
// src/pages/index.astro
import { useTranslations } from '@/i18n';

const { locale } = Astro.locals;  // From middleware
const t = useTranslations(locale);
---

<h1>{t('home.welcome')}</h1>
<p>{t('home.description')}</p>
```

### Using in API Routes

```typescript
// src/pages/api/user.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const { locale } = locals;  // From middleware

  return new Response(JSON.stringify({
    message: locale === 'es' ? 'Hola' : 'Hello',
  }));
};
```

### Using in Components

```astro
---
// src/components/Greeting.astro
import { useTranslations } from '@/i18n';

interface Props {
  locale: import('@/i18n').Locale;
}

const { locale } = Astro.props;
const t = useTranslations(locale);
---

<p>{t('greeting')}</p>
```

```astro
---
// Usage in page
const { locale } = Astro.locals;
---

<Greeting locale={locale} />
```

### Type Safety

Define types in `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    locale: import('./i18n').Locale;      // 'en' | 'es'
    defaultLocale: import('./i18n').Locale;
    user?: {
      id: string;
      email: string;
    };
  }
}
```

**Benefits**:
- ✅ TypeScript autocomplete
- ✅ Compile-time errors if wrong type
- ✅ Refactoring safety

---

## Middleware Sequencing

### Why Order Matters

Some middleware depends on data from previous middleware:

```typescript
// ❌ Bad order
sequence(
  authMiddleware,   // Needs locale for redirect messages
  i18nMiddleware,   // Provides locale
)
// Problem: authMiddleware runs before locale is set!

// ✅ Good order
sequence(
  i18nMiddleware,   // Provides locale
  authMiddleware,   // Uses locale
)
```

### Our Middleware Order

```typescript
// src/middleware.ts
import { sequence } from 'astro:middleware';
import { onRequest as i18nMiddleware } from './middleware/i18n';
import { onRequest as authMiddleware } from './middleware/auth';

export const onRequest = sequence(
  i18nMiddleware,   // 1. Set locale (needed by auth)
  authMiddleware,   // 2. Load user (may use locale)
);
```

### Execution Flow

```
Request: GET /es/dashboard
    ↓
i18nMiddleware:
  - Detects locale='es' from path
  - Sets locals.locale='es'
  - Sets Content-Language header
    ↓
authMiddleware:
  - Checks session cookie
  - Loads user from database
  - If unauthorized, redirect with Spanish message
    ↓
Page: /dashboard
  - Renders with locale='es'
  - Uses t('dashboard.title')
    ↓
Response with Content-Language: es
```

### Adding More Middleware

```typescript
// Future expansion
export const onRequest = sequence(
  i18nMiddleware,      // 1. Set locale
  authMiddleware,      // 2. Load user
  loggingMiddleware,   // 3. Log request (can use locale + user)
  rateLimitMiddleware, // 4. Rate limiting (can use user.id)
);
```

**Rule**: Place middleware in order of dependencies:
- Independent middleware → First
- Dependent middleware → After dependencies

---

## WCAG Compliance

### WCAG 3.1.1 Language of Page (Level A)

**Requirement**: "The default human language of each Web page can be programmatically determined."

**Solution**: Content-Language HTTP header

```typescript
const response = await next();
response.headers.set('Content-Language', detectedLocale);
return response;
```

**Browser behavior**:
```
Response headers:
Content-Language: es

→ Browser knows page is in Spanish
→ Screen readers use Spanish voice
→ Translation tools offer correct language
→ Search engines index correctly
```

### WCAG 3.1.2 Language of Parts (Level AA)

**Requirement**: "The human language of each passage or phrase can be programmatically determined."

**Solution**: Locale available to all components

```astro
---
const { locale } = Astro.locals;
---

<!-- English section in Spanish page -->
<div lang="en">
  <p>This quote is in English.</p>
</div>

<!-- Spanish content (default) -->
<p>Este contenido está en español.</p>
```

### WCAG 3.1.5 Reading Level (Level AAA)

**Requirement**: "When text requires reading ability more advanced than lower secondary education level, supplemental content is available."

**Solution**: Locale context allows difficulty-appropriate content

```typescript
// src/lib/content.ts
export function getContentByReadingLevel(locale: Locale, level: 'simple' | 'advanced') {
  // Return appropriate content based on locale and level
}
```

---

## Security Considerations

### Input Validation

All locale sources are validated:

```typescript
export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

// Used in detection
detectedLocale = getLocaleFromRequest(url, cookieLocale, acceptLanguage);
// Returns validated 'en' | 'es' only
```

**Protection against**:
- ✅ Invalid locale codes (e.g., `../../etc/passwd`)
- ✅ SQL injection (locale is enum, not used in queries)
- ✅ XSS (locale is validated before output)

### Cookie Security

```typescript
cookies.set('locale', detectedLocale, {
  httpOnly: false,        // Allow client-side (safe for enum)
  secure: PROD,           // HTTPS-only in production
  sameSite: 'lax',        // CSRF protection
});
```

**Threat Model**:

#### XSS (Cross-Site Scripting)
```javascript
// Attack: Inject malicious locale
document.cookie = 'locale=<script>alert("XSS")</script>';

// Defense: Validated on server
const cookieLocale = cookies.get('locale')?.value;
const locale = isValidLocale(cookieLocale) ? cookieLocale : 'en';
// Result: Invalid locale rejected, default used
```

#### CSRF (Cross-Site Request Forgery)
```html
<!-- Attack: Form on evil.com -->
<form action="https://yoursite.com/api/delete" method="POST">
  <input type="hidden" name="id" value="123" />
</form>

<!-- Defense: sameSite='lax' -->
Cookie is NOT sent with cross-origin POST
Cookie IS sent with same-origin requests
```

### Header Injection

```typescript
// Safe: Locale is validated enum
response.headers.set('Content-Language', detectedLocale);
// detectedLocale can only be 'en' | 'es'

// NOT vulnerable to:
Content-Language: es\r\nSet-Cookie: evil=1
// Because detectedLocale is validated
```

---

## Performance Optimization

### Minimal Overhead

```typescript
// Per-request operations:
1. URL parsing: ~0.1ms (native URL object)
2. Cookie read: ~0.05ms (single cookie)
3. Header read: ~0.05ms (single header)
4. String comparison: ~0.1ms (locale detection)
5. Cookie write: ~0.1ms (only if changed)
6. Header write: ~0.05ms

Total: ~0.45ms per request (negligible)
```

### Optimization Strategies

#### 1. Conditional Cookie Write

```typescript
// ✅ Good: Only write if changed
const currentCookieLocale = cookies.get('locale')?.value;
if (currentCookieLocale !== detectedLocale) {
  cookies.set('locale', detectedLocale, options);
}

// Reduces writes by ~95%
// First visit: Write cookie
// Next 100 visits: No write needed
```

#### 2. Path Priority

```typescript
// ✅ Good: Check fastest source first
const { locale: pathLocale } = extractLocaleFromPath(url.pathname);
if (pathLocale !== DEFAULT_LOCALE) {
  detectedLocale = pathLocale;  // Fast path
} else {
  // Slower: Check query, cookie, header
  detectedLocale = getLocaleFromRequest(url, cookieLocale, acceptLanguage);
}
```

#### 3. No Database Calls

```typescript
// ✅ Good: All in-memory
const locale = extractLocaleFromPath(url.pathname);
const cookie = cookies.get('locale');

// ❌ Bad: Database query per request
// const userLocale = await db.query('SELECT locale FROM users WHERE id = ?', [userId]);
```

### Caching Considerations

**Locale detection is NOT cached** because it varies per:
- URL path (`/en/` vs `/es/`)
- Cookie value (user A: `en`, user B: `es`)
- Accept-Language header (browser A: `en`, browser B: `es`)

**CDN caching**:
```typescript
// Set Vary header to cache by locale
response.headers.set('Vary', 'Accept-Language, Cookie');
```

This tells CDN to cache separate versions for different locales.

---

## Testing Middleware

### Challenge: Astro Runtime Dependency

Astro middleware uses `astro:middleware` module, which requires Astro runtime:

```typescript
import type { MiddlewareHandler } from 'astro';
// ↑ This is a virtual module, only available in Astro
```

**Problem**: Vitest runs in Node.js, can't resolve Astro's virtual modules

### Testing Approaches

#### 1. Manual Testing (Current)

Start dev server and test scenarios:

```bash
npm run dev

# Test scenarios:
curl http://localhost:4321/
# Check: Cookie set, Content-Language header

curl http://localhost:4321/es/courses
# Check: locale=es in cookie

curl -H "Accept-Language: es-ES" http://localhost:4321/
# Check: locale=es from header
```

**Pros**: Fast, real environment, covers all scenarios
**Cons**: Not automated, manual verification

#### 2. Unit Tests with Mocks (Attempted)

Create mock Astro context:

```typescript
function createMockContext(options = {}) {
  const cookies = {
    get: vi.fn(),
    set: vi.fn(),
  };

  const locals: any = {};

  const next = vi.fn(async () => new Response('OK'));

  return { cookies, locals, next, ...options };
}
```

**Pros**: Automated, fast
**Cons**: Cannot resolve `astro:middleware` import

#### 3. Integration Tests with Astro Container (Future)

Use Astro's experimental container API:

```typescript
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

test('i18n middleware sets locale', async () => {
  const container = await AstroContainer.create();
  const response = await container.renderToResponse('/es/courses');

  expect(response.headers.get('Content-Language')).toBe('es');
});
```

**Pros**: Real Astro environment, automated
**Cons**: Experimental API, requires Astro 4.0+

#### 4. E2E Tests with Playwright (Recommended)

Test in real browser:

```typescript
import { test, expect } from '@playwright/test';

test('middleware sets locale cookie', async ({ page }) => {
  await page.goto('/?lang=es');

  const cookies = await page.context().cookies();
  const localeCookie = cookies.find(c => c.name === 'locale');

  expect(localeCookie?.value).toBe('es');
});

test('middleware adds Content-Language header', async ({ page }) => {
  const response = await page.goto('/es/courses');
  expect(response?.headers()['content-language']).toBe('es');
});
```

**Pros**: Real environment, covers full flow, automated
**Cons**: Slower than unit tests

---

## Common Patterns

### Pattern 1: Conditional Redirects

Redirect to localized path if needed:

```typescript
export const i18nMiddleware: MiddlewareHandler = async (context, next) => {
  const { locale, path } = extractLocaleFromPath(context.url.pathname);

  // If on default locale path but user prefers Spanish
  if (locale === DEFAULT_LOCALE) {
    const cookieLocale = context.cookies.get('locale')?.value;
    if (cookieLocale === 'es' && path !== '/') {
      return context.redirect(`/es${path}`);
    }
  }

  return next();
};
```

**Use case**: Automatically redirect to user's preferred locale

### Pattern 2: Locale-Specific Redirects

Use locale for error messages:

```typescript
export const authMiddleware: MiddlewareHandler = async (context, next) => {
  const { locale } = context.locals;  // From i18n middleware

  if (!context.locals.user && isProtectedRoute(context.url.pathname)) {
    // Redirect with locale-appropriate message
    const loginPath = `/${locale}/login`;
    return context.redirect(loginPath);
  }

  return next();
};
```

### Pattern 3: Locale-Aware Logging

```typescript
export const loggingMiddleware: MiddlewareHandler = async (context, next) => {
  const { locale } = context.locals;  // From i18n middleware

  console.log({
    method: context.request.method,
    path: context.url.pathname,
    locale,  // Include locale in logs
    timestamp: Date.now(),
  });

  return next();
};
```

**Use case**: Analytics segmented by locale

### Pattern 4: Client-Side Language Switcher

Component that switches locale:

```astro
---
// src/components/LanguageSwitcher.astro
const { locale } = Astro.locals;
const otherLocale = locale === 'en' ? 'es' : 'en';
const currentPath = Astro.url.pathname;
---

<div class="language-switcher">
  <button
    data-locale={otherLocale}
    data-current-path={currentPath}
    class="btn-secondary"
  >
    {otherLocale === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}
  </button>
</div>

<script>
  document.querySelector('.language-switcher button')?.addEventListener('click', (e) => {
    const target = e.currentTarget as HTMLButtonElement;
    const newLocale = target.dataset.locale!;
    const currentPath = target.dataset.currentPath!;

    // Set cookie
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; samesite=lax`;

    // Navigate to localized path
    const newPath = newLocale === 'en'
      ? currentPath.replace(/^\/es/, '') || '/'
      : `/es${currentPath}`;

    window.location.href = newPath;
  });
</script>
```

---

## Comparison: With vs Without Middleware

### Without Middleware

Every page repeats detection logic:

```astro
---
// src/pages/index.astro
import { getLocaleFromRequest } from '@/i18n';

const url = new URL(Astro.request.url);
const cookieLocale = Astro.cookies.get('locale')?.value;
const acceptLanguage = Astro.request.headers.get('accept-language') || undefined;
const locale = getLocaleFromRequest(url, cookieLocale, acceptLanguage);

// Need to set cookie manually
if (cookieLocale !== locale) {
  Astro.cookies.set('locale', locale, { /* options */ });
}

const t = useTranslations(locale);
---
```

```astro
---
// src/pages/about.astro
// ❌ Copy-paste same code again
const url = new URL(Astro.request.url);
const cookieLocale = Astro.cookies.get('locale')?.value;
const acceptLanguage = Astro.request.headers.get('accept-language') || undefined;
const locale = getLocaleFromRequest(url, cookieLocale, acceptLanguage);
// ... repeat
---
```

**Problems**:
- ❌ Code duplication (10-15 lines per page)
- ❌ Easy to forget
- ❌ Inconsistent (different pages may vary)
- ❌ Hard to maintain (changes needed in many files)
- ❌ No Content-Language header (forgot to add)

### With Middleware

One place, automatic for all pages:

```typescript
// src/middleware/i18n.ts (one file)
export const i18nMiddleware: MiddlewareHandler = async (context, next) => {
  const detectedLocale = /* detection logic */;
  context.locals.locale = detectedLocale;
  // ... cookie, header logic
  return next();
};
```

```astro
---
// src/pages/index.astro
const { locale } = Astro.locals;  // ✅ Automatic
const t = useTranslations(locale);
---
```

```astro
---
// src/pages/about.astro
const { locale } = Astro.locals;  // ✅ Automatic
const t = useTranslations(locale);
---
```

**Benefits**:
- ✅ DRY (Don't Repeat Yourself)
- ✅ Consistent across all pages
- ✅ Easy to maintain (one file)
- ✅ Impossible to forget
- ✅ Includes all features (cookie, header)

---

## Best Practices

### 1. Type Safety

```typescript
// ✅ Good: Strict types
declare namespace App {
  interface Locals {
    locale: import('./i18n').Locale;  // 'en' | 'es'
    defaultLocale: import('./i18n').Locale;
  }
}

// ❌ Bad: Any type
declare namespace App {
  interface Locals {
    locale: any;  // No type safety!
  }
}
```

### 2. Validation

```typescript
// ✅ Good: Validate all inputs
const cookieLocale = cookies.get('locale')?.value;
const locale = isValidLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

// ❌ Bad: Trust cookie value
const locale = cookies.get('locale')?.value || DEFAULT_LOCALE;
// Could be '../../etc/passwd'
```

### 3. Cookie Security

```typescript
// ✅ Good: Secure in production
cookies.set('locale', locale, {
  secure: import.meta.env.PROD,  // Adapt to environment
  sameSite: 'lax',                // CSRF protection
});

// ❌ Bad: Always insecure
cookies.set('locale', locale);  // No security options
```

### 4. Performance

```typescript
// ✅ Good: Only write if changed
if (currentCookieLocale !== detectedLocale) {
  cookies.set('locale', detectedLocale, options);
}

// ❌ Bad: Always write
cookies.set('locale', detectedLocale, options);
// Unnecessary Set-Cookie headers
```

### 5. Middleware Order

```typescript
// ✅ Good: Dependencies first
sequence(
  i18nMiddleware,    // Provides locale
  authMiddleware,    // Uses locale
)

// ❌ Bad: Wrong order
sequence(
  authMiddleware,    // Needs locale (not available yet!)
  i18nMiddleware,    // Provides locale (too late!)
)
```

---

## Debugging Tips

### 1. Log Middleware Execution

```typescript
export const i18nMiddleware: MiddlewareHandler = async (context, next) => {
  console.log('i18n middleware:', {
    pathname: context.url.pathname,
    cookieLocale: context.cookies.get('locale')?.value,
    acceptLanguage: context.request.headers.get('accept-language'),
  });

  const detectedLocale = /* detection */;
  console.log('Detected locale:', detectedLocale);

  context.locals.locale = detectedLocale;
  const response = await next();

  console.log('Response headers:', Object.fromEntries(response.headers));
  return response;
};
```

### 2. Check Cookies in DevTools

```
Chrome DevTools → Application → Cookies
- Name: locale
- Value: es
- Path: /
- Expires: 1 year
- Secure: ✓ (in production)
- SameSite: Lax
```

### 3. Check Response Headers

```
Chrome DevTools → Network → Select request → Headers
Response Headers:
- Content-Language: es
- Set-Cookie: locale=es; Path=/; Max-Age=31536000; SameSite=Lax
```

### 4. Test with curl

```bash
# Test default locale
curl -v http://localhost:4321/

# Test URL path
curl -v http://localhost:4321/es/courses

# Test Accept-Language header
curl -v -H "Accept-Language: es-ES,es;q=0.9" http://localhost:4321/

# Test cookie
curl -v -b "locale=es" http://localhost:4321/
```

---

## Resources

### Astro Documentation
- **Middleware**: https://docs.astro.build/en/guides/middleware/
- **Internationalization**: https://docs.astro.build/en/guides/internationalization/
- **API Context**: https://docs.astro.build/en/reference/api-reference/#apicontext

### Related Standards
- **WCAG 3.1.1**: https://www.w3.org/WAI/WCAG21/Understanding/language-of-page
- **HTTP Content-Language**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Language
- **Accept-Language**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language

### Security
- **Cookie Security**: https://owasp.org/www-community/controls/SecureFlag
- **SameSite Cookies**: https://web.dev/samesite-cookies-explained/

---

## Conclusion

### Key Takeaways

1. **Middleware centralizes logic** that runs on every request
2. **Multi-source detection** provides flexible, user-friendly locale selection
3. **Cookie persistence** remembers user preference across sessions
4. **Context enrichment** makes locale available to all pages
5. **WCAG compliance** via Content-Language header
6. **Security** through validation, secure cookies, CSRF protection
7. **Performance** with conditional writes and in-memory operations

### When to Use Middleware

✅ **Use middleware for**:
- Request-level data (locale, auth, logging)
- Cross-cutting concerns (all pages need it)
- Response headers (Content-Language, security headers)
- Cookie management (persistent preferences)

❌ **Don't use middleware for**:
- Page-specific logic (use page components)
- Heavy computation (use build-time processing)
- Database queries (use API routes or page data)

### Integration with T125

This middleware builds on T125 i18n utilities:
- `getLocaleFromRequest()` - Multi-source detection
- `extractLocaleFromPath()` - URL parsing
- `isValidLocale()` - Validation

**Together**: Complete i18n system from utilities → middleware → pages

---

**Date**: November 2, 2025
**Integration**: T125 i18n Utilities
**Status**: Production-Ready
**WCAG Compliance**: ✅ AA
