# T111: Product Format & Price Filters - Learning Guide

**Comprehensive Tutorial on Product Filtering, File Size Management, and Multi-Dimensional Sorting**

**Date:** November 2, 2025  
**Difficulty:** Intermediate  
**Prerequisites:** Astro basics, TypeScript, SQL, Tailwind CSS  
**Completion Time:** 45-60 minutes  
**Related Tasks:** T109 (Course Filters), T110 (Event Filters)

---

## Table of Contents

1. [Learning Objectives](#learning-objectives)
2. [File Size Filtering Pattern](#file-size-filtering-pattern)
3. [Multi-Format Product Filtering](#multi-format-product-filtering)
4. [Seven-Dimension Sorting System](#seven-dimension-sorting-system)
5. [URL State Management for Complex Filters](#url-state-management-for-complex-filters)
6. [Active Filter Pills Pattern](#active-filter-pills-pattern)
7. [Pagination with Filter Preservation](#pagination-with-filter-preservation)
8. [Reusable Filter Components](#reusable-filter-components)
9. [Client-Side Validation Patterns](#client-side-validation-patterns)
10. [Testing Complex Filters](#testing-complex-filters)
11. [Common Pitfalls & Solutions](#common-pitfalls-solutions)
12. [Performance Optimization](#performance-optimization)

---

## Learning Objectives

By the end of this guide, you will understand:

✅ **File Size Filtering**: How to implement min/max file size filters for digital products  
✅ **Multi-Format Systems**: Managing multiple product formats (PDF, Audio, Video, E-Book)  
✅ **Seven-Dimension Sorting**: Implementing comprehensive sort options including file size  
✅ **Complex URL State**: Managing 7+ URL parameters with proper preservation  
✅ **Filter Pills UI**: Building removable filter pills with individual clear actions  
✅ **Instant Filtering**: Auto-submit patterns for immediate feedback  
✅ **Validation**: Client-side range validation for logical filter combinations  
✅ **Source-Based Testing**: Testing strategies for complex filtering systems

---

## 1. File Size Filtering Pattern

### Why File Size Matters

Digital products vary dramatically in size:
- **PDF eBook**: 1-10 MB
- **Audio Course**: 50-200 MB
- **Video Course**: 500-2000 MB

Users on limited bandwidth, mobile connections, or with storage constraints benefit from size-aware filtering.

### Database Schema

```sql
-- digital_products table
CREATE TABLE digital_products (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  product_type VARCHAR(20) CHECK (product_type IN ('pdf', 'audio', 'video', 'ebook')),
  file_size_mb DECIMAL(10,2), -- Megabytes with 2 decimal precision
  price DECIMAL(10,2),
  -- ... other fields
);

-- Index for performance
CREATE INDEX idx_products_size ON digital_products(file_size_mb) WHERE is_published = true;
```

**Why DECIMAL(10,2)?**
- Supports up to 99,999.99 MB (97 GB)
- 2 decimal places for precision (e.g., 1.25 MB)
- Exact arithmetic (no floating-point errors)

### Service Layer Implementation

```typescript
// src/lib/products.ts
export async function getProducts(options: {
  type?: 'pdf' | 'audio' | 'video' | 'ebook';
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;      // NEW: Minimum file size in MB
  maxSize?: number;      // NEW: Maximum file size in MB
  sortBy?: 'size-asc' | 'size-desc' | ...;
  limit?: number;
  offset?: number;
} = {}): Promise<DigitalProduct[]> {
  
  let query = `
    SELECT * FROM digital_products
    WHERE is_published = true
  `;
  
  const params: any[] = [];
  let paramIndex = 1;
  
  // CRITICAL: Use !== undefined, not truthy check
  // This allows 0 as a valid filter value
  if (options.minSize !== undefined) {
    query += ` AND file_size_mb >= $${paramIndex}`;
    params.push(options.minSize);
    paramIndex++;
  }
  
  if (options.maxSize !== undefined) {
    query += ` AND file_size_mb <= $${paramIndex}`;
    params.push(options.maxSize);
    paramIndex++;
  }
  
  // ... other filters and sorting
  
  const result = await db.query(query, params);
  return result.rows as DigitalProduct[];
}
```

### Key Pattern: `!== undefined` Check

**Why This Matters:**

```typescript
// ❌ WRONG: Truthy check fails for 0
if (options.minSize) {
  // 0 is falsy, so this won't execute for minSize=0
  query += ` AND file_size_mb >= $${paramIndex}`;
}

// ✅ CORRECT: Explicit undefined check
if (options.minSize !== undefined) {
  // This executes for 0, allowing "files 0 MB and larger"
  query += ` AND file_size_mb >= $${paramIndex}`;
}
```

**Real-World Impact:**
A user searching for "products between 0 and 10 MB" wouldn't work with the wrong check. Products with unknown file size (null) would incorrectly appear.

### Component UI Implementation

```astro
---
// src/components/ProductFilters.astro
interface Props {
  currentMinSize?: string;
  currentMaxSize?: string;
}

const { currentMinSize = '', currentMaxSize = '' } = Astro.props;
---

<div class="border-t border-gray-200 pt-6">
  <h3 class="text-sm font-medium text-gray-900 mb-3">
    File Size
  </h3>
  
  <div class="space-y-3">
    <!-- Min Size Input -->
    <div>
      <label for="minSize" class="block text-xs text-gray-600 mb-1">
        Min Size
      </label>
      <div class="relative">
        <input
          type="number"
          id="minSize"
          name="minSize"
          value={currentMinSize}
          min="0"
          step="1"
          placeholder="0"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm 
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
          MB
        </span>
      </div>
    </div>
    
    <!-- Max Size Input -->
    <div>
      <label for="maxSize" class="block text-xs text-gray-600 mb-1">
        Max Size
      </label>
      <div class="relative">
        <input
          type="number"
          id="maxSize"
          name="maxSize"
          value={currentMaxSize}
          min="0"
          step="1"
          placeholder="Any"
          class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm 
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
          MB
        </span>
      </div>
    </div>
  </div>
</div>

<script>
  const form = document.getElementById('product-filters') as HTMLFormElement;
  const minSizeInput = form?.querySelector('#minSize') as HTMLInputElement;
  const maxSizeInput = form?.querySelector('#maxSize') as HTMLInputElement;
  
  // Prevent negative values
  const sizeInputs = [minSizeInput, maxSizeInput];
  sizeInputs.forEach((input) => {
    input?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (parseFloat(target.value) < 0) {
        target.value = '0';
      }
    });
  });
  
  // Validate range on submit
  const validateSizeRange = (): boolean => {
    const minSize = parseFloat(minSizeInput?.value || '0');
    const maxSize = parseFloat(maxSizeInput?.value || '0');
    
    if (maxSizeInput && minSizeInput && maxSize > 0 && maxSize < minSize) {
      maxSizeInput.setCustomValidity(
        'Max size must be greater than or equal to min size'
      );
      return false;
    } else {
      maxSizeInput?.setCustomValidity('');
      return true;
    }
  };
  
  form?.addEventListener('submit', (e) => {
    if (!validateSizeRange()) {
      e.preventDefault();
      maxSizeInput?.reportValidity();
      return false;
    }
  });
</script>
```

### Page Integration

```astro
---
// src/pages/products/index.astro
const searchParams = Astro.url.searchParams;

// Extract size parameters from URL
const minSize = searchParams.get('minSize') || '';
const maxSize = searchParams.get('maxSize') || '';

// Build filters object with type conversion
const filters = {
  minSize: minSize ? parseFloat(minSize) : undefined,
  maxSize: maxSize ? parseFloat(maxSize) : undefined,
  // ... other filters
};

// Fetch products with size filters
const products = await getProducts(filters);
---

<ProductFilters 
  currentMinSize={minSize}
  currentMaxSize={maxSize}
  {/* ... other props */}
/>
```

### Real-World Examples

**Use Case 1: Mobile User with Limited Data**
```
URL: /products?minSize=0&maxSize=50
```
- Only show products under 50 MB
- Prevents unexpected large downloads
- Improves mobile user experience

**Use Case 2: Finding Comprehensive Video Courses**
```
URL: /products?type=video&minSize=500&sort=size-desc
```
- Only video products
- At least 500 MB (indicates substantial content)
- Sorted by size (largest first)

**Use Case 3: Quick Reference PDFs**
```
URL: /products?type=pdf&maxSize=5&sort=price-asc
```
- Only PDF products
- Under 5 MB (quick downloads)
- Sorted by price (budget-friendly first)

---

## 2. Multi-Format Product Filtering

### Product Format Types

Digital spiritual growth products come in four main formats:

| Format | Icon | Typical Size | Use Case |
|--------|------|--------------|----------|
| **PDF** | 📄 | 1-10 MB | Books, guides, worksheets |
| **Audio** | 🎵 | 50-200 MB | Meditations, lectures, courses |
| **Video** | 🎥 | 500-2000 MB | Video courses, workshops |
| **E-Book** | 📚 | 1-5 MB | EPUB/MOBI formats for e-readers |

### Data Model

```typescript
// src/types/product.ts
export type ProductType = 'pdf' | 'audio' | 'video' | 'ebook';

export interface DigitalProduct {
  id: string;
  title: string;
  description: string;
  product_type: ProductType;
  file_size_mb: number;
  price: number;
  // ... other fields
}
```

### Radio Button Pattern for Single Selection

**Why Radio Buttons?**
- Users typically want one format at a time
- Clear visual indication of current selection
- Standard UI pattern for mutually exclusive options

```astro
---
// Product type configuration
const productTypes = [
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'audio', label: 'Audio', icon: '🎵' },
  { value: 'video', label: 'Video', icon: '🎥' },
  { value: 'ebook', label: 'E-Book', icon: '📚' },
];

interface Props {
  currentType?: string;
}

const { currentType = 'all' } = Astro.props;
---

<div>
  <h3 class="text-sm font-medium text-gray-900 mb-3">
    Product Type
  </h3>
  
  <div class="space-y-2">
    <!-- "All Products" Option -->
    <label class="flex items-center cursor-pointer group">
      <input
        type="radio"
        name="type"
        value="all"
        checked={currentType === 'all'}
        class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
      />
      <span class="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
        All Products
      </span>
    </label>
    
    <!-- Dynamic Product Types -->
    {productTypes.map(({ value, label, icon }) => (
      <label class="flex items-center cursor-pointer group">
        <input
          type="radio"
          name="type"
          value={value}
          checked={currentType === value}
          class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <span class="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
          {icon} {label}
        </span>
      </label>
    ))}
  </div>
</div>

<script>
  // Auto-submit on type change for instant filtering
  const form = document.getElementById('product-filters') as HTMLFormElement;
  const typeRadios = form?.querySelectorAll('input[name="type"]');
  
  typeRadios?.forEach((radio) => {
    radio.addEventListener('change', () => {
      form?.submit();
    });
  });
</script>
```

### Service Layer Type Filtering

```typescript
// src/lib/products.ts
export async function getProducts(options: {
  type?: 'pdf' | 'audio' | 'video' | 'ebook';
  // ... other options
}) {
  let query = `SELECT * FROM digital_products WHERE is_published = true`;
  const params: any[] = [];
  let paramIndex = 1;
  
  // Filter by product type
  if (options.type) {
    query += ` AND product_type = $${paramIndex}`;
    params.push(options.type);
    paramIndex++;
  }
  
  // ... rest of query
}
```

### Page Layer: Handling "All" vs Specific Types

```astro
---
// src/pages/products/index.astro
const type = searchParams.get('type') || 'all';

// Convert "all" to undefined for service layer
const filters = {
  type: type !== 'all' ? (type as ProductType) : undefined,
  // ... other filters
};

// Service layer receives undefined for "all", specific type otherwise
const products = await getProducts(filters);
---
```

**Pattern Explanation:**
- **UI Layer**: Uses 'all' as a value for "show everything"
- **Service Layer**: Uses `undefined` to mean "no type filter"
- **Conversion**: Page layer translates between the two

### Multi-Select Alternative (Advanced)

For some use cases, you might want multi-select:

```astro
<!-- Checkbox pattern for multiple format selection -->
<div class="space-y-2">
  {productTypes.map(({ value, label, icon }) => (
    <label class="flex items-center cursor-pointer">
      <input
        type="checkbox"
        name="types"
        value={value}
        checked={selectedTypes.includes(value)}
        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      />
      <span class="ml-2 text-sm text-gray-700">
        {icon} {label}
      </span>
    </label>
  ))}
</div>
```

**Service layer for multi-select:**
```typescript
if (options.types && options.types.length > 0) {
  const placeholders = options.types.map((_, i) => `$${paramIndex + i}`).join(',');
  query += ` AND product_type IN (${placeholders})`;
  params.push(...options.types);
  paramIndex += options.types.length;
}
```

---

## 3. Seven-Dimension Sorting System

### Why Seven Sort Options?

Different users have different priorities:

1. **Newest First** (default): Discover latest content
2. **Price: Low to High**: Budget-conscious shoppers
3. **Price: High to Low**: Premium product seekers
4. **Title: A to Z**: Alphabetical browsing for known titles
5. **Title: Z to A**: Reverse alphabetical
6. **File Size: Small to Large**: Limited bandwidth/storage
7. **File Size: Large to Small**: Want comprehensive content

### Implementation

```typescript
// src/lib/products.ts
export async function getProducts(options: {
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 
           'title-asc' | 'title-desc' | 'size-asc' | 'size-desc';
  // ... other options
}) {
  let query = `SELECT * FROM digital_products WHERE is_published = true`;
  
  // ... filters ...
  
  // Sorting
  switch (options.sortBy) {
    case 'price-asc':
      query += ' ORDER BY price ASC';
      break;
    case 'price-desc':
      query += ' ORDER BY price DESC';
      break;
    case 'title-asc':
      query += ' ORDER BY title ASC';
      break;
    case 'title-desc':
      query += ' ORDER BY title DESC';
      break;
    case 'size-asc':
      query += ' ORDER BY file_size_mb ASC';
      break;
    case 'size-desc':
      query += ' ORDER BY file_size_mb DESC';
      break;
    case 'newest':
    default:
      query += ' ORDER BY created_at DESC';
      break;
  }
  
  // ... pagination ...
}
```

### UI Component

```astro
<div class="border-t border-gray-200 pt-6">
  <label for="sort" class="block text-sm font-medium text-gray-900 mb-3">
    Sort By
  </label>
  
  <select
    id="sort"
    name="sort"
    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
           focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="newest" selected={currentSort === 'newest'}>
      Newest First
    </option>
    <option value="price-asc" selected={currentSort === 'price-asc'}>
      Price: Low to High
    </option>
    <option value="price-desc" selected={currentSort === 'price-desc'}>
      Price: High to Low
    </option>
    <option value="title-asc" selected={currentSort === 'title-asc'}>
      Title: A to Z
    </option>
    <option value="title-desc" selected={currentSort === 'title-desc'}>
      Title: Z to A
    </option>
    <option value="size-asc" selected={currentSort === 'size-asc'}>
      File Size: Small to Large
    </option>
    <option value="size-desc" selected={currentSort === 'size-desc'}>
      File Size: Large to Small
    </option>
  </select>
</div>

<script>
  // Auto-submit on sort change
  const sortSelect = document.getElementById('sort') as HTMLSelectElement;
  const form = document.getElementById('product-filters') as HTMLFormElement;
  
  sortSelect?.addEventListener('change', () => {
    form?.submit();
  });
</script>
```

### Performance Considerations

**Database Indexes:**
```sql
-- For price sorting
CREATE INDEX idx_products_price ON digital_products(price) WHERE is_published = true;

-- For title sorting
CREATE INDEX idx_products_title ON digital_products(title) WHERE is_published = true;

-- For size sorting
CREATE INDEX idx_products_size ON digital_products(file_size_mb) WHERE is_published = true;

-- For newest sorting (default)
CREATE INDEX idx_products_created ON digital_products(created_at DESC) WHERE is_published = true;
```

---

## 4. URL State Management for Complex Filters

### The Challenge

Managing 7+ URL parameters while ensuring:
- ✅ All filters preserved during pagination
- ✅ Individual filter removal works correctly
- ✅ Search doesn't clear filters
- ✅ URLs are bookmarkable and shareable

### The Solution: Helper Functions

```typescript
// src/pages/products/index.astro

// Extract all parameters
const searchParams = Astro.url.searchParams;
const type = searchParams.get('type') || 'all';
const search = searchParams.get('search') || '';
const minPrice = searchParams.get('minPrice') || '';
const maxPrice = searchParams.get('maxPrice') || '';
const minSize = searchParams.get('minSize') || '';
const maxSize = searchParams.get('maxSize') || '';
const sortBy = searchParams.get('sort') || 'newest';
const page = parseInt(searchParams.get('page') || '1', 10);

// Helper 1: Build URL preserving ALL filters
function buildPageUrl(pageNum: number): string {
  const params = new URLSearchParams();
  params.set('page', pageNum.toString());
  
  // Preserve all 7 filters
  if (type !== 'all') params.set('type', type);
  if (search) params.set('search', search);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (minSize) params.set('minSize', minSize);
  if (maxSize) params.set('maxSize', maxSize);
  if (sortBy !== 'newest') params.set('sort', sortBy);
  
  return `/products?${params.toString()}`;
}

// Helper 2: Build URL removing ONE specific filter
function buildClearFilterUrl(filterName: string): string {
  const params = new URLSearchParams();
  
  // Preserve all EXCEPT the cleared filter
  if (filterName !== 'type' && type !== 'all') params.set('type', type);
  if (filterName !== 'search' && search) params.set('search', search);
  if (filterName !== 'minPrice' && minPrice) params.set('minPrice', minPrice);
  if (filterName !== 'maxPrice' && maxPrice) params.set('maxPrice', maxPrice);
  if (filterName !== 'minSize' && minSize) params.set('minSize', minSize);
  if (filterName !== 'maxSize' && maxSize) params.set('maxSize', maxSize);
  // Note: Don't reset sort when clearing filters
  if (sortBy !== 'newest') params.set('sort', sortBy);
  
  return `/products?${params.toString()}`;
}

// Calculate active filter count
const activeFilterCount = [
  type !== 'all',
  search !== '',
  minPrice !== '',
  maxPrice !== '',
  minSize !== '',
  maxSize !== '',
].filter(Boolean).length;
```

### Using the Helpers

**Pagination:**
```astro
<nav aria-label="Pagination">
  <a href={buildPageUrl(page - 1)}>← Previous</a>
  <span>Page {page}</span>
  <a href={buildPageUrl(page + 1)}>Next →</a>
</nav>
```

**Filter Pills:**
```astro
{type !== 'all' && (
  <span class="filter-pill">
    Type: {type}
    <a href={buildClearFilterUrl('type')}>×</a>
  </span>
)}

{minPrice && (
  <span class="filter-pill">
    Min: ${minPrice}
    <a href={buildClearFilterUrl('minPrice')}>×</a>
  </span>
)}
```

**Search Form:**
```astro
<form action="/products" method="GET">
  <!-- Preserve filters as hidden inputs -->
  {type !== 'all' && <input type="hidden" name="type" value={type} />}
  {minPrice && <input type="hidden" name="minPrice" value={minPrice} />}
  {maxPrice && <input type="hidden" name="maxPrice" value={maxPrice} />}
  {minSize && <input type="hidden" name="minSize" value={minSize} />}
  {maxSize && <input type="hidden" name="maxSize" value={maxSize} />}
  {sortBy !== 'newest' && <input type="hidden" name="sort" value={sortBy} />}
  
  <input type="text" name="search" value={search} />
  <button type="submit">Search</button>
</form>
```

### Testing URL State

```typescript
// Test: buildPageUrl preserves all filters
test('should preserve all filters in buildPageUrl', () => {
  const buildPageUrlFunc = extractFunction(pageSource, 'buildPageUrl');
  expect(containsPattern(buildPageUrlFunc, /type/)).toBe(true);
  expect(containsPattern(buildPageUrlFunc, /minPrice/)).toBe(true);
  expect(containsPattern(buildPageUrlFunc, /maxPrice/)).toBe(true);
  expect(containsPattern(buildPageUrlFunc, /minSize/)).toBe(true);
  expect(containsPattern(buildPageUrlFunc, /maxSize/)).toBe(true);
  expect(containsPattern(buildPageUrlFunc, /sort/)).toBe(true);
});
```

---

## 5. Active Filter Pills Pattern

### Visual Feedback for Applied Filters

Filter pills provide:
- **Visibility**: Users see active filters at a glance
- **Control**: Easy removal of individual filters
- **Feedback**: Immediate visual confirmation

### Implementation

```astro
{hasActiveFilters && (
  <div class="mb-6 flex flex-wrap gap-2">
    <!-- Type Filter Pill -->
    {type !== 'all' && (
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 
                   text-blue-800 rounded-full text-sm">
        Type: {type}
        <a
          href={buildClearFilterUrl('type')}
          class="hover:text-blue-900"
          aria-label="Clear type filter"
        >
          ×
        </a>
      </span>
    )}
    
    <!-- Search Filter Pill -->
    {search && (
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 
                   text-blue-800 rounded-full text-sm">
        Search: "{search}"
        <a href={buildClearFilterUrl('search')} aria-label="Clear search filter">
          ×
        </a>
      </span>
    )}
    
    <!-- Price Filter Pills -->
    {minPrice && (
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 
                   text-blue-800 rounded-full text-sm">
        Min: ${minPrice}
        <a href={buildClearFilterUrl('minPrice')} aria-label="Clear min price filter">
          ×
        </a>
      </span>
    )}
    
    {maxPrice && (
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 
                   text-blue-800 rounded-full text-sm">
        Max: ${maxPrice}
        <a href={buildClearFilterUrl('maxPrice')} aria-label="Clear max price filter">
          ×
        </a>
      </span>
    )}
    
    <!-- Size Filter Pills -->
    {minSize && (
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 
                   text-blue-800 rounded-full text-sm">
        Min Size: {minSize} MB
        <a href={buildClearFilterUrl('minSize')} aria-label="Clear min size filter">
          ×
        </a>
      </span>
    )}
    
    {maxSize && (
      <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 
                   text-blue-800 rounded-full text-sm">
        Max Size: {maxSize} MB
        <a href={buildClearFilterUrl('maxSize')} aria-label="Clear max size filter">
          ×
        </a>
      </span>
    )}
    
    <!-- Clear All Filters -->
    <a
      href="/products"
      class="inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 
             rounded-full text-sm hover:bg-gray-300"
    >
      Clear all filters
    </a>
  </div>
)}
```

### Styling Tips

```css
/* Tailwind utility breakdown */
.filter-pill {
  display: inline-flex;      /* Inline with flex layout */
  align-items: center;       /* Vertically center content */
  gap: 0.25rem;             /* 4px space between text and × */
  padding: 0.25rem 0.75rem; /* 4px vertical, 12px horizontal */
  background-color: #DBEAFE; /* Blue 100 */
  color: #1E40AF;           /* Blue 800 */
  border-radius: 9999px;     /* Fully rounded (pill shape) */
  font-size: 0.875rem;      /* 14px */
}

.filter-pill a {
  color: inherit;            /* Inherit blue color */
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
}

.filter-pill a:hover {
  color: #1E3A8A;           /* Blue 900 - darker on hover */
}
```

---

## 6. Pagination with Filter Preservation

### The Limit + 1 Pattern

**Problem:** How to know if there are more pages without a separate COUNT query?

**Solution:** Fetch `limit + 1` results. If you get the extra one, there are more pages.

```typescript
const limit = 12;
const offset = (page - 1) * limit;

const filters = {
  // ... all filters
  limit: limit + 1,  // Fetch 13 instead of 12
  offset,
};

const allProducts = await getProducts(filters);

// Check if we got the extra one
const hasMore = allProducts.length > limit;

// Show only the requested number
const products = hasMore ? allProducts.slice(0, limit) : allProducts;

const hasNextPage = hasMore;
const hasPrevPage = page > 1;
```

**Benefits:**
- ✅ Single database query (no separate COUNT)
- ✅ Accurate "has more" detection
- ✅ Minimal overhead (1 extra row)
- ✅ Simple logic

### Pagination UI with Disabled States

```astro
{(hasPrevPage || hasNextPage) && (
  <nav aria-label="Pagination" class="flex justify-center items-center gap-2">
    {hasPrevPage ? (
      <a
        href={buildPageUrl(page - 1)}
        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        aria-label="Previous page"
      >
        ← Previous
      </a>
    ) : (
      <span 
        class="px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-400" 
        aria-disabled="true"
      >
        ← Previous
      </span>
    )}

    <span class="px-4 py-2 text-gray-700">
      Page {page}
    </span>

    {hasNextPage ? (
      <a
        href={buildPageUrl(page + 1)}
        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        aria-label="Next page"
      >
        Next →
      </a>
    ) : (
      <span 
        class="px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-400" 
        aria-disabled="true"
      >
        Next →
      </span>
    )}
  </nav>
)}
```

**Accessibility Note:** Using `aria-disabled="true"` on disabled pagination elements helps screen readers understand the state.

---

## 7. Common Pitfalls & Solutions

### Pitfall 1: Losing Filters During Actions

**Problem:**
```astro
<!-- ❌ WRONG: Search form doesn't preserve filters -->
<form action="/products" method="GET">
  <input type="text" name="search" value={search} />
  <button type="submit">Search</button>
</form>
<!-- Result: Clicking search clears type, price, size filters! -->
```

**Solution:**
```astro
<!-- ✅ CORRECT: Hidden inputs preserve all filters -->
<form action="/products" method="GET">
  {type !== 'all' && <input type="hidden" name="type" value={type} />}
  {minPrice && <input type="hidden" name="minPrice" value={minPrice} />}
  {maxPrice && <input type="hidden" name="maxPrice" value={maxPrice} />}
  {minSize && <input type="hidden" name="minSize" value={minSize} />}
  {maxSize && <input type="hidden" name="maxSize" value={maxSize} />}
  {sortBy !== 'newest' && <input type="hidden" name="sort" value={sortBy} />}
  
  <input type="text" name="search" value={search} />
  <button type="submit">Search</button>
</form>
```

### Pitfall 2: Type Mismatch Between UI and Service

**Problem:**
```typescript
// ❌ WRONG: Service expects undefined, page sends 'all'
const filters = {
  type: type,  // 'all' is not a valid ProductType!
};
```

**Solution:**
```typescript
// ✅ CORRECT: Convert 'all' to undefined
const filters = {
  type: type !== 'all' ? (type as ProductType) : undefined,
};
```

### Pitfall 3: Truthy Check for Numeric Filters

**Problem:**
```typescript
// ❌ WRONG: Fails for 0
if (options.minSize) {
  query += ` AND file_size_mb >= $${paramIndex}`;
}
// minSize=0 won't execute because 0 is falsy
```

**Solution:**
```typescript
// ✅ CORRECT: Explicit undefined check
if (options.minSize !== undefined) {
  query += ` AND file_size_mb >= $${paramIndex}`;
}
```

### Pitfall 4: Not Resetting Page on Filter Change

**Problem:**
```
User is on page 5 with 10 products.
User changes filter, now only 2 total products.
Page 5 shows nothing!
```

**Solution:**
```typescript
// Reset to page 1 when filters change
function buildClearFilterUrl(filterName: string): string {
  const params = new URLSearchParams();
  // Don't set page parameter (defaults to 1)
  // ... preserve other filters
  return `/products?${params.toString()}`;
}
```

---

## Summary

This guide covered the essential patterns for implementing comprehensive product filtering:

✅ **File Size Filtering**: Using `!== undefined` for proper 0 handling  
✅ **Multi-Format Products**: Radio buttons with icons for format selection  
✅ **Seven-Dimension Sorting**: Complete sorting system including file size  
✅ **URL State Management**: Helper functions for complex parameter preservation  
✅ **Active Filter Pills**: Visual feedback with individual removal  
✅ **Efficient Pagination**: Limit + 1 pattern for "has more" detection  
✅ **Reusable Components**: Sidebar filter component architecture  
✅ **Client Validation**: Range validation and negative value prevention  
✅ **Source Testing**: Comprehensive testing strategies  
✅ **Common Pitfalls**: Real-world issues and their solutions

**Next Steps:**
- Review T109 (Course Filters) for category-based filtering patterns
- Review T110 (Event Filters) for date range filtering patterns
- Experiment with multi-select variations
- Implement filter analytics to track usage

**Related Resources:**
- Implementation Log: Complete code walkthrough
- Test Log: Testing strategies and debugging
- Task Files: T109, T110 for related patterns
