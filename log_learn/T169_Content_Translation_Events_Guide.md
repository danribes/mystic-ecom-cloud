# T169: Content Translation for Events - Learning Guide

## What Was Implemented

T169 implements locale-aware content retrieval for events, allowing event information including venue details to be displayed in the user's preferred language (English or Spanish).

## Key Concepts

### 1. Locale-Aware Data Retrieval
Column-based approach where Spanish columns (`*_es`) exist alongside English ones. Database queries use CASE/COALESCE for automatic fallback.

### 2. SQL COALESCE with Embedded Locale
```sql
COALESCE(NULLIF(
  CASE
    WHEN '${locale}' = 'es' THEN e.title_es
    ELSE NULL
  END,
  ''
), e.title) as title
```
**Why embed locale?** Avoids parameter index confusion when building dynamic WHERE clauses.

### 3. Venue Localization
Events include venue names and addresses that can be translated:
- `venue_name` / `venue_name_es`
- `venue_address` / `venue_address_es`

## Core Functions

### getLocalizedEventById(id, locale)
```typescript
const event = await getLocalizedEventById('uuid-here', 'es');
// Returns event with Spanish content including venue details
```

### getLocalizedEventBySlug(slug, locale)
```typescript
const event = await getLocalizedEventBySlug('mindfulness-retreat', 'en');
// Returns event by URL slug with English content
```

### getLocalizedEvents(filters)
```typescript
const result = await getLocalizedEvents({
  locale: 'es',
  city: 'Barcelona',
  startDate: new Date('2025-06-01'),
  minPrice: 0,
  maxPrice: 200,
  limit: 12,
  offset: 0
});
// Returns: {items: Event[], total: number, hasMore: boolean}
```

## Database Schema (Migration 005)

Added base English column:
- `long_description` - Detailed event description

Spanish versions (`*_es`) already existed from T167.

## Usage in Astro Pages

```astro
---
import { getLocalizedEventBySlug } from '@/lib/eventsI18n';

const locale = Astro.locals.locale || 'en';
const { id } = Astro.params;
const event = await getLocalizedEventBySlug(id, locale);
---

<h1>{event.title}</h1>
<p>{event.description}</p>
<address>{event.venueName}, {event.venueAddress}</address>
```

## Pattern for T170 (Products)

Follow the same pattern:
1. Create `productsI18n.ts`
2. Add any missing base English columns
3. Use SQL CASE/COALESCE with embedded locale
4. Update pages to use localized functions
5. Test with both locales

## Differences from T168 (Courses)

1. **Simpler Data**: Events don't have arrays (learning outcomes, prerequisites) or nested structures (curriculum)
2. **Venue Fields**: Events have location-specific translations (venue name, address)
3. **Date Filtering**: Events support date range filtering for upcoming events

## Performance Considerations

- Single database query (no JOINs for translations)
- COALESCE computed in database
- Locale embedded in SQL (not as parameter)
- Efficient for read-heavy event listings

## Lessons Learned

1. **Template Literals**: Embedding `'${locale}'` in SQL works well for dynamic queries
2. **Simpler Than T168**: No array/JSONB handling needed
3. **Venue Localization**: Important for international events

## Next Steps

- T170: Products translation (similar to events - simple structure)
- Consider caching popular event queries
- Add timezone handling for event dates
