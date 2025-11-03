# T110: Event Date & Location Filters - Learning Guide

**Tutorial Focus**: Advanced filtering patterns for time-based data with location, price, and availability filters
**Difficulty**: Intermediate
**Prerequisites**: T079 (Basic Events Page), T109 (Course Filters)
**Completion**: November 2, 2025

## Overview

This guide teaches you how to implement sophisticated filtering systems for time-sensitive data. You'll learn:
- Time-based filtering with presets (upcoming, this week, this month)
- Custom date range selection with validation
- Capacity-based availability calculations
- Location hierarchies (country + city)
- Instant filtering for better UX
- Filter state management with URL parameters

Unlike T109's simpler filters, T110 requires dynamic date calculations, capacity percentages, and conditional UI display. These patterns are essential for any event, booking, or scheduling system.

---

## 1. Time-Based Filtering Patterns

### 1.1 Preset Time Frames

**Concept**: Provide common time filters as radio buttons for quick access.

**Options**:
- `all` - No time restriction
- `upcoming` - Future events only
- `this-week` - Next 7 days
- `this-month` - Rest of current month
- `custom` - User-defined date range

**Implementation** (EventFilters.astro):
```astro
<div class="mb-4">
  <label class="block text-sm font-medium text-gray-700 mb-2">
    Time Frame
  </label>
  <div class="space-y-2">
    <label class="flex items-center">
      <input
        type="radio"
        name="timeFrame"
        value="all"
        checked={currentTimeFrame === 'all'}
        class="text-blue-600 focus:ring-blue-500"
      />
      <span class="ml-2">All Events</span>
    </label>
    
    <label class="flex items-center">
      <input
        type="radio"
        name="timeFrame"
        value="upcoming"
        checked={currentTimeFrame === 'upcoming'}
      />
      <span class="ml-2">Upcoming Events</span>
    </label>
    
    <label class="flex items-center">
      <input
        type="radio"
        name="timeFrame"
        value="this-week"
        checked={currentTimeFrame === 'this-week'}
      />
      <span class="ml-2">This Week</span>
    </label>
    
    <label class="flex items-center">
      <input
        type="radio"
        name="timeFrame"
        value="this-month"
        checked={currentTimeFrame === 'this-month'}
      />
      <span class="ml-2">This Month</span>
    </label>
    
    <label class="flex items-center">
      <input
        type="radio"
        name="timeFrame"
        value="custom"
        checked={currentTimeFrame === 'custom'}
      />
      <span class="ml-2">Custom Range</span>
    </label>
  </div>
</div>
```

**Why Radio Buttons?**
- ✅ Only one time frame active at once
- ✅ Clear visual indication of selection
- ✅ Can trigger auto-submit on change
- ✅ Accessible (keyboard navigable)

### 1.2 Date Calculations in Service Layer

**Upcoming Events** (events.ts):
```typescript
if (filters.timeFrame === 'upcoming') {
  const now = new Date();
  queryText += ` AND event_date >= $${paramIndex}`;
  params.push(now);
  paramIndex++;
}
```

**Key Points**:
- Use `new Date()` for current timestamp
- Compare `event_date` field (PostgreSQL TIMESTAMP)
- Parameterized query prevents SQL injection
- `>=` includes events starting right now

**This Week** (next 7 days):
```typescript
if (filters.timeFrame === 'this-week') {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  
  queryText += ` AND event_date >= $${paramIndex} AND event_date <= $${paramIndex + 1}`;
  params.push(now, weekEnd);
  paramIndex += 2;
}
```

**Key Points**:
- `.setDate()` modifies date in place
- Automatically handles month boundaries (e.g., Jan 30 + 7 = Feb 6)
- Use two parameters for date range
- Increment `paramIndex` by 2

**This Month** (rest of current month):
```typescript
if (filters.timeFrame === 'this-month') {
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  queryText += ` AND event_date >= $${paramIndex} AND event_date <= $${paramIndex + 1}`;
  params.push(now, monthEnd);
  paramIndex += 2;
}
```

**Key Points**:
- `new Date(year, month + 1, 0)` gets last day of current month
- Day `0` means "last day of previous month"
- Example: `new Date(2025, 11, 0)` = Nov 30, 2025 (month 11-1=10, which is November)
- Handles varying month lengths automatically

**Why Not Milliseconds?**
```typescript
// ❌ DON'T DO THIS (harder to read)
const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

// ✅ DO THIS (clearer intent)
const weekEnd = new Date(now);
weekEnd.setDate(now.getDate() + 7);
```

### 1.3 Custom Date Range

**Component** (EventFilters.astro):
```astro
<div 
  id="customDateRange" 
  class={currentTimeFrame === 'custom' ? '' : 'hidden'}
>
  <div class="mb-3">
    <label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">
      From
    </label>
    <input
      type="date"
      id="startDate"
      name="startDate"
      value={currentStartDate}
      class="w-full px-3 py-2 border border-gray-300 rounded-md"
    />
  </div>
  
  <div class="mb-3">
    <label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">
      To
    </label>
    <input
      type="date"
      id="endDate"
      name="endDate"
      value={currentEndDate}
      class="w-full px-3 py-2 border border-gray-300 rounded-md"
    />
  </div>
</div>
```

**Service Layer** (events.ts):
```typescript
// Custom date range (when timeFrame === 'custom')
if (filters?.startDate) {
  queryText += ` AND event_date >= $${paramIndex}`;
  params.push(filters.startDate);
  paramIndex++;
}
if (filters?.endDate) {
  queryText += ` AND event_date <= $${paramIndex}`;
  params.push(filters.endDate);
  paramIndex++;
}
```

**Page Layer** (events/index.astro):
```typescript
const startDate = url.searchParams.get('startDate') || '';
const endDate = url.searchParams.get('endDate') || '';

const filters: EventFiltersType = {
  // ... other filters
  startDate: startDate ? new Date(startDate) : undefined,
  endDate: endDate ? new Date(endDate) : undefined,
};
```

**Key Points**:
- HTML5 `type="date"` provides native date picker
- Value format: `YYYY-MM-DD` (ISO 8601)
- Convert string to Date object before database query
- Both dates optional (can filter by start only, end only, or both)

**Date Range Validation** (JavaScript in EventFilters.astro):
```javascript
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');

function validateDateRange() {
  const start = startDateInput.value;
  const end = endDateInput.value;
  
  if (start && end) {
    if (new Date(end) < new Date(start)) {
      endDateInput.setCustomValidity('End date must be after start date');
    } else {
      endDateInput.setCustomValidity('');
    }
  }
}

startDateInput?.addEventListener('change', validateDateRange);
endDateInput?.addEventListener('change', validateDateRange);
```

---

## 2. Capacity-Based Availability Filtering

### 2.1 Understanding the Problem

**Scenario**: An event has:
- `capacity`: 100 (total spots)
- `available_spots`: 15 (remaining spots)
- **Percentage available**: 15%

**Filter Options**:
- `all` - Show all events
- `available` - Has at least 1 spot remaining
- `limited` - Less than 20% capacity remaining

### 2.2 Implementation

**Database Schema**:
```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  capacity INTEGER NOT NULL,
  available_spots INTEGER NOT NULL,
  -- ... other fields
);
```

**Service Layer** (events.ts):
```typescript
if (filters.availability === 'available') {
  // Simple: any spots remaining
  queryText += ` AND available_spots > 0`;
}

if (filters.availability === 'limited') {
  // Complex: less than 20% capacity remaining
  queryText += ` AND available_spots > 0 AND (CAST(available_spots AS FLOAT) / CAST(capacity AS FLOAT)) < 0.2`;
}
```

**Why CAST to FLOAT?**
```sql
-- ❌ INTEGER DIVISION (WRONG)
SELECT 15 / 100;  -- Result: 0 (integers divide to integer)

-- ✅ FLOAT DIVISION (CORRECT)
SELECT CAST(15 AS FLOAT) / CAST(100 AS FLOAT);  -- Result: 0.15
```

**PostgreSQL Division Rules**:
- `INTEGER / INTEGER` → `INTEGER` (truncates decimals)
- `FLOAT / FLOAT` → `FLOAT` (preserves decimals)
- Must cast **both** operands to FLOAT

**Alternative Approaches**:
```sql
-- Multiply first (avoids division, but can overflow)
WHERE available_spots * 100 < capacity * 20

-- Use numeric type
WHERE CAST(available_spots AS NUMERIC) / CAST(capacity AS NUMERIC) < 0.2

-- PostgreSQL shorthand
WHERE available_spots::FLOAT / capacity::FLOAT < 0.2
```

**Threshold Explanation**:
- `< 0.2` means less than 20%
- `0.2` is the decimal form of 20%
- 15 spots / 100 capacity = 0.15 (15%) → qualifies as "limited"
- 25 spots / 100 capacity = 0.25 (25%) → does NOT qualify

### 2.3 Component UI

```astro
<div class="mb-4">
  <label class="block text-sm font-medium text-gray-700 mb-2">
    Availability
  </label>
  <div class="space-y-2">
    <label class="flex items-center">
      <input
        type="radio"
        name="availability"
        value="all"
        checked={currentAvailability === 'all'}
        class="text-blue-600"
      />
      <span class="ml-2">All Events</span>
    </label>
    
    <label class="flex items-center">
      <input
        type="radio"
        name="availability"
        value="available"
        checked={currentAvailability === 'available'}
      />
      <span class="ml-2">Available Spots</span>
    </label>
    
    <label class="flex items-center">
      <input
        type="radio"
        name="availability"
        value="limited"
        checked={currentAvailability === 'limited'}
      />
      <span class="ml-2">Limited Availability</span>
    </label>
  </div>
</div>
```

**UX Considerations**:
- "Available Spots" = Any spots remaining (inclusive, shows more)
- "Limited Availability" = Almost sold out (exclusive, shows fewer)
- Default to "all" (most permissive, shows everything)

---

## 3. Conditional UI Display

### 3.1 Show/Hide Custom Date Range

**Problem**: Show date inputs only when "Custom Range" is selected.

**Tailwind Approach** (recommended):
```astro
<div 
  id="customDateRange" 
  class={currentTimeFrame === 'custom' ? '' : 'hidden'}
>
  <!-- Date inputs here -->
</div>
```

**JavaScript Toggle**:
```javascript
const customDateRange = document.getElementById('customDateRange');
const timeFrameRadios = document.querySelectorAll('input[name="timeFrame"]');

timeFrameRadios.forEach((radio) => {
  radio.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    
    if (target.value === 'custom') {
      customDateRange?.classList.remove('hidden');
    } else {
      customDateRange?.classList.add('hidden');
    }
  });
});
```

**Why `classList` over `style.display`?**

```javascript
// ❌ BAD: Inline styles override everything
element.style.display = 'none';  // Hard to debug, specificity issues

// ✅ GOOD: CSS class approach
element.classList.add('hidden');  // Tailwind class, consistent
```

**Benefits**:
- Tailwind's `hidden` class: `display: none !important`
- Works with Tailwind's responsive utilities
- Easier to debug (visible in DevTools classes)
- Consistent with rest of styling

### 3.2 Conditional Server-Side Rendering

**Initial State** (Astro component):
```astro
---
// Props determine initial visibility
const { currentTimeFrame } = Astro.props;
---

<div 
  id="customDateRange" 
  class={currentTimeFrame === 'custom' ? '' : 'hidden'}
>
  <!-- ... -->
</div>
```

**Why Both Server and Client?**
1. **Server-side**: Correct initial state (no flash of wrong UI)
2. **Client-side**: Responds to user interaction

**Example User Flow**:
1. Page loads with `timeFrame=upcoming` (server renders date range hidden)
2. User clicks "Custom Range" radio
3. JavaScript removes `hidden` class
4. Date inputs appear
5. User submits form
6. Page reloads with `timeFrame=custom` (server renders date range visible)

---

## 4. Location-Based Filtering

### 4.1 Hierarchical Location (Country + City)

**Data Model**:
```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  city VARCHAR(100),
  country VARCHAR(100),
  -- ... other fields
);
```

**Fetching Unique Values** (events/index.astro):
```typescript
// Get distinct cities (alphabetically)
const citiesQuery = await db.query(
  'SELECT DISTINCT city FROM events WHERE city IS NOT NULL AND is_published = TRUE ORDER BY city'
);
const cities = citiesQuery.rows.map((row) => row.city);

// Get distinct countries (alphabetically)
const countriesQuery = await db.query(
  'SELECT DISTINCT country FROM events WHERE country IS NOT NULL AND is_published = TRUE ORDER BY country'
);
const countries = countriesQuery.rows.map((row) => row.country);
```

**Why `DISTINCT`?**
- Removes duplicates (e.g., multiple events in "New York")
- `ORDER BY` provides alphabetical sorting
- `IS NOT NULL` filters out events without location

**Component Rendering** (EventFilters.astro):
```astro
<div class="mb-4">
  <label for="country" class="block text-sm font-medium text-gray-700 mb-2">
    Country
  </label>
  <select
    id="country"
    name="country"
    class="w-full px-3 py-2 border border-gray-300 rounded-md"
  >
    <option value="">All Countries</option>
    {countries.map((country) => (
      <option value={country} selected={currentCountry === country}>
        {country}
      </option>
    ))}
  </select>
</div>

<div class="mb-4">
  <label for="city" class="block text-sm font-medium text-gray-700 mb-2">
    City
  </label>
  <select
    id="city"
    name="city"
    class="w-full px-3 py-2 border border-gray-300 rounded-md"
  >
    <option value="">All Cities</option>
    {cities.map((city) => (
      <option value={city} selected={currentCity === city}>
        {city}
      </option>
    ))}
  </select>
</div>
```

**Service Layer Filtering** (events.ts):
```typescript
if (filters?.city) {
  queryText += ` AND LOWER(city) = LOWER($${paramIndex})`;
  params.push(filters.city);
  paramIndex++;
}

if (filters?.country) {
  queryText += ` AND LOWER(country) = LOWER($${paramIndex})`;
  params.push(filters.country);
  paramIndex++;
}
```

**Why `LOWER()`?**
- Case-insensitive matching
- "New York" = "new york" = "NEW YORK"
- Prevents user input case issues

### 4.2 Dependent Dropdowns (Not Implemented)

**Current Approach**: Independent dropdowns
- Can select any city + any country (even if no matches)
- Simpler implementation, no JavaScript needed

**Alternative Approach**: City depends on country
```javascript
// Hypothetical dependent dropdown
countrySelect.addEventListener('change', async (e) => {
  const country = e.target.value;
  
  // Fetch cities for selected country
  const response = await fetch(`/api/cities?country=${country}`);
  const cities = await response.json();
  
  // Update city dropdown
  citySelect.innerHTML = '<option value="">All Cities</option>';
  cities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });
});
```

**Trade-offs**:
| Approach | Pros | Cons |
|----------|------|------|
| **Independent** | Simple, no JS, works without API | Can create zero-result filters |
| **Dependent** | Always valid combinations, better UX | Complex, requires API endpoint |

**When to Use Each**:
- **Independent**: Small dataset, SSR-focused, simplicity priority
- **Dependent**: Large dataset, complex hierarchies, API already exists

---

## 5. Instant Filtering Pattern

### 5.1 Auto-Submit on Change

**Traditional Approach**: User clicks "Apply Filters" button
```html
<form>
  <!-- filters -->
  <button type="submit">Apply Filters</button>
</form>
```

**Instant Filtering Approach**: Auto-submit on selection
```javascript
const form = document.querySelector('form');
const radioInputs = form.querySelectorAll('input[type="radio"]');
const selectInputs = form.querySelectorAll('select');

// Auto-submit when radio button changes
radioInputs.forEach((radio) => {
  radio.addEventListener('change', () => {
    form.submit();
  });
});

// Auto-submit when dropdown changes
selectInputs.forEach((select) => {
  select.addEventListener('change', () => {
    form.submit();
  });
});
```

**What Happens**:
1. User clicks radio button (e.g., "Upcoming Events")
2. `change` event fires
3. `form.submit()` executes
4. Page reloads with new filter parameter
5. Server fetches filtered results
6. Page renders with updated events

### 5.2 When to Auto-Submit vs Manual

**Auto-Submit** (radio, select, checkbox):
```javascript
// Good for: Instant feedback, single-click changes
radio.addEventListener('change', () => form.submit());
```

**Manual Submit** (text input, number input, date):
```javascript
// Good for: Multi-character input, requires typing
// Let user finish typing, click "Apply Filters"
<button type="submit">Apply Filters</button>
```

**T110 Implementation**:
- ✅ Auto-submit: Time frame (radio), Country (select), City (select), Availability (radio)
- ❌ No auto-submit: Date range (needs both dates), Price range (needs both values)

**Why Different?**
- Radio/select: Complete value in one click
- Text/number/date: Partial value during typing
- Auto-submitting mid-typing creates poor UX

### 5.3 Preserving Form State

**Problem**: After auto-submit, maintain filter values

**Solution**: Populate inputs from URL parameters
```astro
---
const city = url.searchParams.get('city') || '';
const country = url.searchParams.get('country') || '';
const timeFrame = url.searchParams.get('timeFrame') || 'all';
---

<select name="country">
  <option value="">All Countries</option>
  {countries.map((country) => (
    <option value={country} selected={currentCountry === country}>
      {country}
    </option>
  ))}
</select>
```

**Key Pattern**:
1. Extract parameter: `url.searchParams.get('city')`
2. Default value: `|| ''` (empty string if not set)
3. Pass to component: `currentCity={city}`
4. Set selected: `selected={currentCity === city}`

---

## 6. Price Range Filtering

### 6.1 Min/Max Input Pattern

**Component** (EventFilters.astro):
```astro
<div class="mb-4">
  <label class="block text-sm font-medium text-gray-700 mb-2">
    Price Range
  </label>
  
  <div class="flex gap-2">
    <div class="flex-1">
      <label for="minPrice" class="block text-xs text-gray-600 mb-1">
        Min Price
      </label>
      <div class="flex items-center">
        <span class="text-gray-500 mr-1">$</span>
        <input
          type="number"
          id="minPrice"
          name="minPrice"
          min="0"
          step="0.01"
          value={currentMinPrice}
          placeholder="0"
          class="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
    </div>
    
    <div class="flex-1">
      <label for="maxPrice" class="block text-xs text-gray-600 mb-1">
        Max Price
      </label>
      <div class="flex items-center">
        <span class="text-gray-500 mr-1">$</span>
        <input
          type="number"
          id="maxPrice"
          name="maxPrice"
          min="0"
          step="0.01"
          value={currentMaxPrice}
          placeholder="Any"
          class="w-full px-2 py-1 border border-gray-300 rounded"
        />
      </div>
    </div>
  </div>
</div>
```

**Key Attributes**:
- `type="number"` - Numeric keyboard on mobile, built-in validation
- `min="0"` - Prevents negative prices
- `step="0.01"` - Allows decimal prices ($19.99)
- `placeholder` - Shows expected input

### 6.2 Preventing Negative Values

**HTML Validation**:
```html
<input type="number" min="0" />
```

**JavaScript Validation** (belt and suspenders):
```javascript
const minPriceInput = document.getElementById('minPrice');
const maxPriceInput = document.getElementById('maxPrice');

[minPriceInput, maxPriceInput].forEach((input) => {
  input?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (parseFloat(target.value) < 0) {
      target.value = '0';
    }
  });
});
```

**Why Both?**
- HTML validation: First line of defense, works without JS
- JavaScript validation: Catches programmatic changes, better UX
- Browsers can disable HTML validation (dev tools)

### 6.3 Service Layer

```typescript
if (filters?.minPrice !== undefined) {
  queryText += ` AND price >= $${paramIndex}`;
  params.push(filters.minPrice);
  paramIndex++;
}

if (filters?.maxPrice !== undefined) {
  queryText += ` AND price <= $${paramIndex}`;
  params.push(filters.maxPrice);
  paramIndex++;
}
```

**Important**: Check `!== undefined` not `if (filters?.minPrice)`
- `0` is falsy, but valid price
- `undefined` means "not set"

**Page Layer Type Conversion**:
```typescript
const minPrice = url.searchParams.get('minPrice') || '';
const maxPrice = url.searchParams.get('maxPrice') || '';

const filters = {
  minPrice: minPrice ? parseFloat(minPrice) : undefined,
  maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
};
```

---

## 7. Filter State Management

### 7.1 URL-Based State

**Why URLs?**
- ✅ Shareable (send link to filtered view)
- ✅ Bookmarkable (save favorite filters)
- ✅ Back button works (browser history)
- ✅ No session/cookie needed
- ✅ SSR-friendly (server reads URL)

**URL Format**:
```
/events?city=Seattle&country=USA&timeFrame=upcoming&availability=available&page=2
```

**Building Filter URLs** (events/index.astro):
```typescript
function buildPageUrl(pageNum: number): string {
  const params = new URLSearchParams();
  params.set('page', pageNum.toString());
  
  // Preserve all active filters
  if (city) params.set('city', city);
  if (country) params.set('country', country);
  if (timeFrame !== 'all') params.set('timeFrame', timeFrame);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (availability !== 'all') params.set('availability', availability);
  
  return `/events?${params.toString()}`;
}
```

**Key Points**:
- Always preserve all filters when paginating
- Skip default values (don't add `timeFrame=all`)
- Use `URLSearchParams` for proper encoding

### 7.2 Active Filter Pills

**Displaying Active Filters**:
```astro
{city && (
  <span class="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
    <span>City: {city}</span>
    <a
      href={buildClearFilterUrl('city')}
      class="hover:text-blue-900"
      aria-label={`Clear city filter`}
    >
      ×
    </a>
  </span>
)}
```

**Individual Clear Function**:
```typescript
function buildClearFilterUrl(filterName: string): string {
  const params = new URLSearchParams();
  params.set('page', '1'); // Reset to first page
  
  // Add all filters EXCEPT the one being cleared
  if (filterName !== 'city' && city) params.set('city', city);
  if (filterName !== 'country' && country) params.set('country', country);
  if (filterName !== 'timeFrame' && timeFrame !== 'all') params.set('timeFrame', timeFrame);
  // ... etc
  
  return `/events?${params.toString()}`;
}
```

**Clear All Filters**:
```astro
<a 
  href="/events" 
  class="text-blue-600 hover:underline"
>
  Clear All Filters
</a>
```

### 7.3 Counting Active Filters

```typescript
const activeFilterCount = [
  city !== '',
  country !== '',
  timeFrame !== 'all',
  startDate !== '',
  endDate !== '',
  minPrice !== '',
  maxPrice !== '',
  availability !== 'all',
].filter(Boolean).length;
```

**Display**:
```astro
{activeFilterCount > 0 && (
  <span class="text-gray-600">
    ({activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied)
  </span>
)}
```

---

## 8. Reusing Filter Patterns

### 8.1 From T109 (Courses) to T110 (Events)

**What's Reusable**:
| Pattern | T109 | T110 | Notes |
|---------|------|------|-------|
| **Component structure** | ✅ | ✅ | Same form + sidebar approach |
| **URL state** | ✅ | ✅ | Same URLSearchParams pattern |
| **Auto-submit** | ✅ | ✅ | Same radio/select listeners |
| **Pagination** | ✅ | ✅ | Same buildPageUrl helper |
| **Active pills** | ✅ | ✅ | Same removal links |

**What's Different**:
| Aspect | T109 | T110 |
|--------|------|------|
| **Time filters** | None | Date calculations required |
| **Capacity logic** | None | Percentage calculations |
| **Conditional UI** | Static | Dynamic (show/hide date range) |
| **Filter count** | 6 filters | 8 filters |

### 8.2 Adaptation Checklist

When adapting filters to new content type:

**1. Data Model**
- [ ] Identify filterable fields
- [ ] Check field types (string, number, date, boolean)
- [ ] Determine if calculations needed (percentages, dates)

**2. Component Props**
- [ ] List current filter values (8-10 props typical)
- [ ] List option arrays (cities, categories, etc.)
- [ ] Determine conditional fields (like custom date range)

**3. Service Layer**
- [ ] Define EventFilters interface
- [ ] Implement SQL query building
- [ ] Add parameterized queries (security)
- [ ] Handle optional filters (`!== undefined`)

**4. Page Integration**
- [ ] Extract URL parameters (one per filter + page)
- [ ] Build filters object with type conversions
- [ ] Fetch dropdown options (if needed)
- [ ] Pass props to filter component

**5. UX Enhancements**
- [ ] Auto-submit appropriate inputs
- [ ] Add active filter pills
- [ ] Implement clear filter links
- [ ] Show filter count

### 8.3 Common Patterns Library

**Pattern 1: Optional Filter**
```typescript
if (filters?.fieldName !== undefined) {
  queryText += ` AND field_name = $${paramIndex}`;
  params.push(filters.fieldName);
  paramIndex++;
}
```

**Pattern 2: Case-Insensitive Search**
```typescript
if (filters?.city) {
  queryText += ` AND LOWER(city) = LOWER($${paramIndex})`;
  params.push(filters.city);
  paramIndex++;
}
```

**Pattern 3: Date Range**
```typescript
if (filters?.startDate) {
  queryText += ` AND date_field >= $${paramIndex}`;
  params.push(filters.startDate);
  paramIndex++;
}
if (filters?.endDate) {
  queryText += ` AND date_field <= $${paramIndex}`;
  params.push(filters.endDate);
  paramIndex++;
}
```

**Pattern 4: Percentage Calculation**
```typescript
if (filters?.threshold) {
  queryText += ` AND (CAST(numerator AS FLOAT) / CAST(denominator AS FLOAT)) < $${paramIndex}`;
  params.push(filters.threshold);
  paramIndex++;
}
```

---

## 9. Best Practices

### ✅ DO

1. **Use Parameterized Queries**
   ```typescript
   // ✅ Good
   queryText += ` AND price >= $${paramIndex}`;
   params.push(filters.minPrice);
   ```

2. **Check `!== undefined` for Optional Numbers**
   ```typescript
   // ✅ Good (0 is valid)
   if (filters?.minPrice !== undefined)
   ```

3. **Cast to FLOAT for Percentages**
   ```typescript
   // ✅ Good
   CAST(available_spots AS FLOAT) / CAST(capacity AS FLOAT)
   ```

4. **Use `.setDate()` for Date Arithmetic**
   ```typescript
   // ✅ Good (readable)
   const weekEnd = new Date(now);
   weekEnd.setDate(now.getDate() + 7);
   ```

5. **Auto-Submit Single-Click Filters**
   ```javascript
   // ✅ Good (radio, select)
   radio.addEventListener('change', () => form.submit());
   ```

6. **Preserve Filters in Pagination**
   ```typescript
   // ✅ Good
   if (city) params.set('city', city);
   ```

7. **Use Tailwind `hidden` Class**
   ```javascript
   // ✅ Good
   element.classList.add('hidden');
   ```

### ❌ DON'T

1. **String Concatenation in SQL**
   ```typescript
   // ❌ Bad (SQL injection risk)
   queryText += ` AND price >= ${filters.minPrice}`;
   ```

2. **Truthy Check for Numbers**
   ```typescript
   // ❌ Bad (0 is falsy but valid)
   if (filters?.minPrice)
   ```

3. **Integer Division for Percentages**
   ```typescript
   // ❌ Bad (always returns 0)
   available_spots / capacity < 0.2
   ```

4. **Millisecond Date Calculations**
   ```typescript
   // ❌ Bad (hard to read)
   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
   ```

5. **Auto-Submit Text Inputs**
   ```javascript
   // ❌ Bad (submits mid-typing)
   textInput.addEventListener('input', () => form.submit());
   ```

6. **Lose Filters During Pagination**
   ```typescript
   // ❌ Bad (filters disappear)
   return `/events?page=${pageNum}`;
   ```

7. **Inline Styles for Show/Hide**
   ```javascript
   // ❌ Bad (specificity issues)
   element.style.display = 'none';
   ```

---

## 10. Common Pitfalls

### Pitfall #1: Date Comparison Bugs

**Problem**: Comparing date objects incorrectly
```javascript
// ❌ Wrong (compares object references)
if (startDate > endDate)

// ✅ Correct (compares timestamps)
if (new Date(startDate) > new Date(endDate))
```

### Pitfall #2: Time Zone Issues

**Problem**: Dates don't match user expectations
```typescript
// ❌ Wrong (uses UTC)
new Date('2025-11-02')  // Might be Nov 1 in some timezones

// ✅ Better (explicit)
new Date('2025-11-02T00:00:00-08:00')  // Pacific Time

// ✅ Best (let database handle it)
// Store dates as TIMESTAMP WITH TIME ZONE in PostgreSQL
```

### Pitfall #3: Forgotten Filter in Pagination

**Symptom**: User filters, clicks page 2, filters disappear

**Cause**: Forgot to preserve filter in buildPageUrl
```typescript
// ❌ Missing country filter
function buildPageUrl(pageNum: number) {
  const params = new URLSearchParams();
  params.set('page', pageNum.toString());
  if (city) params.set('city', city);
  // Forgot country!
  return `/events?${params.toString()}`;
}
```

**Fix**: Add all filters systematically

### Pitfall #4: Race Condition with Auto-Submit

**Problem**: User clicks radio, then quickly changes mind
```javascript
// Form submits with first selection
// User can't change to second selection
```

**Solution**: Debounce or disable form during submission
```javascript
let isSubmitting = false;

radio.addEventListener('change', () => {
  if (!isSubmitting) {
    isSubmitting = true;
    form.submit();
  }
});
```

### Pitfall #5: Empty Filter Creates Bad UX

**Problem**: User selects country with no events
```
Country: Antarctica
Results: 0 events
```

**Solutions**:
1. **Show helpful message**: "No events in Antarctica. Try another country."
2. **Disable invalid options**: Disable countries with 0 events
3. **Show counts**: "USA (45)" helps user understand
4. **Clear filters button**: Easy way to reset

---

## 11. Testing Strategies

### 11.1 Service Layer Tests

**Time Frame Logic**:
```typescript
test('should implement upcoming filter', () => {
  const eventsSource = readFileSync('src/lib/events.ts', 'utf-8');
  const getEventsFunc = extractFunction(eventsSource, 'getEvents');
  
  expect(containsPattern(getEventsFunc, /timeFrame\s*===\s*['"]upcoming['"]/)).toBe(true);
  expect(containsPattern(getEventsFunc, /event_date\s*>=\s*\$/)).toBe(true);
});
```

**Capacity Calculations**:
```typescript
test('should calculate availability percentage', () => {
  const eventsSource = readFileSync('src/lib/events.ts', 'utf-8');
  const getEventsFunc = extractFunction(eventsSource, 'getEvents');
  
  expect(containsPattern(getEventsFunc, /CAST.*AS FLOAT/)).toBe(true);
  expect(containsPattern(getEventsFunc, /< 0\.2/)).toBe(true);
});
```

### 11.2 Component Tests

**Conditional Rendering**:
```typescript
test('should show/hide custom date range', () => {
  const filtersSource = readFileSync('src/components/EventFilters.astro', 'utf-8');
  
  expect(containsPattern(filtersSource, /id=["']customDateRange["']/)).toBe(true);
  expect(containsPattern(filtersSource, /classList\.(remove|add)\(['"]hidden['"]\)/)).toBe(true);
});
```

**Auto-Submit**:
```typescript
test('should auto-submit on radio change', () => {
  const filtersSource = readFileSync('src/components/EventFilters.astro', 'utf-8');
  
  expect(containsPattern(filtersSource, /addEventListener\(['"]change['"]/)).toBe(true);
  expect(containsPattern(filtersSource, /form\.submit\(\)/)).toBe(true);
});
```

### 11.3 Integration Tests

**Filter Preservation**:
```typescript
test('should preserve filters in pagination', () => {
  const pageSource = readFileSync('src/pages/events/index.astro', 'utf-8');
  const buildPageUrl = extractFunction(pageSource, 'buildPageUrl');
  
  expect(containsPattern(buildPageUrl, /params\.set\(['"]city['"]/)).toBe(true);
  expect(containsPattern(buildPageUrl, /params\.set\(['"]country['"]/)).toBe(true);
  // ... all 8 filters
});
```

---

## 12. Summary

### Key Takeaways

1. **Time-Based Filtering**
   - Use date presets for common queries
   - `.setDate()` for date arithmetic
   - Month-end calculation: `new Date(year, month + 1, 0)`

2. **Capacity Calculations**
   - Cast to FLOAT for percentage division
   - Define meaningful thresholds (20% = "limited")
   - Check both numerator and denominator

3. **Conditional UI**
   - Tailwind `hidden` class preferred
   - `classList` over `style.display`
   - Server-render initial state, JS for interactivity

4. **Instant Filtering**
   - Auto-submit radio and select
   - Manual submit for text and number
   - Preserve state through form repopulation

5. **Filter Reusability**
   - Extract common patterns
   - Adapt interface per content type
   - Maintain consistent UX across pages

### Next Steps

- **T111**: Apply these patterns to product filters
- **T112+**: Explore multi-select filters, faceted search
- **Advanced**: Real-time updates, filter combinations, saved filters

---

## Appendix: Complete Code Examples

### A. EventFilters Component (Simplified)
```astro
---
interface Props {
  currentCity: string;
  currentCountry: string;
  currentTimeFrame: string;
  currentStartDate: string;
  currentEndDate: string;
  currentMinPrice: string;
  currentMaxPrice: string;
  currentAvailability: string;
  cities: string[];
  countries: string[];
}

const {
  currentCity,
  currentCountry,
  currentTimeFrame,
  currentStartDate,
  currentEndDate,
  currentMinPrice,
  currentMaxPrice,
  currentAvailability,
  cities,
  countries,
} = Astro.props;
---

<form method="get" class="space-y-6">
  <!-- Country -->
  <div>
    <label for="country">Country</label>
    <select id="country" name="country">
      <option value="">All Countries</option>
      {countries.map((country) => (
        <option value={country} selected={currentCountry === country}>
          {country}
        </option>
      ))}
    </select>
  </div>

  <!-- City -->
  <div>
    <label for="city">City</label>
    <select id="city" name="city">
      <option value="">All Cities</option>
      {cities.map((city) => (
        <option value={city} selected={currentCity === city}>
          {city}
        </option>
      ))}
    </select>
  </div>

  <!-- Time Frame -->
  <div>
    <label>Time Frame</label>
    <label>
      <input type="radio" name="timeFrame" value="all" checked={currentTimeFrame === 'all'} />
      All Events
    </label>
    <label>
      <input type="radio" name="timeFrame" value="upcoming" checked={currentTimeFrame === 'upcoming'} />
      Upcoming
    </label>
    <label>
      <input type="radio" name="timeFrame" value="this-week" checked={currentTimeFrame === 'this-week'} />
      This Week
    </label>
    <label>
      <input type="radio" name="timeFrame" value="this-month" checked={currentTimeFrame === 'this-month'} />
      This Month
    </label>
    <label>
      <input type="radio" name="timeFrame" value="custom" checked={currentTimeFrame === 'custom'} />
      Custom Range
    </label>
  </div>

  <!-- Custom Date Range -->
  <div id="customDateRange" class={currentTimeFrame === 'custom' ? '' : 'hidden'}>
    <label for="startDate">From</label>
    <input type="date" id="startDate" name="startDate" value={currentStartDate} />
    
    <label for="endDate">To</label>
    <input type="date" id="endDate" name="endDate" value={currentEndDate} />
  </div>

  <!-- Price Range -->
  <div>
    <label>Price Range</label>
    <input type="number" id="minPrice" name="minPrice" min="0" value={currentMinPrice} placeholder="Min" />
    <input type="number" id="maxPrice" name="maxPrice" min="0" value={currentMaxPrice} placeholder="Max" />
  </div>

  <!-- Availability -->
  <div>
    <label>Availability</label>
    <label>
      <input type="radio" name="availability" value="all" checked={currentAvailability === 'all'} />
      All Events
    </label>
    <label>
      <input type="radio" name="availability" value="available" checked={currentAvailability === 'available'} />
      Available
    </label>
    <label>
      <input type="radio" name="availability" value="limited" checked={currentAvailability === 'limited'} />
      Limited
    </label>
  </div>

  <button type="submit">Apply Filters</button>
</form>

<script>
  const form = document.querySelector('form');
  const customDateRange = document.getElementById('customDateRange');
  
  // Auto-submit
  const autoSubmitInputs = form.querySelectorAll('input[type="radio"], select');
  autoSubmitInputs.forEach((input) => {
    input.addEventListener('change', () => form.submit());
  });
  
  // Show/hide custom date range
  const timeFrameRadios = form.querySelectorAll('input[name="timeFrame"]');
  timeFrameRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value === 'custom') {
        customDateRange?.classList.remove('hidden');
      } else {
        customDateRange?.classList.add('hidden');
      }
    });
  });
</script>
```

### B. Service Layer (Simplified)
```typescript
export interface EventFilters {
  city?: string;
  country?: string;
  timeFrame?: 'all' | 'upcoming' | 'this-week' | 'this-month' | 'custom';
  startDate?: Date;
  endDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  availability?: 'all' | 'available' | 'limited';
  limit?: number;
  offset?: number;
}

export async function getEvents(filters: EventFilters = {}) {
  let queryText = 'SELECT * FROM events WHERE is_published = TRUE';
  const params: any[] = [];
  let paramIndex = 1;
  
  // Location
  if (filters?.city) {
    queryText += ` AND LOWER(city) = LOWER($${paramIndex})`;
    params.push(filters.city);
    paramIndex++;
  }
  
  if (filters?.country) {
    queryText += ` AND LOWER(country) = LOWER($${paramIndex})`;
    params.push(filters.country);
    paramIndex++;
  }
  
  // Time Frame
  const now = new Date();
  
  if (filters.timeFrame === 'upcoming') {
    queryText += ` AND event_date >= $${paramIndex}`;
    params.push(now);
    paramIndex++;
  } else if (filters.timeFrame === 'this-week') {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);
    queryText += ` AND event_date >= $${paramIndex} AND event_date <= $${paramIndex + 1}`;
    params.push(now, weekEnd);
    paramIndex += 2;
  } else if (filters.timeFrame === 'this-month') {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    queryText += ` AND event_date >= $${paramIndex} AND event_date <= $${paramIndex + 1}`;
    params.push(now, monthEnd);
    paramIndex += 2;
  }
  
  // Custom Date Range
  if (filters?.startDate) {
    queryText += ` AND event_date >= $${paramIndex}`;
    params.push(filters.startDate);
    paramIndex++;
  }
  
  if (filters?.endDate) {
    queryText += ` AND event_date <= $${paramIndex}`;
    params.push(filters.endDate);
    paramIndex++;
  }
  
  // Price Range
  if (filters?.minPrice !== undefined) {
    queryText += ` AND price >= $${paramIndex}`;
    params.push(filters.minPrice);
    paramIndex++;
  }
  
  if (filters?.maxPrice !== undefined) {
    queryText += ` AND price <= $${paramIndex}`;
    params.push(filters.maxPrice);
    paramIndex++;
  }
  
  // Availability
  if (filters.availability === 'available') {
    queryText += ` AND available_spots > 0`;
  } else if (filters.availability === 'limited') {
    queryText += ` AND available_spots > 0 AND (CAST(available_spots AS FLOAT) / CAST(capacity AS FLOAT)) < 0.2`;
  }
  
  // Pagination
  if (filters?.limit !== undefined) {
    queryText += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
    
    if (filters?.offset !== undefined) {
      queryText += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }
  }
  
  const result = await db.query(queryText, params);
  return result.rows;
}
```

---

**End of Learning Guide**

Total Topics Covered: 12
Code Examples: 40+
Best Practices: 14
Common Pitfalls: 5

For questions or improvements, refer to the implementation log and test log.
