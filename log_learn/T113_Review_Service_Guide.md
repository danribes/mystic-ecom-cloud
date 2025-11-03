# T113: Review Service - Learning Guide

**Educational Resource**: Complete guide to building a production-ready review system
**Skill Level**: Intermediate to Advanced
**Topics**: TypeScript, PostgreSQL, Service Layer Architecture, Testing, Authorization

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Core Concepts](#core-concepts)
4. [Implementation Tutorials](#implementation-tutorials)
5. [Database Design](#database-design)
6. [Business Logic Patterns](#business-logic-patterns)
7. [Error Handling Strategies](#error-handling-strategies)
8. [Testing Best Practices](#testing-best-practices)
9. [Security Considerations](#security-considerations)
10. [Common Pitfalls](#common-pitfalls)
11. [Advanced Topics](#advanced-topics)
12. [Real-World Examples](#real-world-examples)

---

## Introduction

### What is a Review Service?

A **review service** is a backend module that manages user-generated reviews for products, courses, or services. It handles:
- Review creation and validation
- Purchase verification (verified reviews)
- Admin moderation workflows
- Statistical aggregation (ratings, distributions)
- Authorization and access control

### Why Build a Review Service?

**Business Benefits**:
- Builds trust with authentic customer feedback
- Increases conversion rates (products with reviews sell 18-58% better)
- Provides valuable product insights
- Engages customers post-purchase

**Technical Benefits**:
- Demonstrates service layer architecture
- Showcases database design patterns
- Illustrates authorization workflows
- Teaches testing strategies

### Learning Objectives

By the end of this guide, you will understand:
- ✅ How to design a review system database schema
- ✅ How to implement purchase verification
- ✅ How to build admin moderation workflows
- ✅ How to calculate statistics efficiently
- ✅ How to test complex business logic
- ✅ How to handle authorization at service layer

---

## Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────┐
│         API Layer (Astro)           │
│  ┌─────────────────────────────┐   │
│  │  POST /api/reviews           │   │
│  │  GET  /api/reviews/:id       │   │
│  │  PUT  /api/reviews/:id       │   │
│  └─────────────────────────────┘   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       Service Layer (Logic)         │
│  ┌─────────────────────────────┐   │
│  │   ReviewService              │   │
│  │  - createReview()            │   │
│  │  - updateReview()            │   │
│  │  - approveReview()           │   │
│  │  - getCourseReviewStats()    │   │
│  └─────────────────────────────┘   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Data Layer (PostgreSQL)        │
│  ┌─────────────────────────────┐   │
│  │  reviews                     │   │
│  │  users                       │   │
│  │  courses                     │   │
│  │  orders                      │   │
│  │  order_items                 │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Responsibilities by Layer

| Layer | Responsibilities | What it DOES NOT do |
|-------|-----------------|---------------------|
| **API Layer** | HTTP handling, request parsing, response formatting, session auth | Business logic, database queries |
| **Service Layer** | Business rules, validation, authorization, database operations | HTTP concerns, rendering |
| **Data Layer** | Data persistence, constraints, indexes, integrity | Business logic, validation |

### Why Separate Layers?

**Benefits**:
- **Testability**: Test business logic without HTTP
- **Reusability**: Use service from API, CLI, jobs, etc.
- **Maintainability**: Change one layer without touching others
- **Clarity**: Each layer has single responsibility

**Example**:
```typescript
// ❌ Bad: Mixed concerns
app.post('/api/reviews', async (req, res) => {
  // Validation in route handler
  if (!req.body.rating || req.body.rating < 1) {
    return res.status(400).json({ error: 'Invalid rating' });
  }

  // Business logic in route handler
  const purchase = await db.query(`SELECT ...`);
  if (!purchase.rows.length) {
    return res.status(403).json({ error: 'Not purchased' });
  }

  // Database query in route handler
  const review = await db.query(`INSERT ...`);
  res.json(review);
});

// ✅ Good: Separated concerns
app.post('/api/reviews', async (req, res) => {
  try {
    // Route handler only handles HTTP
    const review = await reviewService.createReview(req.body);
    res.json(review);
  } catch (error) {
    // Error handler converts service errors to HTTP responses
    handleError(error, res);
  }
});
```

---

## Core Concepts

### 1. Verified Purchase Requirement

**Concept**: Only customers who purchased a product can review it

**Why?**:
- Prevents fake reviews
- Builds trust ("Verified Purchase" badge)
- Complies with FTC guidelines

**Implementation**:
```typescript
async createReview(input: CreateReviewInput): Promise<Review> {
  // Check if user has completed order containing this course
  const purchaseCheck = await this.pool.query(
    `SELECT 1 FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = $1
       AND oi.course_id = $2
       AND o.status = 'completed'
     LIMIT 1`,
    [input.userId, input.courseId]
  );

  if (purchaseCheck.rows.length === 0) {
    throw new AuthorizationError(
      'You can only review courses you have purchased'
    );
  }

  // Proceed with review creation...
}
```

**Database Pattern**:
```sql
-- Check is fast because of indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_course_id ON order_items(course_id);

-- Using EXISTS is slightly faster than COUNT
SELECT EXISTS (
  SELECT 1 FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE o.user_id = $1 AND oi.course_id = $2
    AND o.status = 'completed'
);
```

### 2. One Review Per User Per Course

**Concept**: Database enforces maximum one review per user/course combination

**Why?**:
- Prevents spam
- Prevents rating manipulation
- Clear user experience

**Implementation**:
```sql
-- Database constraint enforces uniqueness
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  UNIQUE(user_id, course_id)  -- ← Enforces uniqueness
);
```

**Error Handling**:
```typescript
try {
  const result = await this.pool.query(`INSERT INTO reviews ...`);
  return result.rows[0];
} catch (error: any) {
  // PostgreSQL error code for unique violation
  if (error.code === '23505') {
    throw new DatabaseError(
      'You have already reviewed this course. ' +
      'You can update your existing review instead.'
    );
  }
  throw new DatabaseError(`Failed to create review: ${error.message}`);
}
```

**User Experience**:
```typescript
// Before showing review form, check if user already reviewed
const existingReview = await reviewService.getUserReviewForCourse(
  userId,
  courseId
);

if (existingReview) {
  // Show edit form with existing review
  return <ReviewEditForm review={existingReview} />;
} else {
  // Show new review form
  return <ReviewCreateForm courseId={courseId} />;
}
```

### 3. Admin Approval Workflow

**Concept**: Reviews require admin approval before public display

**Why?**:
- Prevents spam and inappropriate content
- Allows quality control
- Enables content moderation

**State Machine**:
```
┌──────────────┐
│   Created    │
│is_approved=  │
│   false      │
└──────┬───────┘
       │
       │ Admin approves
       ▼
┌──────────────┐
│   Approved   │
│is_approved=  │
│   true       │
└──────┬───────┘
       │
       │ Admin rejects (optional)
       ▼
┌──────────────┐
│   Rejected   │
│is_approved=  │
│   false      │
└──────────────┘
```

**Implementation**:
```typescript
// Reviews default to unapproved
async createReview(input: CreateReviewInput): Promise<Review> {
  const result = await this.pool.query(
    `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
     VALUES ($1, $2, $3, $4, false)  -- ← Always false initially
     RETURNING *`,
    [input.userId, input.courseId, input.rating, input.comment]
  );
  return result.rows[0];
}

// Admin approves review
async approveReview(reviewId: string): Promise<Review> {
  const result = await this.pool.query(
    `UPDATE reviews
     SET is_approved = true, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [reviewId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Review not found');
  }

  return result.rows[0];
}
```

**Filtering by Approval Status**:
```typescript
// Public API: Only show approved
async getReviews(options: ListReviewsOptions = {}): Promise<PaginatedReviews> {
  const { isApproved = true } = options;  // Default to approved only

  const query = `
    SELECT * FROM reviews
    WHERE is_approved = $1
    ORDER BY created_at DESC
  `;

  const result = await this.pool.query(query, [isApproved]);
  return result.rows;
}

// Admin API: Show all or filter by status
const pendingReviews = await reviewService.getReviews({ isApproved: false });
const approvedReviews = await reviewService.getReviews({ isApproved: true });
```

### 4. Review Locking After Approval

**Concept**: Once approved, reviews cannot be edited by users

**Why?**:
- Prevents bait-and-switch (good review → edit to bad)
- Maintains moderation integrity
- Users can contact support for legitimate changes

**Implementation**:
```typescript
async updateReview(
  reviewId: string,
  userId: string,
  input: UpdateReviewInput
): Promise<Review> {
  // Check if review is approved
  const existingReview = await this.pool.query(
    `SELECT is_approved, user_id FROM reviews WHERE id = $1`,
    [reviewId]
  );

  if (existingReview.rows.length === 0) {
    throw new NotFoundError('Review not found');
  }

  if (existingReview.rows[0].user_id !== userId) {
    throw new AuthorizationError('You can only update your own reviews');
  }

  // ← KEY CHECK: Prevent editing approved reviews
  if (existingReview.rows[0].is_approved) {
    throw new ValidationError(
      'Cannot update an approved review. ' +
      'Please contact support if you need to make changes.'
    );
  }

  // Proceed with update...
}
```

**User Experience**:
```typescript
// Frontend: Disable edit button for approved reviews
<ReviewCard review={review}>
  {review.isApproved ? (
    <div className="text-gray-500">
      Review approved and locked
      <button onClick={contactSupport}>Request Edit</button>
    </div>
  ) : (
    <button onClick={editReview}>Edit Review</button>
  )}
</ReviewCard>
```

---

## Implementation Tutorials

### Tutorial 1: Create a Review with Validation

**Goal**: Implement `createReview()` with comprehensive validation

**Step 1: Define Input Interface**
```typescript
export interface CreateReviewInput {
  userId: string;
  courseId: string;
  rating: number;    // 1-5
  comment?: string;  // Optional
}
```

**Step 2: Validate Rating**
```typescript
async createReview(input: CreateReviewInput): Promise<Review> {
  // Validation: Rating must be 1-5
  if (!input.rating || input.rating < 1 || input.rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }

  // Continue...
}
```

**Why this pattern?**
- Check `!input.rating` first (handles null/undefined/0)
- Then check range
- Throw immediately with clear message

**Step 3: Validate Required Fields**
```typescript
// Validation: Required fields
if (!input.userId || !input.courseId) {
  throw new ValidationError('User ID and Course ID are required');
}
```

**Step 4: Sanitize Comment**
```typescript
// Trim and convert empty to null
const comment = input.comment?.trim() || null;
```

**Why?**
- `.trim()` removes leading/trailing whitespace
- `|| null` converts empty string to NULL
- Optional chaining `?.` handles undefined

**Step 5: Verify Purchase**
```typescript
const purchaseCheck = await this.pool.query(
  `SELECT 1 FROM order_items oi
   JOIN orders o ON oi.order_id = o.id
   WHERE o.user_id = $1
     AND oi.course_id = $2
     AND o.status = 'completed'
   LIMIT 1`,
  [input.userId, input.courseId]
);

if (purchaseCheck.rows.length === 0) {
  throw new AuthorizationError(
    'You can only review courses you have purchased'
  );
}
```

**Step 6: Insert Review**
```typescript
try {
  const result = await this.pool.query(
    `INSERT INTO reviews (user_id, course_id, rating, comment, is_approved)
     VALUES ($1, $2, $3, $4, false)
     RETURNING
       id,
       user_id as "userId",
       course_id as "courseId",
       rating,
       comment,
       is_approved as "isApproved",
       created_at as "createdAt",
       updated_at as "updatedAt"`,
    [input.userId, input.courseId, input.rating, comment]
  );

  return result.rows[0];
} catch (error: any) {
  if (error.code === '23505') {
    throw new DatabaseError(
      'You have already reviewed this course. ' +
      'You can update your existing review instead.'
    );
  }
  throw new DatabaseError(`Failed to create review: ${error.message}`);
}
```

**Key Techniques**:
- ✅ `RETURNING` clause gets inserted data without extra query
- ✅ Alias columns to camelCase (`user_id as "userId"`)
- ✅ Catch unique constraint violation (`error.code === '23505'`)
- ✅ Provide helpful error messages

---

### Tutorial 2: Calculate Review Statistics

**Goal**: Calculate average rating and distribution in single query

**Challenge**: Need to get:
- Total review count
- Approved review count
- Average rating (approved only)
- Distribution (how many 1-star, 2-star, etc.)

**❌ Inefficient Approach** (6 queries):
```typescript
const total = await pool.query(
  `SELECT COUNT(*) FROM reviews WHERE course_id = $1`
);

const approved = await pool.query(
  `SELECT COUNT(*) FROM reviews WHERE course_id = $1 AND is_approved = true`
);

const avg = await pool.query(
  `SELECT AVG(rating) FROM reviews WHERE course_id = $1 AND is_approved = true`
);

const rating1 = await pool.query(
  `SELECT COUNT(*) FROM reviews WHERE course_id = $1 AND rating = 1 AND is_approved = true`
);

// ... repeat for ratings 2-5
```

**✅ Efficient Approach** (1 query with FILTER):
```typescript
async getCourseReviewStats(courseId: string): Promise<CourseReviewStats> {
  const result = await this.pool.query(
    `SELECT
       COUNT(*) as total_reviews,
       COUNT(*) FILTER (WHERE is_approved = true) as approved_reviews,
       COALESCE(AVG(rating) FILTER (WHERE is_approved = true), 0) as avg_rating,
       COUNT(*) FILTER (WHERE rating = 1 AND is_approved = true) as rating_1,
       COUNT(*) FILTER (WHERE rating = 2 AND is_approved = true) as rating_2,
       COUNT(*) FILTER (WHERE rating = 3 AND is_approved = true) as rating_3,
       COUNT(*) FILTER (WHERE rating = 4 AND is_approved = true) as rating_4,
       COUNT(*) FILTER (WHERE rating = 5 AND is_approved = true) as rating_5
     FROM reviews
     WHERE course_id = $1`,
    [courseId]
  );

  const row = result.rows[0];

  return {
    courseId,
    totalReviews: parseInt(row.total_reviews),
    approvedReviews: parseInt(row.approved_reviews),
    avgRating: parseFloat(row.avg_rating).toFixed(1) as any,
    ratingDistribution: {
      1: parseInt(row.rating_1),
      2: parseInt(row.rating_2),
      3: parseInt(row.rating_3),
      4: parseInt(row.rating_4),
      5: parseInt(row.rating_5)
    }
  };
}
```

**PostgreSQL FILTER Clause Explained**:
```sql
-- FILTER is like a WHERE clause for aggregations
COUNT(*) FILTER (WHERE is_approved = true)

-- Equivalent to:
SELECT COUNT(*) FROM reviews WHERE is_approved = true
```

**Benefits**:
- ✅ Single database round-trip
- ✅ More efficient query plan
- ✅ Atomic snapshot (all stats from same moment)
- ✅ Less code to maintain

**Why COALESCE?**:
```sql
-- If no reviews, AVG returns NULL
-- COALESCE converts NULL to 0
COALESCE(AVG(rating) FILTER (WHERE is_approved = true), 0)
```

---

### Tutorial 3: Implement Pagination with hasMore

**Goal**: Paginate reviews with "Load More" detection

**Standard Pagination** (requires 2 queries):
```typescript
// Query 1: Get reviews
const reviews = await pool.query(
  `SELECT * FROM reviews LIMIT $1 OFFSET $2`,
  [limit, offset]
);

// Query 2: Get total count
const count = await pool.query(
  `SELECT COUNT(*) FROM reviews`
);

return {
  reviews: reviews.rows,
  total: count.rows[0].count,
  page: page,
  limit: limit,
  totalPages: Math.ceil(count.rows[0].count / limit)
};
```

**Optimized Pagination** (LIMIT + 1 technique):
```typescript
async getReviews(options: ListReviewsOptions = {}): Promise<PaginatedReviews> {
  const { page = 1, limit = 20 } = options;

  // Fetch ONE MORE than limit
  const offset = (page - 1) * limit;
  const reviewsResult = await this.pool.query(
    `SELECT * FROM reviews
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit + 1, offset]  // ← Fetch limit + 1
  );

  // Check if there are more results
  const hasMore = reviewsResult.rows.length > limit;

  // Remove extra item if present
  const reviews = hasMore
    ? reviewsResult.rows.slice(0, limit)
    : reviewsResult.rows;

  // Still need count for UI (can cache this)
  const countResult = await this.pool.query(
    `SELECT COUNT(*) as total FROM reviews`
  );

  const total = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(total / limit);

  return {
    reviews,
    total,
    page,
    limit,
    totalPages,
    hasMore  // ← Tells UI if "Load More" button should show
  };
}
```

**How it works**:
1. Request `limit + 1` rows (e.g., 21 instead of 20)
2. If we get 21 rows → there are more pages (hasMore = true)
3. If we get ≤20 rows → this is the last page (hasMore = false)
4. Return only first 20 rows to client

**Benefits**:
- ✅ No extra query to check if more pages exist
- ✅ Efficient for "Load More" UI pattern
- ✅ Works with infinite scroll

**When to use COUNT**:
- Need total page count
- Need "Page 1 of 10" display
- Can cache count result (rarely changes)

---

### Tutorial 4: Build Flexible Filtering

**Goal**: Support multiple optional filters in single method

**Flexible Filter Pattern**:
```typescript
async getReviews(options: ListReviewsOptions = {}): Promise<PaginatedReviews> {
  const {
    courseId,
    userId,
    isApproved = true,
    minRating,
    maxRating,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = options;

  // Build WHERE clause dynamically
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (courseId) {
    conditions.push(`course_id = $${paramIndex++}`);
    values.push(courseId);
  }

  if (userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    values.push(userId);
  }

  if (isApproved !== undefined) {
    conditions.push(`is_approved = $${paramIndex++}`);
    values.push(isApproved);
  }

  if (minRating !== undefined) {
    conditions.push(`rating >= $${paramIndex++}`);
    values.push(minRating);
  }

  if (maxRating !== undefined) {
    conditions.push(`rating <= $${paramIndex++}`);
    values.push(maxRating);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Build ORDER BY clause
  const validSortFields = ['createdAt', 'rating', 'updatedAt'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const sortFieldMap: Record<string, string> = {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    rating: 'rating'
  };

  const sqlSortField = sortFieldMap[sortField];

  // Execute query
  const offset = (page - 1) * limit;
  values.push(limit + 1, offset);

  const query = `
    SELECT * FROM reviews
    ${whereClause}
    ORDER BY ${sqlSortField} ${order}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const result = await this.pool.query(query, values);

  // Process results...
}
```

**Key Techniques**:

1. **Dynamic Conditions**:
```typescript
const conditions: string[] = [];
const values: any[] = [];
let paramIndex = 1;

// Add condition only if parameter provided
if (courseId) {
  conditions.push(`course_id = $${paramIndex++}`);
  values.push(courseId);
}

// Build WHERE clause
const whereClause = conditions.length > 0
  ? `WHERE ${conditions.join(' AND ')}`
  : '';
```

2. **Parameter Index Tracking**:
```typescript
let paramIndex = 1;

// Each time we add a parameter, increment index
conditions.push(`course_id = $${paramIndex++}`);  // $1
conditions.push(`user_id = $${paramIndex++}`);    // $2
conditions.push(`rating >= $${paramIndex++}`);    // $3
```

3. **SQL Injection Prevention**:
```typescript
// ❌ NEVER concatenate user input
const query = `SELECT * FROM reviews WHERE rating = ${userInput}`;

// ✅ ALWAYS use parameterized queries
const query = `SELECT * FROM reviews WHERE rating = $1`;
const result = await pool.query(query, [userInput]);
```

4. **Sort Field Validation**:
```typescript
// Prevent SQL injection via sort field
const validSortFields = ['createdAt', 'rating', 'updatedAt'];
const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

// Map camelCase to snake_case
const sortFieldMap: Record<string, string> = {
  createdAt: 'created_at',
  rating: 'rating'
};

const sqlSortField = sortFieldMap[sortField];
```

---

## Database Design

### Schema Design Principles

**1. Use UUIDs for Primary Keys**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- UUIDs are:
  -- ✅ Globally unique (no collisions across databases)
  -- ✅ Non-sequential (harder to guess)
  -- ✅ Mergeable (combine databases without conflicts)
  -- ❌ Larger than integers (16 bytes vs 4 bytes)
);
```

**2. Foreign Keys with Cascade**
```sql
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
-- If user deleted → delete their reviews automatically
-- Prevents orphaned reviews

course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
-- If course deleted → delete its reviews
-- Keeps database clean
```

**3. CHECK Constraints for Validation**
```sql
rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
-- Database enforces rating range
-- Backup to application validation
-- Prevents bad data from any source (SQL console, imports, etc.)
```

**4. UNIQUE Constraints for Business Rules**
```sql
UNIQUE(user_id, course_id)
-- One review per user per course
-- Enforced at database level
-- Cannot be bypassed
```

**5. Indexes for Performance**
```sql
-- Index foreign keys (used in JOINs)
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_course_id ON reviews(course_id);

-- Index filter columns (used in WHERE)
CREATE INDEX idx_reviews_approved ON reviews(is_approved);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Composite index for common query pattern
CREATE INDEX idx_reviews_course_approved ON reviews(course_id, is_approved);
-- Fast for: WHERE course_id = X AND is_approved = true
```

**6. Timestamps for Audit Trail**
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Normalization vs Denormalization

**Normalized Design** (Current):
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  rating INTEGER,
  comment TEXT,
  is_approved BOOLEAN
);

-- To display review, need JOIN
SELECT
  r.*,
  u.name as user_name,
  c.title as course_title
FROM reviews r
JOIN users u ON r.user_id = u.id
JOIN courses c ON r.course_id = c.id;
```

**Denormalized Design** (Alternative):
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),  -- ← Denormalized
  course_id UUID REFERENCES courses(id),
  course_title VARCHAR(255),  -- ← Denormalized
  rating INTEGER,
  comment TEXT,
  is_approved BOOLEAN
);

-- Can display without JOIN
SELECT * FROM reviews;
```

**Trade-offs**:

| Aspect | Normalized | Denormalized |
|--------|-----------|--------------|
| **Storage** | Less space | More space |
| **Consistency** | Always correct | Can become stale |
| **Read Speed** | Slower (JOIN) | Faster (no JOIN) |
| **Write Speed** | Faster | Slower (update multiple places) |
| **Complexity** | Lower | Higher |

**Recommendation**: Start normalized, denormalize only if performance issues

---

## Business Logic Patterns

### Pattern 1: Service Layer Validation

**Principle**: Validate at service layer, not just API layer

**Why?**:
- Service can be called from API, CLI, jobs, tests
- Defense in depth (multiple validation layers)
- Clear error messages

**Implementation**:
```typescript
async createReview(input: CreateReviewInput): Promise<Review> {
  // ✅ Validate in service
  if (!input.rating || input.rating < 1 || input.rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }

  // Even if API validates, service validates too
  // Protects against:
  // - Bugs in API validation
  // - CLI/job bypassing API
  // - Direct service usage in tests
}
```

### Pattern 2: Fail Fast

**Principle**: Validate and fail early before expensive operations

**Bad Example**:
```typescript
async createReview(input: CreateReviewInput): Promise<Review> {
  // ❌ Check purchase after database transaction started
  await pool.query('BEGIN');

  const review = await pool.query(`INSERT INTO reviews ...`);

  const purchase = await pool.query(`SELECT FROM orders ...`);
  if (!purchase.rows.length) {
    await pool.query('ROLLBACK');
    throw new Error('Not purchased');
  }

  await pool.query('COMMIT');
}
```

**Good Example**:
```typescript
async createReview(input: CreateReviewInput): Promise<Review> {
  // ✅ Check purchase BEFORE starting transaction
  const purchase = await pool.query(`SELECT FROM orders ...`);
  if (!purchase.rows.length) {
    throw new AuthorizationError('You can only review courses you have purchased');
  }

  // Now do database write
  const review = await pool.query(`INSERT INTO reviews ...`);
  return review.rows[0];
}
```

### Pattern 3: Consistent Error Types

**Principle**: Use semantic error classes, not generic Error

**Bad Example**:
```typescript
if (!input.rating) {
  throw new Error('Invalid rating');  // ❌ Generic
}

if (!purchase) {
  throw new Error('Cannot review');  // ❌ Unclear
}

if (!review) {
  throw new Error('Not found');  // ❌ Generic
}
```

**Good Example**:
```typescript
if (!input.rating || input.rating < 1 || input.rating > 5) {
  throw new ValidationError('Rating must be between 1 and 5');  // ✅ Specific
}

if (!purchase.rows.length) {
  throw new AuthorizationError('You can only review courses you have purchased');  // ✅ Semantic
}

if (!review.rows.length) {
  throw new NotFoundError('Review not found');  // ✅ Clear
}
```

**Benefits**:
- API layer can map to HTTP status codes
- Frontend can handle different error types
- Logs are more meaningful

**Error Class Mapping**:
```typescript
// In API layer
try {
  const review = await reviewService.createReview(data);
  return res.json(review);
} catch (error) {
  if (error instanceof ValidationError) {
    return res.status(400).json({ error: error.message });
  }
  if (error instanceof AuthorizationError) {
    return res.status(403).json({ error: error.message });
  }
  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: error.message });
  }
  // etc.
}
```

### Pattern 4: Return Full Objects

**Principle**: Return complete objects from service, not partial data

**Bad Example**:
```typescript
async createReview(input: CreateReviewInput): Promise<string> {
  const result = await pool.query(`INSERT ... RETURNING id`);
  return result.rows[0].id;  // ❌ Only returns ID
}

// Caller needs full object, requires second query
const id = await reviewService.createReview(data);
const review = await reviewService.getReviewById(id);  // Extra query!
```

**Good Example**:
```typescript
async createReview(input: CreateReviewInput): Promise<Review> {
  const result = await pool.query(
    `INSERT ... RETURNING *`  // ✅ Return all columns
  );
  return result.rows[0];  // ✅ Full object
}

// Caller has everything
const review = await reviewService.createReview(data);
console.log(review.id, review.rating, review.createdAt);  // All available
```

---

## Error Handling Strategies

### Custom Error Classes

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database error occurred') {
    super(message, 500, 'DATABASE_ERROR');
  }
}
```

### Error Recovery Patterns

**Pattern 1: Retry with Backoff** (for transient errors)
```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const review = await retryOperation(
  () => reviewService.createReview(input)
);
```

**Pattern 2: Circuit Breaker** (for failing services)
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > 60000) {  // 1 minute timeout
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();

    if (this.failures >= 5) {
      this.state = 'OPEN';
    }
  }
}
```

---

## Testing Best Practices

### Test Structure: AAA Pattern

**Arrange-Act-Assert**:
```typescript
it('should create a review successfully', async () => {
  // Arrange: Set up test data
  const input: CreateReviewInput = {
    userId: testUserId,
    courseId: testCourseId,
    rating: 5,
    comment: 'Excellent course!'
  };

  // Act: Execute the operation
  const review = await reviewService.createReview(input);

  // Assert: Verify results
  expect(review).toBeDefined();
  expect(review.userId).toBe(testUserId);
  expect(review.rating).toBe(5);
  expect(review.isApproved).toBe(false);
});
```

### Test Data Isolation

**Pattern**: Clean database before each test
```typescript
beforeEach(async () => {
  // Delete in reverse dependency order
  await pool.query(`DELETE FROM reviews WHERE 1=1`);
  await pool.query(`DELETE FROM order_items WHERE 1=1`);
  await pool.query(`DELETE FROM orders WHERE 1=1`);
  await pool.query(`DELETE FROM courses WHERE title LIKE 'Test%'`);
  await pool.query(`DELETE FROM users WHERE email LIKE 'test%@test.com'`);

  // Create fresh test data
  // ...
});
```

**Why?**:
- Tests don't affect each other
- Tests can run in any order
- Tests can run in parallel
- Reproducible results

### Testing Error Paths

**Pattern**: Use `expect().rejects.toThrow()`
```typescript
it('should reject invalid rating', async () => {
  const input = {
    userId: testUserId,
    courseId: testCourseId,
    rating: 0  // Invalid!
  };

  // Test error is thrown
  await expect(
    reviewService.createReview(input)
  ).rejects.toThrow(ValidationError);

  // Test error message
  await expect(
    reviewService.createReview(input)
  ).rejects.toThrow('Rating must be between 1 and 5');
});
```

### Mock vs Real Database

**Real Database** (current approach):
```typescript
// Pros:
// ✅ Tests actual SQL queries
// ✅ Catches database-specific issues
// ✅ Tests constraints and triggers
// ✅ No mocking complexity

// Cons:
// ❌ Slower than mocks
// ❌ Requires database setup
// ❌ Harder to test edge cases
```

**Mocked Database**:
```typescript
import { vi } from 'vitest';

const mockPool = {
  query: vi.fn()
};

// Pros:
// ✅ Fast tests
// ✅ Easy to simulate errors
// ✅ No database needed

// Cons:
// ❌ Don't test real SQL
// ❌ May miss database issues
// ❌ More setup code
```

**Recommendation**: Use real database for service layer, mocks for unit tests

---

## Security Considerations

### SQL Injection Prevention

**❌ Vulnerable**:
```typescript
// NEVER do this!
const rating = req.query.rating;
const query = `SELECT * FROM reviews WHERE rating = ${rating}`;
await pool.query(query);

// Attacker sends: rating = "5 OR 1=1"
// Executes: SELECT * FROM reviews WHERE rating = 5 OR 1=1
// Returns ALL reviews!
```

**✅ Safe**:
```typescript
const rating = req.query.rating;
const query = `SELECT * FROM reviews WHERE rating = $1`;
await pool.query(query, [rating]);

// pg library escapes parameters
// Safe against SQL injection
```

### Authorization Checks

**Multi-Level Checks**:
```typescript
// Level 1: API middleware
app.use('/api/reviews/:id', requireAuth);

// Level 2: Route handler
if (req.user.id !== review.userId && req.user.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}

// Level 3: Service method
async updateReview(reviewId: string, userId: string, input: UpdateReviewInput) {
  const review = await this.getReviewById(reviewId);

  if (review.userId !== userId) {
    throw new AuthorizationError('You can only update your own reviews');
  }

  // Proceed...
}
```

### Rate Limiting

**Prevent Spam Reviews**:
```typescript
// src/middleware/rateLimit.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'reviews',
  points: 5,  // 5 reviews
  duration: 3600,  // per hour
});

// In API route
try {
  await rateLimiter.consume(req.user.id);
  const review = await reviewService.createReview(data);
  res.json(review);
} catch (error) {
  res.status(429).json({
    error: 'Too many reviews. Please try again later.'
  });
}
```

---

## Common Pitfalls

### Pitfall 1: Not Handling Null Comments

**Problem**:
```typescript
const comment = input.comment.trim();  // ❌ Crashes if comment is undefined
```

**Solution**:
```typescript
const comment = input.comment?.trim() || null;  // ✅ Safe
```

### Pitfall 2: Not Validating Sort Fields

**Problem**:
```typescript
const sortBy = req.query.sortBy;
const query = `SELECT * FROM reviews ORDER BY ${sortBy}`;  // ❌ SQL injection!
```

**Solution**:
```typescript
const validSortFields = ['createdAt', 'rating', 'updatedAt'];
const sortBy = validSortFields.includes(req.query.sortBy)
  ? req.query.sortBy
  : 'createdAt';  // ✅ Whitelist approach
```

### Pitfall 3: Forgetting Pagination

**Problem**: Loading all reviews crashes with large datasets

**Solution**: Always paginate
```typescript
const limit = Math.min(req.query.limit || 20, 100);  // Max 100
```

### Pitfall 4: Not Indexing Foreign Keys

**Problem**: Slow JOINs

**Solution**:
```sql
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_course_id ON reviews(course_id);
```

---

## Advanced Topics

### Topic 1: Review Replies (Future Enhancement)

Allow course instructors to reply to reviews:

```sql
CREATE TABLE review_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    -- Only instructors can reply
    EXISTS (
      SELECT 1 FROM courses c
      JOIN reviews r ON c.id = r.course_id
      WHERE r.id = review_id AND c.instructor_id = user_id
    )
  )
);
```

### Topic 2: Review Helpful Votes

Allow users to vote reviews as helpful:

```sql
CREATE TABLE review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(review_id, user_id)
);

-- Aggregate helpful count
SELECT
  r.*,
  COUNT(*) FILTER (WHERE rv.is_helpful = true) as helpful_count
FROM reviews r
LEFT JOIN review_votes rv ON r.id = rv.review_id
GROUP BY r.id;
```

### Topic 3: Review Images

Allow users to upload images with reviews:

```sql
CREATE TABLE review_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## Real-World Examples

### Example 1: Amazon-Style Reviews

```typescript
// Enhanced review with verified purchase badge
interface AmazonStyleReview extends Review {
  isVerifiedPurchase: boolean;
  helpfulVotes: number;
  totalVotes: number;
  reviewerRank: string;  // "Top 500 Reviewer"
  reviewImages: string[];
}
```

### Example 2: Yelp-Style Reviews

```typescript
// Reviews with business owner responses
interface YelpStyleReview extends Review {
  ownerResponse?: {
    content: string;
    respondedAt: Date;
  };
  wasUpdated: boolean;
  editHistory: Array<{
    rating: number;
    comment: string;
    editedAt: Date;
  }>;
}
```

### Example 3: App Store-Style Reviews

```typescript
// Reviews with version tracking
interface AppStoreReview extends Review {
  appVersion: string;
  deviceType: string;
  wasHelpful: boolean;
  developerResponse?: {
    content: string;
    respondedAt: Date;
  };
}
```

---

## Conclusion

### Key Takeaways

1. **Service Layer Architecture**
   - Separate business logic from HTTP handling
   - Testable without web framework
   - Reusable across different interfaces

2. **Database Design**
   - Use constraints for data integrity
   - Index for performance
   - Normalize first, denormalize only if needed

3. **Business Logic**
   - Validate early and clearly
   - Use semantic error classes
   - Fail fast on authorization

4. **Testing**
   - Test happy paths AND error paths
   - Isolate test data
   - Use real database for integration tests

5. **Security**
   - Never trust user input
   - Use parameterized queries
   - Multi-level authorization checks

### Next Steps

1. **Implement API Endpoints** (T114-T115)
   - Create POST /api/reviews
   - Create PUT /api/reviews/:id
   - Create DELETE /api/reviews/:id

2. **Build Frontend** (T116-T117)
   - Review submission form
   - Review display on course pages
   - Rating stars and distribution

3. **Admin Interface** (T118-T120)
   - Pending reviews list
   - Approve/reject buttons
   - Email notifications

### Further Reading

- [PostgreSQL Aggregate Functions](https://www.postgresql.org/docs/current/functions-aggregate.html)
- [SQL Anti-Patterns](https://pragprog.com/titles/bksqla/sql-antipatterns/)
- [Service Layer Pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html)
- [Testing Strategies](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**Guide Version**: 1.0
**Last Updated**: November 2, 2025
**Author**: Claude (Anthropic)
**Skill Level**: Intermediate to Advanced
