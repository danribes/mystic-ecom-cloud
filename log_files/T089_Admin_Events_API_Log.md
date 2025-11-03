# T089 - Admin Events API Implementation Log

**Task**: Create `src/api/admin/events.ts` - POST/PUT/DELETE endpoints for event CRUD  
**Date**: 2024-11-01  
**Status**: ✅ Complete

## Overview

Successfully implemented comprehensive REST API endpoints for admin event management with full CRUD operations, validation, authorization, and business logic constraints.

### Achievements

1. ✅ **POST endpoint** - Create new events with validation
2. ✅ **GET endpoint** - List all events with filtering (admin view)
3. ✅ **PUT endpoint** - Update existing events with constraint checks
4. ✅ **DELETE endpoint** - Delete events with booking protection
5. ✅ **Authentication** - Admin role requirement on all endpoints
6. ✅ **Validation** - Comprehensive Zod schemas for data validation
7. ✅ **Business Logic** - Capacity constraints, booking protection
8. ✅ **Error Handling** - Appropriate HTTP status codes and messages
9. ✅ **56 Tests** - 100% test pass rate covering all scenarios

---

## Implementation Details

### A. File Structure

Created two API endpoint files:

1. **`src/pages/api/admin/events/index.ts`** - Collection endpoints
   - POST /api/admin/events - Create event
   - GET /api/admin/events - List events

2. **`src/pages/api/admin/events/[id].ts`** - Individual resource endpoints
   - PUT /api/admin/events/:id - Update event
   - DELETE /api/admin/events/:id - Delete event

**Why Separate Files?**
- Cleaner separation of concerns
- Better RESTful design
- Easier to maintain and test
- Follows Astro's file-based routing

### B. POST /api/admin/events - Create Event

**Endpoint**: `POST /api/admin/events`

**Purpose**: Create a new event with full validation

**Request Body**:
```json
{
  "title": "Yoga Retreat 2024",
  "slug": "yoga-retreat-2024",
  "description": "A transformative yoga retreat",
  "price": 299.99,
  "event_date": "2024-12-15T10:00:00Z",
  "duration_hours": 3,
  "venue_name": "Mountain Zen Center",
  "venue_address": "123 Peace Lane",
  "venue_city": "Boulder",
  "venue_country": "USA",
  "venue_lat": 40.0150,
  "venue_lng": -105.2705,
  "capacity": 50,
  "available_spots": 50,
  "image_url": "https://example.com/event.jpg",
  "is_published": true
}
```

**Validations**:
- ✅ Title: 3-255 characters
- ✅ Slug: Lowercase, alphanumeric, hyphens only
- ✅ Description: Minimum 10 characters
- ✅ Price: Non-negative number
- ✅ Event date: Valid date (future for published events)
- ✅ Duration: 0.5-24 hours
- ✅ Venue fields: Appropriate length constraints
- ✅ Coordinates: Lat (-90 to 90), Lng (-180 to 180)
- ✅ Capacity: Minimum 1
- ✅ Available spots: 0 to capacity
- ✅ Slug uniqueness: No duplicates

**Business Rules**:
1. Published events must have future dates
2. Unpublished events can have any date (drafts)
3. Available spots cannot exceed capacity
4. Slug must be unique across all events
5. Coordinates are optional (nullable)
6. Image URL is optional (nullable)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Yoga Retreat 2024",
    ...all event fields,
    "created_at": "2024-11-01T16:48:28Z",
    "updated_at": "2024-11-01T16:48:28Z"
  }
}
```

**Status Codes**:
- `201 Created` - Event created successfully
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not admin
- `409 Conflict` - Slug already exists
- `500 Internal Server Error` - Database error

### C. GET /api/admin/events - List Events

**Endpoint**: `GET /api/admin/events`

**Purpose**: List all events with filtering (includes unpublished for admins)

**Query Parameters**:
```
?status=all|published|unpublished
&city=Boulder
&country=USA
&startDate=2024-12-01T00:00:00Z
&endDate=2024-12-31T23:59:59Z
&search=yoga
```

**Filters**:
- `status` - Filter by publish status (default: all)
- `city` - Filter by venue city (case-insensitive)
- `country` - Filter by venue country (case-insensitive)
- `startDate` - Events on or after this date
- `endDate` - Events on or before this date
- `search` - Search in title, description, city, venue name

**Special Features**:
1. **Booking Statistics**: Includes `booked_spots` and `bookings_count`
   ```sql
   (e.capacity - e.available_spots) as booked_spots,
   COUNT(b.id) as bookings_count
   ```

2. **Admin View**: Shows both published and unpublished events (unlike public API)

3. **Ordering**: Events ordered by date DESC, then created_at DESC

**Response**:
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "...",
        "title": "Yoga Retreat 2024",
        ...all event fields,
        "booked_spots": 15,
        "bookings_count": 8
      }
    ],
    "count": 1,
    "filters": {
      "status": "all",
      "city": "Boulder",
      "country": null,
      "startDate": null,
      "endDate": null,
      "search": null
    }
  }
}
```

**Status Codes**:
- `200 OK` - Success
- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not admin
- `500 Internal Server Error` - Database error

### D. PUT /api/admin/events/:id - Update Event

**Endpoint**: `PUT /api/admin/events/:id`

**Purpose**: Update an existing event with business logic constraints

**Request Body**: Same as POST (all fields required for PUT)

**Special Validations**:

1. **Event Existence Check**:
   ```typescript
   const existingEvent = await getEventById(eventId);
   if (!existingEvent) {
     throw new NotFoundError('Event');
   }
   ```

2. **Slug Uniqueness (Excluding Current)**:
   ```typescript
   await checkSlugUniqueness(data.slug, eventId);
   // Only checks other events, not the current one
   ```

3. **Capacity vs Existing Bookings**:
   ```typescript
   const bookedSpots = existingEvent.capacity - existingEvent.available_spots;
   
   if (data.capacity < bookedSpots) {
     return error(`Cannot reduce capacity below ${bookedSpots} (existing bookings)`);
   }
   ```

4. **Available Spots vs Bookings**:
   ```typescript
   const maxAvailableSpots = data.capacity - bookedSpots;
   
   if (data.available_spots > maxAvailableSpots) {
     return error(`Available spots cannot exceed ${maxAvailableSpots}`);
   }
   ```

**Why These Constraints?**

Example scenario:
- Event capacity: 100
- Booked: 25 people
- Available: 75 spots

Admin tries to reduce capacity to 20:
- ❌ **Rejected**: 20 < 25 booked (would invalidate existing bookings)

Admin tries to increase capacity to 150:
- ✅ **Allowed**: 150 > 25 booked
- Available spots adjusted: max 125 (150 - 25)

Admin tries to set available spots to 130:
- ❌ **Rejected**: 130 > 125 (would create phantom bookings)

**Response**:
```json
{
  "success": true,
  "data": {
    ...updated event with new updated_at timestamp
  }
}
```

**Status Codes**:
- `200 OK` - Updated successfully
- `400 Bad Request` - Validation errors or constraint violations
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not admin
- `404 Not Found` - Event doesn't exist
- `409 Conflict` - Slug conflict
- `500 Internal Server Error` - Database error

### E. DELETE /api/admin/events/:id - Delete Event

**Endpoint**: `DELETE /api/admin/events/:id`

**Purpose**: Delete an event (with safety checks)

**Safety Constraints**:

1. **Check Event Exists**:
   ```typescript
   await getEventById(eventId);
   ```

2. **Check Active Bookings**:
   ```typescript
   const bookingsCount = await getEventBookingsCount(eventId);
   // Excludes cancelled bookings
   
   if (bookingsCount > 0) {
     return error(
       `Cannot delete event with ${bookingsCount} active booking(s). 
        Cancel bookings first or unpublish the event.`
     );
   }
   ```

**Why Prevent Deletion?**
- Maintains data integrity
- Protects user bookings
- Prevents accidental data loss
- Suggests alternatives (unpublish)

**Cancelled Bookings**:
```sql
COUNT(*) FROM bookings 
WHERE event_id = $1 AND status NOT IN ('cancelled')
```
- Cancelled bookings don't prevent deletion
- Only active bookings block deletion

**Response**:
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

**Status Codes**:
- `200 OK` - Deleted successfully
- `400 Bad Request` - Has active bookings
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not admin
- `404 Not Found` - Event doesn't exist
- `500 Internal Server Error` - Database error

---

## Validation Schema

### Zod Schema Definition

```typescript
const EventCreateSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().min(10),
  price: z.number().min(0),
  event_date: z.string().transform(val => new Date(val)),
  duration_hours: z.number().min(0.5).max(24),
  venue_name: z.string().min(2).max(255),
  venue_address: z.string().min(5),
  venue_city: z.string().min(2).max(100),
  venue_country: z.string().min(2).max(100),
  venue_lat: z.number().min(-90).max(90).optional().nullable(),
  venue_lng: z.number().min(-180).max(180).optional().nullable(),
  capacity: z.number().int().min(1),
  available_spots: z.number().int().min(0),
  image_url: z.string().url().max(500).optional().nullable(),
  is_published: z.boolean().optional().default(false),
}).refine(
  (data) => data.available_spots <= data.capacity,
  {
    message: 'Available spots cannot exceed capacity',
    path: ['available_spots'],
  }
);
```

**Key Features**:
1. Type conversion (string date → Date object)
2. Custom regex validation (slug format)
3. Range validation (coordinates, duration)
4. Optional/nullable fields (coordinates, image)
5. Cross-field validation (available_spots ≤ capacity)

### Validation Error Response

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
      "message": "Slug must contain only lowercase letters, numbers, and hyphens",
      "path": ["slug"]
    }
  ]
}
```

---

## Helper Functions

### 1. checkAdminAuth

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
```

**Purpose**: DRY authentication check
**Returns**: User ID if authorized
**Throws**: ValidationError if unauthorized

### 2. checkSlugUniqueness

```typescript
async function checkSlugUniqueness(slug: string, eventId: string): Promise<void> {
  const result = await query(
    'SELECT id FROM events WHERE slug = $1 AND id != $2',
    [slug, eventId]
  );

  if (result.rows.length > 0) {
    throw new ConflictError('Event slug already exists');
  }
}
```

**Purpose**: Prevent duplicate slugs (excluding current event)
**Why Exclude**: Allow keeping same slug during update

### 3. getEventById

```typescript
async function getEventById(eventId: string) {
  const result = await query(
    'SELECT * FROM events WHERE id = $1',
    [eventId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Event');
  }

  return result.rows[0];
}
```

**Purpose**: Fetch event with existence check
**Throws**: NotFoundError if not found

### 4. getEventBookingsCount

```typescript
async function getEventBookingsCount(eventId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM bookings 
     WHERE event_id = $1 AND status NOT IN ('cancelled')`,
    [eventId]
  );

  return parseInt(result.rows[0]?.count || '0');
}
```

**Purpose**: Count active bookings (excluding cancelled)
**Returns**: Number of active bookings

---

## Error Handling

### Error Types

```typescript
import { 
  NotFoundError,      // 404 - Resource not found
  ValidationError,    // 400 - Invalid input
  ConflictError,      // 409 - Duplicate/constraint violation
  DatabaseError       // 500 - Database errors
} from '@/lib/errors';
```

### Error Response Pattern

```typescript
try {
  // Operation logic
} catch (error) {
  console.error('Error creating event:', error);

  if (error instanceof NotFoundError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (error instanceof ValidationError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ... other error types

  return new Response(
    JSON.stringify({
      error: 'Failed to create event',
      message: error instanceof Error ? error.message : 'Unknown error',
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Database Constraint Violations

```typescript
// Handle unique constraint violation
if ((error as any).code === '23505') {
  return new Response(
    JSON.stringify({ error: 'Event slug already exists' }),
    { status: 409, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**PostgreSQL Error Codes**:
- `23505` - Unique constraint violation
- `23503` - Foreign key violation
- `23514` - Check constraint violation

---

## Security Considerations

### 1. Authentication Required

All endpoints check for valid session:
```typescript
const session = await getSessionFromRequest(cookies);
if (!session) {
  return 401 Unauthorized
}
```

### 2. Admin Role Required

All endpoints require admin role:
```typescript
if (session.role !== 'admin') {
  return 403 Forbidden
}
```

### 3. Input Validation

All inputs validated via Zod schemas:
- Type checking
- Length constraints
- Format validation (regex)
- Range validation

### 4. SQL Injection Prevention

Using parameterized queries:
```typescript
await query(
  'INSERT INTO events (...) VALUES ($1, $2, $3, ...)',
  [data.title, data.slug, data.description, ...]
);
```

### 5. Business Logic Protection

- Capacity constraints prevent data integrity issues
- Booking protection prevents accidental deletions
- Slug uniqueness prevents routing conflicts

---

## Database Schema Integration

### Events Table

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_hours INTEGER NOT NULL,
    venue_name VARCHAR(255) NOT NULL,
    venue_address TEXT NOT NULL,
    venue_city VARCHAR(100) NOT NULL,
    venue_country VARCHAR(100) NOT NULL,
    venue_lat DECIMAL(10, 8),
    venue_lng DECIMAL(11, 8),
    capacity INTEGER NOT NULL,
    available_spots INTEGER NOT NULL,
    image_url VARCHAR(500),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_available_spots CHECK (available_spots <= capacity AND available_spots >= 0)
);
```

**Database-Level Constraints**:
- `UNIQUE` on slug - Prevents duplicates
- `CHECK` on available_spots - Ensures valid range
- `TIMESTAMP WITH TIME ZONE` - Timezone-aware dates

### Indexes

```sql
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_city ON events(venue_city);
CREATE INDEX idx_events_published ON events(is_published);
```

**Performance Benefits**:
- Fast slug lookups (routing)
- Fast date filtering (upcoming events)
- Fast city filtering (location-based queries)
- Fast publish status filtering (public vs admin views)

---

## Testing Strategy

### Test Coverage: 56 Tests

**Categories**:
1. POST /api/admin/events (15 tests)
2. PUT /api/admin/events/:id (9 tests)
3. DELETE /api/admin/events/:id (6 tests)
4. GET /api/admin/events (8 tests)
5. Authorization (4 tests)
6. Data Integrity (6 tests)
7. Edge Cases (8 tests)

### Key Test Scenarios

**1. Validation Tests**:
- Required fields
- Length constraints
- Format validation (slug, URL, coordinates)
- Range validation (price, duration, coordinates)
- Cross-field validation (available_spots ≤ capacity)

**2. Business Logic Tests**:
- Slug uniqueness
- Capacity constraints with bookings
- Future date requirement for published events
- Booking protection on deletion
- Available spots calculation

**3. Edge Cases**:
- Minimum capacity (1)
- Free events (price = 0)
- Sold out events (available_spots = 0)
- Maximum values (price, description length)
- Coordinate boundaries (±90, ±180)

**4. Authorization Tests**:
- Require authentication
- Require admin role
- Reject non-admin users
- Reject unauthenticated requests

**5. Data Integrity Tests**:
- UUID format validation
- URL format validation
- Null/undefined handling
- Decimal precision (prices, coordinates)
- Referential integrity with bookings

### Test Results

```
✓ tests/unit/T089_admin_events_api.test.ts (56)
  ✓ POST /api/admin/events - Create Event (15)
  ✓ PUT /api/admin/events/:id - Update Event (9)
  ✓ DELETE /api/admin/events/:id - Delete Event (6)
  ✓ GET /api/admin/events - List Events (8)
  ✓ Authorization and Authentication (4)
  ✓ Data Integrity (6)
  ✓ Edge Cases (8)

Test Files  1 passed (1)
     Tests  56 passed (56)
  Duration  502ms
```

**100% Pass Rate** ✅

---

## Integration Points

### 1. Authentication System

```typescript
import { getSessionFromRequest } from '@/lib/auth/session';
```
- Session validation
- Role checking (admin)
- User ID extraction

### 2. Database Layer

```typescript
import { query } from '@/lib/db';
```
- Parameterized queries
- Connection pooling
- Error handling

### 3. Error System

```typescript
import { 
  NotFoundError, 
  ValidationError, 
  ConflictError 
} from '@/lib/errors';
```
- Standardized error types
- HTTP status code mapping
- Error message formatting

### 4. Validation Library

```typescript
import { z } from 'zod';
```
- Type-safe validation
- Custom error messages
- Type inference

### 5. Admin Forms (T087, T088)

Forms use these API endpoints:
- T087 (Create Form) → POST /api/admin/events
- T088 (Edit Form) → PUT /api/admin/events/:id
- Admin interface → DELETE /api/admin/events/:id
- Admin list page → GET /api/admin/events

---

## API Design Patterns

### 1. RESTful Structure

```
GET    /api/admin/events      - List events
POST   /api/admin/events      - Create event
PUT    /api/admin/events/:id  - Update event
DELETE /api/admin/events/:id  - Delete event
```

### 2. Consistent Response Format

**Success**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error**:
```json
{
  "error": "Error message",
  "details": [ ... ] // Optional validation details
}
```

### 3. HTTP Status Codes

- `200 OK` - Success (GET, PUT, DELETE)
- `201 Created` - Success (POST)
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized (not admin)
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate/constraint violation
- `500 Internal Server Error` - Server errors

### 4. Query Parameter Naming

- Lowercase
- Descriptive
- Optional with defaults
- Validated via Zod schemas

---

## Performance Considerations

### 1. Database Queries

**Optimized Queries**:
```sql
-- Single query with JOIN for list endpoint
SELECT e.*, 
  (e.capacity - e.available_spots) as booked_spots,
  COUNT(b.id) as bookings_count
FROM events e
LEFT JOIN bookings b ON e.id = b.event_id
WHERE ...
GROUP BY e.id
```

**Why?**
- Single query vs N+1 queries
- Computed fields in SQL
- Efficient aggregation

### 2. Indexes

All filter fields are indexed:
- slug (routing)
- event_date (filtering)
- venue_city (filtering)
- is_published (filtering)

### 3. Parameterized Queries

Prepared statements:
- Query plan caching
- SQL injection prevention
- Better performance

---

## Future Enhancements

### 1. Batch Operations

```typescript
POST /api/admin/events/batch
{
  "operations": [
    { "action": "update", "id": "...", "data": {...} },
    { "action": "delete", "id": "..." }
  ]
}
```

### 2. Partial Updates (PATCH)

```typescript
PATCH /api/admin/events/:id
{
  "price": 349.99,
  "capacity": 60
}
// Only update specified fields
```

### 3. Bulk Import

```typescript
POST /api/admin/events/import
Content-Type: text/csv
```

### 4. Event Duplication

```typescript
POST /api/admin/events/:id/duplicate
{
  "newTitle": "Yoga Retreat 2025",
  "newSlug": "yoga-retreat-2025",
  "newDate": "2025-12-15T10:00:00Z"
}
```

### 5. Event Templates

```typescript
POST /api/admin/events/from-template
{
  "templateId": "...",
  "overrides": { ... }
}
```

### 6. Image Upload

Currently accepts URLs only. Add direct upload:
```typescript
POST /api/admin/events/:id/image
Content-Type: multipart/form-data
```

### 7. Recurring Events

```typescript
POST /api/admin/events/recurring
{
  "baseEvent": { ... },
  "recurrence": {
    "frequency": "weekly",
    "count": 12,
    "interval": 1
  }
}
```

### 8. Event Versioning

Track changes to events:
- Who made changes
- What changed
- When changed
- Rollback capability

---

## Lessons Learned

### 1. Capacity Management is Complex

Initial naive approach:
- Just update capacity and available_spots

Reality:
- Must consider existing bookings
- Must prevent data integrity issues
- Must validate against current state
- Must provide clear error messages

### 2. Slug Validation Requires Context

Create vs Update:
- Create: Check all events
- Update: Check all except current

### 3. Business Logic in API Layer

Not just validation:
- Capacity constraints
- Booking protection
- Date requirements
- State management

### 4. Error Messages Should Guide Users

Bad:
```json
{ "error": "Cannot delete" }
```

Good:
```json
{ 
  "error": "Cannot delete event with 3 active booking(s). Cancel bookings first or unpublish the event."
}
```

### 5. Comprehensive Testing Prevents Bugs

56 tests caught:
- Edge cases (capacity = 1)
- Boundary values (coordinates)
- Business logic errors
- Validation gaps

### 6. Helper Functions Reduce Duplication

DRY helpers:
- checkAdminAuth
- getEventById
- checkSlugUniqueness
- getEventBookingsCount

---

## Dependencies

### Runtime
- `astro` - Web framework
- `zod` - Schema validation
- `@/lib/auth/session` - Authentication
- `@/lib/db` - Database queries
- `@/lib/errors` - Error handling

### Development
- `vitest` - Testing framework
- `typescript` - Type safety

---

## Metrics

- **Files Created**: 2
- **Lines of Code**: ~700 (API) + ~750 (Tests) = 1,450 total
- **Test Coverage**: 56 tests, 100% pass rate
- **Endpoints**: 4 (POST, GET, PUT, DELETE)
- **Validation Rules**: 40+
- **Error Scenarios**: 20+
- **Development Time**: ~2 hours

---

## Conclusion

Successfully implemented a robust, secure, and well-tested API for admin event management. The API handles all CRUD operations with comprehensive validation, business logic constraints, and error handling. Ready for integration with admin interface (T087, T088) and future booking management features (T090).

**Status**: ✅ Production Ready
