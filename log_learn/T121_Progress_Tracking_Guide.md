# T121: Progress Tracking - Learning Guide

**Target Audience**: Developers, architects, product managers  
**Topic**: User progress tracking in educational platforms  
**Complexity Level**: Intermediate to Advanced

---

## Table of Contents

1. [What is Progress Tracking?](#what-is-progress-tracking)
2. [Why Track Progress?](#why-track-progress)
3. [Progress Tracking Patterns](#progress-tracking-patterns)
4. [Data Models for Progress](#data-models-for-progress)
5. [JSONB vs. Relational Storage](#jsonb-vs-relational-storage)
6. [Progress Percentage Calculations](#progress-percentage-calculations)
7. [State Management for Progress](#state-management-for-progress)
8. [Service Layer Architecture](#service-layer-architecture)
9. [Bulk Operations for Performance](#bulk-operations-for-performance)
10. [Error Handling Strategies](#error-handling-strategies)
11. [Integration with UI](#integration-with-ui)
12. [Gamification Patterns](#gamification-patterns)
13. [Analytics from Progress Data](#analytics-from-progress-data)
14. [Common Pitfalls](#common-pitfalls)
15. [Testing Progress Tracking](#testing-progress-tracking)
16. [Scaling Considerations](#scaling-considerations)
17. [Best Practices Checklist](#best-practices-checklist)
18. [Reference Code Patterns](#reference-code-patterns)

---

## What is Progress Tracking?

### Definition

**Progress tracking** is the system of recording, storing, and retrieving user advancement through structured content (courses, lessons, videos, exercises, etc.).

### Core Components

1. **Tracker**: Records user actions (e.g., "lesson completed")
2. **Storage**: Persists progress data (database, cache)
3. **Calculator**: Computes metrics (percentage, time remaining)
4. **Presenter**: Displays progress (UI components)

### Real-World Example

```typescript
// User completes a lesson
await markLessonComplete({
  userId: 'user-123',
  courseId: 'course-abc',
  lessonId: 'lesson-5',
  totalLessons: 10,
});

// System records:
// - Lesson added to completed list
// - Progress percentage updated (50%)
// - Timestamp captured
// - UI updates automatically
```

---

## Why Track Progress?

### User Benefits

1. **Motivation**: Seeing progress encourages continuation
2. **Context**: Resume where they left off
3. **Achievement**: Sense of accomplishment
4. **Planning**: Know how much remains

### Business Benefits

1. **Engagement Metrics**: Identify drop-off points
2. **Content Quality**: See which lessons cause confusion
3. **Completion Rates**: Measure course effectiveness
4. **Revenue**: Upsell based on progress patterns

### Technical Benefits

1. **Personalization**: Recommend next steps
2. **Notifications**: "You're almost done!"
3. **Certificates**: Automatic generation on completion
4. **Analytics**: Rich data for product decisions

---

## Progress Tracking Patterns

### 1. Linear Progress (T121 Implementation)

**Pattern**: Track completion of sequential items (lessons in order)

**Characteristics**:
- Items have no dependencies
- Progress is percentage-based
- Order doesn't matter for calculation

**Example**:
```typescript
interface LinearProgress {
  completed: string[]; // ['lesson-1', 'lesson-3', 'lesson-5']
  total: number;       // 10
  percentage: number;  // 30 (3/10)
}
```

**Use Cases**: Courses, playlists, reading lists

### 2. Hierarchical Progress

**Pattern**: Track completion of nested content (modules → lessons → topics)

**Characteristics**:
- Multi-level structure
- Parent completion depends on children
- Weighted progress possible

**Example**:
```typescript
interface HierarchicalProgress {
  moduleId: string;
  lessons: {
    lessonId: string;
    completed: boolean;
    topics: {
      topicId: string;
      completed: boolean;
    }[];
  }[];
}
```

**Use Cases**: Multi-module courses, documentation sites

### 3. Dependency-Based Progress

**Pattern**: Track completion with prerequisites

**Characteristics**:
- Items have dependencies
- Must complete in specific order
- Progress graph (not linear)

**Example**:
```typescript
interface DependencyProgress {
  nodeId: string;
  completed: boolean;
  dependencies: string[];       // Must complete these first
  unlocks: string[];           // Completes these
  availableNext: string[];     // Can do now
}
```

**Use Cases**: Skill trees, game progression, certification paths

### 4. Time-Based Progress

**Pattern**: Track progress by time spent, not completion

**Characteristics**:
- Measures duration, not completion
- Useful for long-form content
- Combines with other patterns

**Example**:
```typescript
interface TimeProgress {
  itemId: string;
  duration: number;         // Total duration (seconds)
  watched: number;          // Time watched (seconds)
  percentage: number;       // (watched / duration) * 100
  bookmarks: number[];      // [120, 450, 680] (timestamps)
}
```

**Use Cases**: Video courses, podcasts, audiobooks

### 5. Mastery-Based Progress

**Pattern**: Track proficiency level, not just completion

**Characteristics**:
- Multiple attempts allowed
- Score/grade tracked
- Progress requires minimum score

**Example**:
```typescript
interface MasteryProgress {
  skillId: string;
  attempts: number;
  bestScore: number;        // 85/100
  averageScore: number;     // 78/100
  masteryLevel: 'novice' | 'intermediate' | 'expert';
  passedAt: Date | null;    // When reached passing score
}
```

**Use Cases**: Quizzes, certifications, skill assessments

---

## Data Models for Progress

### Single-Table Model (T121 Implementation)

**Schema**:
```sql
CREATE TABLE course_progress (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    completed_lessons JSONB DEFAULT '[]',
    progress_percentage INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);
```

**Pros**:
- ✅ Simple schema
- ✅ Fast queries (single table)
- ✅ JSONB flexibility
- ✅ Easy to understand

**Cons**:
- ❌ JSONB queries can be slow at scale
- ❌ Hard to get lesson-level analytics
- ❌ Limited relational integrity

**When to Use**: Small to medium platforms (< 100K users)

### Relational Model

**Schema**:
```sql
CREATE TABLE lesson_completions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    lesson_id UUID NOT NULL REFERENCES lessons(id),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_spent INTEGER, -- seconds
    score INTEGER,
    UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX idx_lesson_completions_lesson ON lesson_completions(lesson_id);
```

**Pros**:
- ✅ Rich queries (JOIN, aggregate by lesson)
- ✅ Detailed analytics
- ✅ Relational integrity
- ✅ Easier to add metadata

**Cons**:
- ❌ More complex queries
- ❌ Multiple rows per user
- ❌ Slower percentage calculations

**When to Use**: Large platforms (> 100K users), analytics-heavy

### Hybrid Model

**Schema**:
```sql
-- Fast reads (denormalized)
CREATE TABLE course_progress (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    progress_percentage INTEGER,
    completed_lessons_count INTEGER,
    last_lesson_id UUID,
    UNIQUE(user_id, course_id)
);

-- Detailed tracking (normalized)
CREATE TABLE lesson_completions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, lesson_id)
);
```

**Pros**:
- ✅ Fast dashboard reads (course_progress)
- ✅ Detailed analytics (lesson_completions)
- ✅ Best of both worlds

**Cons**:
- ❌ Data duplication
- ❌ Synchronization complexity
- ❌ More storage

**When to Use**: High-scale platforms (1M+ users), performance-critical

---

## JSONB vs. Relational Storage

### When to Use JSONB (T121 Choice)

**Scenario**: You have a list of simple IDs (lesson IDs) and need fast retrieval

**Advantages**:
```sql
-- Single query for all progress
SELECT completed_lessons FROM course_progress 
WHERE user_id = $1 AND course_id = $2;

-- Check if lesson completed (PostgreSQL 9.4+)
SELECT EXISTS(
  SELECT 1 FROM course_progress 
  WHERE user_id = $1 
    AND course_id = $2 
    AND completed_lessons @> '["lesson-5"]'
);

-- Fast updates
UPDATE course_progress 
SET completed_lessons = completed_lessons || '["lesson-6"]'
WHERE user_id = $1 AND course_id = $2;
```

**Limitations**:
- Can't efficiently query "which users completed lesson X?"
- Aggregations require JSONB functions (slower)
- Index on JSONB array less efficient than B-tree

### When to Use Relational

**Scenario**: You need detailed per-lesson analytics

**Advantages**:
```sql
-- Which users completed this lesson?
SELECT user_id FROM lesson_completions WHERE lesson_id = 'lesson-5';

-- Average time to complete lessons
SELECT 
  lesson_id, 
  AVG(time_spent) as avg_time,
  COUNT(*) as completion_count
FROM lesson_completions
GROUP BY lesson_id;

-- Completion rate per lesson
SELECT 
  l.id,
  l.title,
  COUNT(lc.id)::FLOAT / (SELECT COUNT(*) FROM course_enrollments) * 100 as completion_rate
FROM lessons l
LEFT JOIN lesson_completions lc ON l.id = lc.lesson_id
GROUP BY l.id, l.title;
```

### Hybrid Approach

**Best Practice**: Use JSONB for fast reads, relational for analytics

```typescript
// Service method
async function markLessonComplete(data: LessonProgressUpdate) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update JSONB for fast reads
    await client.query(`
      UPDATE course_progress 
      SET completed_lessons = completed_lessons || $3
      WHERE user_id = $1 AND course_id = $2
    `, [data.userId, data.courseId, JSON.stringify([data.lessonId])]);
    
    // Insert into relational for analytics
    await client.query(`
      INSERT INTO lesson_completions (user_id, lesson_id, completed_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, lesson_id) DO NOTHING
    `, [data.userId, data.lessonId]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## Progress Percentage Calculations

### Basic Formula (T121 Implementation)

```typescript
const percentage = Math.round((completedItems / totalItems) * 100);
```

**Example**:
- 3 of 10 lessons complete → `Math.round((3 / 10) * 100)` = 30%
- 7 of 10 lessons complete → `Math.round((7 / 10) * 100)` = 70%
- 10 of 10 lessons complete → `Math.round((10 / 10) * 100)` = 100%

### Weighted Progress

**Use Case**: Not all lessons are equal (e.g., final project worth 30%)

```typescript
interface WeightedLesson {
  id: string;
  weight: number; // 0-1 (sum must equal 1)
}

function calculateWeightedProgress(
  lessons: WeightedLesson[],
  completedIds: string[]
): number {
  const completedWeight = lessons
    .filter(l => completedIds.includes(l.id))
    .reduce((sum, l) => sum + l.weight, 0);
  
  return Math.round(completedWeight * 100);
}

// Example
const lessons = [
  { id: 'intro', weight: 0.1 },      // 10%
  { id: 'theory', weight: 0.2 },     // 20%
  { id: 'practice', weight: 0.3 },   // 30%
  { id: 'project', weight: 0.4 },    // 40%
];
const completed = ['intro', 'theory'];
const progress = calculateWeightedProgress(lessons, completed);
// Result: 30 (10% + 20%)
```

### Hierarchical Progress

**Use Case**: Modules contain lessons (nested structure)

```typescript
interface Module {
  id: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  completed: boolean;
}

function calculateHierarchicalProgress(modules: Module[]): number {
  let totalLessons = 0;
  let completedLessons = 0;
  
  for (const module of modules) {
    totalLessons += module.lessons.length;
    completedLessons += module.lessons.filter(l => l.completed).length;
  }
  
  return totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
}
```

### Time-Based Progress

**Use Case**: Video courses, track watch time

```typescript
function calculateTimeProgress(watched: number, duration: number): number {
  if (duration === 0) return 0;
  const percentage = (watched / duration) * 100;
  return Math.min(Math.round(percentage), 100); // Cap at 100%
}

// Example
const progress = calculateTimeProgress(450, 600); // 450s / 600s = 75%
```

### Mastery-Based Progress

**Use Case**: Requires passing score, multiple attempts

```typescript
function calculateMasteryProgress(score: number, passingScore: number): number {
  if (score < passingScore) return 0; // Not passed yet
  
  // Optional: Show over-achievement
  const percentage = (score / 100) * 100;
  return Math.round(percentage);
}

// Example
calculateMasteryProgress(85, 70); // 85% (passed)
calculateMasteryProgress(65, 70); // 0% (not passed)
```

### Edge Cases

```typescript
// Division by zero
const safePercentage = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);

// Completed > total (data corruption)
const clampedCompleted = Math.min(completed, totalLessons);
const percentage = Math.round((clampedCompleted / totalLessons) * 100);

// Negative values (defensive)
const safeCompleted = Math.max(0, completed);
const safeTotal = Math.max(1, totalLessons); // Avoid division by zero
const percentage = Math.round((safeCompleted / safeTotal) * 100);
```

---

## State Management for Progress

### Server-Side State (T121 Implementation)

**Pattern**: Database is source of truth

**Flow**:
```
User Action → API Request → Service Layer → Database → API Response → UI Update
```

**Pros**:
- ✅ Consistent across devices
- ✅ Persists after logout
- ✅ No sync issues

**Cons**:
- ❌ Requires network call
- ❌ Slower updates (latency)

**Example**:
```typescript
// API endpoint
app.post('/api/progress/complete', async (req, res) => {
  const { courseId, lessonId } = req.body;
  const userId = req.user.id;
  
  await ProgressService.markLessonComplete({
    userId,
    courseId,
    lessonId,
    totalLessons: 10,
  });
  
  res.json({ success: true });
});
```

### Client-Side State

**Pattern**: Track progress in browser (localStorage, IndexedDB)

**Flow**:
```
User Action → Update Local State → Update UI → Background Sync to Server
```

**Pros**:
- ✅ Instant UI updates
- ✅ Works offline
- ✅ Reduces server load

**Cons**:
- ❌ Can get out of sync
- ❌ Lost on device change
- ❌ Requires sync logic

**Example**:
```typescript
class ProgressCache {
  private cache = new Map<string, CourseProgress>();
  
  async markComplete(courseId: string, lessonId: string) {
    // Update local cache
    const progress = this.cache.get(courseId) || { completedLessons: [] };
    progress.completedLessons.push(lessonId);
    this.cache.set(courseId, progress);
    
    // Sync to server (non-blocking)
    this.syncToServer(courseId, lessonId).catch(console.error);
  }
  
  private async syncToServer(courseId: string, lessonId: string) {
    await fetch('/api/progress/complete', {
      method: 'POST',
      body: JSON.stringify({ courseId, lessonId }),
    });
  }
}
```

### Hybrid State (Best Practice)

**Pattern**: Client cache + server source of truth

**Flow**:
```
1. User Action → Update Local Cache → Instant UI Update
2. Background: Sync to Server
3. On Load: Fetch from Server → Update Cache if Different
```

**Implementation**:
```typescript
class HybridProgressManager {
  private cache = new Map<string, CourseProgress>();
  private syncQueue: Array<() => Promise<void>> = [];
  
  async getProgress(courseId: string): Promise<CourseProgress> {
    // Try cache first
    if (this.cache.has(courseId)) {
      return this.cache.get(courseId)!;
    }
    
    // Fetch from server
    const progress = await this.fetchFromServer(courseId);
    this.cache.set(courseId, progress);
    return progress;
  }
  
  async markComplete(courseId: string, lessonId: string) {
    // Optimistic update (instant UI)
    const progress = await this.getProgress(courseId);
    progress.completedLessons.push(lessonId);
    this.cache.set(courseId, progress);
    
    // Queue sync (background)
    this.syncQueue.push(() => this.syncToServer(courseId, lessonId));
    this.processSyncQueue();
  }
  
  private async processSyncQueue() {
    while (this.syncQueue.length > 0) {
      const sync = this.syncQueue.shift()!;
      try {
        await sync();
      } catch (error) {
        console.error('Sync failed, retrying...', error);
        this.syncQueue.unshift(sync); // Retry
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
      }
    }
  }
}
```

---

## Service Layer Architecture

### Why Separate Service Layer?

**Reasons**:
1. **Separation of Concerns**: Business logic separate from routes
2. **Testability**: Test services without HTTP
3. **Reusability**: Use services from multiple routes/jobs
4. **Type Safety**: TypeScript interfaces for data flow

### Service Pattern (T121 Implementation)

```typescript
// src/lib/progress.ts

// 1. Define interfaces (data contracts)
export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  completedLessons: string[];
  progressPercentage: number;
  lastAccessedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LessonProgressUpdate {
  userId: string;
  courseId: string;
  lessonId: string;
  totalLessons: number;
}

// 2. Implement functions (business logic)
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<CourseProgress | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM course_progress WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logError(error, { context: 'getCourseProgress', userId, courseId });
    throw error;
  }
}

// 3. Export service object (optional, for grouped imports)
export const ProgressService = {
  getCourseProgress,
  markLessonComplete,
  // ... other functions
};
```

### Dependency Injection

**Pattern**: Pass dependencies, don't import globally

```typescript
// Good: Dependency injection
export function createProgressService(db: Pool, logger: Logger) {
  return {
    async getCourseProgress(userId: string, courseId: string) {
      try {
        const result = await db.query(/* ... */);
        return result.rows[0];
      } catch (error) {
        logger.error(error, { userId, courseId });
        throw error;
      }
    },
  };
}

// Usage
const progressService = createProgressService(pool, logger);

// Bad: Global imports (hard to test)
import { pool } from './db';
import { logError } from './errors';

export async function getCourseProgress(userId: string, courseId: string) {
  // Uses global pool and logError
}
```

### Transaction Management

**When Needed**: Multiple related database operations

```typescript
export async function markLessonCompleteWithReward(
  data: LessonProgressUpdate
): Promise<CourseProgress> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update progress
    const progressResult = await client.query(`
      UPDATE course_progress 
      SET completed_lessons = completed_lessons || $3
      WHERE user_id = $1 AND course_id = $2
      RETURNING *
    `, [data.userId, data.courseId, JSON.stringify([data.lessonId])]);
    
    // Award points (transactional with progress)
    await client.query(`
      UPDATE users 
      SET points = points + 10
      WHERE id = $1
    `, [data.userId]);
    
    await client.query('COMMIT');
    return progressResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logError(error, { context: 'markLessonCompleteWithReward', data });
    throw error;
  } finally {
    client.release();
  }
}
```

---

## Bulk Operations for Performance

### The N+1 Problem

**Scenario**: Display dashboard with 20 courses, need progress for each

**Bad Approach** (N+1 queries):
```typescript
// 1 query for courses + 20 queries for progress = 21 queries
const courses = await getCourses();
for (const course of courses) {
  course.progress = await getProgress(userId, course.id); // N queries
}
```

**Good Approach** (2 queries):
```typescript
// 1 query for courses + 1 bulk query for all progress = 2 queries
const courses = await getCourses();
const courseIds = courses.map(c => c.id);
const progressMap = await getBulkProgress(userId, courseIds); // 1 query

for (const course of courses) {
  course.progress = progressMap.get(course.id) || null;
}
```

### Bulk Query Implementation (T121)

```typescript
export async function getBulkCourseProgress(
  userId: string,
  courseIds: string[]
): Promise<Map<string, CourseProgress>> {
  if (courseIds.length === 0) {
    return new Map();
  }
  
  try {
    // Single query for all courses using ANY operator
    const result = await pool.query(
      `SELECT * FROM course_progress 
       WHERE user_id = $1 AND course_id = ANY($2)`,
      [userId, courseIds]
    );
    
    // Convert to Map for O(1) lookups
    const progressMap = new Map<string, CourseProgress>();
    for (const row of result.rows) {
      progressMap.set(row.course_id, row);
    }
    
    return progressMap;
  } catch (error) {
    logError(error, { context: 'getBulkCourseProgress', userId, courseIds });
    throw error;
  }
}
```

### PostgreSQL ANY Operator

**Syntax**:
```sql
WHERE column = ANY($1) -- $1 is array ['a', 'b', 'c']
```

**Equivalent to**:
```sql
WHERE column IN ('a', 'b', 'c')
```

**Performance**: Uses index on `course_id` column

### Map for Fast Lookups

**Why Map?**
- Array lookup: O(n) - `courses.find(c => c.id === courseId)`
- Map lookup: O(1) - `progressMap.get(courseId)`

**Example**:
```typescript
// Array (slow for large lists)
const progressArray = [{ courseId: 'a', ... }, { courseId: 'b', ... }];
const progress = progressArray.find(p => p.courseId === 'a'); // O(n)

// Map (fast)
const progressMap = new Map([
  ['a', { courseId: 'a', ... }],
  ['b', { courseId: 'b', ... }],
]);
const progress = progressMap.get('a'); // O(1)
```

---

## Error Handling Strategies

### Layered Error Handling (T121 Pattern)

```typescript
// Service Layer: Catch, log, re-throw
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<CourseProgress | null> {
  try {
    const result = await pool.query(/* ... */);
    return result.rows[0] || null;
  } catch (error) {
    // Log with context
    logError(error, { 
      context: 'getCourseProgress', 
      userId, 
      courseId 
    });
    // Re-throw for caller to handle
    throw error;
  }
}

// API Layer: Catch, return proper HTTP status
app.get('/api/progress/:courseId', async (req, res) => {
  try {
    const progress = await getCourseProgress(
      req.user.id,
      req.params.courseId
    );
    
    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }
    
    res.json(progress);
  } catch (error) {
    // Don't re-throw, return 500
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Validation Errors

```typescript
export async function markLessonComplete(
  data: LessonProgressUpdate
): Promise<CourseProgress> {
  // Validate inputs
  if (!data.userId || !isValidUUID(data.userId)) {
    throw new ValidationError('Invalid user ID');
  }
  
  if (!data.courseId || !isValidUUID(data.courseId)) {
    throw new ValidationError('Invalid course ID');
  }
  
  if (data.totalLessons <= 0) {
    throw new ValidationError('Total lessons must be positive');
  }
  
  // ... rest of implementation
}

// Custom error class
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Graceful Degradation

**Pattern**: If progress fails, still show course content

```typescript
// UI Component
async function loadCourse(courseId: string) {
  let progress = null;
  
  try {
    // Try to load progress
    progress = await fetchProgress(courseId);
  } catch (error) {
    // Log error but don't block
    console.error('Failed to load progress:', error);
    // Show notification (optional)
    toast.error('Progress data unavailable, showing default view');
  }
  
  // Always render course, with or without progress
  return renderCourse({
    course: await fetchCourse(courseId),
    progress: progress || { percentage: 0, completed: [] },
  });
}
```

---

## Integration with UI

### Progress Bar Component

```tsx
// React component
interface ProgressBarProps {
  percentage: number;
  showLabel?: boolean;
}

export function ProgressBar({ percentage, showLabel = true }: ProgressBarProps) {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && <span className="progress-label">{percentage}%</span>}
    </div>
  );
}
```

**CSS**:
```css
.progress-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 14px;
  color: #666;
  min-width: 40px;
  text-align: right;
}
```

### Lesson Checkmarks

```tsx
interface LessonItemProps {
  lesson: Lesson;
  completed: boolean;
  onToggle: () => void;
}

export function LessonItem({ lesson, completed, onToggle }: LessonItemProps) {
  return (
    <div className={`lesson-item ${completed ? 'completed' : ''}`}>
      <button 
        className="checkbox"
        onClick={onToggle}
        aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {completed && <CheckIcon />}
      </button>
      <span className="lesson-title">{lesson.title}</span>
      {completed && <span className="completion-badge">✓</span>}
    </div>
  );
}
```

### Resume Button

```tsx
interface CourseCardProps {
  course: Course;
  progress: CourseProgress | null;
}

export function CourseCard({ course, progress }: CourseCardProps) {
  const percentage = progress?.progressPercentage || 0;
  const lastLesson = progress?.lastLessonId;
  
  return (
    <div className="course-card">
      <h3>{course.title}</h3>
      <ProgressBar percentage={percentage} />
      
      {percentage === 0 && (
        <button onClick={() => startCourse(course.id)}>
          Start Course
        </button>
      )}
      
      {percentage > 0 && percentage < 100 && (
        <button onClick={() => resumeCourse(course.id, lastLesson)}>
          Resume ({percentage}% complete)
        </button>
      )}
      
      {percentage === 100 && (
        <div className="completion-badge">
          <span>🎉 Completed!</span>
          <button onClick={() => reviewCourse(course.id)}>
            Review Course
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Gamification Patterns

### 1. Completion Badges

```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  requirement: (progress: CourseProgress[]) => boolean;
}

const badges: Badge[] = [
  {
    id: 'first-course',
    name: 'Getting Started',
    description: 'Complete your first course',
    imageUrl: '/badges/first-course.png',
    requirement: (progress) => 
      progress.filter(p => p.progressPercentage === 100).length >= 1,
  },
  {
    id: 'five-courses',
    name: 'Knowledge Seeker',
    description: 'Complete 5 courses',
    imageUrl: '/badges/five-courses.png',
    requirement: (progress) => 
      progress.filter(p => p.progressPercentage === 100).length >= 5,
  },
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    description: 'Complete a lesson every day for 7 days',
    imageUrl: '/badges/perfect-week.png',
    requirement: (progress) => {
      // Check last 7 days of activity
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        const hasActivity = progress.some(p => 
          isSameDay(p.lastAccessedAt, targetDate)
        );
        if (!hasActivity) return false;
      }
      return true;
    },
  },
];
```

### 2. Streaks

```typescript
interface Streak {
  current: number;    // Current streak (days)
  longest: number;    // Longest streak ever
  lastActivityDate: Date;
}

async function updateStreak(userId: string): Promise<Streak> {
  const streak = await getStreak(userId);
  const today = new Date();
  const lastActivity = streak.lastActivityDate;
  
  if (isSameDay(today, lastActivity)) {
    // Already active today, no change
    return streak;
  }
  
  if (isYesterday(lastActivity)) {
    // Streak continues
    streak.current++;
    streak.longest = Math.max(streak.longest, streak.current);
  } else {
    // Streak broken
    streak.current = 1;
  }
  
  streak.lastActivityDate = today;
  await saveStreak(userId, streak);
  
  return streak;
}
```

### 3. Leaderboards

```typescript
interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  totalCompleted: number;
  totalPoints: number;
}

async function getLeaderboard(timeframe: 'week' | 'month' | 'all'): Promise<LeaderboardEntry[]> {
  const since = timeframe === 'week' 
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : timeframe === 'month'
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    : new Date(0);
  
  const result = await pool.query(`
    SELECT 
      u.id as user_id,
      u.name as user_name,
      COUNT(CASE WHEN cp.progress_percentage = 100 THEN 1 END) as total_completed,
      COALESCE(SUM(c.points), 0) as total_points,
      RANK() OVER (ORDER BY COUNT(CASE WHEN cp.progress_percentage = 100 THEN 1 END) DESC) as rank
    FROM users u
    LEFT JOIN course_progress cp ON u.id = cp.user_id
    LEFT JOIN courses c ON cp.course_id = c.id
    WHERE cp.updated_at >= $1
    GROUP BY u.id, u.name
    ORDER BY total_completed DESC, total_points DESC
    LIMIT 100
  `, [since]);
  
  return result.rows;
}
```

---

## Analytics from Progress Data

### Completion Funnel

```typescript
interface FunnelStep {
  lesson: string;
  started: number;
  completed: number;
  dropoffRate: number;
}

async function getCompletionFunnel(courseId: string): Promise<FunnelStep[]> {
  const result = await pool.query(`
    WITH lesson_stats AS (
      SELECT 
        l.id,
        l.title,
        l.position,
        COUNT(DISTINCT cp.user_id) FILTER (
          WHERE l.id = ANY(
            SELECT jsonb_array_elements_text(cp.completed_lessons)
          )
        ) as completed,
        COUNT(DISTINCT cp.user_id) as started
      FROM lessons l
      CROSS JOIN course_progress cp
      WHERE l.course_id = $1 AND cp.course_id = $1
      GROUP BY l.id, l.title, l.position
      ORDER BY l.position
    )
    SELECT 
      title as lesson,
      started,
      completed,
      CASE WHEN started > 0 
           THEN ROUND((1 - completed::FLOAT / started) * 100, 2)
           ELSE 0 
      END as dropoff_rate
    FROM lesson_stats
  `, [courseId]);
  
  return result.rows;
}
```

### Time to Complete

```typescript
async function getAverageCompletionTime(courseId: string): Promise<number> {
  const result = await pool.query(`
    SELECT AVG(
      EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
    ) as avg_hours
    FROM course_progress
    WHERE course_id = $1 AND completed_at IS NOT NULL
  `, [courseId]);
  
  return result.rows[0]?.avg_hours || 0;
}
```

### Popular Lessons

```typescript
async function getPopularLessons(limit: number = 10): Promise<Array<{ lessonId: string, count: number }>> {
  const result = await pool.query(`
    SELECT 
      jsonb_array_elements_text(completed_lessons) as lesson_id,
      COUNT(*) as completion_count
    FROM course_progress
    GROUP BY lesson_id
    ORDER BY completion_count DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows;
}
```

---

## Common Pitfalls

### 1. Race Conditions

**Problem**: Two requests mark same lesson complete simultaneously

```typescript
// BAD: Race condition
async function markLessonComplete(data: LessonProgressUpdate) {
  const progress = await getCourseProgress(data.userId, data.courseId);
  progress.completedLessons.push(data.lessonId); // Both requests read same state
  await updateProgress(progress); // One overwrites the other
}
```

**Solution**: Atomic database operation

```typescript
// GOOD: Atomic update
async function markLessonComplete(data: LessonProgressUpdate) {
  await pool.query(`
    UPDATE course_progress 
    SET completed_lessons = CASE
      WHEN completed_lessons @> $3 THEN completed_lessons -- Already exists
      ELSE completed_lessons || $3 -- Append atomically
    END
    WHERE user_id = $1 AND course_id = $2
  `, [data.userId, data.courseId, JSON.stringify([data.lessonId])]);
}
```

### 2. Stale Progress Data

**Problem**: UI shows outdated percentage after marking lesson complete

```typescript
// BAD: No refresh after update
function LessonPage({ lesson, progress }) {
  const handleComplete = async () => {
    await markLessonComplete(lesson.id);
    // Progress bar still shows old percentage!
  };
  
  return <ProgressBar percentage={progress.percentage} />;
}
```

**Solution**: Refresh progress after update

```typescript
// GOOD: Refresh after update
function LessonPage({ lesson, progress, onProgressUpdate }) {
  const handleComplete = async () => {
    await markLessonComplete(lesson.id);
    const newProgress = await fetchProgress(); // Refresh
    onProgressUpdate(newProgress); // Update state
  };
  
  return <ProgressBar percentage={progress.percentage} />;
}
```

### 3. Percentage Calculation Errors

**Problem**: Float precision issues, division by zero

```typescript
// BAD: Precision and edge case issues
const percentage = (completed / total) * 100; // 33.333333...
const percentage = (5 / 0) * 100; // Infinity!
```

**Solution**: Round and validate

```typescript
// GOOD: Safe calculation
function calculatePercentage(completed: number, total: number): number {
  if (total === 0) return 0; // Edge case
  const clamped = Math.min(completed, total); // Prevent > 100%
  return Math.round((clamped / total) * 100); // Integer result
}
```

### 4. Not Checking Enrollment

**Problem**: Users mark lessons complete for courses they don't own

```typescript
// BAD: No enrollment check
async function markLessonComplete(data: LessonProgressUpdate) {
  // Marks complete even if user didn't purchase course!
  await updateProgress(data);
}
```

**Solution**: Verify enrollment first

```typescript
// GOOD: Check enrollment
async function markLessonComplete(data: LessonProgressUpdate) {
  const enrolled = await isEnrolled(data.userId, data.courseId);
  if (!enrolled) {
    throw new ForbiddenError('User not enrolled in course');
  }
  
  await updateProgress(data);
}
```

### 5. Ignoring completedAt Timestamp

**Problem**: Course reaches 100% but no completion timestamp

```typescript
// BAD: No completedAt tracking
async function markLessonComplete(data: LessonProgressUpdate) {
  const percentage = calculatePercentage(/* ... */);
  await updateProgress({ percentage }); // completedAt stays null!
}
```

**Solution**: Set timestamp at 100%

```typescript
// GOOD: Track completion time
async function markLessonComplete(data: LessonProgressUpdate) {
  const percentage = calculatePercentage(/* ... */);
  const completedAt = percentage === 100 ? new Date() : null;
  await updateProgress({ percentage, completedAt });
}
```

---

## Testing Progress Tracking

### Unit Tests

**Test**: Individual functions in isolation

```typescript
import { describe, it, expect, vi } from 'vitest';
import { calculatePercentage } from './progress';

describe('calculatePercentage', () => {
  it('should calculate percentage correctly', () => {
    expect(calculatePercentage(3, 10)).toBe(30);
    expect(calculatePercentage(7, 10)).toBe(70);
    expect(calculatePercentage(10, 10)).toBe(100);
  });
  
  it('should handle edge cases', () => {
    expect(calculatePercentage(0, 10)).toBe(0);
    expect(calculatePercentage(5, 0)).toBe(0); // Division by zero
    expect(calculatePercentage(15, 10)).toBe(100); // Clamp at 100%
  });
  
  it('should round to integer', () => {
    expect(calculatePercentage(1, 3)).toBe(33); // Not 33.333...
    expect(calculatePercentage(2, 3)).toBe(67); // Not 66.666...
  });
});
```

### Integration Tests

**Test**: Service functions with mock database

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { markLessonComplete } from './progress';
import { pool } from './db';

// Mock database
vi.mock('./db', () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe('markLessonComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should insert new progress record', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // No existing progress
    pool.query.mockResolvedValueOnce({ rows: [{ id: '123' }] }); // Insert result
    
    await markLessonComplete({
      userId: 'user-1',
      courseId: 'course-1',
      lessonId: 'lesson-1',
      totalLessons: 10,
    });
    
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      expect.arrayContaining(['user-1', 'course-1'])
    );
  });
});
```

### E2E Tests (T121 Implementation)

**Test**: Full flow with real database

```typescript
import { test, expect } from '@playwright/test';

test.describe('Progress Tracking', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });
  
  test('should mark lesson complete and update percentage', async () => {
    // Mark first lesson
    const progress1 = await markLessonComplete({
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      lessonId: 'lesson-1',
      totalLessons: 10,
    });
    
    expect(progress1.completedLessons).toEqual(['lesson-1']);
    expect(progress1.progressPercentage).toBe(10);
    expect(progress1.completedAt).toBeNull();
    
    // Mark more lessons
    await markLessonComplete({ ...data, lessonId: 'lesson-2' });
    await markLessonComplete({ ...data, lessonId: 'lesson-3' });
    
    const progress2 = await getCourseProgress(TEST_USER_ID, TEST_COURSE_ID);
    expect(progress2.completedLessons).toHaveLength(3);
    expect(progress2.progressPercentage).toBe(30);
  });
  
  test('should set completedAt when reaching 100%', async () => {
    // Complete 9 lessons (90%)
    for (let i = 1; i <= 9; i++) {
      await markLessonComplete({ ...data, lessonId: `lesson-${i}` });
    }
    
    let progress = await getCourseProgress(TEST_USER_ID, TEST_COURSE_ID);
    expect(progress.progressPercentage).toBe(90);
    expect(progress.completedAt).toBeNull();
    
    // Complete 10th lesson (100%)
    await markLessonComplete({ ...data, lessonId: 'lesson-10' });
    
    progress = await getCourseProgress(TEST_USER_ID, TEST_COURSE_ID);
    expect(progress.progressPercentage).toBe(100);
    expect(progress.completedAt).not.toBeNull();
  });
});
```

---

## Scaling Considerations

### Database Indexing

```sql
-- Primary queries
CREATE INDEX idx_course_progress_user ON course_progress(user_id);
CREATE INDEX idx_course_progress_course ON course_progress(course_id);
CREATE INDEX idx_course_progress_user_course ON course_progress(user_id, course_id);

-- JSONB queries (PostgreSQL)
CREATE INDEX idx_course_progress_lessons ON course_progress USING GIN (completed_lessons);

-- Analytics queries
CREATE INDEX idx_course_progress_completed ON course_progress(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_course_progress_updated ON course_progress(updated_at);
```

### Caching Layer

**When to Add**: > 100K users

```typescript
import { Redis } from 'ioredis';

const redis = new Redis();

async function getCourseProgressCached(
  userId: string,
  courseId: string
): Promise<CourseProgress | null> {
  const cacheKey = `progress:${userId}:${courseId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const progress = await getCourseProgress(userId, courseId);
  
  // Cache for 5 minutes
  if (progress) {
    await redis.setex(cacheKey, 300, JSON.stringify(progress));
  }
  
  return progress;
}

// Invalidate cache on update
async function markLessonCompleteCached(data: LessonProgressUpdate) {
  const progress = await markLessonComplete(data);
  
  // Invalidate cache
  const cacheKey = `progress:${data.userId}:${data.courseId}`;
  await redis.del(cacheKey);
  
  return progress;
}
```

### Partitioning

**When to Use**: > 10M progress records

```sql
-- Partition by user_id range
CREATE TABLE course_progress_0 PARTITION OF course_progress
  FOR VALUES FROM (MINVALUE) TO ('50000000-0000-0000-0000-000000000000');

CREATE TABLE course_progress_1 PARTITION OF course_progress
  FOR VALUES FROM ('50000000-0000-0000-0000-000000000000') TO ('a0000000-0000-0000-0000-000000000000');

CREATE TABLE course_progress_2 PARTITION OF course_progress
  FOR VALUES FROM ('a0000000-0000-0000-0000-000000000000') TO (MAXVALUE);
```

### Archiving Old Data

**Strategy**: Move completed courses to archive table

```sql
-- Create archive table
CREATE TABLE course_progress_archive (LIKE course_progress INCLUDING ALL);

-- Archive completed courses older than 1 year
INSERT INTO course_progress_archive
SELECT * FROM course_progress
WHERE completed_at < NOW() - INTERVAL '1 year';

DELETE FROM course_progress
WHERE completed_at < NOW() - INTERVAL '1 year';
```

---

## Best Practices Checklist

### Data Integrity
- ✅ Validate user/course IDs before operations
- ✅ Use transactions for multi-step operations
- ✅ Prevent duplicate lesson entries (idempotency)
- ✅ Clamp percentage at 0-100%
- ✅ Set completedAt timestamp at 100%
- ✅ Clear completedAt when percentage drops below 100%

### Performance
- ✅ Use bulk queries for multiple courses (avoid N+1)
- ✅ Index database columns (user_id, course_id)
- ✅ Consider caching for high-traffic apps
- ✅ Use Map for O(1) lookups (not Array.find)
- ✅ Limit JSONB array size (< 1000 items)

### Error Handling
- ✅ Log errors with full context (userId, courseId, lessonId)
- ✅ Re-throw errors for caller to handle
- ✅ Validate inputs before database operations
- ✅ Handle edge cases (division by zero, null values)
- ✅ Use try-catch in all async functions

### Type Safety
- ✅ Define TypeScript interfaces for all data
- ✅ Use strict type checking (no `any`)
- ✅ Validate external data (API requests)
- ✅ Document parameter requirements

### Testing
- ✅ Unit tests for calculations (percentage, etc.)
- ✅ Integration tests with mock database
- ✅ E2E tests with real database
- ✅ Test edge cases (empty, null, invalid IDs)
- ✅ Test error handling paths

### User Experience
- ✅ Instant UI updates (optimistic or fast queries)
- ✅ Clear progress indicators (bars, checkmarks)
- ✅ Resume functionality (track last accessed)
- ✅ Completion celebration (badges, confetti)
- ✅ Graceful degradation if progress fails

---

## Reference Code Patterns

### Pattern 1: Simple Linear Progress

```typescript
// Database schema
CREATE TABLE course_progress (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  completed_lessons JSONB DEFAULT '[]',
  progress_percentage INTEGER DEFAULT 0,
  UNIQUE(user_id, course_id)
);

// Service function
export async function markLessonComplete(
  userId: string,
  courseId: string,
  lessonId: string,
  totalLessons: number
): Promise<void> {
  await pool.query(`
    INSERT INTO course_progress (user_id, course_id, completed_lessons, progress_percentage)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, course_id) DO UPDATE
    SET completed_lessons = course_progress.completed_lessons || $3,
        progress_percentage = ROUND((jsonb_array_length(course_progress.completed_lessons || $3)::FLOAT / $4) * 100)
  `, [userId, courseId, JSON.stringify([lessonId]), totalLessons]);
}

// React hook
export function useProgress(courseId: string) {
  const [progress, setProgress] = useState(null);
  
  useEffect(() => {
    fetchProgress(courseId).then(setProgress);
  }, [courseId]);
  
  const markComplete = async (lessonId: string) => {
    await markLessonComplete(courseId, lessonId);
    setProgress(await fetchProgress(courseId));
  };
  
  return { progress, markComplete };
}
```

### Pattern 2: Hierarchical with Modules

```typescript
// Database schema
CREATE TABLE module_progress (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id UUID NOT NULL,
  completed_lessons_count INTEGER DEFAULT 0,
  total_lessons_count INTEGER NOT NULL,
  progress_percentage INTEGER GENERATED ALWAYS AS (
    CASE WHEN total_lessons_count > 0 
         THEN (completed_lessons_count * 100 / total_lessons_count)
         ELSE 0 END
  ) STORED,
  UNIQUE(user_id, module_id)
);

CREATE TABLE lesson_completions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  module_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

// Service function
export async function markLessonCompleteHierarchical(
  userId: string,
  lessonId: string,
  moduleId: string
): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Record lesson completion
    await client.query(`
      INSERT INTO lesson_completions (user_id, lesson_id, module_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, lesson_id) DO NOTHING
    `, [userId, lessonId, moduleId]);
    
    // Update module progress
    await client.query(`
      INSERT INTO module_progress (user_id, module_id, completed_lessons_count, total_lessons_count)
      SELECT $1, $2, COUNT(*), (SELECT COUNT(*) FROM lessons WHERE module_id = $2)
      FROM lesson_completions
      WHERE user_id = $1 AND module_id = $2
      ON CONFLICT (user_id, module_id) DO UPDATE
      SET completed_lessons_count = EXCLUDED.completed_lessons_count
    `, [userId, moduleId]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Pattern 3: Time-Based Video Progress

```typescript
// Database schema
CREATE TABLE video_progress (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL,
  current_time INTEGER DEFAULT 0, -- seconds
  duration INTEGER NOT NULL,      -- seconds
  progress_percentage INTEGER GENERATED ALWAYS AS (
    CASE WHEN duration > 0 
         THEN LEAST((current_time * 100 / duration), 100)
         ELSE 0 END
  ) STORED,
  bookmarks INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  UNIQUE(user_id, video_id)
);

// Service function
export async function updateVideoProgress(
  userId: string,
  videoId: string,
  currentTime: number,
  duration: number
): Promise<void> {
  await pool.query(`
    INSERT INTO video_progress (user_id, video_id, current_time, duration)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, video_id) DO UPDATE
    SET current_time = $3,
        duration = $4,
        updated_at = NOW()
  `, [userId, videoId, currentTime, duration]);
}

// React video player integration
export function VideoPlayer({ video }: { video: Video }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Load saved progress
    fetchVideoProgress(video.id).then(saved => {
      if (saved) {
        video.currentTime = saved.currentTime;
        setProgress(saved.progressPercentage);
      }
    });
    
    // Save progress every 5 seconds
    const interval = setInterval(() => {
      updateVideoProgress(
        video.id,
        video.currentTime,
        video.duration
      );
      setProgress((video.currentTime / video.duration) * 100);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [video.id]);
  
  return (
    <div>
      <video ref={videoRef} src={video.url} controls />
      <ProgressBar percentage={progress} />
    </div>
  );
}
```

---

## Conclusion

Progress tracking is a **critical feature** for educational platforms that directly impacts user engagement, completion rates, and business metrics.

### Key Takeaways

1. **Choose the Right Pattern**: Linear, hierarchical, time-based, or mastery based on your content
2. **Optimize Performance**: Use bulk queries, indexes, and caching at scale
3. **Track Completion**: Set timestamps when progress reaches 100%
4. **Error Handling**: Log errors with context, validate inputs, handle edge cases
5. **UI Integration**: Show progress bars, checkmarks, and resume buttons
6. **Gamification**: Add badges, streaks, and leaderboards for motivation
7. **Analytics**: Use progress data to improve content and identify drop-off points
8. **Test Thoroughly**: Unit, integration, and E2E tests for all scenarios

### Next Steps

After implementing progress tracking (T121), consider:

1. **UI Integration** (T122-T123): Add progress bars to dashboard
2. **API Endpoints** (T124): Create REST/GraphQL endpoints for progress
3. **Gamification** (T125+): Add badges, streaks, certificates
4. **Analytics Dashboard**: Visualize completion funnels, popular lessons
5. **Notifications**: Email/push notifications for milestones
6. **Advanced Features**: Prerequisites, spaced repetition, collaborative learning

---

**Remember**: Start simple (T121 implementation), measure performance, and scale incrementally. Most platforms never need the complex patterns—focus on what your users actually need.
