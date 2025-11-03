# Admin Interfaces: Capacity Tracking & Data Visualization Guide

**Learning Objective**: Master building admin dashboards with real-time capacity tracking, data aggregation, and effective visual indicators using Tailwind CSS.

**Skill Level**: Intermediate  
**Prerequisites**: Understanding of Astro, database queries, Tailwind CSS basics  
**Related Tasks**: T066 (Admin Courses), T069 (Admin Layout)

---

## Table of Contents

1. [Introduction to Admin Interfaces](#introduction)
2. [Capacity Tracking System](#capacity-tracking)
3. [Data Aggregation Patterns](#data-aggregation)
4. [Visual Indicators & Progress Bars](#visual-indicators)
5. [Filtering & Search](#filtering)
6. [Summary Statistics Dashboard](#summary-statistics)
7. [Action Buttons & Navigation](#action-buttons)
8. [Responsive Admin Layouts](#responsive-layouts)
9. [Performance Optimization](#performance)
10. [Best Practices](#best-practices)

---

## 1. Introduction to Admin Interfaces {#introduction}

### What Makes a Good Admin Interface?

Admin interfaces have different requirements than public-facing pages:

**Admin Priorities**:
- **Information Density**: Show more data per screen
- **Quick Actions**: Fast access to common tasks
- **Status Indicators**: Visual feedback on system state
- **Filtering**: Find specific records quickly
- **Bulk Operations**: Manage multiple items at once
- **Real-Time Data**: Current state, not cached

**User Priorities** (Public Pages):
- Visual appeal over information density
- Fewer options to reduce overwhelm
- Clear CTAs for single actions
- Simple navigation

### Admin Interface Structure

**Standard Layout**:
```
┌─────────────────────────────────────┐
│ Header: Title + Primary CTA         │
├─────────────────────────────────────┤
│ Filters: Search + Dropdowns         │
├─────────────────────────────────────┤
│ Stats: 4 Summary Cards              │
├─────────────────────────────────────┤
│ Data Table: Rows with Actions       │
│ or                                  │
│ Empty State: Helpful Message        │
└─────────────────────────────────────┘
```

**Benefits**:
- Predictable navigation
- Consistent patterns across admin pages
- Easy to scan and find information
- Standard location for common actions

### Example: Events Admin Page

```astro
---
// src/pages/admin/events/index.astro
import { getEvents } from '@/lib/events';
import { query } from '@/lib/db';

// Get query parameters
const city = Astro.url.searchParams.get('city') || '';
const country = Astro.url.searchParams.get('country') || '';
const status = Astro.url.searchParams.get('status') || '';

// Fetch events with filters
const events = await getEvents({
  city: city || undefined,
  country: country || undefined,
  isPublished: status === 'published' ? true 
    : status === 'draft' ? false 
    : undefined,
});

// Get booking statistics
const bookingStatsResult = await query(`
  SELECT event_id, COUNT(*) as total_bookings,
         SUM(attendees) as total_attendees
  FROM bookings
  WHERE status = 'confirmed'
  GROUP BY event_id
`);

const bookingStats = new Map(
  bookingStatsResult.rows.map(row => [
    row.event_id,
    {
      totalBookings: parseInt(row.total_bookings),
      totalAttendees: parseInt(row.total_attendees),
    },
  ])
);
---

<!DOCTYPE html>
<html lang="en">
<head>
  <title>Event Management</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <!-- Admin interface content -->
</body>
</html>
```

**Key Points**:
- Server-side data fetching (Astro frontmatter)
- Query parameter filtering
- Aggregated statistics
- Map data structure for O(1) lookups

---

## 2. Capacity Tracking System {#capacity-tracking}

### The Capacity Problem

**Challenge**: Events have limited capacity. Admins need to:
- See how full each event is at a glance
- Identify events nearing capacity
- Understand booking trends

**Solution**: Multi-indicator system
1. **Numerical**: "75 / 100" (filled / total)
2. **Visual**: Progress bar
3. **Status**: Color-coded badge

### Calculating Capacity Percentage

```typescript
const getCapacityPercentage = (event: Event): number => {
  const filled = event.capacity - event.available_spots;
  const total = event.capacity;
  return Math.round((filled / total) * 100);
};
```

**Example Calculations**:
```typescript
// Event 1: 75 filled, 100 capacity
filled: 100 - 25 = 75
percentage: (75 / 100) * 100 = 75%

// Event 2: Full capacity
filled: 50 - 0 = 50
percentage: (50 / 50) * 100 = 100%

// Event 3: No bookings
filled: 100 - 100 = 0
percentage: (0 / 100) * 100 = 0%
```

**Why Round?**:
```typescript
// Without rounding
33 filled / 100 capacity = 33.333333%

// With rounding
Math.round(33.333333) = 33%
```

### Color-Coded Status

**Capacity Thresholds**:
```typescript
const getCapacityColor = (percentage: number): string => {
  if (percentage >= 90) {
    // Nearly full - urgent attention needed
    return 'text-red-600 bg-red-50';
  }
  if (percentage >= 70) {
    // Medium capacity - monitor
    return 'text-yellow-600 bg-yellow-50';
  }
  // Available - no action needed
  return 'text-green-600 bg-green-50';
};
```

**Color Psychology**:
- **Red**: Stop, urgent, needs attention (≥90%)
- **Yellow**: Caution, monitor (70-89%)
- **Green**: Safe, available (<70%)

**Visual Examples**:
```
Event A: 95% Full  [███████████▒] 🔴 RED
Event B: 75% Full  [████████░░░] 🟡 YELLOW
Event C: 40% Full  [█████░░░░░░] 🟢 GREEN
```

### Progress Bar Implementation

**HTML Structure**:
```astro
<div class="w-full bg-gray-200 rounded-full h-2">
  <div 
    class={`h-2 rounded-full ${
      capacityPercentage >= 90 ? 'bg-red-500' : 
      capacityPercentage >= 70 ? 'bg-yellow-500' : 
      'bg-green-500'
    }`}
    style={`width: ${capacityPercentage}%`}
  ></div>
</div>
```

**Breakdown**:
1. **Outer container**: Gray background, full width
2. **Inner bar**: Colored, dynamic width based on percentage
3. **Conditional classes**: Color changes based on threshold
4. **Inline style**: Width must be dynamic (can't use Tailwind classes)

**Why Inline Styles?**:
```astro
<!-- ❌ Won't work - Tailwind can't generate dynamic classes -->
<div class={`w-[${capacityPercentage}%]`}></div>

<!-- ✅ Works - Inline style is dynamic -->
<div style={`width: ${capacityPercentage}%`}></div>
```

### Complete Capacity Display

```astro
{events.map(event => {
  const filled = event.capacity - event.available_spots;
  const capacityPercentage = getCapacityPercentage(event);
  const capacityColor = getCapacityColor(capacityPercentage);
  
  return (
    <td class="px-6 py-4">
      <div class="space-y-1">
        <!-- Numerical display -->
        <div class="text-sm font-medium text-gray-900">
          {filled} / {event.capacity}
        </div>
        
        <!-- Progress bar -->
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class={`h-2 rounded-full ${
              capacityPercentage >= 90 ? 'bg-red-500' : 
              capacityPercentage >= 70 ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}
            style={`width: ${capacityPercentage}%`}
          ></div>
        </div>
        
        <!-- Status badge -->
        <div class="flex justify-between items-center">
          <span class={`text-xs font-medium ${capacityColor} px-2 py-0.5 rounded`}>
            {capacityPercentage}% Full
          </span>
        </div>
      </div>
    </td>
  );
})}
```

**Result**:
```
75 / 100
[█████████░░░░░░]
🟢 75% Full
```

---

## 3. Data Aggregation Patterns {#data-aggregation}

### The N+1 Query Problem

**❌ Bad Approach** (N+1 queries):
```typescript
const events = await getEvents();

for (const event of events) {
  // Query for EACH event (N queries)
  const bookings = await query(`
    SELECT COUNT(*) FROM bookings WHERE event_id = ${event.id}
  `);
  event.bookingCount = bookings.rows[0].count;
}
```

**Problem**: If you have 50 events, you make 51 database queries:
- 1 query for all events
- 50 queries for booking counts (one per event)

**Result**: Slow page load (50-100ms per query = 2.5-5 seconds!)

### ✅ Aggregation Solution

**Single Query Approach**:
```sql
SELECT 
  event_id,
  COUNT(*) as total_bookings,
  SUM(attendees) as total_attendees
FROM bookings
WHERE status = 'confirmed'
GROUP BY event_id
```

**Query Execution Time**: ~10-20ms (regardless of number of events!)

**Implementation**:
```typescript
// 1. Fetch all events (1 query)
const events = await getEvents();

// 2. Fetch all booking stats (1 query)
const bookingStatsResult = await query(`
  SELECT event_id, COUNT(*) as total_bookings,
         SUM(attendees) as total_attendees
  FROM bookings
  WHERE status = 'confirmed'
  GROUP BY event_id
`);

// 3. Build lookup map for O(1) access
const bookingStats = new Map(
  bookingStatsResult.rows.map(row => [
    row.event_id,
    {
      totalBookings: parseInt(row.total_bookings),
      totalAttendees: parseInt(row.total_attendees),
    },
  ])
);

// 4. Use in template (instant lookup)
{events.map(event => {
  const stats = bookingStats.get(event.id);
  return (
    <td>
      {stats ? `${stats.totalBookings} bookings` : 'No bookings'}
    </td>
  );
})}
```

**Performance Comparison**:
```
N+1 Approach:
- 51 queries × 50ms = 2,550ms total
- Page load: ~3 seconds

Aggregation Approach:
- 2 queries × 15ms = 30ms total
- Page load: ~100ms

Speed Improvement: 85× faster!
```

### Understanding SQL Aggregation

**GROUP BY Explanation**:
```sql
-- Original data
bookings table:
┌──────────┬───────────┬───────────┐
│ event_id │ attendees │ status    │
├──────────┼───────────┼───────────┤
│ 1        │ 2         │ confirmed │
│ 1        │ 3         │ confirmed │
│ 2        │ 1         │ confirmed │
│ 1        │ 2         │ pending   │
└──────────┴───────────┴───────────┘

-- After GROUP BY event_id
Result:
┌──────────┬────────────────┬─────────────────┐
│ event_id │ total_bookings │ total_attendees │
├──────────┼────────────────┼─────────────────┤
│ 1        │ 2              │ 5               │
│ 2        │ 1              │ 1               │
└──────────┴────────────────┴─────────────────┘
```

**Aggregation Functions**:
- **COUNT(*)**: Number of rows (bookings)
- **SUM(attendees)**: Total of all attendee values
- **AVG(price)**: Average value
- **MAX(date)**: Latest date
- **MIN(date)**: Earliest date

**Filtering Before Aggregation**:
```sql
SELECT event_id, COUNT(*) as total_bookings
FROM bookings
WHERE status = 'confirmed'  -- Filter BEFORE grouping
GROUP BY event_id
HAVING COUNT(*) > 5  -- Filter AFTER grouping
```

### Map Data Structure for Lookups

**Why Maps Over Arrays**:
```typescript
// ❌ Array search: O(n) time
const bookingsArray = [
  { event_id: '1', total: 10 },
  { event_id: '2', total: 5 },
  // ... 50 more items
];

const event1Stats = bookingsArray.find(b => b.event_id === '1');
// Searches through array until found (slow for large datasets)

// ✅ Map lookup: O(1) time
const bookingsMap = new Map([
  ['1', { total: 10 }],
  ['2', { total: 5 }],
]);

const event1Stats = bookingsMap.get('1');
// Instant lookup using hash table (fast regardless of size)
```

**Performance**:
```
50 events × 10 lookups per event = 500 lookups

Array approach:
- Average 25 iterations per lookup
- 500 × 25 = 12,500 operations

Map approach:
- 1 operation per lookup
- 500 × 1 = 500 operations

Speed improvement: 25× faster
```

---

## 4. Visual Indicators & Progress Bars {#visual-indicators}

### Color System Design

**Establishing a Color Palette**:
```typescript
// Capacity status colors
const CAPACITY_COLORS = {
  high: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    bar: 'bg-red-500',
    border: 'border-red-200',
  },
  medium: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    bar: 'bg-yellow-500',
    border: 'border-yellow-200',
  },
  low: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    bar: 'bg-green-500',
    border: 'border-green-200',
  },
};

// Status badge colors
const STATUS_COLORS = {
  published: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
};
```

**Benefits**:
- Consistent colors across interface
- Easy to update globally
- Self-documenting code

### Progress Bar Variants

**1. Basic Progress Bar**:
```astro
<div class="w-full bg-gray-200 rounded-full h-2">
  <div 
    class="h-2 rounded-full bg-blue-500"
    style={`width: ${percentage}%`}
  ></div>
</div>
```

**2. Progress Bar with Label**:
```astro
<div class="space-y-1">
  <div class="flex justify-between text-sm">
    <span class="font-medium">Capacity</span>
    <span class="text-gray-600">{percentage}%</span>
  </div>
  <div class="w-full bg-gray-200 rounded-full h-2">
    <div 
      class="h-2 rounded-full bg-blue-500"
      style={`width: ${percentage}%`}
    ></div>
  </div>
</div>
```

**3. Multi-Segment Progress Bar**:
```astro
<div class="w-full bg-gray-200 rounded-full h-2 flex">
  <!-- Confirmed bookings -->
  <div 
    class="h-2 rounded-l-full bg-green-500"
    style={`width: ${confirmedPercentage}%`}
  ></div>
  <!-- Pending bookings -->
  <div 
    class="h-2 bg-yellow-500"
    style={`width: ${pendingPercentage}%`}
  ></div>
  <!-- Available spots -->
  <div 
    class="h-2 rounded-r-full bg-gray-200"
    style={`width: ${availablePercentage}%`}
  ></div>
</div>
```

**4. Animated Progress Bar**:
```astro
<div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
  <div 
    class="h-2 rounded-full bg-blue-500 transition-all duration-500 ease-out"
    style={`width: ${percentage}%`}
  ></div>
</div>
```

### Status Badges

**Badge Component Pattern**:
```astro
{
  const getBadgeClass = (status: string): string => {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    
    switch (status) {
      case 'published':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'draft':
        return `${baseClass} bg-gray-100 text-gray-800`;
      case 'archived':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };
}

<span class={getBadgeClass(event.status)}>
  {event.status.toUpperCase()}
</span>
```

**Badge with Icon**:
```astro
<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
  <!-- Checkmark icon -->
  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
  </svg>
  Published
</span>
```

### Icon System

**SVG Icons (Heroicons)**:
```astro
<!-- Calendar icon -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
</svg>

<!-- Warning icon -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
</svg>

<!-- Checkmark icon -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
</svg>
```

**Icon Button Pattern**:
```astro
<a 
  href={`/admin/events/${event.id}/edit`}
  class="text-gray-400 hover:text-gray-600 transition-colors"
  title="Edit event"
>
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
</a>
```

---

## 5. Filtering & Search {#filtering}

### Filter Form Structure

**Basic Filter Form**:
```astro
<form method="get" class="bg-white p-6 rounded-lg shadow-sm border">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Text filter -->
    <div>
      <label for="city" class="block text-sm font-medium text-gray-700 mb-1">
        City
      </label>
      <input
        type="text"
        id="city"
        name="city"
        value={city}
        placeholder="Filter by city"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
      />
    </div>
    
    <!-- Select filter -->
    <div>
      <label for="status" class="block text-sm font-medium text-gray-700 mb-1">
        Status
      </label>
      <select
        id="status"
        name="status"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
      >
        <option value="">All Events</option>
        <option value="published" selected={status === 'published'}>Published</option>
        <option value="draft" selected={status === 'draft'}>Draft</option>
      </select>
    </div>
    
    <!-- Action buttons -->
    <div class="flex items-end gap-2">
      <button 
        type="submit"
        class="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
      >
        Apply Filters
      </button>
      <a 
        href="/admin/events"
        class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
      >
        Clear
      </a>
    </div>
  </div>
</form>
```

**Why GET Method?**:
```astro
<!-- ✅ GET method - URL contains filters -->
<form method="get">
  <!-- Results in: /admin/events?city=SF&status=published -->
</form>

<!-- ❌ POST method - Filters lost on refresh -->
<form method="post">
  <!-- Results in: /admin/events (no filters in URL) -->
</form>
```

**Benefits of GET**:
- Bookmarkable URLs
- Shareable links
- Browser back/forward works
- No CSRF concerns (read-only)

### Server-Side Filter Processing

**Reading Query Parameters**:
```typescript
// src/pages/admin/events/index.astro
---
const city = Astro.url.searchParams.get('city') || '';
const country = Astro.url.searchParams.get('country') || '';
const status = Astro.url.searchParams.get('status') || '';
---
```

**Building Filter Object**:
```typescript
const filterOptions: any = {};

// Only add filter if value exists
if (city) {
  filterOptions.city = city;
}

if (country) {
  filterOptions.country = country;
}

// Map status to boolean
if (status === 'published') {
  filterOptions.isPublished = true;
} else if (status === 'draft') {
  filterOptions.isPublished = false;
}
// If status is '' or 'all', don't add filter (show all)

const events = await getEvents(filterOptions);
```

**Database Query Implementation**:
```typescript
// src/lib/events.ts
export async function getEvents(filters: EventFilters = {}): Promise<Event[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  
  // Build WHERE clause dynamically
  if (filters.city) {
    conditions.push(`venue_city ILIKE $${params.length + 1}`);
    params.push(`%${filters.city}%`); // Case-insensitive partial match
  }
  
  if (filters.country) {
    conditions.push(`venue_country ILIKE $${params.length + 1}`);
    params.push(`%${filters.country}%`);
  }
  
  if (filters.isPublished !== undefined) {
    conditions.push(`is_published = $${params.length + 1}`);
    params.push(filters.isPublished);
  }
  
  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';
  
  const result = await query(
    `SELECT * FROM events ${whereClause} ORDER BY event_date DESC`,
    params
  );
  
  return result.rows;
}
```

**SQL Injection Prevention**:
```typescript
// ❌ DANGEROUS - SQL injection vulnerability
const query = `SELECT * FROM events WHERE city = '${city}'`;
// Attacker input: "'; DROP TABLE events; --"
// Results in: SELECT * FROM events WHERE city = ''; DROP TABLE events; --'

// ✅ SAFE - Parameterized query
const query = `SELECT * FROM events WHERE city = $1`;
const params = [city];
// Attacker input treated as literal string, not SQL code
```

### Advanced Filter Patterns

**Date Range Filter**:
```astro
<div class="grid grid-cols-2 gap-4">
  <div>
    <label>Start Date</label>
    <input 
      type="date" 
      name="startDate" 
      value={startDate}
      class="w-full px-3 py-2 border rounded"
    />
  </div>
  <div>
    <label>End Date</label>
    <input 
      type="date" 
      name="endDate" 
      value={endDate}
      class="w-full px-3 py-2 border rounded"
    />
  </div>
</div>
```

**Multi-Select Filter**:
```astro
<div>
  <label>Categories</label>
  <select name="categories" multiple size="5" class="w-full px-3 py-2 border rounded">
    <option value="workshop">Workshop</option>
    <option value="conference">Conference</option>
    <option value="meetup">Meetup</option>
  </select>
</div>
```

**Search Input with Icon**:
```astro
<div class="relative">
  <input
    type="text"
    name="search"
    placeholder="Search events..."
    class="w-full pl-10 pr-3 py-2 border rounded"
  />
  <svg 
    class="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
</div>
```

---

## 6. Summary Statistics Dashboard {#summary-statistics}

### Statistics Card Component

**Card Structure**:
```astro
<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
  <!-- Total Events -->
  <div class="bg-white p-6 rounded-lg shadow-sm border">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-600">Total Events</p>
        <p class="text-3xl font-bold text-gray-900">{events.length}</p>
      </div>
      <div class="bg-purple-100 p-3 rounded-lg">
        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
  </div>
  
  <!-- Published Events -->
  <div class="bg-white p-6 rounded-lg shadow-sm border">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-gray-600">Published</p>
        <p class="text-3xl font-bold text-gray-900">
          {events.filter(e => e.is_published).length}
        </p>
      </div>
      <div class="bg-green-100 p-3 rounded-lg">
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>
  </div>
  
  <!-- More cards... -->
</div>
```

### Calculating Statistics

**Filtering Arrays**:
```typescript
// Total published
const publishedCount = events.filter(event => event.is_published).length;

// Upcoming events (not past)
const upcomingCount = events.filter(event => {
  return new Date(event.event_date) > new Date();
}).length;

// Nearly full events (≥90% capacity)
const nearlyFullCount = events.filter(event => {
  const filled = event.capacity - event.available_spots;
  const percentage = (filled / event.capacity) * 100;
  return percentage >= 90;
}).length;

// Events with bookings
const eventsWithBookings = events.filter(event => {
  const stats = bookingStats.get(event.id);
  return stats && stats.totalBookings > 0;
}).length;
```

**Aggregating Values**:
```typescript
// Total revenue
const totalRevenue = events.reduce((sum, event) => {
  const stats = bookingStats.get(event.id);
  if (stats) {
    return sum + (parseFloat(event.price) * stats.totalBookings);
  }
  return sum;
}, 0);

// Average capacity utilization
const avgCapacity = events.reduce((sum, event) => {
  const filled = event.capacity - event.available_spots;
  return sum + ((filled / event.capacity) * 100);
}, 0) / events.length;
```

### Trend Indicators

**Percentage Change**:
```typescript
const lastMonthEvents = await getEvents({
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
});

const thisMonthCount = events.length;
const lastMonthCount = lastMonthEvents.length;
const percentChange = ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100;
```

**Trend Display**:
```astro
<div class="flex items-center gap-2 mt-2">
  {percentChange > 0 ? (
    <>
      <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
      <span class="text-sm text-green-600">
        +{percentChange.toFixed(1)}% from last month
      </span>
    </>
  ) : (
    <>
      <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      <span class="text-sm text-red-600">
        {percentChange.toFixed(1)}% from last month
      </span>
    </>
  )}
</div>
```

---

## 7. Action Buttons & Navigation {#action-buttons}

### Icon Button Patterns

**Basic Icon Button**:
```astro
<a 
  href={`/admin/events/${event.id}/edit`}
  class="text-gray-400 hover:text-gray-600 transition-colors"
  title="Edit event"
>
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
</a>
```

**Button Group**:
```astro
<td class="px-6 py-4">
  <div class="flex items-center gap-3">
    <!-- Edit -->
    <a 
      href={`/admin/events/${event.id}/edit`}
      class="text-gray-400 hover:text-indigo-600"
      title="Edit event"
    >
      <svg class="w-5 h-5">...</svg>
    </a>
    
    <!-- View -->
    <a 
      href={`/events/${event.slug}`}
      target="_blank"
      class="text-gray-400 hover:text-green-600"
      title="View event page"
    >
      <svg class="w-5 h-5">...</svg>
    </a>
    
    <!-- Bookings (conditional) -->
    {bookingStats.get(event.id)?.totalBookings > 0 && (
      <a 
        href={`/admin/events/${event.id}/bookings`}
        class="text-gray-400 hover:text-purple-600"
        title="View bookings"
      >
        <svg class="w-5 h-5">...</svg>
      </a>
    )}
  </div>
</td>
```

### Dropdown Menu (Advanced)

**Dropdown Button**:
```astro
<div class="relative" x-data="{ open: false }">
  <button 
    @click="open = !open"
    class="text-gray-400 hover:text-gray-600"
  >
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  </button>
  
  <div 
    x-show="open" 
    @click.away="open = false"
    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
  >
    <a href={`/admin/events/${event.id}/edit`} class="block px-4 py-2 hover:bg-gray-100">
      Edit
    </a>
    <a href={`/admin/events/${event.id}/duplicate`} class="block px-4 py-2 hover:bg-gray-100">
      Duplicate
    </a>
    <button class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">
      Delete
    </button>
  </div>
</div>
```

### Conditional Rendering

**Show/Hide Based on State**:
```astro
<!-- Only show bookings link if bookings exist -->
{bookingStats.get(event.id)?.totalBookings > 0 && (
  <a href={`/admin/events/${event.id}/bookings`}>
    View Bookings ({bookingStats.get(event.id)?.totalBookings})
  </a>
)}

<!-- Only show edit for draft events -->
{!event.is_published && (
  <a href={`/admin/events/${event.id}/edit`}>
    Edit Draft
  </a>
)}

<!-- Show different action for past events -->
{isPastEvent(event.event_date) ? (
  <a href={`/admin/events/${event.id}/archive`}>
    Archive Event
  </a>
) : (
  <a href={`/admin/events/${event.id}/edit`}>
    Edit Event
  </a>
)}
```

---

## 8. Responsive Admin Layouts {#responsive-layouts}

### Mobile-First Grid System

**Responsive Grid**:
```astro
<!-- 1 column on mobile, 2 on tablet, 4 on desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {stats.map(stat => (
    <div class="bg-white p-6 rounded-lg">
      {/* Stat card */}
    </div>
  ))}
</div>
```

**Breakpoints**:
- `sm:` - 640px (small tablets)
- `md:` - 768px (tablets)
- `lg:` - 1024px (desktops)
- `xl:` - 1280px (large desktops)
- `2xl:` - 1536px (extra large)

### Responsive Tables

**Horizontal Scroll on Mobile**:
```astro
<div class="overflow-x-auto">
  <table class="min-w-full divide-y divide-gray-300">
    <thead>
      <tr>
        <th class="px-6 py-3">Event</th>
        <th class="px-6 py-3">Date</th>
        {/* More columns */}
      </tr>
    </thead>
    <tbody>
      {/* Rows */}
    </tbody>
  </table>
</div>
```

**Card View on Mobile (Alternative)**:
```astro
<!-- Desktop: Table -->
<div class="hidden md:block overflow-x-auto">
  <table class="min-w-full">
    {/* Table content */}
  </table>
</div>

<!-- Mobile: Cards -->
<div class="md:hidden space-y-4">
  {events.map(event => (
    <div class="bg-white p-4 rounded-lg shadow-sm border">
      <h3 class="font-semibold text-lg">{event.title}</h3>
      <p class="text-sm text-gray-600">{formatDate(event.event_date)}</p>
      <div class="mt-2 flex justify-between">
        <span>{event.venue_city}</span>
        <span>{getCapacityPercentage(event)}% Full</span>
      </div>
      <div class="mt-4 flex gap-2">
        <a href={`/admin/events/${event.id}/edit`} class="btn-sm">Edit</a>
        <a href={`/events/${event.slug}`} class="btn-sm">View</a>
      </div>
    </div>
  ))}
</div>
```

### Responsive Navigation

**Mobile Menu Button**:
```astro
<div class="md:hidden">
  <button 
    @click="mobileMenuOpen = !mobileMenuOpen"
    class="text-gray-600 hover:text-gray-900"
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
</div>
```

---

## 9. Performance Optimization {#performance}

### Server-Side Rendering Benefits

**Astro SSR Advantages**:
```astro
---
// This runs on the server ONCE per request
const events = await getEvents();
const stats = await getStats();
---

<!-- HTML is sent to browser already rendered -->
<html>
  <body>
    <!-- No loading spinners needed -->
    <h1>Events: {events.length}</h1>
  </body>
</html>
```

**Comparison**:
```
Traditional SPA (React/Vue):
1. Browser downloads JavaScript bundle (500KB)
2. JavaScript executes, makes API call
3. Waits for response (200ms)
4. Renders UI
Total: ~1 second

Astro SSR:
1. Server fetches data and renders HTML
2. Browser receives complete HTML
Total: ~200ms
```

### Database Query Optimization

**Use Indexes**:
```sql
-- Add index for common filters
CREATE INDEX idx_events_city ON events(venue_city);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_bookings_event ON bookings(event_id);

-- Query speed improvement
Before: 150ms
After: 15ms (10× faster)
```

**Limit Data Selection**:
```sql
-- ❌ Fetches all columns (slow)
SELECT * FROM events;

-- ✅ Only fetches needed columns (fast)
SELECT id, title, event_date, capacity, available_spots 
FROM events;
```

**Pagination for Large Datasets**:
```typescript
const PAGE_SIZE = 50;
const page = parseInt(Astro.url.searchParams.get('page') || '1');
const offset = (page - 1) * PAGE_SIZE;

const events = await query(`
  SELECT * FROM events
  ORDER BY event_date DESC
  LIMIT ${PAGE_SIZE}
  OFFSET ${offset}
`);
```

### Caching Strategies

**Static Page Generation** (for rarely-changing data):
```astro
---
// src/pages/admin/stats.astro
export const prerender = true; // Generate at build time

const stats = await getYearlyStats();
---
```

**Time-Based Cache** (for frequently-changing data):
```typescript
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedEvents: Event[] | null = null;
let cacheTimestamp = 0;

export async function getEventsCached(): Promise<Event[]> {
  const now = Date.now();
  
  if (cachedEvents && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedEvents; // Return cached data
  }
  
  cachedEvents = await getEvents();
  cacheTimestamp = now;
  return cachedEvents;
}
```

---

## 10. Best Practices {#best-practices}

### Code Organization

**Separate Concerns**:
```
src/
├── pages/
│   └── admin/
│       └── events/
│           ├── index.astro          # List page
│           ├── [id]/
│           │   ├── edit.astro       # Edit form
│           │   └── bookings.astro   # Bookings list
│           └── new.astro            # Create form
├── lib/
│   └── events.ts                     # Business logic
└── components/
    └── admin/
        ├── EventsTable.astro         # Reusable table
        ├── CapacityIndicator.astro   # Reusable indicator
        └── StatCard.astro            # Reusable card
```

**Extract Helper Functions**:
```typescript
// src/lib/admin-helpers.ts
export function formatCurrency(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numPrice);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getCapacityPercentage(event: Event): number {
  return Math.round(((event.capacity - event.available_spots) / event.capacity) * 100);
}

export function getCapacityColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-600 bg-red-50';
  if (percentage >= 70) return 'text-yellow-600 bg-yellow-50';
  return 'text-green-600 bg-green-50';
}
```

### Accessibility Guidelines

**Semantic HTML**:
```astro
<!-- ✅ Good: Semantic structure -->
<table>
  <caption>Event Management</caption>
  <thead>
    <tr>
      <th scope="col">Event</th>
      <th scope="col">Date</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Workshop</td>
      <td>2024-12-15</td>
    </tr>
  </tbody>
</table>

<!-- ❌ Bad: Divs everywhere -->
<div class="table">
  <div class="row">
    <div class="cell">Event</div>
  </div>
</div>
```

**ARIA Labels**:
```astro
<button 
  aria-label="Delete event"
  title="Delete event"
>
  <svg>trash icon</svg>
</button>

<input
  type="search"
  aria-label="Search events"
  placeholder="Search..."
/>
```

**Keyboard Navigation**:
```astro
<!-- Ensure all interactive elements are keyboard accessible -->
<a 
  href="/admin/events/1/edit"
  class="focus:ring-2 focus:ring-purple-500 focus:outline-none"
>
  Edit
</a>

<button
  class="focus:ring-2 focus:ring-purple-500 focus:outline-none"
  tabindex="0"
>
  Apply Filters
</button>
```

### Error Handling

**Try-Catch Blocks**:
```typescript
---
let events: Event[] = [];
let error: string | null = null;

try {
  events = await getEvents(filterOptions);
} catch (e) {
  error = 'Failed to load events. Please try again.';
  console.error('Error fetching events:', e);
}
---

{error ? (
  <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
    {error}
  </div>
) : (
  <!-- Show events -->
)}
```

**Empty States**:
```astro
{events.length === 0 ? (
  <div class="text-center py-12">
    <svg class="mx-auto h-12 w-12 text-gray-400">
      {/* Calendar icon */}
    </svg>
    <h3 class="mt-2 text-sm font-medium text-gray-900">No events found</h3>
    <p class="mt-1 text-sm text-gray-500">
      Get started by creating a new event.
    </p>
    <div class="mt-6">
      <a 
        href="/admin/events/new"
        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
      >
        Add New Event
      </a>
    </div>
  </div>
) : (
  <!-- Show events table -->
)}
```

### Security Considerations

**Input Sanitization**:
```typescript
// Always sanitize user input
const city = Astro.url.searchParams.get('city')?.trim() || '';
const country = Astro.url.searchParams.get('country')?.trim() || '';

// Use parameterized queries
const result = await query(
  'SELECT * FROM events WHERE city = $1',
  [city] // Never interpolate user input directly
);
```

**Authentication Check**:
```typescript
---
// Check if user is admin
const user = Astro.locals.user;

if (!user || user.role !== 'admin') {
  return Astro.redirect('/login');
}
---
```

---

## Summary

### Key Takeaways

1. **Capacity Tracking**:
   - Use multi-indicator system (number + bar + badge)
   - Color-code by threshold (green/yellow/red)
   - Calculate percentage accurately

2. **Data Aggregation**:
   - Avoid N+1 queries
   - Use SQL GROUP BY for efficiency
   - Store results in Map for O(1) lookup

3. **Visual Design**:
   - Consistent color system
   - Progress bars for quick scanning
   - Icons for visual hierarchy
   - Status badges for clarity

4. **Filtering**:
   - Use GET method for bookmarkable URLs
   - Build dynamic WHERE clauses
   - Use parameterized queries (security)

5. **Performance**:
   - Server-side rendering (Astro)
   - Database indexes
   - Efficient queries (2 total, not 50+)
   - Consider caching for static data

6. **Best Practices**:
   - Separate concerns (pages/lib/components)
   - Extract helper functions
   - Handle errors gracefully
   - Ensure accessibility
   - Secure user input

### Next Steps

**Practice Building**:
1. Create an admin page for courses with enrollment tracking
2. Add sorting to the events table
3. Implement bulk actions (publish/delete multiple)
4. Build a statistics dashboard with charts
5. Add export to CSV functionality

**Further Learning**:
- Learn about WebSockets for real-time updates
- Study data visualization libraries (Chart.js, D3)
- Explore advanced SQL optimization
- Practice responsive design patterns
- Master Tailwind advanced features

---

## Related Resources

- **T066**: Admin Courses List (similar patterns)
- **T069**: Admin Layout (authentication, navigation)
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Astro Docs**: https://docs.astro.build
- **SQL Performance**: Database indexing and optimization
- **Accessibility**: WCAG 2.1 guidelines

---

**Remember**: Admin interfaces prioritize functionality and information density over visual appeal. Focus on helping users complete tasks quickly and efficiently with clear visual feedback.
