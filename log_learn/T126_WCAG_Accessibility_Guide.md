# T126: Web Accessibility (WCAG 2.1 AA) - Educational Guide

**Topic**: Building Accessible Web Applications
**Level**: Intermediate
**Date**: November 2, 2025
**Standards**: WCAG 2.1 Level AA

---

## Table of Contents

1. [What is Web Accessibility?](#what-is-web-accessibility)
2. [Why Accessibility Matters](#why-accessibility-matters)
3. [WCAG 2.1 Overview](#wcag-21-overview)
4. [ARIA (Accessible Rich Internet Applications)](#aria-accessible-rich-internet-applications)
5. [Keyboard Navigation](#keyboard-navigation)
6. [Focus Management](#focus-management)
7. [Screen Readers](#screen-readers)
8. [Color Contrast](#color-contrast)
9. [Best Practices](#best-practices)
10. [Testing for Accessibility](#testing-for-accessibility)

---

## What is Web Accessibility?

**Web accessibility** means that websites, tools, and technologies are designed and developed so that people with disabilities can use them.

### Types of Disabilities
- **Visual**: Blind, low vision, color blindness
- **Auditory**: Deaf or hard of hearing
- **Motor**: Difficulty using mouse, tremors, paralysis
- **Cognitive**: Learning disabilities, memory issues, attention disorders
- **Neurological**: Epilepsy (sensitive to flashing content)

### The A11y Abbreviation
"A11y" is short for "accessibility" (a + 11 letters + y)

---

## Why Accessibility Matters

### Legal Requirements
- **ADA** (Americans with Disabilities Act)
- **Section 508** (US Federal accessibility standards)
- **European Accessibility Act**
- Lawsuits for inaccessible websites increasing

### Business Benefits
- **Larger Market**: 15% of population has disabilities
- **Better SEO**: Semantic HTML helps search engines
- **Improved UX**: Benefits all users (mobile, elderly, situational disabilities)
- **Brand Reputation**: Shows social responsibility

### Ethical Reasons
- **Equal Access**: Everyone deserves access to information
- **Human Rights**: Web access is a basic right
- **Inclusion**: Building for everyone, not just able-bodied users

---

## WCAG 2.1 Overview

**WCAG** = Web Content Accessibility Guidelines

### Four Principles (POUR)

1. **Perceivable**: Information must be presented in ways users can perceive
2. **Operable**: UI components must be operable by all users
3. **Understandable**: Information and operation must be understandable
4. **Robust**: Content must be robust enough to work with assistive technologies

### Conformance Levels

- **Level A**: Basic accessibility (minimum)
- **Level AA**: Mid-range accessibility (recommended)
- **Level AAA**: Highest accessibility (not always achievable)

**Our Goal**: WCAG 2.1 Level AA compliance

---

## ARIA (Accessible Rich Internet Applications)

ARIA provides additional semantic information to assistive technologies.

### ARIA Roles

Roles define what an element is:

```html
<div role="navigation">Main Menu</div>
<div role="button">Click Me</div>
<div role="alert">Error: Invalid input</div>
```

**Common Roles**:
- `button`, `link`, `navigation`, `main`, `dialog`
- `alert`, `status`, `progressbar`, `tablist`, `tab`

### ARIA States and Properties

**States** (dynamic):
```html
<button aria-pressed="true">Bold</button>
<div aria-expanded="false">Collapsed Menu</div>
<input aria-invalid="true" aria-required="true" />
```

**Properties** (often static):
```html
<button aria-label="Close dialog">×</button>
<div aria-describedby="help-text">Input</div>
<input aria-labelledby="label-id" />
```

### The First Rule of ARIA

**Use semantic HTML first!**

❌ Bad:
```html
<div role="button" tabindex="0" onclick="...">Click</div>
```

✅ Good:
```html
<button onclick="...">Click</button>
```

### When to Use ARIA

1. **Custom widgets**: Tabs, accordions, sliders
2. **Live regions**: Dynamic content updates
3. **Landmarks**: Navigation, main, complementary
4. **Complex relationships**: When HTML alone isn't enough

---

## Keyboard Navigation

All functionality must be accessible via keyboard.

### Essential Keys

- **Tab**: Move forward through focusable elements
- **Shift+Tab**: Move backward
- **Enter**: Activate buttons/links
- **Space**: Activate buttons, checkboxes
- **Arrow Keys**: Navigate within components (menus, tabs)
- **Escape**: Close dialogs/menus
- **Home/End**: Jump to start/end

### Focus Indicators

```css
/* Enhanced focus visible */
:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

/* Remove default outline (but keep :focus-visible) */
:focus:not(:focus-visible) {
  outline: none;
}
```

### Tabindex Attribute

```html
<!-- Make non-interactive element focusable -->
<div tabindex="0">Focusable div</div>

<!-- Remove from tab order -->
<div tabindex="-1">Not tabbable (can focus programmatically)</div>

<!-- Custom tab order (avoid, breaks natural flow) -->
<input tabindex="2" /> <!-- Don't do this! -->
```

### Roving Tabindex

For lists/menus, only one item is tabbable at a time:

```javascript
// First item: tabindex="0"
// Others: tabindex="-1"
// Arrow keys move focus
items.forEach((item, index) => {
  item.setAttribute('tabindex', index === 0 ? '0' : '-1');
  item.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      // Move focus to next item
    }
  });
});
```

---

## Focus Management

### Focus Trapping (Modals)

When a modal opens, trap focus inside:

```javascript
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  container.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    if (e.key === 'Escape') {
      closeModal();
    }
  });

  first.focus(); // Focus first element
}
```

### Focus Restoration

When closing a modal, return focus to the trigger:

```javascript
const trigger = document.getElementById('open-modal-btn');
trigger.addEventListener('click', () => {
  openModal();
  // Save reference to trigger
});

function closeModal() {
  modal.style.display = 'none';
  trigger.focus(); // Restore focus
}
```

### Skip Links

Allow keyboard users to skip navigation:

```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
...
<main id="main-content">
  <!-- Content here -->
</main>
```

```css
.skip-link {
  position: absolute;
  top: -40px; /* Hidden by default */
  left: 0;
}

.skip-link:focus {
  top: 0; /* Visible on focus */
  z-index: 9999;
}
```

---

## Screen Readers

### Live Regions

Announce dynamic content changes:

```html
<!-- Polite: Wait for screen reader to finish -->
<div role="status" aria-live="polite">
  Item added to cart
</div>

<!-- Assertive: Interrupt screen reader -->
<div role="alert" aria-live="assertive">
  Error: Payment failed
</div>
```

### Screen Reader Only Content

Visually hidden but announced:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

```html
<button>
  <svg>...</svg>
  <span class="sr-only">Close dialog</span>
</button>
```

### ARIA Labels

```html
<!-- aria-label: Direct label -->
<button aria-label="Close">×</button>

<!-- aria-labelledby: Reference another element -->
<h2 id="dialog-title">Confirm Delete</h2>
<div role="dialog" aria-labelledby="dialog-title">

<!-- aria-describedby: Additional description -->
<input
  id="password"
  aria-describedby="password-help"
/>
<span id="password-help">Must be 8+ characters</span>
```

---

## Color Contrast

### WCAG Contrast Ratios

- **Level AA (Normal Text)**: 4.5:1 minimum
- **Level AA (Large Text 18pt+)**: 3:1 minimum
- **Level AAA (Normal Text)**: 7:1 minimum
- **Level AAA (Large Text)**: 4.5:1 minimum

### Calculating Contrast

```javascript
function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928
      ? c / 12.92
      : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1, color2) {
  const l1 = getRelativeLuminance(color1.r, color1.g, color1.b);
  const l2 = getRelativeLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Example
const ratio = getContrastRatio(
  { r: 0, g: 0, b: 0 },     // Black
  { r: 255, g: 255, b: 255 } // White
);
// ratio = 21 (maximum contrast)
```

### Tools for Checking Contrast
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Chrome DevTools**: Built-in contrast checker
- **WAVE Browser Extension**

---

## Best Practices

### 1. Semantic HTML

```html
<!-- ✅ Good -->
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Title</h1>
    <p>Content</p>
  </article>
</main>
<footer>
  <p>&copy; 2025</p>
</footer>

<!-- ❌ Bad -->
<div class="header">
  <div class="nav">
    <div class="link">Home</div>
  </div>
</div>
```

### 2. Form Accessibility

```html
<!-- ✅ Good -->
<label for="email">Email Address</label>
<input
  id="email"
  type="email"
  required
  aria-invalid="false"
  aria-describedby="email-help email-error"
/>
<span id="email-help">We'll never share your email</span>
<span id="email-error" role="alert" hidden>Invalid email</span>

<!-- ❌ Bad -->
<input type="email" placeholder="Email" />
```

### 3. Image Accessibility

```html
<!-- Informative image -->
<img src="chart.png" alt="Sales increased 25% in Q3" />

<!-- Decorative image -->
<img src="decorative.png" alt="" /> <!-- Empty alt, not missing! -->

<!-- Icon with text -->
<button>
  <img src="icon.svg" alt="" /> <!-- Icon is decorative -->
  Submit
</button>

<!-- Icon without text -->
<button aria-label="Submit">
  <img src="icon.svg" alt="" />
</button>
```

### 4. Heading Hierarchy

```html
<!-- ✅ Good -->
<h1>Page Title</h1>
  <h2>Section 1</h2>
    <h3>Subsection 1.1</h3>
  <h2>Section 2</h2>

<!-- ❌ Bad (skipping levels) -->
<h1>Page Title</h1>
  <h3>Section 1</h3> <!-- Skipped h2 -->
```

### 5. Link Text

```html
<!-- ✅ Good -->
<a href="/courses">View all courses</a>
<a href="/article">Read more about accessibility</a>

<!-- ❌ Bad -->
<a href="/courses">Click here</a>
<a href="/article">More</a>
```

---

## Testing for Accessibility

### Automated Tools

1. **axe DevTools** (Chrome/Firefox extension)
2. **WAVE** (WebAIM's tool)
3. **Lighthouse** (Chrome DevTools)
4. **Pa11y** (Command-line tool)

### Manual Testing

1. **Keyboard Only**:
   - Unplug mouse
   - Tab through entire page
   - Check focus indicators
   - Test all interactions

2. **Screen Reader**:
   - **NVDA** (Windows, free)
   - **JAWS** (Windows, paid)
   - **VoiceOver** (Mac/iOS, built-in)
   - **TalkBack** (Android, built-in)

3. **Zoom/Text Size**:
   - Test at 200% zoom
   - Increase text size in browser
   - Check for overflow/breaking

4. **Color Contrast**:
   - Use contrast checkers
   - Test in grayscale mode
   - Simulate color blindness

### Testing Checklist

- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Skip link is present
- [ ] Heading hierarchy is logical
- [ ] Color contrast meets AA
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] No keyboard traps
- [ ] Screen reader announces changes
- [ ] Links have descriptive text
- [ ] Errors are announced
- [ ] Animations respect prefers-reduced-motion

---

## Common Mistakes

### 1. Using Placeholders as Labels

❌ Bad:
```html
<input type="email" placeholder="Email address" />
```

✅ Good:
```html
<label for="email">Email address</label>
<input id="email" type="email" />
```

### 2. Removing Focus Outlines

❌ Bad:
```css
*:focus {
  outline: none; /* Never do this! */
}
```

✅ Good:
```css
:focus-visible {
  outline: 3px solid blue;
}
```

### 3. Click-Only Interactions

❌ Bad:
```html
<div onclick="handleClick()">Click me</div>
```

✅ Good:
```html
<button onclick="handleClick()">Click me</button>
```

### 4. Auto-Playing Media

❌ Bad:
```html
<video autoplay>...</video>
```

✅ Good:
```html
<video controls>...</video>
```

### 5. Incorrect ARIA Usage

❌ Bad:
```html
<button role="button">Click</button> <!-- Redundant -->
<h1 role="heading">Title</h1> <!-- Unnecessary -->
```

✅ Good:
```html
<button>Click</button>
<h1>Title</h1>
```

---

## Resources

### Standards & Guidelines
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/

### Learning
- **WebAIM**: https://webaim.org/
- **The A11Y Project**: https://www.a11yproject.com/
- **MDN Accessibility**: https://developer.mozilla.org/en-US/docs/Web/Accessibility

### Tools
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **WAVE**: https://wave.webaim.org/
- **Pa11y**: https://pa11y.org/

### Testing
- **NVDA** (Screen Reader): https://www.nvaccess.org/
- **Lighthouse**: Built into Chrome DevTools

---

## Conclusion

Web accessibility is not optional—it's essential for:

✅ **Legal compliance** (ADA, Section 508)
✅ **Better UX** for all users
✅ **Larger market reach** (15% of population)
✅ **Improved SEO** (semantic HTML)
✅ **Ethical responsibility** (equal access)

**Key Takeaways**:

1. Use semantic HTML first
2. Provide keyboard navigation
3. Add ARIA only when needed
4. Ensure sufficient color contrast
5. Test with actual assistive technologies
6. Think about diverse users from the start

**Remember**: Accessibility benefits everyone, not just people with disabilities!

---

**Date**: November 2, 2025
**Standards**: WCAG 2.1 Level AA
**Status**: Educational Material - Ready for Learning
