# T164: Language Switcher Component - Learning Guide

**Topic**: Building Accessible Dropdown Components with Keyboard Navigation
**Level**: Intermediate
**Date**: November 2, 2025
**Prerequisites**: HTML, CSS, JavaScript, Astro basics

---

## Table of Contents

1. [What is a Language Switcher?](#what-is-a-language-switcher)
2. [Why Use a Dropdown Component?](#why-use-a-dropdown-component)
3. [Component Architecture](#component-architecture)
4. [Keyboard Navigation Patterns](#keyboard-navigation-patterns)
5. [ARIA Accessibility](#aria-accessibility)
6. [Focus Management](#focus-management)
7. [Cookie-Based Persistence](#cookie-based-persistence)
8. [URL Localization Patterns](#url-localization-patterns)
9. [CSS Animations](#css-animations)
10. [Event Handling](#event-handling)
11. [Integration Patterns](#integration-patterns)
12. [Testing Strategies](#testing-strategies)

---

## What is a Language Switcher?

A **language switcher** is a UI component that allows users to change the language (locale) of a website.

### Common Patterns

**1. Dropdown (Our Choice)**
```
┌─────────────┐
│ 🇺🇸 EN ▼   │ ← Toggle
└─────────────┘
  ┌───────────────────┐
  │ 🇪🇸 Español       │ ← Options
  └───────────────────┘
```

**Pros**:
- ✅ Compact (doesn't take space)
- ✅ Scalable (supports many languages)
- ✅ Professional appearance

**Cons**:
- ⚠️ Requires JavaScript for interaction
- ⚠️ More complex to implement

**2. Inline Links**
```
English | Español
```

**Pros**:
- ✅ Simple to implement
- ✅ Works without JavaScript

**Cons**:
- ⚠️ Takes horizontal space
- ⚠️ Doesn't scale to many languages

**3. Flag Icons Only**
```
🇺🇸 | 🇪🇸
```

**Pros**:
- ✅ Very compact

**Cons**:
- ⚠️ Not accessible (flags aren't clear to all users)
- ⚠️ Some regions share flags

### Our Implementation

We use a **dropdown pattern** with:
- Flag icons (visual)
- Language codes (EN/ES)
- Native language names (English/Español)
- Full keyboard navigation
- ARIA accessibility

---

## Why Use a Dropdown Component?

### Problem Without Dropdown

Inline links take space and don't scale:

```astro
<!-- ❌ Bad: Takes space, doesn't scale -->
<nav>
  <a href="/">English</a> |
  <a href="/es">Español</a> |
  <a href="/fr">Français</a> |
  <a href="/de">Deutsch</a>
  <!-- Gets crowded quickly! -->
</nav>
```

### Solution With Dropdown

Compact and scalable:

```astro
<!-- ✅ Good: Compact, scales to any number of languages -->
<LanguageSwitcher />
<!-- Shows current, hides others until needed -->
```

**Benefits**:
- Saves header space
- Supports unlimited languages
- Professional UX pattern
- Matches user expectations

---

## Component Architecture

### Astro Component Structure

```astro
---
// 1. FRONTMATTER (Server-side logic)
import { LOCALES, LOCALE_NAMES, type Locale } from '../i18n';

const currentLocale = Astro.locals.locale || 'en';
const languages = [ /* config */ ];
---

<!-- 2. TEMPLATE (HTML markup) -->
<div class="language-switcher">
  <button>Toggle</button>
  <div class="dropdown-menu">
    {languages.map(lang => <a>{lang.name}</a>)}
  </div>
</div>

<!-- 3. STYLES (Scoped CSS) -->
<style>
  .dropdown-menu { /* styles */ }
</style>

<!-- 4. JAVASCRIPT (Client-side behavior) -->
<script>
  function initLanguageSwitcher() { /* logic */ }
</script>
```

### Component Lifecycle

```
Server-side (Build/Request Time)
  ↓
1. Frontmatter executes
   - Read Astro.locals.locale (from T163 middleware)
   - Generate URLs for each locale
   - Prepare language data
  ↓
2. Template renders
   - Button with current language
   - Dropdown with options
   - All data embedded in HTML
  ↓
Browser-side (User Interaction)
  ↓
3. JavaScript initializes
   - Query DOM elements
   - Attach event listeners
   - Setup state management
  ↓
4. User interacts
   - Click toggle → open/close
   - Keyboard navigation → focus options
   - Select language → set cookie, navigate
```

---

## Keyboard Navigation Patterns

### WAI-ARIA Menu Button Pattern

Our component follows the [WAI-ARIA Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) specification.

### Keyboard Shortcuts

| Key | When Closed | When Open |
|-----|-------------|-----------|
| **Enter** | Open dropdown | Select focused option |
| **Space** | Open dropdown | Select focused option |
| **Escape** | - | Close dropdown |
| **↓** (Arrow Down) | - | Focus next option |
| **↑** (Arrow Up) | - | Focus previous option |
| **Home** | - | Focus first option |
| **End** | - | Focus last option |
| **Tab** | Move to next element | Close and move to next |

### Implementation

```javascript
function handleKeyDown(event: KeyboardEvent) {
  if (!isOpen) {
    // Toggle with Enter or Space when closed
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
    return;
  }

  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      close();
      break;

    case 'ArrowDown':
      event.preventDefault();
      // Focus next option (with wrapping prevention)
      currentFocusIndex = Math.min(currentFocusIndex + 1, options.length - 1);
      options[currentFocusIndex]?.focus();
      break;

    case 'ArrowUp':
      event.preventDefault();
      // Focus previous option (with wrapping prevention)
      currentFocusIndex = Math.max(currentFocusIndex - 1, 0);
      options[currentFocusIndex]?.focus();
      break;

    case 'Home':
      event.preventDefault();
      currentFocusIndex = 0;
      options[0]?.focus();
      break;

    case 'End':
      event.preventDefault();
      currentFocusIndex = options.length - 1;
      options[currentFocusIndex]?.focus();
      break;
  }
}
```

### Why These Keys?

- **Enter/Space**: Standard button activation (WCAG 2.1.1)
- **Escape**: Standard dismiss action (user expectation)
- **Arrow Keys**: Standard list navigation (menu pattern)
- **Home/End**: Quick access (power user feature)

---

## ARIA Accessibility

### What is ARIA?

**ARIA** (Accessible Rich Internet Applications) adds semantic meaning to HTML for assistive technologies (screen readers, voice control).

### Our ARIA Implementation

**Toggle Button**:
```html
<button
  aria-label="Change language"
  aria-haspopup="true"
  aria-expanded="false"
>
```

**Attributes**:
- `aria-label`: Screen reader announcement ("Change language button")
- `aria-haspopup="true"`: Indicates there's a popup menu
- `aria-expanded="false"`: Current state (false → closed, true → open)

**Dropdown Menu**:
```html
<div
  role="menu"
  aria-label="Language options"
>
```

**Attributes**:
- `role="menu"`: Semantic role (tells screen reader this is a menu)
- `aria-label`: Purpose of the menu

**Language Options**:
```html
<a
  role="menuitem"
  tabindex="-1"
  data-locale="es"
>
```

**Attributes**:
- `role="menuitem"`: Semantic role (menu item)
- `tabindex="-1"`: Focus managed by JavaScript (not in tab order)

### ARIA State Management

```javascript
function open() {
  // Update ARIA state
  toggle.setAttribute('aria-expanded', 'true');

  // Focus first option
  options[0]?.focus();
}

function close() {
  // Update ARIA state
  toggle.setAttribute('aria-expanded', 'false');

  // Return focus to toggle
  toggle.focus();
}
```

**Screen Reader Experience**:
1. Tab to button: "Change language button, collapsed"
2. Press Enter: "Expanded, menu, Language options"
3. Arrow Down: "Español, Spanish, menu item, 1 of 1"
4. Press Enter: (navigates to Spanish version)

---

## Focus Management

### Why Focus Management Matters

**WCAG 2.1.2 No Keyboard Trap**: Users must be able to navigate away from any component using only the keyboard.

**Challenge**: When dropdown opens, where should focus go? When it closes, where should it return?

### Our Approach

**Opening**:
```javascript
function open() {
  isOpen = true;
  dropdown.classList.add('show');
  toggle.setAttribute('aria-expanded', 'true');

  // Focus first option
  currentFocusIndex = 0;
  if (options[0]) {
    options[0].focus(); // ← Focus management
  }
}
```

**Why focus first option?**
- User just opened menu to select something
- Immediate keyboard navigation ready
- Matches user expectation

**Closing**:
```javascript
function close() {
  isOpen = false;
  dropdown.classList.remove('show');
  toggle.setAttribute('aria-expanded', 'false');
  currentFocusIndex = 0;

  // Return focus to toggle
  toggle.focus(); // ← Focus management
}
```

**Why return to toggle?**
- User closed menu (Escape or click outside)
- Focus shouldn't be lost
- User knows where they are

### Tabindex Management

```astro
{otherLanguages.map((lang, index) => (
  <a
    role="menuitem"
    tabindex={index === 0 ? 0 : -1}
  >
))}
```

**Why `-1` for non-first options?**
- JavaScript manages focus (Arrow keys)
- Prevents Tab key from cycling through all options
- Only first option is in tab order (when menu open)

---

## Cookie-Based Persistence

### Why Cookies?

**Goal**: Remember user's language preference across sessions

**Options**:

| Method | Persistence | Server Access | Privacy |
|--------|-------------|---------------|---------|
| URL only | None | ✅ Yes | ✅ Best |
| LocalStorage | ✅ Forever | ❌ No | ⚠️ Client-only |
| SessionStorage | ⏱️ Session | ❌ No | ⚠️ Client-only |
| **Cookie** | ✅ Configurable | ✅ Yes | ✅ Good |

**Why Cookie?**
- ✅ Server-side access (T163 middleware)
- ✅ Persistent across sessions
- ✅ Configurable expiration
- ✅ Secure with SameSite

### Cookie Configuration

```javascript
document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
```

**Breaking Down Each Part**:

**1. `locale=${locale}`**
- Cookie name: `locale`
- Cookie value: `'en'` or `'es'`
- Readable by server (T163 middleware)

**2. `path=/`**
- Available site-wide (all pages)
- Without this, cookie only sent for current path

**3. `max-age=31536000`**
- 31,536,000 seconds = 1 year
- Cookie persists for 1 year
- Alternative: `expires=<date>`

**4. `samesite=lax`**
- CSRF protection
- Cookie not sent on cross-origin POST requests
- Cookie sent on top-level navigation (clicking links)

**Missing Flags**:
- No `secure`: Can't be set from JavaScript (browser inherits from connection)
- No `httpOnly`: Required for client-side access (language switcher needs to set it)

### Cookie Flow

```
User clicks "Español"
  ↓
JavaScript sets cookie:
  document.cookie = "locale=es; path=/; max-age=31536000; samesite=lax"
  ↓
Browser stores cookie
  ↓
User navigates to /es/courses
  ↓
Browser sends cookie in request:
  Cookie: locale=es
  ↓
T163 middleware reads cookie:
  const cookieLocale = cookies.get('locale')?.value; // 'es'
  ↓
Middleware sets Astro.locals.locale = 'es'
  ↓
Page renders in Spanish
```

---

## URL Localization Patterns

### URL Structure Options

**1. Path Prefix (Our Choice)**
```
English: https://example.com/courses
Spanish: https://example.com/es/courses
```

**Pros**:
- ✅ SEO-friendly (Google understands /es/)
- ✅ Clear locale in URL
- ✅ Easy to share localized URLs

**2. Subdomain**
```
English: https://example.com/courses
Spanish: https://es.example.com/courses
```

**Pros**:
- ✅ Clean URLs
- ✅ Easy CDN configuration

**Cons**:
- ⚠️ Requires DNS setup
- ⚠️ More complex deployment

**3. Domain**
```
English: https://example.com/courses
Spanish: https://ejemplo.com/courses
```

**Pros**:
- ✅ Clearest separation

**Cons**:
- ⚠️ Expensive (buy multiple domains)
- ⚠️ Complex to maintain

### Generating Localized URLs

**Challenge**: Convert current path to localized version

```
Current: /es/courses/123
English URL: /courses/123
Spanish URL: /es/courses/123
```

**Step 1: Clean Path** (Remove locale prefix)

```typescript
function getCleanPath(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.substring(3); // Remove '/es/'
    }
    if (pathname === `/${locale}`) {
      return '/'; // Root case
    }
  }
  return pathname; // No locale prefix (English)
}
```

**Examples**:
```
/es/courses → /courses
/es → /
/courses → /courses (no change)
```

**Step 2: Add Locale Prefix**

```typescript
const localeUrls: Record<Locale, string> = {
  en: cleanPath || '/',           // English: no prefix
  es: `/es${cleanPath || '/'}`,   // Spanish: /es prefix
};
```

**Examples**:
```
cleanPath: /courses
  EN: /courses
  ES: /es/courses

cleanPath: /
  EN: /
  ES: /es
```

---

## CSS Animations

### Dropdown Transitions

**Goal**: Smooth fade-in + slide-down animation

**CSS**:
```css
.dropdown-menu {
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
}

.dropdown-menu.show {
  display: block;
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
```

**How It Works**:

**Closed State** (default):
```
opacity: 0;           → Invisible
transform: translateY(-8px); → Moved up 8px
pointer-events: none; → Can't interact
```

**Open State** (.show class added):
```
opacity: 1;           → Fully visible
transform: translateY(0); → Normal position
pointer-events: auto; → Can interact
```

**Transition**:
```
transition: opacity 0.2s ease, transform 0.2s ease;
```
- Both opacity and transform animate over 200ms
- `ease` timing function (slow start, fast middle, slow end)

**Why `pointer-events`?**
- `none`: Dropdown can't intercept clicks when hidden
- `auto`: Dropdown intercepts clicks when visible
- Prevents clicking invisible elements

### Chevron Rotation

**Goal**: Rotate chevron icon when dropdown opens

**CSS**:
```css
[aria-expanded="true"] svg {
  transform: rotate(180deg);
}
```

**HTML**:
```html
<button aria-expanded="false">
  <svg><!-- Chevron down --></svg>
</button>
```

**How It Works**:
- Closed: `aria-expanded="false"` → Chevron points down (▼)
- Open: `aria-expanded="true"` → Chevron rotates 180° → points up (▲)

**Why Use `aria-expanded`?**
- Semantic selector (accessible attribute)
- Automatically updated by JavaScript
- No extra class needed

---

## Event Handling

### Click Outside to Close

**Pattern**: Close dropdown when user clicks anywhere outside component

```javascript
function handleClickOutside(event: MouseEvent) {
  if (isOpen && !switcher.contains(event.target as Node)) {
    close();
  }
}

document.addEventListener('click', handleClickOutside);
```

**Logic**:
1. Check if dropdown is open
2. Check if click target is outside component
3. If both true, close dropdown

**Why Global Listener?**
- Can't add click listeners to entire document as individual elements
- One global listener is efficient
- Event delegation pattern

**Cleanup**:
```javascript
document.addEventListener('astro:before-preparation', () => {
  document.removeEventListener('click', handleClickOutside);
});
```

Prevents memory leaks during Astro page transitions.

### Event Listener Setup

```javascript
// Toggle button
toggle.addEventListener('click', toggleDropdown);
toggle.addEventListener('keydown', handleKeyDown);

// Dropdown menu (for keyboard nav when open)
dropdown.addEventListener('keydown', handleKeyDown);

// Language options
options.forEach(option => {
  option.addEventListener('click', (event) => {
    const locale = option.dataset.locale!;
    const url = option.href;
    selectLanguage(event, locale, url);
  });
});

// Global click outside
document.addEventListener('click', handleClickOutside);
```

**Why Multiple Listeners?**
- Each element handles its own events
- Separation of concerns
- Easier to debug and maintain

---

## Integration Patterns

### With T125 i18n Utilities

**Import**:
```typescript
import { LOCALES, LOCALE_NAMES, type Locale } from '../i18n';
```

**Usage**:
```typescript
const languages = [
  { code: 'en' as Locale, name: LOCALE_NAMES['en'], flag: '🇺🇸', nativeName: 'English' },
  { code: 'es' as Locale, name: LOCALE_NAMES['es'], flag: '🇪🇸', nativeName: 'Español' },
];
```

**Why Import from T125?**
- ✅ Single source of truth (LOCALES, LOCALE_NAMES)
- ✅ Type safety (Locale type)
- ✅ Consistency across app

### With T163 Middleware

**Server-Side** (Read locale):
```typescript
const currentLocale = Astro.locals.locale || 'en';
```

Middleware sets `locals.locale` on every request.

**Client-Side** (Set cookie):
```javascript
document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
```

Middleware reads cookie on next request.

**Flow**:
```
1. User opens page
   ↓
2. T163 middleware runs
   ↓
3. Middleware reads cookie (if exists)
   ↓
4. Middleware sets Astro.locals.locale
   ↓
5. LanguageSwitcher renders with current locale
   ↓
6. User clicks different language
   ↓
7. JavaScript sets cookie
   ↓
8. JavaScript navigates to new URL
   ↓
9. T163 middleware runs again
   ↓
10. Middleware reads new cookie value
    ↓
11. Page renders in new locale
```

---

## Testing Strategies

### Source-Based Testing

**Approach**: Read component source code and verify patterns

```typescript
import { readFileSync } from 'fs';

const componentSource = readFileSync('src/components/LanguageSwitcher.astro', 'utf-8');

it('should have open function', () => {
  expect(componentSource).toContain('function open()');
  expect(componentSource).toContain("dropdown.classList.add('show')");
});
```

**Pros**:
- ✅ Fast (<1ms per test)
- ✅ No runtime needed
- ✅ Tests exact implementation

**Cons**:
- ⚠️ Can't test runtime behavior
- ⚠️ Coupled to implementation

### Manual Testing Checklist

- [ ] Click toggle → Dropdown opens
- [ ] Click toggle again → Dropdown closes
- [ ] Click outside → Dropdown closes
- [ ] Press Enter on toggle → Dropdown opens
- [ ] Press Escape in dropdown → Dropdown closes
- [ ] Press Arrow Down → Next option focused
- [ ] Press Arrow Up → Previous option focused
- [ ] Press Enter on option → Language switches
- [ ] Verify cookie set in DevTools
- [ ] Reload page → Preference persists
- [ ] Screen reader announces correctly
- [ ] Keyboard navigation works without mouse

### E2E Testing (Future)

```typescript
// tests/e2e/language-switcher.spec.ts
import { test, expect } from '@playwright/test';

test('should switch to Spanish', async ({ page }) => {
  await page.goto('/courses');

  // Open dropdown
  await page.click('[data-toggle="language-dropdown"]');

  // Click Spanish option
  await page.click('[data-locale="es"]');

  // Verify navigation
  await expect(page).toHaveURL('/es/courses');

  // Verify cookie
  const cookies = await page.context().cookies();
  const localeCookie = cookies.find(c => c.name === 'locale');
  expect(localeCookie?.value).toBe('es');
});
```

---

## Best Practices

### 1. Always Provide Keyboard Access

```javascript
// ✅ Good: Keyboard + Mouse
toggle.addEventListener('click', toggleDropdown);
toggle.addEventListener('keydown', handleKeyDown);

// ❌ Bad: Mouse only
toggle.addEventListener('click', toggleDropdown);
```

### 2. Manage Focus Properly

```javascript
// ✅ Good: Return focus on close
function close() {
  dropdown.classList.remove('show');
  toggle.focus(); // ← Return focus
}

// ❌ Bad: Focus lost
function close() {
  dropdown.classList.remove('show');
  // Focus disappears!
}
```

### 3. Use Semantic HTML + ARIA

```html
<!-- ✅ Good: Semantic + ARIA -->
<button aria-label="Change language" aria-haspopup="true">
  EN ▼
</button>
<div role="menu" aria-label="Language options">
  <a role="menuitem">Español</a>
</div>

<!-- ❌ Bad: Generic div -->
<div onclick="toggle()">EN ▼</div>
<div>
  <div onclick="select('es')">Español</div>
</div>
```

### 4. Clean Up Event Listeners

```javascript
// ✅ Good: Cleanup on navigation
document.addEventListener('astro:before-preparation', () => {
  document.removeEventListener('click', handleClickOutside);
});

// ❌ Bad: Memory leak
// (listener persists after navigation)
```

### 5. Validate User Input

```javascript
// ✅ Good: Validate locale
const locale = option.dataset.locale;
if (isValidLocale(locale)) {
  setLocale(locale);
}

// ❌ Bad: Trust user input
const locale = option.dataset.locale;
document.cookie = `locale=${locale}`; // XSS risk if not validated!
```

---

## Common Pitfalls

### 1. Forgetting to Prevent Default

```javascript
// ❌ Bad: Form submits
toggle.addEventListener('click', () => {
  open();
});

// ✅ Good: Prevent default behavior
toggle.addEventListener('click', (event) => {
  event.preventDefault();
  open();
});
```

### 2. Not Returning Focus

```javascript
// ❌ Bad: Focus lost when closing
function close() {
  dropdown.classList.remove('show');
}
// User presses Escape → Focus disappears → Confusion!

// ✅ Good: Return focus to toggle
function close() {
  dropdown.classList.remove('show');
  toggle.focus();
}
```

### 3. Missing aria-expanded Updates

```javascript
// ❌ Bad: ARIA state not updated
function open() {
  dropdown.classList.add('show');
}
// Screen reader still says "collapsed"!

// ✅ Good: Update ARIA state
function open() {
  dropdown.classList.add('show');
  toggle.setAttribute('aria-expanded', 'true');
}
```

### 4. Incorrect Cookie Path

```javascript
// ❌ Bad: Cookie only for current path
document.cookie = `locale=${locale}`;
// Cookie not sent for /courses if set on /

// ✅ Good: Site-wide cookie
document.cookie = `locale=${locale}; path=/`;
```

### 5. Not Cleaning Up Listeners

```javascript
// ❌ Bad: Memory leak
document.addEventListener('click', handleClickOutside);
// Listener persists after component unmounts!

// ✅ Good: Cleanup
document.addEventListener('astro:before-preparation', () => {
  document.removeEventListener('click', handleClickOutside);
});
```

---

## Resources

### Specifications
- **WAI-ARIA Menu Button**: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **MDN ARIA**: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA

### Related Docs
- **T125 i18n Utilities**: [log_learn/T125_i18n_Structure_Guide.md](log_learn/T125_i18n_Structure_Guide.md)
- **T163 Middleware**: [log_learn/T163_i18n_Middleware_Guide.md](log_learn/T163_i18n_Middleware_Guide.md)

### Tools
- **Axe DevTools**: Browser extension for accessibility testing
- **NVDA**: Free screen reader (Windows)
- **VoiceOver**: Built-in screen reader (macOS)
- **Lighthouse**: Chrome DevTools accessibility audit

---

## Conclusion

### Key Takeaways

1. **Dropdown Pattern**: Compact, scalable language switching
2. **Keyboard Navigation**: Essential for accessibility (WCAG 2.1.1)
3. **Focus Management**: Prevent focus loss (WCAG 2.1.2)
4. **ARIA Attributes**: Screen reader support (WCAG 4.1.2)
5. **Cookie Persistence**: Remember user preference
6. **URL Localization**: SEO-friendly locale routing
7. **Event Handling**: Click outside, keyboard shortcuts
8. **Integration**: T125 utilities + T163 middleware

### Next Steps

- Implement similar dropdowns (user menu, filters)
- Add more languages to switcher
- Enhance with auto-detection
- Build mobile menu integration

---

**Date**: November 2, 2025
**Related Tasks**: T125 (i18n), T163 (middleware)
**Status**: Production-Ready ✅
