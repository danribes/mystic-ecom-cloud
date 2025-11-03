# Phase 2: Layouts & Error Handling (T022-T028)

## Overview

This phase implements the visual structure of the application: reusable layouts, navigation components, global styling with CSS custom properties, and comprehensive error handling with custom error classes and validation utilities.

---

## T022: BaseLayout Component

### File: `src/layouts/BaseLayout.astro`

### What is a Layout?

**Layout = Wrapper for pages:**
```astro
---
// pages/about.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="About Us">
  <h1>About Our Company</h1>
  <p>Content goes here...</p>
</BaseLayout>
```

**Renders as:**
```html
<!DOCTYPE html>
<html>
  <head>
    <title>About Us - Spiritual Journey</title>
    <!-- SEO meta tags -->
  </head>
  <body>
    <Header />
    
    <main>
      <h1>About Our Company</h1>
      <p>Content goes here...</p>
    </main>
    
    <Footer />
  </body>
</html>
```

### BaseLayout Structure

```astro
---
interface Props {
  title: string;
  description?: string;
  image?: string;
}

const { title, description, image } = Astro.props;

const fullTitle = `${title} - Spiritual Journey`;
const defaultDescription = 'Empowering your path to enlightenment through courses, events, and transformative experiences.';
const defaultImage = '/images/og-image.jpg';

const seo = {
  title: fullTitle,
  description: description || defaultDescription,
  image: image || defaultImage,
  url: Astro.url.href,
};
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- SEO Meta Tags -->
    <title>{seo.title}</title>
    <meta name="description" content={seo.description} />
    
    <!-- Open Graph (Facebook, LinkedIn) -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={seo.url} />
    <meta property="og:title" content={seo.title} />
    <meta property="og:description" content={seo.description} />
    <meta property="og:image" content={seo.image} />
    
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content={seo.url} />
    <meta name="twitter:title" content={seo.title} />
    <meta name="twitter:description" content={seo.description} />
    <meta name="twitter:image" content={seo.image} />
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    
    <!-- Global Styles -->
    <link rel="stylesheet" href="/src/styles/global.css" />
  </head>
  <body class="flex min-h-screen flex-col">
    <Header />
    
    <main class="flex-1 py-2xl">
      <slot />
    </main>
    
    <Footer />
  </body>
</html>
```

### SEO Meta Tags Explained

**1. Basic Meta Tags**
```html
<title>About Us - Spiritual Journey</title>
<meta name="description" content="Learn about our mission..." />
```

**Impact on search:**
- **Title**: Shows in Google results as the clickable link
- **Description**: Shows as the snippet below the title
- Length limits: Title ~60 chars, Description ~160 chars

**2. Open Graph (Social Media)**
```html
<meta property="og:title" content="About Us - Spiritual Journey" />
<meta property="og:description" content="Learn about..." />
<meta property="og:image" content="/images/about-og.jpg" />
```

**When shared on Facebook/LinkedIn:**
```
┌─────────────────────────────┐
│ [Image Preview]             │
│                             │
│ About Us - Spiritual Journey│
│ Learn about our mission...  │
│ spiritualjourney.com        │
└─────────────────────────────┘
```

**3. Twitter Cards**
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="About Us" />
```

**Card types:**
- `summary`: Small image (1:1 ratio)
- `summary_large_image`: Large image (2:1 ratio) ✅
- `player`: Video/audio player
- `app`: Mobile app install

### Layout Composition

**Flex layout for sticky footer:**
```html
<body class="flex min-h-screen flex-col">
  <Header />              <!-- Auto height -->
  <main class="flex-1">   <!-- Grows to fill space -->
    <slot />
  </main>
  <Footer />              <!-- Auto height -->
</body>
```

**Why this works:**
```
┌─────────────┐
│   Header    │  height: auto
├─────────────┤
│             │
│    Main     │  flex: 1 (grows)
│   Content   │
│             │
├─────────────┤
│   Footer    │  height: auto
└─────────────┘

Short page:           Long page:
┌────────┐           ┌────────┐
│ Header │           │ Header │
├────────┤           ├────────┤
│ Main   │           │        │
│        │           │ Main   │
├────────┤           │        │
│ Footer │           │ (long) │
└────────┘           │        │
Footer at bottom!    ├────────┤
                     │ Footer │
                     └────────┘
```

### Usage in Pages

```astro
---
// src/pages/courses/index.astro
import BaseLayout from '../../layouts/BaseLayout.astro';

export const prerender = false;
---

<BaseLayout
  title="All Courses"
  description="Explore our comprehensive collection of spiritual courses"
  image="/images/courses-og.jpg"
>
  <div class="container">
    <h1>All Courses</h1>
    <!-- Course list -->
  </div>
</BaseLayout>
```

**SEO result:**
```html
<title>All Courses - Spiritual Journey</title>
<meta name="description" content="Explore our comprehensive..." />
<meta property="og:image" content="/images/courses-og.jpg" />
```

---

## T023: Header Component

### File: `src/components/Header.astro`

### Header Features

**1. Authentication-Aware Navigation**
```astro
const user = Astro.locals.user;      // From auth middleware
const isLoggedIn = !!user;
const isAdmin = user?.role === 'admin';
```

**Dynamic menu based on auth state:**
```
Not logged in:
┌─────────────────────────────────────┐
│ Logo | Courses Events Shop About    │
│                    [Login] [Sign Up]│
└─────────────────────────────────────┘

Logged in (user):
┌─────────────────────────────────────┐
│ Logo | Courses Events Shop About    │
│                    🛒 [User Avatar] │
└─────────────────────────────────────┘

Logged in (admin):
┌─────────────────────────────────────┐
│ Logo | Courses Events Shop About    │
│           [Admin] 🛒 [User Avatar]  │
└─────────────────────────────────────┘
```

**2. Active Link Highlighting**
```astro
const currentPath = Astro.url.pathname;

function isActive(path: string): boolean {
  if (path === '/') {
    return currentPath === '/';
  }
  return currentPath.startsWith(path);
}
```

**Visual indicator:**
```astro
<a
  href="/courses"
  class:list={[
    'font-medium text-text-light hover:text-primary',
    {
      'text-primary after:bg-primary after:h-[2px]': isActive('/courses')
    }
  ]}
>
  Courses
</a>
```

**Result:**
```
/courses page:
  Courses    ← Active (purple text + underline)
  Events     ← Inactive (gray text)
  
/courses/123 page:
  Courses    ← Active (startsWith('/courses'))
  Events     ← Inactive
```

**3. User Avatar Dropdown**
```html
<div class="group relative">
  <button>
    <span class="avatar">
      {user?.name?.charAt(0).toUpperCase()}
    </span>
  </button>
  
  <div class="dropdown hidden group-hover:block">
    <a href="/dashboard">Dashboard</a>
    <a href="/profile">Profile</a>
    <a href="/orders">Orders</a>
    <hr />
    <form action="/api/auth/logout" method="POST">
      <button>Logout</button>
    </form>
  </div>
</div>
```

**CSS-only dropdown (no JavaScript):**
```css
.dropdown {
  display: none;  /* Hidden by default */
}

.group:hover .dropdown {
  display: block;  /* Show on hover */
}
```

**4. Sticky Header**
```html
<header class="sticky top-0 z-[1000] h-[var(--header-height)] bg-background shadow-sm">
```

**Sticky behavior:**
```
Scrolled to top:          Scrolled down:
┌──────────────┐         ┌──────────────┐ ← Header stays
│   Header     │         │   Header     │   visible at top
├──────────────┤         ├──────────────┤
│              │         │              │
│   Content    │         │              │
│              │         │   Content    │
│              │         │              │
```

**Why `z-[1000]`?**
- Ensures header stays above all other content
- Common z-index scale: 0 (default), 10, 100, 1000
- Modals usually 9999, dropdowns 1000, tooltips 100

**5. Responsive Mobile Menu**
```html
<!-- Mobile Toggle (shown on small screens) -->
<button class="md:hidden">
  <span class="hamburger-line"></span>
  <span class="hamburger-line"></span>
  <span class="hamburger-line"></span>
</button>

<!-- Desktop Navigation (hidden on small screens) -->
<nav class="hidden md:block">
  <ul>
    <li><a href="/courses">Courses</a></li>
    ...
  </ul>
</nav>
```

**Breakpoint behavior:**
```
Mobile (<768px):          Desktop (≥768px):
┌──────────────┐         ┌──────────────────────┐
│ Logo    ☰    │         │ Logo  Nav Links Auth │
└──────────────┘         └──────────────────────┘
```

---

## T024: Footer Component

### File: `src/components/Footer.astro`

### Footer Structure

```astro
<footer class="mt-auto border-t bg-surface-dark py-3xl">
  <div class="container">
    <!-- Grid Layout -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2xl">
      
      <!-- About Section (spans 2 columns on desktop) -->
      <div class="md:col-span-2">
        <h3>Spiritual Journey</h3>
        <p>Empowering your path to enlightenment...</p>
        
        <!-- Social Media Links -->
        <div class="flex gap-md">
          <a href="https://facebook.com">📘</a>
          <a href="https://twitter.com">🐦</a>
          <a href="https://instagram.com">📷</a>
          <a href="https://youtube.com">📺</a>
        </div>
      </div>
      
      <!-- Quick Links -->
      <div>
        <h4>Quick Links</h4>
        <ul>
          <li><a href="/courses">Courses</a></li>
          <li><a href="/events">Events</a></li>
          <li><a href="/shop">Shop</a></li>
          <li><a href="/about">About Us</a></li>
        </ul>
      </div>
      
      <!-- Resources -->
      <div>
        <h4>Resources</h4>
        <ul>
          <li><a href="/blog">Blog</a></li>
          <li><a href="/faq">FAQ</a></li>
          <li><a href="/support">Support</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
    </div>
    
    <!-- Copyright -->
    <div class="border-t pt-xl text-center">
      <p>© {currentYear} Spiritual Journey. All rights reserved.</p>
      <p>Built with <span class="animate-heartbeat">❤️</span> and Astro</p>
    </div>
  </div>
</footer>
```

### Responsive Grid Layout

```css
/* Mobile (< 640px): 1 column */
grid-cols-1

/* Tablet (≥ 640px): 2 columns */
sm:grid-cols-2

/* Desktop (≥ 768px): 4 columns */
md:grid-cols-4
```

**Visual layout:**
```
Mobile:               Tablet:               Desktop:
┌────────────┐       ┌──────┬──────┐       ┌───┬───┬───┬───┐
│   About    │       │ About│ About│       │Abt│Qck│Res│Leg│
├────────────┤       ├──────┴──────┤       │   │Lnk│src│al │
│Quick Links │       │ Quick │ Res │       └───┴───┴───┴───┘
├────────────┤       ├───────┼─────┤
│ Resources  │       │ Legal │     │
├────────────┤       └───────┴─────┘
│   Legal    │
└────────────┘
```

### CSS Animation

```css
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

**Applied to:**
```html
<span class="animate-[heartbeat_1.5s_ease-in-out_infinite]">❤️</span>
```

**Animation breakdown:**
- `heartbeat`: Animation name
- `1.5s`: Duration (1.5 seconds per cycle)
- `ease-in-out`: Timing function (smooth start/end)
- `infinite`: Never stops

### Dynamic Year

```astro
const currentYear = new Date().getFullYear();
// Always shows current year (2024, 2025, etc.)
```

---

## T025: Global CSS with Custom Properties

### File: `src/styles/global.css`

### Why CSS Custom Properties?

**Traditional CSS:**
```css
.button-primary {
  background-color: #7c3aed;  /* Purple repeated everywhere */
}

.link {
  color: #7c3aed;  /* Same color, duplicated */
}

/* To change brand color: Find/replace in 50+ files! */
```

**With CSS Variables:**
```css
:root {
  --color-primary: #7c3aed;
}

.button-primary {
  background-color: var(--color-primary);
}

.link {
  color: var(--color-primary);
}

/* To change: Edit one line! */
```

### Color System

**Primary colors (spiritual theme):**
```css
--color-primary: #7c3aed;         /* Purple - spirituality */
--color-primary-light: #a78bfa;
--color-primary-dark: #5b21b6;

--color-secondary: #ec4899;       /* Pink - love/compassion */
--color-accent: #f59e0b;          /* Amber - enlightenment */
```

**Neutral colors:**
```css
--color-background: #ffffff;
--color-surface: #f9fafb;          /* Slightly off-white */
--color-surface-dark: #f3f4f6;     /* Darker off-white */

--color-text: #111827;             /* Nearly black */
--color-text-light: #6b7280;       /* Gray */
--color-text-lighter: #9ca3af;     /* Light gray */

--color-border: #e5e7eb;
--color-border-dark: #d1d5db;
```

**Semantic colors:**
```css
--color-success: #10b981;  /* Green - success messages */
--color-error: #ef4444;    /* Red - error messages */
--color-warning: #f59e0b;  /* Amber - warnings */
--color-info: #3b82f6;     /* Blue - info messages */
```

### Typography System

**Font families:**
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...;
--font-serif: Georgia, 'Times New Roman', serif;
--font-mono: 'Courier New', monospace;
```

**System font stack benefits:**
- No font file downloads (faster)
- Native OS fonts (familiar to users)
- Excellent legibility

**Font sizes (modular scale):**
```css
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
--font-size-3xl: 1.875rem;  /* 30px */
--font-size-4xl: 2.25rem;   /* 36px */
--font-size-5xl: 3rem;      /* 48px */
```

**Why rem units?**
```
User setting: 16px (default)
  1rem = 16px
  2rem = 32px
  
User setting: 20px (accessibility)
  1rem = 20px  ← Automatically scales!
  2rem = 40px

px units don't scale with user preferences
```

### Spacing System

**Consistent spacing scale:**
```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 3rem;     /* 48px */
--spacing-3xl: 4rem;     /* 64px */
```

**Visual spacing:**
```
xs  ▪
sm  ▪▪
md  ▪▪▪▪
lg  ▪▪▪▪▪▪
xl  ▪▪▪▪▪▪▪▪
```

**Usage:**
```css
.card {
  padding: var(--spacing-lg);      /* 24px all sides */
  margin-bottom: var(--spacing-xl); /* 32px bottom */
}
```

### Shadow System

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), ...;
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), ...;
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), ...;
```

**Elevation hierarchy:**
```
No shadow:   [Flat element]
sm:          [Button] ↑ 1px
md:          [Card] ↑ 4px
lg:          [Modal] ↑ 10px
xl:          [Dropdown] ↑ 20px
```

### Responsive Breakpoints

```css
@media (max-width: 768px) {
  :root {
    --font-size-4xl: 1.875rem;  /* Smaller on mobile */
    --font-size-3xl: 1.5rem;
    --font-size-2xl: 1.25rem;
  }
}
```

**Why smaller fonts on mobile?**
- Less screen space
- Closer reading distance
- Prevents text overflow

---

## T026: Error Classes

### File: `src/lib/errors.ts`

### Custom Error Hierarchy

```typescript
// Base error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;  // Safe to show to user
    
    // Maintains stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}
```

### Why Custom Error Classes?

**Problem with generic errors:**
```typescript
// ❌ Hard to handle different error types
try {
  await createUser(data);
} catch (error) {
  // Is this a validation error? Auth error? Unknown!
  return { error: 'Something went wrong' };  // Unhelpful
}
```

**Solution with custom errors:**
```typescript
// ✅ Type-safe error handling
try {
  await createUser(data);
} catch (error) {
  if (error instanceof ValidationError) {
    return { errors: error.errors };  // Show field-specific errors
  }
  if (error instanceof ConflictError) {
    return { error: 'Email already registered' };
  }
  if (error instanceof AppError) {
    return { error: error.message };  // Safe to show
  }
  // Unknown error - log and hide details
  console.error(error);
  return { error: 'Internal server error' };
}
```

### HTTP Status Codes

```typescript
200 OK                  → Request successful
201 Created             → Resource created
400 Bad Request         → ValidationError
401 Unauthorized        → AuthenticationError (not logged in)
403 Forbidden           → AuthorizationError (no permission)
404 Not Found           → NotFoundError
409 Conflict            → ConflictError (duplicate)
429 Too Many Requests   → RateLimitError
500 Internal Server Error → AppError (unexpected)
```

### Error Normalization

```typescript
export function normalizeError(error: unknown): AppError {
  // Already our error type
  if (error instanceof AppError) {
    return error;
  }
  
  // Standard Error
  if (error instanceof Error) {
    return new AppError(error.message);
  }
  
  // String error
  if (typeof error === 'string') {
    return new AppError(error);
  }
  
  // Unknown error type
  return new AppError('An unexpected error occurred');
}
```

**Usage:**
```typescript
try {
  // Code that might throw any type of error
  await someOperation();
} catch (error) {
  const appError = normalizeError(error);
  console.error(`[${appError.statusCode}] ${appError.message}`);
}
```

### Operational vs Programmer Errors

```typescript
isOperational: boolean  // Set to true in AppError
```

**Operational errors (safe to recover):**
- Validation failed
- User not found
- Network timeout
- Duplicate entry
→ Show error message to user

**Programmer errors (NOT safe):**
- Undefined variable
- Type error
- Division by zero
- Out of memory
→ Log error, crash gracefully, don't expose details

**Why distinguish?**
```typescript
function errorHandler(error: Error) {
  if (error instanceof AppError && error.isOperational) {
    // Safe to show to user
    return { error: error.message };
  }
  
  // Programmer error - hide details
  logger.error(error);
  return { error: 'Internal server error' };
}
```

---

## T027: Validation Utilities

### File: `src/lib/validation.ts`

### Zod Schema Validation

**Why Zod?**
```typescript
// ❌ Manual validation (error-prone)
function validateEmail(email: string) {
  if (!email) return 'Email required';
  if (!email.includes('@')) return 'Invalid email';
  if (email.length > 255) return 'Email too long';
  return null;
}

// ✅ Zod (declarative, type-safe)
const emailSchema = z
  .string()
  .min(1, 'Email required')
  .email('Invalid email format')
  .max(255, 'Email too long');

// TypeScript type automatically inferred!
type Email = z.infer<typeof emailSchema>;
```

### Common Schemas

**Email validation:**
```typescript
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()  // Normalize to lowercase
  .trim();        // Remove whitespace
```

**Password validation:**
```typescript
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
```

**Name validation:**
```typescript
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .trim()
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');
```

### Form Schemas

**Registration form:**
```typescript
export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],  // Attach error to this field
});
```

**Login form:**
```typescript
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
```

**Course creation:**
```typescript
export const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be positive').multipleOf(0.01, 'Price must have at most 2 decimal places'),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute'),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  isPublished: z.boolean(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags'),
});
```

### Safe Validation Wrapper

```typescript
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Format Zod errors into field-specific errors
  const errors: Record<string, string[]> = {};
  
  for (const issue of result.error.issues) {
    const field = issue.path.join('.');
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(issue.message);
  }
  
  return { success: false, errors };
}
```

**Usage in API routes:**
```typescript
// POST /api/auth/register
const formData = await request.formData();
const data = Object.fromEntries(formData);

const validation = safeValidate(registerSchema, data);

if (!validation.success) {
  throw new ValidationError('Validation failed', validation.errors);
}

// TypeScript knows validation.data is correctly typed!
const { name, email, password } = validation.data;
```

### Validation Error Response

```typescript
{
  "error": "Validation failed",
  "errors": {
    "email": ["Invalid email format"],
    "password": [
      "Password must be at least 8 characters",
      "Password must contain at least one uppercase letter"
    ],
    "confirmPassword": ["Passwords do not match"]
  }
}
```

**Displaying in forms:**
```astro
{errors?.email && (
  <p class="text-sm text-error">{errors.email[0]}</p>
)}

{errors?.password && (
  <ul class="text-sm text-error">
    {errors.password.map(msg => <li>{msg}</li>)}
  </ul>
)}
```

---

## T028: Utility Functions

### File: `src/lib/utils.ts`

### Price Formatting

```typescript
export function formatPrice(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
```

**Examples:**
```typescript
formatPrice(2999)         → "$29.99"
formatPrice(10000)        → "$100.00"
formatPrice(5, 'USD')     → "$0.05"
formatPrice(12345, 'EUR') → "€123.45"
```

**Why store cents?**
```typescript
// ❌ Floating point errors
let price = 29.99;
price = price * 1.08;  // Add 8% tax
// Result: 32.3892 (rounding errors!)

// ✅ Integer arithmetic (accurate)
let priceCents = 2999;
priceCents = Math.round(priceCents * 1.08);
// Result: 3239 (exact!)
```

### Date Formatting

```typescript
export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return d.toLocaleDateString('en-US');  // "12/31/2024"
  }
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });  // "December 31, 2024"
}
```

### String Utilities

**Slugify (URL-safe strings):**
```typescript
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')  // Remove special chars
    .replace(/\s+/g, '-')      // Spaces to hyphens
    .replace(/-+/g, '-');      // Multiple hyphens to one
}
```

**Examples:**
```typescript
slugify('Hello World!')           → 'hello-world'
slugify('React & Vue.js')         → 'react-vuejs'
slugify('  Multiple   Spaces  ')  → 'multiple-spaces'
```

**Truncate text:**
```typescript
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
```

**Examples:**
```typescript
truncate('Short', 10)                    → 'Short'
truncate('This is a long description', 20) → 'This is a long...'
```

### Array Utilities

**Chunk array:**
```typescript
export function chunk<T>(array: T[], size: number): T[][] {
  return array.reduce((chunks, item, index) => {
    const chunkIndex = Math.floor(index / size);
    if (!chunks[chunkIndex]) {
      chunks[chunkIndex] = [];
    }
    chunks[chunkIndex].push(item);
    return chunks;
  }, [] as T[][]);
}
```

**Examples:**
```typescript
chunk([1, 2, 3, 4, 5, 6], 2)
// [[1, 2], [3, 4], [5, 6]]

chunk(['a', 'b', 'c', 'd', 'e'], 3)
// [['a', 'b', 'c'], ['d', 'e']]
```

**Use case:**
```astro
{chunk(courses, 3).map(row => (
  <div class="grid grid-cols-3">
    {row.map(course => <CourseCard course={course} />)}
  </div>
))}
```

**Unique values:**
```typescript
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}
```

**Examples:**
```typescript
unique([1, 2, 2, 3, 3, 3])     → [1, 2, 3]
unique(['a', 'b', 'a', 'c'])   → ['a', 'b', 'c']
```

**Group by property:**
```typescript
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}
```

**Examples:**
```typescript
const courses = [
  { title: 'React Basics', level: 'beginner' },
  { title: 'Advanced React', level: 'advanced' },
  { title: 'Vue Basics', level: 'beginner' },
];

groupBy(courses, 'level')
// {
//   beginner: [{ title: 'React Basics', ... }, { title: 'Vue Basics', ... }],
//   advanced: [{ title: 'Advanced React', ... }]
// }
```

---

## Complete Layout Flow

```
1. User visits /courses
   ↓
2. Astro renders courses/index.astro
   ↓
3. Page wraps content in BaseLayout
   ↓
4. BaseLayout adds:
   - DOCTYPE and HTML structure
   - SEO meta tags
   - Global CSS
   ↓
5. BaseLayout renders Header
   - Auth middleware provides user data
   - Header shows appropriate menu
   ↓
6. Page content renders in <main>
   ↓
7. BaseLayout renders Footer
   - Social links
   - Site navigation
   - Copyright
   ↓
8. Browser receives complete HTML
```

---

## Testing Strategy

### Component Tests

```typescript
describe('Header', () => {
  it('shows login/signup when not authenticated', () => {
    const { getByText } = render(<Header user={null} />);
    expect(getByText('Login')).toBeInTheDocument();
    expect(getByText('Sign Up')).toBeInTheDocument();
  });

  it('shows user menu when authenticated', () => {
    const { getByText } = render(<Header user={{ name: 'John' }} />);
    expect(getByText('J')).toBeInTheDocument();  // Avatar initial
  });

  it('highlights active link', () => {
    const { getByText } = render(<Header currentPath="/courses" />);
    const link = getByText('Courses');
    expect(link).toHaveClass('text-primary');
  });
});
```

### Validation Tests

```typescript
describe('Validation', () => {
  it('validates email format', () => {
    const result = safeValidate(emailSchema, 'invalid');
    expect(result.success).toBe(false);
    expect(result.errors.email).toContain('Invalid email format');
  });

  it('validates password strength', () => {
    const result = safeValidate(passwordSchema, 'weak');
    expect(result.success).toBe(false);
    expect(result.errors.password).toHaveLength(4);  // Missing upper, number, special, length
  });
});
```

---

## Key Takeaways

1. **BaseLayout** - Consistent structure with SEO meta tags
2. **Header/Footer** - Reusable navigation components
3. **Global CSS** - Design system with CSS custom properties
4. **Custom Errors** - Type-safe error handling with specific classes
5. **Zod Validation** - Declarative schema validation with TypeScript types
6. **Utility Functions** - Reusable helpers for common tasks

---

**Related Files:**
- [src/layouts/BaseLayout.astro](/home/dan/web/src/layouts/BaseLayout.astro)
- [src/components/Header.astro](/home/dan/web/src/components/Header.astro)
- [src/components/Footer.astro](/home/dan/web/src/components/Footer.astro)
- [src/styles/global.css](/home/dan/web/src/styles/global.css)
- [src/lib/errors.ts](/home/dan/web/src/lib/errors.ts)
- [src/lib/validation.ts](/home/dan/web/src/lib/validation.ts)
- [src/lib/utils.ts](/home/dan/web/src/lib/utils.ts)

**Previous Guide:** [Authentication & Sessions (T018-T021)](./phase2-auth-sessions.md)
**Next Guide:** [Test-Driven Development (T029-T031)](./phase3-tdd.md)
