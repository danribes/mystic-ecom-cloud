# T109: Advanced Course Filters - Learning Guide

**Task**: Add advanced filters to courses page (category, price range, rating)  
**Level**: Intermediate  
**Topics**: URL State Management, Database Aggregation, Filtering UX  
**Prerequisites**: T107 (Blog System), T108 (Blog Filters)

---

## Table of Contents

1. [Overview](#overview)
2. [Learning Objectives](#learning-objectives)
3. [Core Concepts](#core-concepts)
4. [Implementation Tutorial](#implementation-tutorial)
5. [Advanced Techniques](#advanced-techniques)
6. [Common Pitfalls](#common-pitfalls)
7. [Best Practices](#best-practices)
8. [Further Reading](#further-reading)

---

## Overview

This guide teaches you how to implement a comprehensive filtering system with multiple filter types, database aggregation, and an intuitive user experience. You'll learn URL-based state management, rating calculations with SQL, instant vs. manual filtering, and responsive filter UI design.

**What You'll Build**:
- Course catalog page with 4 filter types
- Dynamic category filter populated from database
- Price range input with validation
- Visual rating filter with star icons
- Responsive filter sidebar
- Filter-aware pagination

**Technologies**:
- Astro (Server-Side Rendering)
- PostgreSQL (Complex queries with JOINs and aggregation)
- Tailwind CSS (Responsive design)
- TypeScript (Type-safe interfaces)

---

## Learning Objectives

By the end of this guide, you'll understand:

1. **URL State Management**: Store filter state in URL parameters for shareability
2. **Database Aggregation**: Calculate ratings and counts with SQL GROUP BY
3. **Filter UX Patterns**: When to use instant vs. manual submission
4. **Complex SQL Queries**: JOINs, COALESCE, HAVING clauses
5. **Responsive Filter Design**: Mobile and desktop layouts
6. **Filter Preservation**: Maintain filter state across pagination
7. **Dynamic Category Loading**: Populate filters from database

---

## Core Concepts

### 1. URL-Based State Management

**Concept**: Store all filter values in URL query parameters

**Why?**
- ✅ Shareable (users can bookmark filtered views)
- ✅ Browser history works naturally (back/forward buttons)
- ✅ Deep linking (can link directly to filtered results)
- ✅ SEO-friendly (search engines can crawl)
- ✅ No state synchronization bugs

**Example**:
```
/courses?category=meditation&level=beginner&minPrice=0&maxPrice=50&minRating=4&page=2
```

**Implementation Pattern**:

```typescript
// Extract from URL
const url = new URL(Astro.request.url);
const category = url.searchParams.get('category') || 'all';
const minPrice = url.searchParams.get('minPrice') || '';

// Use in data fetching
const courses = await getCourses({
  category: category !== 'all' ? category : undefined,
  minPrice: minPrice ? parseFloat(minPrice) : undefined,
});

// Preserve in links
const params = new URLSearchParams();
if (category !== 'all') params.set('category', category);
if (minPrice) params.set('minPrice', minPrice);
const nextPageUrl = `/courses?${params.toString()}&page=2`;
```

**Key Insight**: URL parameters become your single source of truth.

---

### 2. Database Aggregation for Ratings

**Concept**: Calculate average ratings in SQL rather than application code

**Why?**
- More efficient (single query vs. N+1 problem)
- Filterable (can use HAVING clause)
- Sortable (ORDER BY rating)
- Real-time accurate

**SQL Pattern**:

```sql
SELECT 
  c.*,
  COALESCE(AVG(r.rating), 0) as rating,
  COUNT(DISTINCT r.id) as review_count
FROM courses c
LEFT JOIN reviews r 
  ON c.id = r.course_id 
  AND r.approved = true
WHERE c.is_published = true
GROUP BY c.id
HAVING COALESCE(AVG(r.rating), 0) >= 4  -- Filter by rating
ORDER BY rating DESC, c.created_at DESC;
```

**Key Components**:

1. **LEFT JOIN** (not INNER): Include courses without reviews
2. **COALESCE**: Handle NULL ratings (default to 0)
3. **COUNT(DISTINCT)**: Avoid duplicate counting
4. **GROUP BY**: Required for aggregation
5. **HAVING**: Filter on aggregated values (after GROUP BY)

**Common Mistake**:
```sql
-- ❌ Wrong: WHERE on aggregated column
WHERE AVG(r.rating) >= 4  -- Error: can't use WHERE with aggregate

-- ✅ Correct: HAVING on aggregated column
HAVING AVG(r.rating) >= 4
```

---

### 3. Instant vs. Manual Filtering

**Concept**: Different input types warrant different submission strategies

**Instant Filtering** (Radio Buttons, Checkboxes):
- **When**: Single-choice inputs where intent is clear
- **How**: Auto-submit form on change
- **Why**: Users expect immediate feedback

```javascript
radioInputs.forEach(radio => {
  radio.addEventListener('change', () => {
    form.submit();  // Instant filtering
  });
});
```

**Manual Filtering** (Text/Number Inputs):
- **When**: Multi-character inputs being typed
- **How**: Require button click to submit
- **Why**: Prevents excessive requests during typing

```html
<input type="number" name="minPrice" />
<input type="number" name="maxPrice" />
<button type="submit">Apply Filters</button>
```

**Best of Both Worlds**:
- Quick browsing with radio buttons (category, level, rating)
- Precise control with text inputs (price range, search)

---

### 4. Filter Preservation in Pagination

**Concept**: Maintain all active filters when navigating between pages

**Why?**: Users expect filters to persist across pages

**Implementation**:

```typescript
function buildPageUrl(pageNum: number): string {
  const params = new URLSearchParams();
  
  // Always include page number
  params.set('page', pageNum.toString());
  
  // Preserve ALL active filters
  if (category !== 'all') params.set('category', category);
  if (level !== 'all') params.set('level', level);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (minRating) params.set('minRating', minRating);
  if (search) params.set('search', search);
  
  return `/courses?${params.toString()}`;
}
```

**Usage in Pagination**:
```astro
<a href={buildPageUrl(currentPage + 1)}>Next</a>
```

**Key Insight**: Helper function ensures consistency across all pagination links.

---

### 5. Dynamic Filter Population

**Concept**: Populate filter options from database rather than hardcoding

**Why?**
- Always up-to-date (new categories appear automatically)
- No manual maintenance
- Respects business logic (only published courses)

**Implementation**:

```typescript
// Database query
async function getCategories(): Promise<string[]> {
  const result = await pool.query(`
    SELECT DISTINCT category 
    FROM courses 
    WHERE is_published = true
    ORDER BY category
  `);
  return result.rows.map(row => row.category);
}

// Use in component
const categories = await getCategories();
```

```astro
<!-- Render dynamically -->
{categories.map((category) => (
  <label>
    <input 
      type="radio" 
      name="category" 
      value={category}
      checked={currentCategory === category}
    />
    {category.charAt(0).toUpperCase() + category.slice(1)}
  </label>
))}
```

---

## Implementation Tutorial

### Step 1: Create Course Service

**File**: `src/lib/courses.ts`

**Purpose**: Centralized database access for course operations

```typescript
import { pool } from './db';

// TypeScript interfaces
export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  price: number;
  instructor_name: string;
  duration_hours: number;
  thumbnail_url?: string;
  is_published: boolean;
  created_at: Date;
  rating?: number;
  review_count?: number;
}

export interface GetCoursesFilters {
  category?: string;
  level?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface GetCoursesResult {
  items: Course[];
  total: number;
  hasMore: boolean;
}

// Main filtering function
export async function getCourses(
  filters: GetCoursesFilters = {}
): Promise<GetCoursesResult> {
  const {
    category,
    level,
    minPrice,
    maxPrice,
    minRating,
    search,
    limit = 12,
    offset = 0,
  } = filters;

  // Build query dynamically
  let query = `
    SELECT 
      c.*,
      COALESCE(AVG(r.rating), 0) as rating,
      COUNT(DISTINCT r.id) as review_count
    FROM courses c
    LEFT JOIN reviews r ON c.id = r.course_id AND r.approved = true
    WHERE c.is_published = true
  `;

  const params: any[] = [];
  let paramIndex = 1;

  // Add optional filters
  if (category) {
    query += ` AND c.category = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (level) {
    query += ` AND c.level = $${paramIndex}`;
    params.push(level);
    paramIndex++;
  }

  if (minPrice !== undefined) {
    query += ` AND c.price >= $${paramIndex}`;
    params.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined) {
    query += ` AND c.price <= $${paramIndex}`;
    params.push(maxPrice);
    paramIndex++;
  }

  if (search) {
    query += ` AND (
      c.title ILIKE $${paramIndex} OR 
      c.description ILIKE $${paramIndex} OR 
      c.instructor_name ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  query += ` GROUP BY c.id`;

  // Rating filter must use HAVING (after aggregation)
  if (minRating !== undefined) {
    query += ` HAVING COALESCE(AVG(r.rating), 0) >= $${paramIndex}`;
    params.push(minRating);
    paramIndex++;
  }

  query += ` ORDER BY rating DESC, c.created_at DESC`;
  
  // Fetch one extra to check if there are more results
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit + 1, offset);

  const result = await pool.query(query, params);
  
  // Separate total count query (accurate with aggregation)
  let countQuery = `
    SELECT COUNT(DISTINCT c.id) as total
    FROM courses c
    LEFT JOIN reviews r ON c.id = r.course_id AND r.approved = true
    WHERE c.is_published = true
  `;
  
  // Apply same filters to count query (reuse logic)
  // ... (add filter conditions as above)

  const countResult = await pool.query(countQuery, params.slice(0, -2));
  const total = parseInt(countResult.rows[0].total);

  // Check if there are more results
  const hasMore = result.rows.length > limit;
  const items = hasMore ? result.rows.slice(0, limit) : result.rows;

  return { items, total, hasMore };
}

// Helper to get distinct categories
export async function getCategories(): Promise<string[]> {
  const result = await pool.query(`
    SELECT DISTINCT category 
    FROM courses 
    WHERE is_published = true
    ORDER BY category
  `);
  return result.rows.map(row => row.category);
}
```

**Key Techniques**:
1. **Parameterized Queries**: `$${paramIndex}` prevents SQL injection
2. **Dynamic Query Building**: Only add filters when values provided
3. **Limit + 1 Technique**: Fetch one extra to detect hasMore
4. **Separate Count Query**: Accurate total with GROUP BY aggregation

---

### Step 2: Create Filter Component

**File**: `src/components/CourseFilters.astro`

**Purpose**: Reusable sidebar with all filter controls

```astro
---
interface Props {
  currentCategory?: string;
  currentLevel?: string;
  currentMinPrice?: string;
  currentMaxPrice?: string;
  currentMinRating?: string;
  categories: string[];
}

const {
  currentCategory = 'all',
  currentLevel = 'all',
  currentMinPrice = '',
  currentMaxPrice = '',
  currentMinRating = '',
  categories = [],
} = Astro.props;

// Check if any filters are active
const hasActiveFilters = 
  currentCategory !== 'all' ||
  currentLevel !== 'all' ||
  currentMinPrice !== '' ||
  currentMaxPrice !== '' ||
  currentMinRating !== '';
---

<aside class="bg-white rounded-lg shadow-md p-6 sticky top-4 w-full lg:w-64">
  <form id="course-filters" action="/courses" method="GET">
    
    <!-- Category Filter -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-3">Category</h2>
      
      <label class="flex items-center mb-2 cursor-pointer">
        <input
          type="radio"
          name="category"
          value="all"
          checked={currentCategory === 'all'}
          class="mr-2"
        />
        <span>All Categories</span>
      </label>

      {categories.map((category) => (
        <label class="flex items-center mb-2 cursor-pointer">
          <input
            type="radio"
            name="category"
            value={category}
            checked={currentCategory === category}
            class="mr-2"
          />
          <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
        </label>
      ))}
    </div>

    <!-- Level Filter -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-3">Level</h2>
      
      {['all', 'beginner', 'intermediate', 'advanced'].map((level) => (
        <label class="flex items-center mb-2 cursor-pointer">
          <input
            type="radio"
            name="level"
            value={level}
            checked={currentLevel === level}
            class="mr-2"
          />
          <span>
            {level === 'all' 
              ? 'All Levels' 
              : level.charAt(0).toUpperCase() + level.slice(1)}
          </span>
        </label>
      ))}
    </div>

    <!-- Price Range Filter -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-3">Price Range</h2>
      
      <div class="space-y-3">
        <div>
          <label class="block text-sm text-gray-700 mb-1">
            Minimum ($)
          </label>
          <input
            type="number"
            name="minPrice"
            value={currentMinPrice}
            min="0"
            step="0.01"
            placeholder="0"
            class="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-700 mb-1">
            Maximum ($)
          </label>
          <input
            type="number"
            name="maxPrice"
            value={currentMaxPrice}
            min="0"
            step="0.01"
            placeholder="No limit"
            class="w-full px-3 py-2 border rounded-md"
          />
        </div>
      </div>
    </div>

    <!-- Rating Filter -->
    <div class="mb-6">
      <h2 class="text-lg font-semibold mb-3">Rating</h2>
      
      <label class="flex items-center mb-2 cursor-pointer">
        <input
          type="radio"
          name="minRating"
          value=""
          checked={currentMinRating === ''}
          class="mr-2"
        />
        <span>All Ratings</span>
      </label>

      {[4, 3, 2, 1].map((rating) => (
        <label class="flex items-center mb-2 cursor-pointer">
          <input
            type="radio"
            name="minRating"
            value={rating}
            checked={currentMinRating === String(rating)}
            class="mr-2"
          />
          <span class="flex items-center">
            <!-- Star icons -->
            {[...Array(rating)].map(() => (
              <svg class="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
            <span class="ml-2 text-sm">{rating}+ stars</span>
          </span>
        </label>
      ))}
    </div>

    <!-- Apply Button -->
    <button
      type="submit"
      class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
    >
      Apply Filters
    </button>

    <!-- Clear Filters -->
    {hasActiveFilters && (
      <a
        href="/courses"
        class="block text-center text-sm text-gray-600 hover:text-gray-800 mt-3"
      >
        Clear all filters
      </a>
    )}
  </form>
</aside>

<script>
  // Auto-submit form when radio buttons change (instant filtering)
  const form = document.getElementById('course-filters') as HTMLFormElement;
  const radioInputs = form.querySelectorAll('input[type="radio"]');

  radioInputs.forEach((radio) => {
    radio.addEventListener('change', () => {
      form.submit();
    });
  });

  // Validate price inputs (prevent negative values)
  const minPriceInput = form.querySelector('[name="minPrice"]') as HTMLInputElement;
  const maxPriceInput = form.querySelector('[name="maxPrice"]') as HTMLInputElement;

  [minPriceInput, maxPriceInput].forEach((input) => {
    input?.addEventListener('input', () => {
      if (parseFloat(input.value) < 0) {
        input.value = '0';
      }
    });
  });
</script>
```

**Key Techniques**:
1. **Props Interface**: Type-safe component inputs
2. **Dynamic Rendering**: Map over categories array
3. **Instant Filtering**: Auto-submit on radio change
4. **Price Validation**: Prevent negative values
5. **Conditional Display**: Show clear link only when filters active
6. **Sticky Positioning**: Sidebar stays visible on scroll

---

### Step 3: Create Catalog Page

**File**: `src/pages/courses/index.astro`

**Purpose**: Main page integrating filters and course display

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import CourseCard from '../../components/CourseCard.astro';
import CourseFilters from '../../components/CourseFilters.astro';
import { getCourses, getCategories } from '../../lib/courses';

// Extract URL parameters
const url = new URL(Astro.request.url);
const category = url.searchParams.get('category') || 'all';
const level = url.searchParams.get('level') || 'all';
const minPrice = url.searchParams.get('minPrice') || '';
const maxPrice = url.searchParams.get('maxPrice') || '';
const minRating = url.searchParams.get('minRating') || '';
const search = url.searchParams.get('search') || '';
const page = parseInt(url.searchParams.get('page') || '1');
const limit = 12;

// Fetch data
let courses, categories, error;
try {
  [courses, categories] = await Promise.all([
    getCourses({
      category: category !== 'all' ? category : undefined,
      level: level !== 'all' ? level : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      search: search || undefined,
      limit,
      offset: (page - 1) * limit,
    }),
    getCategories(),
  ]);
} catch (e) {
  error = 'Failed to load courses. Please try again later.';
  courses = { items: [], total: 0, hasMore: false };
  categories = [];
}

// Pagination calculations
const currentPage = page;
const totalPages = Math.ceil(courses.total / limit);
const hasNextPage = courses.hasMore;
const hasPrevPage = currentPage > 1;

// Helper: Build page URL preserving filters
function buildPageUrl(pageNum: number): string {
  const params = new URLSearchParams();
  params.set('page', pageNum.toString());
  
  if (category !== 'all') params.set('category', category);
  if (level !== 'all') params.set('level', level);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (minRating) params.set('minRating', minRating);
  if (search) params.set('search', search);
  
  return `/courses?${params.toString()}`;
}

// Count active filters
const activeFilterCount = [
  category !== 'all',
  level !== 'all',
  minPrice !== '',
  maxPrice !== '',
  minRating !== '',
].filter(Boolean).length;
---

<BaseLayout title="Browse Courses">
  <div class="container mx-auto px-4 py-8">
    
    <!-- Header -->
    <header class="mb-8">
      <h1 class="text-4xl font-bold mb-2">Browse Courses</h1>
      {activeFilterCount > 0 && (
        <p class="text-gray-600">
          {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
        </p>
      )}
    </header>

    <div class="flex flex-col lg:flex-row gap-8">
      
      <!-- Filter Sidebar -->
      <CourseFilters
        currentCategory={category}
        currentLevel={level}
        currentMinPrice={minPrice}
        currentMaxPrice={maxPrice}
        currentMinRating={minRating}
        categories={categories}
      />

      <!-- Main Content -->
      <main class="flex-1">
        
        <!-- Error State -->
        {error && (
          <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <!-- Empty State -->
        {!error && courses.items.length === 0 && (
          <div class="text-center py-12">
            <h2 class="text-2xl font-semibold mb-4">No Courses Found</h2>
            <p class="text-gray-600 mb-6">
              Try adjusting your filters to see more results.
            </p>
            <a
              href="/courses"
              class="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Clear Filters
            </a>
          </div>
        )}

        <!-- Results -->
        {!error && courses.items.length > 0 && (
          <>
            <!-- Results Count -->
            <p class="text-gray-600 mb-6">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, courses.total)} of {courses.total} courses
            </p>

            <!-- Course Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {courses.items.map((course) => (
                <CourseCard course={course} />
              ))}
            </div>

            <!-- Pagination -->
            {totalPages > 1 && (
              <nav aria-label="Pagination" class="flex justify-center items-center gap-2">
                
                <!-- Previous Button -->
                <a
                  href={hasPrevPage ? buildPageUrl(currentPage - 1) : '#'}
                  class={`px-4 py-2 rounded-md ${
                    hasPrevPage
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-disabled={!hasPrevPage}
                >
                  Previous
                </a>

                <!-- Page Numbers (Desktop) -->
                <div class="hidden md:flex gap-2">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    
                    // Smart truncation: Show first, last, current ±2
                    const showPage = 
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - currentPage) <= 2;

                    if (!showPage) {
                      // Show ellipsis once per gap
                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return <span class="px-2">...</span>;
                      }
                      return null;
                    }

                    return (
                      <a
                        href={buildPageUrl(pageNum)}
                        class={`px-4 py-2 rounded-md ${
                          pageNum === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        aria-current={pageNum === currentPage ? 'page' : undefined}
                      >
                        {pageNum}
                      </a>
                    );
                  })}
                </div>

                <!-- Mobile Indicator -->
                <span class="flex md:hidden text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <!-- Next Button -->
                <a
                  href={hasNextPage ? buildPageUrl(currentPage + 1) : '#'}
                  class={`px-4 py-2 rounded-md ${
                    hasNextPage
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-disabled={!hasNextPage}
                >
                  Next
                </a>
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  </div>
</BaseLayout>
```

**Key Techniques**:
1. **Parallel Data Fetching**: Promise.all for courses and categories
2. **Error Handling**: Try/catch with fallback values
3. **Three States**: Error, empty, results
4. **buildPageUrl Helper**: Preserves filters in pagination
5. **Smart Pagination**: Truncates with ellipsis on desktop
6. **Responsive Layout**: Flex column (mobile) → row (desktop)

---

## Advanced Techniques

### 1. Preventing Over-Counting with GROUP BY

**Problem**: Joining courses with reviews can cause duplicate rows

**Example**:
```sql
-- ❌ Wrong: Counts duplicate course rows
SELECT COUNT(*) FROM courses c
LEFT JOIN reviews r ON c.id = r.course_id;
-- Returns 50 if course has 10 reviews (should be 1)

-- ✅ Correct: Count distinct courses
SELECT COUNT(DISTINCT c.id) FROM courses c
LEFT JOIN reviews r ON c.id = r.course_id;
-- Returns 1 regardless of review count
```

**Solution**: Separate count query without grouping

```typescript
// Results query (with aggregation)
const query = `
  SELECT c.*, AVG(r.rating) as rating
  FROM courses c LEFT JOIN reviews r ON c.id = r.course_id
  GROUP BY c.id
  LIMIT 12
`;

// Separate count query (distinct only)
const countQuery = `
  SELECT COUNT(DISTINCT c.id) as total
  FROM courses c LEFT JOIN reviews r ON c.id = r.course_id
`;
```

---

### 2. Limit + 1 Pagination Technique

**Problem**: How to know if there are more results without counting all?

**Solution**: Fetch one extra result, then check length

```typescript
// Fetch limit + 1
query += ` LIMIT ${limit + 1}`;
const result = await pool.query(query);

// Check if there are more
const hasMore = result.rows.length > limit;

// Return only requested amount
const items = hasMore ? result.rows.slice(0, limit) : result.rows;

return { items, total, hasMore };
```

**Benefits**:
- Faster than counting all results
- Accurate for "next page" button
- Works well with large datasets

---

### 3. Dynamic Query Building

**Pattern**: Only add filters when values provided

```typescript
let query = 'SELECT * FROM courses WHERE is_published = true';
const params: any[] = [];
let paramIndex = 1;

// Add filters conditionally
if (category) {
  query += ` AND category = $${paramIndex}`;
  params.push(category);
  paramIndex++;
}

if (minPrice !== undefined) {
  query += ` AND price >= $${paramIndex}`;
  params.push(minPrice);
  paramIndex++;
}

// Execute with dynamic params
const result = await pool.query(query, params);
```

**Benefits**:
- Cleaner than building multiple queries
- More maintainable
- Automatically optimized by database

---

### 4. Star Rating Component

**Pattern**: Visual rating display with SVG icons

```astro
{[4, 3, 2, 1].map((rating) => (
  <label class="flex items-center">
    <input type="radio" name="minRating" value={rating} />
    
    <!-- Filled stars -->
    {[...Array(rating)].map(() => (
      <svg class="w-4 h-4 text-yellow-400 fill-current">
        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
      </svg>
    ))}
    
    <!-- Empty stars -->
    {[...Array(5 - rating)].map(() => (
      <svg class="w-4 h-4 text-gray-300 fill-current">
        {/* Same path */}
      </svg>
    ))}
    
    <span class="ml-2">{rating}+ stars</span>
  </label>
))}
```

**Key Technique**: Use `Array(n)` to repeat elements

---

## Common Pitfalls

### 1. Forgetting to Convert URL Params

**Problem**: URL parameters are always strings

```typescript
// ❌ Wrong: minPrice is string "50"
const minPrice = url.searchParams.get('minPrice');
if (minPrice) query += ` AND price >= ${minPrice}`;  // Type error

// ✅ Correct: Parse to number
const minPrice = url.searchParams.get('minPrice');
const minPriceNum = minPrice ? parseFloat(minPrice) : undefined;
if (minPriceNum !== undefined) {
  query += ` AND price >= $${paramIndex}`;
  params.push(minPriceNum);
}
```

---

### 2. Using WHERE Instead of HAVING

**Problem**: Can't filter on aggregated columns with WHERE

```sql
-- ❌ Wrong
SELECT c.*, AVG(r.rating) as rating
FROM courses c LEFT JOIN reviews r ON c.id = r.course_id
WHERE AVG(r.rating) >= 4  -- Error!
GROUP BY c.id;

-- ✅ Correct
SELECT c.*, AVG(r.rating) as rating
FROM courses c LEFT JOIN reviews r ON c.id = r.course_id
GROUP BY c.id
HAVING AVG(r.rating) >= 4;  -- After GROUP BY
```

**Rule**: WHERE before GROUP BY, HAVING after

---

### 3. Not Preserving Filters in Pagination

**Problem**: Clicking "next page" loses filter state

```astro
<!-- ❌ Wrong: Loses filters -->
<a href={`/courses?page=${currentPage + 1}`}>Next</a>

<!-- ✅ Correct: Preserves filters -->
<a href={buildPageUrl(currentPage + 1)}>Next</a>
```

**Solution**: Always use helper function for pagination URLs

---

### 4. Forgetting NULL Ratings

**Problem**: Courses without reviews have NULL average

```sql
-- ❌ Wrong: NULL ratings sort unpredictably
SELECT c.*, AVG(r.rating) as rating
FROM courses c LEFT JOIN reviews r ON c.id = r.course_id
GROUP BY c.id
ORDER BY rating DESC;  -- NULLs at top or bottom?

-- ✅ Correct: Default to 0
SELECT c.*, COALESCE(AVG(r.rating), 0) as rating
FROM courses c LEFT JOIN reviews r ON c.id = r.course_id
GROUP BY c.id
ORDER BY rating DESC;  -- 0 sorts predictably
```

---

### 5. Negative Price Values

**Problem**: Users can enter negative numbers

```html
<!-- ❌ Wrong: Allows negatives -->
<input type="number" name="minPrice" />

<!-- ✅ Correct: Prevent negatives -->
<input type="number" name="minPrice" min="0" />
```

**Extra Protection**: JavaScript validation

```javascript
input.addEventListener('input', () => {
  if (parseFloat(input.value) < 0) {
    input.value = '0';
  }
});
```

---

## Best Practices

### 1. Filter State Management

✅ **DO**: Use URL parameters for filter state
```typescript
const category = url.searchParams.get('category') || 'all';
```

❌ **DON'T**: Use client-side state
```typescript
const [category, setCategory] = useState('all');  // Loses state on refresh
```

---

### 2. Database Queries

✅ **DO**: Use parameterized queries
```typescript
query += ` AND category = $${paramIndex}`;
params.push(category);
```

❌ **DON'T**: Concatenate user input
```typescript
query += ` AND category = '${category}'`;  // SQL injection risk!
```

---

### 3. Filter UX

✅ **DO**: Match submission to input type
- Radio buttons → Instant (auto-submit)
- Text inputs → Manual (button required)

❌ **DON'T**: Make everything instant
- Causes excessive requests during typing

---

### 4. Pagination

✅ **DO**: Preserve all filters
```typescript
function buildPageUrl(pageNum) {
  // Include ALL current filters
}
```

❌ **DON'T**: Build URLs inline
```html
<a href={`/courses?page=${page+1}`}>  <!-- Loses filters -->
```

---

### 5. Empty States

✅ **DO**: Provide clear guidance
```astro
<div>
  <h2>No Courses Found</h2>
  <p>Try adjusting your filters</p>
  <a href="/courses">Clear Filters</a>
</div>
```

❌ **DON'T**: Show nothing
```astro
{courses.length === 0 && <div>No results</div>}  <!-- Unhelpful -->
```

---

## Further Reading

### Related Tasks

- **T107: Blog System** - Basic pagination patterns
- **T108: Blog Filters** - Simple filtering with URL state
- **T110: Course Search** (Next) - Full-text search implementation

### SQL Concepts

- **JOINs**: Understanding LEFT vs INNER joins
- **Aggregation**: GROUP BY, COUNT, AVG, SUM
- **HAVING vs WHERE**: When to use each
- **Query Optimization**: Indexes, EXPLAIN ANALYZE

### UX Patterns

- **Faceted Search**: Showing result counts per filter
- **Filter Pills**: Visual display of active filters
- **Smart Defaults**: Pre-selecting popular filters
- **Filter Presets**: Saving favorite filter combinations

### Advanced Topics

- **Elasticsearch**: For complex full-text search
- **Redis**: Caching popular filter combinations
- **GraphQL**: Alternative API for flexible filtering
- **Facet Counts**: Showing "(15)" next to each filter option

---

## Practice Exercises

### Exercise 1: Add Multi-Select Category Filter

**Challenge**: Allow selecting multiple categories simultaneously

**Hints**:
- Change radio buttons to checkboxes
- Handle array of category values
- Use SQL `IN` clause instead of `=`
- Update URL to support multiple values

**Solution Approach**:
```typescript
// URL: /courses?category=meditation,yoga
const categories = url.searchParams.get('category')?.split(',') || [];

// SQL
if (categories.length > 0) {
  query += ` AND category = ANY($${paramIndex})`;
  params.push(categories);
}
```

---

### Exercise 2: Add Sort Options

**Challenge**: Allow sorting by price, rating, or date

**Hints**:
- Add sort dropdown to filters
- Extract sort parameter from URL
- Validate sort value (prevent SQL injection)
- Update ORDER BY clause

**Solution Approach**:
```typescript
const sort = url.searchParams.get('sort') || 'rating';

const validSorts = {
  rating: 'rating DESC',
  price_asc: 'price ASC',
  price_desc: 'price DESC',
  newest: 'created_at DESC',
};

const orderBy = validSorts[sort] || validSorts.rating;
query += ` ORDER BY ${orderBy}`;
```

---

### Exercise 3: Show Filter Counts

**Challenge**: Display result count for each filter option

**Example**: "Meditation (15)" "Yoga (23)"

**Hints**:
- Run count query for each filter option
- Can be expensive (consider caching)
- Update only when filters change
- Show 0 counts grayed out

---

## Conclusion

You've learned how to build a comprehensive filtering system with:

- ✅ URL-based state management
- ✅ Database aggregation with SQL
- ✅ Multiple filter types
- ✅ Responsive filter UI
- ✅ Filter preservation across pagination
- ✅ Dynamic category loading

**Key Takeaways**:

1. **URL State**: Store filters in URL for shareability
2. **Database Aggregation**: Use SQL for efficient calculations
3. **UX Patterns**: Match submission to input type
4. **Filter Preservation**: Always maintain state across pages
5. **Dynamic Loading**: Populate filters from database

**Next Steps**:

- Implement full-text search (T110)
- Add sort options
- Show filter counts
- Add filter presets

**Status**: You're ready to build sophisticated filtering systems! ✅
