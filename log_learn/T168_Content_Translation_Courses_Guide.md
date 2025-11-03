# T168: Content Translation for Courses - Learning Guide

## What Was Implemented

T168 implements locale-aware content retrieval for courses, allowing course information to be displayed in the user's preferred language (English or Spanish).

## Key Concepts

### 1. Locale-Aware Data Retrieval
Instead of storing courses in separate tables per language, we use a column-based approach where Spanish columns exist alongside English ones.

### 2. SQL COALESCE for Fallback
```sql
COALESCE(NULLIF(title_es, ''), title) AS title
```
- First tries Spanish title (`title_es`)
- If empty or NULL, falls back to English (`title`)
- Happens in database for efficiency

### 3. Middleware Integration
```typescript
const locale = Astro.locals.locale || 'en';
```
Uses locale set by T163 middleware (from URL, cookie, or Accept-Language header)

## Core Functions

### getLocalizedCourseById(id, locale)
```typescript
const course = await getLocalizedCourseById('uuid-here', 'es');
// Returns course with Spanish content
```

### getLocalizedCourseBySlug(slug, locale)
```typescript
const course = await getLocalizedCourseBySlug('quantum-mastery', 'en');
// Returns course by URL slug with English content
```

### getLocalizedCourses(filters)
```typescript
const result = await getLocalizedCourses({
  locale: 'es',
  level: 'beginner',
  minPrice: 0,
  maxPrice: 100,
  search: 'meditación',
  limit: 12,
  offset: 0
});
// Returns: {items: Course[], total: number, hasMore: boolean}
```

## Database Schema (Migration 004)

Added base English columns:
- `long_description` - Detailed description
- `learning_outcomes` - Array of learning objectives
- `prerequisites` - Array of requirements

These complement the Spanish versions (`*_es`) from T167.

## Usage in Astro Pages

```astro
---
import { getLocalizedCourseBySlug } from '@/lib/coursesI18n';

const locale = Astro.locals.locale || 'en';
const { id } = Astro.params;
const course = await getLocalizedCourseBySlug(id, locale);
---

<h1>{course.title}</h1>
<p>{course.description}</p>
```

## Pattern for T169 (Events) and T170 (Products)

Follow the same pattern:
1. Create `eventsI18n.ts` / `productsI18n.ts`
2. Implement `getLocalizedXById`, `getLocalizedXBySlug`, `getLocalizedX`
3. Use SQL COALESCE for fallback
4. Update pages to use localized functions
5. Test with both locales

## Testing Approach

Test each function with:
- English locale
- Spanish locale
- Fallback behavior (Spanish missing)
- Null/empty handling
- Data integrity across locales

## Performance Considerations

- Single database query (no JOINs for translations)
- COALESCE computed in database
- Locale parameter not passed to DB (embedded in SQL)
- Efficient for read-heavy workloads

## Lessons Learned

1. **Column naming matters**: Use `learning_outcomes` not `learning_outcomes_en` for base columns
2. **Enrollment table missing**: Had to hardcode enrollment count to 0
3. **Category column missing**: Some filter tests skipped
4. **Price stored as decimal**: No conversion needed from "cents"

## Next Steps

Apply this pattern to:
- T169: Events translation
- T170: Products translation
- Consider adding category column to courses
- Create enrollments tracking system
