# T173: Page Translations - Learning Guide

## What Was Implemented

T173 establishes the infrastructure and patterns for using translated content across all Astro pages. It provides helper utilities that simplify accessing translations and demonstrates the pattern through homepage translations and comprehensive tests.

## Key Concepts

### 1. Page Translation Helpers
Utilities that simplify using translations in Astro pages by providing convenient access to the `t()` function with the current locale.

### 2. useTranslations Hook
A React-style hook pattern that extracts both the locale and translation function from Astro.locals:

```typescript
const { locale, t: translate } = useTranslations(Astro.locals);
```

### 3. Two-Layer Translation Approach
- **UI Text**: Static text (buttons, labels, headings) from JSON files
- **Database Content**: Dynamic content (courses, events) from localized database queries

## Core Functions

### getTranslate(locale)
Returns a translation function pre-bound to a specific locale.

```typescript
const translate = getTranslate('en');
const title = translate('home.heroTitle');  // "Transform Your Reality Through"
```

### getLocale(locals)
Extracts locale from Astro.locals with fallback to 'en'.

```typescript
const locale = getLocale(Astro.locals);  // 'en' or 'es'
```

### useTranslations(locals)
Combined helper returning both locale and translate function.

```typescript
const { locale, t: translate } = useTranslations(Astro.locals);
```

## Usage Pattern

### Step 1: Import and Setup
```astro
---
import { useTranslations } from '@/lib/pageTranslations';
const { locale, t: translate } = useTranslations(Astro.locals);
---
```

### Step 2: Use in Templates
```astro
<h1>{translate('home.heroTitle')}</h1>
<p>{translate('home.heroDescription')}</p>
<a href="/courses">{translate('home.browseAllCourses')}</a>
```

### Step 3: Combine with Database Content
```astro
---
import { getLocalizedCourses } from '@/lib/coursesI18n';
const courses = await getLocalizedCourses({ locale });
---

{courses.map(course => (
  <div>
    <h3>{course.title}</h3>
    <p>{course.description}</p>
  </div>
))}
```

## Complete Page Example

```astro
---
import BaseLayout from '@/layouts/BaseLayout.astro';
import { useTranslations } from '@/lib/pageTranslations';
import { getLocalizedCourses } from '@/lib/coursesI18n';
import { formatCurrency } from '@/lib/currencyFormat';

// Get locale and translate function
const { locale, t: translate } = useTranslations(Astro.locals);

// Fetch localized data
const featuredCourses = await getLocalizedCourses({
  featured: true,
  locale,
  limit: 3
});
---

<BaseLayout
  title={translate('home.metaTitle')}
  description={translate('home.metaDescription')}
>
  <!-- Hero Section -->
  <section class="bg-gradient-to-br from-primary to-secondary py-20 text-white">
    <div class="container text-center">
      <h1 class="text-4xl font-bold mb-6">
        {translate('home.heroTitle')}<br />
        <span class="text-amber-400">{translate('home.heroSubtitle')}</span>
      </h1>
      <p class="text-xl mb-8">{translate('home.heroDescription')}</p>
      <div class="flex gap-4 justify-center">
        <a href="/courses" class="btn-primary">
          {translate('home.browseAllCourses')}
        </a>
        <a href="/about" class="btn-secondary">
          {translate('home.learnMore')}
        </a>
      </div>
    </div>
  </section>

  <!-- Featured Courses -->
  <section class="py-16">
    <div class="container">
      <h2 class="text-3xl font-bold text-center mb-4">
        {translate('home.featuredCoursesTitle')}
      </h2>
      <p class="text-center text-gray-600 mb-12">
        {translate('home.featuredCoursesDescription')}
      </p>

      <div class="grid md:grid-cols-3 gap-8">
        {featuredCourses.map(course => (
          <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <img src={course.imageUrl} alt={course.title} class="w-full h-48 object-cover" />
            <div class="p-6">
              <h3 class="text-xl font-bold mb-2">{course.title}</h3>
              <p class="text-gray-600 mb-4">{course.description}</p>
              <div class="flex justify-between items-center">
                <span class="font-bold text-primary">
                  {formatCurrency(course.price, locale)}
                </span>
                <a href={`/courses/${course.id}`} class="text-primary hover:underline">
                  {translate('courses.learnMore')} →
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
</BaseLayout>
```

## Benefits

1. **Simple API**: One-line setup for translations
2. **Type-Safe**: TypeScript ensures correct usage
3. **Consistent**: Single pattern across all pages
4. **Flexible**: Works with both static and dynamic content
5. **Maintainable**: Centralized translation management

## Integration with Other Systems

- **T125**: Uses base i18n utilities
- **T163**: Gets locale from middleware
- **T168/T169/T170**: Combines with localized database queries
- **T171/T172**: Works with date and currency formatting

## Next Steps

Apply this pattern to:
1. Courses pages (index and detail)
2. Events pages (index and detail)
3. Products pages (index and detail)
4. Dashboard pages
5. Navigation and footer components

## Conclusion

T173 provides a simple, consistent pattern for using translations in Astro pages, making it easy to build fully multilingual applications.
