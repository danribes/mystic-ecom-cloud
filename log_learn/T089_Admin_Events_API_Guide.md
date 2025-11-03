# T089 - Building RESTful APIs with Business Logic

**Learning Objective**: Learn how to build production-ready REST APIs that go beyond simple CRUD, incorporating validation, authorization, and complex business logic constraints.

**Skill Level**: Intermediate to Advanced  
**Prerequisites**: REST basics, HTTP methods, TypeScript, Database fundamentals  
**Related Tasks**: T089 (Admin Events API), T072 (Orders API), T087/T088 (Forms)

---

## Table of Contents

1. [REST API Fundamentals](#rest-fundamentals)
2. [API Endpoint Structure](#endpoint-structure)
3. [Request Validation with Zod](#validation)
4. [Business Logic Constraints](#business-logic)
5. [Authentication & Authorization](#auth)
6. [Error Handling Patterns](#error-handling)
7. [Database Operations](#database)
8. [Testing REST APIs](#testing)
9. [Best Practices](#best-practices)
10. [Common Pitfalls](#pitfalls)

---

## 1. REST API Fundamentals {#rest-fundamentals}

### What is REST?

**REST** (Representational State Transfer) is an architectural style for designing networked applications using HTTP.

**Key Principles**:
1. **Resources**: Everything is a resource (events, users, bookings)
2. **URIs**: Resources identified by URIs (`/api/events`, `/api/events/123`)
3. **HTTP Methods**: Standard operations (GET, POST, PUT, DELETE)
4. **Stateless**: Each request contains all needed information
5. **Representations**: Resources returned in standard formats (JSON, XML)

### HTTP Methods (CRUD)

| Method | Purpose | Example | Response |
|--------|---------|---------|----------|
| GET | **Read** resources | `GET /api/events` | 200 OK + data |
| POST | **Create** resource | `POST /api/events` | 201 Created + data |
| PUT | **Update** entire resource | `PUT /api/events/123` | 200 OK + data |
| PATCH | **Update** partial resource | `PATCH /api/events/123` | 200 OK + data |
| DELETE | **Delete** resource | `DELETE /api/events/123` | 200 OK / 204 No Content |

### Our API Design

```
GET    /api/admin/events      - List all events (with filters)
POST   /api/admin/events      - Create new event
PUT    /api/admin/events/:id  - Update entire event
DELETE /api/admin/events/:id  - Delete event
```

**Why This Structure?**
- Clear resource hierarchy
- Standard HTTP methods
- Predictable patterns
- Easy to document

---

## 2. API Endpoint Structure {#endpoint-structure}

### File-Based Routing (Astro)

Astro uses file system for routing:

```
src/pages/api/admin/events/
├── index.ts       → /api/admin/events (GET, POST)
└── [id].ts        → /api/admin/events/:id (PUT, DELETE)
```

### Collection Endpoint (`index.ts`)

**Purpose**: Operations on the entire collection

```typescript
// src/pages/api/admin/events/index.ts

export const POST: APIRoute = async ({ request, cookies }) => {
  // Create new event
  // POST /api/admin/events
};

export const GET: APIRoute = async ({ url, cookies }) => {
  // List events with filtering
  // GET /api/admin/events?city=Boulder&status=published
};
```

### Individual Resource Endpoint (`[id].ts`)

**Purpose**: Operations on a specific resource

```typescript
// src/pages/api/admin/events/[id].ts

export const PUT: APIRoute = async ({ request, params, cookies }) => {
  // Update event
  // PUT /api/admin/events/123
  const eventId = params.id;
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  // Delete event
  // DELETE /api/admin/events/123
  const eventId = params.id;
};
```

### Why Separate Files?

**Benefits**:
1. Clear separation of concerns
2. Easier to maintain
3. Better organization
4. Follows REST conventions

**When to Use**:
- **Collection** (`index.ts`): List, create
- **Individual** (`[id].ts`): Read, update, delete

---

## 3. Request Validation with Zod {#validation}

### Why Validate?

**Security**: Prevent invalid/malicious data  
**Data Integrity**: Ensure database constraints  
**User Experience**: Clear error messages  
**Type Safety**: Catch errors at compile time

### Zod Schema Definition

```typescript
import { z } from 'zod';

const EventCreateSchema = z.object({
  // String validation
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(255),
  
  // Regex validation
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Only lowercase, numbers, hyphens'),
  
  // Number validation
  price: z.number()
    .min(0, 'Price cannot be negative'),
  
  // Number with range
  duration_hours: z.number()
    .min(0.5)
    .max(24, 'Duration cannot exceed 24 hours'),
  
  // Date transformation
  event_date: z.string()
    .transform(val => new Date(val)),
  
  // Optional fields
  venue_lat: z.number()
    .min(-90)
    .max(90)
    .optional()
    .nullable(),
  
  // Boolean with default
  is_published: z.boolean()
    .optional()
    .default(false),
});
```

### Cross-Field Validation

```typescript
const EventCreateSchema = z.object({
  capacity: z.number().int().min(1),
  available_spots: z.number().int().min(0),
})
.refine(
  (data) => data.available_spots <= data.capacity,
  {
    message: 'Available spots cannot exceed capacity',
    path: ['available_spots'], // Error attached to this field
  }
);
```

**Why Refine?**
- Validates relationships between fields
- Custom validation logic
- Specific error placement

### Using the Schema

```typescript
export const POST: APIRoute = async ({ request, cookies }) => {
  // Parse request body
  const body = await request.json();
  
  // Validate
  const validatedData = EventCreateSchema.safeParse(body);
  
  if (!validatedData.success) {
    // Return validation errors
    return new Response(
      JSON.stringify({
        error: 'Invalid event data',
        details: validatedData.error.errors,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
  
  // Use validated data (typed!)
  const data = validatedData.data;
  // data.title: string
  // data.price: number
  // data.event_date: Date (transformed!)
};
```

### Validation Error Format

```json
{
  "error": "Invalid event data",
  "details": [
    {
      "code": "too_small",
      "minimum": 3,
      "type": "string",
      "inclusive": true,
      "message": "Title must be at least 3 characters",
      "path": ["title"]
    },
    {
      "validation": "regex",
      "code": "invalid_string",
      "message": "Only lowercase, numbers, hyphens",
      "path": ["slug"]
    }
  ]
}
```

**User-Friendly Errors**:
- Clear field identification (`path`)
- Specific error messages
- Actionable guidance

---

## 4. Business Logic Constraints {#business-logic}

### Beyond Simple Validation

APIs often need complex business rules beyond "is this a number?"

### Example 1: Capacity with Existing Bookings

**Problem**: Admin wants to reduce event capacity

**Naive Approach**:
```typescript
// ❌ Simple validation only
if (newCapacity < 1) {
  return error('Capacity must be at least 1');
}
```

**Business Logic Approach**:
```typescript
// ✅ Consider existing bookings
const existingEvent = await getEventById(eventId);
const bookedSpots = existingEvent.capacity - existingEvent.available_spots;

if (newCapacity < bookedSpots) {
  return new Response(
    JSON.stringify({
      error: `Cannot reduce capacity below ${bookedSpots} (existing bookings)`,
    }),
    { status: 400 }
  );
}
```

**Why?**
- Protects data integrity
- Prevents breaking existing bookings
- Provides specific, actionable error

### Example 2: Available Spots Calculation

**Scenario**:
- Event capacity: 100
- Booked: 25 people
- Available: 75 spots

Admin increases capacity to 150. What should available spots be?

**Naive**:
```typescript
// ❌ Auto-sync to capacity
availableSpots = newCapacity; // 150
// Problem: Creates 75 phantom bookings!
```

**Correct**:
```typescript
// ✅ Respect existing bookings
const bookedSpots = oldCapacity - oldAvailableSpots; // 25
const maxAvailableSpots = newCapacity - bookedSpots; // 125

if (newAvailableSpots > maxAvailableSpots) {
  return error(
    `Available spots cannot exceed ${maxAvailableSpots} ` +
    `(${bookedSpots} spots already booked)`
  );
}
```

**Why?**
- Maintains booking integrity
- Prevents logical inconsistencies
- Gives admin control with constraints

### Example 3: Deletion Protection

**Problem**: Can we delete an event with bookings?

**Simple Approach**:
```typescript
// ❌ Just delete it
await query('DELETE FROM events WHERE id = $1', [eventId]);
```

**Safe Approach**:
```typescript
// ✅ Check for active bookings
const bookingsCount = await query(
  `SELECT COUNT(*) as count FROM bookings 
   WHERE event_id = $1 AND status NOT IN ('cancelled')`,
  [eventId]
);

const count = parseInt(bookingsCount.rows[0]?.count || '0');

if (count > 0) {
  return new Response(
    JSON.stringify({
      error: `Cannot delete event with ${count} active booking(s). ` +
             `Cancel bookings first or unpublish the event.`,
    }),
    { status: 400 }
  );
}

// Safe to delete
await query('DELETE FROM events WHERE id = $1', [eventId]);
```

**Why?**
- Protects user data
- Prevents accidental data loss
- Suggests alternatives

### Example 4: Slug Uniqueness

**Create Event**:
```typescript
// Check ALL events
const exists = await query(
  'SELECT id FROM events WHERE slug = $1',
  [slug]
);

if (exists.rows.length > 0) {
  return error('Slug already exists');
}
```

**Update Event**:
```typescript
// Check all events EXCEPT current
const exists = await query(
  'SELECT id FROM events WHERE slug = $1 AND id != $2',
  [slug, eventId]
);

if (exists.rows.length > 0) {
  return error('Slug already exists');
}
```

**Why Different?**
- Allow keeping same slug during update
- Prevent conflicts with other events

---

## 5. Authentication & Authorization {#auth}

### Two-Level Security

1. **Authentication**: Who are you?
2. **Authorization**: What can you do?

### Authentication Check

```typescript
import { getSessionFromRequest } from '@/lib/auth/session';

const session = await getSessionFromRequest(cookies);

if (!session) {
  return new Response(
    JSON.stringify({ error: 'Authentication required' }),
    { 
      status: 401, // Unauthorized
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// User is authenticated
const userId = session.userId;
```

**Status Code**: `401 Unauthorized` - "You need to log in"

### Authorization Check

```typescript
// After authentication
if (session.role !== 'admin') {
  return new Response(
    JSON.stringify({ error: 'Admin access required' }),
    { 
      status: 403, // Forbidden
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// User is admin
```

**Status Code**: `403 Forbidden` - "You don't have permission"

### Helper Function Pattern

```typescript
async function checkAdminAuth(cookies: any): Promise<string> {
  const session = await getSessionFromRequest(cookies);
  
  if (!session) {
    throw new ValidationError('Authentication required');
  }

  if (session.role !== 'admin') {
    throw new ValidationError('Admin access required');
  }

  return session.userId;
}

// Usage in endpoints
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const userId = await checkAdminAuth(cookies);
    
    // User is authenticated AND authorized
    
  } catch (error) {
    // Handle auth errors
  }
};
```

**Benefits**:
- DRY (Don't Repeat Yourself)
- Consistent checks across endpoints
- Easy to modify auth logic

---

## 6. Error Handling Patterns {#error-handling}

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation errors, business logic violations |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized (wrong role) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate key, constraint violation |
| 500 | Internal Server Error | Unexpected errors |

### Custom Error Classes

```typescript
// src/lib/errors.ts

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
```

### Error Handling Pattern

```typescript
export const PUT: APIRoute = async ({ request, params, cookies }) => {
  try {
    // Authentication
    await checkAdminAuth(cookies);
    
    // Get resource
    const event = await getEventById(params.id);
    
    // Validate input
    const data = validateData(await request.json());
    
    // Business logic
    await updateEvent(params.id, data);
    
    // Success response
    return new Response(
      JSON.stringify({ success: true, data: event }),
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error updating event:', error);

    // Handle specific error types
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 404 }
      );
    }

    if (error instanceof ValidationError || error instanceof ConflictError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400 }
      );
    }

    // Generic error (unexpected)
    return new Response(
      JSON.stringify({
        error: 'Failed to update event',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
};
```

### Database Constraint Errors

```typescript
try {
  await query(
    'INSERT INTO events (slug, ...) VALUES ($1, ...)',
    [slug, ...]
  );
} catch (error) {
  // PostgreSQL unique violation
  if ((error as any).code === '23505') {
    return new Response(
      JSON.stringify({ error: 'Slug already exists' }),
      { status: 409 }
    );
  }
  
  // Other database errors
  throw error;
}
```

**Common PostgreSQL Codes**:
- `23505` - Unique constraint violation
- `23503` - Foreign key violation
- `23514` - Check constraint violation

---

## 7. Database Operations {#database}

### Parameterized Queries

**❌ Never Do This**:
```typescript
// SQL Injection vulnerability!
const result = await query(
  `SELECT * FROM events WHERE title = '${userInput}'`
);
```

**✅ Always Do This**:
```typescript
// Safe - parameterized query
const result = await query(
  'SELECT * FROM events WHERE title = $1',
  [userInput]
);
```

**Why?**
- Prevents SQL injection
- Better performance (query plan caching)
- Automatic type conversion

### INSERT Operations

```typescript
const result = await query(
  `INSERT INTO events (
    title, slug, description, price, event_date,
    venue_name, venue_city, capacity, available_spots
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING *`,
  [
    data.title,
    data.slug,
    data.description,
    data.price,
    data.event_date,
    data.venue_name,
    data.venue_city,
    data.capacity,
    data.available_spots,
  ]
);

const newEvent = result.rows[0];
```

**Key Points**:
- `RETURNING *` gets the inserted row (with generated ID, timestamps)
- Ordered parameters match $1, $2, etc.

### UPDATE Operations

```typescript
const result = await query(
  `UPDATE events SET
    title = $1,
    price = $2,
    capacity = $3,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = $4
  RETURNING *`,
  [data.title, data.price, data.capacity, eventId]
);

const updatedEvent = result.rows[0];
```

**Key Points**:
- Always update `updated_at` timestamp
- Use `RETURNING *` to get updated row
- WHERE clause prevents updating all rows

### DELETE Operations

```typescript
await query(
  'DELETE FROM events WHERE id = $1',
  [eventId]
);
```

**Note**: No RETURNING needed for DELETE (unless you want the deleted row)

### Complex Queries with Aggregations

```typescript
const result = await query(
  `SELECT 
    e.*,
    (e.capacity - e.available_spots) as booked_spots,
    COUNT(b.id) as bookings_count
  FROM events e
  LEFT JOIN bookings b ON e.id = b.event_id 
    AND b.status NOT IN ('cancelled')
  WHERE e.is_published = $1
  GROUP BY e.id
  ORDER BY e.event_date DESC`,
  [true]
);

const events = result.rows;
```

**Features**:
- Computed fields (`booked_spots`)
- Aggregations (`COUNT`)
- Joins (LEFT JOIN for optional relations)
- Filtering in JOIN condition
- Grouping (required with aggregations)

---

## 8. Testing REST APIs {#testing}

### Test Structure

```typescript
describe('POST /api/admin/events - Create Event', () => {
  it('should validate required fields', () => {
    // Test validation logic
  });

  it('should reject invalid data', () => {
    // Test error cases
  });

  it('should create event with valid data', () => {
    // Test success case
  });
});
```

### What to Test

1. **Validation Tests**
   - Required fields
   - Field lengths
   - Format validation (regex, URLs)
   - Range validation (min/max)
   - Cross-field validation

2. **Business Logic Tests**
   - Capacity constraints
   - Booking protection
   - Slug uniqueness
   - Date requirements

3. **Authorization Tests**
   - Require authentication
   - Require admin role
   - Reject non-admin users

4. **Edge Cases**
   - Minimum values
   - Maximum values
   - Boundary values
   - Null/undefined handling

5. **Error Handling Tests**
   - Not found errors
   - Validation errors
   - Conflict errors
   - Database errors

### Testing Pattern

```typescript
it('should prevent capacity reduction below existing bookings', () => {
  const currentCapacity = 50;
  const bookedSpots = 25;
  const newCapacity = 20; // Less than booked!

  const isValid = newCapacity >= bookedSpots;
  
  expect(isValid).toBe(false);
});
```

---

## 9. Best Practices {#best-practices}

### 1. Use HTTP Methods Correctly

```typescript
// ✅ Correct
GET    /api/events       // Read (safe, idempotent)
POST   /api/events       // Create (not idempotent)
PUT    /api/events/:id   // Update entire (idempotent)
PATCH  /api/events/:id   // Update partial (idempotent)
DELETE /api/events/:id   // Delete (idempotent)

// ❌ Wrong
POST /api/events/delete/:id  // Don't use POST for delete
GET  /api/events/create      // Don't use GET for mutations
```

### 2. Return Appropriate Status Codes

```typescript
// ✅ Correct
return new Response(JSON.stringify(data), { 
  status: 201  // Created (for POST)
});

// ❌ Wrong
return new Response(JSON.stringify(data), { 
  status: 200  // OK (for POST should be 201)
});
```

### 3. Consistent Response Format

```typescript
// ✅ Success format
{
  "success": true,
  "data": { ... }
}

// ✅ Error format
{
  "error": "Error message",
  "details": [ ... ]  // Optional validation errors
}
```

### 4. Validate All Input

```typescript
// ✅ Always validate
const validatedData = schema.safeParse(body);
if (!validatedData.success) {
  return validationError(validatedData.error);
}

// ❌ Never trust input
const data = await request.json();
await query('INSERT INTO events (...) VALUES (...)', [data]);
```

### 5. Use Helper Functions

```typescript
// ✅ DRY with helpers
async function checkAdminAuth(cookies) { ... }
async function getEventById(id) { ... }
async function checkSlugUniqueness(slug, excludeId) { ... }

// ❌ Duplicate code
// Repeating same auth check in every endpoint
```

### 6. Handle Errors Gracefully

```typescript
// ✅ Specific error messages
return error(`Cannot reduce capacity below ${bookedSpots} (existing bookings)`);

// ❌ Generic error messages
return error('Invalid capacity');
```

### 7. Log Errors (But Not Sensitive Data)

```typescript
// ✅ Good logging
console.error('Error creating event:', error.message);

// ❌ Too much info (security risk)
console.error('Error:', error, requestBody, authToken);
```

### 8. Use Transactions for Multiple Operations

```typescript
// ✅ Atomic operation
await transaction(async (client) => {
  await client.query('UPDATE events SET available_spots = available_spots - $1', [spots]);
  await client.query('INSERT INTO bookings (...) VALUES (...)', [...]);
});

// ❌ Risk of partial failure
await query('UPDATE events SET available_spots = available_spots - $1', [spots]);
await query('INSERT INTO bookings (...) VALUES (...)', [...]);
```

---

## 10. Common Pitfalls {#pitfalls}

### 1. Not Validating Existing State

**Problem**:
```typescript
// ❌ Just check new capacity
if (newCapacity < 1) {
  return error('Capacity must be at least 1');
}
```

**Solution**:
```typescript
// ✅ Check against existing bookings
const bookedSpots = oldCapacity - oldAvailableSpots;
if (newCapacity < bookedSpots) {
  return error(`Cannot reduce below ${bookedSpots} bookings`);
}
```

### 2. Forgetting to Check Uniqueness on Update

**Problem**:
```typescript
// ❌ Checks ALL events including current
const exists = await query(
  'SELECT id FROM events WHERE slug = $1',
  [slug]
);
```

**Solution**:
```typescript
// ✅ Exclude current event
const exists = await query(
  'SELECT id FROM events WHERE slug = $1 AND id != $2',
  [slug, eventId]
);
```

### 3. Not Using Transactions

**Problem**:
```typescript
// ❌ Two separate operations
await updateEvent(id, data);
await createAuditLog(id, 'updated');
// If second fails, first still happened!
```

**Solution**:
```typescript
// ✅ Atomic transaction
await transaction(async (client) => {
  await updateEvent(client, id, data);
  await createAuditLog(client, id, 'updated');
});
```

### 4. Returning Too Much Data

**Problem**:
```typescript
// ❌ Returns passwords, tokens, etc.
return new Response(JSON.stringify(user));
```

**Solution**:
```typescript
// ✅ Select only public fields
const { password, reset_token, ...publicUser } = user;
return new Response(JSON.stringify(publicUser));
```

### 5. Not Handling Database Errors

**Problem**:
```typescript
// ❌ Let database errors propagate
await query('INSERT INTO events ...', [data]);
```

**Solution**:
```typescript
// ✅ Catch and handle gracefully
try {
  await query('INSERT INTO events ...', [data]);
} catch (error) {
  if (error.code === '23505') {
    return error('Slug already exists');
  }
  throw error;
}
```

### 6. Inconsistent Error Responses

**Problem**:
```typescript
// ❌ Different formats
return { error: 'Not found' };
return { message: 'Invalid input' };
return { err: 'Server error' };
```

**Solution**:
```typescript
// ✅ Consistent format
return { error: 'Not found' };
return { error: 'Invalid input', details: [...] };
return { error: 'Server error', message: '...' };
```

---

## Summary

### Key Takeaways

1. **REST Principles**:
   - Resources identified by URIs
   - HTTP methods for operations
   - Status codes communicate meaning

2. **Validation**:
   - Always validate input (Zod)
   - Cross-field validation
   - Type-safe transformations

3. **Business Logic**:
   - Go beyond simple validation
   - Consider existing state
   - Protect data integrity

4. **Security**:
   - Authentication (who are you?)
   - Authorization (what can you do?)
   - Parameterized queries

5. **Error Handling**:
   - Appropriate status codes
   - Helpful error messages
   - Consistent response format

6. **Database**:
   - Parameterized queries always
   - Transactions for atomicity
   - Handle constraints gracefully

7. **Testing**:
   - Validation, logic, auth
   - Edge cases, errors
   - 100% coverage goal

### Practice Exercises

1. **Build a Blog API**:
   - POST /api/posts (create)
   - GET /api/posts (list with pagination)
   - PUT /api/posts/:id (update)
   - DELETE /api/posts/:id (delete)
   - Business logic: Can't delete posts with comments

2. **Add Comment System**:
   - POST /api/posts/:id/comments
   - GET /api/posts/:id/comments
   - DELETE /api/comments/:id (only author or admin)

3. **Implement Voting**:
   - POST /api/posts/:id/vote (upvote/downvote)
   - Business logic: One vote per user
   - Update post vote_count

### Further Reading

- MDN: HTTP Status Codes
- REST API Design Best Practices
- Zod Documentation
- PostgreSQL Error Codes
- Transaction Isolation Levels

---

**Remember**: A good API is:
- **Predictable**: Follows conventions
- **Validated**: Rejects bad input early
- **Secure**: Authenticates and authorizes
- **Resilient**: Handles errors gracefully
- **Well-tested**: High confidence in correctness
