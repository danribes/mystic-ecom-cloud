# T170: Content Translation for Products - Learning Guide

## What Was Implemented

T170 implements locale-aware content retrieval for digital products, allowing product titles and descriptions to be displayed in the user's preferred language (English or Spanish).

## Key Concepts

### 1. Locale-Aware Data Retrieval
Column-based approach where Spanish columns (`*_es`) exist alongside English ones. Database queries use CASE/COALESCE for automatic fallback.

### 2. SQL COALESCE with Embedded Locale
```sql
COALESCE(NULLIF(
  CASE
    WHEN '${locale}' = 'es' THEN p.title_es
    ELSE NULL
  END,
  ''
), p.title) as title
```
**Why embed locale?** Avoids parameter index issues (same approach as T169).

### 3. Product-Specific Fields
Digital products include:
- `productType` - Type of product (ebook, audio, video, etc.)
- `fileUrl` - Download link
- `fileSizeMb` - File size (optional)
- `downloadLimit` - Maximum downloads allowed
- `previewUrl` - Preview file (optional)

## Core Functions

### getLocalizedProductById(id, locale)
```typescript
const product = await getLocalizedProductById('uuid-here', 'es');
// Returns product with Spanish content
```

### getLocalizedProductBySlug(slug, locale)
```typescript
const product = await getLocalizedProductBySlug('meditation-guide', 'en');
// Returns product by URL slug with English content
```

### getLocalizedProducts(filters)
```typescript
const result = await getLocalizedProducts({
  locale: 'es',
  productType: 'ebook',
  maxPrice: 50,
  search: 'meditación',
  limit: 12,
  offset: 0
});
// Returns: {items: Product[], total: number, hasMore: boolean}
```

## Database Schema (Migration 006)

Added base English column:
- `long_description` - Detailed product description

Spanish versions (`*_es`) already existed from T167.

## Usage in Astro Pages (When Created)

```astro
---
import { getLocalizedProductBySlug } from '@/lib/productsI18n';

const locale = Astro.locals.locale || 'en';
const { id } = Astro.params;
const product = await getLocalizedProductBySlug(id, locale);
---

<h1>{product.title}</h1>
<p>{product.description}</p>
<p>File size: {product.fileSizeMb} MB</p>
<a href={product.fileUrl}>Download</a>
```

## Comparison with T168 (Courses) and T169 (Events)

**Simpler than T168 (Courses)**:
- No arrays (learning outcomes, prerequisites)
- No nested structures (curriculum)

**Simpler than T169 (Events)**:
- No venue fields to translate
- No date/location filtering

**Product-Specific Features**:
- Product type filtering
- File metadata (size, URL, preview)
- Download tracking and limits

## Performance Considerations

- Single database query (no JOINs for translations)
- COALESCE computed in database
- Locale embedded in SQL (not as parameter)
- Efficient for product catalog browsing

## Testing Approach

Test each function with:
- English locale
- Spanish locale
- Fallback behavior (Spanish missing)
- Product type filtering
- Optional field handling (file size, preview)
- Data integrity across locales

## Pattern Summary

T170 follows the established pattern from T168/T169:
1. Add missing base English columns
2. Create `*I18n.ts` file with locale-aware functions
3. Use SQL CASE/COALESCE with embedded locale
4. Test thoroughly with both locales
5. Document in log files

## Next Steps

- Create product pages when needed
- Apply this pattern to any new content types
- Consider adding product category translations
- Integrate with e-commerce flow when built
