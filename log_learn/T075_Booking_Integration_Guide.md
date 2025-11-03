# Learning Guide: Event Booking System Integration Testing

## 📚 Overview

This guide explains the concepts and patterns used in the T075 event booking integration test. You'll learn about database transactions, concurrency control, constraint enforcement, and how to test complex booking flows.

## 🎯 What You'll Learn

1. What integration tests are and how they differ from unit tests
2. How to handle concurrent booking scenarios
3. Database transaction patterns for consistency
4. Using FOR UPDATE locks to prevent race conditions
5. Testing database constraints and business rules
6. Best practices for test data management

---

## Part 1: Integration Testing Fundamentals

### What is an Integration Test?

**Unit Test:** Tests a single function in isolation  
**Integration Test:** Tests how multiple components work together  
**E2E Test:** Tests the entire system from user perspective

```typescript
// Unit Test (isolated)
test('calculatePrice', () => {
  expect(calculatePrice(2, 50)).toBe(100);
});

// Integration Test (database + logic)
test('booking creates database records', async () => {
  const result = await pool.query('INSERT INTO bookings...');
  expect(result.rows[0]).toBeDefined();
});
```

### Why Integration Tests Matter

- **Catch Database Issues:** SQL syntax, constraints, type mismatches
- **Validate Transactions:** Ensure atomic operations work correctly
- **Test Real Scenarios:** Actual database behavior, not mocks
- **Verify Constraints:** CHECK, UNIQUE, FOREIGN KEY enforcement

---

## Part 2: Event Booking System Architecture

### Database Schema

```sql
-- Events store available capacity
CREATE TABLE events (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  capacity INTEGER NOT NULL,           -- Total spots
  available_spots INTEGER NOT NULL,    -- Remaining spots
  price DECIMAL(10, 2),
  
  -- Constraints prevent invalid states
  CHECK (available_spots >= 0),
  CHECK (available_spots <= capacity)
);

-- Bookings track user reservations
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  attendees INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending',
  total_price DECIMAL(10, 2),
  
  -- One booking per user per event
  UNIQUE(user_id, event_id)
);
```

### Key Business Rules

1. **Capacity Constraint:** Can't book more attendees than available spots
2. **Non-Negative Spots:** Available spots never go below zero
3. **One Booking Per User:** Each user can only book an event once
4. **Atomic Updates:** Booking creation and spot reduction happen together
5. **Cancellation Restoration:** Cancelled bookings restore available spots

---

## Part 3: Database Transactions Explained

### What is a Transaction?

A transaction is a sequence of database operations that either:
- **All succeed** (COMMIT) - changes are saved
- **All fail** (ROLLBACK) - no changes are made

This ensures **atomicity** - operations are "all or nothing."

### Basic Transaction Pattern

```typescript
const client = await pool.connect();

try {
  await client.query('BEGIN');
  
  // Multiple related operations
  await client.query('INSERT INTO bookings...');
  await client.query('UPDATE events SET available_spots...');
  
  await client.query('COMMIT');  // ✅ Save changes
  
} catch (error) {
  await client.query('ROLLBACK');  // ❌ Undo everything
  throw error;
} finally {
  client.release();  // Always return connection to pool
}
```

### Why Transactions Are Essential

**Without Transaction:**
```typescript
// ❌ DANGER: These can partially fail
await pool.query('INSERT INTO bookings...');  // ✅ succeeds
await pool.query('UPDATE events...');         // ❌ fails
// Result: Booking exists but spots weren't reduced!
```

**With Transaction:**
```typescript
// ✅ SAFE: Either both succeed or both fail
await client.query('BEGIN');
await client.query('INSERT INTO bookings...');  // ✅ succeeds
await client.query('UPDATE events...');         // ❌ fails
await client.query('ROLLBACK');
// Result: Nothing changed, data is consistent
```

---

## Part 4: Preventing Race Conditions

### The Problem: Concurrent Booking

Imagine two users trying to book the last 3 spots simultaneously:

```
Time    User A                          User B
----    ------                          ------
T1      Check: 3 spots available        
T2                                      Check: 3 spots available
T3      Book 3 spots (spots = 0)        
T4                                      Book 3 spots (spots = -3) ❌
```

**Result:** Overbooking! 6 attendees for 3 spots.

### The Solution: FOR UPDATE Lock

```typescript
await client.query('BEGIN');

// Lock the row - no one else can read it until we're done
const check = await client.query(
  'SELECT available_spots FROM events WHERE id = $1 FOR UPDATE',
  [eventId]
);

// Now we have exclusive access
if (check.rows[0].available_spots >= requestedAttendees) {
  await client.query('INSERT INTO bookings...');
  await client.query('UPDATE events SET available_spots...');
  await client.query('COMMIT');  // Release lock
}
```

**How it works:**

```
Time    User A                                  User B
----    ------                                  ------
T1      BEGIN                                   
T2      SELECT...FOR UPDATE (locks row)         
T3      Check: 3 spots available                
T4                                              BEGIN
T5                                              SELECT...FOR UPDATE (waits for lock)
T6      Book 3 spots (spots = 0)                
T7      COMMIT (releases lock)                  
T8                                              Gets lock, sees 0 spots
T9                                              ROLLBACK (not enough spots) ✅
```

**Result:** No overbooking! User B sees accurate spot count.

---

## Part 5: Database Constraints as Safety Net

### CHECK Constraints

Prevent invalid data at the database level:

```sql
-- Spots can never go negative
CHECK (available_spots >= 0)

-- Can't have more available spots than capacity
CHECK (available_spots <= capacity)
```

**Test Example:**
```typescript
test('enforce non-negative spots', async () => {
  // Try to update spots to -1
  await expect(
    pool.query('UPDATE events SET available_spots = -1 WHERE id = $1', [eventId])
  ).rejects.toThrow('violates check constraint');
});
```

### UNIQUE Constraints

Prevent duplicate data:

```sql
-- One booking per user per event
UNIQUE(user_id, event_id)
```

**Test Example:**
```typescript
test('prevent duplicate bookings', async () => {
  // First booking succeeds
  await pool.query('INSERT INTO bookings (user_id, event_id)...');
  
  // Second booking for same user/event fails
  await expect(
    pool.query('INSERT INTO bookings (user_id, event_id)...')
  ).rejects.toThrow('duplicate key value');
});
```

---

## Part 6: Atomic Operations

### The Problem with Read-Modify-Write

```typescript
// ❌ BAD: Race condition possible
const result = await pool.query('SELECT available_spots FROM events WHERE id = $1');
const currentSpots = result.rows[0].available_spots;
const newSpots = currentSpots - attendees;  // Calculation happens in app
await pool.query('UPDATE events SET available_spots = $1 WHERE id = $2', [newSpots, eventId]);
```

**Why it's bad:** Between reading and writing, another booking could change the value.

### The Solution: Database-Level Atomic Update

```typescript
// ✅ GOOD: Atomic operation
await pool.query(
  'UPDATE events SET available_spots = available_spots - $1 WHERE id = $2',
  [attendees, eventId]
);
```

**Why it's good:** The database handles the subtraction atomically - no race condition possible.

---

## Part 7: Test Data Management

### Setup and Teardown Pattern

```typescript
let testUser1: User;
let testUser2: User;
let testEvent: Event;

beforeEach(async () => {
  // Clean slate for each test
  await pool.query('DELETE FROM bookings WHERE user_id IN (...)');
  await pool.query('DELETE FROM events WHERE id IN (...)');
  await pool.query('DELETE FROM users WHERE id IN (...)');
  
  // Create fresh test data
  testUser1 = (await pool.query('INSERT INTO users...')).rows[0];
  testUser2 = (await pool.query('INSERT INTO users...')).rows[0];
  testEvent = (await pool.query('INSERT INTO events...')).rows[0];
});

afterEach(async () => {
  // Cleanup after each test
  await pool.query('DELETE FROM bookings...');
  await pool.query('DELETE FROM events...');
  await pool.query('DELETE FROM users...');
});
```

### Why This Pattern?

1. **Test Isolation:** Each test starts with known state
2. **No Interference:** Tests don't affect each other
3. **Repeatable:** Run tests multiple times with same results
4. **Clear Intent:** Easy to see what data each test uses

---

## Part 8: Testing Concurrent Scenarios

### Simulating Race Conditions

```typescript
test('prevent overbooking with concurrent requests', async () => {
  const client1 = await pool.connect();
  const client2 = await pool.connect();
  
  try {
    // Set up: Only 3 spots available
    await pool.query('UPDATE events SET available_spots = 3...');
    
    // Both clients start transactions
    await client1.query('BEGIN');
    await client2.query('BEGIN');
    
    // Client 1 locks the row
    const check1 = await client1.query(
      'SELECT available_spots FROM events WHERE id = $1 FOR UPDATE',
      [eventId]
    );
    expect(check1.rows[0].available_spots).toBe(3);
    
    // Client 2 tries to lock (will wait)
    const check2Promise = client2.query(
      'SELECT available_spots FROM events WHERE id = $1 FOR UPDATE',
      [eventId]
    );
    
    // Client 1 books 3 spots
    await client1.query('INSERT INTO bookings...');
    await client1.query('UPDATE events SET available_spots = 0...');
    await client1.query('COMMIT');  // Releases lock
    
    // Now client 2 can read and sees 0 spots
    const check2 = await check2Promise;
    expect(check2.rows[0].available_spots).toBe(0);
    
    // Client 2 rolls back (not enough spots)
    await client2.query('ROLLBACK');
    
  } finally {
    client1.release();
    client2.release();
  }
});
```

---

## Part 9: Common Patterns & Best Practices

### 1. Always Use Transactions for Multi-Step Operations

```typescript
// ❌ BAD: Operations can partially fail
await pool.query('INSERT INTO bookings...');
await pool.query('UPDATE events...');

// ✅ GOOD: Atomic - both or neither
const client = await pool.connect();
await client.query('BEGIN');
await client.query('INSERT INTO bookings...');
await client.query('UPDATE events...');
await client.query('COMMIT');
client.release();
```

### 2. Use FOR UPDATE for Critical Reads

```typescript
// ❌ BAD: Another transaction could modify between read and write
const check = await pool.query('SELECT available_spots...');
// ... decisions based on check ...
await pool.query('UPDATE events...');

// ✅ GOOD: Lock prevents modifications
const check = await client.query('SELECT available_spots... FOR UPDATE');
// ... row is locked, safe to proceed ...
await client.query('UPDATE events...');
```

### 3. Always Release Connections

```typescript
// ❌ BAD: Connection leak
const client = await pool.connect();
await client.query('BEGIN');
await client.query('INSERT...');
await client.query('COMMIT');
// Forgot to release!

// ✅ GOOD: Always release in finally
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT...');
  await client.query('COMMIT');
} finally {
  client.release();  // Always runs
}
```

### 4. Handle Rollback in Error Cases

```typescript
// ❌ BAD: Failed transaction left open
const client = await pool.connect();
await client.query('BEGIN');
await client.query('INSERT...');  // might fail
await client.query('COMMIT');

// ✅ GOOD: Rollback on error
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT...');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');  // Undo changes
  throw error;
} finally {
  client.release();
}
```

### 5. Test Constraint Violations

```typescript
test('database enforces business rules', async () => {
  // Test that constraints work
  await expect(
    pool.query('INSERT INTO bookings (user_id, event_id)...')
  ).rejects.toThrow('violates unique constraint');
  
  await expect(
    pool.query('UPDATE events SET available_spots = -1...')
  ).rejects.toThrow('violates check constraint');
});
```

---

## Part 10: TypeScript Considerations

### Handling Query Results

```typescript
// Query results can be undefined
const result = await pool.query<Event>('SELECT * FROM events WHERE id = $1', [id]);

// ❌ BAD: Might crash if no rows
const event = result.rows[0];
console.log(event.title);

// ✅ GOOD: Check for existence
const event = result.rows[0];
if (event) {
  console.log(event.title);
}

// ✅ GOOD: Non-null assertion when you know it exists (e.g., after INSERT)
const event = result.rows[0]!;  // ! says "I guarantee this exists"
console.log(event.title);
```

### Aggregate Query Types

```typescript
// ❌ BAD: SUM returns different type than table
const result = await pool.query<Booking>(
  'SELECT SUM(attendees) as total FROM bookings...'
);

// ✅ GOOD: Don't specify type for aggregates
const result = await pool.query(
  'SELECT SUM(attendees) as total FROM bookings...'
);
const total = Number(result.rows[0]?.total || 0);
```

---

## 🎓 Key Takeaways

1. **Integration tests validate real system behavior**, not mocked functions
2. **Transactions ensure atomicity** - all operations succeed or all fail
3. **FOR UPDATE locks prevent race conditions** in concurrent scenarios
4. **Database constraints are your safety net** - validate at DB level
5. **Atomic operations eliminate race conditions** - let DB handle calculations
6. **Always manage connections properly** - connect, try, catch, finally, release
7. **Test data isolation prevents interference** - clean setup/teardown for each test

---

## 📖 Further Reading

- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Row-Level Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Vitest Integration Testing](https://vitest.dev/guide/)
- [Database Constraints Best Practices](https://www.postgresql.org/docs/current/ddl-constraints.html)

---

## 🧪 Practice Exercises

1. **Add a refund scenario**: Test that cancelled bookings with `refunded: true` restore spots
2. **Test waitlist**: When event is full, add users to a waitlist table
3. **Add overbooking protection**: Prevent booking if it would exceed fire safety limits
4. **Test payment integration**: Ensure booking creation and payment processing are atomic
5. **Add booking expiration**: Cancel pending bookings after 15 minutes

---

**Related Files:**
- Implementation: `tests/integration/T075_booking.test.ts`
- Log: `logs/T075_Booking_Integration_Log.md`
- Schema: `database/schema.sql`
