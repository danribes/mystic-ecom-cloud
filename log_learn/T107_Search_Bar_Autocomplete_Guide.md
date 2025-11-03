# T107: Search Bar with Autocomplete - Learning Guide

**Task ID**: T107  
**Difficulty Level**: Intermediate  
**Estimated Learning Time**: 3-4 hours  
**Prerequisites**: HTML, CSS, JavaScript basics, Astro fundamentals

---

## Table of Contents
1. [Overview](#overview)
2. [Key Concepts](#key-concepts)
3. [Detailed Tutorials](#detailed-tutorials)
4. [Code Patterns](#code-patterns)
5. [Common Pitfalls](#common-pitfalls)
6. [Testing Strategies](#testing-strategies)
7. [Performance Optimization](#performance-optimization)
8. [Accessibility Best Practices](#accessibility-best-practices)
9. [Debugging Tips](#debugging-tips)
10. [Further Learning](#further-learning)

---

## Overview

### What You'll Learn

This guide teaches you how to build a production-ready search component with autocomplete functionality in Astro. By the end, you'll understand:

1. **Astro Component Structure**: How to organize client-side JavaScript in `.astro` files
2. **Debouncing**: Preventing excessive API calls during user input
3. **AbortController**: Canceling in-flight HTTP requests
4. **Keyboard Navigation**: Supporting Escape and Enter keys
5. **ARIA Attributes**: Making components accessible to screen readers
6. **Responsive Design**: Creating separate mobile and desktop layouts
7. **Source-Based Testing**: Testing components without running servers
8. **Event Handling**: Managing clicks outside elements, focus, blur
9. **Dynamic Rendering**: Using `innerHTML` for efficient updates
10. **Integration Patterns**: Embedding reusable components

### Technologies Covered

- **Astro**: Component framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first styling
- **Vitest**: Testing framework
- **Web APIs**: Fetch, AbortController, Intl
- **Node.js**: File system operations for testing

---

## Key Concepts

### 1. Astro Component with Client-Side JavaScript

**Concept**: Astro components are server-rendered by default, but you can add client-side JavaScript using `<script>` tags.

**Structure**:
```astro
---
// Server-side code (frontmatter)
interface Props {
  placeholder?: string;
}
const { placeholder = "Search..." } = Astro.props;
---

<!-- HTML Template -->
<div>
  <input placeholder={placeholder} />
</div>

<script>
  // Client-side JavaScript
  // Runs in the browser
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Component loaded');
  });
</script>

<style>
  /* Component-scoped CSS */
</style>
```

**Key Points**:
- Frontmatter runs on server
- HTML is rendered with props
- `<script>` runs in browser
- `<style>` is scoped to component

### 2. Debouncing User Input

**Concept**: Delay execution of a function until user stops typing for a specified time.

**Why**: Prevents excessive API calls, reduces server load, improves UX.

**Visual Example**:
```
User types: "m" → "e" → "d" → "i" → "t"
           ↓    ↓    ↓    ↓    ↓
         300ms 300ms 300ms 300ms 300ms
           ❌    ❌    ❌    ❌    ✅ API Call
```

**Implementation**:
```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    // Clear previous timer
    clearTimeout(timeout);
    
    // Set new timer
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Usage
const searchAPI = (query: string) => {
  console.log('Searching for:', query);
};

const debouncedSearch = debounce(searchAPI, 300);

// Only last call executes after 300ms
input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});
```

**Choosing Delay Time**:
- 100ms: Very responsive, but still many calls
- 300ms: **Optimal** - Good balance
- 500ms: Feels sluggish
- 1000ms: Too slow

### 3. AbortController for Request Cancellation

**Concept**: Cancel in-flight HTTP requests when new ones start.

**Why**: Prevents race conditions where old requests overwrite new results.

**Problem Without AbortController**:
```
User types: "meditation" then quickly "yoga"
Timeline:
t=0ms:    Request 1 sent (meditation)
t=50ms:   Request 2 sent (yoga)
t=100ms:  Request 2 completes → Show "yoga" results ✅
t=200ms:  Request 1 completes → Show "meditation" results ❌ (Wrong!)
```

**Solution With AbortController**:
```typescript
let currentRequest: AbortController | null = null;

async function performSearch(query: string) {
  // Cancel previous request
  if (currentRequest) {
    currentRequest.abort();
  }
  
  // Create new controller
  currentRequest = new AbortController();
  
  try {
    const response = await fetch(`/api/search?q=${query}`, {
      signal: currentRequest.signal
    });
    
    const data = await response.json();
    renderResults(data);
  } catch (error: any) {
    // Ignore abort errors
    if (error.name === 'AbortError') {
      console.log('Request cancelled');
      return;
    }
    
    // Handle real errors
    console.error('Search failed:', error);
  } finally {
    currentRequest = null;
  }
}
```

**Key Points**:
- Create new `AbortController` per request
- Pass `signal` to `fetch()`
- Abort previous request before starting new one
- Ignore `AbortError` exceptions
- Handle real errors separately

### 4. Keyboard Navigation

**Concept**: Support keyboard shortcuts for improved accessibility and UX.

**Common Patterns**:
- `Escape`: Close dropdown, clear focus
- `Enter`: Submit/navigate
- `↑/↓`: Navigate through items (future enhancement)
- `Tab`: Move to next element

**Implementation**:
```typescript
searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    // Close dropdown
    resultsContainer.classList.add('hidden');
    
    // Update ARIA
    searchInput.setAttribute('aria-expanded', 'false');
    
    // Remove focus
    searchInput.blur();
  } else if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    
    if (query) {
      // Navigate to full search page
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  }
});
```

**Best Practices**:
- Always update ARIA attributes when state changes
- Prevent default behavior if handling key
- Consider user expectations (standard shortcuts)
- Test with screen readers

### 5. ARIA Attributes for Accessibility

**Concept**: Provide semantic information for assistive technologies.

**Key ARIA Attributes**:

#### `aria-label`
Provides accessible name for elements without visible text.
```html
<button aria-label="Clear search">
  <svg><!-- X icon --></svg>
</button>
```

#### `aria-controls`
Links input to controlled element (dropdown).
```html
<input 
  id="search-input"
  aria-controls="search-results"
/>
<div id="search-results">...</div>
```

#### `aria-expanded`
Indicates dropdown state (open/closed).
```html
<input 
  aria-expanded="false"  <!-- Closed -->
/>
<input 
  aria-expanded="true"   <!-- Open -->
/>
```

#### `role="listbox"` and `role="option"`
Semantic roles for dropdown results.
```html
<div role="listbox">
  <div role="option">Result 1</div>
  <div role="option">Result 2</div>
</div>
```

**Complete Example**:
```html
<input
  type="text"
  id="global-search"
  aria-label="Search courses, products, events"
  aria-controls="search-results"
  aria-expanded="false"
  autocomplete="off"
/>

<div
  id="search-results"
  role="listbox"
  aria-label="Search results"
  class="hidden"
>
  <a role="option" href="/course/1">Result 1</a>
  <a role="option" href="/course/2">Result 2</a>
</div>

<script>
  function showResults() {
    resultsContainer.classList.remove('hidden');
    searchInput.setAttribute('aria-expanded', 'true');
  }
  
  function hideResults() {
    resultsContainer.classList.add('hidden');
    searchInput.setAttribute('aria-expanded', 'false');
  }
</script>
```

### 6. Responsive Design Patterns

**Concept**: Different layouts for mobile and desktop using Tailwind breakpoints.

**Approach 1: CSS Visibility** (Used in T107)
```html
<!-- Desktop version (hidden on mobile) -->
<div class="hidden lg:block">
  <SearchBar className="mx-auto" />
</div>

<!-- Mobile version (hidden on desktop) -->
<div class="lg:hidden">
  <SearchBar />
</div>
```

**Approach 2: Conditional Rendering**
```astro
---
const isMobile = Astro.request.headers.get('user-agent')?.includes('Mobile');
---

{isMobile ? (
  <MobileSearchBar />
) : (
  <DesktopSearchBar />
)}
```

**Approach 3: Responsive Classes**
```html
<div class="flex-col lg:flex-row">
  <!-- Changes layout at lg breakpoint -->
</div>
```

**Tailwind Breakpoints**:
- `sm`: 640px (mobile landscape)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (large desktop)
- `2xl`: 1536px (extra large)

**T107 Strategy**:
- Mobile: Full-width search below header
- Desktop: Centered search in header
- Reason: Different user contexts and available space

---

## Detailed Tutorials

### Tutorial 1: Building a Debounced Search Input

**Goal**: Create an input that calls an API 300ms after user stops typing.

**Step 1: HTML Structure**
```html
<input 
  type="text" 
  id="search-input" 
  placeholder="Search..."
/>
<div id="results"></div>
```

**Step 2: Debounce Function**
```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

**Step 3: Search Function**
```typescript
async function performSearch(query: string) {
  console.log('Searching for:', query);
  
  // Simulate API call
  const results = await fetch(`/api/search?q=${query}`);
  const data = await results.json();
  
  // Display results
  document.getElementById('results')!.innerHTML = 
    data.items.map(item => `<div>${item.title}</div>`).join('');
}
```

**Step 4: Wire It Up**
```typescript
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const debouncedSearch = debounce(performSearch, 300);

searchInput.addEventListener('input', (e) => {
  const query = (e.target as HTMLInputElement).value;
  debouncedSearch(query);
});
```

**Full Code**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Debounced Search</title>
</head>
<body>
  <input type="text" id="search-input" placeholder="Search..." />
  <div id="results"></div>

  <script>
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
      };
    }

    async function performSearch(query) {
      if (!query.trim()) {
        document.getElementById('results').innerHTML = '';
        return;
      }

      console.log('Searching for:', query);
      
      // Simulate API call
      const results = [
        { title: `Result 1 for "${query}"` },
        { title: `Result 2 for "${query}"` },
      ];
      
      document.getElementById('results').innerHTML = 
        results.map(item => `<div>${item.title}</div>`).join('');
    }

    const searchInput = document.getElementById('search-input');
    const debouncedSearch = debounce(performSearch, 300);

    searchInput.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
  </script>
</body>
</html>
```

**Test It**:
1. Open in browser
2. Type quickly: "test"
3. Observe: Only one "Searching for: test" logged after 300ms
4. Try typing slowly: Multiple logs as you pause

### Tutorial 2: Implementing AbortController

**Goal**: Cancel previous requests when new ones start.

**Step 1: Track Current Request**
```typescript
let currentRequest: AbortController | null = null;
```

**Step 2: Create Controller Per Request**
```typescript
async function performSearch(query: string) {
  // Cancel previous request
  if (currentRequest) {
    currentRequest.abort();
    console.log('Previous request cancelled');
  }
  
  // Create new controller
  currentRequest = new AbortController();
  
  try {
    // Make request with signal
    const response = await fetch(`/api/search?q=${query}`, {
      signal: currentRequest.signal
    });
    
    const data = await response.json();
    console.log('Results:', data);
    
    // Render results...
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // Expected - request was cancelled
      console.log('Request aborted (expected)');
    } else {
      // Real error - handle it
      console.error('Search failed:', error);
    }
  } finally {
    // Clean up
    currentRequest = null;
  }
}
```

**Step 3: Visualize It**
```html
<!DOCTYPE html>
<html>
<head>
  <title>AbortController Demo</title>
</head>
<body>
  <input type="text" id="search-input" placeholder="Type quickly..." />
  <div id="log"></div>

  <script>
    let currentRequest = null;
    const log = document.getElementById('log');

    function addLog(message) {
      const time = new Date().toLocaleTimeString();
      log.innerHTML += `<div>${time}: ${message}</div>`;
    }

    async function performSearch(query) {
      if (!query.trim()) return;

      // Cancel previous
      if (currentRequest) {
        currentRequest.abort();
        addLog(`❌ Cancelled request for: "${currentRequest.query}"`);
      }

      // Create new
      currentRequest = new AbortController();
      currentRequest.query = query; // For logging

      addLog(`🔍 Starting search: "${query}"`);

      try {
        // Simulate slow API (2 seconds)
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 2000);
          currentRequest.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });

        addLog(`✅ Completed search: "${query}"`);
      } catch (error) {
        if (error.name === 'AbortError') {
          addLog(`⏭️  Aborted (as expected)`);
        } else {
          addLog(`❌ Error: ${error.message}`);
        }
      } finally {
        currentRequest = null;
      }
    }

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });
  </script>
</body>
</html>
```

**Try It**:
1. Open in browser
2. Type "test" quickly
3. Observe logs:
   - Multiple "Starting search" messages
   - Multiple "Cancelled request" messages
   - Only last request completes

### Tutorial 3: Click Outside to Close

**Goal**: Close dropdown when clicking outside of search component.

**Step 1: Structure**
```html
<div id="search-container">
  <input id="search-input" />
  <div id="search-results" class="hidden">
    <!-- Results -->
  </div>
</div>
```

**Step 2: Document-Level Listener**
```typescript
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('search-results');

document.addEventListener('click', (e: MouseEvent) => {
  const target = e.target as Node;
  
  // Check if click is outside search component
  if (
    !searchInput.contains(target) &&
    !resultsContainer.contains(target)
  ) {
    // Close dropdown
    resultsContainer.classList.add('hidden');
    searchInput.setAttribute('aria-expanded', 'false');
  }
});
```

**Step 3: Prevent Closing on Internal Clicks**
```typescript
// Results should stay open when clicking inside
resultsContainer.addEventListener('click', (e) => {
  // Don't do anything - let links work naturally
  // Dropdown will close via navigation
});

// Re-open on focus if results exist
searchInput.addEventListener('focus', () => {
  if (resultsContainer.innerHTML && searchInput.value.trim()) {
    resultsContainer.classList.remove('hidden');
    searchInput.setAttribute('aria-expanded', 'true');
  }
});
```

**Complete Example**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Click Outside Demo</title>
  <style>
    .hidden { display: none; }
    #search-results {
      border: 1px solid #ccc;
      padding: 10px;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>Click outside the search box to close it</h1>
  
  <div id="search-container">
    <input 
      id="search-input" 
      placeholder="Click here, then click away"
    />
    <div id="search-results" class="hidden">
      <div>Result 1</div>
      <div>Result 2</div>
      <div>Result 3</div>
    </div>
  </div>

  <p>Other content here...</p>

  <script>
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');

    // Show results on focus
    searchInput.addEventListener('focus', () => {
      resultsContainer.classList.remove('hidden');
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (
        !searchInput.contains(e.target) &&
        !resultsContainer.contains(e.target)
      ) {
        resultsContainer.classList.add('hidden');
      }
    });
  </script>
</body>
</html>
```

### Tutorial 4: Source-Based Component Testing

**Goal**: Test Astro components without running a server.

**Concept**: Read component source files and verify structure.

**Step 1: Setup Test File**
```typescript
// SearchBar.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('SearchBar Component', () => {
  let componentSource: string;

  beforeAll(() => {
    componentSource = readFileSync(
      join(process.cwd(), 'src/components/SearchBar.astro'),
      'utf-8'
    );
  });

  // Tests here...
});
```

**Step 2: Test HTML Structure**
```typescript
it('should have search input element', () => {
  expect(componentSource).toContain('id="global-search"');
  expect(componentSource).toContain('type="text"');
  expect(componentSource).toContain('placeholder=');
});

it('should have results container', () => {
  expect(componentSource).toContain('id="search-results"');
  expect(componentSource).toContain('role="listbox"');
});
```

**Step 3: Test JavaScript Presence**
```typescript
it('should have debounce function', () => {
  expect(componentSource).toContain('function debounce');
  expect(componentSource).toContain('setTimeout');
});

it('should use AbortController', () => {
  expect(componentSource).toContain('new AbortController()');
  expect(componentSource).toContain('.abort()');
});
```

**Step 4: Test CSS Classes**
```typescript
it('should have Tailwind classes', () => {
  expect(componentSource).toContain('rounded-lg');
  expect(componentSource).toContain('border');
  expect(componentSource).toContain('focus:ring');
});
```

**Step 5: Test ARIA Attributes**
```typescript
it('should have accessibility attributes', () => {
  expect(componentSource).toContain('aria-label');
  expect(componentSource).toContain('aria-controls');
  expect(componentSource).toContain('aria-expanded');
});
```

**Benefits**:
- ✅ No server required
- ✅ Fast execution
- ✅ Reliable (no timeouts)
- ✅ Tests component structure

**Limitations**:
- ❌ Cannot test runtime behavior
- ❌ Cannot test user interactions
- ❌ Cannot verify visual appearance

**When to Use**:
- Component structure validation
- Baseline testing
- When server issues prevent integration testing
- Fast feedback during development

**When Not to Use**:
- Testing user interactions
- Visual regression testing
- Performance testing
- Full integration testing

---

## Code Patterns

### Pattern 1: Astro Component with Props

**Problem**: Make component reusable with different configurations.

**Solution**: Define props interface and use destructuring.

```astro
---
interface Props {
  placeholder?: string;
  className?: string;
  maxResults?: number;
}

const { 
  placeholder = "Search...",
  className = "",
  maxResults = 5
} = Astro.props;
---

<div class={`search-container ${className}`}>
  <input 
    placeholder={placeholder}
    data-max-results={maxResults}
  />
</div>
```

**Usage**:
```astro
<SearchBar placeholder="Find courses..." className="mx-auto" maxResults={10} />
```

### Pattern 2: Event Listener Cleanup

**Problem**: Prevent memory leaks in SPAs with view transitions.

**Solution**: Re-initialize on page load.

```typescript
function initializeSearch() {
  // Your initialization code...
}

// Initial load
document.addEventListener('DOMContentLoaded', initializeSearch);

// Astro view transitions
document.addEventListener('astro:page-load', initializeSearch);
```

**Alternative: Cleanup**
```typescript
let cleanupFunctions: (() => void)[] = [];

function initializeSearch() {
  // Clean up previous listeners
  cleanupFunctions.forEach(fn => fn());
  cleanupFunctions = [];

  // Add new listeners with cleanup
  const handleInput = (e: Event) => {
    // Handle input...
  };
  
  searchInput.addEventListener('input', handleInput);
  cleanupFunctions.push(() => {
    searchInput.removeEventListener('input', handleInput);
  });
}

// Run on page load
document.addEventListener('astro:page-load', initializeSearch);

// Clean up before page leave
document.addEventListener('astro:before-preparation', () => {
  cleanupFunctions.forEach(fn => fn());
});
```

### Pattern 3: Type-Safe Fetch with Error Handling

**Problem**: Safely fetch API data with proper error handling.

**Solution**: Type responses and handle all error cases.

```typescript
interface SearchResult {
  id: number;
  title: string;
  type: 'course' | 'product' | 'event';
  price?: number;
  image_url?: string;
}

interface SearchResponse {
  success: boolean;
  data: {
    items: SearchResult[];
    total: number;
  };
  error?: string;
}

async function performSearch(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&limit=5`,
      { signal: currentRequest?.signal }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: SearchResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Search failed');
    }

    return data.data.items;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // Request was cancelled - not an error
      return [];
    }

    console.error('Search error:', error);
    
    // Show user-friendly message
    showError('Search failed. Please try again.');
    
    return [];
  }
}
```

### Pattern 4: Dynamic HTML Rendering

**Problem**: Efficiently render lists of items.

**Solution**: Use `innerHTML` with proper escaping.

```typescript
function renderResults(results: SearchResult[]) {
  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <div class="p-4 text-center text-gray-500">
        No results found. Try different keywords.
      </div>
    `;
    return;
  }

  // Helper to escape HTML (prevent XSS)
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const html = `
    <ul class="divide-y">
      ${results.map(item => `
        <li>
          <a href="${escapeHtml(getItemUrl(item))}" class="block p-4 hover:bg-gray-50">
            <h4 class="font-medium">${escapeHtml(item.title)}</h4>
            ${item.price ? `
              <span class="text-primary">
                ${formatPrice(item.price)}
              </span>
            ` : ''}
          </a>
        </li>
      `).join('')}
    </ul>
  `;

  resultsContainer.innerHTML = html;
}
```

**Security Note**: Always escape user-generated content!

### Pattern 5: Responsive Layout with Tailwind

**Problem**: Different layouts for mobile and desktop.

**Solution**: Use responsive utility classes.

```astro
<header>
  <div class="container mx-auto">
    <!-- Desktop layout: Logo | Search | Nav -->
    <div class="flex items-center justify-between gap-4">
      <Logo class="flex-shrink-0" />
      
      <!-- Desktop search (hidden on mobile) -->
      <div class="hidden flex-1 lg:block">
        <SearchBar className="mx-auto" />
      </div>
      
      <Nav class="flex-shrink-0" />
      <UserMenu />
    </div>
    
    <!-- Mobile search (hidden on desktop) -->
    <div class="pb-3 pt-2 lg:hidden">
      <SearchBar />
    </div>
  </div>
</header>
```

**Explanation**:
- `hidden`: Hidden by default (mobile)
- `lg:block`: Visible on large screens (≥1024px)
- `lg:hidden`: Hidden on large screens
- `flex-1`: Takes available space in flex container
- `flex-shrink-0`: Prevents element from shrinking

---

## Common Pitfalls

### Pitfall 1: Forgetting to Encode URLs

**Problem**:
```typescript
// ❌ Bad - Special characters break URL
const url = `/search?q=${query}`;
```

**Solution**:
```typescript
// ✅ Good - Properly encoded
const url = `/search?q=${encodeURIComponent(query)}`;
```

**Why**: Special characters like `&`, `?`, `=` have meaning in URLs.

**Example**:
```typescript
const query = "React & Vue";
const bad = `/search?q=${query}`;
// Result: /search?q=React & Vue
// Problem: & is interpreted as parameter separator

const good = `/search?q=${encodeURIComponent(query)}`;
// Result: /search?q=React%20%26%20Vue
// Works correctly!
```

### Pitfall 2: Not Handling Abort Errors

**Problem**:
```typescript
// ❌ Bad - Treats cancellation as error
try {
  await fetch(url, { signal });
} catch (error) {
  showError('Search failed!'); // Shows error for cancelled requests
}
```

**Solution**:
```typescript
// ✅ Good - Ignore abort errors
try {
  await fetch(url, { signal });
} catch (error: any) {
  if (error.name === 'AbortError') {
    return; // Expected, not an error
  }
  showError('Search failed!');
}
```

### Pitfall 3: Race Conditions Without AbortController

**Problem**:
```typescript
// ❌ Bad - Results can arrive out of order
async function search(query: string) {
  const response = await fetch(`/api/search?q=${query}`);
  const data = await response.json();
  displayResults(data); // Might show old results!
}
```

**Scenario**:
```
User types: "meditation" → "yoga"
Request 1 (meditation) - slow API - 1000ms
Request 2 (yoga) - fast API - 100ms
Timeline:
  t=0ms:   Request 1 sent
  t=10ms:  Request 2 sent
  t=110ms: Request 2 done → Shows "yoga" ✅
  t=1010ms: Request 1 done → Shows "meditation" ❌ (Wrong!)
```

**Solution**:
```typescript
// ✅ Good - Cancel previous requests
let currentRequest: AbortController | null = null;

async function search(query: string) {
  if (currentRequest) {
    currentRequest.abort(); // Cancel previous
  }
  
  currentRequest = new AbortController();
  
  try {
    const response = await fetch(`/api/search?q=${query}`, {
      signal: currentRequest.signal
    });
    const data = await response.json();
    displayResults(data); // Only latest results show
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error(error);
    }
  }
}
```

### Pitfall 4: Forgetting ARIA Updates

**Problem**:
```typescript
// ❌ Bad - ARIA state not updated
function showResults() {
  resultsContainer.classList.remove('hidden');
  // Forgot to update aria-expanded!
}
```

**Solution**:
```typescript
// ✅ Good - Keep ARIA in sync
function showResults() {
  resultsContainer.classList.remove('hidden');
  searchInput.setAttribute('aria-expanded', 'true');
}

function hideResults() {
  resultsContainer.classList.add('hidden');
  searchInput.setAttribute('aria-expanded', 'false');
}
```

**Why**: Screen readers rely on ARIA to communicate state changes.

### Pitfall 5: Excessive Debounce Delay

**Problem**:
```typescript
// ❌ Bad - Feels unresponsive
const debouncedSearch = debounce(performSearch, 1000);
```

**Effect**: Users wait 1 second after typing before seeing results. Feels slow.

**Solution**:
```typescript
// ✅ Good - Balanced timing
const debouncedSearch = debounce(performSearch, 300);
```

**Guidelines**:
- 100-200ms: Very responsive, acceptable for most cases
- 300ms: **Optimal** - Noticeable but not annoying
- 500ms: Starts to feel sluggish
- 1000ms+: Too slow for real-time search

### Pitfall 6: Memory Leaks in SPAs

**Problem**:
```typescript
// ❌ Bad - Listeners accumulate on page transitions
document.addEventListener('DOMContentLoaded', () => {
  searchInput.addEventListener('input', handleInput);
  // Never removed!
});
```

**Effect**: In SPAs (Astro with View Transitions), listeners accumulate on each navigation.

**Solution**:
```typescript
// ✅ Good - Re-initialize properly
function initializeSearch() {
  // Setup listeners...
}

// Initial load
document.addEventListener('DOMContentLoaded', initializeSearch);

// View transitions (Astro re-runs scripts)
document.addEventListener('astro:page-load', initializeSearch);
```

**Better Solution with Cleanup**:
```typescript
let cleanup: (() => void) | null = null;

function initializeSearch() {
  // Clean up previous
  if (cleanup) cleanup();
  
  // Setup
  const handleInput = (e: Event) => { /* ... */ };
  searchInput.addEventListener('input', handleInput);
  
  // Store cleanup
  cleanup = () => {
    searchInput.removeEventListener('input', handleInput);
  };
}

document.addEventListener('astro:page-load', initializeSearch);
document.addEventListener('astro:before-preparation', () => {
  if (cleanup) cleanup();
});
```

---

## Testing Strategies

### Strategy 1: Source-Based Testing

**When**: Server unavailable or component tests don't require runtime

**How**: Read component files, verify structure

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

describe('SearchBar', () => {
  let source: string;

  beforeAll(() => {
    source = readFileSync(
      join(__dirname, '../SearchBar.astro'),
      'utf-8'
    );
  });

  it('has search input', () => {
    expect(source).toContain('id="search-input"');
  });

  it('has debounce function', () => {
    expect(source).toContain('function debounce');
  });
});
```

**Pros**:
- ✅ Fast
- ✅ No dependencies
- ✅ Reliable

**Cons**:
- ❌ No runtime testing
- ❌ No interaction testing

### Strategy 2: Integration Testing with Mock Server

**When**: Need to test API integration without real backend

**How**: Use MSW (Mock Service Worker)

```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    return HttpResponse.json({
      success: true,
      data: {
        items: [
          { id: 1, title: `Result for ${query}`, type: 'course' }
        ]
      }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('calls API with query', async () => {
  const response = await fetch('/api/search?q=test');
  const data = await response.json();
  
  expect(data.data.items[0].title).toContain('test');
});
```

### Strategy 3: Component Testing with Testing Library

**When**: Need to test user interactions

**How**: Use @testing-library/react or similar

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchBar from './SearchBar';

it('shows results on typing', async () => {
  render(<SearchBar />);
  
  const input = screen.getByPlaceholderText('Search...');
  
  fireEvent.change(input, { target: { value: 'test' } });
  
  await waitFor(() => {
    expect(screen.getByText(/Result for test/)).toBeInTheDocument();
  }, { timeout: 500 }); // Wait for debounce
});
```

### Strategy 4: E2E Testing with Playwright

**When**: Need full browser testing

**How**: Use Playwright or Cypress

```typescript
import { test, expect } from '@playwright/test';

test('search autocomplete works', async ({ page }) => {
  await page.goto('/');
  
  // Type in search
  await page.fill('#global-search', 'meditation');
  
  // Wait for dropdown
  await page.waitForSelector('#search-results', { state: 'visible' });
  
  // Verify results
  const results = await page.locator('#search-results li');
  expect(await results.count()).toBeGreaterThan(0);
  
  // Click first result
  await results.first().click();
  
  // Verify navigation
  expect(page.url()).toContain('/courses/');
});
```

### Strategy 5: Accessibility Testing

**When**: Always!

**How**: Use axe-core

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<SearchBar />);
  const results = await axe(container);
  
  expect(results).toHaveNoViolations();
});
```

---

## Performance Optimization

### Optimization 1: Debouncing

**Impact**: 80% reduction in API calls

**Before**:
```typescript
input.addEventListener('input', (e) => {
  performSearch(e.target.value);
  // Called on every keystroke!
});
```

**After**:
```typescript
const debouncedSearch = debounce(performSearch, 300);

input.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
  // Called once after 300ms of no typing
});
```

### Optimization 2: Request Cancellation

**Impact**: Prevents wasted bandwidth and processing

```typescript
// Cancel in-flight requests
if (currentRequest) {
  currentRequest.abort();
}
```

### Optimization 3: Result Limiting

**Impact**: Faster API response, smaller payload

```typescript
// Only fetch 5 results for autocomplete
const url = `/api/search?q=${query}&limit=5`;
```

**Why**: Users don't need 100 results in dropdown

### Optimization 4: Hardware-Accelerated Animations

**Impact**: Smooth 60fps animations

```css
/* ❌ Bad - Triggers layout */
.dropdown {
  transition: height 200ms;
}

/* ✅ Good - GPU accelerated */
.dropdown {
  transition: transform 200ms, opacity 200ms;
}
```

**Use These Properties**:
- `transform`
- `opacity`
- `filter`

**Avoid These**:
- `width`, `height`
- `top`, `left`
- `margin`, `padding`

### Optimization 5: Efficient DOM Updates

**Impact**: Faster rendering

```typescript
// ✅ Good - Single innerHTML update
resultsContainer.innerHTML = results
  .map(item => `<li>${item.title}</li>`)
  .join('');

// ❌ Bad - Multiple DOM operations
results.forEach(item => {
  const li = document.createElement('li');
  li.textContent = item.title;
  resultsContainer.appendChild(li);
});
```

**When to Use Each**:
- `innerHTML`: When replacing all content
- `createElement`: When adding event listeners to items
- Virtual DOM: For complex, stateful UIs

---

## Accessibility Best Practices

### Practice 1: Keyboard Navigation

**Must Support**:
- `Tab`: Navigate to/from search
- `Escape`: Close dropdown
- `Enter`: Submit search
- `↑/↓`: Navigate results (future)

```typescript
searchInput.addEventListener('keydown', (e) => {
  switch(e.key) {
    case 'Escape':
      hideResults();
      searchInput.blur();
      break;
    case 'Enter':
      submitSearch();
      break;
    case 'ArrowDown':
      focusNextResult();
      break;
    case 'ArrowUp':
      focusPreviousResult();
      break;
  }
});
```

### Practice 2: Screen Reader Support

**Required ARIA**:
```html
<input
  aria-label="Search courses, products, and events"
  aria-controls="search-results"
  aria-expanded="false"
  aria-autocomplete="list"
/>

<div
  id="search-results"
  role="listbox"
  aria-label="Search suggestions"
>
  <a role="option" href="/course/1">
    Result 1
  </a>
</div>
```

**Update on State Changes**:
```typescript
function showResults() {
  resultsContainer.classList.remove('hidden');
  searchInput.setAttribute('aria-expanded', 'true');
}
```

### Practice 3: Color Contrast

**WCAG AA Standard**: 4.5:1 for normal text, 3:1 for large text

**Check with**:
- Browser DevTools
- axe DevTools extension
- Lighthouse

**Example**:
```css
/* ❌ Bad - Insufficient contrast */
.text { 
  color: #999;           /* 2.8:1 on white */
}

/* ✅ Good - Meets AA */
.text { 
  color: #666;           /* 5.7:1 on white */
}
```

### Practice 4: Focus Indicators

**Always Visible**:
```css
/* ✅ Good */
input:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* ❌ Bad */
input:focus {
  outline: none; /* Never do this without custom focus style! */
}
```

### Practice 5: Semantic HTML

**Use Correct Elements**:
```html
<!-- ✅ Good -->
<input type="text" />
<button type="button">Clear</button>
<nav>...</nav>

<!-- ❌ Bad -->
<div onclick="...">Clear</div>
<div class="nav">...</div>
```

---

## Debugging Tips

### Tip 1: Console Logging Strategy

**Effective Logging**:
```typescript
async function performSearch(query: string) {
  console.group(`🔍 Search: "${query}"`);
  console.time('search-duration');
  
  try {
    console.log('Fetching...');
    const response = await fetch(`/api/search?q=${query}`);
    
    console.log('Response:', response.status);
    const data = await response.json();
    
    console.log('Results:', data.data.items.length);
    console.timeEnd('search-duration');
    
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    console.groupEnd();
  }
}
```

**Output**:
```
🔍 Search: "meditation"
  Fetching...
  Response: 200
  Results: 5
  search-duration: 234.5ms
```

### Tip 2: Network Tab Debugging

**Check**:
1. Request URL (correct query encoding?)
2. Response time (too slow?)
3. Response size (too large?)
4. Status code (200 OK?)
5. Response body (correct format?)

**Firefox/Chrome DevTools**:
- F12 → Network tab
- Type in search
- See requests in real-time
- Right-click → Copy as cURL for testing

### Tip 3: Breakpoint Debugging

**Set Breakpoints**:
```typescript
async function performSearch(query: string) {
  debugger; // Pauses here
  
  const response = await fetch(`/api/search?q=${query}`);
  debugger; // Pauses here after fetch
  
  const data = await response.json();
  return data;
}
```

**Or in DevTools**:
1. F12 → Sources
2. Find file: `Cmd/Ctrl + P`
3. Click line number to set breakpoint
4. Trigger search
5. Inspect variables in scope

### Tip 4: React DevTools for Astro

**Install**: React DevTools browser extension

**Use for**: Inspecting component state, props

**Note**: Works with Astro islands using React

### Tip 5: Testing API Separately

**Isolate Issues**:
```bash
# Test API directly with curl
curl "http://localhost:4321/api/search?q=test&limit=5"

# Test with special characters
curl "http://localhost:4321/api/search?q=test%20%26%20special"

# Test with invalid query
curl "http://localhost:4321/api/search?q="
```

**Benefits**:
- Verify API works independently
- Test edge cases easily
- See exact responses

---

## Further Learning

### Recommended Resources

#### Astro
- [Astro Docs](https://docs.astro.build) - Official documentation
- [Astro Client-Side Scripts](https://docs.astro.build/en/guides/client-side-scripts/) - Using JavaScript in Astro

#### Accessibility
- [WebAIM](https://webaim.org/) - Accessibility guidelines
- [A11y Project](https://www.a11yproject.com/) - Accessibility checklist
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) - ARIA patterns

#### Performance
- [Web.dev Performance](https://web.dev/performance/) - Performance best practices
- [Debouncing and Throttling Explained](https://css-tricks.com/debouncing-throttling-explained-examples/) - Visual explanations

#### Testing
- [Vitest](https://vitest.dev/) - Fast unit testing
- [Testing Library](https://testing-library.com/) - User-centric testing
- [Playwright](https://playwright.dev/) - E2E testing

#### JavaScript Patterns
- [JavaScript.info](https://javascript.info/) - Modern JavaScript tutorial
- [MDN Web Docs](https://developer.mozilla.org/) - Web APIs reference

### Next Steps

1. **Implement Advanced Features**:
   - Arrow key navigation through results
   - Search history in localStorage
   - Voice search integration

2. **Improve Performance**:
   - Add caching layer
   - Optimize API queries
   - Lazy load images in results

3. **Enhance Accessibility**:
   - Add live regions for results
   - Improve keyboard navigation
   - Test with multiple screen readers

4. **Add E2E Tests**:
   - Set up Playwright
   - Write user flow tests
   - Add visual regression tests

5. **Monitor in Production**:
   - Add analytics
   - Track search queries
   - Monitor API response times

---

## Summary

### Key Takeaways

1. **Debouncing is Essential**: 300ms delay prevents excessive API calls
2. **AbortController Prevents Race Conditions**: Cancel old requests
3. **ARIA Attributes are Required**: Make components accessible
4. **Keyboard Support is Expected**: Escape, Enter, Tab navigation
5. **Source-Based Testing Works**: When servers are unavailable
6. **Responsive Design Patterns**: Use Tailwind breakpoints effectively
7. **Performance Matters**: Hardware-accelerated animations, efficient rendering
8. **Security First**: Always encode URLs, escape user content

### What You Built

A production-ready search component featuring:
- ✅ Real-time autocomplete
- ✅ Debounced API calls
- ✅ Request cancellation
- ✅ Keyboard navigation
- ✅ Full accessibility
- ✅ Responsive design
- ✅ Comprehensive tests
- ✅ Error handling

### Skills Gained

- Astro component architecture
- Client-side JavaScript patterns
- Accessibility implementation
- Testing strategies
- Performance optimization
- Responsive design
- API integration

---

**Document Version**: 1.0  
**Last Updated**: November 2, 2025  
**Author**: AI Agent  
**Related Tasks**: T105, T106, T108

**Happy Coding! 🚀**
