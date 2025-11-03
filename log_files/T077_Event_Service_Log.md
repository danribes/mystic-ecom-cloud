# T077 Event Service Implementation Log

## Overview
Implemented the event service module (`src/lib/events.ts`) with comprehensive business logic for event management, including retrieving events, checking capacity, and booking functionality.

## Implementation Date
November 1, 2025

## Files Created/Modified

### Created Files
1. **src/lib/events.ts** (588 lines)
   - Core event service module with all business logic
   
2. **tests/unit/T077_event_service.test.ts** (702 lines)
   - Comprehensive unit tests for all event service functions

### Modified Files
1. **vitest.config.ts**
   - Uncommented `setupFiles` to load environment variables for tests
   - Required for proper database connection during testing

## Implementation Details

### Core Functions Implemented

#### 1. `getEvents(filters?: EventFilters): Promise<Event[]>`
**Purpose:** Retrieve all events with optional filtering

**Features:**
- Default filter: only published events
- Optional filters:
  - `isPublished`: Filter by publication status
  - `city`: Filter by venue city (case-insensitive)
  - `country`: Filter by venue country (case-insensitive)
  - `startDate`: Events on or after this date
  - `endDate`: Events on or before this date
  - `minAvailableSpots`: Events with at least N spots available
- Results ordered by event date ascending (soonest first)
- Dynamic query building with parameterized SQL

**Database Query Example:**
```sql
SELECT id, title, slug, description, price, event_date, duration_hours,
       venue_name, venue_address, venue_city, venue_country, 
       venue_lat, venue_lng, capacity, available_spots, image_url,
       is_published, created_at, updated_at
FROM events
WHERE is_published = true 
  AND LOWER(venue_city) = LOWER($1)
  AND available_spots >= $2
ORDER BY event_date ASC, created_at DESC
```

#### 2. `getEventById(identifier: string): Promise<Event>`
**Purpose:** Retrieve a single event by UUID or slug

**Features:**
- Accepts both UUID and slug formats
- Auto-detects identifier type using regex
- Returns complete event details
- Throws `NotFoundError` if event doesn't exist

**UUID Detection Pattern:**
```typescript
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
```

#### 3. `checkCapacity(eventId: string, requestedSpots: number): Promise<CapacityResult>`
**Purpose:** Check if requested spots are available for an event

**Features:**
- Validates requested spots (must be >= 1)
- Returns availability status and current capacity information
- Throws `NotFoundError` if event doesn't exist
- Throws `ValidationError` for invalid spot count

**Return Type:**
```typescript
{
  available: boolean;        // true if spots available
  availableSpots: number;    // current available spots
  capacity: number;          // total capacity
}
```

#### 4. `bookEvent(userId: string, eventId: string, attendees: number = 1): Promise<BookingResult>`
**Purpose:** Create a booking and update available spots atomically

**Features:**
- **Transaction-based:** Ensures atomicity of booking + spot update
- **Row-level locking:** Uses `FOR UPDATE` to prevent race conditions
- **Comprehensive validation:**
  - User ID and Event ID required
  - Attendees must be >= 1
  - Event must be published
  - Event must be in the future
  - Sufficient capacity available
  - No duplicate bookings (enforced by UNIQUE constraint)
- **Automatic price calculation:** `totalPrice = pricePerPerson * attendees`
- **Spot management:** Decrements `available_spots` after booking

**Transaction Flow:**
```typescript
BEGIN TRANSACTION
  1. SELECT event FOR UPDATE (lock row)
  2. Validate event exists, published, future date
  3. Check for existing booking (prevent duplicates)
  4. Validate capacity available
  5. Calculate total price
  6. INSERT INTO bookings
  7. UPDATE events SET available_spots = available_spots - attendees
COMMIT TRANSACTION
```

**Error Handling:**
- `ValidationError`: Invalid parameters or unpublished/past event
- `NotFoundError`: Event doesn't exist
- `ConflictError`: Insufficient capacity or duplicate booking
- `DatabaseError`: Database operation failed

#### 5. `cancelBooking(bookingId: string, userId: string): Promise<CancelResult>`
**Purpose:** Cancel a booking and restore available spots

**Features:**
- Transaction-based for atomicity
- Ownership verification (user can only cancel their own bookings)
- Status validation (can't cancel already cancelled or completed bookings)
- Automatic spot restoration

**Transaction Flow:**
```typescript
BEGIN TRANSACTION
  1. SELECT booking FOR UPDATE (lock row)
  2. Verify booking exists
  3. Verify ownership (booking.user_id === userId)
  4. Verify status (not already cancelled/completed)
  5. UPDATE bookings SET status = 'cancelled'
  6. UPDATE events SET available_spots = available_spots + attendees
COMMIT TRANSACTION
```

#### 6. Helper Functions

**`getUpcomingEvents(limit?: number): Promise<Event[]>`**
- Returns only future published events
- Convenience wrapper around `getEvents`

**`getEventsByCity(city: string): Promise<Event[]>`**
- Returns future published events in a specific city
- Case-insensitive city matching

**`searchEvents(searchTerm: string): Promise<Event[]>`**
- Full-text search across title, description, and city
- Case-insensitive pattern matching
- Returns only future published events

## Database Schema

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

**Key Constraints:**
- `check_available_spots`: Ensures available spots never exceeds capacity or goes negative
- Indexes on: slug, event_date, venue_city, is_published

### Bookings Table
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    status booking_status DEFAULT 'pending',
    attendees INTEGER DEFAULT 1,
    total_price DECIMAL(10, 2) NOT NULL,
    whatsapp_notified BOOLEAN DEFAULT false,
    email_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id)
);
```

**Key Constraints:**
- `UNIQUE(user_id, event_id)`: Prevents duplicate bookings for same user/event combination
- Foreign keys with appropriate CASCADE/SET NULL behaviors

## Test Coverage

### Test Suite Summary
- **Total Tests:** 39
- **All Passing:** ✅ 39/39

### Test Categories

#### 1. getEvents Tests (9 tests)
- ✅ Return all published events by default
- ✅ Filter by city
- ✅ Filter by country
- ✅ Filter by date range
- ✅ Filter by minimum available spots
- ✅ Return unpublished events when requested
- ✅ Combine multiple filters
- ✅ Return events ordered by date ascending
- ✅ Verify event structure

#### 2. getEventById Tests (5 tests)
- ✅ Return event by UUID
- ✅ Return event by slug
- ✅ Include all event fields
- ✅ Throw NotFoundError for non-existent UUID
- ✅ Throw NotFoundError for non-existent slug

#### 3. checkCapacity Tests (4 tests)
- ✅ Return available capacity information
- ✅ Indicate when spots exceed available
- ✅ Throw ValidationError for invalid spot count
- ✅ Throw NotFoundError for non-existent event

#### 4. bookEvent Tests (8 tests)
- ✅ Successfully book an event
- ✅ Book with default 1 attendee
- ✅ Throw ValidationError for missing parameters
- ✅ Throw ValidationError for invalid attendee count
- ✅ Throw NotFoundError for non-existent event
- ✅ Throw ValidationError for unpublished event
- ✅ Throw ConflictError when exceeding capacity
- ✅ Throw ConflictError for duplicate booking
- ✅ Handle concurrent bookings correctly (race condition test)

#### 5. cancelBooking Tests (4 tests)
- ✅ Successfully cancel a booking
- ✅ Throw ValidationError for missing parameters
- ✅ Throw NotFoundError for non-existent booking
- ✅ Throw ValidationError for unauthorized cancellation
- ✅ Throw ValidationError for already cancelled booking

#### 6. Helper Function Tests (9 tests)
- ✅ getUpcomingEvents returns only future events
- ✅ getEventsByCity filters by city
- ✅ getEventsByCity returns empty array for non-existent city
- ✅ searchEvents finds by title
- ✅ searchEvents finds by description
- ✅ searchEvents finds by city
- ✅ searchEvents is case-insensitive
- ✅ searchEvents returns empty array for no matches

### Test Data Setup
```typescript
// 3 Test Events:
1. Meditation Retreat Bali ($299.99, 20 capacity, published, 1 week future)
2. Yoga Workshop NYC ($79.99, 50 capacity, published, 2 weeks future)
3. Private Event London ($199.99, 10 capacity, NOT published, 1 month future)

// 1 Test User:
- Email: event-service-test@example.com
- Role: user
- Email verified: true
```

### Concurrent Booking Test
The test suite includes a race condition test that:
1. Creates an event with 5 spots
2. Creates 2 users
3. Simultaneously attempts to book 3 spots each (total 6 > 5)
4. Verifies that exactly 1 booking succeeds and 1 fails
5. Confirms final available spots = 2 (5 - 3)

This validates the transaction-based approach prevents overbooking.

## Error Handling

### Custom Error Classes Used
- **NotFoundError (404):** Event or booking not found
- **ValidationError (400):** Invalid parameters or business rule violations
- **ConflictError (409):** Capacity exceeded or duplicate booking
- **DatabaseError (500):** Database operation failures

### Error Logging
All errors are logged with context:
```typescript
console.error('[Events] Error fetching events:', error);
```

## Key Design Decisions

### 1. Transaction Usage
**Decision:** Use transactions for `bookEvent` and `cancelBooking`

**Rationale:**
- Ensures atomicity: booking creation and spot update happen together
- Prevents race conditions through row-level locking
- Maintains data consistency

### 2. Row-Level Locking
**Decision:** Use `SELECT ... FOR UPDATE` in transactions

**Rationale:**
- Prevents concurrent modifications to the same event
- Essential for preventing overbooking
- PostgreSQL's MVCC handles lock contention efficiently

### 3. Duplicate Booking Prevention
**Decision:** Use database UNIQUE constraint + application check

**Rationale:**
- UNIQUE(user_id, event_id) prevents duplicates at database level
- Application check provides better error messages
- Defense in depth approach

### 4. Price Calculation
**Decision:** Calculate price in application, not database

**Rationale:**
- Allows for future complex pricing logic (discounts, early bird, etc.)
- Keeps business logic in application layer
- Easy to test and modify

### 5. Identifier Flexibility
**Decision:** Support both UUID and slug for `getEventById`

**Rationale:**
- UUIDs for internal operations
- Slugs for user-facing URLs
- Single function reduces API complexity

### 6. Default Filters
**Decision:** Only return published events by default

**Rationale:**
- Prevents accidental exposure of unpublished events
- Explicit opt-in for admin functions
- Safer default behavior

## TypeScript Considerations

### Type Safety
- All functions have explicit return types
- Interface definitions for Event, EventFilters, BookingResult
- Non-null assertions (!) used only after explicit checks

### Potential Improvements
- Consider using branded types for UUID strings
- Add runtime validation for event dates
- Consider Zod schemas for input validation

## Performance Considerations

### Indexing
The schema includes indexes on:
- `events.slug` (for getEventById)
- `events.event_date` (for date filtering/sorting)
- `events.venue_city` (for city filtering)
- `events.is_published` (for publication filtering)
- `bookings.user_id`, `bookings.event_id` (for booking lookups)

### Query Optimization
- Uses parameterized queries to enable query plan caching
- Selects only needed columns
- Filters at database level, not in application

### Connection Pooling
- Uses `src/lib/db.ts` connection pool
- Pool configuration in db.ts:
  - Max: 20 connections
  - Min: 2 connections
  - Idle timeout: 30 seconds

## Testing Environment Setup

### Issue Encountered
Initial test failures due to:
1. Missing `password_hash` in user inserts (NOT NULL constraint)
2. `vitest.config.ts` had `setupFiles` commented out
3. Duplicate test data from previous runs

### Solutions Applied
1. Added `password_hash` field to all user INSERT statements
2. Uncommented `setupFiles: ['./tests/T010-vitest-setup.ts']` in vitest.config
3. Added cleanup in `beforeAll` to delete existing test data

### Environment Variables
Tests now properly load `.env` file through `dotenv` in setup file:
- `DATABASE_URL`: PostgreSQL connection string
- Connection details parsed by `tests/setup/database.ts`

## Dependencies

### Direct Dependencies
- `pg` (PostgreSQL client)
- Custom error classes from `@/lib/errors`
- Database utilities from `@/lib/db`

### Test Dependencies
- `vitest` (test runner)
- `tests/setup/database` (test database connection)

## Future Enhancements

### Potential Features
1. **Waitlist Management:** Allow users to join waitlist for sold-out events
2. **Partial Cancellations:** Cancel some attendees, not entire booking
3. **Booking Transfers:** Transfer booking to another user
4. **Event Series:** Support recurring events
5. **Multi-Event Bookings:** Book multiple events in single transaction
6. **Dynamic Pricing:** Early bird, group discounts, promo codes
7. **Seat Selection:** For events with assigned seating
8. **Check-in System:** Mark attendees as checked-in at event

### Code Improvements
1. Add caching for frequently accessed events (Redis)
2. Implement event recommendation algorithm
3. Add event popularity tracking (view counts, bookmark counts)
4. Implement soft deletes for events
5. Add event categories/tags for better filtering
6. Support for different timezones in event dates

## Related Tasks
- **T076:** E2E test for event booking (completed - tests use this service)
- **T078:** Implement booking service (next - separate booking management)
- **T079:** Create events catalog page (uses getEvents)
- **T080:** Create EventCard component (displays event data)
- **T081:** Create event detail page (uses getEventById)
- **T082:** Add "Book Now" button (uses bookEvent, checkCapacity)

## Conclusion

The event service implementation provides a robust, transaction-safe foundation for the event booking system. All 39 tests pass, covering happy paths, error conditions, and edge cases including race conditions. The service is ready for integration with the frontend pages and booking API endpoints.

**Key Achievements:**
- ✅ Comprehensive event querying with flexible filters
- ✅ Transaction-safe booking with race condition protection
- ✅ Proper capacity management
- ✅ Duplicate booking prevention
- ✅ Comprehensive error handling
- ✅ 100% test pass rate (39/39 tests)
- ✅ Type-safe TypeScript implementation
- ✅ Database constraint enforcement

**Status:** ✅ Ready for production use
