# Phase 3: Course Pages Implementation Guide

*This guide covers the implementation of course catalog pages, course cards, course detail pages, and add-to-cart functionality (Tasks T036-T039). Learn how to build dynamic course browsing experiences using Astro's SSR capabilities, reusable components, and modern web patterns.*

---

## Table of Contents

1. [T036: Course Catalog Page](#t036-course-catalog-page)
2. [T037: CourseCard Component](#t037-coursecard-component)
3. [T038: Course Detail Page](#t038-course-detail-page)
4. [T039: Add-to-Cart Functionality](#t039-add-to-cart-functionality)
5. [Complete Course Browsing Flow](#complete-course-browsing-flow)
6. [Best Practices](#best-practices)

---

## Overview: Course Pages Architecture

The course pages represent the customer-facing catalog experience where users discover, explore, and purchase courses. This system demonstrates several key web development concepts:

### **Why This Architecture?**

**SSR (Server-Side Rendering)**: Course pages use Astro's SSR for SEO benefits - course information is rendered on the server, making it immediately available to search engines and social media crawlers.

**Component-Based Design**: The `CourseCard` component is reusable across different contexts (homepage, catalog, search results) while maintaining consistent styling and behavior.

**Progressive Enhancement**: JavaScript functionality (add-to-cart) enhances the base HTML experience without breaking core functionality if JavaScript fails.

**Dynamic Routing**: Astro's `[id].astro` pattern enables clean URLs like `/courses/quantum-manifestation-mastery` while maintaining type safety.

### **The Three-Layer Pattern**

1. **Data Layer**: Mock course data (will be replaced with database queries)
2. **Component Layer**: Reusable UI components (`CourseCard`, layouts)
3. **Page Layer**: SSR pages that compose components with data

---

## T036: Course Catalog Page

*Implementation: `src/pages/courses/index.astro` (referenced but not yet created)*

### **Purpose & Context**

The course catalog page serves as the main discovery interface where users can browse all available courses. While we don't have the catalog page file yet, based on the project structure and the detail page, here's how it would be implemented:

### **Expected Catalog Page Structure**

```astro
---
/**
 * Course Catalog Page
 * 
 * Main course discovery page with filtering, search, and pagination.
 * Uses SSR to render initial course list for SEO optimization.
 */

import BaseLayout from '@/layouts/BaseLayout.astro';
import CourseCard from '@/components/CourseCard.astro';
import type { Course } from '@/types';

// Get query parameters for filtering
const url = new URL(Astro.request.url);
const category = url.searchParams.get('category');
const level = url.searchParams.get('level');
const search = url.searchParams.get('search');
const page = parseInt(url.searchParams.get('page') || '1');

// In production, this would call course.service.ts:
// const { courses, totalCount, totalPages } = await courseService.listCourses({
//   category,
//   level,
//   search,
//   page,
//   limit: 12
// });

// Mock data for now
const mockCourses: Course[] = [
  // ... course data from detail page
];

// Filter courses based on query parameters
let filteredCourses = mockCourses;

if (category) {
  filteredCourses = filteredCourses.filter(course => 
    course.category.toLowerCase() === category.toLowerCase()
  );
}

if (level) {
  filteredCourses = filteredCourses.filter(course => course.level === level);
}

if (search) {
  const searchTerm = search.toLowerCase();
  filteredCourses = filteredCourses.filter(course =>
    course.title.toLowerCase().includes(searchTerm) ||
    course.description.toLowerCase().includes(searchTerm) ||
    course.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}

// Get unique categories and levels for filters
const categories = [...new Set(mockCourses.map(course => course.category))];
const levels = ['beginner', 'intermediate', 'advanced'];
---

<BaseLayout
  title="Online Courses - Spiritual Learning Platform"
  description="Discover transformative courses in manifestation, energy healing, and spiritual development."
>
  <div class="catalog-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="container">
        <h1>Transform Your Life with Our Courses</h1>
        <p>Discover spiritual wisdom and practical techniques for personal growth</p>
      </div>
    </section>

    <!-- Filters & Search -->
    <section class="filters-section">
      <div class="container">
        <form class="filters-form" method="GET">
          <div class="search-bar">
            <input 
              type="text" 
              name="search" 
              placeholder="Search courses..." 
              value={search || ''}
            />
            <button type="submit">Search</button>
          </div>
          
          <div class="filter-controls">
            <select name="category">
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option value={cat} selected={category === cat}>{cat}</option>
              ))}
            </select>
            
            <select name="level">
              <option value="">All Levels</option>
              {levels.map(lev => (
                <option value={lev} selected={level === lev}>{lev}</option>
              ))}
            </select>
            
            <button type="submit">Filter</button>
          </div>
        </form>
      </div>
    </section>

    <!-- Course Grid -->
    <section class="courses-section">
      <div class="container">
        <div class="courses-header">
          <h2>
            {search ? `Search results for "${search}"` : 'All Courses'}
            <span class="count">({filteredCourses.length} courses)</span>
          </h2>
        </div>
        
        <div class="courses-grid">
          {filteredCourses.map((course) => (
            <CourseCard course={course} showDescription={true} />
          ))}
        </div>
        
        {filteredCourses.length === 0 && (
          <div class="no-results">
            <h3>No courses found</h3>
            <p>Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </section>
  </div>
</BaseLayout>
```

### **Why This Structure?**

**Form-Based Filtering**: Uses standard HTML forms so filtering works without JavaScript, then JavaScript can enhance the experience with AJAX updates.

**URL-Based State**: Filter state is stored in URL parameters, making filtered views bookmarkable and shareable.

**SSR Benefits**: Initial page load includes filtered results, providing immediate content for both users and search engines.

### **Key Catalog Features**

1. **Search Functionality**: Text search across course titles, descriptions, and tags
2. **Category Filtering**: Filter by course categories (Manifestation, Energy Healing, etc.)
3. **Level Filtering**: Filter by difficulty level (beginner, intermediate, advanced)
4. **Responsive Grid**: Course cards adapt to different screen sizes
5. **Empty State**: Helpful messaging when no courses match filters

---

## T037: CourseCard Component

*Implementation: `src/components/CourseCard.astro`*

### **Component Analysis**

The `CourseCard` component is a perfect example of modern component design principles. Let's break down its implementation:

```astro
---
/**
 * CourseCard Component
 * 
 * Displays a course preview card with image, title, instructor, price,
 * rating, and enrollment information. Used in course listings and grids.
 */

import type { Course } from '@/types';

interface Props {
  course: Course;
  showDescription?: boolean;
  variant?: 'default' | 'compact';
}

const { course, showDescription = false, variant = 'default' } = Astro.props;
```

### **Why TypeScript Props Interface?**

The Props interface provides several benefits:

1. **Type Safety**: Prevents passing incorrect data to the component
2. **Documentation**: Interface serves as built-in documentation
3. **IntelliSense**: IDEs can provide autocomplete and error checking
4. **Refactoring Safety**: Changes to props are caught at compile time

### **Component Flexibility**

The component supports two variants demonstrating flexible design:

```astro
<article class:list={[
  'flex h-full flex-col overflow-hidden rounded-xl bg-background shadow-md transition-all duration-base hover:-translate-y-1 hover:shadow-xl',
  variant === 'compact' ? 'flex-row h-auto' : ''
]}>
```

**Default Variant**: Vertical card layout for grid displays
**Compact Variant**: Horizontal layout for list views or sidebars

### **Helper Functions Pattern**

The component includes several utility functions:

```astro
// Format price (cents to dollars)
const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

// Format duration (seconds to hours/minutes)
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
};
```

**Why Helper Functions in Components?**

1. **Encapsulation**: Logic stays close to where it's used
2. **Reusability**: Functions can be extracted to utilities if needed elsewhere
3. **Testability**: Functions can be tested independently
4. **Readability**: Template remains clean with descriptive function names

### **Image Handling & Performance**

```astro
<img
  src={imageUrl}
  alt={course.title}
  class="h-full w-full object-cover transition-transform duration-slow group-hover:scale-105"
  loading="lazy"
/>
```

**Performance Optimizations**:
- `loading="lazy"`: Images load only when needed (reduces initial page load)
- `object-cover`: Maintains aspect ratio without distortion
- Fallback image handling with placeholder

### **Interactive Elements**

The component includes several interactive features:

```astro
{course.previewVideoUrl && (
  <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-base group-hover:opacity-100">
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="rgba(255, 255, 255, 0.9)" />
      <path d="M18 14 L18 34 L34 24 Z" fill="var(--color-primary)" />
    </svg>
  </div>
)}
```

**Progressive Disclosure**: Preview video button only appears on hover, reducing visual clutter while maintaining functionality.

### **Responsive Design**

```astro
<style>
  /* Responsive adjustments for compact variant */
  @media (max-width: 640px) {
    article.flex-row {
      flex-direction: column;
    }
    
    article.flex-row a[class*="w-[200px]"] {
      width: 100%;
      aspect-ratio: 16 / 9;
    }
  }
</style>
```

**Mobile-First Approach**: Compact variant becomes vertical on small screens for better usability.

### **Data Display Patterns**

The component demonstrates several data display patterns:

```astro
<!-- Conditional Rendering -->
{course.instructorName && (
  <div class="flex items-center gap-sm">
    {course.instructorAvatar && (
      <img src={course.instructorAvatar} alt={course.instructorName} />
    )}
    <span>{course.instructorName}</span>
  </div>
)}

<!-- Array Slicing with Overflow Indicator -->
{course.tags.slice(0, 3).map((tag) => (
  <span>{tag}</span>
))}
{course.tags.length > 3 && (
  <span>+{course.tags.length - 3}</span>
)}
```

**Why These Patterns?**

1. **Graceful Degradation**: UI works even with missing data
2. **Visual Hierarchy**: Most important information is always visible
3. **Space Management**: Prevents UI breaking with too much content

---

## T038: Course Detail Page

*Implementation: `src/pages/courses/[id].astro`*

### **Dynamic Routing with Astro**

The `[id].astro` filename creates a dynamic route where `id` becomes a parameter:

```astro
// Get the course ID from the URL
const { id } = Astro.params;
```

**URL Examples**:
- `/courses/quantum-manifestation-mastery` → `id = "quantum-manifestation-mastery"`
- `/courses/chakra-awakening-journey` → `id = "chakra-awakening-journey"`

### **Why Use Slugs Instead of Numeric IDs?**

The URLs use human-readable slugs instead of numeric IDs:

**SEO Benefits**:
- Search engines prefer descriptive URLs
- Users can understand content from the URL
- Better social media sharing experience

**User Experience**:
- URLs are memorable and shareable
- URLs give context about the content
- Clean URLs feel more professional

### **Data Fetching Pattern**

```astro
// For now, use mock data (database not configured)
// In production, this would fetch from: GET /api/courses/:id
let course: Course | null = null;
let error: string | null = null;

// Mock course data - matches the format from homepage
const mockCourses: Record<string, Course> = {
  'quantum-manifestation-mastery': {
    // ... course data
  }
};

// Get course by slug (id parameter)
if (id && mockCourses[id]) {
  course = mockCourses[id];
} else {
  error = 'Course not found';
}

// If no course found, return 404
if (!course) {
  return Astro.redirect('/404');
}
```

**Why This Pattern?**

1. **Error Handling**: Gracefully handles missing courses
2. **404 Redirect**: Proper HTTP status for non-existent content
3. **Type Safety**: Course is guaranteed to exist in template
4. **Future-Proof**: Easy to replace mock data with API calls

### **Page Structure Analysis**

The course detail page follows a clear information hierarchy:

#### **Header Section**
```astro
<section class="course-header">
  <!-- Breadcrumb Navigation -->
  <nav class="breadcrumb">
    <a href="/">Home</a>
    <span>/</span>
    <a href="/courses">Courses</a>
    <span>/</span>
    <span>{course.title}</span>
  </nav>
  
  <!-- Course Information -->
  <h1>{course.title}</h1>
  <p class="subtitle">{course.description}</p>
  
  <!-- Meta Information -->
  <div class="course-meta">
    <!-- Rating, enrollment count, duration, level -->
  </div>
</section>
```

**Why This Structure?**

1. **Navigation Context**: Breadcrumbs help users understand their location
2. **Information Hierarchy**: Most important info (title) comes first
3. **Social Proof**: Rating and enrollment count build trust
4. **Quick Assessment**: Users can quickly determine if course fits their needs

#### **Two-Column Layout**
```astro
<div class="header-content">
  <!-- Left: Course Info -->
  <div class="course-info">
    <!-- Course details, instructor, meta info -->
  </div>

  <!-- Right: Course Image & CTA -->
  <div class="course-preview">
    <!-- Image, preview button, purchase card -->
  </div>
</div>
```

**Layout Benefits**:
- **F-Pattern Reading**: Left column follows natural reading flow
- **Sticky CTA**: Purchase card stays visible during scrolling
- **Visual Balance**: Image breaks up text-heavy content

### **Content Sections**

The page includes several content sections:

#### **Learning Outcomes**
```astro
<ul class="learning-outcomes">
  {course.learningOutcomes.map((outcome) => (
    <li>
      <span class="checkmark">✓</span>
      <span>{outcome}</span>
    </li>
  ))}
</ul>
```

**Why Check Marks?**: Visual pattern recognition - users quickly identify benefits

#### **Interactive Curriculum**
```astro
<details class="curriculum-section-item" open={sectionIndex === 0}>
  <summary class="section-header">
    <div class="section-info">
      <span class="section-icon">▶</span>
      <span class="section-title">{section.title}</span>
    </div>
    <span class="section-meta">
      {section.lessons.length} lectures • {formatDuration(totalTime)}
    </span>
  </summary>
  <!-- Lesson list -->
</details>
```

**Why `<details>` Elements?**

1. **No JavaScript Required**: Works with HTML alone
2. **Accessible**: Screen readers understand the structure
3. **Progressive Enhancement**: JavaScript can enhance the experience
4. **Performance**: Only first section opens by default

### **Responsive Design Strategy**

```css
@media (max-width: 1024px) {
  .header-content {
    grid-template-columns: 1fr;
  }

  .course-preview {
    position: static;
    max-width: 500px;
    margin: 0 auto;
  }
}
```

**Mobile-First Principles**:
- Stack layout on smaller screens
- Center purchase card for better usability
- Maintain sticky behavior where appropriate

### **SEO Optimization**

```astro
<BaseLayout
  title={course.title}
  description={course.description}
  keywords={course.tags.join(', ')}
  ogImage={course.imageUrl}
>
```

**SEO Benefits**:
- **Dynamic Meta Tags**: Each course has unique SEO data
- **Open Graph**: Social media previews work correctly
- **Keywords**: Course tags become SEO keywords
- **Image SEO**: Course image appears in social shares

---

## T039: Add-to-Cart Functionality

*Implementation: JavaScript in `src/pages/courses/[id].astro`*

### **Progressive Enhancement Approach**

The add-to-cart functionality follows progressive enhancement principles:

```astro
<!-- Add to Cart button -->
<button 
  class="btn-primary btn-add-cart" 
  data-course-id={course.id}
  data-course-title={course.title}
  data-course-price={course.price}
>
  <span class="btn-text">Add to Cart</span>
  <span class="btn-loading" style="display: none;">Adding...</span>
</button>
```

**Data Attributes Pattern**: Course information is stored in HTML data attributes, making it accessible to JavaScript without hardcoding IDs.

### **JavaScript Implementation Analysis**

#### **Cart State Management**

```javascript
// Get cart item count from session storage or default to 0
function getCartCount(): number {
  const count = sessionStorage.getItem('cartItemCount');
  return count ? parseInt(count, 10) : 0;
}

// Update cart count in session storage and header
function updateCartCount(count: number): void {
  sessionStorage.setItem('cartItemCount', count.toString());
  
  // Update header cart count if element exists
  const cartCountElement = document.querySelector('.cart-count');
  if (cartCountElement) {
    cartCountElement.textContent = count.toString();
    if (count > 0) {
      cartCountElement.classList.add('has-items');
    }
  }
}
```

**Why Session Storage?**

1. **Persistence**: Cart survives page refreshes
2. **Speed**: Immediate updates without server requests
3. **Fallback**: Works when API is unavailable
4. **Privacy**: Data stays on user's device

#### **Optimistic UI Updates**

```javascript
// For now, simulate API call since cart API endpoints (T042) not yet implemented
await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

// TODO: Replace with actual API call when T042 is implemented:
// const response = await fetch('/api/cart/add', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({
//     itemType: 'course',
//     itemId: courseId,
//     quantity: 1
//   })
// });
```

**Why Optimistic Updates?**

1. **Perceived Performance**: UI responds immediately
2. **Better UX**: Users don't wait for server confirmation
3. **Fallback Handling**: Can revert if API call fails
4. **Progressive**: Works with or without backend

#### **Loading States**

```javascript
// Show loading state
const btnText = button.querySelector('.btn-text') as HTMLElement;
const btnLoading = button.querySelector('.btn-loading') as HTMLElement;

if (btnText && btnLoading) {
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
}
button.disabled = true;
```

**Loading State Benefits**:
- **User Feedback**: Clear indication that action is processing
- **Prevents Double-Clicks**: Disabled button prevents duplicate requests
- **Professional Feel**: Smooth transitions feel polished

#### **Success Feedback**

```javascript
// Show success message
function showSuccess(button: HTMLButtonElement): void {
  const successMsg = document.querySelector('.add-to-cart-success') as HTMLElement;
  if (successMsg) {
    successMsg.style.display = 'flex';
    
    // Hide after 3 seconds
    setTimeout(() => {
      successMsg.style.display = 'none';
    }, 3000);
  }
}
```

**Success Message with Animation**:
```css
.add-to-cart-success {
  display: none;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-success-light);
  border: 1px solid var(--color-success);
  border-radius: var(--radius-md);
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--spacing-lg);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### **Error Handling**

```javascript
try {
  // ... add to cart logic
} catch (error) {
  console.error('Error adding to cart:', error);
  
  // Show error message
  alert('Failed to add to cart. Please try again.');
  
  // Reset button
  if (btnText && btnLoading) {
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
  button.disabled = false;
}
```

**Error Handling Strategy**:
1. **Graceful Degradation**: System remains functional
2. **User Communication**: Clear error messages
3. **State Recovery**: UI returns to previous state
4. **Logging**: Errors are captured for debugging

### **Buy Now Integration**

```javascript
// Handle Buy Now button click
async function handleBuyNow(button: HTMLButtonElement): Promise<void> {
  const courseId = button.dataset.courseId;

  if (!courseId) {
    console.error('Course ID not found');
    return;
  }

  // Add to cart first
  const addToCartBtn = document.querySelector('.btn-add-cart') as HTMLButtonElement;
  if (addToCartBtn) {
    await handleAddToCart(addToCartBtn);
  }

  // Redirect to cart/checkout page
  setTimeout(() => {
    alert('Redirecting to checkout... (Cart page will be implemented in T040)');
    // TODO: Replace with actual redirect when T040 is implemented:
    // window.location.href = '/cart';
  }, 500);
}
```

**Buy Now Flow**:
1. Add item to cart
2. Redirect to checkout
3. Maintains cart state for consistency

---

## Complete Course Browsing Flow

### **User Journey Analysis**

The complete course browsing experience follows this flow:

1. **Discovery** → Course catalog page with filtering
2. **Exploration** → Course detail page with comprehensive information
3. **Decision** → Add to cart or buy now
4. **Purchase** → Cart and checkout (implemented in later tasks)

### **Data Flow Between Components**

```
Course Data (API/Mock)
    ↓
CourseCard Component (List View)
    ↓
Course Detail Page (Full View)
    ↓
Add to Cart (JavaScript)
    ↓
Cart State (Session Storage)
    ↓
Cart Page (Future Implementation)
```

### **State Management Strategy**

**Session Storage for Cart**:
```javascript
// Store cart item in session storage (temporary until API is ready)
const cartItems = JSON.parse(sessionStorage.getItem('cartItems') || '[]');
const existingItem = cartItems.find((item: any) => item.itemId === courseId);

if (existingItem) {
  existingItem.quantity += 1;
} else {
  cartItems.push({
    itemType: 'course',
    itemId: courseId,
    itemTitle: courseTitle,
    price: parseInt(coursePrice || '0', 10),
    quantity: 1
  });
}

sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
```

**Why This Approach?**

1. **Immediate Functionality**: Works without backend cart API
2. **Consistent Data Structure**: Matches expected API format
3. **Easy Migration**: Can be replaced with API calls later
4. **Offline Support**: Functions without network connection

### **Performance Considerations**

#### **Image Optimization**

```astro
<img
  src={imageUrl}
  alt={course.title}
  class="preview-image"
  loading="lazy"
/>
```

**Benefits**:
- Lazy loading reduces initial page load time
- Images load as they enter viewport
- Better Core Web Vitals scores

#### **CSS Animation Performance**

```css
.btn-primary:not(:disabled):hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
```

**GPU Acceleration**: `transform` properties use GPU acceleration for smooth animations.

#### **Component Reusability**

```astro
<!-- Different contexts, same component -->
<CourseCard course={course} showDescription={true} />
<CourseCard course={course} variant="compact" />
```

**Code Reuse Benefits**:
- Consistent styling across pages
- Single source of truth for course display logic
- Easier maintenance and updates

---

## Best Practices

### **1. Component Design Principles**

#### **Single Responsibility**
Each component has one clear purpose:
- `CourseCard`: Display course preview information
- Course detail page: Show comprehensive course information
- Add-to-cart: Handle purchase interactions

#### **Props Interface Design**
```astro
interface Props {
  course: Course;
  showDescription?: boolean;
  variant?: 'default' | 'compact';
}
```

**Benefits**:
- Type safety prevents runtime errors
- Optional props provide flexibility
- Variants enable reuse in different contexts

#### **Progressive Enhancement**
```javascript
// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  // JavaScript enhances the experience
  const addToCartBtn = document.querySelector('.btn-add-cart');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', handleAddToCart);
  }
});
```

**Why This Matters**:
- Page functions without JavaScript
- JavaScript enhances the experience
- Accessible to all users and devices

### **2. Performance Optimization**

#### **Lazy Loading Strategy**
```astro
<img loading="lazy" src={course.imageUrl} alt={course.title} />
```

**When to Use**:
- Images below the fold
- Non-critical images
- Large image collections

#### **CSS Custom Properties**
```css
:root {
  --spacing-sm: 0.5rem;
  --color-primary: #7c3aed;
  --transition-fast: 0.15s;
}
```

**Benefits**:
- Consistent spacing and colors
- Easy theme customization
- Better maintainability

### **3. Accessibility Considerations**

#### **Semantic HTML**
```astro
<article class="course-card">
  <h3>{course.title}</h3>
  <p>{course.description}</p>
  <a href={courseUrl}>Learn more</a>
</article>
```

**Why Semantic Elements Matter**:
- Screen readers understand content structure
- Better SEO rankings
- Cleaner, more maintainable code

#### **Keyboard Navigation**
```css
.btn-primary:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

**Focus Management**:
- Visible focus indicators
- Logical tab order
- Keyboard-accessible interactions

### **4. Error Handling Patterns**

#### **Graceful Degradation**
```astro
{course.instructorAvatar && (
  <img src={course.instructorAvatar} alt={course.instructorName} />
)}
```

**Defensive Programming**:
- Check for data existence before rendering
- Provide fallback content when appropriate
- Handle missing images gracefully

#### **User-Friendly Error Messages**
```javascript
catch (error) {
  console.error('Error adding to cart:', error);
  alert('Failed to add to cart. Please try again.');
}
```

**Error Communication**:
- Clear, actionable error messages
- No technical jargon for users
- Helpful suggestions for resolution

### **5. SEO Best Practices**

#### **Dynamic Meta Tags**
```astro
<BaseLayout
  title={course.title}
  description={course.description}
  keywords={course.tags.join(', ')}
  ogImage={course.imageUrl}
>
```

**SEO Benefits**:
- Unique page titles for each course
- Descriptive meta descriptions
- Proper Open Graph tags for social sharing

#### **Structured Data Opportunity**
```astro
<!-- Future enhancement: Course structured data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "{course.title}",
  "description": "{course.description}",
  "provider": {
    "@type": "Organization",
    "name": "Spiritual Learning Platform"
  }
}
</script>
```

### **6. Testing Strategies**

#### **Component Testing**
```javascript
// Example test for CourseCard component
describe('CourseCard', () => {
  it('displays course title and price', () => {
    const course = mockCourse;
    render(<CourseCard course={course} />);
    
    expect(screen.getByText(course.title)).toBeInTheDocument();
    expect(screen.getByText(`$${course.price / 100}`)).toBeInTheDocument();
  });
});
```

#### **Integration Testing**
```javascript
// Example test for add-to-cart functionality
describe('Add to Cart', () => {
  it('updates cart count when item is added', async () => {
    const addButton = screen.getByText('Add to Cart');
    
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(sessionStorage.getItem('cartItemCount')).toBe('1');
    });
  });
});
```

### **7. Future Enhancement Opportunities**

#### **Search Functionality**
- Full-text search across course content
- Search result highlighting
- Search analytics and suggestions

#### **Filtering Enhancements**
- Price range filtering
- Duration filtering
- Instructor filtering
- Advanced search combinations

#### **User Experience Improvements**
- Course comparison feature
- Wishlist functionality
- Recently viewed courses
- Personalized recommendations

#### **Performance Optimizations**
- Image optimization and WebP support
- Service worker for offline functionality
- Progressive loading for large course lists
- Critical CSS inlining

---

## Summary

The course pages implementation demonstrates several important web development concepts:

**Component Architecture**: The `CourseCard` component shows how to build flexible, reusable UI components with TypeScript props and variant support.

**SSR Benefits**: Course detail pages leverage Astro's server-side rendering for SEO optimization and faster initial page loads.

**Progressive Enhancement**: Add-to-cart functionality enhances the base HTML experience with JavaScript while maintaining functionality without it.

**Dynamic Routing**: Astro's `[id].astro` pattern enables clean URLs with proper error handling and 404 redirects.

**State Management**: Session storage provides immediate cart functionality while preparing for future API integration.

**Performance**: Lazy loading, CSS animations, and optimistic UI updates create a smooth user experience.

**Accessibility**: Semantic HTML, keyboard navigation, and screen reader support ensure the interface works for all users.

This implementation provides a solid foundation for course discovery and purchasing while maintaining flexibility for future enhancements and API integration.