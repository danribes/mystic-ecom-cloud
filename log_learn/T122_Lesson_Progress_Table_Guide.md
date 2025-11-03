# T122: Lesson Progress Table - Learning Guide

**Topic**: Database Design for Lesson-Level Progress Tracking  
**Difficulty**: Intermediate  
**Prerequisites**: SQL basics, PostgreSQL, database normalization  
**Date**: November 2, 2025  

---

## Table of Contents

1. [Introduction](#introduction)
2. [Concepts Overview](#concepts-overview)
3. [Storage Models: JSONB vs Relational](#storage-models-jsonb-vs-relational)
4. [Table Design Principles](#table-design-principles)
5. [Column Design Rationale](#column-design-rationale)
6. [Constraint Types](#constraint-types)
7. [Index Strategy](#index-strategy)
8. [Timestamp Management](#timestamp-management)
9. [Time Tracking Patterns](#time-tracking-patterns)
10. [Attempt Tracking](#attempt-tracking)
11. [Score Storage](#score-storage)
12. [Trigger Usage](#trigger-usage)
13. [Foreign Key Cascades](#foreign-key-cascades)
14. [Analytics Queries](#analytics-queries)
15. [Performance Optimization](#performance-optimization)
16. [Testing Database Schemas](#testing-database-schemas)
17. [Common Pitfalls](#common-pitfalls)
18. [Best Practices](#best-practices)
19. [Integration Patterns](#integration-patterns)
20. [Complementary Design](#complementary-design)
21. [Migration Strategies](#migration-strategies)
22. [Exercises](#exercises)

---

## Introduction

### What is Lesson-Level Progress Tracking?

In educational applications, tracking student progress is essential. While **course-level tracking** (T121) provides a high-level overview, **lesson-level tracking** (T122) offers detailed insights into individual lesson engagement, difficulty, and performance.

### Why Do We Need Both?

**Course-Level Tracking** (course_progress table):
- Fast dashboard reads ("80% complete")
- Simple progress bars
- Resume functionality ("Continue where you left off")
- JSONB storage for speed

**Lesson-Level Tracking** (lesson_progress table):
- Detailed analytics ("Lesson 5 is difficult")
- Time spent per lesson
- Attempt tracking (retries)
- Quiz/assessment scores
- Relational storage for flexibility

### Real-World Example

Imagine a user taking a "Web Development" course:

1. **Dashboard View** (uses course_progress):
   - "You're 65% through Web Development"
   - "12 of 18 lessons completed"
   - "Continue Lesson 13: React Hooks"

2. **Analytics View** (uses lesson_progress):
   - "Lesson 13 has highest attempts (avg 4.2) → consider simplifying"
   - "Users spend avg 45 minutes on Lesson 8"
   - "Quiz scores for Lesson 10: avg 72%"

Both views use the same underlying data but serve different purposes.

---

## Concepts Overview

### Key Terms

- **Progress**: User's advancement through course material
- **Completion**: Binary state (done vs not done)
- **Engagement**: Time spent, attempts made
- **Performance**: Quiz scores, assessment results
- **Analytics**: Aggregate data across users
- **Tracking**: Recording user actions over time

### Entities

- **User**: Person taking the course
- **Course**: Collection of lessons
- **Lesson**: Individual unit of instruction
- **Progress Record**: User's state for one lesson

### Relationships

```
User ──< lesson_progress >── Lesson
         (many-to-many)
         
Course ──< lesson_progress
           (one-to-many)
```

**Note**: A user can have many lesson progress records, and a lesson can have progress from many users.

---

## Storage Models: JSONB vs Relational

### JSONB Approach (T121: course_progress)

**Example**:
```json
{
  "user_id": "uuid-123",
  "course_id": "uuid-456",
  "completed_lessons": ["lesson-1", "lesson-2", "lesson-3"],
  "progress_percentage": 60
}
```

**Pros**:
- ✅ Fast reads (single row per user/course)
- ✅ Simple schema (fewer tables)
- ✅ Flexible structure (add fields easily)
- ✅ Good for dashboards (quick lookups)

**Cons**:
- ❌ Can't query by lesson easily ("Show all users who completed lesson-5")
- ❌ No detailed tracking (time, attempts, scores)
- ❌ Limited analytics (can't aggregate across lessons)
- ❌ Harder to maintain (manual array updates)

### Relational Approach (T122: lesson_progress)

**Example**:
```sql
user_id      | course_id | lesson_id  | completed | time_spent | attempts | score
uuid-123     | uuid-456  | lesson-1   | true      | 180        | 1        | 90
uuid-123     | uuid-456  | lesson-2   | true      | 240        | 2        | 85
uuid-123     | uuid-456  | lesson-3   | false     | 120        | 3        | NULL
```

**Pros**:
- ✅ Rich per-lesson data (time, attempts, scores)
- ✅ Easy to query ("SELECT * FROM lesson_progress WHERE lesson_id = 'lesson-5'")
- ✅ Powerful analytics (AVG time, MAX attempts, SUM scores)
- ✅ Standard SQL operations (JOIN, GROUP BY, ORDER BY)

**Cons**:
- ❌ More rows (one per user/course/lesson combination)
- ❌ Slower for dashboard queries (need aggregation)
- ❌ More complex schema (multiple tables)

### When to Use Each?

| Use Case | Approach |
|----------|----------|
| Dashboard progress bars | JSONB (course_progress) |
| "Resume where you left off" | JSONB (course_progress) |
| Course completion percentage | JSONB (course_progress) |
| Per-lesson analytics | Relational (lesson_progress) |
| Time spent tracking | Relational (lesson_progress) |
| Difficulty analysis (attempts) | Relational (lesson_progress) |
| Quiz score aggregation | Relational (lesson_progress) |
| Detailed reporting | Relational (lesson_progress) |

### Hybrid Approach (Our Solution)

**Best of Both Worlds**:
- Use **JSONB in course_progress** for fast dashboard reads
- Use **relational lesson_progress** for detailed analytics
- Keep them in sync (when lesson completed, update both)

**Trade-off**:
- Slightly more complex (two tables to maintain)
- Requires synchronization logic
- But: optimal performance for each use case

---

## Table Design Principles

### 1. Normalization

**Definition**: Organizing data to reduce redundancy and improve integrity.

**Our Design**:
- **User data**: Separate `users` table (not duplicated)
- **Course data**: Separate `courses` table (not duplicated)
- **Progress data**: `lesson_progress` table (only progress, not lesson content)

**Why?**
- If user email changes, update once in `users` table
- If course title changes, update once in `courses` table
- Progress data remains stable and clean

### 2. Atomic Values

**Definition**: Each column should hold a single value (not arrays or JSON).

**Our Design**:
- `time_spent_seconds`: Single integer (not array of session times)
- `attempts`: Single counter (not array of attempt timestamps)
- `score`: Single integer (not JSON object with multiple scores)

**Why?**
- Easy to query: `WHERE time_spent_seconds > 300`
- Easy to aggregate: `AVG(score)`
- No parsing required

### 3. Foreign Keys

**Definition**: Links between tables that ensure referential integrity.

**Our Design**:
```sql
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE
```

**Why?**
- Can't create progress for non-existent user (integrity)
- Can't create progress for non-existent course (integrity)
- When user deleted, progress auto-deleted (cleanup)

### 4. Constraints

**Definition**: Rules that enforce data validity.

**Our Design**:
- `UNIQUE(user_id, course_id, lesson_id)` → No duplicate progress
- `CHECK (time_spent_seconds >= 0)` → No negative time
- `CHECK (score >= 0 AND score <= 100)` → Valid score range

**Why?**
- Database enforces rules (not application code)
- Impossible to insert invalid data
- Data quality guaranteed

---

## Column Design Rationale

### Primary Key: `id`

```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**Type**: UUID (Universally Unique Identifier)

**Why UUID instead of INTEGER?**
- ✅ Globally unique (no collisions across servers)
- ✅ Can generate client-side (offline support)
- ✅ No sequential guessing (security)
- ❌ Larger storage (16 bytes vs 4 bytes)

**When to use INTEGER**:
- Single-server application
- Need sequential IDs (ORDER BY id)
- Storage is critical

**When to use UUID**:
- Distributed systems (microservices)
- Client-side generation needed
- Security concern (no ID guessing)

### Foreign Keys: `user_id`, `course_id`

```sql
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE
```

**NOT NULL**: Required fields (can't have progress without user/course)

**REFERENCES**: Links to parent tables (enforces existence)

**ON DELETE CASCADE**: Automatic cleanup when parent deleted

**Example**:
```sql
-- User deletes account
DELETE FROM users WHERE id = 'user-123';

-- Automatically deletes:
-- DELETE FROM lesson_progress WHERE user_id = 'user-123';
```

**Why CASCADE?**
- ✅ Automatic cleanup (no orphaned records)
- ✅ Consistent state (referential integrity)
- ✅ Simplifies application code

**Alternative: ON DELETE SET NULL**:
```sql
user_id UUID REFERENCES users(id) ON DELETE SET NULL
```
- Progress remains but user_id becomes NULL (for historical data)
- Choose based on requirements (privacy vs analytics)

### Lesson Identifier: `lesson_id`

```sql
lesson_id VARCHAR(255) NOT NULL
```

**Why VARCHAR instead of UUID?**
- Lessons might use string IDs ("intro-to-react", "lesson-001")
- No lessons table exists yet (future enhancement)
- Flexible for different ID formats

**Why NOT NULL?**
- Progress must be for a specific lesson

**Why 255 characters?**
- Standard maximum for identifiers
- Handles URLs ("https://example.com/courses/web-dev/lessons/intro")
- Balance between flexibility and storage

**Trade-off**:
- ❌ No referential integrity (could reference non-existent lesson)
- ✅ No dependency on lessons table (phased implementation)

### Completion Status: `completed`

```sql
completed BOOLEAN DEFAULT false
```

**Why BOOLEAN instead of TIMESTAMP?**
- Simple binary state (done vs not done)
- Fast filtering (`WHERE completed = true`)
- Separate `completed_at` timestamp for when it was completed

**DEFAULT false**:
- New progress records start incomplete
- Explicit completion required

**Use Cases**:
- Filter completed lessons: `WHERE completed = true`
- Count incomplete: `COUNT(*) WHERE completed = false`
- Calculate completion percentage

### Time Tracking: `time_spent_seconds`

```sql
time_spent_seconds INTEGER DEFAULT 0 CHECK (time_spent_seconds >= 0)
```

**Why INTEGER seconds?**
- Simple arithmetic: `time_spent_seconds + 60`
- No decimal precision issues
- Easy to convert: `time_spent_seconds / 60` = minutes

**Why NOT INTERVAL?**
- INTERVAL is PostgreSQL-specific (less portable)
- More complex queries (harder to aggregate)
- INTEGER is universal

**CHECK constraint**:
- Prevents negative time (invalid)
- Enforced at database level (can't bypass)

**DEFAULT 0**:
- New records start with zero time
- Incremented as user engages

**Display Conversion**:
```javascript
const seconds = 3665;
const hours = Math.floor(seconds / 3600); // 1
const minutes = Math.floor((seconds % 3600) / 60); // 1
const secs = seconds % 60; // 5
// Display: "1h 1m 5s"
```

### Attempts Counter: `attempts`

```sql
attempts INTEGER DEFAULT 0 CHECK (attempts >= 0)
```

**Purpose**: Track how many times user accessed/attempted lesson

**Use Cases**:
- **Difficulty analysis**: High attempts = difficult lesson
- **Gamification**: Badge for "first-try completion"
- **Analytics**: Average attempts per lesson
- **UX insights**: Identify confusing content

**Increment Logic**:
```sql
UPDATE lesson_progress 
SET attempts = attempts + 1
WHERE user_id = $1 AND lesson_id = $2;
```

**Why INTEGER?**
- Discrete events (can't have 2.5 attempts)
- Easy to count and compare
- Supports all analytics needs

### Score Storage: `score`

```sql
score INTEGER CHECK (score >= 0 AND score <= 100)
```

**Why NULL-able?**
- Not all lessons have quizzes (video lessons, reading)
- NULL = no assessment, 0 = failed assessment
- Distinction matters for analytics

**Why 0-100 range?**
- Standard percentage (universal)
- Easy to display ("You scored 85%")
- Consistent across all quizzes

**CHECK constraint**:
- Prevents invalid scores (150% impossible)
- Enforced at database level

**NULL vs 0**:
```sql
-- Video lesson (no quiz)
INSERT INTO lesson_progress (..., score) VALUES (..., NULL);

-- Failed quiz (0%)
INSERT INTO lesson_progress (..., score) VALUES (..., 0);

-- Passed quiz (85%)
INSERT INTO lesson_progress (..., score) VALUES (..., 85);
```

**Analytics Consideration**:
```sql
-- Average score (ignores NULL)
SELECT AVG(score) FROM lesson_progress WHERE score IS NOT NULL;

-- Don't accidentally count NULL as 0
-- WRONG: SELECT AVG(COALESCE(score, 0)) -- Skews average downward
```

### Timestamps: `first_started_at`, `last_accessed_at`, `completed_at`

```sql
first_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
completed_at TIMESTAMP WITH TIME ZONE
```

**Why THREE timestamps?**

**1. `first_started_at`**:
- When user first accessed lesson
- Never changes (historical record)
- Use case: "Started 3 days ago"

**2. `last_accessed_at`**:
- Most recent activity
- Updated on every access
- Use case: "Last viewed 2 hours ago"

**3. `completed_at`**:
- When marked complete
- NULL until completion
- Use case: "Completed yesterday"

**Why TIMESTAMP WITH TIME ZONE?**
- Handles users in different time zones
- Stores UTC, displays in user's timezone
- Critical for international applications

**Example**:
```sql
-- User in New York starts lesson at 3pm EST
first_started_at: 2025-11-02 15:00:00-05

-- Database stores as UTC
first_started_at: 2025-11-02 20:00:00+00

-- User in Tokyo sees
first_started_at: 2025-11-03 05:00:00+09
```

### Audit Timestamps: `created_at`, `updated_at`

```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
```

**Standard audit trail**:
- `created_at`: When record first created (never changes)
- `updated_at`: When record last modified (auto-updated by trigger)

**Use Cases**:
- Debugging ("When did this progress record appear?")
- Auditing ("Who modified data and when?")
- Caching ("Has this data changed since last fetch?")

---

## Constraint Types

### 1. PRIMARY KEY

```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**What it does**:
- Ensures every row has unique ID
- Creates automatic index on `id`
- Cannot be NULL

**Why we need it**:
- Uniquely identify each progress record
- Fast lookups: `SELECT * FROM lesson_progress WHERE id = 'uuid-123'`

### 2. UNIQUE Constraint

```sql
UNIQUE(user_id, course_id, lesson_id)
```

**What it does**:
- Prevents duplicate progress records
- Composite constraint (all three columns together must be unique)

**Example**:
```sql
-- First insert: OK
INSERT INTO lesson_progress (user_id, course_id, lesson_id)
VALUES ('user-1', 'course-1', 'lesson-1');

-- Second insert: FAILS (duplicate)
INSERT INTO lesson_progress (user_id, course_id, lesson_id)
VALUES ('user-1', 'course-1', 'lesson-1');
-- Error: duplicate key value violates unique constraint

-- Different lesson: OK
INSERT INTO lesson_progress (user_id, course_id, lesson_id)
VALUES ('user-1', 'course-1', 'lesson-2');

-- Different user: OK
INSERT INTO lesson_progress (user_id, course_id, lesson_id)
VALUES ('user-2', 'course-1', 'lesson-1');
```

**Why composite?**
- A user can have progress for multiple lessons (user-1, course-1, lesson-1 AND lesson-2)
- Multiple users can have progress for same lesson (user-1 AND user-2, course-1, lesson-1)
- But: one user can't have duplicate progress for same lesson

### 3. CHECK Constraints

```sql
CHECK (time_spent_seconds >= 0)
CHECK (attempts >= 0)
CHECK (score >= 0 AND score <= 100)
```

**What they do**:
- Enforce business rules at database level
- Reject invalid data immediately

**Examples**:

**Time can't be negative**:
```sql
-- FAILS
INSERT INTO lesson_progress (..., time_spent_seconds)
VALUES (..., -100);
-- Error: new row violates check constraint
```

**Score must be 0-100**:
```sql
-- FAILS (too high)
INSERT INTO lesson_progress (..., score) VALUES (..., 150);

-- FAILS (negative)
INSERT INTO lesson_progress (..., score) VALUES (..., -10);

-- OK (within range)
INSERT INTO lesson_progress (..., score) VALUES (..., 85);
```

**Why at database level?**
- Application code can be bypassed (direct SQL, migrations)
- Database is single source of truth
- Consistent enforcement across all clients

### 4. FOREIGN KEY Constraints

```sql
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE
```

**What they do**:
- Ensure referenced records exist
- Automatic cleanup on delete (CASCADE)

**Example**:

**Can't create progress for non-existent user**:
```sql
INSERT INTO lesson_progress (user_id, course_id, lesson_id)
VALUES ('fake-user-id', 'course-1', 'lesson-1');
-- Error: insert or update on table "lesson_progress" violates foreign key constraint
-- Detail: Key (user_id)=(fake-user-id) is not present in table "users"
```

**Auto-cleanup on delete**:
```sql
-- User has 50 lesson progress records
SELECT COUNT(*) FROM lesson_progress WHERE user_id = 'user-123';
-- Result: 50

-- User deletes account
DELETE FROM users WHERE id = 'user-123';

-- All progress automatically deleted
SELECT COUNT(*) FROM lesson_progress WHERE user_id = 'user-123';
-- Result: 0
```

### 5. NOT NULL Constraint

```sql
user_id UUID NOT NULL
lesson_id VARCHAR(255) NOT NULL
completed BOOLEAN NOT NULL
```

**What it does**:
- Requires value (can't be NULL)
- Ensures critical data always present

**Example**:
```sql
-- FAILS (missing required field)
INSERT INTO lesson_progress (user_id, course_id)
VALUES ('user-1', 'course-1');
-- Error: null value in column "lesson_id" violates not-null constraint

-- OK (all required fields)
INSERT INTO lesson_progress (user_id, course_id, lesson_id)
VALUES ('user-1', 'course-1', 'lesson-1');
```

**Why NOT NULL?**
- Progress must be for a specific user (user_id NOT NULL)
- Progress must be for a specific lesson (lesson_id NOT NULL)
- Completed status must be known (completed NOT NULL, defaults to false)

---

## Index Strategy

### What are Indexes?

**Definition**: Data structures that speed up queries by creating "shortcuts" to data.

**Analogy**: Like a book index
- Without index: Read entire book to find "PostgreSQL" (slow)
- With index: Look up "PostgreSQL" → page 247 (fast)

### Why Index?

**Query Performance**:
```sql
-- Without index on user_id
SELECT * FROM lesson_progress WHERE user_id = 'user-123';
-- Scans all rows: O(n) time, 5000ms for 1M rows

-- With index on user_id
SELECT * FROM lesson_progress WHERE user_id = 'user-123';
-- Index lookup: O(log n) time, 5ms for 1M rows
```

**Trade-off**:
- ✅ Faster reads (queries)
- ❌ Slower writes (inserts/updates must update indexes)
- ❌ More storage (index data)

### Index Types in T122

#### 1. Single-Column Indexes

```sql
CREATE INDEX idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_course_id ON lesson_progress(course_id);
CREATE INDEX idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
```

**Use Cases**:

**User index**:
```sql
-- Get all progress for user
SELECT * FROM lesson_progress WHERE user_id = 'user-123';
```

**Course index**:
```sql
-- Get all progress for course (across all users)
SELECT * FROM lesson_progress WHERE course_id = 'course-456';
```

**Lesson index**:
```sql
-- Get all progress for specific lesson (across all users)
SELECT * FROM lesson_progress WHERE lesson_id = 'lesson-1';
```

#### 2. Composite Index

```sql
CREATE INDEX idx_lesson_progress_user_course ON lesson_progress(user_id, course_id);
```

**Why composite?**
- Common query pattern: "Get all lessons for user in this course"
- Single index covers both columns

**Query Patterns**:
```sql
-- Uses composite index (both columns)
SELECT * FROM lesson_progress 
WHERE user_id = 'user-123' AND course_id = 'course-456';

-- Uses composite index (left-most column)
SELECT * FROM lesson_progress WHERE user_id = 'user-123';

-- Does NOT use composite index (right column only)
SELECT * FROM lesson_progress WHERE course_id = 'course-456';
-- This query uses idx_lesson_progress_course_id instead
```

**Left-Most Prefix Rule**:
- Composite index (A, B) can be used for queries on:
  - (A, B) ✅
  - (A) ✅
  - (B) ❌ (needs separate index)

**Why we have both**:
- `idx_lesson_progress_user_id` (single) → for queries on user_id only
- `idx_lesson_progress_course_id` (single) → for queries on course_id only
- `idx_lesson_progress_user_course` (composite) → for queries on both

#### 3. Boolean Index

```sql
CREATE INDEX idx_lesson_progress_completed ON lesson_progress(completed);
```

**Use Case**:
```sql
-- Get all completed lessons
SELECT * FROM lesson_progress WHERE completed = true;

-- Get all incomplete lessons
SELECT * FROM lesson_progress WHERE completed = false;
```

**Performance**:
- Boolean columns have low cardinality (only 2 values: true/false)
- Index still useful for filtering large datasets
- Especially when most rows have one value (e.g., 90% incomplete, 10% complete)

#### 4. Partial Index

```sql
CREATE INDEX idx_lesson_progress_completed_at ON lesson_progress(completed_at)
WHERE completed_at IS NOT NULL;
```

**What is partial index?**
- Index only rows that meet condition (WHERE clause)
- Smaller index size (only completed lessons)
- Faster queries on completed lessons

**Use Case**:
```sql
-- Get lessons completed recently
SELECT * FROM lesson_progress 
WHERE completed_at > NOW() - INTERVAL '7 days';
-- Uses partial index (only scans completed rows)
```

**Why partial?**
- Most lessons are incomplete (completed_at NULL)
- Indexing NULL values wastes space
- Queries almost always filter by completed_at IS NOT NULL

**Size Comparison**:
```sql
-- Full index: 1M rows → 50MB
CREATE INDEX idx_full ON lesson_progress(completed_at);

-- Partial index: 100K rows (10% complete) → 5MB
CREATE INDEX idx_partial ON lesson_progress(completed_at)
WHERE completed_at IS NOT NULL;
```

### Index Maintenance

**Auto-Update**:
- PostgreSQL automatically updates indexes on INSERT/UPDATE/DELETE
- No manual maintenance required

**Reindexing** (rarely needed):
```sql
-- Rebuild index (removes bloat)
REINDEX INDEX idx_lesson_progress_user_id;
```

**Monitor Index Usage**:
```sql
-- Check if index is being used
SELECT indexrelname, idx_scan 
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' AND tablename = 'lesson_progress';

-- idx_scan = 0 means index never used (consider dropping)
```

---

## Timestamp Management

### Three Timestamp Pattern

**Pattern**:
1. **Creation**: When record first created (never changes)
2. **Last Access**: When record last touched (updates frequently)
3. **Milestone**: When important event occurred (e.g., completion)

**Our Implementation**:
- `created_at`: Record creation
- `last_accessed_at`: Last activity
- `completed_at`: Completion milestone
- `updated_at`: Last modification (any field)

### Use Case: User Activity Timeline

```
Timeline for user's lesson progress:

Day 1, 3pm: Created record (first_started_at, created_at)
Day 1, 3:15pm: Spent 15 minutes (last_accessed_at updated)
Day 2, 10am: Resumed (last_accessed_at updated)
Day 2, 10:30am: Spent 30 more minutes (last_accessed_at updated)
Day 3, 2pm: Completed lesson (completed_at set, last_accessed_at updated)
```

**Queries**:

**When did user start this lesson?**
```sql
SELECT first_started_at FROM lesson_progress 
WHERE user_id = 'user-1' AND lesson_id = 'lesson-5';
```

**When did user last access this lesson?**
```sql
SELECT last_accessed_at FROM lesson_progress 
WHERE user_id = 'user-1' AND lesson_id = 'lesson-5';
```

**How long between start and completion?**
```sql
SELECT completed_at - first_started_at AS time_to_complete
FROM lesson_progress 
WHERE user_id = 'user-1' AND lesson_id = 'lesson-5';
-- Result: 2 days, 23 hours
```

### Timezone Best Practices

**Always use TIMESTAMP WITH TIME ZONE**:
```sql
-- GOOD
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

-- BAD
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Why?**
- Application may serve users worldwide
- Server might be in different timezone than users
- Consistent UTC storage, local timezone display

**Display Conversion** (in application):
```javascript
// Database stores UTC
const createdAt = '2025-11-02 20:00:00+00';

// Convert to user's timezone
const userTimezone = 'America/New_York';
const localTime = new Date(createdAt).toLocaleString('en-US', {
  timeZone: userTimezone
});
// Display: "11/2/2025, 3:00:00 PM EST"
```

---

## Time Tracking Patterns

### Cumulative Time Tracking

**Goal**: Track total time user spent on lesson (across multiple sessions)

**Implementation**:
```sql
-- Start lesson (create record)
INSERT INTO lesson_progress (user_id, course_id, lesson_id)
VALUES ('user-1', 'course-1', 'lesson-1');
-- time_spent_seconds: 0

-- After 30 seconds, increment
UPDATE lesson_progress 
SET time_spent_seconds = time_spent_seconds + 30
WHERE user_id = 'user-1' AND lesson_id = 'lesson-1';
-- time_spent_seconds: 30

-- User closes page, comes back later

-- After another 45 seconds, increment
UPDATE lesson_progress 
SET time_spent_seconds = time_spent_seconds + 45
WHERE user_id = 'user-1' AND lesson_id = 'lesson-1';
-- time_spent_seconds: 75 (cumulative)
```

### Client-Side Tracking

**JavaScript Example**:
```javascript
let sessionStart = Date.now();
let timeSpentSoFar = 0; // Fetch from server initially

// Every 30 seconds, send update
setInterval(async () => {
  const sessionTime = Math.floor((Date.now() - sessionStart) / 1000);
  
  await fetch(`/api/lessons/${lessonId}/time`, {
    method: 'PUT',
    body: JSON.stringify({ timeSpent: sessionTime })
  });
  
  // Reset for next interval
  sessionStart = Date.now();
  timeSpentSoFar += sessionTime;
}, 30000); // 30 seconds

// On page unload, send final update
window.addEventListener('beforeunload', () => {
  const sessionTime = Math.floor((Date.now() - sessionStart) / 1000);
  navigator.sendBeacon(`/api/lessons/${lessonId}/time`, 
    JSON.stringify({ timeSpent: sessionTime })
  );
});
```

### Handling Inactive Users

**Problem**: User leaves page open but isn't actually watching

**Solution**: Activity detection
```javascript
let lastActivity = Date.now();
let isActive = true;

// Track activity
['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
  document.addEventListener(event, () => {
    lastActivity = Date.now();
    isActive = true;
  });
});

// Check activity every 10 seconds
setInterval(() => {
  const timeSinceActivity = Date.now() - lastActivity;
  if (timeSinceActivity > 60000) { // 1 minute
    isActive = false;
    // Stop incrementing time_spent_seconds
  }
}, 10000);
```

### Analytics Queries

**Average time per lesson**:
```sql
SELECT 
  lesson_id,
  AVG(time_spent_seconds) AS avg_seconds,
  AVG(time_spent_seconds) / 60 AS avg_minutes
FROM lesson_progress
WHERE completed = true
GROUP BY lesson_id
ORDER BY avg_seconds DESC;
```

**Total time user spent on course**:
```sql
SELECT SUM(time_spent_seconds) / 3600 AS total_hours
FROM lesson_progress
WHERE user_id = 'user-1' AND course_id = 'course-1';
```

---

## Attempt Tracking

### What is an Attempt?

**Definition**: Each time user accesses or retries a lesson

**Use Cases**:
- **Difficulty analysis**: Lessons with high attempts are difficult
- **Gamification**: Badges for "first-try completion"
- **UX insights**: High attempts indicate confusing content
- **Personalization**: Recommend easier lessons for struggling users

### Implementation

**Increment on Access**:
```sql
UPDATE lesson_progress 
SET attempts = attempts + 1,
    last_accessed_at = NOW()
WHERE user_id = 'user-1' AND lesson_id = 'lesson-5';
```

**Increment on Quiz Retry**:
```javascript
// User takes quiz, fails (score < 70)
if (quizScore < 70) {
  await fetch(`/api/lessons/${lessonId}/attempt`, { method: 'POST' });
}
```

### Analytics Queries

**Find difficult lessons**:
```sql
SELECT 
  lesson_id,
  AVG(attempts) AS avg_attempts,
  COUNT(*) AS completion_count
FROM lesson_progress
WHERE completed = true AND course_id = 'course-1'
GROUP BY lesson_id
HAVING COUNT(*) > 10 -- At least 10 completions
ORDER BY avg_attempts DESC
LIMIT 10;
```

**Result**:
```
lesson_id          | avg_attempts | completion_count
lesson-calculus-01 | 4.8          | 47
lesson-quantum-02  | 4.2          | 35
lesson-advanced-js | 3.9          | 62
```

**Insight**: Calculus lesson 1 has highest attempts → consider simplifying or adding hints

**User struggle indicator**:
```sql
SELECT COUNT(*) AS struggling_users
FROM lesson_progress
WHERE lesson_id = 'lesson-5' AND attempts > 3 AND completed = false;
```

### First-Try Badge Logic

```javascript
// After user completes lesson
const progress = await db.query(`
  SELECT attempts FROM lesson_progress 
  WHERE user_id = $1 AND lesson_id = $2
`, [userId, lessonId]);

if (progress.attempts === 1) {
  // Award "First Try!" badge
  await awardBadge(userId, 'first-try', lessonId);
}
```

---

## Score Storage

### NULL vs 0 Distinction

**Critical Concept**: NULL means no quiz, 0 means failed quiz

**Examples**:

**Video lesson (no quiz)**:
```sql
INSERT INTO lesson_progress (user_id, lesson_id, completed, score)
VALUES ('user-1', 'video-lesson', true, NULL);
-- score: NULL (not applicable)
```

**Failed quiz**:
```sql
INSERT INTO lesson_progress (user_id, lesson_id, completed, score)
VALUES ('user-1', 'quiz-lesson', false, 0);
-- score: 0 (attempted but scored 0%)
```

**Passed quiz**:
```sql
INSERT INTO lesson_progress (user_id, lesson_id, completed, score)
VALUES ('user-1', 'quiz-lesson', true, 85);
-- score: 85 (scored 85%)
```

### Analytics Considerations

**WRONG: Count NULL as 0**:
```sql
-- DON'T DO THIS
SELECT AVG(COALESCE(score, 0)) AS avg_score
FROM lesson_progress;
-- If 50% of lessons have quizzes (NULL), this shows avg 42.5 instead of 85
```

**CORRECT: Ignore NULL**:
```sql
SELECT AVG(score) AS avg_score
FROM lesson_progress
WHERE score IS NOT NULL;
-- Only averages lessons with actual scores
```

### Score Range Enforcement

**Database Level**:
```sql
score INTEGER CHECK (score >= 0 AND score <= 100)
```

**Application Level** (additional validation):
```javascript
function validateScore(score) {
  if (score === null) return true; // NULL allowed
  if (typeof score !== 'number') return false;
  if (score < 0 || score > 100) return false;
  if (!Number.isInteger(score)) return false; // No decimals
  return true;
}
```

### Analytics Queries

**Average score per quiz**:
```sql
SELECT 
  lesson_id,
  AVG(score)::INTEGER AS avg_score,
  MIN(score) AS min_score,
  MAX(score) AS max_score,
  COUNT(*) AS attempts
FROM lesson_progress
WHERE score IS NOT NULL
GROUP BY lesson_id
ORDER BY avg_score;
```

**Passing rate** (score >= 70):
```sql
SELECT 
  lesson_id,
  COUNT(*) FILTER (WHERE score >= 70) AS passed,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE score >= 70)::NUMERIC / COUNT(*) * 100, 1) AS pass_rate
FROM lesson_progress
WHERE score IS NOT NULL
GROUP BY lesson_id
ORDER BY pass_rate;
```

---

## Trigger Usage

### What is a Trigger?

**Definition**: Automatic action executed when specific database event occurs

**Our Trigger**:
```sql
CREATE TRIGGER update_lesson_progress_updated_at 
BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**What it does**: Automatically updates `updated_at` timestamp before any row is modified

### How Triggers Work

**Without Trigger** (manual):
```sql
UPDATE lesson_progress 
SET time_spent_seconds = 180, updated_at = NOW()
WHERE id = 'some-id';
-- Must remember to set updated_at every time
```

**With Trigger** (automatic):
```sql
UPDATE lesson_progress 
SET time_spent_seconds = 180
WHERE id = 'some-id';
-- Trigger automatically sets updated_at = NOW()
```

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Explanation**:
- `RETURNS TRIGGER`: Function is a trigger
- `NEW`: The new row being inserted/updated
- `NEW.updated_at = NOW()`: Set updated_at to current time
- `RETURN NEW`: Return modified row

### When Trigger Fires

**Fires on UPDATE**:
```sql
UPDATE lesson_progress SET completed = true WHERE id = 'some-id';
-- Trigger fires: updated_at set to NOW()
```

**Does NOT fire on INSERT**:
```sql
INSERT INTO lesson_progress (...) VALUES (...);
-- Trigger doesn't fire (only on UPDATE)
-- But created_at and updated_at default to CURRENT_TIMESTAMP
```

**Does NOT fire on DELETE**:
```sql
DELETE FROM lesson_progress WHERE id = 'some-id';
-- Trigger doesn't fire (row deleted)
```

### Benefits of Triggers

**1. DRY (Don't Repeat Yourself)**:
- No need to manually update `updated_at` in every UPDATE query
- Impossible to forget

**2. Consistency**:
- Always uses database time (not client time)
- All updates have accurate timestamp

**3. Simplicity**:
- Application code simpler (no timestamp management)

### Potential Issues

**Performance**:
- Trigger runs on every UPDATE (small overhead)
- For high-volume updates, could be slow
- Solution: Disable trigger temporarily for bulk operations

**Debugging**:
- Triggers are "invisible" to application developers
- Hard to debug if trigger has bugs
- Solution: Good documentation, simple trigger logic

---

## Foreign Key Cascades

### What is CASCADE?

**Definition**: Automatic action when parent record deleted

**Our Foreign Keys**:
```sql
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE
```

### CASCADE Options

**1. ON DELETE CASCADE** (our choice):
```sql
-- User deletes account
DELETE FROM users WHERE id = 'user-123';

-- Automatically deletes lesson progress
-- DELETE FROM lesson_progress WHERE user_id = 'user-123';
```

**2. ON DELETE SET NULL**:
```sql
user_id UUID REFERENCES users(id) ON DELETE SET NULL

-- User deletes account
DELETE FROM users WHERE id = 'user-123';

-- Sets user_id to NULL (progress remains for analytics)
-- UPDATE lesson_progress SET user_id = NULL WHERE user_id = 'user-123';
```

**3. ON DELETE RESTRICT** (default):
```sql
user_id UUID REFERENCES users(id) ON DELETE RESTRICT

-- User tries to delete account
DELETE FROM users WHERE id = 'user-123';
-- Error: Cannot delete user with existing lesson progress
-- Must delete progress first
```

**4. ON DELETE NO ACTION**:
- Same as RESTRICT but check is deferred
- Rarely used

### When to Use Each

| Option | Use Case |
|--------|----------|
| CASCADE | Delete dependent data automatically (user progress, sessions) |
| SET NULL | Keep historical data but anonymize (deleted user's comments) |
| RESTRICT | Prevent accidental deletion (can't delete course with enrolled users) |

### Cascade Behavior

**Single Level**:
```
users (id: user-123)
  └─ lesson_progress (user_id: user-123) ← Deleted
```

**Multiple Levels** (if we had more tables):
```
users (id: user-123)
  └─ lesson_progress (user_id: user-123) ← Deleted
       └─ lesson_notes (progress_id: ...) ← Also deleted (if FK CASCADE)
```

### Testing CASCADE

```sql
-- Create test user
INSERT INTO users (id, email, name) 
VALUES ('test-user', 'test@example.com', 'Test');

-- Create lesson progress
INSERT INTO lesson_progress (user_id, course_id, lesson_id)
VALUES ('test-user', 'course-1', 'lesson-1');

-- Verify progress exists
SELECT COUNT(*) FROM lesson_progress WHERE user_id = 'test-user';
-- Result: 1

-- Delete user
DELETE FROM users WHERE id = 'test-user';

-- Progress automatically deleted
SELECT COUNT(*) FROM lesson_progress WHERE user_id = 'test-user';
-- Result: 0
```

---

## Analytics Queries

### Common Query Patterns

#### 1. User Progress Summary

```sql
-- Get all lessons for user in course
SELECT 
  lesson_id,
  completed,
  time_spent_seconds,
  attempts,
  score,
  last_accessed_at
FROM lesson_progress
WHERE user_id = 'user-1' AND course_id = 'course-1'
ORDER BY first_started_at;
```

**Use Case**: Display progress page

#### 2. Completion Rate

```sql
-- Overall completion rate for course
SELECT 
  COUNT(*) FILTER (WHERE completed = true) AS completed,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE completed = true)::NUMERIC / COUNT(*) * 100, 1) AS completion_rate
FROM lesson_progress
WHERE course_id = 'course-1';
```

**Result**:
```
completed | total | completion_rate
750       | 1000  | 75.0
```

#### 3. Difficult Lessons

```sql
-- Lessons with highest average attempts
SELECT 
  lesson_id,
  AVG(attempts) AS avg_attempts,
  AVG(time_spent_seconds) / 60 AS avg_minutes,
  COUNT(*) AS users
FROM lesson_progress
WHERE completed = true
GROUP BY lesson_id
HAVING COUNT(*) > 10
ORDER BY avg_attempts DESC
LIMIT 10;
```

**Use Case**: Identify content that needs improvement

#### 4. Time to Complete

```sql
-- How long does it take users to complete lessons?
SELECT 
  lesson_id,
  AVG(completed_at - first_started_at) AS avg_time_to_complete,
  MIN(completed_at - first_started_at) AS fastest,
  MAX(completed_at - first_started_at) AS slowest
FROM lesson_progress
WHERE completed = true
GROUP BY lesson_id;
```

**Result**:
```
lesson_id | avg_time_to_complete | fastest | slowest
lesson-1  | 2 days 3 hours       | 1 hour  | 14 days
```

#### 5. User Engagement

```sql
-- Most engaged users (total time across all lessons)
SELECT 
  user_id,
  SUM(time_spent_seconds) / 3600 AS total_hours,
  COUNT(DISTINCT lesson_id) AS lessons_started,
  COUNT(*) FILTER (WHERE completed = true) AS lessons_completed
FROM lesson_progress
GROUP BY user_id
ORDER BY total_hours DESC
LIMIT 10;
```

#### 6. Quiz Performance

```sql
-- Quiz score distribution
SELECT 
  lesson_id,
  AVG(score)::INTEGER AS avg_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) AS median_score,
  MIN(score) AS min_score,
  MAX(score) AS max_score,
  STDDEV(score)::INTEGER AS std_dev
FROM lesson_progress
WHERE score IS NOT NULL
GROUP BY lesson_id;
```

#### 7. Recent Activity

```sql
-- Recently accessed lessons
SELECT 
  lp.lesson_id,
  lp.last_accessed_at,
  u.name AS user_name
FROM lesson_progress lp
JOIN users u ON lp.user_id = u.id
WHERE lp.last_accessed_at > NOW() - INTERVAL '24 hours'
ORDER BY lp.last_accessed_at DESC;
```

#### 8. Dropout Analysis

```sql
-- Lessons where users quit (started but never completed)
SELECT 
  lesson_id,
  COUNT(*) AS started,
  COUNT(*) FILTER (WHERE completed = false AND 
    last_accessed_at < NOW() - INTERVAL '30 days') AS abandoned,
  ROUND(COUNT(*) FILTER (WHERE completed = false AND 
    last_accessed_at < NOW() - INTERVAL '30 days')::NUMERIC / COUNT(*) * 100, 1) AS abandonment_rate
FROM lesson_progress
GROUP BY lesson_id
ORDER BY abandonment_rate DESC;
```

---

## Performance Optimization

### Index Usage

**Check query plan**:
```sql
EXPLAIN ANALYZE
SELECT * FROM lesson_progress 
WHERE user_id = 'user-123' AND course_id = 'course-456';
```

**Good result** (uses index):
```
Index Scan using idx_lesson_progress_user_course on lesson_progress
  (cost=0.42..8.44 rows=1 width=100) (actual time=0.023..0.024 rows=1 loops=1)
  Index Cond: ((user_id = 'user-123') AND (course_id = 'course-456'))
```

**Bad result** (full table scan):
```
Seq Scan on lesson_progress (cost=0.00..1834.00 rows=1 width=100)
  (actual time=45.123..98.456 rows=1 loops=1)
  Filter: ((user_id = 'user-123') AND (course_id = 'course-456'))
  Rows Removed by Filter: 99999
```

### Query Optimization

**Avoid SELECT ***:
```sql
-- BAD (fetches all columns)
SELECT * FROM lesson_progress WHERE user_id = 'user-1';

-- GOOD (only needed columns)
SELECT lesson_id, completed, score 
FROM lesson_progress WHERE user_id = 'user-1';
```

**Use LIMIT for pagination**:
```sql
-- Get page 1 (lessons 1-10)
SELECT * FROM lesson_progress 
WHERE user_id = 'user-1' 
ORDER BY first_started_at 
LIMIT 10 OFFSET 0;

-- Get page 2 (lessons 11-20)
SELECT * FROM lesson_progress 
WHERE user_id = 'user-1' 
ORDER BY first_started_at 
LIMIT 10 OFFSET 10;
```

### Caching Strategies

**Application-Level Cache**:
```javascript
// Cache user's current lesson
const cache = new Map();

async function getCurrentLesson(userId, courseId) {
  const key = `${userId}:${courseId}`;
  
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const result = await db.query(`
    SELECT * FROM lesson_progress 
    WHERE user_id = $1 AND course_id = $2 AND completed = false
    ORDER BY last_accessed_at DESC 
    LIMIT 1
  `, [userId, courseId]);
  
  cache.set(key, result.rows[0]);
  return result.rows[0];
}

// Invalidate on completion
async function completeLesson(userId, courseId, lessonId) {
  await db.query(`UPDATE lesson_progress SET completed = true WHERE ...`);
  cache.delete(`${userId}:${courseId}`);
}
```

**Redis Cache**:
```javascript
// Cache progress for 5 minutes
await redis.setex(
  `progress:${userId}:${courseId}`,
  300, // 5 minutes
  JSON.stringify(progressData)
);
```

---

## Testing Database Schemas

### Schema Validation Tests

**Test table exists**:
```typescript
test('lesson_progress table should exist', async () => {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'lesson_progress'
    )
  `);
  expect(result.rows[0].exists).toBe(true);
});
```

**Test column structure**:
```typescript
test('should have correct columns', async () => {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'lesson_progress'
  `);
  
  const columns = Object.fromEntries(
    result.rows.map(r => [r.column_name, r])
  );
  
  expect(columns.id.data_type).toBe('uuid');
  expect(columns.id.is_nullable).toBe('NO');
  expect(columns.completed.data_type).toBe('boolean');
  // ... etc
});
```

### Constraint Tests

**Test UNIQUE constraint**:
```typescript
test('should prevent duplicate progress', async () => {
  await pool.query(`
    INSERT INTO lesson_progress (user_id, course_id, lesson_id)
    VALUES ('user-1', 'course-1', 'lesson-1')
  `);
  
  await expect(
    pool.query(`
      INSERT INTO lesson_progress (user_id, course_id, lesson_id)
      VALUES ('user-1', 'course-1', 'lesson-1')
    `)
  ).rejects.toThrow(/duplicate key/);
});
```

**Test CHECK constraint**:
```typescript
test('should reject negative time', async () => {
  await expect(
    pool.query(`
      INSERT INTO lesson_progress (user_id, course_id, lesson_id, time_spent_seconds)
      VALUES ('user-1', 'course-1', 'lesson-1', -100)
    `)
  ).rejects.toThrow(/check constraint/);
});
```

### Trigger Tests

**Test auto-update**:
```typescript
test('should auto-update updated_at', async () => {
  const { rows: [initial] } = await pool.query(`
    INSERT INTO lesson_progress (user_id, course_id, lesson_id)
    VALUES ('user-1', 'course-1', 'lesson-1')
    RETURNING *
  `);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await pool.query(`
    UPDATE lesson_progress SET completed = true WHERE id = $1
  `, [initial.id]);
  
  const { rows: [updated] } = await pool.query(
    'SELECT updated_at FROM lesson_progress WHERE id = $1',
    [initial.id]
  );
  
  expect(new Date(updated.updated_at).getTime())
    .toBeGreaterThan(new Date(initial.updated_at).getTime());
});
```

---

## Common Pitfalls

### 1. Not Using Timestamps Correctly

**Wrong**:
```javascript
// Using client-side timestamp
const now = new Date().toISOString();
await db.query(`
  UPDATE lesson_progress 
  SET last_accessed_at = $1
  WHERE id = $2
`, [now, id]);
```

**Right**:
```javascript
// Using database timestamp
await db.query(`
  UPDATE lesson_progress 
  SET last_accessed_at = NOW()
  WHERE id = $2
`, [id]);
```

**Why?** Client and server clocks may differ.

### 2. Counting NULL as 0

**Wrong**:
```sql
SELECT AVG(COALESCE(score, 0)) FROM lesson_progress;
-- If 50% have no quiz (NULL), this incorrectly shows low average
```

**Right**:
```sql
SELECT AVG(score) FROM lesson_progress WHERE score IS NOT NULL;
```

### 3. Not Using UNIQUE Constraint

**Wrong**:
```javascript
// Check in application code
const existing = await db.query(`
  SELECT * FROM lesson_progress 
  WHERE user_id = $1 AND lesson_id = $2
`);

if (existing.rows.length === 0) {
  await db.query(`INSERT INTO lesson_progress ...`);
}
```

**Problem**: Race condition (two requests at same time)

**Right**:
```sql
-- Use UNIQUE constraint in database
UNIQUE(user_id, course_id, lesson_id)

-- Use ON CONFLICT in query
INSERT INTO lesson_progress (user_id, course_id, lesson_id)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, course_id, lesson_id) DO UPDATE
SET last_accessed_at = NOW();
```

### 4. Not Using Indexes

**Symptoms**:
- Queries slow (seconds instead of milliseconds)
- Database CPU high
- Application timeouts

**Solution**:
- Add indexes on frequently queried columns
- Use EXPLAIN ANALYZE to check query plans

### 5. Forgetting ON DELETE CASCADE

**Wrong**:
```sql
user_id UUID REFERENCES users(id)
-- No CASCADE, user can't be deleted if progress exists
```

**Right**:
```sql
user_id UUID REFERENCES users(id) ON DELETE CASCADE
-- User deletion automatically removes progress
```

---

## Best Practices

### 1. Always Use Constraints

✅ **Use database constraints**:
- PRIMARY KEY for uniqueness
- FOREIGN KEY for referential integrity
- CHECK for value validation
- NOT NULL for required fields
- UNIQUE for no duplicates

❌ **Don't rely on application code only**:
- Application can be bypassed (direct SQL, migrations)
- Database is single source of truth

### 2. Index Strategically

✅ **Create indexes for**:
- Foreign keys (user_id, course_id)
- Columns in WHERE clauses
- Columns in ORDER BY
- Composite queries (user_id, course_id)

❌ **Don't over-index**:
- Every index slows writes
- Too many indexes wastes space
- Rarely-queried columns don't need indexes

### 3. Use Timestamps Correctly

✅ **Use TIMESTAMP WITH TIME ZONE**
✅ **Use NOW() in queries** (not client time)
✅ **Have created_at and updated_at** (audit trail)

### 4. Test Constraints

✅ **Test that**:
- UNIQUE prevents duplicates
- CHECK rejects invalid data
- FOREIGN KEY prevents orphans
- Triggers work correctly

### 5. Document Schema

✅ **Include in code**:
- Column descriptions (comments)
- Constraint rationale
- Index purposes
- Trigger behavior

---

## Integration Patterns

### Service Layer

```typescript
// LessonProgressService.ts
class LessonProgressService {
  async startLesson(userId: string, courseId: string, lessonId: string) {
    return await db.query(`
      INSERT INTO lesson_progress (user_id, course_id, lesson_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, course_id, lesson_id) DO UPDATE
      SET last_accessed_at = NOW()
      RETURNING *
    `, [userId, courseId, lessonId]);
  }
  
  async updateTime(userId: string, lessonId: string, seconds: number) {
    return await db.query(`
      UPDATE lesson_progress 
      SET time_spent_seconds = time_spent_seconds + $3,
          last_accessed_at = NOW()
      WHERE user_id = $1 AND lesson_id = $2
      RETURNING *
    `, [userId, lessonId, seconds]);
  }
  
  async completeLesson(userId: string, lessonId: string, score?: number) {
    // Update lesson_progress
    await db.query(`
      UPDATE lesson_progress 
      SET completed = true, 
          completed_at = NOW(),
          score = $3
      WHERE user_id = $1 AND lesson_id = $2
    `, [userId, lessonId, score]);
    
    // Sync with course_progress (JSONB)
    await this.syncCourseProgress(userId, courseId);
  }
  
  private async syncCourseProgress(userId: string, courseId: string) {
    // Get completed lesson IDs
    const { rows } = await db.query(`
      SELECT lesson_id FROM lesson_progress
      WHERE user_id = $1 AND course_id = $2 AND completed = true
    `, [userId, courseId]);
    
    const completedLessons = rows.map(r => r.lesson_id);
    
    // Update course_progress JSONB
    await db.query(`
      UPDATE course_progress
      SET completed_lessons = $3,
          progress_percentage = (...)
      WHERE user_id = $1 AND course_id = $2
    `, [userId, courseId, JSON.stringify(completedLessons)]);
  }
}
```

---

## Complementary Design

### How lesson_progress and course_progress Work Together

**course_progress** (T121):
```json
{
  "user_id": "user-123",
  "course_id": "course-456",
  "completed_lessons": ["lesson-1", "lesson-2", "lesson-3"],
  "progress_percentage": 60,
  "last_accessed_at": "2025-11-02T15:00:00Z"
}
```

**lesson_progress** (T122):
```
lesson-1: completed=true, time=180s, attempts=1, score=90
lesson-2: completed=true, time=240s, attempts=2, score=85
lesson-3: completed=false, time=120s, attempts=3, score=NULL
```

**Use Course_Progress For**:
- Dashboard: "60% complete"
- Resume: "Continue lesson-4"
- Quick stats: "3 of 5 lessons done"

**Use Lesson_Progress For**:
- Analytics: "Lesson-3 is difficult (3 attempts)"
- Time tracking: "6 minutes on lesson-1"
- Scores: "Average 87.5%"

---

## Exercises

### Exercise 1: Design Considerations

**Question**: Why did we choose VARCHAR(255) for `lesson_id` instead of creating a `lessons` table with UUID?

**Answer**: <details><summary>Click to reveal</summary>
Flexibility and phased implementation. At T122, we don't have lesson content storage yet. VARCHAR allows:
- Any ID format (URLs, slugs, numbers)
- No dependency on lessons table
- Faster implementation

Trade-off: No referential integrity (could reference non-existent lesson). When lessons table is added (future task), we can either add FK or keep as-is.
</details>

### Exercise 2: Query Challenge

**Question**: Write a query to find users who started but never completed any lesson in the last 30 days.

**Answer**: <details><summary>Click to reveal</summary>
```sql
SELECT DISTINCT user_id
FROM lesson_progress
WHERE first_started_at > NOW() - INTERVAL '30 days'
  AND completed = false
  AND user_id NOT IN (
    SELECT user_id FROM lesson_progress 
    WHERE completed = true 
      AND completed_at > NOW() - INTERVAL '30 days'
  );
```
</details>

### Exercise 3: Index Decision

**Question**: Should we add an index on `score`? Why or why not?

**Answer**: <details><summary>Click to reveal</summary>
**Probably not needed** because:
- Score is filtered less often than user_id/course_id
- Score queries usually include other filters (user_id, course_id) which already have indexes
- Score has relatively high cardinality (0-100) but is often aggregated (AVG)

**Consider adding if**:
- You frequently query "WHERE score < 70" (failed quizzes)
- You have millions of records and score-based filtering is slow

**Test with EXPLAIN ANALYZE** before deciding.
</details>

---

## Summary

### Key Takeaways

1. ✅ **Hybrid approach** (JSONB + relational) leverages strengths of both storage models
2. ✅ **Rich constraints** (UNIQUE, CHECK, FK) enforce data integrity at database level
3. ✅ **Strategic indexes** optimize common query patterns without over-indexing
4. ✅ **Three timestamps** (first_started, last_accessed, completed) enable detailed engagement tracking
5. ✅ **NULL vs 0 distinction** for scores preserves data semantics (no quiz vs failed quiz)
6. ✅ **Triggers automate** repetitive tasks (updated_at timestamp)
7. ✅ **CASCADE deletes** maintain referential integrity automatically

### When to Apply These Patterns

Use **lesson_progress-style relational tracking** when:
- Need detailed per-item analytics
- Track multiple metrics (time, attempts, scores)
- Aggregate across users/items
- Generate reports and insights

Use **course_progress-style JSONB** when:
- Need fast reads for dashboards
- Simple completion tracking
- Lightweight progress indicators
- Resume functionality

**Best of both worlds**: Combine both approaches like we did in T121+T122.

---

**End of Learning Guide**

*For implementation details, see T122_Lesson_Progress_Table_Log.md*  
*For test documentation, see T122_Lesson_Progress_Table_TestLog.md*
