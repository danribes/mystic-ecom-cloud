# T083: Event Booking API - Learning Guide

## Table of Contents
1. [Introduction](#introduction)
2. [REST API Fundamentals](#rest-api-fundamentals)
3. [Request Validation Patterns](#request-validation-patterns)
4. [Authentication & Authorization](#authentication--authorization)
5. [Database Transactions](#database-transactions)
6. [Error Handling & HTTP Status Codes](#error-handling--http-status-codes)
7. [Payment Integration](#payment-integration)
8. [API Response Design](#api-response-design)
9. [Security Best Practices](#security-best-practices)
10. [Testing API Endpoints](#testing-api-endpoints)
11. [Real-World Applications](#real-world-applications)

---

## Introduction

This guide teaches you how to build production-ready REST API endpoints for complex operations like event booking, e-commerce checkout, or reservation systems. These patterns apply to any scenario requiring validation, authentication, database transactions, and third-party integrations.

**What You'll Learn:**
- RESTful API design principles
- Multi-layered input validation
- Session-based authentication
- ACID-compliant database transactions
- Payment gateway integration (Stripe)
- Comprehensive error handling
- API testing strategies

---

## REST API Fundamentals

### What is REST?

**REST** (Representational State Transfer) is an architectural style for designing networked applications.

**Core Principles**:
1. **Stateless**: Each request contains all information needed
2. **Resource-Based**: URLs identify resources (nouns, not verbs)
3. **HTTP Methods**: Use standard methods (GET, POST, PUT, DELETE)
4. **Standard Status Codes**: Use HTTP status codes correctly
5. **JSON Representation**: Use JSON for data exchange

### HTTP Methods

**GET**: Retrieve data (read-only, idempotent)
```
GET /api/events/123
```

**POST**: Create resources (not idempotent)
```
POST /api/events/book
```

**PUT**: Update entire resource (idempotent)
```
PUT /api/events/123
```

**PATCH**: Update partial resource
```
PATCH /api/events/123
```

**DELETE**: Remove resource (idempotent)
```
DELETE /api/events/123
```

### Astro API Routes

Astro supports file-based API routing in `src/pages/api/`:

**File Structure**:
```
src/pages/api/
  events/
    book.ts       → POST /api/events/book
    [id].ts       → GET /api/events/:id
    index.ts      → GET /api/events
```

**Basic API Route**:
```typescript
import type { APIRoute } from 'astro';

export const prerender = false; // Disable static generation

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Resource Naming Conventions

**Good** (Nouns, plural):
```
GET    /api/events          # List events
GET    /api/events/123      # Get specific event
POST   /api/events          # Create event
POST   /api/events/book     # Book event (action on resource)
DELETE /api/events/123      # Delete event
```

**Bad** (Verbs):
```
GET    /api/getEvents       # Don't use verbs
POST   /api/createEvent     # Resource name should be noun
POST   /api/doBooking       # Avoid action verbs
DELETE /api/deleteEvent/123 # HTTP method conveys action
```

---

## Request Validation Patterns

### The Validation Pyramid

Validate requests in layers from cheapest to most expensive:

```
1. Format Validation     ← Fastest (regex, type checks)
2. Business Rules        ← Fast (logic checks)
3. Database Validation   ← Slower (DB queries)
4. External APIs         ← Slowest (network calls)
```

### Layer 1: Format Validation

Check data types and formats before processing:

```typescript
// UUID validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id: string): boolean {
  return uuidRegex.test(id);
}

// Email validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation (E.164 format)
function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}
```

**Usage in API**:
```typescript
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  
  // Format validation first
  if (!validateUUID(body.eventId)) {
    return new Response(JSON.stringify({
      error: 'Invalid event ID format',
      details: { field: 'eventId', issue: 'invalid_format' }
    }), { status: 400 });
  }
  
  // Continue with business logic...
};
```

### Layer 2: Business Rules

Validate against business constraints:

```typescript
function validateAttendees(count: number): {
  valid: boolean;
  error?: string;
} {
  if (typeof count !== 'number') {
    return { valid: false, error: 'Attendees must be a number' };
  }
  
  if (count < 1) {
    return { valid: false, error: 'At least 1 attendee required' };
  }
  
  if (count > 10) {
    return { valid: false, error: 'Maximum 10 attendees per booking' };
  }
  
  return { valid: true };
}

function validateBookingDate(date: Date): {
  valid: boolean;
  error?: string;
} {
  const now = new Date();
  const maxFuture = new Date();
  maxFuture.setFullYear(maxFuture.getFullYear() + 2);
  
  if (date <= now) {
    return { valid: false, error: 'Booking date must be in future' };
  }
  
  if (date > maxFuture) {
    return { valid: false, error: 'Cannot book more than 2 years ahead' };
  }
  
  return { valid: true };
}
```

### Layer 3: Database Validation

Query database to validate existence and relationships:

```typescript
async function validateBookingRequest(
  eventId: string,
  userId: string,
  attendees: number
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Check event exists
  const event = await getEventById(eventId);
  if (!event) {
    errors.push('Event not found');
    return { valid: false, errors };
  }
  
  // Check event is published
  if (!event.is_published) {
    errors.push('Event is not available');
  }
  
  // Check capacity
  if (event.available_spots < attendees) {
    errors.push(`Only ${event.available_spots} spots available`);
  }
  
  // Check for duplicate booking
  const existing = await hasExistingBooking(userId, eventId);
  if (existing) {
    errors.push('You already have a booking for this event');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Validation Error Responses

Provide detailed, actionable error messages:

```typescript
interface ValidationError {
  field: string;    // Which field failed
  issue: string;    // What's wrong
  message: string;  // User-friendly message
}

function createValidationError(
  field: string,
  issue: string,
  message: string
): Response {
  return new Response(JSON.stringify({
    success: false,
    error: 'Validation error',
    message,
    details: { field, issue }
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Usage
if (!eventId) {
  return createValidationError(
    'eventId',
    'missing',
    'Event ID is required'
  );
}

if (attendees > 10) {
  return createValidationError(
    'attendees',
    'exceeds_maximum',
    'Maximum 10 attendees per booking'
  );
}
```

---

## Authentication & Authorization

### Session-Based Authentication

**How It Works**:
1. User logs in → Server creates session → Stores in Redis
2. Server sends session ID in HTTP-only cookie
3. Browser automatically includes cookie in requests
4. Server validates session for each request

**Implementation**:

```typescript
import { getSessionFromRequest } from '@/lib/auth/session';

export const POST: APIRoute = async ({ request, cookies }) => {
  // 1. Get session from cookie
  const session = await getSessionFromRequest(cookies);
  
  // 2. Check if session exists
  if (!session) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Authentication required',
      message: 'You must be logged in'
    }), { status: 401 });
  }
  
  // 3. Use session data
  const userId = session.userId;
  const userEmail = session.email;
  
  // Continue with authenticated request...
};
```

**Session Data Structure**:
```typescript
interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: number;
  lastActivity: number;
}
```

### Authorization (Permissions)

**Check user roles/permissions after authentication**:

```typescript
export const POST: APIRoute = async ({ cookies }) => {
  const session = await getSessionFromRequest(cookies);
  
  if (!session) {
    return new Response(JSON.stringify({
      error: 'Authentication required'
    }), { status: 401 });
  }
  
  // Authorization: Check role
  if (session.role !== 'admin') {
    return new Response(JSON.stringify({
      error: 'Forbidden',
      message: 'Admin access required'
    }), { status: 403 });
  }
  
  // User is authenticated AND authorized
};
```

### Token-Based Authentication (Alternative)

**JWT (JSON Web Tokens)**:

```typescript
import jwt from 'jsonwebtoken';

function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded as { userId: string };
  } catch (error) {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({
      error: 'Missing or invalid authorization header'
    }), { status: 401 });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer '
  const user = verifyToken(token);
  
  if (!user) {
    return new Response(JSON.stringify({
      error: 'Invalid or expired token'
    }), { status: 401 });
  }
  
  // Continue with authenticated request...
};
```

### API Key Authentication

**For machine-to-machine communication**:

```typescript
export const POST: APIRoute = async ({ request }) => {
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'API key required'
    }), { status: 401 });
  }
  
  // Validate API key (check database or environment)
  const isValid = await validateAPIKey(apiKey);
  
  if (!isValid) {
    return new Response(JSON.stringify({
      error: 'Invalid API key'
    }), { status: 401 });
  }
  
  // Continue...
};
```

---

## Database Transactions

### What Are Transactions?

**ACID Properties**:
- **Atomicity**: All operations succeed or all fail
- **Consistency**: Data remains valid
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed changes persist

### Why Use Transactions?

**Scenario**: Booking an event requires two operations:
1. Create booking record
2. Decrement available spots

**Without Transaction**:
```typescript
// ❌ WRONG: Race condition possible
await createBooking(userId, eventId);
await updateCapacity(eventId, -1);
// If second operation fails, booking exists but capacity unchanged!
```

**With Transaction**:
```typescript
// ✅ CORRECT: Atomic operation
await transaction(async (client) => {
  await client.query('INSERT INTO bookings...');
  await client.query('UPDATE events SET available_spots...');
  // Both succeed or both fail
});
```

### Basic Transaction Pattern

```typescript
import { Pool } from 'pg';

const pool = new Pool({ /* config */ });

async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Transaction with Row Locking

**Prevent race conditions with `FOR UPDATE`**:

```typescript
async function bookEvent(
  userId: string,
  eventId: string,
  attendees: number
) {
  return transaction(async (client) => {
    // 1. Lock event row (prevents concurrent bookings)
    const eventResult = await client.query(
      `SELECT id, available_spots, capacity
       FROM events
       WHERE id = $1
       FOR UPDATE`, // 🔒 Lock until transaction completes
      [eventId]
    );
    
    if (eventResult.rows.length === 0) {
      throw new NotFoundError('Event');
    }
    
    const event = eventResult.rows[0];
    
    // 2. Check capacity
    if (event.available_spots < attendees) {
      throw new ConflictError('Insufficient capacity');
    }
    
    // 3. Create booking
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, event_id, attendees)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, eventId, attendees]
    );
    
    // 4. Update capacity
    await client.query(
      `UPDATE events
       SET available_spots = available_spots - $1
       WHERE id = $2`,
      [attendees, eventId]
    );
    
    return bookingResult.rows[0];
  });
}
```

**What `FOR UPDATE` Does**:
- Locks selected rows
- Other transactions wait until this transaction completes
- Prevents double-booking of last spot

### Nested Transactions (Savepoints)

```typescript
async function complexOperation() {
  return transaction(async (client) => {
    // Main operation
    await client.query('INSERT INTO orders...');
    
    try {
      // Savepoint for sub-operation
      await client.query('SAVEPOINT sp1');
      await client.query('INSERT INTO order_items...');
      await client.query('RELEASE SAVEPOINT sp1');
    } catch (error) {
      // Rollback only sub-operation
      await client.query('ROLLBACK TO SAVEPOINT sp1');
      // Main operation still proceeds
    }
    
    // Complete main operation
    await client.query('UPDATE inventory...');
  });
}
```

---

## Error Handling & HTTP Status Codes

### HTTP Status Code Hierarchy

**2xx Success**:
- `200 OK`: Request succeeded
- `201 Created`: Resource created
- `204 No Content`: Success, no response body

**4xx Client Errors**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity`: Semantic error
- `429 Too Many Requests`: Rate limit exceeded

**5xx Server Errors**:
- `500 Internal Server Error`: Unexpected error
- `502 Bad Gateway`: Upstream service failed
- `503 Service Unavailable`: Server overloaded
- `504 Gateway Timeout`: Upstream timeout

### Custom Error Classes

**Define domain-specific errors**:

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}
```

### Centralized Error Handler

**Handle errors consistently**:

```typescript
export const POST: APIRoute = async ({ request }) => {
  try {
    // API logic here
    const result = await processRequest(request);
    
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), { status: 200 });
    
  } catch (error) {
    return handleError(error);
  }
};

function handleError(error: unknown): Response {
  // Handle known error types
  if (error instanceof ValidationError) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Validation error',
      message: error.message,
    }), { status: 400 });
  }
  
  if (error instanceof NotFoundError) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Not found',
      message: error.message,
    }), { status: 404 });
  }
  
  if (error instanceof ConflictError) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Conflict',
      message: error.message,
    }), { status: 409 });
  }
  
  // Unknown error
  console.error('[API Error]', error);
  
  return new Response(JSON.stringify({
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  }), { status: 500 });
}
```

### Error Logging

**Log errors for debugging**:

```typescript
function logError(error: unknown, context: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const errorInfo = error instanceof Error ? {
    name: error.name,
    message: error.message,
    stack: error.stack,
  } : { error };
  
  console.error(JSON.stringify({
    timestamp,
    level: 'error',
    ...errorInfo,
    context,
  }));
  
  // In production, send to error tracking (Sentry, etc.)
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error);
  }
}
```

---

## Payment Integration

### Stripe Payment Flow

**Two-Phase Payment**:
1. **Create Payment Intent** (server-side)
2. **Confirm Payment** (client-side)

**Why Two-Phase?**:
- PCI compliance (card data never touches your server)
- Client-side error handling
- Support multiple payment methods
- Better UX with real-time feedback

### Create Payment Intent

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function createPaymentIntent(
  orderId: string,
  amount: number, // in cents
  currency: string = 'usd'
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId,
      // Add any metadata for tracking
    },
  });
}
```

**Usage in API**:
```typescript
export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSessionFromRequest(cookies);
  const { eventId, attendees } = await request.json();
  
  // 1. Create booking
  const booking = await bookEvent(session.userId, eventId, attendees);
  
  // 2. Calculate price
  const event = await getEventById(eventId);
  const totalPrice = event.price * attendees;
  const amountInCents = Math.round(totalPrice * 100);
  
  // 3. Create payment intent
  const paymentIntent = await createPaymentIntent(
    booking.id,
    amountInCents
  );
  
  // 4. Return client secret for client-side confirmation
  return new Response(JSON.stringify({
    success: true,
    data: {
      booking,
      payment: {
        clientSecret: paymentIntent.client_secret,
        amount: amountInCents,
      },
    },
  }), { status: 200 });
};
```

### Client-Side Payment Confirmation

```typescript
// Client-side code
const stripe = Stripe(publishableKey);

async function completeBooking() {
  // 1. Create booking (API call)
  const response = await fetch('/api/events/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, attendees }),
    credentials: 'include',
  });
  
  const { data } = await response.json();
  
  // 2. Confirm payment with Stripe
  const { error } = await stripe.confirmCardPayment(
    data.payment.clientSecret,
    {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: userName,
          email: userEmail,
        },
      },
    }
  );
  
  if (error) {
    // Show error to user
    showError(error.message);
  } else {
    // Payment succeeded
    window.location.href = `/bookings/${data.booking.id}`;
  }
}
```

### Webhook Handling

**Process payment events from Stripe**:

```typescript
import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    return new Response('Webhook signature verification failed', {
      status: 400
    });
  }
  
  // Handle event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(paymentIntent);
      break;
      
    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(failedIntent);
      break;
  }
  
  return new Response(JSON.stringify({ received: true }), {
    status: 200
  });
};

async function handlePaymentSuccess(
  paymentIntent: Stripe.PaymentIntent
) {
  const bookingId = paymentIntent.metadata.orderId;
  
  // Update booking status
  await updateBookingStatus(bookingId, 'confirmed');
  
  // Send confirmation email
  await sendConfirmationEmail(bookingId);
  
  // Send WhatsApp notification
  await sendWhatsAppNotification(bookingId);
}
```

---

## API Response Design

### Consistent Response Structure

**Success Response**:
```typescript
{
  success: true,
  message?: string,
  data: {
    // Response data
  }
}
```

**Error Response**:
```typescript
{
  success: false,
  error: string,      // Error category
  message: string,    // User-friendly message
  details?: {         // Optional field-specific details
    field: string,
    issue: string,
  }
}
```

### Response Type Definitions

```typescript
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: Record<string, any>;
}

type BookingResponse = ApiResponse<{
  booking: Booking;
  payment: PaymentData;
}>;

type ErrorResponse = ApiResponse<never>;
```

### Helper Functions

```typescript
function successResponse<T>(
  data: T,
  message?: string
): Response {
  return new Response(JSON.stringify({
    success: true,
    message,
    data,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function errorResponse(
  error: string,
  message: string,
  status: number,
  details?: Record<string, any>
): Response {
  return new Response(JSON.stringify({
    success: false,
    error,
    message,
    details,
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**Usage**:
```typescript
export const POST: APIRoute = async ({ request }) => {
  try {
    const result = await processRequest(request);
    return successResponse(result, 'Operation completed');
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(
        'Validation error',
        error.message,
        400,
        { field: error.field }
      );
    }
    return errorResponse(
      'Internal error',
      'Something went wrong',
      500
    );
  }
};
```

---

## Security Best Practices

### 1. Input Sanitization

**Never trust client input**:

```typescript
import { escape } from 'html-escaper';

function sanitizeInput(input: string): string {
  // Remove HTML tags
  return escape(input.trim());
}

// Usage
const userInput = sanitizeInput(body.comment);
```

### 2. SQL Injection Prevention

**Always use parameterized queries**:

```typescript
// ❌ WRONG: SQL injection vulnerability
const result = await query(
  `SELECT * FROM users WHERE email = '${email}'`
);

// ✅ CORRECT: Parameterized query
const result = await query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

### 3. Rate Limiting

**Prevent abuse with rate limits**:

```typescript
import { RateLimiter } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiter({
  points: 5,              // 5 requests
  duration: 60,           // per 60 seconds
  blockDuration: 300,     // Block for 5 minutes if exceeded
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    await rateLimiter.consume(clientAddress);
    // Process request
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Too many requests',
      message: 'Please try again later',
    }), { status: 429 });
  }
};
```

### 4. CORS Configuration

**Control cross-origin requests**:

```typescript
export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://yourdomain.com',
    'https://app.yourdomain.com',
  ];
  
  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Process request
  const response = await handleRequest(request);
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
};
```

### 5. Secrets Management

**Never hardcode secrets**:

```typescript
// ❌ WRONG
const apiKey = 'sk_live_abc123...';

// ✅ CORRECT
const apiKey = process.env.STRIPE_SECRET_KEY;

if (!apiKey) {
  throw new Error('STRIPE_SECRET_KEY not configured');
}
```

---

## Testing API Endpoints

### Unit Testing

**Test helper functions independently**:

```typescript
import { describe, it, expect } from 'vitest';

describe('validateUUID', () => {
  it('should validate correct UUID', () => {
    const valid = validateUUID('123e4567-e89b-12d3-a456-426614174000');
    expect(valid).toBe(true);
  });
  
  it('should reject invalid UUID', () => {
    const valid = validateUUID('not-a-uuid');
    expect(valid).toBe(false);
  });
});

describe('calculatePrice', () => {
  it('should calculate price correctly', () => {
    const price = calculatePrice(50, 3);
    expect(price).toBe(150);
  });
  
  it('should convert to cents', () => {
    const cents = convertToCents(49.99);
    expect(cents).toBe(4999);
  });
});
```

### Integration Testing

**Test full API endpoint**:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('POST /api/events/book', () => {
  let sessionCookie: string;
  
  beforeAll(async () => {
    // Login to get session
    const response = await fetch('http://localhost:4321/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });
    
    sessionCookie = response.headers.get('set-cookie')!;
  });
  
  it('should create booking successfully', async () => {
    const response = await fetch('http://localhost:4321/api/events/book', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
      },
      body: JSON.stringify({
        eventId: 'valid-event-id',
        attendees: 2,
      }),
    });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.booking).toBeDefined();
    expect(data.data.payment.clientSecret).toBeDefined();
  });
  
  it('should reject without authentication', async () => {
    const response = await fetch('http://localhost:4321/api/events/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: 'valid-event-id',
        attendees: 2,
      }),
    });
    
    expect(response.status).toBe(401);
  });
});
```

---

## Real-World Applications

### E-Commerce Checkout

```typescript
export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSessionFromRequest(cookies);
  const { items, shippingAddress } = await request.json();
  
  // 1. Validate stock availability
  for (const item of items) {
    const product = await getProduct(item.productId);
    if (product.stock < item.quantity) {
      return errorResponse(
        'Insufficient stock',
        `Only ${product.stock} available for ${product.name}`,
        409
      );
    }
  }
  
  // 2. Create order in transaction
  const order = await transaction(async (client) => {
    // Create order
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id',
      [session.userId, calculateTotal(items)]
    );
    
    // Add order items
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)',
        [orderResult.rows[0].id, item.productId, item.quantity]
      );
      
      // Decrement stock
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.productId]
      );
    }
    
    return orderResult.rows[0];
  });
  
  // 3. Create payment intent
  const paymentIntent = await createPaymentIntent(
    order.id,
    calculateTotal(items)
  );
  
  return successResponse({
    order,
    payment: { clientSecret: paymentIntent.client_secret },
  });
};
```

### Restaurant Reservation

```typescript
export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSessionFromRequest(cookies);
  const { restaurantId, dateTime, partySize } = await request.json();
  
  // 1. Check availability
  const available = await checkTableAvailability(
    restaurantId,
    dateTime,
    partySize
  );
  
  if (!available) {
    return errorResponse(
      'No availability',
      'No tables available at this time',
      409
    );
  }
  
  // 2. Create reservation
  const reservation = await transaction(async (client) => {
    // Find and reserve table
    const table = await client.query(
      `SELECT id FROM tables
       WHERE restaurant_id = $1
       AND capacity >= $2
       AND id NOT IN (
         SELECT table_id FROM reservations
         WHERE date_time = $3
       )
       LIMIT 1
       FOR UPDATE`,
      [restaurantId, partySize, dateTime]
    );
    
    if (table.rows.length === 0) {
      throw new ConflictError('No suitable table available');
    }
    
    // Create reservation
    return client.query(
      `INSERT INTO reservations (user_id, restaurant_id, table_id, date_time, party_size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [session.userId, restaurantId, table.rows[0].id, dateTime, partySize]
    );
  });
  
  // 3. Send confirmation
  await sendReservationConfirmation(session.email, reservation);
  
  return successResponse({ reservation });
};
```

### Subscription Management

```typescript
export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await getSessionFromRequest(cookies);
  const { planId } = await request.json();
  
  // 1. Get plan details
  const plan = await getPlan(planId);
  
  // 2. Create Stripe subscription
  const subscription = await stripe.subscriptions.create({
    customer: session.stripeCustomerId,
    items: [{ price: plan.stripePriceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
  
  // 3. Create subscription record
  await transaction(async (client) => {
    // Cancel existing subscriptions
    await client.query(
      'UPDATE subscriptions SET status = $1 WHERE user_id = $2',
      ['cancelled', session.userId]
    );
    
    // Create new subscription
    await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, stripe_subscription_id, status)
       VALUES ($1, $2, $3, $4)`,
      [session.userId, planId, subscription.id, 'pending']
    );
  });
  
  return successResponse({
    subscription,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
  });
};
```

---

## Conclusion

This guide covered essential patterns for building robust REST APIs:

✅ **RESTful design** with proper HTTP methods and status codes  
✅ **Multi-layered validation** from format to business rules  
✅ **Session-based authentication** with secure cookies  
✅ **Database transactions** for data integrity  
✅ **Stripe integration** for secure payments  
✅ **Error handling** with custom error classes  
✅ **Security best practices** to prevent common vulnerabilities  
✅ **Comprehensive testing** strategies  

These patterns are fundamental to modern web development and applicable across any framework or project. Master these, and you'll build reliable, secure, and maintainable APIs.

**Next Steps:**
- Implement these patterns in your projects
- Add webhook handling for async operations
- Set up monitoring and logging
- Implement rate limiting
- Add API documentation (OpenAPI/Swagger)
