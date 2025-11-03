# T118 & T119: Admin Review Moderation System - Learning Guide

**Date**: November 2, 2025  
**Tasks**: T118 (Admin Pending Reviews Page) + T119 (Approve/Reject API Endpoints)  
**Difficulty**: Intermediate  
**Topics**: Admin interfaces, RESTful APIs, content moderation, real-time UI updates

---

## Table of Contents

1. [What We Built](#what-we-built)
2. [Why Admin Moderation Matters](#why-admin-moderation-matters)
3. [Content Moderation Patterns](#content-moderation-patterns)
4. [Admin Interface Design](#admin-interface-design)
5. [RESTful API Design](#restful-api-design)
6. [Security Layers](#security-layers)
7. [Real-Time UI Updates](#real-time-ui-updates)
8. [Pagination in Admin Panels](#pagination-in-admin-panels)
9. [Filter & Sort Patterns](#filter--sort-patterns)
10. [Toast Notifications](#toast-notifications)
11. [Database Transactions](#database-transactions)
12. [Testing Admin Features](#testing-admin-features)
13. [Code Patterns Reference](#code-patterns-reference)
14. [Common Pitfalls](#common-pitfalls)
15. [Best Practices](#best-practices)

---

## What We Built

### The Problem

After implementing the review system (T113-T117), we had:
- ✅ Users can submit reviews
- ✅ Reviews display on course pages
- ❌ **No way to moderate reviews** before they go live

This created potential issues:
- 🚫 Spam reviews
- 🚫 Inappropriate content
- 🚫 Fake reviews
- 🚫 No quality control

### The Solution

We built a complete admin moderation system with:

**T118 - Admin Interface**:
- Pending reviews list
- Review details (rating, comment, user, course)
- Filtering by rating
- Sorting by date/rating/updates
- Pagination (20 per page)
- Quick approve/reject buttons

**T119 - API Endpoints**:
- `PUT /api/admin/reviews/approve` - Approve a review
- `PUT /api/admin/reviews/reject` - Reject (delete) a review
- Admin authentication required
- Proper error handling

### The Result

Now admins can:
1. View all pending reviews in one place
2. See review context (user, course, rating)
3. Quickly approve good reviews
4. Reject spam/inappropriate content
5. Filter by quality (rating)
6. Process reviews efficiently (pagination)

---

## Why Admin Moderation Matters

### Business Benefits

1. **Quality Control**: Ensure reviews meet standards
2. **Brand Protection**: Prevent inappropriate content
3. **Trust Building**: Users see only verified, quality reviews
4. **Legal Compliance**: Moderate harmful/illegal content
5. **User Experience**: Spam-free review sections

### User-Generated Content Risks

Without moderation, platforms face:

```
❌ Spam: "Buy our product at example.com!!!"
❌ Offensive: Profanity, harassment, hate speech
❌ Fake: Competitors posting negative reviews
❌ Off-topic: "Great weather today!" on a course review
❌ Illegal: Copyright infringement, illegal content
```

### Moderation Approaches

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **Pre-moderation** | High quality, spam-free | Delayed publication | New platforms, high-risk content |
| **Post-moderation** | Fast publication | Requires monitoring | Trusted communities |
| **Auto + Manual** | Efficient, accurate | Complex to build | Large-scale platforms |

**Our Approach**: Pre-moderation (reviews need approval before going live)

---

## Content Moderation Patterns

### Pattern 1: Approval Workflow

```
User Submits Review
        ↓
   Pending State (is_approved = false)
        ↓
   Admin Reviews ← [Admin Interface]
        ↓
    Approve? ────→ Yes → Published (is_approved = true)
        ↓
        No → Deleted (removed from database)
```

**Database State**:
```sql
-- Pending: User submitted, not yet visible
is_approved = false

-- Approved: Admin approved, visible publicly
is_approved = true

-- Rejected: Deleted (no record)
-- (record removed entirely)
```

### Pattern 2: Soft Delete vs Hard Delete

**Soft Delete** (keep record, mark deleted):
```sql
deleted_at = NOW()
```

**Hard Delete** (remove record entirely):
```sql
DELETE FROM reviews WHERE id = $1
```

**Our Choice**: **Hard Delete** for rejected reviews

**Why?**
- No need to keep spam/inappropriate content
- Saves database storage
- Simpler queries (no "WHERE deleted_at IS NULL" everywhere)
- GDPR compliance (right to be forgotten)

**When to use Soft Delete instead**:
- Audit trail required
- Undo functionality needed
- Legal retention requirements
- Analytics on deleted content

---

## Admin Interface Design

### Design Principles

1. **Efficiency First**: Admins process many items quickly
2. **Context at a Glance**: Show all relevant info
3. **Bulk Actions**: Process multiple items simultaneously (future)
4. **Clear Actions**: Obvious approve/reject buttons
5. **Feedback**: Confirm actions with toasts

### Layout Structure

```
┌─────────────────────────────────────────────┐
│  Admin Header (with logout, user info)     │
├─────────────────────────────────────────────┤
│  ┌─────────┐  Main Content Area            │
│  │         │  ┌──────────────────────────┐ │
│  │ Sidebar │  │ Page Header              │ │
│  │         │  │ - Title                  │ │
│  │ - Home  │  │ - Stats (X pending)      │ │
│  │ - Users │  ├──────────────────────────┤ │
│  │ - Cours│  │ Filters & Sort           │ │
│  │   es    │  │ [Min Rating] [Sort By ▼]│ │
│  │ >Review│  ├──────────────────────────┤ │
│  │   s     │  │ Review Cards (20/page)   │ │
│  │         │  │ ┌────────────────────┐   │ │
│  │         │  │ │ ★★★★★              │   │ │
│  │         │  │ │ "Great course!"    │   │ │
│  │         │  │ │ User: John         │   │ │
│  │         │  │ │ Course: Meditation │   │ │
│  │         │  │ │ [Approve] [Reject] │   │ │
│  │         │  │ └────────────────────┘   │ │
│  │         │  ├──────────────────────────┤ │
│  │         │  │ Pagination               │ │
│  │         │  │ [← Prev] 1 2 3 [Next →] │ │
│  └─────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Card Design

Each review card shows:

```astro
<div class="review-card">
  <!-- Star Rating (visual) -->
  <div class="stars">★★★★★</div>
  
  <!-- Review Comment -->
  <p class="comment">"Excellent course! Learned so much."</p>
  
  <!-- Metadata -->
  <div class="meta">
    <span>User: <strong>John Doe</strong></span>
    <span>Course: <strong>Intro to Meditation</strong></span>
    <span>Date: Nov 1, 2025</span>
    <span class="badge">✓ Verified Purchase</span>
  </div>
  
  <!-- Actions -->
  <div class="actions">
    <button class="approve">✓ Approve</button>
    <button class="reject">✗ Reject</button>
  </div>
</div>
```

**Design Decisions**:
- **Star Rating First**: Most important for quality assessment
- **Comment Front and Center**: Main content to evaluate
- **Verified Purchase Badge**: Helps assess legitimacy
- **Action Buttons**: Color-coded (green approve, red reject)

---

## RESTful API Design

### Why RESTful?

RESTful APIs are:
- **Stateless**: Each request contains all needed info
- **Predictable**: Standard HTTP methods and status codes
- **Scalable**: Easy to cache and load balance
- **Language-agnostic**: Works with any client

### Our API Endpoints

#### Approve Review
```
PUT /api/admin/reviews/approve
```

**Request**:
```json
{
  "reviewId": "review-123"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "review": {
    "id": "review-123",
    "isApproved": true,
    "updatedAt": "2025-11-02T15:30:00Z"
  }
}
```

**Error Responses**:
```json
// 401 Unauthorized
{
  "success": false,
  "error": "You must be logged in to perform this action",
  "code": "AUTHENTICATION_ERROR"
}

// 403 Forbidden
{
  "success": false,
  "error": "Only administrators can approve reviews",
  "code": "AUTHORIZATION_ERROR"
}

// 404 Not Found
{
  "success": false,
  "error": "Review not found",
  "code": "NOT_FOUND"
}

// 400 Bad Request
{
  "success": false,
  "error": "Review ID is required",
  "code": "VALIDATION_ERROR"
}
```

### HTTP Methods vs Database Operations

| HTTP Method | Database Op | Idempotent? | Our Usage |
|-------------|-------------|-------------|-----------|
| GET | SELECT | ✅ Yes | Fetch reviews |
| POST | INSERT | ❌ No | Create review |
| PUT | UPDATE | ✅ Yes | Approve review |
| PATCH | UPDATE | ✅ Yes | Update partial |
| DELETE | DELETE | ✅ Yes | (Could use for reject) |

**Why PUT for approve/reject?**
- Updates review state (approve sets `is_approved = true`)
- Idempotent: Approving twice = same result
- RESTful convention for state changes

**Alternative (DELETE for reject)**:
```
DELETE /api/admin/reviews/{reviewId}
```

This would also be valid since reject = delete. We chose PUT for consistency.

---

## Security Layers

### Layer 1: Page-Level Authentication

```typescript
// In AdminLayout.astro
const authResult = await checkAdminAuth(Astro.cookies, currentPath);

if (authResult.redirectUrl) {
  return Astro.redirect(authResult.redirectUrl);
}
```

**Protects**: Entire admin interface  
**Redirect**: To `/login` if not authenticated

### Layer 2: Role-Based Authorization

```typescript
// In AdminLayout.astro
if (user.role !== 'admin') {
  return Astro.redirect('/'); // Non-admins can't access admin panel
}
```

**Checks**: User role from session  
**Enforcement**: At layout level (applies to all admin pages)

### Layer 3: API Endpoint Security

```typescript
// In /api/admin/reviews/approve.ts
const session = await getSessionFromRequest(cookies);

if (!session) {
  throw new AuthenticationError('You must be logged in');
}

if (session.role !== 'admin') {
  throw new AuthorizationError('Only administrators can approve reviews');
}
```

**Why repeat checks?**
- API endpoints can be called directly (bypassing UI)
- Defense in depth (multiple security layers)
- Prevents CSRF attacks
- Validates every request

### Layer 4: Input Validation

```typescript
const { reviewId } = await request.json();

if (!reviewId || typeof reviewId !== 'string') {
  throw new ValidationError('Review ID is required');
}
```

**Validates**:
- Required fields present
- Correct data types
- Format/length constraints

**Prevents**:
- SQL injection (when combined with parameterized queries)
- Type coercion bugs
- Empty/null values causing errors

### Security Checklist

- [x] Authentication required
- [x] Role authorization enforced
- [x] Input validation on all fields
- [x] Parameterized SQL queries
- [x] Error messages don't leak sensitive info
- [x] HTTPS in production (assumed)
- [x] Session tokens secure (httpOnly cookies)
- [x] Rate limiting (future enhancement)

---

## Real-Time UI Updates

### The Challenge

After approving/rejecting a review, we want:
1. Show success message
2. Remove review card from list
3. Update pending count
4. **Without full page reload**

### The Solution: Optimistic UI Updates

```typescript
async function handleAction(reviewId: string, action: 'approve' | 'reject') {
  try {
    // 1. Show loading state
    const button = document.querySelector(`[data-review-id="${reviewId}"] button`);
    button.disabled = true;
    button.textContent = 'Processing...';
    
    // 2. Call API
    const response = await fetch(`/api/admin/reviews/${action}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId }),
    });
    
    if (!response.ok) {
      throw new Error('Action failed');
    }
    
    // 3. Show success toast
    showToast(`Review ${action}d successfully!`, 'success');
    
    // 4. Remove card from DOM (after 1 second for toast visibility)
    setTimeout(() => {
      const reviewCard = document.querySelector(`[data-review-id="${reviewId}"]`);
      reviewCard.remove();
      
      // 5. Update pending count
      const countBadge = document.querySelector('.pending-count');
      const currentCount = parseInt(countBadge.textContent);
      countBadge.textContent = (currentCount - 1).toString();
    }, 1000);
    
  } catch (error) {
    // Revert UI on error
    showToast(error.message, 'error');
    button.disabled = false;
    button.textContent = action === 'approve' ? 'Approve' : 'Reject';
  }
}
```

### Optimistic vs Pessimistic Updates

**Pessimistic** (wait for server):
```
User clicks Approve
        ↓
  Disable button
        ↓
   Call API ⏱️ (500ms)
        ↓
 Update UI ← Only if success
```

**Optimistic** (update immediately):
```
User clicks Approve
        ↓
  Update UI ✨ (instantly)
        ↓
   Call API ⏱️ (background)
        ↓
 Revert if error ← (rare)
```

**Our Approach**: **Hybrid**
- Disable button immediately (prevent double-click)
- Call API
- Update UI on success
- Show error toast if failed

**Benefits**:
- Feels fast (immediate feedback)
- Safe (reverts on error)
- Clear (loading states shown)

---

## Pagination in Admin Panels

### Why Pagination Matters

Without pagination:
```
Loading 1,000 pending reviews = 
- Slow page load (10+ seconds)
- High memory usage
- Poor user experience
- Database strain
```

With pagination (20 per page):
```
Loading 20 reviews = 
- Fast page load (<1 second)
- Low memory usage
- Manageable for admins
- Efficient database queries
```

### Pagination Implementation

**SQL Query**:
```sql
-- Page 1: reviews 1-20
SELECT * FROM reviews
WHERE is_approved = false
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- Page 2: reviews 21-40
SELECT * FROM reviews
WHERE is_approved = false
ORDER BY created_at DESC
LIMIT 20 OFFSET 20;
```

**URL Parameters**:
```
/admin/reviews/pending?page=1  ← Default
/admin/reviews/pending?page=2
/admin/reviews/pending?page=3
```

### Page Number Display Logic

**Challenge**: Show smart page numbers (don't show all 100 pages!)

**Pattern**:
```
Total pages: 10
Current page: 5

Show: [1] ... [3] [4] [5] [6] [7] ... [10]
      ↑        ↑  ↑  ↑  ↑  ↑      ↑
      First    ←──Nearby─→        Last
```

**Code** (from pending.astro):
```typescript
const computePageNumbers = (): number[] => {
  const pageNumbers = [];
  const maxPages = Math.min(reviewsData.totalPages, 5); // Show max 5 numbers

  for (let i = 0; i < maxPages; i++) {
    let pageNum: number;
    
    if (reviewsData.totalPages <= 5) {
      // Show all pages if 5 or fewer
      pageNum = i + 1;
    } else if (page <= 3) {
      // Near start: show 1, 2, 3, 4, 5
      pageNum = i + 1;
    } else if (page >= reviewsData.totalPages - 2) {
      // Near end: show last 5 pages
      pageNum = reviewsData.totalPages - 4 + i;
    } else {
      // Middle: show current ± 2 pages
      pageNum = page - 2 + i;
    }
    
    pageNumbers.push(pageNum);
  }
  
  return pageNumbers;
};
```

**Result**:
```
Page 1:  [1] [2] [3] [4] [5]
Page 5:  [3] [4] [5] [6] [7]
Page 10: [6] [7] [8] [9] [10]
```

### Why Precompute in Frontmatter?

**Problem**: Astro JSX parser misinterprets `<=` as HTML tag start

```astro
<!-- ❌ BREAKS: Fragment syntax error -->
{Array.from({ length: total }).map((_, i) => {
  if (i <= 5) { // ← Parser sees "<= 5" as "<" tag
    return <a>{i}</a>
  }
})}

<!-- ✅ WORKS: Computed in frontmatter -->
{pageNumbers.map((num) => <a>{num}</a>)}
```

**Lesson**: Always compute values with comparison operators in frontmatter, not in JSX.

---

## Filter & Sort Patterns

### Filtering by Rating

**Use Case**: Admin wants to see only high-rated (4-5 star) or low-rated (1-2 star) reviews

**UI**:
```html
<form method="GET">
  <label>Minimum Rating:</label>
  <input type="number" name="minRating" min="1" max="5" value="">
  
  <label>Maximum Rating:</label>
  <input type="number" name="maxRating" min="1" max="5" value="">
  
  <button type="submit">Apply Filters</button>
</form>
```

**Query String**:
```
/admin/reviews/pending?minRating=4        ← 4-5 stars only
/admin/reviews/pending?minRating=1&maxRating=2  ← 1-2 stars only
/admin/reviews/pending?minRating=3&maxRating=3  ← Exactly 3 stars
```

**SQL** (in ReviewService.getReviews()):
```typescript
if (minRating !== undefined) {
  conditions.push(`r.rating >= $${paramIndex++}`);
  values.push(minRating);
}

if (maxRating !== undefined) {
  conditions.push(`r.rating <= $${paramIndex++}`);
  values.push(maxRating);
}
```

### Sorting Options

**Use Case**: Admin wants to process reviews by different priorities

**Options**:
1. **createdAt** (default): Oldest first (FIFO - fair processing)
2. **rating**: Highest/lowest first (quality-based)
3. **updatedAt**: Recently edited first

**UI**:
```html
<select name="sortBy">
  <option value="createdAt">Date Submitted</option>
  <option value="rating">Rating</option>
  <option value="updatedAt">Last Updated</option>
</select>

<select name="sortOrder">
  <option value="DESC">Newest/Highest First</option>
  <option value="ASC">Oldest/Lowest First</option>
</select>
```

**SQL**:
```typescript
const sortFieldMap = {
  createdAt: 'created_at',
  rating: 'rating',
  updatedAt: 'updated_at'
};

const sqlSortField = sortFieldMap[sortBy];
const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

// Result:
ORDER BY created_at DESC
ORDER BY rating ASC
ORDER BY updated_at DESC
```

### Filter Persistence

**Challenge**: Filters reset when navigating to next page

**Solution**: Include filters in pagination links

```typescript
const buildPaginationUrl = (page: number): string => {
  const params = new URLSearchParams();
  
  params.set('page', page.toString());
  
  // Preserve current filters
  if (minRating) params.set('minRating', minRating.toString());
  if (maxRating) params.set('maxRating', maxRating.toString());
  if (sortBy) params.set('sortBy', sortBy);
  if (sortOrder) params.set('sortOrder', sortOrder);
  
  return `/admin/reviews/pending?${params.toString()}`;
};
```

**Result**:
```
Page 1: /admin/reviews/pending?minRating=4&sortBy=rating&page=1
Page 2: /admin/reviews/pending?minRating=4&sortBy=rating&page=2
                                  ↑_____ Filters preserved _____↑
```

---

## Toast Notifications

### Why Toasts?

Toasts provide non-intrusive feedback:
- ✅ Visible but don't block UI
- ✅ Auto-dismiss after timeout
- ✅ Show success/error states
- ✅ Can stack multiple toasts

vs. Alerts:
- ❌ Block entire UI
- ❌ Require user dismissal
- ❌ Jarring user experience

### Toast Implementation

```typescript
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    'bg-blue-500 text-white'
  }`;
  toast.textContent = message;
  
  // Add to page
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('opacity-100'), 10);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('opacity-100');
    setTimeout(() => toast.remove(), 300); // After fade out
  }, 3000);
}
```

### Toast Positioning

```css
/* Fixed positioning (stays on screen during scroll) */
.toast {
  position: fixed;
  top: 1rem;      /* 16px from top */
  right: 1rem;    /* 16px from right */
  z-index: 9999;  /* Above everything else */
}

/* Stacking multiple toasts */
.toast:nth-child(1) { top: 1rem; }
.toast:nth-child(2) { top: 5rem; }  /* Below first toast */
.toast:nth-child(3) { top: 9rem; }  /* Below second toast */
```

### Accessibility

```html
<!-- ARIA role for screen readers -->
<div role="status" aria-live="polite">
  Review approved successfully!
</div>
```

**aria-live="polite"**: Screen reader announces message without interrupting

---

## Database Transactions

### When to Use Transactions

**Transaction**: Multiple database operations that must all succeed or all fail together

**Example Scenarios**:

```typescript
// ❌ NO TRANSACTION NEEDED (single operation)
async approveReview(reviewId: string) {
  await pool.query(
    'UPDATE reviews SET is_approved = true WHERE id = $1',
    [reviewId]
  );
}

// ✅ TRANSACTION NEEDED (multiple operations)
async approveReviewAndNotifyUser(reviewId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Operation 1: Approve review
    await client.query(
      'UPDATE reviews SET is_approved = true WHERE id = $1',
      [reviewId]
    );
    
    // Operation 2: Log notification
    await client.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [userId, 'Your review was approved!']
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Our Implementation**: No transaction needed (single UPDATE query)

### Future: Email Notifications (T120)

When adding email notifications:

```typescript
async approveReview(reviewId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Approve review
    const result = await client.query(
      'UPDATE reviews SET is_approved = true WHERE id = $1 RETURNING *',
      [reviewId]
    );
    
    // 2. Send email
    await emailService.send({
      to: result.rows[0].userEmail,
      subject: 'Your review was approved!',
      body: '...'
    });
    
    // 3. Log notification
    await client.query(
      'INSERT INTO notification_log (user_id, type, sent_at) VALUES ($1, $2, NOW())',
      [result.rows[0].userId, 'review_approved']
    );
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error; // Will revert all changes
  } finally {
    client.release();
  }
}
```

**Transaction ensures**: If email fails, review stays unapproved (consistency)

---

## Testing Admin Features

### Testing Strategy

Admin features require different testing approaches than public features:

| Aspect | Public Features | Admin Features |
|--------|----------------|----------------|
| **Authentication** | Optional | Always required |
| **Authorization** | Role-agnostic | Role-specific (admin only) |
| **Data Volume** | Variable | High (bulk operations) |
| **Error Paths** | User errors | System errors + user errors |
| **Security** | Standard | Critical (elevated privileges) |

### Test Pyramid for Admin Features

```
        /\
       /  \
      / E2E\      ← Full workflows (approve → see on course page)
     /------\
    /        \
   /Integration\  ← API + Database (approve updates DB correctly)
  /------------\
 /              \
/ Unit Tests     \ ← Functions (buildPaginationUrl, computePageNumbers)
------------------
```

### Key Test Scenarios

1. **Authentication**:
   ```typescript
   test('unauthenticated users redirected to login')
   test('regular users get 403 Forbidden')
   test('admin users can access page')
   ```

2. **Authorization**:
   ```typescript
   test('API returns 401 without session')
   test('API returns 403 for non-admin')
   test('API succeeds for admin')
   ```

3. **Functionality**:
   ```typescript
   test('approve updates database')
   test('reject deletes review')
   test('UI updates after action')
   test('toast notification shows')
   ```

4. **Edge Cases**:
   ```typescript
   test('approve already-approved review') // Should be idempotent
   test('approve non-existent review') // Should return 404
   test('pagination with no reviews') // Should show empty state
   ```

### Data Attributes for Testing

```astro
<!-- ✅ GOOD: Testable -->
<div data-review-id={review.id}>
  <button data-action="approve">Approve</button>
  <span data-rating={review.rating}>★★★★★</span>
</div>

<!-- ❌ BAD: Brittle (classes change with styling) -->
<div class="card p-4 rounded-lg">
  <button class="btn btn-success">Approve</button>
  <span class="stars">★★★★★</span>
</div>
```

**Why `data-*` attributes?**
- Stable (don't change with styling)
- Semantic (convey meaning)
- Separate concerns (tests don't depend on CSS)

---

## Code Patterns Reference

### Pattern 1: API Route Handler

```typescript
// Template for admin API endpoints

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Authentication
    const session = await getSessionFromRequest(cookies);
    if (!session) {
      throw new AuthenticationError('You must be logged in');
    }

    // 2. Authorization
    if (session.role !== 'admin') {
      throw new AuthorizationError('Only administrators can perform this action');
    }

    // 3. Input Validation
    const { id, ...data } = await request.json();
    if (!id) {
      throw new ValidationError('ID is required');
    }

    // 4. Business Logic
    const service = new SomeService(getPool());
    const result = await service.performAction(id, data);

    // 5. Success Response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // 6. Error Handling
    const normalized = normalizeError(error);
    logError(normalized, 'api_context');
    
    const statusMap = {
      AUTHENTICATION_ERROR: 401,
      AUTHORIZATION_ERROR: 403,
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
    };
    
    const status = statusMap[normalized.code] || 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: normalized.message,
        code: normalized.code
      }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

### Pattern 2: Admin Page Structure

```astro
---
// 1. Imports
import AdminLayout from '@/layouts/AdminLayout.astro';
import { ReviewService } from '@/lib/reviews';
import { getPool } from '@/lib/db';

// 2. URL Parameters
const url = new URL(Astro.request.url);
const page = parseInt(url.searchParams.get('page') || '1');
const minRating = url.searchParams.get('minRating');
const sortBy = url.searchParams.get('sortBy') || 'createdAt';

// 3. Data Fetching
const reviewService = new ReviewService(getPool());
const reviewsData = await reviewService.getReviews({
  isApproved: false, // Pending only
  minRating: minRating ? parseInt(minRating) : undefined,
  sortBy,
  page,
  limit: 20,
});

// 4. Helper Functions (with comparison operators)
const computePageNumbers = (): number[] => {
  // Precompute to avoid JSX syntax errors
  // ...
};
const pageNumbers = computePageNumbers();
---

<AdminLayout title="Pending Reviews">
  <!-- 5. Page Header -->
  <h1>Pending Reviews ({reviewsData.total})</h1>
  
  <!-- 6. Filters & Sort -->
  <form method="GET">
    <!-- Filter inputs -->
  </form>
  
  <!-- 7. Data Display -->
  {reviewsData.reviews.length === 0 ? (
    <p>No pending reviews</p>
  ) : (
    <div>
      {reviewsData.reviews.map((review) => (
        <div data-review-id={review.id}>
          <!-- Review card -->
        </div>
      ))}
    </div>
  )}
  
  <!-- 8. Pagination -->
  <nav>
    {pageNumbers.map((num) => (
      <a href={`?page=${num}`}>{num}</a>
    ))}
  </nav>
  
  <!-- 9. Client-Side Scripts -->
  <script>
    // Event handlers for actions
  </script>
</AdminLayout>
```

### Pattern 3: Client-Side Action Handler

```typescript
// Attach to buttons
document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', async (e) => {
    const reviewId = e.target.closest('[data-review-id]').dataset.reviewId;
    const action = e.target.dataset.action; // 'approve' or 'reject'
    
    try {
      // 1. Disable button (prevent double-click)
      e.target.disabled = true;
      e.target.textContent = 'Processing...';
      
      // 2. Call API
      const response = await fetch(`/api/admin/reviews/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId }),
      });
      
      // 3. Handle errors
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      // 4. Success feedback
      showToast(`Review ${action}d successfully!`, 'success');
      
      // 5. Update UI
      setTimeout(() => {
        e.target.closest('[data-review-id]').remove();
      }, 1000);
      
    } catch (error) {
      // 6. Error feedback
      showToast(error.message, 'error');
      
      // 7. Revert button state
      e.target.disabled = false;
      e.target.textContent = action === 'approve' ? 'Approve' : 'Reject';
    }
  });
});
```

---

## Common Pitfalls

### Pitfall 1: Forgetting Authorization

```typescript
// ❌ BAD: Only checks authentication
if (!session) {
  throw new AuthenticationError();
}
// Anyone logged in can approve reviews!

// ✅ GOOD: Checks authentication AND authorization
if (!session) {
  throw new AuthenticationError();
}
if (session.role !== 'admin') {
  throw new AuthorizationError();
}
```

**Lesson**: Always check both authentication (logged in?) AND authorization (allowed?).

---

### Pitfall 2: Exposing Sensitive Data

```typescript
// ❌ BAD: Returns full user object in API response
return new Response(JSON.stringify({
  success: true,
  review: fullReviewObject, // Contains userEmail, internal IDs, etc.
}));

// ✅ GOOD: Returns only necessary data
return new Response(JSON.stringify({
  success: true,
  review: {
    id: review.id,
    isApproved: review.isApproved,
    updatedAt: review.updatedAt,
  },
}));
```

**Lesson**: API responses should contain only what the client needs.

---

### Pitfall 3: Not Handling Double-Clicks

```typescript
// ❌ BAD: User can click approve multiple times
button.addEventListener('click', async () => {
  await fetch('/api/admin/reviews/approve', ...);
});
// Result: Multiple API calls, race conditions

// ✅ GOOD: Disable button immediately
button.addEventListener('click', async (e) => {
  e.target.disabled = true; // ← Prevents double-click
  await fetch('/api/admin/reviews/approve', ...);
  // Re-enable only on error
});
```

**Lesson**: Always disable action buttons while processing.

---

### Pitfall 4: Forgetting Filter Persistence

```typescript
// ❌ BAD: Pagination loses filters
<a href="/admin/reviews/pending?page=2">Next</a>
// User had minRating=4 filter, now it's gone!

// ✅ GOOD: Preserve filters in pagination
const buildUrl = (page: number) => {
  const params = new URLSearchParams(window.location.search);
  params.set('page', page.toString());
  return `?${params.toString()}`;
};
<a href={buildUrl(2)}>Next</a>
```

**Lesson**: Pagination links must preserve all query parameters.

---

### Pitfall 5: JSX Comparison Operators

```astro
<!-- ❌ BAD: Breaks with Fragment syntax error -->
{Array.from({ length: 10 }).map((_, i) => {
  if (i <= 5) { // ← Parser sees "i <=  5" as "i < tag"
    return <a>{i}</a>
  }
})}

<!-- ✅ GOOD: Compute in frontmatter -->
---
const numbers = Array.from({ length: 10 }, (_, i) => i + 1)
  .filter(n => n <= 5); // Safe in JavaScript
---
{numbers.map(n => <a>{n}</a>)}
```

**Lesson**: Never use `<`, `<=`, `>`, `>=` in Astro JSX templates. Precompute in frontmatter.

---

## Best Practices

### 1. Separate Concerns

```
Admin UI (pending.astro)
        ↓ calls
API Layer (/api/admin/reviews/approve.ts)
        ↓ calls
Business Logic (ReviewService.approveReview())
        ↓ calls
Database (PostgreSQL)
```

**Benefits**:
- Easy to test each layer independently
- Can reuse ReviewService in different contexts
- Clear responsibility boundaries

---

### 2. Consistent Error Handling

```typescript
// All API endpoints follow same error pattern:
try {
  // ... logic
} catch (error) {
  const normalized = normalizeError(error);
  logError(normalized, context);
  
  const statusMap = { /* ... */ };
  const status = statusMap[normalized.code] || 500;
  
  return new Response(JSON.stringify({
    success: false,
    error: normalized.message,
    code: normalized.code
  }), { status });
}
```

**Benefits**:
- Predictable error responses
- Easier debugging
- Better client-side error handling

---

### 3. Data Attributes for Testing

```astro
<!-- Add data-* attributes for testability -->
<div
  data-review-id={review.id}
  data-rating={review.rating}
  data-user-name={review.userName}
>
  <!-- Content -->
</div>
```

**Benefits**:
- Stable test selectors
- Self-documenting HTML
- Tests don't break when styles change

---

### 4. Optimistic UI Updates

```typescript
// Update UI before waiting for server
showToast('Processing...', 'info');
removeCardFromDOM();

// Call API in background
const response = await fetch(...);

// Revert if error
if (!response.ok) {
  addCardBackToDOM();
  showToast('Error!', 'error');
}
```

**Benefits**:
- Feels faster
- Better user experience
- Can revert on error

---

### 5. Security Defense in Depth

```
Layer 1: Page authentication (AdminLayout)
Layer 2: Page authorization (role check)
Layer 3: API authentication (session check)
Layer 4: API authorization (role check)
Layer 5: Input validation
Layer 6: Parameterized SQL queries
```

**Benefits**:
- Multiple barriers for attackers
- No single point of failure
- Redundancy protects against bugs

---

## Conclusion

### What We Learned

1. **Content Moderation**: Pre-moderation protects platform quality
2. **Admin Interfaces**: Efficiency and context are key
3. **RESTful APIs**: Standard patterns for predictability
4. **Security Layers**: Defense in depth prevents vulnerabilities
5. **Real-Time Updates**: Optimistic UI improves UX
6. **Pagination**: Essential for scalability
7. **Testing Admin Features**: Requires authentication + authorization tests

### Key Takeaways

✅ **Always** check both authentication AND authorization  
✅ **Always** validate API inputs  
✅ **Always** disable action buttons while processing  
✅ **Always** preserve filters in pagination  
✅ **Always** precompute comparison operators in frontmatter  
✅ **Always** use data attributes for testing  
✅ **Always** provide user feedback (toasts, loading states)

### Next Steps

**T120**: Add email notifications when reviews are approved/rejected  
- Email service integration
- Email templates
- Notification logging
- Transaction handling (approve + email as atomic operation)

**Future Enhancements**:
- Bulk actions (approve/reject multiple reviews at once)
- Review editing (fix typos before approval)
- Review flagging (users report inappropriate content)
- Analytics dashboard (moderation metrics, response times)
- Auto-moderation (ML-based spam detection)

---

**Guide Status**: ✅ Complete  
**Next Step**: Update tasks.md to mark T118 and T119 as complete
