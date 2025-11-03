# T167: Multilingual Content Schema - Learning Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Why Multilingual Database Design Matters](#why-multilingual-database-design-matters)
3. [Database Design Approaches](#database-design-approaches)
4. [Implementation Deep Dive](#implementation-deep-dive)
5. [Using the I18n Content Helpers](#using-the-i18n-content-helpers)
6. [Best Practices](#best-practices)
7. [Common Pitfalls](#common-pitfalls)
8. [Performance Considerations](#performance-considerations)
9. [Future Expansion](#future-expansion)
10. [Practical Examples](#practical-examples)

## Introduction

This guide explains how to design and implement multilingual content storage in a database, specifically for a spirituality e-commerce platform supporting English and Spanish.

### What is Multilingual Content?

**Multilingual Content** refers to user-facing text stored in the database that needs to be displayed in multiple languages. Examples:
- Course titles: "Meditation 101" / "Meditación 101"
- Product descriptions: "Learn to meditate" / "Aprende a meditar"
- Event venue names: "Peace Center" / "Centro de Paz"

This is different from **UI translations** (T166), which handle static interface elements like buttons and navigation.

## Why Multilingual Database Design Matters

### Business Impact
- **Global Reach**: Serve Spanish-speaking markets (500M+ speakers)
- **User Experience**: Content in native language increases engagement
- **SEO**: Localized content ranks better in regional searches
- **Conversion**: Users more likely to purchase in their language

### Technical Challenges
- How to store multiple versions of the same content?
- How to query the correct language efficiently?
- How to handle missing translations (fallback)?
- How to maintain data integrity across languages?

## Database Design Approaches

There are three main approaches to storing multilingual content:

### Approach 1: Column-Based (Our Choice ✅)

**Structure**: Separate columns for each language

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  title VARCHAR(255),           -- English title
  description TEXT,             -- English description
  title_es VARCHAR(255),        -- Spanish title
  description_es TEXT           -- Spanish description
);
```

**Pros**:
- Simple queries (no JOINs)
- Fast reads (single row)
- Easy to understand
- NULL handling for missing translations
- Excellent for 2-5 languages

**Cons**:
- Schema changes needed for new languages
- Can lead to wide tables with many columns
- Less flexible for 10+ languages

**When to Use**: 2-5 languages, performance-critical reads

### Approach 2: Separate Translations Table

**Structure**: Foreign key to translations table

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  default_language VARCHAR(2)
);

CREATE TABLE course_translations (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  language VARCHAR(2),
  title VARCHAR(255),
  description TEXT,
  UNIQUE(course_id, language)
);
```

**Pros**:
- Highly scalable (unlimited languages)
- Clean separation of concerns
- Easy to add new languages (INSERT, not ALTER TABLE)
- Flexible schema

**Cons**:
- Requires JOIN on every query
- Slower reads
- More complex queries
- Harder to enforce data integrity

**When to Use**: 10+ languages, frequent language additions

### Approach 3: JSONB Column

**Structure**: Single JSONB column with all translations

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  title JSONB,  -- {"en": "Meditation", "es": "Meditación"}
  description JSONB
);
```

**Pros**:
- Very flexible
- No schema changes for new languages
- Can query with JSON operators

**Cons**:
- Complex queries (`title->>'es'`)
- Harder to index
- Type safety issues
- Not as performant as columns

**When to Use**: Rapid prototyping, frequently changing language requirements

### Comparison Table

| Feature | Column-Based | Separate Table | JSONB |
|---------|--------------|----------------|-------|
| Query Simplicity | ✅ Excellent | ⚠️ Complex (JOINs) | ⚠️ Complex (JSON ops) |
| Read Performance | ✅ Excellent | ⚠️ Good | ⚠️ Good |
| Scalability | ⚠️ 2-5 langs | ✅ Unlimited | ✅ Unlimited |
| Schema Flexibility | ❌ Rigid | ✅ Flexible | ✅ Very Flexible |
| Type Safety | ✅ Strong | ✅ Strong | ❌ Weak |
| Indexing | ✅ Easy | ✅ Easy | ⚠️ Complex |

## Implementation Deep Dive

### Database Migration

Our migration adds columns to existing tables:

```sql
ALTER TABLE courses
  ADD COLUMN title_es VARCHAR(255),
  ADD COLUMN description_es TEXT,
  ADD COLUMN learning_outcomes_es TEXT[];
```

**Why ALTER TABLE instead of CREATE TABLE?**
- We already have existing data
- Want to keep one row per course
- Backward compatible with existing queries

**NULL vs DEFAULT**:
```sql
ADD COLUMN title_es VARCHAR(255)  -- NULL allowed
ADD COLUMN title_es VARCHAR(255) DEFAULT ''  -- Empty string default
```

We chose NULL because:
- Distinguishes "not translated" from "translated to empty"
- Smaller storage (NULL takes less space)
- Easier fallback logic (`COALESCE(title_es, title)`)

### TypeScript Type Updates

```typescript
export interface Course {
  title: string;              // Required (English)
  titleEs?: string;           // Optional (Spanish)
  description: string;        // Required
  descriptionEs?: string;     // Optional
}
```

**Why Optional?**:
- Not all content will be translated immediately
- Gradual translation workflow
- Prevents TypeScript errors when Spanish missing

**Naming Convention**:
- Base field: camelCase (`longDescription`)
- Spanish field: camelCase + locale suffix (`longDescriptionEs`)
- Database: snake_case (`long_description_es`)

### Fallback Strategy

**Three-Level Fallback**:
1. Try Spanish field (`title_es`)
2. If NULL, empty, or undefined → use English (`title`)
3. English is always present (NOT NULL)

**In Code**:
```typescript
function getLocalizedField(entity, field, locale) {
  if (locale === 'en') return entity[field];

  const localizedValue = entity[field + 'Es'];
  return localizedValue || entity[field];  // Fallback
}
```

**In SQL**:
```sql
SELECT
  COALESCE(NULLIF(title_es, ''), title) AS title
FROM courses;
```

This says: "Use `title_es` if it's not NULL and not empty, otherwise use `title`"

## Using the I18n Content Helpers

### Basic Usage

```typescript
import { getCourseTitle } from '../../src/lib/i18nContent';

const course = {
  title: 'Meditation 101',
  titleEs: 'Meditación 101'
};

const titleEn = getCourseTitle(course, 'en');  // "Meditation 101"
const titleEs = getCourseTitle(course, 'es');  // "Meditación 101"
```

### In Astro Components

```astro
---
import { getLocalizedCourse } from '../lib/i18nContent';

const locale = Astro.locals.locale || 'en';
const course = await getCourseById(id);
const localizedCourse = getLocalizedCourse(course, locale);
---

<h1>{localizedCourse.title}</h1>
<p>{localizedCourse.description}</p>
```

### In API Endpoints

```typescript
export async function GET({ params, locals }) {
  const locale = locals.locale || 'en';
  const course = await getCourseById(params.id);

  return new Response(JSON.stringify({
    title: getCourseTitle(course, locale),
    description: getCourseDescription(course, locale)
  }));
}
```

### SQL Queries with Locale

```typescript
import { getSQLCoalesce } from '../lib/i18nContent';

const locale = 'es';
const query = `
  SELECT
    ${getSQLCoalesce('title', locale)},
    ${getSQLCoalesce('description', locale)}
  FROM courses
  WHERE id = $1
`;
// Generates:
// SELECT
//   COALESCE(NULLIF(title_es, ''), title) AS title,
//   COALESCE(NULLIF(description_es, ''), description) AS description
// FROM courses
// WHERE id = $1
```

## Best Practices

### 1. Always Provide English Content

English is the fallback language. Never allow NULL for English fields.

```sql
CREATE TABLE courses (
  title VARCHAR(255) NOT NULL,        -- English required
  title_es VARCHAR(255)               -- Spanish optional
);
```

### 2. Use Helper Functions

Don't access localized fields directly:

```typescript
// ❌ Bad
const title = locale === 'es' ? course.titleEs || course.title : course.title;

// ✅ Good
const title = getCourseTitle(course, locale);
```

### 3. Consistent Naming

Follow the pattern: `{fieldName}{LocaleSuffix}`

```typescript
// ✅ Consistent
titleEs, descriptionEs, longDescriptionEs

// ❌ Inconsistent
title_spanish, spanishDescription, es_long_description
```

### 4. Handle Arrays and Objects

For complex fields, use same type as English version:

```sql
learning_outcomes TEXT[]           -- English array
learning_outcomes_es TEXT[]        -- Spanish array (same type)

curriculum JSONB                   -- English JSON
curriculum_es JSONB                -- Spanish JSON (same type)
```

### 5. Database Comments

Document each Spanish column:

```sql
COMMENT ON COLUMN courses.title_es IS 'Spanish translation of course title';
```

## Common Pitfalls

### Pitfall 1: Forgetting to Update Both Versions

**Problem**: Update English, forget Spanish

```typescript
// ❌ Incomplete update
await pool.query(
  'UPDATE courses SET title = $1 WHERE id = $2',
  ['New Title', courseId]
);
// Spanish title now outdated!
```

**Solution**: Update both or mark Spanish as needing retranslation

```typescript
// ✅ Complete update
await pool.query(
  'UPDATE courses SET title = $1, title_es = NULL WHERE id = $2',
  ['New Title', courseId]
);
// Setting Spanish to NULL signals "needs translation"
```

### Pitfall 2: Inconsistent Fallback Logic

**Problem**: Different fallback logic in different places

```typescript
// ❌ Inconsistent
const title1 = course.titleEs ?? course.title;
const title2 = course.titleEs || course.title;
const title3 = course.titleEs ? course.titleEs : course.title;
```

**Solution**: Use centralized helper function

```typescript
// ✅ Consistent
const title = getCourseTitle(course, locale);
```

### Pitfall 3: Not Handling Empty Strings

**Problem**: Empty string is truthy but useless

```typescript
// ❌ Bug: empty Spanish title shows as ""
const title = course.titleEs || course.title;
// If titleEs = '', this returns ''
```

**Solution**: Check for empty strings

```typescript
// ✅ Correct
const title = (course.titleEs && course.titleEs.trim()) || course.title;
// Or use getLocalizedField() which handles this
```

### Pitfall 4: SQL Injection with Dynamic Columns

**Problem**: Building SQL with user input

```typescript
// ❌ SQL Injection risk
const column = `title_${userLocale}`;
const query = `SELECT ${column} FROM courses`;  // DANGEROUS!
```

**Solution**: Whitelist locales

```typescript
// ✅ Safe
const allowedLocales = ['en', 'es'];
if (!allowedLocales.includes(userLocale)) {
  userLocale = 'en';
}
const column = getSQLColumn('title', userLocale);
```

## Performance Considerations

### Index Strategy

**Do**: Index frequently queried Spanish columns

```sql
CREATE INDEX idx_courses_title_es ON courses(title_es);
```

**Don't**: Index all Spanish columns blindly

Indexes have overhead. Only index columns used in:
- WHERE clauses
- ORDER BY clauses
- JOIN conditions

### Query Optimization

**Use COALESCE in Database**:
```sql
-- ✅ Fast: computed in database
SELECT COALESCE(NULLIF(title_es, ''), title) AS title
FROM courses;
```

**Don't fetch both then choose in app**:
```sql
-- ❌ Slow: fetches both, chooses in app
SELECT title, title_es FROM courses;
-- Then in JavaScript: const title = titleEs || title;
```

### Caching Strategy

Cache localized content separately:

```typescript
// Cache key includes locale
const cacheKey = `course:${courseId}:${locale}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Fetch and cache
const course = await getCourse(courseId, locale);
await redis.setex(cacheKey, 3600, JSON.stringify(course));
```

## Future Expansion

### Adding a Third Language (French)

**Step 1**: Add columns

```sql
ALTER TABLE courses
  ADD COLUMN title_fr VARCHAR(255),
  ADD COLUMN description_fr TEXT;
```

**Step 2**: Update types

```typescript
export interface Course {
  // ... existing ...
  titleFr?: string;
  descriptionFr?: string;
}
```

**Step 3**: Update helpers (automatic!)

The `getLocalizedField()` function already handles this pattern:
```typescript
getLocalizedField(course, 'title', 'fr');  // Works immediately!
```

### Migrating to Separate Table (If Needed)

If you ever need to support 10+ languages:

**Migration Strategy**:
1. Create `course_translations` table
2. Migrate existing data:
   ```sql
   INSERT INTO course_translations (course_id, language, title, description)
   SELECT id, 'en', title, description FROM courses
   UNION ALL
   SELECT id, 'es', title_es, description_es FROM courses WHERE title_es IS NOT NULL;
   ```
3. Update application code
4. Drop old columns (after testing)

## Practical Examples

### Example 1: Course Detail Page

```astro
---
import { getLocalizedCourse } from '../lib/i18nContent';

const locale = Astro.locals.locale || 'en';
const course = await getCourseById(Astro.params.id);
const localizedCourse = getLocalizedCourse(course, locale);
---

<article>
  <h1>{localizedCourse.title}</h1>
  <p class="description">{localizedCourse.description}</p>

  {localizedCourse.longDescription && (
    <div class="long-description">
      {localizedCourse.longDescription}
    </div>
  )}

  {localizedCourse.learningOutcomes.length > 0 && (
    <section>
      <h2>{t.courses.learningOutcomes}</h2>
      <ul>
        {localizedCourse.learningOutcomes.map(outcome => (
          <li>{outcome}</li>
        ))}
      </ul>
    </section>
  )}
</article>
```

### Example 2: Admin Translation Interface

```astro
---
const course = await getCourseById(id);
---

<form method="POST" action="/api/admin/courses/translate">
  <input type="hidden" name="courseId" value={course.id} />

  <div class="translation-editor">
    <div class="column">
      <h3>English (Original)</h3>
      <input type="text" value={course.title} disabled />
      <textarea disabled>{course.description}</textarea>
    </div>

    <div class="column">
      <h3>Spanish (Translation)</h3>
      <input
        type="text"
        name="titleEs"
        value={course.titleEs || ''}
        placeholder="Translate title..."
      />
      <textarea
        name="descriptionEs"
        placeholder="Translate description..."
      >{course.descriptionEs || ''}</textarea>
    </div>
  </div>

  <button type="submit">Save Translations</button>
</form>
```

### Example 3: API with Locale Parameter

```typescript
// GET /api/courses/:id?locale=es
export async function GET({ params, url }) {
  const courseId = params.id;
  const locale = url.searchParams.get('locale') || 'en';

  const course = await pool.query(`
    SELECT
      id,
      slug,
      price,
      ${getSQLCoalesce('title', locale)},
      ${getSQLCoalesce('description', locale)},
      ${getSQLCoalesce('long_description', locale, 'longDescription')}
    FROM courses
    WHERE id = $1 AND is_published = true
  `, [courseId]);

  if (course.rows.length === 0) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }

  return new Response(JSON.stringify({
    success: true,
    data: course.rows[0]
  }));
}
```

## Conclusion

Multilingual database design is a critical decision that affects:
- Query performance
- Development complexity
- Scalability
- User experience

For the Spirituality Platform:
- **Column-based approach** is optimal for 2 languages (English/Spanish)
- **Simple queries** with COALESCE for automatic fallback
- **Type-safe helpers** for consistent access
- **Easy expansion** to additional languages if needed

The pattern established in T167 provides a solid foundation for T168-T170 (implementing actual translations) and future multilingual features.

## Next Steps

1. ✅ T167 Complete: Schema and types ready
2. ⏭️ T168: Implement content translation for courses
3. ⏭️ T169: Implement content translation for events
4. ⏭️ T170: Implement content translation for products
5. ⏭️ Build admin translation interface
6. ⏭️ Implement translation workflow (flag content needing translation)
