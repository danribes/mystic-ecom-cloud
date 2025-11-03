/**
 * Filter State Management - Usage Examples
 * 
 * This file demonstrates how to refactor existing catalog pages
 * (products, courses, events) to use the FilterStateManager library.
 * 
 * Benefits of using FilterStateManager:
 * - Eliminates code duplication across catalog pages
 * - Type-safe parameter handling
 * - Consistent URL building patterns
 * - Built-in validation
 * - Easier to maintain and test
 */

// ============================================================================
// EXAMPLE 1: Products Page Refactor (Before and After)
// ============================================================================

/**
 * BEFORE: Manual URL parameter management (from src/pages/products/index.astro)
 */
/*
---
import { getProducts } from '@/lib/products';

// Manual extraction - repeated code
const url = new URL(Astro.request.url);
const searchParams = url.searchParams;
const type = searchParams.get('type') || 'all';
const search = searchParams.get('search') || '';
const minPrice = searchParams.get('minPrice') || '';
const maxPrice = searchParams.get('maxPrice') || '';
const minSize = searchParams.get('minSize') || '';
const maxSize = searchParams.get('maxSize') || '';
const sortBy = searchParams.get('sort') || 'newest';
const page = parseInt(searchParams.get('page') || '1');

// Manual filter construction
const filters: any = {
  type: type !== 'all' ? (type as 'pdf' | 'audio' | 'video' | 'ebook') : undefined,
  search: search || undefined,
  minPrice: minPrice ? parseFloat(minPrice) : undefined,
  maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
  minSize: minSize ? parseFloat(minSize) : undefined,
  maxSize: maxSize ? parseFloat(maxSize) : undefined,
  sortBy: sortBy as any,
  limit: 12 + 1,
  offset: (page - 1) * 12,
};

// Manual URL building - lots of repetitive code
function buildPageUrl(pageNum: number): string {
  const params = new URLSearchParams();
  params.set('page', pageNum.toString());
  if (type !== 'all') params.set('type', type);
  if (search) params.set('search', search);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (minSize) params.set('minSize', minSize);
  if (maxSize) params.set('maxSize', maxSize);
  if (sortBy !== 'newest') params.set('sort', sortBy);
  return `/products?${params.toString()}`;
}

function buildClearFilterUrl(filterName: string): string {
  const params = new URLSearchParams();
  params.set('page', '1');
  if (filterName !== 'type' && type !== 'all') params.set('type', type);
  if (filterName !== 'search' && search) params.set('search', search);
  if (filterName !== 'minPrice' && minPrice) params.set('minPrice', minPrice);
  if (filterName !== 'maxPrice' && maxPrice) params.set('maxPrice', maxPrice);
  if (filterName !== 'minSize' && minSize) params.set('minSize', minSize);
  if (filterName !== 'maxSize' && maxSize) params.set('maxSize', maxSize);
  if (sortBy !== 'newest') params.set('sort', sortBy);
  return `/products?${params.toString()}`;
}

const activeFilterCount = [
  type !== 'all',
  search !== '',
  minPrice !== '',
  maxPrice !== '',
  minSize !== '',
  maxSize !== '',
].filter(Boolean).length;
---
*/

/**
 * AFTER: Using FilterStateManager (clean and maintainable)
 */
/*
---
import { createFilterManager, PRODUCT_FILTERS } from '@/lib/filterState';
import { getProducts } from '@/lib/products';

// Create filter manager instance
const filterManager = createFilterManager(Astro.url, '/products');

// Extract all filters with validation
const filterConfigs = Object.values(PRODUCT_FILTERS);
const uiFilters = filterManager.getFilters(filterConfigs);

// Build service filters (properly typed and validated)
const serviceFilters = filterManager.buildServiceFilters(filterConfigs);

// Pagination
const page = filterManager.getIntParam('page', 1);
const limit = 12;

// Fetch products
const products = await getProducts({
  ...serviceFilters,
  limit: limit + 1,
  offset: (page - 1) * limit,
});

// Check pagination
const hasMore = products.length > limit;
const displayProducts = hasMore ? products.slice(0, limit) : products;

// URL building helpers (one-liners!)
const buildPageUrl = (p: number) => filterManager.buildPageUrl(p, uiFilters);
const buildClearFilterUrl = (name: string) => filterManager.buildClearFilterUrl(name, uiFilters);
const buildClearAllUrl = () => filterManager.buildClearAllFiltersUrl(['sort']);

// Active filter count
const activeFilterCount = filterManager.countActiveFilters(
  ['type', 'search', 'minPrice', 'maxPrice', 'minSize', 'maxSize'],
  { type: 'all' }
);
---
*/

// ============================================================================
// EXAMPLE 2: Courses Page Refactor
// ============================================================================

/**
 * AFTER: Courses page using FilterStateManager
 */
/*
---
import { createFilterManager, COURSE_FILTERS } from '@/lib/filterState';
import { getCourses } from '@/lib/courses';

// Create manager
const filterManager = createFilterManager(Astro.url, '/courses');

// Extract filters
const filterConfigs = Object.values(COURSE_FILTERS);
const uiFilters = filterManager.getFilters(filterConfigs);
const serviceFilters = filterManager.buildServiceFilters(filterConfigs);

// Pagination
const page = filterManager.getIntParam('page', 1);
const limit = 12;

// Fetch courses
const courses = await getCourses({
  ...serviceFilters,
  limit,
  offset: (page - 1) * limit,
});

// Helpers
const buildPageUrl = (p: number) => filterManager.buildPageUrl(p, uiFilters);
const buildClearFilterUrl = (name: string) => filterManager.buildClearFilterUrl(name, uiFilters);

// Active filters
const activeFilters = filterManager.getActiveFilters(
  ['category', 'level', 'minPrice', 'maxPrice', 'minRating', 'search'],
  { category: 'all', level: 'all' }
);
---

<!-- Template usage -->
{activeFilters.map(filter => (
  <span class="filter-pill">
    {filter.name}: {filter.value}
    <a href={buildClearFilterUrl(filter.name)}>×</a>
  </span>
))}
*/

// ============================================================================
// EXAMPLE 3: Events Page Refactor
// ============================================================================

/**
 * AFTER: Events page using FilterStateManager
 */
/*
---
import { createFilterManager, EVENT_FILTERS } from '@/lib/filterState';
import { getEvents } from '@/lib/events';

// Create manager
const filterManager = createFilterManager(Astro.url, '/events');

// Extract filters
const filterConfigs = Object.values(EVENT_FILTERS);
const uiFilters = filterManager.getFilters(filterConfigs);
const serviceFilters = filterManager.buildServiceFilters(filterConfigs);

// Pagination
const page = filterManager.getIntParam('page', 1);
const limit = 12;

// Fetch events
const events = await getEvents({
  ...serviceFilters,
  limit: limit + 1,
  offset: (page - 1) * limit,
});

// Helpers
const buildPageUrl = (p: number) => filterManager.buildPageUrl(p, uiFilters);
const buildClearFilterUrl = (name: string) => filterManager.buildClearFilterUrl(name, uiFilters);

// Hidden inputs for search form
const hiddenInputs = filterManager.getHiddenInputs(
  ['country', 'city', 'timeFrame', 'fromDate', 'toDate', 'availability', 'minPrice', 'maxPrice'],
  ['search'] // Exclude search since it's in visible input
);
---

<!-- Search form with preserved filters -->
<form action="/events" method="GET">
  {hiddenInputs.map(input => (
    <input type="hidden" name={input.name} value={input.value} />
  ))}
  <input type="text" name="search" value={uiFilters.search || ''} />
  <button type="submit">Search</button>
</form>
*/

// ============================================================================
// EXAMPLE 4: Custom Filter Scenarios
// ============================================================================

/**
 * Scenario: Adding a new filter to an existing page
 */
/*
---
import { createFilterManager, PRODUCT_FILTERS } from '@/lib/filterState';

// Extend PRODUCT_FILTERS with custom filter
const customFilters = {
  ...PRODUCT_FILTERS,
  featured: {
    name: 'featured',
    type: 'boolean' as const,
    defaultValue: 'false',
  },
};

const filterManager = createFilterManager(Astro.url, '/products');
const filterConfigs = Object.values(customFilters);

// Everything else works the same!
const uiFilters = filterManager.getFilters(filterConfigs);
const serviceFilters = filterManager.buildServiceFilters(filterConfigs);
---
*/

/**
 * Scenario: Conditional filter display based on another filter
 */
/*
---
const filterManager = createFilterManager(Astro.url, '/products');
const type = filterManager.getParam('type', 'all');

// Only show size filters for digital products
const showSizeFilters = type !== 'all' && type !== 'physical';
---

{showSizeFilters && (
  <div class="size-filters">
    <!-- Size filter inputs -->
  </div>
)}
*/

/**
 * Scenario: Building URLs with filter updates
 */
/*
---
const filterManager = createFilterManager(Astro.url, '/courses');
const currentFilters = filterManager.getFilters(Object.values(COURSE_FILTERS));

// User clicks "Show Beginner Courses" button
const beginnerUrl = filterManager.buildUrlWithUpdates(
  { level: 'beginner' },
  currentFilters
); // Resets to page 1

// User changes sort without losing filters
const sortByPriceUrl = filterManager.buildUrlWithUpdates(
  { sort: 'price-asc' },
  currentFilters,
  { resetPage: false } // Keep current page
);
---
*/

// ============================================================================
// EXAMPLE 5: Testing Filter Logic
// ============================================================================

/**
 * Easy unit testing with FilterStateManager
 */
/*
import { describe, test, expect } from 'vitest';
import { createFilterManager, PRODUCT_FILTERS } from '@/lib/filterState';

describe('Product Filters', () => {
  test('should extract type filter correctly', () => {
    const url = new URL('http://localhost/products?type=pdf');
    const manager = createFilterManager(url, '/products');
    
    expect(manager.getParam('type')).toBe('pdf');
  });

  test('should build service filters with proper types', () => {
    const url = new URL('http://localhost/products?minPrice=10.5&type=audio');
    const manager = createFilterManager(url, '/products');
    
    const filters = manager.buildServiceFilters(Object.values(PRODUCT_FILTERS));
    
    expect(filters.minPrice).toBe(10.5); // Number, not string
    expect(filters.type).toBe('audio');
  });

  test('should count active filters correctly', () => {
    const url = new URL('http://localhost/products?type=pdf&minPrice=10&sort=newest');
    const manager = createFilterManager(url, '/products');
    
    const count = manager.countActiveFilters(
      ['type', 'minPrice', 'sort'],
      { type: 'all', sort: 'newest' }
    );
    
    expect(count).toBe(2); // type and minPrice (sort is default)
  });
});
*/

// ============================================================================
// EXAMPLE 6: Migration Strategy
// ============================================================================

/**
 * Step-by-step migration from old code to FilterStateManager
 * 
 * 1. Install the library (already done - src/lib/filterState.ts)
 * 
 * 2. Update one page at a time (start with products page)
 * 
 * 3. Replace manual URL extraction:
 *    OLD: const type = searchParams.get('type') || 'all';
 *    NEW: const filterManager = createFilterManager(Astro.url, '/products');
 *         const type = filterManager.getParam('type', 'all');
 * 
 * 4. Replace manual filter construction:
 *    OLD: const filters = { type: type !== 'all' ? type : undefined, ... };
 *    NEW: const serviceFilters = filterManager.buildServiceFilters(Object.values(PRODUCT_FILTERS));
 * 
 * 5. Replace URL building functions:
 *    OLD: function buildPageUrl(pageNum: number): string { ... 20 lines ... }
 *    NEW: const buildPageUrl = (p: number) => filterManager.buildPageUrl(p, uiFilters);
 * 
 * 6. Replace active filter counting:
 *    OLD: const activeFilterCount = [type !== 'all', search !== '', ...].filter(Boolean).length;
 *    NEW: const activeFilterCount = filterManager.countActiveFilters(['type', 'search', ...], { type: 'all' });
 * 
 * 7. Test thoroughly
 * 
 * 8. Repeat for other catalog pages (courses, events)
 * 
 * 9. Remove old helper functions
 * 
 * Benefits achieved:
 * - ~100 lines of code removed per page
 * - Type safety improved
 * - Consistent behavior across pages
 * - Easier to add new filters
 * - Better testability
 */

// ============================================================================
// EXAMPLE 7: Advanced Patterns
// ============================================================================

/**
 * Pattern: Pre-fill filters from user preferences
 */
/*
---
import { createFilterManager, PRODUCT_FILTERS } from '@/lib/filterState';

const filterManager = createFilterManager(Astro.url, '/products');

// Get user's preferred filters from database or session
const userPreferences = await getUserPreferences(Astro.locals.user?.id);

// Current filters take precedence over preferences
const currentFilters = filterManager.getFilters(Object.values(PRODUCT_FILTERS));

// Merge preferences with current filters
const effectiveFilters = {
  ...userPreferences,
  ...currentFilters,
};

// Use effectiveFilters for service call
const products = await getProducts(filterManager.buildServiceFilters([...]));
---
*/

/**
 * Pattern: Filter presets (quick filters)
 */
/*
---
const filterManager = createFilterManager(Astro.url, '/products');
const currentFilters = filterManager.getFilters(Object.values(PRODUCT_FILTERS));

// Define preset filter combinations
const presets = {
  'free-ebooks': { type: 'ebook', maxPrice: '0' },
  'video-courses': { type: 'video', minSize: '100' },
  'quick-reads': { type: 'pdf', maxSize: '5' },
};

// Build URLs for preset buttons
const presetUrls = Object.entries(presets).map(([name, filters]) => ({
  name,
  url: filterManager.buildUrlWithUpdates(filters, currentFilters),
}));
---

<!-- Preset buttons -->
{presetUrls.map(preset => (
  <a href={preset.url} class="preset-button">
    {preset.name.replace('-', ' ')}
  </a>
))}
*/

/**
 * Pattern: Shareable filter URLs
 */
/*
---
const filterManager = createFilterManager(Astro.url, '/courses');
const currentFilters = filterManager.getFilters(Object.values(COURSE_FILTERS));

// Generate shareable URL with current filters
const shareUrl = `${Astro.site}${filterManager.buildPageUrl(1, currentFilters)}`;

// Copy to clipboard button
---
<button 
  onclick={`navigator.clipboard.writeText('${shareUrl}')`}
  class="share-button"
>
  📋 Share These Filters
</button>
*/

export {};
