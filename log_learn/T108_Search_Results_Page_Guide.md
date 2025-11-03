# T108: Search Results Page - Learning Guide

**Target Audience**: Developers learning Astro, search UIs, and filter/pagination patterns  
**Prerequisites**: Basic HTML, CSS, JavaScript, and Astro knowledge  
**Estimated Time**: 30-45 minutes

---

## Table of Contents

1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Building the Search Page](#building-the-search-page)
4. [Implementing Filters](#implementing-filters)
5. [Creating Result Cards](#creating-result-cards)
6. [Pagination Patterns](#pagination-patterns)
7. [Testing Strategy](#testing-strategy)
8. [Common Patterns](#common-patterns)
9. [Exercises](#exercises)

---

## Introduction

This guide teaches you how to build a production-ready search results page with filtering, pagination, and type-specific result displays. You'll learn:

- Server-side rendering for search pages
- URL-based state management
- Dynamic filtering with conditional rendering
- Smart pagination strategies
- Responsive search UI design
- Comprehensive testing approaches

**What We're Building**:
A search results page (`/search`) that displays courses, products, and events with:
- Multiple filter types (type, price, level, product type, city)
- Pagination (mobile + desktop variants)
- Type-specific result cards
- Empty states and error handling
- Full accessibility support

---

## Core Concepts

### 1. Server-Side Rendering (SSR) for Search

**Why SSR for Search?**

Search pages benefit immensely from SSR:

```astro
---
// This runs on the server ONLY
const url = new URL(Astro.request.url);
const query = url.searchParams.get('q') || '';

// Fetch results server-side
const response = await fetch('/api/search?q=' + query);
const results = await response.json();
---

<!-- HTML is rendered with data -->
<h1>Search Results for "{query}"</h1>
<p>{results.total} results found</p>
```

**Benefits**:
- SEO-friendly (crawlers see content)
- Fast initial load (no client-side fetch delay)
- Works without JavaScript
- No loading spinners needed

### 2. URL-Based State Management

**The Pattern**:

Instead of storing filter state in component memory, use URL parameters:

```typescript
// ❌ BAD: Component state (not shareable, not bookmarkable)
const [filters, setFilters] = useState({ type: 'course', level: 'beginner' });

// ✅ GOOD: URL parameters (shareable, bookmarkable)
const url = new URL(Astro.request.url);
const type = url.searchParams.get('type') || 'all';
const level = url.searchParams.get('level') || 'all';
```

**Benefits**:
- Shareable links: `/search?q=python&type=course&level=beginner`
- Browser back/forward works naturally
- Bookmarkable searches
- Deep linking support
- No state synchronization bugs

### 3. Conditional Rendering

Different item types need different filters:

```astro
<!-- Always show type filter -->
<div class="mb-4">
  <h3>Type</h3>
  <input type="radio" name="type" value="all" checked={currentType === 'all'}>
  <input type="radio" name="type" value="course" checked={currentType === 'course'}>
  <input type="radio" name="type" value="product" checked={currentType === 'product'}>
</div>

<!-- Only show level filter for courses -->
{(currentType === 'all' || currentType === 'course') && (
  <div class="mb-4">
    <h3>Course Level</h3>
    <input type="radio" name="level" value="beginner">
    <input type="radio" name="level" value="intermediate">
  </div>
)}

<!-- Only show product type filter for products -->
{(currentType === 'all' || currentType === 'product') && (
  <div class="mb-4">
    <h3>Product Type</h3>
    <input type="radio" name="productType" value="pdf">
    <input type="radio" name="productType" value="video">
  </div>
)}
```

---

## Building the Search Page

### Step 1: Extract URL Parameters

```astro
---
// src/pages/search.astro
const url = new URL(Astro.request.url);

// Search query
const query = url.searchParams.get('q') || '';

// Filters
const type = url.searchParams.get('type') || 'all';
const minPrice = url.searchParams.get('minPrice') || '';
const maxPrice = url.searchParams.get('maxPrice') || '';
const level = url.searchParams.get('level') || 'all';
const productType = url.searchParams.get('productType') || 'all';
const city = url.searchParams.get('city') || '';

// Pagination
const limit = parseInt(url.searchParams.get('limit') || '12');
const offset = parseInt(url.searchParams.get('offset') || '0');
---
```

### Step 2: Fetch Search Results

```astro
---
// Build API URL with all parameters
const apiUrl = new URL('/api/search', Astro.url.origin);
apiUrl.searchParams.set('q', query);
if (type !== 'all') apiUrl.searchParams.set('type', type);
if (minPrice) apiUrl.searchParams.set('minPrice', minPrice);
if (maxPrice) apiUrl.searchParams.set('maxPrice', maxPrice);
// ... add other params

// Fetch from API
const response = await fetch(apiUrl.toString());
const data = await response.json();

const results = data.success ? data.data : { items: [], total: 0 };
---
```

### Step 3: Calculate Pagination

```astro
---
const currentPage = Math.floor(offset / limit) + 1;
const totalPages = Math.ceil(results.total / limit);
const hasNextPage = results.hasMore ?? (offset + limit < results.total);
const hasPrevPage = offset > 0;

// Helper to build URLs preserving filters
function buildPageUrl(page: number): string {
  const pageOffset = (page - 1) * limit;
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('limit', limit.toString());
  params.set('offset', pageOffset.toString());
  if (type !== 'all') params.set('type', type);
  if (minPrice) params.set('minPrice', minPrice);
  // ... add all filters
  return `/search?${params.toString()}`;
}
---
```

### Step 4: Render Layout

```astro
<BaseLayout title={`Search Results: ${query}`}>
  <div class="container mx-auto px-4 py-8">
    {!query ? (
      <div class="text-center">
        <p>Enter a search query to begin</p>
      </div>
    ) : (
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar -->
        <aside class="lg:w-64">
          <FilterSidebar
            currentQuery={query}
            currentType={type}
            currentMinPrice={minPrice}
            {/* ... pass all filters */}
          />
        </aside>

        <!-- Main Content -->
        <main class="flex-1">
          <h1>{query}</h1>
          <p>{results.total} results</p>
          
          {results.items.length === 0 ? (
            <p>No results found</p>
          ) : (
            <div class="grid gap-4">
              {results.items.map(item => (
                <SearchResult result={item} />
              ))}
            </div>
          )}

          {/* Pagination */}
        </main>
      </div>
    )}
  </div>
</BaseLayout>
```

---

## Implementing Filters

### Filter Component Structure

```astro
---
// src/components/FilterSidebar.astro
interface Props {
  currentQuery: string;
  currentType: string;
  currentMinPrice: string;
  currentMaxPrice: string;
  currentLevel: string;
  currentProductType: string;
  currentCity: string;
}

const {
  currentQuery,
  currentType,
  // ... destructure all props
} = Astro.props;

// Check if any filters are active
const hasActiveFilters =
  currentType !== 'all' ||
  currentMinPrice ||
  currentMaxPrice ||
  currentLevel !== 'all' ||
  currentProductType !== 'all' ||
  currentCity;
---
```

### Instant vs. Manual Filtering

**Two strategies**:

1. **Instant Filtering** (for radio buttons):

```html
<script>
  // Submit form automatically when radio changes
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('search-filters').submit();
    });
  });
</script>
```

2. **Manual Filtering** (for text/number inputs):

```html
<form id="search-filters" action="/search" method="GET">
  <input type="text" name="city" value={currentCity}>
  <input type="number" name="minPrice" value={currentMinPrice}>
  <button type="submit">Apply Filters</button>
</form>
```

**Why the difference?**
- Radio buttons: Single choice, clear intent → instant feedback
- Text/numbers: Gradual typing → manual submit avoids repeated requests

### Clear Filters Implementation

```astro
{hasActiveFilters && (
  <a
    href={`/search?q=${currentQuery}`}
    class="text-blue-600 hover:underline text-sm"
  >
    Clear all filters
  </a>
)}
```

---

## Creating Result Cards

### Type-Specific Interface

```typescript
interface SearchResultItem {
  // Common to all types
  id: number;
  type: 'course' | 'product' | 'event';
  title: string;
  description: string;
  price: number;
  slug: string;

  // Course-specific (optional)
  level?: 'beginner' | 'intermediate' | 'advanced';
  duration_hours?: number;

  // Product-specific (optional)
  productType?: 'pdf' | 'audio' | 'video' | 'ebook';

  // Event-specific (optional)
  event_date?: string;
  venue_name?: string;
  venue_city?: string;
  venue_country?: string;
  available_spots?: number;
}
```

### Helper Functions

```typescript
// Format currency
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

// Format dates
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Color-coded type badges
function getTypeBadgeClass(type: string): string {
  const classes = {
    course: 'bg-blue-100 text-blue-800',
    product: 'bg-green-100 text-green-800',
    event: 'bg-purple-100 text-purple-800',
  };
  return classes[type] || 'bg-gray-100 text-gray-800';
}

// Truncate long text
function truncateDescription(text: string, maxLength = 200): string {
  return text.length > maxLength
    ? text.slice(0, maxLength) + '...'
    : text;
}
```

### Conditional Content Rendering

```astro
<article class="border rounded-lg p-4 hover:shadow-md transition-shadow">
  <!-- Type badge (always shown) -->
  <span class={`px-2 py-1 rounded-full text-xs ${getTypeBadgeClass(result.type)}`}>
    {result.type}
  </span>

  <!-- Title and description -->
  <h3>{result.title}</h3>
  <p>{truncateDescription(result.description)}</p>

  <!-- Course-specific -->
  {result.type === 'course' && result.level && (
    <span class="text-sm">{result.level}</span>
  )}
  {result.type === 'course' && result.duration_hours && (
    <span class="text-sm">
      <ClockIcon /> {result.duration_hours} hours
    </span>
  )}

  <!-- Product-specific -->
  {result.type === 'product' && result.productType && (
    <span class="text-sm uppercase">{result.productType}</span>
  )}

  <!-- Event-specific -->
  {result.type === 'event' && result.event_date && (
    <span class="text-sm">
      <CalendarIcon /> {formatDate(result.event_date)}
    </span>
  )}
  {result.type === 'event' && result.venue_name && (
    <span class="text-sm">
      <MapPinIcon /> {result.venue_name}, {result.venue_city}
    </span>
  )}

  <!-- Price and CTA -->
  <div class="mt-4 flex justify-between items-center">
    <span class="text-lg font-bold">{formatPrice(result.price)}</span>
    <a href={`/${result.type}s/${result.slug}`} class="btn">
      View {result.type}
    </a>
  </div>
</article>
```

---

## Pagination Patterns

### Strategy: Mobile vs. Desktop

**Mobile**: Simple Previous/Next buttons (less screen space)
**Desktop**: Full page numbers with smart truncation

```astro
<!-- Mobile Pagination -->
<nav class="flex justify-between lg:hidden">
  {hasPrevPage ? (
    <a href={buildPageUrl(currentPage - 1)} class="btn">
      ← Previous
    </a>
  ) : (
    <span class="btn-disabled">← Previous</span>
  )}

  <span class="text-sm">Page {currentPage} of {totalPages}</span>

  {hasNextPage ? (
    <a href={buildPageUrl(currentPage + 1)} class="btn">
      Next →
    </a>
  ) : (
    <span class="btn-disabled">Next →</span>
  )}
</nav>

<!-- Desktop Pagination -->
<nav class="hidden lg:flex justify-center gap-2" aria-label="Pagination">
  {Array.from({ length: totalPages }, (_, i) => {
    const pageNum = i + 1;
    // Show first page, last page, current page, and 2 pages on each side
    const showPage =
      pageNum === 1 ||
      pageNum === totalPages ||
      Math.abs(pageNum - currentPage) <= 2;

    if (!showPage) {
      // Show ellipsis only once
      if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
        return <span key={pageNum}>...</span>;
      }
      return null;
    }

    return (
      <a
        key={pageNum}
        href={buildPageUrl(pageNum)}
        class={pageNum === currentPage ? 'btn-active' : 'btn'}
        aria-current={pageNum === currentPage ? 'page' : undefined}
      >
        {pageNum}
      </a>
    );
  })}
</nav>
```

**Result**: Mobile gets `← Previous | Page 3 of 10 | Next →`, Desktop gets `1 2 ... 8 [9] 10 11 ... 20`

---

## Testing Strategy

### Source-Based Testing

**Why?**
- SSR components render on the server
- No DOM to test client-side
- Testing source code validates logic directly

**How?**

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Search Page', () => {
  const searchPagePath = join(process.cwd(), 'src/pages/search.astro');
  const searchPageSource = readFileSync(searchPagePath, 'utf-8');

  it('should extract query parameter', () => {
    expect(searchPageSource).toContain("url.searchParams.get('q')");
  });

  it('should calculate pagination', () => {
    expect(searchPageSource).toContain('currentPage');
    expect(searchPageSource).toContain('totalPages');
  });

  it('should handle empty states', () => {
    expect(searchPageSource).toContain('!query');
    expect(searchPageSource).toContain('results.items.length === 0');
  });
});
```

### What to Test

1. **Structure**: Imports, exports, component structure
2. **Logic**: URL parsing, calculations, conditionals
3. **HTML**: Semantic elements, classes, attributes
4. **Accessibility**: ARIA labels, semantic HTML, screen reader support
5. **Responsive**: Tailwind breakpoint classes (lg:, sm:)

---

## Common Patterns

### Pattern 1: Preserving Filters in URLs

```typescript
function buildUrl(params: Record<string, string>): string {
  const url = new URLSearchParams();
  
  // Always preserve search query
  url.set('q', query);
  
  // Add filters if not default values
  if (params.type && params.type !== 'all') {
    url.set('type', params.type);
  }
  if (params.minPrice) {
    url.set('minPrice', params.minPrice);
  }
  
  return `/search?${url.toString()}`;
}
```

### Pattern 2: Active Filter Detection

```typescript
const hasActiveFilters =
  type !== 'all' ||
  minPrice !== '' ||
  maxPrice !== '' ||
  level !== 'all' ||
  productType !== 'all' ||
  city !== '';

{hasActiveFilters && (
  <button onClick={clearFilters}>Clear All</button>
)}
```

### Pattern 3: Type-Safe Result Display

```typescript
type ResultType = 'course' | 'product' | 'event';

function getResultUrl(type: ResultType, slug: string): string {
  // Pluralize: course → courses, event → events
  return `/${type}s/${slug}`;
}

function getCTAText(type: ResultType): string {
  return `View ${type.charAt(0).toUpperCase() + type.slice(1)}`;
}
```

### Pattern 4: Responsive Layouts

```astro
<!-- Stack on mobile, side-by-side on desktop -->
<div class="flex flex-col lg:flex-row gap-8">
  <aside class="lg:w-64">Sidebar</aside>
  <main class="flex-1">Content</main>
</div>

<!-- Hide on mobile, show on desktop -->
<nav class="hidden lg:flex">Desktop pagination</nav>

<!-- Show on mobile, hide on desktop -->
<nav class="flex lg:hidden">Mobile pagination</nav>
```

---

## Exercises

### Exercise 1: Add Sort Options

Add a sort dropdown to the filter sidebar:

```astro
<select name="sort">
  <option value="relevance">Most Relevant</option>
  <option value="price-asc">Price: Low to High</option>
  <option value="price-desc">Price: High to Low</option>
  <option value="date-desc">Newest First</option>
</select>
```

**Tasks**:
1. Extract `sort` from URL parameters
2. Pass `sort` to API endpoint
3. Update `buildPageUrl` to preserve sort
4. Add instant filtering for sort dropdown

### Exercise 2: Add Load More

Replace pagination with a "Load More" button:

```astro
<button onclick="loadMore()">Load More Results</button>

<script>
  async function loadMore() {
    const currentOffset = {/* current offset */};
    const response = await fetch(`/api/search?offset=${currentOffset + 12}`);
    const data = await response.json();
    // Append results to current list
  }
</script>
```

**Tasks**:
1. Change from page-based to offset-based loading
2. Keep track of current offset in component
3. Append new results to existing ones
4. Hide button when no more results

### Exercise 3: Add Faceted Search

Show result counts next to each filter option:

```astro
<input type="radio" name="type" value="course">
Courses <span class="text-gray-500">({coursesCount})</span>
```

**Tasks**:
1. Fetch facet counts from API (`/api/search/facets`)
2. Display counts next to each filter option
3. Update counts when other filters change
4. Disable filters with 0 results

### Exercise 4: Add Search Suggestions

Show "Did you mean?" suggestions for typos:

```astro
{data.suggestion && (
  <p class="mb-4">
    Did you mean: <a href={`/search?q=${data.suggestion}`}>{data.suggestion}</a>
  </p>
)}
```

**Tasks**:
1. Modify API to return suggestions
2. Display suggestion above results
3. Style suggestion prominently
4. Track click-through rate on suggestions

---

## Key Takeaways

1. **SSR for Search**: Pre-render results on the server for SEO and performance
2. **URL State**: Use URL parameters for shareable, bookmarkable searches
3. **Conditional Rendering**: Show relevant filters based on selected type
4. **Smart Pagination**: Different UI for mobile vs. desktop
5. **Type Safety**: Use TypeScript interfaces for result items
6. **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
7. **Testing**: Source-based testing validates SSR components effectively

---

## Further Reading

- [Astro Server-Side Rendering](https://docs.astro.build/en/guides/server-side-rendering/)
- [URLSearchParams API](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- [Responsive Design Best Practices](https://web.dev/responsive-web-design-basics/)
- [ARIA Labels for Pagination](https://www.w3.org/WAI/ARIA/apg/patterns/pagination/)
- [Search UX Patterns](https://www.nngroup.com/articles/search-visible-and-simple/)

---

## Next Steps

After mastering search results pages, explore:

1. **Advanced Filtering**: Range sliders, multi-select, date pickers
2. **Search Analytics**: Track popular searches, no-result queries
3. **Personalization**: Show recently viewed items, recommendations
4. **Performance**: Implement caching, lazy loading, virtual scrolling
5. **Internationalization**: Multi-language search, currency conversion

**Status**: ✅ You're now ready to build production-ready search experiences!
