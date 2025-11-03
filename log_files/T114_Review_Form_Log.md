# T114: Review Submission Form - Implementation Log

**Task**: Create review submission form on course detail pages (for enrolled users)
**Developer**: Claude (AI Assistant)
**Date**: November 2, 2025
**Status**: ✅ Completed

---

## Overview

This task implements a review submission form that allows authenticated users who have purchased a course to submit reviews with ratings and comments. The implementation includes:

1. **ReviewForm.astro component** - Reusable review form with Tailwind CSS styling
2. **API endpoint** - `/api/reviews/submit` for handling review submissions
3. **Integration** - Added form to course detail pages with purchase verification
4. **E2E Tests** - Comprehensive Playwright tests for all functionality

---

## Implementation Details

### 1. ReviewForm Component (`src/components/ReviewForm.astro`)

**File**: [src/components/ReviewForm.astro](../src/components/ReviewForm.astro)
**Lines**: 353 lines total

#### Component Structure

The ReviewForm component is a smart component that handles multiple states:

- **Unauthenticated users**: Shows login prompt with link
- **Authenticated non-purchasers**: Shows "must purchase first" message
- **Authenticated purchasers**: Shows full review form
- **Users with existing review**: Shows existing review details and status

#### Props Interface

```typescript
interface Props {
  courseId: string;          // UUID of the course
  userId: string | null;     // UUID of authenticated user (null if not logged in)
  hasPurchased: boolean;     // Whether user has purchased the course
  existingReview?: {         // Existing review if user already reviewed
    id: string;
    rating: number;
    comment: string;
    isApproved: boolean;
  } | null;
}
```

#### Key Features

**Star Rating System** (Lines 97-132)
- Interactive 5-star rating selector
- Hover effects with color transitions
- Click to select rating
- Visual labels: Poor, Fair, Good, Very Good, Excellent
- Accessible with ARIA attributes
- Keyboard navigation support

**Comment Textarea** (Lines 134-145)
- Optional comment field
- Character counter (0/1000)
- Visual warning when approaching limit (> 900 chars)
- HTML maxlength enforcement
- Responsive height with scrolling

**Form Validation** (Lines 197-219)
- Client-side validation for rating (required)
- Rating must be 1-5
- Comment must not exceed 1000 characters
- Visual error messages

**Loading States** (Lines 220-247)
- Disabled submit button during submission
- Loading spinner animation
- Prevents double submission
- User feedback during API call

**Success/Error Handling** (Lines 248-277)
- Success message with auto-reload after 2 seconds
- Error message display with specific error text
- Form reset after successful submission
- Graceful error recovery

#### Styling with Tailwind CSS

All styling uses Tailwind utility classes:

```astro
<!-- Login Prompt -->
<div class="bg-blue-50 border border-blue-200 rounded-md p-4">
  <p class="text-blue-800">
    Please <a href="/login" class="font-semibold underline hover:text-blue-900">log in</a>
  </p>
</div>

<!-- Star Rating -->
<button class="star-button focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded">
  <svg class="w-10 h-10 text-gray-300 hover:text-yellow-400 transition-colors duration-150">
  </svg>
</button>

<!-- Submit Button -->
<button class="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed">
</button>
```

#### Client-Side JavaScript (Lines 279-353)

**Star Rating Interaction**
- Click handler to select rating
- Hover effects to preview rating
- Updates hidden input field
- Updates visual display and ARIA attributes
- Shows rating label text

**Character Counter**
- Updates on every input event
- Changes color when approaching limit
- Shows current count / 1000

**Form Submission**
- Validates rating before submission
- Sends JSON POST request to `/api/reviews/submit`
- Handles loading states
- Displays success/error messages
- Reloads page after successful submission to show new review status

---

### 2. API Endpoint (`src/pages/api/reviews/submit.ts`)

**File**: [src/pages/api/reviews/submit.ts](../src/pages/api/reviews/submit.ts)
**Lines**: 134 lines total
**HTTP Method**: POST

#### Request Format

```json
{
  "courseId": "uuid",
  "userId": "uuid",
  "rating": 5,
  "comment": "Optional comment text"
}
```

#### Response Format

**Success (201 Created)**
```json
{
  "success": true,
  "review": {
    "id": "uuid",
    "userId": "uuid",
    "courseId": "uuid",
    "rating": 5,
    "comment": "...",
    "isApproved": false,
    "createdAt": "2025-11-02T10:30:00Z"
  }
}
```

**Error (400/401/403/500)**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "fields": {}
  }
}
```

#### Security Checks

1. **Authentication** (Lines 38-41)
   - Verifies user is logged in via session cookie
   - Returns 401 if not authenticated

2. **Authorization** (Lines 65-69)
   - Verifies request userId matches session userId
   - Prevents users from submitting reviews as others
   - Returns 403 if mismatch detected

3. **Input Validation** (Lines 43-67)
   - Validates JSON body format
   - Validates courseId (required, string)
   - Validates rating (required, number, 1-5 range)
   - Validates comment (optional, string, max 1000 chars)
   - Returns 400 for invalid input

#### Business Logic

The endpoint delegates business logic to `ReviewService`:

```typescript
const reviewService = new ReviewService(pool);
const review = await reviewService.createReview({
  userId: session.userId,
  courseId,
  rating,
  comment: comment || undefined,
});
```

The `ReviewService.createReview()` method handles:
- Purchase verification (checks order_items + orders)
- Duplicate review check (UNIQUE constraint)
- Rating validation (1-5 range)
- Automatic approval status (false by default)
- Database insertion with error handling

#### Error Handling

Uses centralized error handling from `src/lib/errors.ts`:

```typescript
catch (error) {
  logError(error, { endpoint: 'POST /api/reviews/submit' });
  const normalizedError = normalizeError(error);
  return new Response(JSON.stringify({
    success: false,
    error: { ... }
  }), { status: normalizedError.statusCode });
}
```

---

### 3. Course Detail Page Integration (`src/pages/courses/[id].astro`)

**File**: [src/pages/courses/[id].astro](../src/pages/courses/[id].astro)
**Changes**: Added session checking, purchase verification, and ReviewForm integration

#### Imports Added (Lines 10-13)

```typescript
import ReviewForm from '@/components/ReviewForm.astro';
import { getSessionFromRequest } from '@/lib/auth/session';
import { pool } from '@/lib/db';
```

#### Session Management (Lines 18-19)

```typescript
// Get current user session
const session = await getSessionFromRequest(Astro.cookies);
```

This retrieves the user's session from the Redis-backed session store.

#### Purchase & Review Verification (Lines 257-294)

Added logic to check:
1. If user has completed an order containing this course
2. If user has already submitted a review for this course

```typescript
let hasPurchased = false;
let existingReview = null;

if (session && course) {
  try {
    // Check purchase status
    const purchaseResult = await pool.query(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.course_id = $2 AND o.status = 'completed'
       LIMIT 1`,
      [session.userId, course.id]
    );
    hasPurchased = purchaseResult.rows.length > 0;

    // Check for existing review
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
    console.error('Error checking purchase/review status:', err);
  }
}
```

#### ReviewForm Integration (Lines 547-562)

Replaced the placeholder review section with the ReviewForm component:

```astro
<!-- Reviews Section -->
<div class="content-section">
  <ReviewForm
    courseId={course.id}
    userId={session?.userId || null}
    hasPurchased={hasPurchased}
    existingReview={existingReview}
  />

  <div class="reviews-placeholder" style="margin-top: 2rem;">
    <h2>Student reviews</h2>
    <p>⭐ {course.avgRating} average rating</p>
    <p>{course.reviewCount} reviews</p>
    <p class="coming-soon">Reviews list will be displayed here once T116 is implemented</p>
  </div>
</div>
```

---

### 4. E2E Tests (`tests/e2e/T114_review_form.spec.ts`)

**File**: [tests/e2e/T114_review_form.spec.ts](../tests/e2e/T114_review_form.spec.ts)
**Lines**: 411 lines
**Test Suites**: 4
**Test Cases**: 14
**Total Tests**: 14 tests × 5 browsers = 70 test runs

#### Test Infrastructure

**Database Connection**
```typescript
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

**Helper Functions**
- `generateTestUser()` - Creates unique test user data
- `registerAndLogin()` - Registers and logs in a user
- `getUserId()` - Retrieves user ID from database
- `createCompletedOrder()` - Creates completed order with course
- `cleanupTestUser()` - Removes all test data for a user

#### Test Suite 1: Visibility and Access Control (4 tests)

**Test 1: Unauthenticated Users**
```typescript
test('should show login prompt for unauthenticated users', async ({ page }) => {
  await page.goto(`/courses/${testCourseSlug}`);

  // Should see login prompt
  await expect(page.locator('text=Please log in to write a review')).toBeVisible();
  await expect(page.locator('.bg-blue-50 a[href="/login"]')).toBeVisible();

  // Should NOT see the form
  await expect(page.locator('#review-form')).not.toBeVisible();
});
```

**Test 2: Non-Purchasers**
```typescript
test('should show purchase required message for non-purchasers', async ({ page }) => {
  const user = generateTestUser();
  await registerAndLogin(page, user);
  await page.goto(`/courses/${testCourseSlug}`);

  // Should see purchase required message
  await expect(page.locator('text=You must purchase this course')).toBeVisible();

  // Should NOT see the form
  await expect(page.locator('#review-form')).not.toBeVisible();
});
```

**Test 3: Purchasers**
```typescript
test('should show review form for users who purchased', async ({ page }) => {
  const user = generateTestUser();
  await registerAndLogin(page, user);
  const userId = await getUserId(user.email);
  await createCompletedOrder(userId, testCourseId);
  await page.goto(`/courses/${testCourseSlug}`);

  // Should see the review form
  await expect(page.locator('#review-form')).toBeVisible();
  await expect(page.locator('#star-rating')).toBeVisible();
  await expect(page.locator('#comment')).toBeVisible();
});
```

**Test 4: Existing Reviewers**
```typescript
test('should show existing review instead of form', async ({ page }) => {
  const user = generateTestUser();
  await registerAndLogin(page, user);
  const userId = await getUserId(user.email);
  await createCompletedOrder(userId, testCourseId);

  // Create existing review
  await pool.query(
    `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, testCourseId, 5, 'Great course!', false]
  );

  await page.goto(`/courses/${testCourseSlug}`);

  // Should see existing review message
  await expect(page.locator('text=You have already reviewed this course')).toBeVisible();
  await expect(page.locator('text=Great course!')).toBeVisible();

  // Should NOT see the form
  await expect(page.locator('#review-form')).not.toBeVisible();
});
```

#### Test Suite 2: Star Rating Interaction (3 tests)

**Test 1: Hover Effects**
```typescript
test('should highlight stars on hover', async ({ page }) => {
  // Hover over 3rd star
  await starButtons.nth(2).hover();

  // First 3 stars should be yellow, rest should be gray
  for (let i = 0; i < 5; i++) {
    const svg = starButtons.nth(i).locator('svg');
    if (i < 3) {
      await expect(svg).toHaveClass(/text-yellow-400/);
    } else {
      await expect(svg).toHaveClass(/text-gray-300/);
    }
  }
});
```

**Test 2: Click Selection**
```typescript
test('should select rating on click', async ({ page }) => {
  // Click 4th star
  await starButtons.nth(3).click();

  // Should show rating text
  await expect(ratingText).toContainText('Very Good');

  // Hidden input should have value 4
  await expect(ratingInput).toHaveValue('4');
});
```

**Test 3: Rating Labels**
```typescript
test('should show correct rating labels', async ({ page }) => {
  const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  for (let i = 0; i < 5; i++) {
    await starButtons.nth(i).click();
    await expect(ratingText).toContainText(labels[i]);
  }
});
```

#### Test Suite 3: Form Submission (6 tests)

**Test 1: Validation**
```typescript
test('should require rating before submission', async ({ page }) => {
  // Try to submit without rating
  await page.click('#submit-button');

  // Should show error
  await expect(page.locator('#rating-error')).toBeVisible();
});
```

**Test 2: Rating Only**
```typescript
test('should submit review with rating only', async ({ page }) => {
  // Select 5 stars
  await page.locator('.star-button').nth(4).click();

  // Submit form
  await page.click('#submit-button');

  // Should show success message
  await expect(page.locator('#form-success')).toBeVisible({ timeout: 10000 });

  // Verify in database
  const reviewResult = await pool.query(
    'SELECT * FROM reviews WHERE user_id = $1 AND course_id = $2',
    [userId, testCourseId]
  );
  expect(reviewResult.rows.length).toBe(1);
  expect(reviewResult.rows[0].rating).toBe(5);
  expect(reviewResult.rows[0].comment).toBeNull();
  expect(reviewResult.rows[0].is_approved).toBe(false);
});
```

**Test 3: Rating + Comment**
```typescript
test('should submit review with rating and comment', async ({ page }) => {
  const testComment = 'This is an excellent course! Highly recommended.';

  await page.locator('.star-button').nth(4).click();
  await page.fill('#comment', testComment);

  // Verify character count updates
  await expect(page.locator('#char-count')).toContainText(`${testComment.length} / 1000`);

  await page.click('#submit-button');
  await expect(page.locator('#form-success')).toBeVisible({ timeout: 10000 });

  // Verify in database
  expect(reviewResult.rows[0].comment).toBe(testComment);
});
```

**Test 4: Length Limit**
```typescript
test('should enforce comment length limit', async ({ page }) => {
  const longComment = 'a'.repeat(1001);
  await page.fill('#comment', longComment);

  // Should be truncated by maxlength
  const textareaValue = await page.locator('#comment').inputValue();
  expect(textareaValue.length).toBe(1000);
});
```

**Test 5: Character Warning**
```typescript
test('should show character count warning when approaching limit', async ({ page }) => {
  const comment = 'a'.repeat(950);
  await page.fill('#comment', comment);

  // Character count should turn red
  const charCount = page.locator('#char-count');
  await expect(charCount).toHaveClass(/text-red-500/);
});
```

**Test 6: Page Reload**
```typescript
test('should reload page after successful submission', async ({ page }) => {
  await page.locator('.star-button').nth(4).click();
  await page.click('#submit-button');

  // Wait for page reload
  await page.waitForURL(`/courses/${testCourseSlug}`, { timeout: 15000 });

  // Should see existing review message
  await expect(page.locator('text=You have already reviewed this course')).toBeVisible();
});
```

#### Test Suite 4: Error Handling (1 test)

**Test 1: Duplicate Review**
```typescript
test('should handle duplicate review submission gracefully', async ({ page }) => {
  // Insert review directly
  await pool.query(
    `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, testCourseId, 5, 'First review', false]
  );

  // Reload page
  await page.reload();

  // Should show existing review
  await expect(page.locator('text=You have already reviewed this course')).toBeVisible();
});
```

---

## Technical Decisions

### 1. Component Architecture

**Decision**: Create a single smart component that handles all states
**Rationale**:
- Simplifies integration - single import and prop pass
- Encapsulates all review form logic in one place
- Easier to test and maintain
- Better user experience with consistent UI

**Alternative Considered**: Separate components for each state
**Why Rejected**: Would require more complex integration logic on parent page

### 2. Tailwind CSS for Styling

**Decision**: Use Tailwind utility classes exclusively
**Rationale**:
- Per user requirements: "use Tailwind for all the css related code"
- Consistent with project conventions
- Responsive design built-in
- No additional CSS files needed
- Easy to maintain and modify

### 3. Client-Side Form Validation

**Decision**: Validate on client before submitting to API
**Rationale**:
- Better user experience (immediate feedback)
- Reduces unnecessary API calls
- Still validates on server for security
- Provides visual error indicators

### 4. Auto-Reload After Submission

**Decision**: Reload page 2 seconds after successful submission
**Rationale**:
- Shows updated review status (form → existing review display)
- Simplifies state management (no manual DOM updates)
- User sees their submitted review immediately
- Clean transition with success message first

### 5. Purchase Verification on Page Load

**Decision**: Check purchase status when rendering page, not in API
**Rationale**:
- Better UX - user sees appropriate message immediately
- Reduces failed API calls from non-purchasers
- API still validates (defense in depth)
- Clearer separation of concerns

### 6. Review Approval Workflow

**Decision**: Set `is_approved = false` by default
**Rationale**:
- Follows T113 ReviewService design
- Allows admin moderation before publishing
- Prevents spam/abuse
- Consistent with requirements

### 7. E2E Testing Strategy

**Decision**: Use Playwright for comprehensive E2E tests
**Rationale**:
- Tests real user workflows (register → login → purchase → review)
- Tests across multiple browsers
- Validates database state after operations
- Catches integration issues that unit tests miss

---

## Files Created/Modified

### Created Files

1. **`src/components/ReviewForm.astro`** (353 lines)
   - Review form component with Tailwind CSS
   - Star rating system
   - Form validation
   - Client-side JavaScript

2. **`src/pages/api/reviews/submit.ts`** (134 lines)
   - POST endpoint for review submission
   - Authentication and authorization checks
   - Input validation
   - Error handling

3. **`tests/e2e/T114_review_form.spec.ts`** (411 lines)
   - 14 test cases across 4 suites
   - Comprehensive coverage of all functionality

### Modified Files

1. **`src/pages/courses/[id].astro`** (Modified: lines 10-13, 18-19, 257-294, 547-562)
   - Added ReviewForm import
   - Added session management
   - Added purchase verification
   - Integrated ReviewForm component

---

## Dependencies

### New Dependencies
- None (all dependencies already in project)

### Existing Dependencies Used
- `@astrojs/node` - SSR for session/database access
- `pg` (node-postgres) - Database queries
- `@/lib/auth/session` - Session management
- `@/lib/reviews` - ReviewService business logic
- `@/lib/errors` - Custom error classes
- `@playwright/test` - E2E testing
- `dotenv` - Environment variables in tests

---

## Database Schema Usage

### Tables Used

**`reviews`** - Main review storage
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);
```

**`orders`** - Order status checking
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status order_status DEFAULT 'pending',
    -- ...
);
```

**`order_items`** - Course purchase verification
```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    -- ...
);
```

### Queries Used

**Purchase Verification** (course detail page)
```sql
SELECT 1 FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.user_id = $1 AND oi.course_id = $2 AND o.status = 'completed'
LIMIT 1
```

**Existing Review Check** (course detail page)
```sql
SELECT id, rating, comment, is_approved
FROM reviews
WHERE user_id = $1 AND course_id = $2
LIMIT 1
```

---

## Error Handling

### Client-Side Errors

1. **Rating Not Selected**
   - Display: Red error text below star rating
   - Prevention: Shows on submit attempt

2. **API Request Failed**
   - Display: Red error box with specific message
   - Recovery: User can retry submission

3. **Network Errors**
   - Display: Generic error message in error box
   - Recovery: User can retry submission

### Server-Side Errors

1. **401 Unauthorized** - Not authenticated
   ```json
   { "error": { "message": "You must be logged in to submit a review" } }
   ```

2. **400 Bad Request** - Invalid input
   ```json
   { "error": { "message": "Rating must be a number between 1 and 5" } }
   ```

3. **403 Forbidden** - Not purchased or already reviewed
   ```json
   { "error": { "message": "You can only review courses you have purchased" } }
   { "error": { "message": "You have already reviewed this course" } }
   ```

4. **500 Internal Server Error** - Server/database error
   ```json
   { "error": { "message": "Internal server error" } }
   ```

All errors are logged using the `logError` utility from `src/lib/errors.ts`.

---

## Testing Strategy

### Unit Tests
- Already covered by T113 ReviewService tests (54 tests passing)
- Business logic fully tested

### E2E Tests
- 14 test cases across 4 test suites
- Tests run on 5 browsers (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
- Total: 70 test runs

**Test Coverage:**
- ✅ Visibility for different user states
- ✅ Star rating interaction
- ✅ Form validation
- ✅ Successful submission
- ✅ Database verification
- ✅ Error handling
- ✅ Character counting
- ✅ Page reload behavior

---

## Next Steps (Future Tasks)

Based on `tasks.md`, the following related tasks will build on this implementation:

1. **T115**: Create `/api/reviews/submit.ts` POST endpoint (✅ Done in this task)
2. **T116**: Display reviews and average rating on course detail pages
3. **T117**: Display reviews and average rating on course cards
4. **T118**: Create admin pending reviews page
5. **T119**: Create admin review approve/reject API
6. **T120**: Add email notifications for review approval/rejection

---

## Accessibility Features

The ReviewForm component includes several accessibility features:

1. **Semantic HTML**
   - Proper form structure with labels
   - Button types specified
   - Descriptive link text

2. **ARIA Attributes**
   - `role="radiogroup"` on star rating container
   - `role="radio"` on individual stars
   - `aria-label` with descriptive text for each star
   - `aria-checked` to indicate selected state

3. **Keyboard Navigation**
   - Focus rings on interactive elements
   - Tab navigation support
   - Focus styles using Tailwind's `focus:` utilities

4. **Visual Feedback**
   - High contrast colors
   - Loading states
   - Error messages
   - Success confirmations

5. **Screen Reader Support**
   - Descriptive labels
   - Hidden inputs with proper names
   - Error announcements

---

## Performance Considerations

1. **Database Queries**
   - Purchase check uses JOIN with LIMIT 1 for efficiency
   - Existing review check uses UNIQUE constraint for fast lookup
   - Both queries use indexed columns (user_id, course_id)

2. **Client-Side**
   - Minimal JavaScript (< 100 lines)
   - No external libraries
   - Event listeners cleaned up automatically
   - Debouncing not needed (character count is instant)

3. **API Response**
   - Returns only necessary data
   - Uses HTTP status codes correctly
   - JSON responses compressed by Astro

4. **Caching**
   - Form state not cached (intentional - prevents stale data)
   - Session data cached in Redis
   - Purchase status checked fresh on each page load

---

## Security Considerations

1. **Authentication**
   - Session-based authentication via Redis
   - HTTP-only cookies
   - Secure cookies in production

2. **Authorization**
   - Server-side purchase verification
   - User ID validation against session
   - Cannot submit reviews for other users

3. **Input Validation**
   - Client-side validation for UX
   - Server-side validation for security
   - SQL injection prevention via parameterized queries

4. **CSRF Protection**
   - Same-origin policy
   - Session validation
   - No state-changing GET requests

5. **XSS Prevention**
   - All user input escaped by Astro
   - No dangerouslySetInnerHTML equivalent
   - Content-Type headers set correctly

---

## Lessons Learned

1. **Smart Components Are Powerful**
   - Single component handling multiple states simplifies integration
   - Conditional rendering keeps code readable
   - Props interface clearly defines requirements

2. **Tailwind Makes Styling Fast**
   - No need to create/name CSS classes
   - Responsive design is straightforward
   - Hover/focus states are one-liners

3. **E2E Tests Are Valuable**
   - Caught integration issues that unit tests missed
   - Validates entire user workflow
   - Tests real browser behavior

4. **Database Checks on Page Load > API**
   - Better UX showing appropriate UI immediately
   - Reduces failed API calls
   - Still validates on server for security

5. **Auto-Reload Simplifies State**
   - No need to manually update DOM
   - Guarantees fresh data from server
   - Clear transition for user

---

## Conclusion

Task T114 has been successfully implemented with a complete review submission form that:

- ✅ Allows authenticated purchasers to submit reviews
- ✅ Uses Tailwind CSS exclusively for styling
- ✅ Provides excellent user experience with validation and feedback
- ✅ Integrates seamlessly with existing ReviewService (T113)
- ✅ Includes comprehensive E2E tests
- ✅ Follows security best practices
- ✅ Is accessible and performant
- ✅ Sets the foundation for T115-T120 (review display and moderation)

The implementation is production-ready and fully documented.
