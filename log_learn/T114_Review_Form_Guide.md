# T114: Review Submission Form - Learning Guide

**Task**: Create review submission form on course detail pages (for enrolled users)
**Target Audience**: Junior to Senior Developers
**Estimated Reading Time**: 45 minutes
**Difficulty**: Intermediate

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Core Concepts](#core-concepts)
4. [Component Architecture](#component-architecture)
5. [Tutorial: Building the Review Form](#tutorial-building-the-review-form)
6. [Tutorial: API Endpoint](#tutorial-api-endpoint)
7. [Tutorial: Integration](#tutorial-integration)
8. [Tutorial: E2E Testing](#tutorial-e2e-testing)
9. [Best Practices](#best-practices)
10. [Common Pitfalls](#common-pitfalls)
11. [Advanced Techniques](#advanced-techniques)
12. [Further Learning](#further-learning)

---

## Introduction

This guide teaches you how to build a complete review submission system in an Astro application, including:

- **Smart Astro components** with conditional rendering
- **Tailwind CSS** utility-first styling
- **Client-side JavaScript** for interactivity
- **API endpoint** with authentication and validation
- **E2E testing** with Playwright

### What You'll Build

A review form that:
- Shows different UI states based on authentication and purchase status
- Provides an interactive 5-star rating selector
- Validates input client-side and server-side
- Submits reviews via API
- Handles errors gracefully
- Works across all browsers

### Learning Outcomes

By the end of this guide, you'll understand:
- ✅ How to build conditional UI in Astro
- ✅ How to style with Tailwind CSS
- ✅ How to add client-side interactivity
- ✅ How to create secure API endpoints
- ✅ How to write comprehensive E2E tests
- ✅ How to integrate authentication and authorization

---

## Prerequisites

### Required Knowledge
- JavaScript/TypeScript basics
- HTML/CSS fundamentals
- Basic understanding of HTTP requests
- Familiarity with async/await

### Recommended Knowledge
- Astro framework basics
- Tailwind CSS utility classes
- PostgreSQL/SQL queries
- Testing concepts

### Tools Needed
- Node.js 18+
- Code editor (VS Code recommended)
- PostgreSQL database
- Redis (for sessions)

---

## Core Concepts

### 1. Astro Components

**What are they?**
Astro components (.astro files) combine:
- Frontmatter (JavaScript that runs on the server)
- Template (HTML-like markup)
- Styles (optional CSS)
- Scripts (optional client-side JavaScript)

**Structure**:
```astro
---
// Frontmatter (Server-side)
const data = await fetchData();
---

<!-- Template (Rendered) -->
<div>{data.message}</div>

<style>
/* Scoped CSS */
</style>

<script>
// Client-side JavaScript
</script>
```

**Key Features**:
- **Server-first**: Frontmatter runs on the server
- **Zero JS by default**: No JavaScript sent to client
- **Props**: Components accept typed props
- **Conditional rendering**: Use JavaScript expressions

### 2. Tailwind CSS

**Philosophy**: Utility-first CSS framework

**Instead of**:
```css
.button {
  background-color: blue;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
}
```

**You write**:
```html
<button class="bg-blue-600 text-white px-6 py-3 rounded-lg">
  Click me
</button>
```

**Benefits**:
- No naming classes
- Responsive modifiers: `md:text-lg`, `lg:px-8`
- State modifiers: `hover:bg-blue-700`, `focus:ring-2`
- Consistent design system
- Smaller bundle size (unused styles purged)

### 3. Smart Components

**Definition**: Components that adapt their UI based on props

**Example**:
```astro
---
interface Props {
  user: User | null;
  hasAccess: boolean;
}
const { user, hasAccess } = Astro.props;
---

{!user && <LoginPrompt />}
{user && !hasAccess && <UpgradePrompt />}
{user && hasAccess && <Content />}
```

**Benefits**:
- Single component for multiple states
- Easier to maintain
- Consistent user experience
- Simpler integration

### 4. Client-Side Interactivity

**When to use**:
- Form interactions (validation, dynamic UI)
- Real-time updates
- Animations
- User input handling

**Astro approach**:
```astro
<script>
// This runs in the browser
const button = document.getElementById('myButton');
button.addEventListener('click', () => {
  // Handle click
});
</script>
```

**Key Point**: Script tag content is bundled and sent to client

### 5. Authentication & Authorization

**Authentication**: Who are you?
- Validates user identity
- HTTP 401 if fails

**Authorization**: What can you do?
- Validates permissions
- HTTP 403 if fails

**In our app**:
```typescript
// Authentication
const session = await getSessionFromRequest(cookies);
if (!session) throw new AuthenticationError();

// Authorization
if (requestUserId !== session.userId) {
  throw new AuthorizationError();
}
```

---

## Component Architecture

### ReviewForm Component Structure

```
ReviewForm.astro
├── Frontmatter (Props interface)
├── Conditional Rendering
│   ├── Login Prompt (not authenticated)
│   ├── Purchase Prompt (not purchased)
│   ├── Existing Review Display (already reviewed)
│   └── Review Form (can submit)
├── Form Elements
│   ├── Star Rating Selector
│   ├── Comment Textarea
│   ├── Error Messages
│   └── Submit Button
└── Client Script
    ├── Star Rating Logic
    ├── Character Counter
    └── Form Submission
```

### Data Flow

```
User Action
    ↓
Client-side Validation
    ↓
API Request
    ↓
Server-side Validation
    ↓
Authentication Check
    ↓
Authorization Check
    ↓
Business Logic (ReviewService)
    ↓
Database Insert
    ↓
Success Response
    ↓
Page Reload
    ↓
Updated UI
```

---

## Tutorial: Building the Review Form

### Step 1: Create Component File

Create `src/components/ReviewForm.astro`:

```astro
---
/**
 * ReviewForm Component
 * Handles review submission for courses
 */

interface Props {
  courseId: string;
  userId: string | null;
  hasPurchased: boolean;
  existingReview?: {
    id: string;
    rating: number;
    comment: string;
    isApproved: boolean;
  } | null;
}

const { courseId, userId, hasPurchased, existingReview } = Astro.props;
---

<div class="bg-white rounded-lg shadow-md p-6 mb-8">
  <h2 class="text-2xl font-bold text-gray-900 mb-4">Write a Review</h2>

  <!-- We'll add content here -->
</div>
```

**Explanation**:
- `interface Props` defines what data component needs
- `Astro.props` destructures the props
- `class="..."` uses Tailwind utility classes

### Step 2: Add Login Prompt State

```astro
{!userId && (
  <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
    <p class="text-blue-800">
      Please <a href="/login" class="font-semibold underline hover:text-blue-900">log in</a> to write a review.
    </p>
  </div>
)}
```

**Explanation**:
- `{!userId && ...}` only renders if `userId` is null/undefined
- `bg-blue-50` = light blue background
- `border border-blue-200` = blue border
- `rounded-md` = medium border radius
- `p-4` = padding on all sides
- `hover:text-blue-900` = darker blue on hover

**Tailwind Classes Breakdown**:
```
bg-blue-50           → background-color: rgb(239 246 255)
border               → border-width: 1px
border-blue-200      → border-color: rgb(191 219 254)
rounded-md           → border-radius: 0.375rem
p-4                  → padding: 1rem
text-blue-800        → color: rgb(30 64 175)
font-semibold        → font-weight: 600
underline            → text-decoration: underline
hover:text-blue-900  → color on hover: rgb(30 58 138)
```

### Step 3: Add Purchase Required State

```astro
{userId && !hasPurchased && !existingReview && (
  <div class="bg-amber-50 border border-amber-200 rounded-md p-4">
    <p class="text-amber-800">
      You must purchase this course before you can write a review.
    </p>
  </div>
)}
```

**Explanation**:
- Multiple conditions: user is logged in BUT hasn't purchased
- `amber` colors = warning/attention
- Same structure as login prompt

### Step 4: Add Existing Review Display

```astro
{existingReview && (
  <div class="bg-green-50 border border-green-200 rounded-md p-4">
    <p class="text-green-800 font-semibold mb-2">You have already reviewed this course</p>
    <div class="flex items-center gap-2 mb-2">
      <span class="text-sm text-gray-600">Your rating:</span>
      <div class="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
          <svg
            class={`w-5 h-5 ${star <= (existingReview?.rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    </div>
    {existingReview?.comment && (
      <div class="text-sm text-gray-700 mt-2">
        <span class="font-semibold">Your review:</span>
        <p class="mt-1 italic">&ldquo;{existingReview.comment}&rdquo;</p>
      </div>
    )}
  </div>
)}
```

**Explanation**:
- `Array.from({ length: 5 })` creates array [1,2,3,4,5]
- `.map()` renders a star for each number
- Conditional class: filled if `star <= rating`, gray otherwise
- `existingReview?.comment &&` only shows if comment exists
- `&ldquo;` and `&rdquo;` are smart quotes

**New Tailwind Classes**:
```
flex             → display: flex
items-center     → align-items: center
gap-2            → gap: 0.5rem (space between flex items)
w-5 h-5          → width and height: 1.25rem
text-sm          → font-size: 0.875rem
mt-2             → margin-top: 0.5rem
italic           → font-style: italic
```

### Step 5: Add Star Rating Selector

```astro
{canSubmitReview && (
  <form id="review-form" class="space-y-6">
    <input type="hidden" name="courseId" value={courseId} />
    <input type="hidden" name="userId" value={userId} />

    <!-- Rating Selection -->
    <div>
      <label class="block text-sm font-semibold text-gray-700 mb-2">
        Rating <span class="text-red-500">*</span>
      </label>
      <div class="flex gap-2 items-center">
        <div id="star-rating" class="flex gap-1 cursor-pointer">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((star) => (
            <button
              type="button"
              data-star={star}
              class="star-button focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            >
              <svg
                class="w-10 h-10 text-gray-300 hover:text-yellow-400 transition-colors duration-150"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
        <span id="rating-text" class="text-sm text-gray-600 ml-2"></span>
      </div>
      <input type="hidden" id="rating-input" name="rating" value="" required />
      <p id="rating-error" class="text-red-500 text-sm mt-1 hidden">Please select a rating</p>
    </div>
  </form>
)}
```

**Explanation**:
- `canSubmitReview` is computed: `userId && hasPurchased && !existingReview`
- Hidden inputs store `courseId` and `userId`
- `type="button"` prevents form submission on click
- `data-star={star}` stores star number for JavaScript
- `hidden` class initially hides error message
- Hidden `rating-input` stores selected value for form submission

**Focus/Accessibility Classes**:
```
focus:outline-none        → Remove default outline
focus:ring-2              → Add 2px focus ring
focus:ring-blue-500       → Blue color for ring
focus:ring-offset-2       → 2px offset from element
cursor-pointer            → Show pointer cursor
transition-colors         → Smooth color transitions
duration-150              → 150ms transition
```

### Step 6: Add Comment Textarea

```astro
<div>
  <label for="comment" class="block text-sm font-semibold text-gray-700 mb-2">
    Your Review (Optional)
  </label>
  <textarea
    id="comment"
    name="comment"
    rows="5"
    maxlength="1000"
    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
    placeholder="Share your experience with this course..."
  ></textarea>
  <div class="flex justify-between items-center mt-1">
    <p class="text-xs text-gray-500">Maximum 1000 characters</p>
    <p id="char-count" class="text-xs text-gray-500">0 / 1000</p>
  </div>
</div>
```

**Explanation**:
- `maxlength="1000"` enforces limit in HTML
- `resize-none` prevents textarea resizing
- `focus:border-transparent` removes border color on focus (ring shows instead)
- Character counter updated by JavaScript

**Form Input Classes**:
```
w-full                  → width: 100%
px-4 py-3               → padding: 1rem (x) and 0.75rem (y)
border border-gray-300  → 1px gray border
rounded-lg              → large border radius
resize-none             → resize: none
justify-between         → justify-content: space-between
text-xs                 → font-size: 0.75rem
```

### Step 7: Add Submit Button

```astro
<div>
  <button
    type="submit"
    id="submit-button"
    class="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
  >
    <span id="submit-text">Submit Review</span>
    <span id="submit-loading" class="hidden">
      <svg class="animate-spin h-5 w-5 inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Submitting...
    </span>
  </button>
</div>
```

**Explanation**:
- Two spans: one for normal state, one for loading
- Loading span initially hidden
- JavaScript toggles visibility

**Button State Classes**:
```
disabled:bg-gray-400        → Background color when disabled
disabled:cursor-not-allowed → Show not-allowed cursor when disabled
animate-spin                → Rotate animation
inline-block                → Display inline-block (for SVG)
```

### Step 8: Add Client-Side JavaScript

```astro
<script>
  // Star rating functionality
  const starRating = document.getElementById('star-rating');
  const ratingInput = document.getElementById('rating-input') as HTMLInputElement;
  const ratingText = document.getElementById('rating-text');
  const ratingError = document.getElementById('rating-error');
  const stars = document.querySelectorAll('.star-button');

  let selectedRating = 0;

  // Star rating interaction
  stars.forEach((star, index) => {
    const starButton = star as HTMLButtonElement;
    const starValue = index + 1;

    // Click to select rating
    starButton.addEventListener('click', (e) => {
      e.preventDefault();
      selectedRating = starValue;
      updateStarDisplay();
      if (ratingInput) ratingInput.value = selectedRating.toString();
      if (ratingError) ratingError.classList.add('hidden');
    });

    // Hover effects
    starButton.addEventListener('mouseenter', () => {
      highlightStars(starValue);
    });

    starButton.addEventListener('mouseleave', () => {
      highlightStars(selectedRating);
    });
  });

  function highlightStars(count: number) {
    stars.forEach((star, index) => {
      const svg = star.querySelector('svg');
      if (svg) {
        if (index < count) {
          svg.classList.remove('text-gray-300');
          svg.classList.add('text-yellow-400');
        } else {
          svg.classList.remove('text-yellow-400');
          svg.classList.add('text-gray-300');
        }
      }
    });

    // Update text display
    if (ratingText && count > 0) {
      const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
      ratingText.textContent = labels[count - 1];
    } else if (ratingText) {
      ratingText.textContent = '';
    }
  }

  function updateStarDisplay() {
    highlightStars(selectedRating);
  }
</script>
```

**Explanation**:
- Query all necessary elements
- Add click listener to each star
- Add hover listeners for preview
- `highlightStars()` updates star colors
- `updateStarDisplay()` shows selected rating

**Key Points**:
- `e.preventDefault()` stops form submission
- `classList.add/remove()` toggles Tailwind classes
- State stored in `selectedRating` variable

### Step 9: Add Character Counter

```astro
<script>
  // (continued from previous script)

  // Character counter
  const commentTextarea = document.getElementById('comment') as HTMLTextAreaElement;
  const charCount = document.getElementById('char-count');

  if (commentTextarea && charCount) {
    commentTextarea.addEventListener('input', () => {
      const count = commentTextarea.value.length;
      charCount.textContent = `${count} / 1000`;

      // Change color when approaching limit
      if (count > 900) {
        charCount.classList.add('text-red-500');
        charCount.classList.remove('text-gray-500');
      } else {
        charCount.classList.remove('text-red-500');
        charCount.classList.add('text-gray-500');
      }
    });
  }
</script>
```

**Explanation**:
- `input` event fires on every change
- Update counter text
- Change color to red when > 900 characters

### Step 10: Add Form Submission

```astro
<script>
  // (continued from previous script)

  // Form submission
  const form = document.getElementById('review-form') as HTMLFormElement;
  const submitButton = document.getElementById('submit-button') as HTMLButtonElement;
  const submitText = document.getElementById('submit-text');
  const submitLoading = document.getElementById('submit-loading');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate rating
      if (!selectedRating || selectedRating < 1 || selectedRating > 5) {
        if (ratingError) {
          ratingError.classList.remove('hidden');
        }
        return;
      }

      // Show loading state
      if (submitButton) submitButton.disabled = true;
      if (submitText) submitText.classList.add('hidden');
      if (submitLoading) submitLoading.classList.remove('hidden');

      try {
        const formData = new FormData(form);
        const data = {
          courseId: formData.get('courseId'),
          userId: formData.get('userId'),
          rating: selectedRating,
          comment: formData.get('comment') || undefined,
        };

        const response = await fetch('/api/reviews/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || 'Failed to submit review');
        }

        // Show success and reload
        alert('Thank you for your review!');
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } catch (error) {
        alert(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        // Reset button state
        if (submitButton) submitButton.disabled = false;
        if (submitText) submitText.classList.remove('hidden');
        if (submitLoading) submitLoading.classList.add('hidden');
      }
    });
  }
</script>
```

**Explanation**:
- `e.preventDefault()` stops default form submission
- Validate rating client-side
- Show loading state (disable button, show spinner)
- Create JSON payload
- Send POST request to API
- Handle success/error
- Always reset button state in `finally` block

---

## Tutorial: API Endpoint

### Step 1: Create Endpoint File

Create `src/pages/api/reviews/submit.ts`:

```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  // We'll add logic here
};
```

**Explanation**:
- `APIRoute` type from Astro
- `POST` export creates POST endpoint
- Receives `request` and `cookies` objects

### Step 2: Add Authentication Check

```typescript
import { getSessionFromRequest } from '@/lib/auth/session';
import { AuthenticationError } from '@/lib/errors';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    const session = await getSessionFromRequest(cookies);
    if (!session) {
      throw new AuthenticationError('You must be logged in to submit a review');
    }

    // Continue...
  } catch (error) {
    // Error handling
  }
};
```

**Explanation**:
- `getSessionFromRequest()` checks session cookie
- Returns `SessionData` or `null`
- Throw `AuthenticationError` if not logged in

### Step 3: Parse and Validate Input

```typescript
import { ValidationError } from '@/lib/errors';

// Inside try block:

// Parse request body
let body: any;
try {
  body = await request.json();
} catch (err) {
  throw new ValidationError('Invalid JSON in request body');
}

const { courseId, rating, comment } = body;

// Validate courseId
if (!courseId || typeof courseId !== 'string') {
  throw new ValidationError('Course ID is required');
}

// Validate rating
if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
  throw new ValidationError('Rating must be a number between 1 and 5');
}

// Validate comment (optional)
if (comment !== undefined && comment !== null) {
  if (typeof comment !== 'string') {
    throw new ValidationError('Comment must be a string');
  }
  if (comment.length > 1000) {
    throw new ValidationError('Comment must not exceed 1000 characters');
  }
}
```

**Explanation**:
- Try to parse JSON body
- Validate each field's type and value
- Throw `ValidationError` with descriptive message
- Comment is optional, only validate if provided

### Step 4: Add Authorization Check

```typescript
import { AuthorizationError } from '@/lib/errors';

// Inside try block, after validation:

// Verify that the request userId matches the session userId
const requestUserId = body.userId;
if (requestUserId && requestUserId !== session.userId) {
  throw new AuthorizationError('You can only submit reviews for yourself');
}
```

**Explanation**:
- Check if user is trying to submit as someone else
- Prevents privilege escalation
- Returns 403 if mismatch

### Step 5: Call Business Logic

```typescript
import { ReviewService } from '@/lib/reviews';
import { pool } from '@/lib/db';

// Inside try block:

// Create review using ReviewService
const reviewService = new ReviewService(pool);
const review = await reviewService.createReview({
  userId: session.userId,
  courseId,
  rating,
  comment: comment || undefined,
});
```

**Explanation**:
- Delegate to `ReviewService` (from T113)
- Service handles purchase verification
- Service handles duplicate checking
- Service inserts into database

### Step 6: Return Success Response

```typescript
// Return success response
return new Response(
  JSON.stringify({
    success: true,
    review: {
      id: review.id,
      userId: review.user_id,
      courseId: review.course_id,
      rating: review.rating,
      comment: review.comment,
      isApproved: review.is_approved,
      createdAt: review.created_at,
    },
  }),
  {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
    },
  }
);
```

**Explanation**:
- HTTP 201 = Created
- Return review data in JSON
- Set `Content-Type` header

### Step 7: Add Error Handling

```typescript
import { normalizeError, logError } from '@/lib/errors';

// In catch block:

} catch (error) {
  // Log error
  logError(error, {
    endpoint: 'POST /api/reviews/submit',
    timestamp: new Date().toISOString(),
  });

  // Normalize error response
  const normalizedError = normalizeError(error);

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message: normalizedError.message,
        code: normalizedError.code,
      },
    }),
    {
      status: normalizedError.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
```

**Explanation**:
- `logError()` writes to console/log file
- `normalizeError()` converts any error to standard format
- Returns appropriate HTTP status code
- Returns consistent error format

---

## Tutorial: Integration

### Step 1: Import Dependencies

In `src/pages/courses/[id].astro`:

```astro
---
import ReviewForm from '@/components/ReviewForm.astro';
import { getSessionFromRequest } from '@/lib/auth/session';
import { pool } from '@/lib/db';
---
```

### Step 2: Get User Session

```astro
---
// ... existing code ...

// Get current user session
const session = await getSessionFromRequest(Astro.cookies);
---
```

**Explanation**:
- Runs on server during page render
- Checks session cookie
- Returns user data or null

### Step 3: Check Purchase Status

```astro
---
// ... existing code ...

let hasPurchased = false;

if (session && course) {
  try {
    const purchaseResult = await pool.query(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.course_id = $2 AND o.status = 'completed'
       LIMIT 1`,
      [session.userId, course.id]
    );
    hasPurchased = purchaseResult.rows.length > 0;
  } catch (err) {
    console.error('Error checking purchase status:', err);
  }
}
---
```

**Explanation**:
- Query joins `order_items` and `orders`
- Checks for completed order
- `LIMIT 1` stops after first match (efficient)
- Sets `hasPurchased` boolean

### Step 4: Check Existing Review

```astro
---
// ... existing code ...

let existingReview = null;

if (session && course) {
  try {
    const reviewResult = await pool.query(
      `SELECT id, rating, comment, is_approved
       FROM reviews
       WHERE user_id = $1 AND course_id = $2
       LIMIT 1`,
      [session.userId, course.id]
    );

    if (reviewResult.rows.length > 0) {
      const review = reviewResult.rows[0];
      existingReview = {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        isApproved: review.is_approved,
      };
    }
  } catch (err) {
    console.error('Error checking existing review:', err);
  }
}
---
```

**Explanation**:
- Query reviews table
- Transform snake_case to camelCase
- Store in `existingReview` object

### Step 5: Render Component

```astro
<!-- In template -->
<ReviewForm
  courseId={course.id}
  userId={session?.userId || null}
  hasPurchased={hasPurchased}
  existingReview={existingReview}
/>
```

**Explanation**:
- Pass all required props
- `session?.userId || null` handles undefined session
- Component decides what to render

---

## Tutorial: E2E Testing

### Step 1: Create Test File

Create `tests/e2e/T114_review_form.spec.ts`:

```typescript
import { test, expect, type Page } from '@playwright/test';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'spirituality_platform',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
});
```

**Explanation**:
- Import Playwright test utilities
- Import `pg` for database access
- Load environment variables
- Create database pool

### Step 2: Create Helper Functions

```typescript
// Helper to generate unique test user
const generateTestUser = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return {
    name: `Test User ${timestamp}`,
    email: `test.review.${timestamp}.${random}@example.com`,
    password: 'TestPassword123!',
  };
};

// Helper to register and login
async function registerAndLogin(page: Page, user: { name: string; email: string; password: string }) {
  await page.goto('/register');
  await page.fill('input[name="name"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirm_password"]', user.password);
  await page.check('input[name="terms"]');
  await Promise.all([
    page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);

  if (page.url().includes('/login')) {
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await Promise.all([
      page.waitForURL('/dashboard', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);
  }
}

// Helper to cleanup
async function cleanupTestUser(email: string) {
  const userId = await getUserId(email);
  if (userId) {
    await pool.query('DELETE FROM reviews WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [userId]);
    await pool.query('DELETE FROM orders WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }
}
```

**Explanation**:
- Helpers reduce code duplication
- `generateTestUser()` creates unique email
- `registerAndLogin()` handles full auth flow
- `cleanupTestUser()` removes test data

### Step 3: Write First Test

```typescript
test.describe('Review Form - Visibility', () => {
  test('should show login prompt for unauthenticated users', async ({ page }) => {
    await page.goto('/courses/quantum-manifestation-mastery');

    // Should see login prompt
    await expect(page.locator('text=Please log in to write a review')).toBeVisible();
    await expect(page.locator('.bg-blue-50 a[href="/login"]')).toBeVisible();

    // Should NOT see the form
    await expect(page.locator('#review-form')).not.toBeVisible();
  });
});
```

**Explanation**:
- `test.describe()` groups related tests
- `test()` defines a single test case
- `page.goto()` navigates to URL
- `page.locator()` finds elements
- `expect(...).toBeVisible()` asserts element is visible
- `.not.toBeVisible()` asserts element is NOT visible

### Step 4: Test with Setup/Teardown

```typescript
test.describe('Review Form - Submission', () => {
  let user: { name: string; email: string; password: string };
  let userId: string | null;

  test.beforeEach(async ({ page }) => {
    user = generateTestUser();
    await registerAndLogin(page, user);
    userId = await getUserId(user.email);
    expect(userId).not.toBeNull();
    await createCompletedOrder(userId!, testCourseId);
    await page.goto(`/courses/${testCourseSlug}`);
  });

  test.afterEach(async () => {
    await cleanupTestUser(user.email);
  });

  test('should submit review with rating only', async ({ page }) => {
    // Select 5 stars
    await page.locator('.star-button').nth(4).click();

    // Submit form
    await page.click('#submit-button');

    // Should show success message
    await expect(page.locator('#form-success')).toBeVisible({ timeout: 10000 });

    // Verify review in database
    const reviewResult = await pool.query(
      'SELECT * FROM reviews WHERE user_id = $1 AND course_id = $2',
      [userId, testCourseId]
    );
    expect(reviewResult.rows.length).toBe(1);
    expect(reviewResult.rows[0].rating).toBe(5);
  });
});
```

**Explanation**:
- `beforeEach` runs before every test
- Sets up user, order, and navigation
- `afterEach` runs after every test
- Cleans up test data
- `.nth(4)` selects 5th star (0-indexed)
- Verify both UI and database

---

## Best Practices

### 1. Component Design

**DO**:
✅ Use TypeScript interfaces for props
✅ Provide clear prop names
✅ Handle all possible states
✅ Add comments explaining complex logic

**DON'T**:
❌ Use any types
❌ Assume props are always valid
❌ Leave states unhandled
❌ Write unclear prop names

### 2. Tailwind CSS

**DO**:
✅ Use semantic color scales (blue-500, gray-700)
✅ Use responsive modifiers (md:, lg:)
✅ Use state modifiers (hover:, focus:, disabled:)
✅ Group related classes logically

**DON'T**:
❌ Use arbitrary values unless necessary
❌ Forget accessibility (focus states)
❌ Inline custom CSS
❌ Use deprecated classes

### 3. Client-Side JavaScript

**DO**:
✅ Validate on client AND server
✅ Provide visual feedback (loading, errors)
✅ Handle network errors gracefully
✅ Clean up event listeners if needed

**DON'T**:
❌ Trust client-side validation alone
❌ Leave users wondering what's happening
❌ Assume requests always succeed
❌ Create memory leaks

### 4. API Design

**DO**:
✅ Validate all inputs
✅ Check authentication first
✅ Return consistent error format
✅ Use appropriate HTTP status codes
✅ Log errors for debugging

**DON'T**:
❌ Skip input validation
❌ Return sensitive error details
❌ Use wrong status codes
❌ Ignore error logging

### 5. Testing

**DO**:
✅ Test all user flows
✅ Test error cases
✅ Clean up test data
✅ Use realistic test data
✅ Test across browsers

**DON'T**:
❌ Only test happy path
❌ Leave test data in database
❌ Use obviously fake data
❌ Test only in Chrome

---

## Common Pitfalls

### Pitfall 1: Not Handling All States

**Problem**:
```astro
<!-- Missing: what if user is not logged in? -->
<ReviewForm courseId={course.id} />
```

**Solution**:
```astro
<!-- Handle all states -->
{!user && <LoginPrompt />}
{user && !purchased && <PurchasePrompt />}
{user && purchased && !reviewed && <ReviewForm />}
{reviewed && <ExistingReview />}
```

### Pitfall 2: Forgetting to Prevent Default

**Problem**:
```javascript
button.addEventListener('click', () => {
  // Form submits when button clicked
  // Even though we want to handle it ourselves
});
```

**Solution**:
```javascript
button.addEventListener('click', (e) => {
  e.preventDefault();  // ✅ Prevent default form submission
  // Now handle click ourselves
});
```

### Pitfall 3: Client-Only Validation

**Problem**:
```typescript
// Only validate on client
// Attacker can bypass by sending direct API request
```

**Solution**:
```typescript
// Validate on client (UX)
if (!rating) {
  showError('Rating required');
  return;
}

// ALSO validate on server (security)
if (!rating || rating < 1 || rating > 5) {
  throw new ValidationError('Invalid rating');
}
```

### Pitfall 4: Not Cleaning Up Tests

**Problem**:
```typescript
test('create review', async () => {
  await createReview();
  // ❌ Test data left in database
});
```

**Solution**:
```typescript
test.afterEach(async () => {
  await cleanupTestUser(user.email);  // ✅ Always cleanup
});
```

### Pitfall 5: Ambiguous Selectors

**Problem**:
```typescript
// Matches multiple elements
await page.locator('a[href="/login"]').click();
// Error: Found 2 elements!
```

**Solution**:
```typescript
// Be specific
await page.locator('.review-section a[href="/login"]').click();
// Or use test IDs
await page.locator('[data-testid="review-login-link"]').click();
```

---

## Advanced Techniques

### Technique 1: Optimistic UI Updates

**Concept**: Update UI immediately, rollback if API fails

```typescript
// Show success immediately
showSuccess();
form.reset();

try {
  await submitReview();
} catch (error) {
  // Rollback on error
  hideSuccess();
  restoreForm();
  showError(error.message);
}
```

### Technique 2: Debouncing Character Counter

**Concept**: Reduce event handler calls for better performance

```typescript
let timeout: number;

textarea.addEventListener('input', () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    updateCharCount();
  }, 300);  // Wait 300ms after typing stops
});
```

### Technique 3: Server-Side Caching

**Concept**: Cache purchase checks to reduce database queries

```typescript
// In course detail page
const cacheKey = `purchase:${session.userId}:${course.id}`;
let hasPurchased = await redis.get(cacheKey);

if (hasPurchased === null) {
  hasPurchased = await checkPurchaseInDatabase();
  await redis.set(cacheKey, hasPurchased, 'EX', 300);  // Cache 5 min
}
```

### Technique 4: Progressive Enhancement

**Concept**: Work without JavaScript, enhance with JavaScript

```astro
<!-- Works without JS: traditional form submission -->
<form action="/api/reviews/submit" method="POST">
  <select name="rating">
    <option value="1">1 star</option>
    <option value="5">5 stars</option>
  </select>
  <button type="submit">Submit</button>
</form>

<!-- Enhance with JS: AJAX submission -->
<script>
  if ('fetch' in window) {
    // Use AJAX if available
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitViaAjax();
    });
  }
</script>
```

---

## Further Learning

### Related Documentation
- [Astro Components](https://docs.astro.build/en/core-concepts/astro-components/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [PostgreSQL Joins](https://www.postgresql.org/docs/current/tutorial-join.html)

### Related Tasks
- **T113**: ReviewService implementation (business logic)
- **T115**: Review submission API (this builds on it)
- **T116**: Display reviews on course pages
- **T117**: Display reviews on course cards
- **T118**: Admin review moderation

### Practice Exercises

**Exercise 1: Add Edit Functionality**
Modify the form to allow editing existing reviews (if not yet approved)

**Exercise 2: Add Image Upload**
Allow users to upload images with their reviews

**Exercise 3: Add Helpful Votes**
Add "Was this review helpful?" with thumbs up/down

**Exercise 4: Add Review Replies**
Allow instructors to reply to reviews

---

## Summary

You've learned how to build a complete review submission system:

1. ✅ **Smart Astro components** with conditional rendering
2. ✅ **Tailwind CSS** for rapid, responsive styling
3. ✅ **Client-side JavaScript** for interactivity
4. ✅ **Secure API endpoints** with validation
5. ✅ **E2E testing** with Playwright
6. ✅ **Integration** with authentication and database

**Key Takeaways**:
- Smart components handle multiple states elegantly
- Tailwind makes styling fast and consistent
- Always validate on both client and server
- E2E tests validate real user workflows
- Clean up after tests to avoid conflicts

**Next Steps**:
- Build T116 (display reviews)
- Add review sorting/filtering
- Implement admin moderation (T118-T119)
- Add email notifications (T120)

Happy coding! 🚀
