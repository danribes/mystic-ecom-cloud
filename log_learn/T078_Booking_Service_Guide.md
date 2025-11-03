# T078 Booking Service Learning Guide

## Introduction

This guide provides a comprehensive tutorial on building a booking management service for an event booking platform. You'll learn about service layer architecture, integration patterns, flexible data loading, and how to build robust, testable booking management systems.

## Table of Contents

1. [Service Layer Architecture](#1-service-layer-architecture)
2. [Integration Patterns](#2-integration-patterns)
3. [Flexible Data Loading](#3-flexible-data-loading)
4. [Notification Tracking](#4-notification-tracking)
5. [Status Management](#5-status-management)
6. [Analytics and Reporting](#6-analytics-and-reporting)
7. [Testing Service Integration](#7-testing-service-integration)
8. [Best Practices](#8-best-practices)

---

## 1. Service Layer Architecture

### Understanding Service Layers

A service layer sits between your API routes and your database, encapsulating business logic and providing a clean interface for data operations.

**Benefits:**
- **Separation of Concerns:** Business logic separate from routes
- **Reusability:** Services can be called from multiple routes
- **Testability:** Easy to unit test without HTTP layer
- **Maintainability:** Changes centralized in one place

### The Booking Service Structure

```typescript
// src/lib/bookings.ts
import { query, transaction } from './db';
import { bookEvent as createEventBooking } from './events';

// Core operations
export async function createBooking(options: CreateBookingOptions): Promise<Booking>
export async function getBookingById(bookingId: string): Promise<Booking>
export async function getUserBookings(userId: string): Promise<Booking[]>

// Administrative operations  
export async function markNotificationSent(bookingId: string, type: 'email' | 'whatsapp'): Promise<Booking>
export async function updateBookingStatus(bookingId: string, status: string): Promise<Booking>
export async function getEventBookingCount(eventId: string): Promise<number>
export async function getEventTotalAttendees(eventId: string): Promise<number>
```

### Separation from Event Service

**Why separate services?**

```
Event Service (events.ts)
├── Focus: Event management
├── Operations: CRUD on events, capacity management
└── Core booking creation (with transactions)

Booking Service (bookings.ts)
├── Focus: Booking management
├── Operations: Booking retrieval, user views, analytics
└── Wraps event service for order integration
```

**Key Principle:** Each service has a single, well-defined responsibility.

### Example: Creating a Booking Service File

```typescript
// src/lib/bookings.ts

// 1. Import dependencies
import { query } from './db';
import { bookEvent } from './events';
import { ValidationError, NotFoundError } from './errors';

// 2. Define types
export interface Booking {
  id: string;
  user_id: string;
  event_id: string;
  // ... other fields
}

// 3. Implement functions
export async function createBooking(
  userId: string,
  eventId: string
): Promise<Booking> {
  // Validate inputs
  if (!userId || !eventId) {
    throw new ValidationError('User ID and Event ID required');
  }

  // Use event service for core booking logic
  const result = await bookEvent(userId, eventId);
  
  // Retrieve complete booking
  const booking = await query(
    'SELECT * FROM bookings WHERE id = $1',
    [result.bookingId]
  );
  
  return booking.rows[0];
}
```

---

## 2. Integration Patterns

### The Wrapper Pattern

**Problem:** Need to extend existing functionality without duplicating code

**Solution:** Wrap the existing function and add enhancements

**Example: createBooking wraps bookEvent**

```typescript
export async function createBooking(
  options: CreateBookingOptions
): Promise<Booking> {
  const { userId, eventId, attendees = 1, orderId, status = 'pending' } = options;

  // Step 1: Use event service for core booking logic
  // (Handles validation, capacity checks, transactions)
  const bookingResult = await createEventBooking(userId, eventId, attendees);

  // Step 2: Add booking-specific enhancements
  if (orderId) {
    await query(
      `UPDATE bookings 
       SET order_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [orderId, status, bookingResult.bookingId]
    );
  }

  // Step 3: Return complete booking object
  const result = await query(
    'SELECT * FROM bookings WHERE id = $1',
    [bookingResult.bookingId]
  );

  return result.rows[0];
}
```

**Benefits:**
- ✅ Leverages existing transaction safety
- ✅ Avoids code duplication
- ✅ Single source of truth for booking validation
- ✅ Easy to add booking-specific features

### Service-to-Service Communication

**Pattern: One service calls another**

```typescript
// Event Service (events.ts)
export async function bookEvent(
  userId: string,
  eventId: string,
  attendees: number
): Promise<BookingResult> {
  return await transaction(async (client) => {
    // Lock event row
    const event = await client.query(
      'SELECT * FROM events WHERE id = $1 FOR UPDATE',
      [eventId]
    );
    
    // Validate capacity
    if (event.rows[0].available_spots < attendees) {
      throw new ConflictError('Insufficient capacity');
    }
    
    // Create booking
    const booking = await client.query(
      'INSERT INTO bookings (...) VALUES (...) RETURNING id',
      [userId, eventId, attendees, /* ... */]
    );
    
    // Update capacity
    await client.query(
      'UPDATE events SET available_spots = available_spots - $1',
      [attendees]
    );
    
    return {
      bookingId: booking.rows[0].id,
      // ... other fields
    };
  });
}

// Booking Service (bookings.ts)
export async function createBooking(options: CreateBookingOptions) {
  // Call event service
  const result = await bookEvent(
    options.userId,
    options.eventId,
    options.attendees
  );
  
  // Add booking-specific logic
  // ...
}
```

### Error Propagation

**Important:** Preserve error semantics when wrapping functions

```typescript
export async function createBooking(
  options: CreateBookingOptions
): Promise<Booking> {
  try {
    const bookingResult = await createEventBooking(
      userId,
      eventId,
      attendees
    );
    
    // ... additional logic
    
  } catch (error) {
    // Re-throw known errors (preserve semantic meaning)
    if (
      error instanceof NotFoundError ||
      error instanceof ValidationError ||
      error instanceof ConflictError ||
      error instanceof DatabaseError
    ) {
      throw error; // Don't wrap! Preserve original error type
    }

    // Only wrap unexpected errors
    console.error('[Bookings] Error creating booking:', error);
    throw new DatabaseError('Failed to create booking');
  }
}
```

**Why this matters:**

```typescript
// API Route (src/pages/api/bookings/create.ts)
try {
  const booking = await createBooking({ userId, eventId });
  return Response.json(booking, { status: 201 });
} catch (error) {
  if (error instanceof ConflictError) {
    return Response.json({ error: error.message }, { status: 409 }); // Correct!
  }
  if (error instanceof ValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  // ...
}
```

---

## 3. Flexible Data Loading

### Problem: Different Use Cases Need Different Data

**Scenario 1: User Dashboard**
- Need booking + full event details (title, venue, date)
- JOIN with events table

**Scenario 2: Admin Analytics**
- Need only booking data (counts, status)
- No event details required

**Scenario 3: API Response**
- Event data fetched separately
- Only booking IDs needed

### Solution: Optional Joins

```typescript
export async function getBookingById(
  bookingId: string,
  includeEvent: boolean = false
): Promise<Booking | BookingWithEvent> {
  
  let queryText: string;
  
  if (includeEvent) {
    // JOIN with events table
    queryText = `
      SELECT 
        b.id, b.user_id, b.event_id, b.status, b.attendees,
        e.title as event_title,
        e.slug as event_slug,
        e.event_date,
        e.venue_name,
        e.venue_city
      FROM bookings b
      INNER JOIN events e ON b.event_id = e.id
      WHERE b.id = $1
    `;
  } else {
    // Simple SELECT
    queryText = `
      SELECT id, user_id, event_id, status, attendees
      FROM bookings
      WHERE id = $1
    `;
  }
  
  const result = await query(queryText, [bookingId]);
  
  if (includeEvent) {
    // Transform flat result into nested structure
    return {
      id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      event_id: result.rows[0].event_id,
      status: result.rows[0].status,
      attendees: result.rows[0].attendees,
      event: {
        title: result.rows[0].event_title,
        slug: result.rows[0].event_slug,
        event_date: result.rows[0].event_date,
        venue_name: result.rows[0].venue_name,
        venue_city: result.rows[0].venue_city,
      },
    };
  }
  
  return result.rows[0];
}
```

### Using Type Discrimination

```typescript
// Define separate types
export interface Booking {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  attendees: number;
}

export interface BookingWithEvent extends Booking {
  event: {
    title: string;
    slug: string;
    event_date: Date;
    venue_name: string;
    venue_city: string;
  };
}

// Return type changes based on parameter
export function getBookingById(
  bookingId: string,
  includeEvent: false
): Promise<Booking>;

export function getBookingById(
  bookingId: string,
  includeEvent: true
): Promise<BookingWithEvent>;

export async function getBookingById(
  bookingId: string,
  includeEvent: boolean = false
): Promise<Booking | BookingWithEvent> {
  // Implementation...
}
```

### Usage Examples

```typescript
// Without event details (faster)
const booking = await getBookingById(bookingId, false);
console.log(booking.event_id); // Just ID

// With event details (for user display)
const bookingWithEvent = await getBookingById(bookingId, true);
console.log(bookingWithEvent.event.title); // Full event info
console.log(bookingWithEvent.event.venue_name);
```

### Pagination Pattern

```typescript
export async function getUserBookings(
  userId: string,
  filters?: {
    status?: string;
    includeEvent?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<Booking[]> {
  const {
    status,
    includeEvent = true,
    limit = 50,      // Default page size
    offset = 0,      // Start from beginning
  } = filters || {};

  let queryText = 'SELECT * FROM bookings WHERE user_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  // Add optional status filter
  if (status) {
    queryText += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  // Add pagination
  queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(queryText, params);
  return result.rows;
}

// Usage:
// First page
const page1 = await getUserBookings(userId, { limit: 20, offset: 0 });

// Second page
const page2 = await getUserBookings(userId, { limit: 20, offset: 20 });

// Only confirmed bookings
const confirmed = await getUserBookings(userId, { status: 'confirmed' });
```

---

## 4. Notification Tracking

### Problem: Track Multiple Notification Channels

Modern applications send notifications through multiple channels:
- Email confirmations
- WhatsApp messages
- SMS alerts
- Push notifications

**Challenge:** Track which notifications were sent successfully

### Solution: Notification Flags

**Database Schema:**
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY,
    -- ... other fields
    email_notified BOOLEAN DEFAULT false,
    whatsapp_notified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Service Function:**
```typescript
export async function markNotificationSent(
  bookingId: string,
  type: 'email' | 'whatsapp'
): Promise<Booking> {
  // Validate inputs
  if (!bookingId) {
    throw new ValidationError('Booking ID is required');
  }

  if (type !== 'email' && type !== 'whatsapp') {
    throw new ValidationError('Notification type must be "email" or "whatsapp"');
  }

  // Determine which field to update
  const field = type === 'email' ? 'email_notified' : 'whatsapp_notified';
  
  // Update the flag
  const result = await query(
    `UPDATE bookings 
     SET ${field} = true, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [bookingId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Booking');
  }

  return result.rows[0];
}
```

### Integration with Notification Services

```typescript
// Email Service (src/lib/email.ts)
export async function sendBookingConfirmation(
  booking: Booking,
  userEmail: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: 'bookings@example.com',
      to: userEmail,
      subject: 'Booking Confirmation',
      html: renderBookingEmail(booking),
    });
    
    // Mark notification as sent
    await markNotificationSent(booking.id, 'email');
    
  } catch (error) {
    console.error('Failed to send booking email:', error);
    // Don't mark as sent if it failed
  }
}

// WhatsApp Service (src/lib/twilio.ts)
export async function sendWhatsAppNotification(
  booking: Booking,
  phoneNumber: string
): Promise<void> {
  try {
    await twilioClient.messages.create({
      from: 'whatsapp:+1234567890',
      to: `whatsapp:${phoneNumber}`,
      body: `Your booking is confirmed! Event: ${booking.event.title}...`,
    });
    
    // Mark notification as sent
    await markNotificationSent(booking.id, 'whatsapp');
    
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
  }
}
```

### Usage in Checkout Flow

```typescript
// src/pages/api/checkout/webhook.ts
export async function handleStripeWebhook(event: Stripe.Event) {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Create order
    const order = await createOrder({
      userId: metadata.userId,
      totalAmount: paymentIntent.amount / 100,
      stripePaymentIntentId: paymentIntent.id,
    });
    
    // Create booking
    const booking = await createBooking({
      userId: metadata.userId,
      eventId: metadata.eventId,
      orderId: order.id,
      status: 'confirmed',
    });
    
    // Send notifications
    const user = await getUserById(metadata.userId);
    
    // Email notification
    await sendBookingConfirmation(booking, user.email);
    // Automatically marks email_notified = true
    
    // WhatsApp notification (if user has WhatsApp)
    if (user.whatsapp) {
      await sendWhatsAppNotification(booking, user.whatsapp);
      // Automatically marks whatsapp_notified = true
    }
  }
}
```

### Querying Notification Status

```typescript
// Find bookings that haven't been notified by email
const unnotified = await query(`
  SELECT * FROM bookings
  WHERE email_notified = false
  AND created_at > NOW() - INTERVAL '1 hour'
`);

// Retry notifications
for (const booking of unnotified.rows) {
  await sendBookingConfirmation(booking, booking.user_email);
}
```

---

## 5. Status Management

### Booking Lifecycle

```
pending → confirmed → attended
   ↓
cancelled
```

**Status Definitions:**
- `pending`: Initial state, awaiting payment confirmation
- `confirmed`: Payment successful, booking active
- `cancelled`: User or admin cancelled booking
- `attended`: User attended the event (marked after event)

### Implementing Status Updates

```typescript
export async function updateBookingStatus(
  bookingId: string,
  newStatus: 'pending' | 'confirmed' | 'cancelled' | 'attended'
): Promise<Booking> {
  // Validate inputs
  if (!bookingId) {
    throw new ValidationError('Booking ID is required');
  }

  const validStatuses = ['pending', 'confirmed', 'cancelled', 'attended'];
  if (!validStatuses.includes(newStatus)) {
    throw new ValidationError('Invalid booking status');
  }

  // Update status
  const result = await query(
    `UPDATE bookings 
     SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [newStatus, bookingId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Booking');
  }

  return result.rows[0];
}
```

### Status Transitions with Business Logic

**Important:** Some status changes need special handling

```typescript
// Example: Cancellation with capacity restoration
export async function cancelUserBooking(
  bookingId: string,
  userId: string
): Promise<{ booking: Booking; refundAmount: number }> {
  // Get booking details
  const booking = await getBookingById(bookingId);
  
  // Verify ownership
  if (booking.user_id !== userId) {
    throw new ValidationError('Not authorized to cancel this booking');
  }
  
  // Cannot cancel attended bookings
  if (booking.status === 'attended') {
    throw new ValidationError('Cannot cancel attended booking');
  }
  
  // Use event service to properly restore capacity
  const cancelResult = await cancelBooking(bookingId, userId);
  
  // Calculate refund (example: 100% if >7 days before event)
  const daysUntilEvent = calculateDaysUntil(booking.event.event_date);
  const refundAmount = daysUntilEvent > 7 ? booking.total_price : 0;
  
  // Update booking status
  const updatedBooking = await updateBookingStatus(bookingId, 'cancelled');
  
  return {
    booking: updatedBooking,
    refundAmount,
  };
}
```

### Status-Based Queries

```typescript
// Get all confirmed bookings for an event
const confirmed = await getUserBookings(userId, {
  status: 'confirmed',
});

// Count by status
const statusCounts = await query(`
  SELECT status, COUNT(*) as count
  FROM bookings
  WHERE user_id = $1
  GROUP BY status
`, [userId]);

// Result: [
//   { status: 'confirmed', count: 5 },
//   { status: 'cancelled', count: 2 },
//   { status: 'attended', count: 3 }
// ]
```

---

## 6. Analytics and Reporting

### Counting Bookings

```typescript
export async function getEventBookingCount(
  eventId: string,
  status?: string
): Promise<number> {
  let queryText = 'SELECT COUNT(*) as count FROM bookings WHERE event_id = $1';
  const params: any[] = [eventId];

  if (status) {
    queryText += ' AND status = $2';
    params.push(status);
  }

  const result = await query(queryText, params);
  return parseInt(result.rows[0].count, 10);
}

// Usage:
const totalBookings = await getEventBookingCount(eventId);
const confirmedBookings = await getEventBookingCount(eventId, 'confirmed');
```

### Calculating Total Attendees

**Important Distinction:** Bookings vs Attendees

```
Event: Yoga Workshop
Booking 1: User A, 3 attendees
Booking 2: User B, 2 attendees
Booking 3: User C, 1 attendee
Total Bookings: 3
Total Attendees: 6
```

```typescript
export async function getEventTotalAttendees(
  eventId: string,
  includeStatuses: string[] = ['confirmed', 'pending']
): Promise<number> {
  const result = await query(
    `SELECT COALESCE(SUM(attendees), 0) as total
     FROM bookings
     WHERE event_id = $1 AND status = ANY($2)`,
    [eventId, includeStatuses]
  );

  return parseInt(result.rows[0].total, 10);
}

// Usage:
const totalAttendees = await getEventTotalAttendees(eventId);
const confirmedAttendees = await getEventTotalAttendees(eventId, ['confirmed']);
```

### Building Admin Dashboards

```typescript
// Event management page data
async function getEventStats(eventId: string) {
  const [
    totalBookings,
    confirmedBookings,
    totalAttendees,
    revenue
  ] = await Promise.all([
    getEventBookingCount(eventId),
    getEventBookingCount(eventId, 'confirmed'),
    getEventTotalAttendees(eventId, ['confirmed']),
    query('SELECT SUM(total_price) as revenue FROM bookings WHERE event_id = $1 AND status = $2', [eventId, 'confirmed'])
  ]);

  return {
    totalBookings,
    confirmedBookings,
    totalAttendees,
    revenue: revenue.rows[0].revenue || 0,
  };
}

// Usage in admin page
const stats = await getEventStats(eventId);
// {
//   totalBookings: 15,
//   confirmedBookings: 12,
//   totalAttendees: 28,
//   revenue: 1499.88
// }
```

### Time-Based Analytics

```typescript
// Bookings per day for the last 30 days
const dailyBookings = await query(`
  SELECT 
    DATE(created_at) as booking_date,
    COUNT(*) as bookings,
    SUM(attendees) as attendees,
    SUM(total_price) as revenue
  FROM bookings
  WHERE event_id = $1
    AND created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY booking_date DESC
`, [eventId]);

// Result:
// [
//   { booking_date: '2025-11-01', bookings: 5, attendees: 12, revenue: 599.95 },
//   { booking_date: '2025-10-31', bookings: 3, attendees: 7, revenue: 349.97 },
//   ...
// ]
```

---

## 7. Testing Service Integration

### Testing Wrapper Functions

When testing a service that wraps another service, you need to ensure both work together correctly.

```typescript
describe('createBooking', () => {
  it('should create a booking and integrate with event service', async () => {
    // Setup: Create test user and event
    const user = await createTestUser();
    const event = await createTestEvent({ capacity: 10 });

    // Test: Create booking through booking service
    const booking = await createBooking({
      userId: user.id,
      eventId: event.id,
      attendees: 2,
    });

    // Verify: Booking created
    expect(booking.id).toBeDefined();
    expect(booking.user_id).toBe(user.id);
    expect(booking.event_id).toBe(event.id);
    expect(booking.attendees).toBe(2);

    // Verify: Event capacity updated (integration with event service)
    const updatedEvent = await getEventById(event.id);
    expect(updatedEvent.available_spots).toBe(8); // 10 - 2
  });
});
```

### Testing Error Propagation

```typescript
describe('Error Handling', () => {
  it('should propagate ConflictError from event service', async () => {
    const user = await createTestUser();
    const event = await createTestEvent({ capacity: 10 });

    // Create first booking
    await createBooking({
      userId: user.id,
      eventId: event.id,
    });

    // Try to create duplicate
    await expect(
      createBooking({
        userId: user.id,
        eventId: event.id, // Same event, same user
      })
    ).rejects.toThrow(ConflictError);
    // Should throw ConflictError, not DatabaseError
  });
});
```

### Testing with Order Integration

```typescript
describe('Order Integration', () => {
  it('should create booking with order reference', async () => {
    const user = await createTestUser();
    const event = await createTestEvent();
    const order = await createTestOrder({ userId: user.id });

    const booking = await createBooking({
      userId: user.id,
      eventId: event.id,
      orderId: order.id,
      status: 'confirmed',
    });

    expect(booking.order_id).toBe(order.id);
    expect(booking.status).toBe('confirmed');
  });
});
```

### Testing Pagination

```typescript
describe('getUserBookings pagination', () => {
  beforeAll(async () => {
    // Create user with 10 bookings
    const user = await createTestUser();
    for (let i = 0; i < 10; i++) {
      const event = await createTestEvent({ slug: `event-${i}` });
      await createBooking({ userId: user.id, eventId: event.id });
    }
  });

  it('should return first page of bookings', async () => {
    const page1 = await getUserBookings(userId, { limit: 5, offset: 0 });
    expect(page1).toHaveLength(5);
  });

  it('should return second page of bookings', async () => {
    const page2 = await getUserBookings(userId, { limit: 5, offset: 5 });
    expect(page2).toHaveLength(5);
  });

  it('should return different bookings for each page', async () => {
    const page1 = await getUserBookings(userId, { limit: 5, offset: 0 });
    const page2 = await getUserBookings(userId, { limit: 5, offset: 5 });
    
    const page1Ids = page1.map(b => b.id);
    const page2Ids = page2.map(b => b.id);
    
    // No overlap between pages
    expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
  });
});
```

---

## 8. Best Practices

### 1. Validate Early

```typescript
export async function createBooking(options: CreateBookingOptions) {
  // Validate BEFORE making any database calls
  if (!options.userId || !options.eventId) {
    throw new ValidationError('User ID and Event ID are required');
  }

  if (options.attendees && options.attendees < 1) {
    throw new ValidationError('Attendees must be at least 1');
  }

  // Now proceed with database operations
  // ...
}
```

### 2. Use TypeScript for Safety

```typescript
// Define strict types for function options
export interface CreateBookingOptions {
  userId: string;              // Required
  eventId: string;             // Required
  attendees?: number;          // Optional with default
  orderId?: string;            // Optional
  status?: 'pending' | 'confirmed';  // Optional, enum type
}

// TypeScript will catch errors at compile time
createBooking({
  userId: '123',
  eventId: '456',
  status: 'invalid', // ❌ Type error!
});
```

### 3. Provide Sensible Defaults

```typescript
export async function getUserBookings(
  userId: string,
  filters?: {
    status?: string;
    includeEvent?: boolean;    // Default: true
    limit?: number;            // Default: 50
    offset?: number;           // Default: 0
  }
) {
  const {
    status,
    includeEvent = true,       // Most common use case
    limit = 50,                // Reasonable page size
    offset = 0,                // Start from beginning
  } = filters || {};

  // ...
}
```

### 4. Handle All Error Cases

```typescript
try {
  const booking = await createBooking(options);
  return booking;
} catch (error) {
  // Handle known errors
  if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
    throw error;
  }
  
  if (error instanceof ConflictError) {
    console.error('Conflict error:', error.message);
    throw error;
  }
  
  if (error instanceof NotFoundError) {
    console.error('Not found error:', error.message);
    throw error;
  }
  
  // Log and wrap unexpected errors
  console.error('Unexpected error:', error);
  throw new DatabaseError('Failed to create booking');
}
```

### 5. Write Comprehensive Tests

```typescript
describe('createBooking', () => {
  // Happy path
  it('should create booking successfully', async () => { /* ... */ });
  
  // Edge cases
  it('should handle missing userId', async () => { /* ... */ });
  it('should handle missing eventId', async () => { /* ... */ });
  it('should handle invalid attendees', async () => { /* ... */ });
  
  // Business logic
  it('should prevent duplicate bookings', async () => { /* ... */ });
  it('should enforce capacity limits', async () => { /* ... */ });
  
  // Integration
  it('should update event capacity', async () => { /* ... */ });
  it('should integrate with orders', async () => { /* ... */ });
});
```

### 6. Document Your API

```typescript
/**
 * Create a new booking for an event
 * 
 * This is a higher-level wrapper around the event service's bookEvent function
 * that adds order integration and returns a full booking object.
 * 
 * @param options - Booking creation options
 * @param options.userId - User UUID making the booking
 * @param options.eventId - Event UUID to book
 * @param options.attendees - Number of attendees (default: 1)
 * @param options.orderId - Optional order reference for payment
 * @param options.status - Initial status (default: 'pending')
 * 
 * @returns Created booking with full details
 * 
 * @throws ValidationError if parameters are invalid
 * @throws NotFoundError if event doesn't exist
 * @throws ConflictError if capacity exceeded or duplicate booking
 * @throws DatabaseError if database operation fails
 * 
 * @example
 * // Simple booking
 * const booking = await createBooking({
 *   userId: 'user-123',
 *   eventId: 'event-456'
 * });
 * 
 * @example
 * // Booking with order integration
 * const booking = await createBooking({
 *   userId: 'user-123',
 *   eventId: 'event-456',
 *   attendees: 3,
 *   orderId: 'order-789',
 *   status: 'confirmed'
 * });
 */
export async function createBooking(
  options: CreateBookingOptions
): Promise<Booking> {
  // Implementation...
}
```

### 7. Log Important Events

```typescript
export async function createBooking(options: CreateBookingOptions) {
  console.log('[Bookings] Creating booking:', {
    userId: options.userId,
    eventId: options.eventId,
    attendees: options.attendees,
  });

  try {
    const booking = await createEventBooking(/* ... */);
    
    console.log('[Bookings] Booking created successfully:', booking.id);
    return booking;
    
  } catch (error) {
    console.error('[Bookings] Error creating booking:', error);
    throw error;
  }
}
```

### 8. Keep Functions Focused

Each function should do ONE thing well:

```typescript
// ❌ BAD: Function does too much
export async function createBookingAndNotify(options: CreateBookingOptions) {
  const booking = await createBooking(options);
  await sendEmail(booking);
  await sendWhatsApp(booking);
  await updateAnalytics(booking);
  return booking;
}

// ✅ GOOD: Separate concerns
export async function createBooking(options: CreateBookingOptions) {
  return await createEventBooking(/* ... */);
}

// Call separately in your route/controller
const booking = await createBooking(options);
await sendEmail(booking);
await sendWhatsApp(booking);
await updateAnalytics(booking);
```

---

## Conclusion

You've learned how to build a robust booking management service with:

- **Service Layer Architecture:** Clean separation of business logic
- **Integration Patterns:** Wrapper pattern for extending functionality
- **Flexible Data Loading:** Optional joins for performance
- **Notification Tracking:** Multi-channel notification management
- **Status Management:** Booking lifecycle and transitions
- **Analytics:** Counting, aggregation, and reporting
- **Testing:** Comprehensive testing strategies
- **Best Practices:** Production-ready code patterns

These patterns are applicable to any service layer implementation, not just booking systems. Use them as a foundation for building scalable, maintainable services in your applications.

## Next Steps

1. **Extend the Service:** Add waitlist management, recurring bookings, or guest bookings
2. **Add Caching:** Implement Redis caching for frequently accessed data
3. **Build Admin UI:** Create admin pages for booking management
4. **Add Webhooks:** Send webhook notifications for booking events
5. **Implement Batch Operations:** Support bulk booking operations

Happy coding! 🚀
