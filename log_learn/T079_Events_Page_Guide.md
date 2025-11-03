# T079: Events Catalog Page - Learning Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Astro Page Architecture](#astro-page-architecture)
3. [URL-Based State Management](#url-based-state-management)
4. [Filter Implementation Patterns](#filter-implementation-patterns)
5. [Pagination Strategies](#pagination-strategies)
6. [Component Design for Reusability](#component-design-for-reusability)
7. [SEO Optimization for Catalog Pages](#seo-optimization-for-catalog-pages)
8. [Testing Catalog Logic](#testing-catalog-logic)
9. [Accessibility Best Practices](#accessibility-best-practices)
10. [Real-World Usage](#real-world-usage)

---

## Introduction

This guide teaches you how to build production-ready catalog pages with filtering and pagination in Astro. We'll explore the patterns and techniques used in the events catalog implementation, with practical examples you can apply to any list-based page (products, courses, articles, etc.).

**What You'll Learn:**
- Managing filter state with URL query parameters
- Implementing pagination without additional database queries
- Building reusable card components
- Testing catalog logic effectively
- Optimizing for SEO and accessibility

---

## Astro Page Architecture

### The Page Component Pattern

Astro pages have two sections: **frontmatter** (TypeScript/JavaScript) for server-side logic and **template** (JSX-like) for rendering.

```astro
---
// FRONTMATTER: Server-side logic (runs once per request)
import BaseLayout from '@/layouts/BaseLayout.astro';
import { getData } from '@/lib/service';

const url = new URL(Astro.request.url);
const data = await getData(filters);
---

<!-- TEMPLATE: HTML rendering -->
<BaseLayout>
  <div>
    {data.map(item => <ItemCard item={item} />)}
  </div>
</BaseLayout>
```

**Key Concepts:**
1. **Frontmatter runs server-side**: Perfect for data fetching and business logic
2. **Template is static**: Generated once and sent to the client
3. **No client-side JavaScript by default**: Pages are fast and SEO-friendly
4. **Access to Node.js APIs**: Can use any Node library in frontmatter

### Events Page Structure

```astro
---
// 1. Imports
import BaseLayout from '@/layouts/BaseLayout.astro';
import EventCard from '@/components/EventCard.astro';
import { getEvents } from '@/lib/events';

// 2. Parse URL parameters
const url = new URL(Astro.request.url);
const params = url.searchParams;

// 3. Build filters
const filters = { 
  city: params.get('city') || undefined,
  // ... more filters
};

// 4. Fetch data
const allEvents = await getEvents(filters);

// 5. Calculate pagination
const page = parseInt(params.get('page') || '1', 10);
const events = allEvents.slice(startIndex, endIndex);
---

<!-- 6. Render UI -->
<BaseLayout>
  <FilterForm />
  <EventGrid events={events} />
  <Pagination />
</BaseLayout>
```

---

## URL-Based State Management

### Why URL Query Parameters?

**Benefits:**
1. **SEO-Friendly**: Each filter combination has a unique URL
2. **Bookmarkable**: Users can save and share filtered views
3. **Browser Navigation**: Back/forward buttons work naturally
4. **Stateless**: No session storage or complex state management
5. **Analytics-Friendly**: Easy to track popular filters

### Parsing URL Parameters

```typescript
// Basic parsing
const url = new URL(Astro.request.url);
const params = url.searchParams;

const city = params.get('city') || undefined;
const page = parseInt(params.get('page') || '1', 10);
```

**Pattern: Parse with Defaults**
```typescript
const parseIntWithDefault = (value: string | null, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const page = parseIntWithDefault(params.get('page'), 1);
const pageSize = parseIntWithDefault(params.get('pageSize'), 12);
```

### Building Filter Objects

```typescript
interface EventFilters {
  city?: string;
  country?: string;
  startDate?: Date;
  endDate?: Date;
  isPublished?: boolean;
}

const filters: EventFilters = {
  isPublished: true, // Always filter to published
  city: params.get('city') || undefined,
  country: params.get('country') || undefined,
  startDate: params.get('startDate') ? new Date(params.get('startDate')!) : undefined,
  endDate: params.get('endDate') ? new Date(params.get('endDate')!) : undefined,
};
```

**Pro Tip:** Use `undefined` instead of `null` or empty strings for optional filters. This makes conditional logic cleaner:

```typescript
// Clean conditional
if (filters.city) {
  queryText += ` AND city = $${paramIndex++}`;
}

// vs. having to check for null AND empty string
if (filters.city && filters.city !== '') { ... }
```

### Constructing URLs with Filters

```typescript
const buildPageUrl = (pageNum: number, filters: FilterObject): string => {
  const searchParams = new URLSearchParams();
  
  // Add filters if present
  if (filters.city) searchParams.set('city', filters.city);
  if (filters.country) searchParams.set('country', filters.country);
  if (filters.startDate) searchParams.set('startDate', filters.startDate);
  
  // Add page if not first page
  if (pageNum > 1) searchParams.set('page', pageNum.toString());
  
  // Build final URL
  const queryString = searchParams.toString();
  return queryString ? `/events?${queryString}` : '/events';
};
```

**Usage Example:**
```astro
<a href={buildPageUrl(2, { city: 'London' })}>
  Next Page
</a>
<!-- Result: /events?city=London&page=2 -->
```

---

## Filter Implementation Patterns

### Dynamic Filter Dropdowns

**Problem:** How to populate filter dropdowns with only valid options?

**Solution:** Query data to extract unique values.

```typescript
// Fetch all data for dropdown population
const allEvents = await getEvents({ isPublished: true });

// Extract unique values
const uniqueCities = [...new Set(allEvents.map(e => e.venue_city))].sort();
const uniqueCountries = [...new Set(allEvents.map(e => e.venue_country))].sort();
```

**Rendering:**
```astro
<select name="city">
  <option value="">All Cities</option>
  {uniqueCities.map(city => (
    <option value={city} selected={currentCity === city}>
      {city}
    </option>
  ))}
</select>
```

### Date Range Filters

```astro
<input 
  type="date" 
  name="startDate" 
  value={params.get('startDate') || ''}
  min={new Date().toISOString().split('T')[0]}
/>
```

**Pro Tip:** Set `min` attribute to prevent selecting past dates.

### Active Filter Display

Show users which filters are currently applied:

```astro
{(city || country || startDate) && (
  <div class="active-filters">
    <span>Active Filters:</span>
    {city && (
      <span class="filter-tag">
        City: {city}
        <a href={buildUrlWithoutParam('city')}>×</a>
      </span>
    )}
    {country && (
      <span class="filter-tag">
        Country: {country}
        <a href={buildUrlWithoutParam('country')}>×</a>
      </span>
    )}
  </div>
)}
```

**Helper Function:**
```typescript
const buildUrlWithoutParam = (paramToRemove: string): string => {
  const newParams = new URLSearchParams(url.searchParams);
  newParams.delete(paramToRemove);
  const queryString = newParams.toString();
  return queryString ? `/events?${queryString}` : '/events';
};
```

### Filter Form Pattern

```astro
<form method="GET" action="/events">
  <!-- Filters preserved in inputs -->
  <input type="text" name="search" value={params.get('search') || ''} />
  <select name="city">
    <option value="">All Cities</option>
    {cities.map(city => (
      <option value={city} selected={params.get('city') === city}>
        {city}
      </option>
    ))}
  </select>
  
  <button type="submit">Apply Filters</button>
  <a href="/events">Clear Filters</a>
</form>
```

**Why GET method?**
- Creates bookmarkable URLs
- Browser back button works correctly
- No CSRF concerns (safe operation)
- SEO-friendly

---

## Pagination Strategies

### In-Memory Pagination (Current Approach)

**When to Use:**
- Dataset is reasonably small (< 10,000 items)
- Filtering is complex and varies
- Fast response time is priority
- Database queries are simple

**Implementation:**
```typescript
// 1. Fetch all filtered data
const allEvents = await getEvents(filters);

// 2. Calculate pagination
const page = parseInt(params.get('page') || '1', 10);
const pageSize = 12;
const totalPages = Math.ceil(allEvents.length / pageSize);

// 3. Slice for current page
const startIndex = (page - 1) * pageSize;
const endIndex = startIndex + pageSize;
const events = allEvents.slice(startIndex, endIndex);
```

**Pros:**
- Simple logic
- No complex SQL
- Works with any filter combination
- Fast for small/medium datasets

**Cons:**
- Fetches all data even if only viewing page 1
- Memory usage grows with dataset size
- Not suitable for very large datasets

### Database-Level Pagination (Future Enhancement)

**When to Use:**
- Dataset is large (> 10,000 items)
- Users mostly view early pages
- Memory is constrained
- Database supports efficient LIMIT/OFFSET

**Implementation:**
```typescript
// Add to getEvents() service
export async function getEvents(
  filters?: EventFilters,
  pagination?: { limit: number; offset: number }
): Promise<Event[]> {
  let queryText = `SELECT * FROM events WHERE 1=1`;
  
  // ... apply filters ...
  
  // Add pagination
  if (pagination) {
    queryText += ` LIMIT ${pagination.limit} OFFSET ${pagination.offset}`;
  }
  
  const result = await query<Event>(queryText, params);
  return result.rows;
}
```

**Usage:**
```typescript
const page = parseInt(params.get('page') || '1', 10);
const pageSize = 12;

const events = await getEvents(filters, {
  limit: pageSize,
  offset: (page - 1) * pageSize
});

// Need separate query for total count
const totalEvents = await getEventCount(filters);
const totalPages = Math.ceil(totalEvents / pageSize);
```

**Pros:**
- Efficient for large datasets
- Lower memory usage
- Scalable

**Cons:**
- Requires additional query for total count
- More complex service layer
- OFFSET performance degrades for high page numbers

### Pagination Controls

```astro
<nav aria-label="Pagination">
  <!-- Previous Button -->
  {page > 1 ? (
    <a href={buildPageUrl(page - 1)} aria-label="Previous page">←</a>
  ) : (
    <span aria-disabled="true">←</span>
  )}
  
  <!-- Page Numbers -->
  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
    // Show first, last, current, and adjacent pages
    const shouldShow = 
      pageNum === 1 ||
      pageNum === totalPages ||
      Math.abs(pageNum - page) <= 1;
    
    if (!shouldShow) return null;
    
    if (pageNum === page) {
      return <span aria-current="page">{pageNum}</span>;
    }
    
    return <a href={buildPageUrl(pageNum)}>{pageNum}</a>;
  })}
  
  <!-- Next Button -->
  {page < totalPages ? (
    <a href={buildPageUrl(page + 1)} aria-label="Next page">→</a>
  ) : (
    <span aria-disabled="true">→</span>
  )}
</nav>
```

### Pagination with Ellipsis

For many pages, show ellipsis to avoid cluttering:

```astro
{Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
  const showPage = 
    pageNum === 1 ||
    pageNum === totalPages ||
    (pageNum >= page - 1 && pageNum <= page + 1);
  
  const showEllipsis = 
    (pageNum === 2 && page > 3) ||
    (pageNum === totalPages - 1 && page < totalPages - 2);
  
  if (!showPage && !showEllipsis) return null;
  
  if (showEllipsis) {
    return <span>...</span>;
  }
  
  // ... render page number
})}
```

**Result:** `1 ... 5 6 [7] 8 9 ... 20`

---

## Component Design for Reusability

### EventCard Component

**Design Principles:**
1. **Single Responsibility**: Display one event
2. **Configurable**: Support different variants
3. **Self-Contained**: All logic and styles in one file
4. **Type-Safe**: Accept strongly-typed props

```astro
---
import type { Event } from '@/lib/events';

interface Props {
  event: Event;
  variant?: 'default' | 'compact';
  showDescription?: boolean;
}

const { event, variant = 'default', showDescription = false } = Astro.props;

// Helper functions
const formatPrice = (price: number | string): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return num === 0 ? 'Free' : `$${num.toFixed(2)}`;
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
---

<article class:list={[
  'event-card',
  variant === 'compact' ? 'event-card--compact' : ''
]}>
  <!-- Card content -->
</article>
```

### Variant Pattern

Support different display modes:

```typescript
// Usage
<EventCard event={event} variant="default" />
<EventCard event={event} variant="compact" />
```

```astro
<article class:list={[
  'base-class',
  variant === 'compact' ? 'flex-row' : 'flex-col'
]}>
```

### Helper Functions in Components

Keep formatting logic close to usage:

```typescript
// Date formatting
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Price formatting
const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice === 0 ? 'Free' : `$${numPrice.toFixed(2)}`;
};

// Status calculation
const getSpotsStatus = (available: number, capacity: number) => {
  const percentage = (available / capacity) * 100;
  if (available === 0) return { text: 'Sold Out', color: 'error' };
  if (percentage <= 20) return { text: `Only ${available} left!`, color: 'warning' };
  return { text: `${available} available`, color: 'success' };
};
```

---

## SEO Optimization for Catalog Pages

### Meta Tags

```astro
---
const title = 'Upcoming Events';
const description = 'Discover transformative spiritual events...';
const keywords = 'spiritual events, meditation workshops, ...';
---

<BaseLayout 
  title={title}
  description={description}
  keywords={keywords}
>
```

### Canonical URLs

Prevent duplicate content issues:

```astro
<link rel="canonical" href={canonicalURL} />
```

**For Filtered Pages:**
```typescript
// Option 1: Use filtered URL as canonical (if filters add value)
const canonicalURL = `/events?city=${city}&country=${country}`;

// Option 2: Use base URL as canonical (if filters are just views)
const canonicalURL = '/events';
```

### Semantic HTML

```astro
<main>
  <header>
    <h1>Upcoming Events</h1>
  </header>
  
  <section aria-label="Filters">
    <form>...</form>
  </section>
  
  <section aria-label="Events">
    <article>
      <h2>Event Title</h2>
      <!-- Event content -->
    </article>
  </section>
  
  <nav aria-label="Pagination">
    <!-- Pagination controls -->
  </nav>
</main>
```

### Schema Markup (Future Enhancement)

```astro
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "Event",
      "name": "Meditation Workshop",
      "startDate": "2024-06-15",
      "location": {
        "@type": "Place",
        "name": "Zen Center",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "London",
          "addressCountry": "UK"
        }
      }
    }
  ]
}
</script>
```

---

## Testing Catalog Logic

### Test Structure

Separate testable logic from rendering:

```typescript
// Helper functions (testable)
function parseFilters(params: URLSearchParams) { ... }
function calculatePagination(total: number, page: number, size: number) { ... }
function buildPageUrl(page: number, filters: FilterObject) { ... }

// Tests
describe('Filter Parsing', () => {
  it('should parse city from URL', () => {
    const params = new URLSearchParams('city=London');
    const filters = parseFilters(params);
    expect(filters.city).toBe('London');
  });
});
```

### Test Categories

1. **Filter Parsing**
   ```typescript
   it('should handle multiple filters', () => {
     const params = new URLSearchParams('city=Paris&country=France');
     const filters = parseFilters(params);
     expect(filters).toEqual({
       city: 'Paris',
       country: 'France',
       isPublished: true
     });
   });
   ```

2. **Pagination Math**
   ```typescript
   it('should calculate correct page indices', () => {
     const { startIndex, endIndex } = calculatePagination(50, 2, 12);
     expect(startIndex).toBe(12); // Page 2 starts at index 12
     expect(endIndex).toBe(24);   // Page 2 ends at index 24
   });
   ```

3. **URL Construction**
   ```typescript
   it('should build URL with filters', () => {
     const url = buildPageUrl(2, { city: 'Tokyo' });
     expect(url).toBe('/events?city=Tokyo&page=2');
   });
   ```

4. **Edge Cases**
   ```typescript
   it('should handle empty results', () => {
     const pagination = calculatePagination(0, 1, 12);
     expect(pagination.totalPages).toBe(0);
   });

   it('should handle invalid page numbers', () => {
     const page = parseInt('abc', 10) || 1;
     expect(page).toBe(1);
   });
   ```

---

## Accessibility Best Practices

### Keyboard Navigation

All interactive elements must be keyboard-accessible:

```astro
<!-- Links are naturally keyboard-accessible -->
<a href="/events?page=2">Next</a>

<!-- Buttons need proper type -->
<button type="submit">Apply Filters</button>

<!-- Disabled states should be spans, not buttons -->
{page === 1 ? (
  <span aria-disabled="true">Previous</span>
) : (
  <a href={buildPageUrl(page - 1)}>Previous</a>
)}
```

### ARIA Labels

```astro
<!-- Navigation landmark -->
<nav aria-label="Event pagination">
  <a href="..." aria-label="Previous page">←</a>
  <span aria-current="page">2</span>
  <a href="..." aria-label="Next page">→</a>
</nav>

<!-- Section labels -->
<section aria-label="Filter events">
  <form>...</form>
</section>

<!-- Disabled state -->
<span aria-disabled="true">Previous</span>
```

### Form Labels

```astro
<label for="city">City</label>
<select id="city" name="city">
  <option>...</option>
</select>
```

### Focus Management

```css
/* Visible focus indicators */
a:focus, button:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Focus within for container focus */
.filter-form:focus-within {
  border-color: var(--color-primary);
}
```

---

## Real-World Usage

### Common Patterns

#### 1. Product Catalog
```typescript
const filters: ProductFilters = {
  category: params.get('category'),
  minPrice: parseFloat(params.get('minPrice') || '0'),
  maxPrice: parseFloat(params.get('maxPrice') || '1000'),
  inStock: params.get('inStock') === 'true',
};

const products = await getProducts(filters);
```

#### 2. Blog Posts
```typescript
const filters: PostFilters = {
  tag: params.get('tag'),
  author: params.get('author'),
  dateFrom: params.get('from') ? new Date(params.get('from')!) : undefined,
};

const posts = await getPosts(filters);
```

#### 3. Course Listings
```typescript
const filters: CourseFilters = {
  level: params.get('level'), // beginner, intermediate, advanced
  duration: parseInt(params.get('duration') || '0'),
  price: params.get('price'), // free, paid
};

const courses = await getCourses(filters);
```

### Performance Tips

1. **Cache Filter Dropdowns**
   ```typescript
   // Cache for 5 minutes
   const getCachedCities = async () => {
     const cached = cache.get('cities');
     if (cached) return cached;
     
     const cities = await fetchUniqueCities();
     cache.set('cities', cities, 300);
     return cities;
   };
   ```

2. **Debounce Search Input** (requires client-side JS)
   ```typescript
   let searchTimeout: NodeJS.Timeout;
   const handleSearch = (value: string) => {
     clearTimeout(searchTimeout);
     searchTimeout = setTimeout(() => {
       window.location.href = `/events?search=${value}`;
     }, 500);
   };
   ```

3. **Lazy Load Images**
   ```astro
   <img 
     src={imageUrl} 
     loading="lazy"
     decoding="async"
   />
   ```

### Common Pitfalls

1. **Not Preserving Filters in Pagination**
   ```typescript
   // ❌ Wrong: Loses filters
   <a href="/events?page=2">Next</a>
   
   // ✅ Correct: Preserves filters
   <a href={buildPageUrl(page + 1)}>Next</a>
   ```

2. **Using POST for Filters**
   ```astro
   <!-- ❌ Wrong: Not bookmarkable, bad for SEO -->
   <form method="POST">
   
   <!-- ✅ Correct: Creates shareable URLs -->
   <form method="GET">
   ```

3. **Not Handling Empty States**
   ```astro
   <!-- Always show message when no results -->
   {events.length === 0 && (
     <div class="empty-state">
       <p>No events found. Try adjusting your filters.</p>
     </div>
   )}
   ```

---

## Conclusion

This guide covered the essential patterns for building catalog pages:

✅ **URL-based state** for SEO and UX  
✅ **Filter implementation** with dynamic dropdowns  
✅ **Pagination strategies** for different scales  
✅ **Reusable components** for maintainability  
✅ **SEO optimization** for discoverability  
✅ **Testing approaches** for reliability  
✅ **Accessibility** for all users  

These patterns are applicable to any list-based page in your application. Use them as a foundation and adapt to your specific needs.

**Next Steps:**
- Apply these patterns to other catalog pages (courses, products, etc.)
- Implement advanced filters (price ranges, multi-select)
- Add sort options (date, popularity, price)
- Optimize with database-level pagination for large datasets
