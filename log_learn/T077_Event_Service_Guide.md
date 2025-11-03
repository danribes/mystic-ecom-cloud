# Learning Guide: Building Event Service with Transaction Safety

## 📚 Overview

This guide explains how to build a robust event booking service with proper transaction handling, race condition prevention, and comprehensive error management. You'll learn essential patterns for building reliable services that handle concurrent users and critical business operations.

## 🎯 What You'll Learn

1. Database transactions and why they matter
2. Row-level locking for race condition prevention
3. Capacity management in booking systems
4. Error handling patterns
5. Testing concurrent operations
6. TypeScript service design patterns
7. Query optimization techniques

---

## Part 1: Understanding Database Transactions

### What is a Transaction?

A **transaction** is a sequence of database operations that execute as a single unit. Either all operations succeed (COMMIT) or all fail (ROLLBACK).

### The ACID Properties

Transactions provide **ACID** guarantees:

**Atomicity:** All-or-nothing execution
```typescript
// Both operations succeed or both fail
BEGIN TRANSACTION
  INSERT INTO bookings (...)  -- Operation 1
  UPDATE events SET available_spots = ... -- Operation 2
COMMIT
```

**Consistency:** Database moves from one valid state to another
```typescript
// Constraint is always maintained
CHECK (available_spots <= capacity AND available_spots >= 0)
```

**Isolation:** Concurrent transactions don't interfere
```typescript
// Transaction A and B run simultaneously without conflicts
Transaction A: Book 3 spots for Event X
Transaction B: Book 2 spots for Event X
// Database ensures correct final state
```

**Durability:** Committed changes persist even after crashes
```typescript
// After COMMIT, data is safely stored
```

### When to Use Transactions

✅ **Use transactions when:**
- Multiple tables need coordinated updates
- Inventory/capacity management
- Financial operations
- Order processing
- Any operation where partial completion would corrupt data

❌ **Don't need transactions for:**
- Simple read operations
- Single INSERT/UPDATE/DELETE operations
- Operations where partial completion is acceptable

### Transaction Implementation in Node.js

**Basic Pattern:**
```typescript
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await getClient();  // Get connection from pool

  try {
    await client.query('BEGIN');      // Start transaction
    const result = await callback(client);  // Execute operations
    await client.query('COMMIT');     // Commit if successful
    return result;
  } catch (error) {
    await client.query('ROLLBACK');   // Rollback on error
    throw error;
  } finally {
    client.release();                 // Always release connection
  }
}
```

**Usage Example:**
```typescript
const booking = await transaction(async (client) => {
  // All queries use same client (connection)
  const event = await client.query('SELECT ... FOR UPDATE');
  const booking = await client.query('INSERT INTO bookings ...');
  await client.query('UPDATE events SET available_spots ...');
  return booking;
});
```

---

## Part 2: Row-Level Locking

### The Overbooking Problem

**Scenario:** Event has 1 spot remaining

```
Time    User A                  User B
0ms     SELECT available_spots  
        (sees 1 spot)           
1ms                             SELECT available_spots
                                (also sees 1 spot)
2ms     INSERT booking          
        (books the spot)        
3ms                             INSERT booking
                                (also books the spot!)
4ms     UPDATE (spots = 0)      
5ms                             UPDATE (spots = -1) ❌ OVERBOOKING!
```

### Solution: SELECT ... FOR UPDATE

**Row-level locking** prevents concurrent modifications:

```typescript
const eventResult = await client.query(
  `SELECT available_spots, capacity 
   FROM events 
   WHERE id = $1 
   FOR UPDATE`,  // 🔒 Lock this row
  [eventId]
);
```

**How it works:**

```
Time    User A                      User B
0ms     SELECT ... FOR UPDATE 🔒
        (locks the row)             
1ms                                 SELECT ... FOR UPDATE
                                    (waits... ⏳)
2ms     Check capacity OK           
3ms     INSERT booking              
4ms     UPDATE available_spots      
5ms     COMMIT (releases lock) 🔓   
6ms                                 (lock acquired, continues)
7ms                                 Check capacity FAIL
8ms                                 ROLLBACK
```

### Lock Levels

**`FOR UPDATE`** - Exclusive lock for updates
```sql
SELECT * FROM events WHERE id = $1 FOR UPDATE;
-- Blocks all other locks
```

**`FOR SHARE`** - Shared lock for reads
```sql
SELECT * FROM events WHERE id = $1 FOR SHARE;
-- Allows other shares, blocks updates
```

**`FOR UPDATE NOWAIT`** - Fail immediately if locked
```sql
SELECT * FROM events WHERE id = $1 FOR UPDATE NOWAIT;
-- Throws error if row is locked
```

**`FOR UPDATE SKIP LOCKED`** - Skip locked rows
```sql
SELECT * FROM queue WHERE status = 'pending'
FOR UPDATE SKIP LOCKED LIMIT 1;
-- Useful for job queues
```

### Lock Scope

```typescript
BEGIN TRANSACTION
  -- Lock multiple rows
  SELECT * FROM events 
  WHERE event_date > NOW() 
  FOR UPDATE;
  
  -- Lock specific row
  SELECT * FROM bookings 
  WHERE id = $1 
  FOR UPDATE;
COMMIT
```

---

## Part 3: Capacity Management Patterns

### Pessimistic Locking (Recommended for Critical Operations)

```typescript
async function bookEvent(userId: string, eventId: string, attendees: number) {
  return await transaction(async (client) => {
    // 1. Lock and check capacity
    const event = await client.query(
      'SELECT capacity, available_spots FROM events WHERE id = $1 FOR UPDATE',
      [eventId]
    );
    
    if (event.rows[0].available_spots < attendees) {
      throw new ConflictError('Insufficient capacity');
    }
    
    // 2. Create booking
    await client.query(
      'INSERT INTO bookings (user_id, event_id, attendees) VALUES ($1, $2, $3)',
      [userId, eventId, attendees]
    );
    
    // 3. Update available spots
    await client.query(
      'UPDATE events SET available_spots = available_spots - $1 WHERE id = $2',
      [attendees, eventId]
    );
  });
}
```

### Optimistic Locking (For Less Critical Operations)

```typescript
async function bookEvent(userId: string, eventId: string, attendees: number) {
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Read current version
      const event = await query('SELECT * FROM events WHERE id = $1', [eventId]);
      const currentVersion = event.rows[0].version;
      
      // Try to update with version check
      const result = await query(
        `UPDATE events 
         SET available_spots = available_spots - $1,
             version = version + 1
         WHERE id = $2 AND version = $3
         RETURNING *`,
        [attendees, eventId, currentVersion]
      );
      
      if (result.rowCount === 0) {
        // Version mismatch - someone else modified it
        continue;  // Retry
      }
      
      // Success!
      return result.rows[0];
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
    }
  }
}
```

### Database Constraints as Safety Net

```sql
CREATE TABLE events (
  capacity INTEGER NOT NULL,
  available_spots INTEGER NOT NULL,
  -- Constraint ensures spots never exceed capacity or go negative
  CONSTRAINT check_available_spots 
    CHECK (available_spots <= capacity AND available_spots >= 0)
);
```

Even if application logic fails, database prevents invalid states.

---

## Part 4: Error Handling Patterns

### Custom Error Classes

```typescript
// Base error class
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}
```

### Error Handling in Services

```typescript
export async function bookEvent(...) {
  // Input validation
  if (!userId || !eventId) {
    throw new ValidationError('User ID and Event ID are required');
  }
  
  if (attendees < 1) {
    throw new ValidationError('Attendees must be at least 1');
  }
  
  try {
    return await transaction(async (client) => {
      const event = await client.query(...);
      
      // Business rule validation
      if (!event.rows[0]) {
        throw new NotFoundError('Event');
      }
      
      if (!event.rows[0].is_published) {
        throw new ValidationError('Event is not available for booking');
      }
      
      if (event.rows[0].available_spots < attendees) {
        throw new ConflictError('Insufficient capacity');
      }
      
      // ... perform booking
    });
  } catch (error) {
    // Check for database-specific errors
    if (error.code === '23505') {  // Unique constraint violation
      throw new ConflictError('You already have a booking for this event');
    }
    
    // Re-throw known errors
    if (error instanceof AppError) {
      throw error;
    }
    
    // Log and wrap unexpected errors
    console.error('[Events] Unexpected error:', error);
    throw new DatabaseError('Failed to create booking');
  }
}
```

### Using Errors in API Routes

```typescript
export async function POST({ request }: APIContext) {
  try {
    const booking = await bookEvent(userId, eventId, attendees);
    return new Response(JSON.stringify(booking), { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400
      });
    }
    
    if (error instanceof ConflictError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 409
      });
    }
    
    // Unknown error - don't expose details
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500
    });
  }
}
```

---

## Part 5: Testing Concurrent Operations

### Why Test Concurrency?

Real users don't wait their turn. Multiple users will:
- Book the last spot simultaneously
- Update the same record concurrently
- Execute operations in unpredictable order

### Testing Race Conditions

```typescript
it('should handle concurrent bookings correctly', async () => {
  // Setup: Event with only 5 spots
  await pool.query(
    'UPDATE events SET available_spots = 5 WHERE id = $1',
    [testEventId]
  );
  
  // Create second user
  const user2 = await createTestUser('user2@example.com');
  
  // Try to book simultaneously
  const bookings = await Promise.allSettled([
    bookEvent(user1Id, testEventId, 3),  // User 1: 3 spots
    bookEvent(user2Id, testEventId, 3),  // User 2: 3 spots (total: 6 > 5)
  ]);
  
  // Verify results
  const successful = bookings.filter(b => b.status === 'fulfilled');
  const failed = bookings.filter(b => b.status === 'rejected');
  
  expect(successful.length).toBe(1);  // Only 1 should succeed
  expect(failed.length).toBe(1);      // 1 should fail
  
  // Verify final state
  const event = await pool.query(
    'SELECT available_spots FROM events WHERE id = $1',
    [testEventId]
  );
  expect(event.rows[0].available_spots).toBe(2);  // 5 - 3 = 2
});
```

### Using Promise.allSettled vs Promise.all

**`Promise.all`** - Fails fast if any promise rejects
```typescript
// If any booking fails, entire operation fails
const bookings = await Promise.all([
  bookEvent(user1, event),
  bookEvent(user2, event),
]);
// You never see which ones succeeded
```

**`Promise.allSettled`** - Waits for all promises
```typescript
// All promises complete (success or failure)
const results = await Promise.allSettled([
  bookEvent(user1, event),
  bookEvent(user2, event),
]);

// results[0] = { status: 'fulfilled', value: booking }
// results[1] = { status: 'rejected', reason: error }

// You can inspect each result
const successful = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');
```

### Load Testing with Multiple Concurrent Users

```typescript
it('should handle many concurrent users', async () => {
  const numUsers = 20;
  const spotsPerBooking = 1;
  const totalCapacity = 10;
  
  // Create many users
  const users = await Promise.all(
    Array.from({ length: numUsers }, (_, i) =>
      createTestUser(`user${i}@example.com`)
    )
  );
  
  // All try to book simultaneously
  const results = await Promise.allSettled(
    users.map(user => bookEvent(user.id, eventId, spotsPerBooking))
  );
  
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failCount = results.filter(r => r.status === 'rejected').length;
  
  // Exactly 10 should succeed (capacity = 10)
  expect(successCount).toBe(totalCapacity);
  expect(failCount).toBe(numUsers - totalCapacity);
  
  // Final spots should be 0
  const event = await getEventById(eventId);
  expect(event.available_spots).toBe(0);
});
```

---

## Part 6: TypeScript Service Design Patterns

### Type Definitions

```typescript
// Domain types
export interface Event {
  id: string;
  title: string;
  slug: string;
  // ... other fields
  capacity: number;
  available_spots: number;
}

// Input types
export interface EventFilters {
  city?: string;
  country?: string;
  startDate?: Date;
  endDate?: Date;
  isPublished?: boolean;
}

// Output types
export interface BookingResult {
  bookingId: string;
  eventId: string;
  userId: string;
  attendees: number;
  totalPrice: number;
  status: string;
}
```

### Function Signatures

```typescript
// Clear input/output types
export async function getEvents(
  filters?: EventFilters  // Optional filters
): Promise<Event[]> {     // Returns array of events
  // Implementation
}

// Default parameters
export async function bookEvent(
  userId: string,
  eventId: string,
  attendees: number = 1  // Default to 1 attendee
): Promise<BookingResult> {
  // Implementation
}
```

### Type Guards

```typescript
// Check UUID format
function isUUID(identifier: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    .test(identifier);
}

// Usage
export async function getEventById(identifier: string): Promise<Event> {
  const queryField = isUUID(identifier) ? 'id' : 'slug';
  const result = await query(
    `SELECT * FROM events WHERE ${queryField} = $1`,
    [identifier]
  );
  // ...
}
```

### Non-Null Assertions

```typescript
// After explicit check, use ! to assert non-null
const result = await query('SELECT * FROM events WHERE id = $1', [id]);

if (result.rows.length === 0) {
  throw new NotFoundError('Event');
}

// TypeScript knows rows[0] exists, but still types as potentially undefined
// Use ! after our check
return result.rows[0]!;  // Safe because we checked above
```

---

## Part 7: Query Optimization

### Dynamic Query Building

```typescript
export async function getEvents(filters?: EventFilters): Promise<Event[]> {
  let queryText = 'SELECT * FROM events WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;
  
  // Add filters dynamically
  if (filters?.city) {
    queryText += ` AND LOWER(venue_city) = LOWER($${paramIndex})`;
    params.push(filters.city);
    paramIndex++;
  }
  
  if (filters?.startDate) {
    queryText += ` AND event_date >= $${paramIndex}`;
    params.push(filters.startDate);
    paramIndex++;
  }
  
  // Add ordering
  queryText += ' ORDER BY event_date ASC';
  
  return await query(queryText, params);
}
```

### Parameterized Queries (Always!)

**❌ Never do this (SQL Injection vulnerability):**
```typescript
const result = await query(
  `SELECT * FROM events WHERE city = '${city}'`  // DANGEROUS!
);
```

**✅ Always use parameters:**
```typescript
const result = await query(
  'SELECT * FROM events WHERE city = $1',  // Safe
  [city]
);
```

### Selecting Only Needed Columns

**❌ Select everything:**
```typescript
SELECT * FROM events  // Returns all columns, even if unused
```

**✅ Select specific columns:**
```typescript
SELECT id, title, slug, price, event_date, available_spots
FROM events
-- Returns only what you need, faster query
```

### Indexing Strategy

```sql
-- Index on commonly filtered columns
CREATE INDEX idx_events_city ON events(venue_city);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_published ON events(is_published);

-- Composite index for common filter combinations
CREATE INDEX idx_events_city_date 
ON events(venue_city, event_date) 
WHERE is_published = true;
```

**Query benefits from index:**
```sql
SELECT * FROM events
WHERE venue_city = 'New York'  -- Uses idx_events_city
  AND event_date >= '2025-11-01'  -- Uses idx_events_date
  AND is_published = true;
```

---

## Part 8: Common Patterns and Best Practices

### Pattern 1: Service Layer Structure

```
src/
  lib/
    events.ts        # Business logic
    bookings.ts      # Related business logic
    db.ts            # Database utilities
    errors.ts        # Error classes
```

**Separation of Concerns:**
- Services: Business logic, validation
- Database layer: Connection management
- Errors: Standardized error handling
- API routes: HTTP handling, calling services

### Pattern 2: Validation Layers

```typescript
export async function bookEvent(...) {
  // 1. Input validation (immediate feedback)
  if (!userId || !eventId) {
    throw new ValidationError('Required parameters missing');
  }
  
  if (attendees < 1 || attendees > 10) {
    throw new ValidationError('Attendees must be between 1 and 10');
  }
  
  // 2. Business rule validation (after data fetch)
  const event = await getEventById(eventId);
  
  if (!event.is_published) {
    throw new ValidationError('Event not available');
  }
  
  if (new Date(event.event_date) < new Date()) {
    throw new ValidationError('Cannot book past events');
  }
  
  // 3. Database constraint validation (last resort)
  // CHECK (available_spots >= 0)
  // UNIQUE (user_id, event_id)
}
```

### Pattern 3: Cleanup in Tests

```typescript
describe('Event Service', () => {
  let testUserId: string;
  let testEventId: string;
  
  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query('DELETE FROM bookings WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM events WHERE slug = $1', [testSlug]);
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    
    // Create fresh test data
    testUser = await createTestUser();
    testEvent = await createTestEvent();
  });
  
  afterAll(async () => {
    // Clean up test data (reverse order of dependencies)
    await pool.query('DELETE FROM bookings WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });
});
```

### Pattern 4: Helper Functions

```typescript
// Main function
export async function getEvents(filters?: EventFilters): Promise<Event[]> {
  // Complex implementation
}

// Convenience wrappers
export async function getUpcomingEvents(): Promise<Event[]> {
  return getEvents({
    startDate: new Date(),
    isPublished: true,
  });
}

export async function getEventsByCity(city: string): Promise<Event[]> {
  return getEvents({
    city,
    startDate: new Date(),
    isPublished: true,
  });
}
```

---

## 🎓 Key Takeaways

1. **Use Transactions** for operations that must succeed or fail together
2. **Lock Rows** with `FOR UPDATE` when checking and updating capacity
3. **Validate Early** - check inputs before expensive operations
4. **Custom Errors** provide better error handling and debugging
5. **Test Concurrency** - use `Promise.allSettled` to test race conditions
6. **Type Everything** - TypeScript catches errors at compile time
7. **Index Wisely** - index columns used in WHERE, ORDER BY, JOIN
8. **Clean Up Tests** - always clean test data to avoid interference

---

## 📖 Further Reading

- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Row Locking in PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Database Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Node.js pg Library](https://node-postgres.com/)

---

**Related Files:**
- Implementation: `src/lib/events.ts`
- Tests: `tests/unit/T077_event_service.test.ts`
- Log: `logs/T077_Event_Service_Log.md`
- Database Schema: `database/schema.sql`
