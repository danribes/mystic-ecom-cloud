# T124: Lesson Progress API Endpoints - Learning Guide

**Audience**: Junior to intermediate developers learning REST API development with Astro
**Prerequisites**: Basic understanding of TypeScript, HTTP, and SQL
**Date**: November 2, 2025

---

## Table of Contents

1. [What We Built](#what-we-built)
2. [REST API Design Principles](#rest-api-design-principles)
3. [Astro API Routes](#astro-api-routes)
4. [Authentication Patterns](#authentication-patterns)
5. [Input Validation with Zod](#input-validation-with-zod)
6. [Database Operations](#database-operations)
7. [Error Handling Strategies](#error-handling-strategies)
8. [Testing REST APIs](#testing-rest-apis)
9. [Common Pitfalls](#common-pitfalls)
10. [Best Practices](#best-practices)

---

## What We Built

We created a **RESTful API** for tracking lesson progress in an online learning platform. The API has 4 endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/lessons/:lessonId/start` | POST | Start or resume a lesson |
| `/api/lessons/:lessonId/time` | PUT | Update time spent on lesson |
| `/api/lessons/:lessonId/complete` | POST | Mark lesson as complete |
| `/api/courses/:courseId/progress` | GET | Get all progress for a course |

**Example Flow**:
```
User starts lesson → POST /api/lessons/intro/start
User studies 5 min → PUT /api/lessons/intro/time { timeSpentSeconds: 300 }
User finishes quiz → POST /api/lessons/intro/complete { score: 85 }
Dashboard loads   → GET /api/courses/course-123/progress
```

---

## REST API Design Principles

### 1. Resource-Oriented URLs

**Good** (resource-based):
```
GET  /api/lessons/:lessonId/progress       // Get a lesson's progress
POST /api/lessons/:lessonId/complete       // Complete a lesson
```

**Bad** (action-based):
```
GET  /api/getLessonProgress?lesson=123     // ❌ Verb in URL
POST /api/completeLesson                   // ❌ Looks like RPC, not REST
```

**Principle**: URLs represent **resources** (nouns), HTTP methods represent **actions** (verbs).

### 2. HTTP Method Semantics

| Method | Meaning | Idempotent? | Safe? | Use Case |
|--------|---------|-------------|-------|----------|
| GET | Retrieve data | ✅ Yes | ✅ Yes | Fetch progress |
| POST | Create resource | ❌ No | ❌ No | Start lesson (creates progress) |
| PUT | Update/replace | ✅ Yes | ❌ No | Update time spent |
| DELETE | Remove | ✅ Yes | ❌ No | Delete progress (not in T124) |

**Idempotent**: Calling multiple times has same effect as calling once.
**Safe**: Doesn't modify server state.

**Example**:
```typescript
// GET is safe and idempotent
GET /api/courses/123/progress  // Always returns same data, no side effects

// PUT is idempotent (but not safe)
PUT /api/lessons/intro/time { timeSpentSeconds: 300 }
// Calling 3 times sets time to 300, not 900 (same result each time)

// POST is NOT idempotent
POST /api/lessons/intro/start
// Calling 3 times might create 3 progress records (if not handled)
```

**T124 Idempotency Handling**:
- `/start`: Uses database UNIQUE constraint to prevent duplicates (idempotent)
- `/complete`: Checks if already completed, returns success (idempotent)
- `/time`: Cumulative (NOT idempotent by design - each call adds time)

### 3. Status Code Selection

**2xx Success**:
- `200 OK`: Standard success (used for all T124 endpoints)
- `201 Created`: Resource created (not used - could use for `/start` on new lesson)
- `204 No Content`: Success, no body (not used)

**4xx Client Errors**:
- `400 Bad Request`: Invalid input (used for validation errors)
- `401 Unauthorized`: Missing/invalid authentication (used for all endpoints)
- `403 Forbidden`: Authenticated but not authorized (not used - could use for course access check)
- `404 Not Found`: Resource doesn't exist (used for lesson progress not started)

**5xx Server Errors**:
- `500 Internal Server Error`: Database error, unexpected exception (used as catch-all)

**Example**:
```typescript
// Valid request, valid session, lesson not started
PUT /api/lessons/intro/time { timeSpentSeconds: 300 }
→ 404 Not Found { error: "Lesson progress not found. Start the lesson first." }

// Invalid score
POST /api/lessons/intro/complete { score: 150 }
→ 400 Bad Request { error: "Invalid request data", details: [...] }

// No session cookie
POST /api/lessons/intro/start
→ 401 Unauthorized { error: "Authentication required" }
```

### 4. Consistent Response Format

All T124 endpoints use the same JSON structure:

**Success**:
```json
{
  "success": true,
  "message": "Lesson completed successfully",
  "data": { /* endpoint-specific data */ }
}
```

**Error**:
```json
{
  "success": false,
  "error": "Lesson progress not found. Start the lesson first.",
  "details": [ /* optional validation errors */ ]
}
```

**Benefits**:
- Frontend can check `response.success` to determine outcome
- Consistent error handling across all endpoints
- Easy to extend (add `warnings`, `metadata`, etc.)

---

## Astro API Routes

### File-Based Routing

Astro converts file paths to URL routes:

```
src/pages/api/lessons/[lessonId]/start.ts
                 ↓
         /api/lessons/:lessonId/start
```

**Dynamic Parameters**:
- `[lessonId]` → `params.lessonId`
- `[courseId]` → `params.courseId`

**Example**:
```
POST /api/lessons/intro-to-meditation/start
     params.lessonId = "intro-to-meditation"

GET /api/courses/880e8400-e29b-41d4-a716-446655440001/progress
    params.courseId = "880e8400-e29b-41d4-a716-446655440001"
```

### Endpoint Structure

```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies, params }) => {
  // 1. Get dynamic parameter
  const lessonId = params.lessonId;

  // 2. Parse request body
  const body = await request.json();

  // 3. Access cookies (for authentication)
  const session = await getSessionFromRequest(cookies);

  // 4. Return JSON response
  return new Response(
    JSON.stringify({ success: true, data: {...} }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
```

**Key Objects**:
- `request`: Standard Web Request object (body, headers)
- `cookies`: Astro's cookie API (get, set, delete)
- `params`: URL parameters from file path

### Multiple Methods in One File

```typescript
// src/pages/api/lessons/[lessonId]/progress.ts

export const GET: APIRoute = async ({ params }) => {
  // GET /api/lessons/:lessonId/progress
  return new Response(JSON.stringify({ progress: 75 }));
};

export const DELETE: APIRoute = async ({ params }) => {
  // DELETE /api/lessons/:lessonId/progress
  return new Response(JSON.stringify({ success: true }));
};
```

**T124 Structure** (separate files for clarity):
- `start.ts` → POST only
- `time.ts` → PUT only
- `complete.ts` → POST only
- `progress.ts` → GET only

---

## Authentication Patterns

### Session-Based Authentication

T124 uses **session cookies** stored in Redis:

```typescript
import { getSessionFromRequest } from '@/lib/auth/session';

export const POST: APIRoute = async ({ cookies }) => {
  // Validate session from cookie
  const session = await getSessionFromRequest(cookies);

  if (!session) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const userId = session.userId; // Extract user ID
  // Use userId in database queries
};
```

**Flow**:
1. User logs in → Server creates session in Redis → Returns `session=abc123` cookie
2. Client sends request with cookie → Server looks up session in Redis → Validates user
3. Server extracts `userId` from session → Uses in database queries

**Security**:
- ✅ User ID comes from session (server-controlled), not request body (client-controlled)
- ✅ Session IDs are cryptographically random (UUID)
- ✅ Sessions expire after inactivity
- ✅ HTTPOnly cookies (JavaScript can't access)

### Alternative: JWT Tokens

**Not used in T124, but common pattern**:

```typescript
import jwt from 'jsonwebtoken';

export const POST: APIRoute = async ({ request }) => {
  // Get token from Authorization header
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token' }), { status: 401 });
  }

  try {
    // Verify and decode JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.userId;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }
};
```

**Session vs JWT**:
| Feature | Session (T124) | JWT |
|---------|---------------|-----|
| Storage | Server (Redis) | Client (browser) |
| Revocation | Easy (delete from Redis) | Hard (need blacklist) |
| Server State | Stateful | Stateless |
| Scalability | Requires Redis cluster | Easy horizontal scaling |
| Security | Server controls | Client controls (signed) |

---

## Input Validation with Zod

### Why Validate?

**Without Validation**:
```typescript
const { courseId } = await request.json();
// If courseId is "not-a-uuid", SQL query will fail with cryptic error
// If courseId is missing, get undefined error
// If courseId is 12345 (number), type mismatch
```

**With Validation**:
```typescript
const schema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
});

const validation = schema.safeParse(body);
if (!validation.success) {
  // Return clear error message to client
  return new Response(JSON.stringify({
    success: false,
    error: 'Invalid request data',
    details: validation.error.errors // Shows exactly what's wrong
  }), { status: 400 });
}

const { courseId } = validation.data; // ✅ Type-safe, validated string UUID
```

### Zod Schema Patterns

**Basic Types**:
```typescript
z.string()                    // Any string
z.number()                    // Any number
z.boolean()                   // true or false
z.array(z.string())           // Array of strings
z.object({ name: z.string() }) // Object with name property
```

**Constraints**:
```typescript
z.string().uuid()             // Must be UUID format
z.string().email()            // Must be email format
z.string().min(3).max(50)     // Length 3-50 characters
z.number().int()              // Must be integer (not float)
z.number().min(0).max(100)    // Range 0-100
z.number().positive()         // Must be > 0
```

**Optional Fields**:
```typescript
z.object({
  courseId: z.string().uuid(),           // Required
  score: z.number().int().min(0).max(100).optional(), // Optional
});

// Valid: { courseId: "uuid" }
// Valid: { courseId: "uuid", score: 85 }
// Invalid: { courseId: "uuid", score: 150 }  // Score out of range
```

**T124 Schemas**:

```typescript
// POST /api/lessons/[lessonId]/start
const startLessonSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
});

// PUT /api/lessons/[lessonId]/time
const updateTimeSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
  timeSpentSeconds: z.number().int().min(0, 'Time spent must be non-negative'),
});

// POST /api/lessons/[lessonId]/complete
const completeLessonSchema = z.object({
  courseId: z.string().uuid('Invalid course ID format'),
  score: z.number().int().min(0).max(100).optional(),
});
```

**Custom Error Messages**:
```typescript
z.string().uuid('Invalid course ID format')  // Custom message
// vs
z.string().uuid()  // Default: "Invalid uuid"
```

---

## Database Operations

### Parameterized Queries (SQL Injection Prevention)

**❌ NEVER DO THIS** (SQL Injection):
```typescript
const lessonId = params.lessonId; // Could be "'; DROP TABLE users; --"
await pool.query(`SELECT * FROM lesson_progress WHERE lesson_id = '${lessonId}'`);
// SQL: SELECT * FROM lesson_progress WHERE lesson_id = ''; DROP TABLE users; --'
// DANGER: Deletes entire users table!
```

**✅ ALWAYS DO THIS** (Parameterized):
```typescript
await pool.query(
  `SELECT * FROM lesson_progress WHERE lesson_id = $1`,
  [lessonId] // PostgreSQL escapes this safely
);
```

**How it Works**:
- `$1`, `$2`, `$3` are placeholders
- PostgreSQL driver escapes values automatically
- No way for user input to become SQL code

### RETURNING Clause (Get Inserted/Updated Data)

**Without RETURNING**:
```typescript
// Need 2 queries
await pool.query(
  `INSERT INTO lesson_progress (user_id, course_id, lesson_id)
   VALUES ($1, $2, $3)`,
  [userId, courseId, lessonId]
);

const result = await pool.query(
  `SELECT * FROM lesson_progress WHERE user_id = $1 AND course_id = $2 AND lesson_id = $3`,
  [userId, courseId, lessonId]
);
const newRecord = result.rows[0];
```

**With RETURNING** (single query):
```typescript
const result = await pool.query(
  `INSERT INTO lesson_progress (user_id, course_id, lesson_id)
   VALUES ($1, $2, $3)
   RETURNING id, completed, time_spent_seconds, attempts`,
  [userId, courseId, lessonId]
);
const newRecord = result.rows[0]; // Get inserted data immediately
```

**Benefits**:
- ✅ Atomic (no race condition between INSERT and SELECT)
- ✅ Faster (one round-trip vs two)
- ✅ Simpler code

### UNIQUE Constraints for Idempotency

**Problem**: POST /start called twice could create 2 progress records

**Solution**: Database UNIQUE constraint
```sql
CREATE TABLE lesson_progress (
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  lesson_id VARCHAR(255) NOT NULL,
  ...
  UNIQUE(user_id, course_id, lesson_id) -- Only one progress per user+course+lesson
);
```

**Handling Conflicts**:
```typescript
// Check if exists first
const existing = await pool.query(
  `SELECT id FROM lesson_progress WHERE user_id = $1 AND course_id = $2 AND lesson_id = $3`,
  [userId, courseId, lessonId]
);

if (existing.rows.length > 0) {
  // Update existing
  await pool.query(
    `UPDATE lesson_progress SET last_accessed_at = $1 WHERE id = $2`,
    [now, existing.rows[0].id]
  );
} else {
  // Insert new
  await pool.query(
    `INSERT INTO lesson_progress (...) VALUES (...)`,
    [...]
  );
}
```

**Alternative**: PostgreSQL `ON CONFLICT` (upsert)
```typescript
await pool.query(
  `INSERT INTO lesson_progress (user_id, course_id, lesson_id, ...)
   VALUES ($1, $2, $3, ...)
   ON CONFLICT (user_id, course_id, lesson_id) DO UPDATE
   SET last_accessed_at = EXCLUDED.last_accessed_at`,
  [userId, courseId, lessonId, ...]
);
```

---

## Error Handling Strategies

### Layered Error Handling

T124 uses a **multi-layer** approach:

**Layer 1: Authentication Check**
```typescript
const session = await getSessionFromRequest(cookies);
if (!session) {
  return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401 });
}
```

**Layer 2: Input Validation**
```typescript
const validation = schema.safeParse(body);
if (!validation.success) {
  return new Response(JSON.stringify({ error: 'Invalid request data' }), { status: 400 });
}
```

**Layer 3: Resource Existence**
```typescript
if (result.rows.length === 0) {
  return new Response(JSON.stringify({ error: 'Lesson progress not found' }), { status: 404 });
}
```

**Layer 4: Catch-All**
```typescript
try {
  // Database operations
} catch (error) {
  console.error('[ENDPOINT] Error:', error);
  return new Response(JSON.stringify({ error: 'An error occurred' }), { status: 500 });
}
```

### Error Messages: User-Friendly vs Debug

**User-Friendly** (sent to client):
```json
{ "error": "Lesson progress not found. Start the lesson first." }
```

**Debug** (logged to console):
```
[COMPLETE_LESSON] Error: error: relation "lesson_progress" does not exist
  at Parser.parseErrorMessage (...)
  at Parser.handlePacket (...)
```

**Principle**: Never expose internal errors (stack traces, SQL) to clients.

---

## Testing REST APIs

### E2E Testing with Playwright

**Test Structure**:
```typescript
import { test, expect } from '@playwright/test';

test('should start a new lesson successfully', async ({ request }) => {
  const response = await request.post('/api/lessons/intro/start', {
    data: { courseId: 'uuid' },
    headers: { 'Cookie': `session=${authCookie}` }
  });

  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data.success).toBe(true);
  expect(data.data.completed).toBe(false);
});
```

**Key Concepts**:
- `request.post()`, `request.get()`, etc. make API calls
- `expect(response.status()).toBe(200)` checks HTTP status
- `await response.json()` parses JSON body
- Test database should be separate from development/production

### Test Data Cleanup

**Problem**: Tests leave data in database, affecting future tests

**Solution**: `afterAll` cleanup
```typescript
test.afterAll(async () => {
  await pool.query('DELETE FROM lesson_progress WHERE user_id = $1', [testUser.id]);
  await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
});
```

**Better**: Use transactions (if possible)
```typescript
test.beforeEach(async () => {
  await pool.query('BEGIN'); // Start transaction
});

test.afterEach(async () => {
  await pool.query('ROLLBACK'); // Undo all changes
});
```

---

## Common Pitfalls

### 1. Forgetting to Await Async Functions

❌ **Wrong**:
```typescript
const session = getSessionFromRequest(cookies); // Missing await
if (!session) { ... } // session is a Promise, not null!
```

✅ **Correct**:
```typescript
const session = await getSessionFromRequest(cookies);
if (!session) { ... }
```

### 2. Not Setting Content-Type Header

❌ **Wrong**:
```typescript
return new Response(JSON.stringify({ success: true }));
// Browser may not parse as JSON
```

✅ **Correct**:
```typescript
return new Response(
  JSON.stringify({ success: true }),
  { headers: { 'Content-Type': 'application/json' } }
);
```

### 3. SQL Injection via String Concatenation

❌ **Wrong**:
```typescript
await pool.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

✅ **Correct**:
```typescript
await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
```

### 4. Not Validating URL Parameters

❌ **Wrong**:
```typescript
const lessonId = params.lessonId; // Could be undefined
await pool.query(`SELECT * FROM lesson_progress WHERE lesson_id = $1`, [lessonId]);
```

✅ **Correct**:
```typescript
const lessonId = params.lessonId;
if (!lessonId || typeof lessonId !== 'string') {
  return new Response(JSON.stringify({ error: 'Lesson ID is required' }), { status: 400 });
}
```

### 5. Returning Database Errors to Client

❌ **Wrong**:
```typescript
try {
  await pool.query(...);
} catch (error) {
  return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  // Exposes: "error: relation 'lesson_progress' does not exist"
}
```

✅ **Correct**:
```typescript
try {
  await pool.query(...);
} catch (error) {
  console.error('[ENDPOINT] Error:', error); // Log for debugging
  return new Response(
    JSON.stringify({ error: 'An error occurred while processing your request' }),
    { status: 500 }
  );
}
```

---

## Best Practices

### 1. Consistent Naming Conventions

**Endpoints**:
- Use kebab-case for URLs: `/api/lesson-progress` (not `/api/lessonProgress`)
- Use nouns for resources: `/api/lessons` (not `/api/getLessons`)

**Database Columns**:
- Use snake_case: `time_spent_seconds` (not `timeSpentSeconds`)
- Use descriptive names: `completed_at` (not `ca` or `comp_date`)

**TypeScript Variables**:
- Use camelCase: `timeSpentSeconds` (not `time_spent_seconds`)
- Use descriptive names: `lessonProgress` (not `lp` or `data`)

### 2. Validate Early, Return Early

✅ **Good**:
```typescript
export const POST: APIRoute = async ({ cookies, params, request }) => {
  // Check auth first
  const session = await getSessionFromRequest(cookies);
  if (!session) return unauthorizedResponse();

  // Check params second
  if (!params.lessonId) return badRequestResponse('Lesson ID required');

  // Validate body third
  const validation = schema.safeParse(await request.json());
  if (!validation.success) return badRequestResponse(validation.error);

  // Now safe to proceed with business logic
  const result = await updateDatabase(...);
  return successResponse(result);
};
```

### 3. Use TypeScript Type Guards

```typescript
// Define response types
type SuccessResponse = { success: true; data: any };
type ErrorResponse = { success: false; error: string };
type APIResponse = SuccessResponse | ErrorResponse;

// Type guard function
function isErrorResponse(response: APIResponse): response is ErrorResponse {
  return !response.success;
}

// Usage
const response: APIResponse = await callAPI();
if (isErrorResponse(response)) {
  console.error(response.error); // ✅ TypeScript knows error exists
} else {
  console.log(response.data); // ✅ TypeScript knows data exists
}
```

### 4. Structured Logging

```typescript
console.log('[COMPLETE_LESSON] Lesson completed:', {
  userId,
  courseId,
  lessonId,
  attempts: updatedProgress.attempts,
  score: updatedProgress.score,
  progressId: updatedProgress.id,
  timestamp: new Date().toISOString()
});
```

**Benefits**:
- Easy to grep logs: `grep "\[COMPLETE_LESSON\]" logs.txt`
- Structured data for log aggregation tools (Datadog, Splunk)
- Includes context (userId, timestamp) for debugging

### 5. Database Connection Pooling

```typescript
import { getPool } from '@/lib/db';

const pool = getPool(); // Reuse connection pool

// ❌ Don't do this (creates new connection every time)
const pool = new Pool({ connectionString: '...' });
```

**Why**: Connection creation is expensive (~100ms), pool reuses connections (<1ms).

---

## Conclusion

**Key Takeaways**:
1. **REST APIs** use resources (nouns) + HTTP methods (verbs)
2. **Astro API routes** use file-based routing (`[param].ts`)
3. **Authentication** validates users before processing requests
4. **Zod validation** catches bad input before database errors
5. **Parameterized queries** prevent SQL injection
6. **Error handling** is layered (auth → validation → business logic → catch-all)
7. **Testing** uses E2E tests with real HTTP requests

**T124 Achievements**:
- ✅ 4 REST endpoints for lesson progress
- ✅ Session-based authentication
- ✅ Zod validation for all inputs
- ✅ SQL injection prevention
- ✅ 17 comprehensive E2E tests
- ✅ Zero TypeScript errors

**Next Learning**:
- Implement caching (Redis) for GET requests
- Add rate limiting (prevent abuse)
- Implement WebSockets (real-time updates)
- Add pagination (large datasets)
- Implement GraphQL (alternative to REST)

---

**Date**: November 2, 2025
**Task**: T124 - Lesson Progress API Endpoints
**Status**: ✅ Complete
