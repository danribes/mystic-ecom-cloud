# T166: Static UI Translation - Learning Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Why Translation Matters](#why-translation-matters)
3. [Core Concepts](#core-concepts)
4. [Implementation Patterns](#implementation-patterns)
5. [Best Practices](#best-practices)
6. [Common Pitfalls](#common-pitfalls)
7. [Advanced Techniques](#advanced-techniques)
8. [Testing Strategies](#testing-strategies)
9. [Practical Examples](#practical-examples)
10. [Resources](#resources)

## Introduction

This guide explains how to implement translations for static UI content in an Astro-based web application. By "static UI content," we mean the unchanging interface elements like navigation menus, buttons, labels, and error messages—as opposed to dynamic user-generated content from a database.

### What You'll Learn
- How to structure translation files
- How to integrate translations into Astro components
- How to handle dynamic values in translations
- How to pass translations to client-side JavaScript
- How to test multilingual applications

### Prerequisites
- Basic understanding of Astro components
- Familiarity with TypeScript/JavaScript
- Understanding of JSON structure
- Knowledge of i18n concepts (see T125 for foundational knowledge)

## Why Translation Matters

### Business Impact
- **Market Expansion**: Reach users who speak different languages
- **User Experience**: Users prefer interfaces in their native language
- **Compliance**: Some regions require localized interfaces
- **Competitive Advantage**: Many competitors don't offer multilingual support

### Technical Benefits
- **Code Organization**: Separates content from code
- **Maintenance**: Easier to update text without touching code
- **Consistency**: Ensures consistent terminology across the app
- **Flexibility**: Easy to add new languages

### Real-World Example
A spirituality platform serving both English and Spanish-speaking communities needs to present:
- English: "Sign In" / Spanish: "Iniciar Sesión"
- English: "Courses" / Spanish: "Cursos"
- English: "Welcome back, {{name}}!" / Spanish: "¡Bienvenido de nuevo, {{name}}!"

## Core Concepts

### 1. Translation Keys
Translation keys are hierarchical identifiers for text strings.

**Structure**:
```
category.subcategory.identifier
```

**Examples**:
```json
{
  "common": {
    "appName": "Spirituality Platform",
    "welcome": "Welcome"
  },
  "nav": {
    "home": "Home",
    "courses": "Courses"
  }
}
```

**Why Hierarchical?**
- Organized by feature/component
- Prevents naming conflicts
- Easy to find related translations
- Scales well as app grows

### 2. Locale Detection
The locale (language/region) is detected from multiple sources:

**Priority Order**:
1. **URL Path**: `/es/courses` → Spanish
2. **Cookie**: `locale=es` → Spanish
3. **Accept-Language Header**: `accept-language: es-ES` → Spanish
4. **Default**: `en` (English)

**Why This Order?**
- URL is explicit user choice (highest priority)
- Cookie remembers user preference
- Header provides browser/system preference
- Default ensures something always works

### 3. Server-Side vs Client-Side
**Server-Side Rendering (SSR)**:
- Translations resolved at build/render time
- Sent to browser as plain HTML
- Fast, SEO-friendly, no JavaScript required

**Client-Side**:
- JavaScript needs translations for dynamic content
- Use data attributes to pass translations from server
- Avoids loading translation files twice

### 4. Translation File Structure

**One File Per Language**:
```
src/i18n/locales/
  ├── en.json (English)
  ├── es.json (Spanish)
  └── fr.json (French - future)
```

**Why JSON?**
- Simple, human-readable format
- Easy to edit by translators
- Native JavaScript support
- Industry standard for i18n

## Implementation Patterns

### Pattern 1: Basic Component Translation

**Step 1**: Import translation function
```astro
---
import { getTranslations } from '../i18n';
---
```

**Step 2**: Get locale and translations
```astro
---
const locale = Astro.locals.locale || 'en';
const t = getTranslations(locale);
---
```

**Step 3**: Use in template
```astro
<h1>{t.common.appName}</h1>
<button>{t.common.submit}</button>
```

**Why This Pattern?**
- Simple and explicit
- Type-safe (with TypeScript)
- Easy to understand and maintain
- Works with Astro's build system

### Pattern 2: Dynamic Values in Translations

**Translation with Placeholder**:
```json
{
  "dashboard": {
    "welcome": "Welcome back, {{name}}!"
  }
}
```

**Using in Component**:
```astro
---
const userName = "Alice";
const welcomeMessage = t.dashboard.welcome.replace('{{name}}', userName);
---

<h1>{welcomeMessage}</h1>
```

**Why .replace()?**
- Simple, no dependencies
- Works with nested values
- Clear what's happening
- Easy to debug

**Multiple Placeholders**:
```javascript
t.message
  .replace('{{name}}', userName)
  .replace('{{count}}', itemCount.toString())
```

### Pattern 3: Passing Translations to JavaScript

**Problem**: Client-side JavaScript needs translations

**Solution**: Use HTML data attributes

**In Component**:
```astro
<div
  id="search"
  data-locale={locale}
  data-t-no-results={t.search.noResults}
  data-t-search-failed={t.search.failed}
>
  <!-- content -->
</div>
```

**In JavaScript**:
```javascript
const element = document.getElementById('search');
const locale = element.dataset.locale;
const noResultsText = element.dataset.tNoResults;
const failedText = element.dataset.tSearchFailed;
```

**Why Data Attributes?**
- No separate API call needed
- Translations rendered server-side
- Single source of truth
- Works without JavaScript initially

### Pattern 4: Aria-Labels and Accessibility

**Static Aria-Label**:
```astro
<button aria-label={t.actions.close}>
  <IconClose />
</button>
```

**Dynamic Aria-Label**:
```astro
<button aria-label={t.actions.delete.replace('{{item}}', itemName)}>
  <IconDelete />
</button>
```

**Why Translate Aria-Labels?**
- Screen readers announce in user's language
- WCAG compliance requirement
- Better accessibility for all users

## Best Practices

### 1. Translation Key Naming

**Good Names**:
```json
{
  "auth": {
    "signIn": "Sign In",
    "signOut": "Sign Out",
    "passwordRequired": "Password is required"
  }
}
```

**Bad Names**:
```json
{
  "button1": "Sign In",
  "btn2": "Sign Out",
  "err1": "Password is required"
}
```

**Rules**:
- Use descriptive names
- Group by feature/component
- Use camelCase for keys
- Be consistent across languages

### 2. Handling Plurals

**Simple Approach** (good for 2 forms):
```json
{
  "items": {
    "one": "{{count}} item",
    "other": "{{count}} items"
  }
}
```

**Usage**:
```javascript
const key = count === 1 ? 'items.one' : 'items.other';
const message = t[key].replace('{{count}}', count);
```

**Complex Languages** (future):
Some languages (Russian, Arabic) have more plural forms. For now, we use simple approach for English/Spanish.

### 3. Date and Number Formatting

**Don't Translate Numbers Directly**:
```javascript
// ❌ Bad
t.price = "1,234.56"  // English
t.price = "1.234,56"  // Spanish

// ✅ Good
const formatter = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: 'USD'
});
const price = formatter.format(1234.56);
// English: $1,234.56
// Spanish: US$ 1.234,56
```

**Date Formatting**:
```javascript
const formatter = new Intl.DateTimeFormat(locale);
const date = formatter.format(new Date());
// English: 11/2/2025
// Spanish: 2/11/2025
```

### 4. Keeping Translations Synchronized

**Checklist for Adding New Translation**:
1. Add key to `en.json`
2. Add corresponding key to `es.json`
3. Test in both languages
4. Update TypeScript types (if using)

**Helpful Script** (future):
```bash
# Check for missing keys
npm run i18n:check
```

### 5. Translation File Organization

**Small Apps** (< 100 keys):
```json
{
  "common": { ... },
  "nav": { ... },
  "auth": { ... }
}
```

**Large Apps** (> 100 keys):
```
locales/
  en/
    common.json
    nav.json
    auth.json
    courses.json
  es/
    common.json
    nav.json
    ...
```

## Common Pitfalls

### 1. Hardcoding Text in Components

**❌ Bad**:
```astro
<button>Click Here</button>
```

**✅ Good**:
```astro
<button>{t.actions.clickHere}</button>
```

**Why?**: Hardcoded text can't be translated

### 2. Concatenating Translated Strings

**❌ Bad**:
```javascript
const message = t.welcome + " " + userName + "!";
// English: "Welcome Alice!"
// Spanish: "Bienvenido Alice!" (incorrect grammar)
```

**✅ Good**:
```json
{
  "welcome": "Welcome {{name}}!"
}
```
```javascript
const message = t.welcome.replace('{{name}}', userName);
// English: "Welcome Alice!"
// Spanish: "¡Bienvenido {{name}}!" → "¡Bienvenido Alice!"
```

**Why?**: Word order varies between languages

### 3. Assuming English Grammar

**❌ Bad**:
```javascript
// Assuming: "item" + "s" = plural
const text = count === 1 ? t.item : t.item + 's';
```

**✅ Good**:
```javascript
const text = count === 1 ? t.item.one : t.item.other;
```

**Why?**: Pluralization rules differ by language

### 4. Translating User-Generated Content

**❌ Wrong Approach**:
```javascript
// Don't translate database content in translation files
const courseName = t.courses.meditation;  // BAD
```

**✅ Right Approach**:
- Store user content in database with language field
- Only translate UI chrome (buttons, labels)
- Consider separate content translation system

### 5. Not Testing in All Languages

**Problem**: Code works in English but breaks in Spanish

**Example**:
```css
.button {
  width: 100px; /* Too narrow for "Registrarse" */
}
```

**Solution**:
```css
.button {
  min-width: 100px; /* Allows text to expand */
  padding: 0 1rem;
}
```

## Advanced Techniques

### 1. Nested Translation Keys

**Accessing Deeply Nested Keys**:
```json
{
  "dashboard": {
    "user": {
      "profile": {
        "edit": {
          "success": "Profile updated successfully"
        }
      }
    }
  }
}
```

**Usage**:
```javascript
const message = t.dashboard.user.profile.edit.success;
```

**Alternative Helper Function**:
```javascript
function getNestedTranslation(keys: string): string {
  return keys.split('.').reduce((obj, key) => obj?.[key], t);
}

const message = getNestedTranslation('dashboard.user.profile.edit.success');
```

### 2. Conditional Translations

**Gender-Specific Translations**:
```json
{
  "welcome": {
    "male": "Welcome, Mr. {{name}}",
    "female": "Welcome, Ms. {{name}}",
    "other": "Welcome, {{name}}"
  }
}
```

**Usage**:
```javascript
const genderKey = user.gender || 'other';
const message = t.welcome[genderKey].replace('{{name}}', user.name);
```

### 3. Rich Text Formatting

**Problem**: Need HTML in translations

**❌ Bad** (XSS vulnerability):
```json
{
  "terms": "I agree to the <a href='/terms'>Terms</a>"
}
```

**✅ Good** (safe):
```json
{
  "terms": {
    "prefix": "I agree to the",
    "linkText": "Terms of Service",
    "suffix": ""
  }
}
```

```astro
<p>
  {t.terms.prefix}
  <a href="/terms">{t.terms.linkText}</a>
  {t.terms.suffix}
</p>
```

### 4. Context-Aware Translations

**Same English Word, Different Contexts**:
```json
{
  "course": {
    "enroll": "Enroll",  // Button text
    "enrollAction": "Enroll in this course",  // Descriptive
    "enrollSuccess": "Successfully enrolled"  // Past tense
  }
}
```

**Why?**: Some languages translate same English word differently based on context

## Testing Strategies

### 1. Unit Tests for Translation Functions

```typescript
import { describe, it, expect } from 'vitest';
import { getTranslations } from '../src/i18n';

describe('Translation System', () => {
  it('should return English translations', () => {
    const t = getTranslations('en');
    expect(t.common.appName).toBe('Spirituality Platform');
  });

  it('should return Spanish translations', () => {
    const t = getTranslations('es');
    expect(t.common.appName).toBe('Plataforma de Espiritualidad');
  });

  it('should handle missing locale', () => {
    const t = getTranslations('invalid' as any);
    expect(t.common.appName).toBe('Spirituality Platform'); // Fallback to English
  });
});
```

### 2. Component Integration Tests

```typescript
describe('Header Component', () => {
  it('should display translated navigation in English', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:4321/');

    const coursesLink = await page.textContent('a[href="/courses"]');
    expect(coursesLink).toBe('Courses');
  });

  it('should display translated navigation in Spanish', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:4321/es/');

    const coursesLink = await page.textContent('a[href="/courses"]');
    expect(coursesLink).toBe('Cursos');
  });
});
```

### 3. Translation Coverage Tests

**Check All Keys Exist**:
```typescript
import enTranslations from '../src/i18n/locales/en.json';
import esTranslations from '../src/i18n/locales/es.json';

function getAllKeys(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object'
      ? getAllKeys(value, fullKey)
      : [fullKey];
  });
}

describe('Translation Coverage', () => {
  it('should have all English keys in Spanish', () => {
    const enKeys = getAllKeys(enTranslations);
    const esKeys = getAllKeys(esTranslations);

    enKeys.forEach(key => {
      expect(esKeys).toContain(key);
    });
  });
});
```

### 4. Visual Regression Tests

**Screenshot Comparison**:
```typescript
it('should match English homepage screenshot', async () => {
  await page.goto('http://localhost:4321/');
  const screenshot = await page.screenshot();
  expect(screenshot).toMatchImageSnapshot();
});

it('should match Spanish homepage screenshot', async () => {
  await page.goto('http://localhost:4321/es/');
  const screenshot = await page.screenshot();
  expect(screenshot).toMatchImageSnapshot();
});
```

## Practical Examples

### Example 1: Translating a Login Form

**Translation Files**:
```json
// en.json
{
  "login": {
    "title": "Sign In",
    "email": "Email Address",
    "password": "Password",
    "submit": "Sign In",
    "forgot": "Forgot Password?",
    "noAccount": "Don't have an account?",
    "signUp": "Sign Up"
  }
}

// es.json
{
  "login": {
    "title": "Iniciar Sesión",
    "email": "Correo Electrónico",
    "password": "Contraseña",
    "submit": "Iniciar Sesión",
    "forgot": "¿Olvidaste tu contraseña?",
    "noAccount": "¿No tienes una cuenta?",
    "signUp": "Registrarse"
  }
}
```

**Component**:
```astro
---
import { getTranslations } from '../i18n';

const locale = Astro.locals.locale || 'en';
const t = getTranslations(locale);
---

<form action="/api/auth/login" method="POST">
  <h2>{t.login.title}</h2>

  <label for="email">{t.login.email}</label>
  <input
    type="email"
    id="email"
    name="email"
    aria-label={t.login.email}
    required
  />

  <label for="password">{t.login.password}</label>
  <input
    type="password"
    id="password"
    name="password"
    aria-label={t.login.password}
    required
  />

  <button type="submit">{t.login.submit}</button>

  <a href="/forgot-password">{t.login.forgot}</a>

  <p>
    {t.login.noAccount}
    <a href="/register">{t.login.signUp}</a>
  </p>
</form>
```

### Example 2: Translating Error Messages

**Translation Files**:
```json
// en.json
{
  "errors": {
    "required": "This field is required",
    "invalidEmail": "Invalid email address",
    "passwordTooShort": "Password must be at least {{min}} characters",
    "networkError": "Network error. Please try again."
  }
}
```

**Usage in Form Validation**:
```typescript
function validateForm(data: FormData, t: Translations): Errors {
  const errors: Errors = {};

  const email = data.get('email');
  if (!email) {
    errors.email = t.errors.required;
  } else if (!isValidEmail(email)) {
    errors.email = t.errors.invalidEmail;
  }

  const password = data.get('password');
  if (!password) {
    errors.password = t.errors.required;
  } else if (password.length < 8) {
    errors.password = t.errors.passwordTooShort.replace('{{min}}', '8');
  }

  return errors;
}
```

### Example 3: Translating Dynamic Lists

**Component with Repeating Elements**:
```astro
---
const locale = Astro.locals.locale || 'en';
const t = getTranslations(locale);

const stats = [
  { icon: '📚', count: 150, label: t.stats.courses },
  { icon: '👥', count: 5000, label: t.stats.students },
  { icon: '⭐', count: 4.8, label: t.stats.rating }
];
---

<div class="stats">
  {stats.map(stat => (
    <div class="stat">
      <span class="icon">{stat.icon}</span>
      <span class="count">{stat.count}</span>
      <span class="label">{stat.label}</span>
    </div>
  ))}
</div>
```

## Resources

### Official Documentation
- [Astro Internationalization Guide](https://docs.astro.build/en/guides/internationalization/)
- [MDN Web Docs: Internationalization](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [WCAG 3.1 Language Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html)

### Tools and Libraries
- [i18next](https://www.i18next.com/) - Full-featured i18n framework
- [FormatJS](https://formatjs.io/) - Internationalization libraries
- [Crowdin](https://crowdin.com/) - Translation management platform
- [Lokalise](https://lokalise.com/) - Localization platform

### Project-Specific Documentation
- [T125 i18n Utilities Guide](./T125_i18n_utilities_Guide.md)
- [T163 i18n Middleware Guide](./T163_i18n_middleware_Guide.md)
- [T164 LanguageSwitcher Guide](./T164_Language_Switcher_Guide.md)

### Further Reading
- "Internationalization and Localization: A Guide for Technical Communicators"
- [Google I18n Best Practices](https://developers.google.com/international/)
- [Unicode CLDR](https://cldr.unicode.org/) - Locale data standards

## Conclusion

Static UI translation is a crucial feature for building globally accessible applications. By following the patterns and best practices outlined in this guide, you can create a maintainable, scalable translation system that:

- Provides excellent user experience for all languages
- Remains easy to maintain and extend
- Integrates seamlessly with modern web frameworks
- Meets accessibility and compliance standards

Remember: good internationalization is invisible to users—it just works in their language.

## Next Steps

1. **Practice**: Translate a small component following the patterns
2. **Review**: Check existing components for hardcoded text
3. **Expand**: Add translations to remaining components
4. **Test**: Write tests for all translated components
5. **Learn More**: Study T125, T163, T164 for deeper understanding

Happy translating! 🌍
