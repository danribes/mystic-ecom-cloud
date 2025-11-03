# T072: Admin Orders API Endpoint - Learning Guide

**Learning Objective**: Understand how to build secure REST API endpoints with filtering, validation, and multiple output formats in Astro.

---

## Table of Contents

1. [API Endpoint Architecture in Astro](#1-api-endpoint-architecture-in-astro)
2. [Authentication & Authorization Patterns](#2-authentication--authorization-patterns)
3. [Query Parameter Validation with Zod](#3-query-parameter-validation-with-zod)
4. [Service Layer Integration](#4-service-layer-integration)
5. [Multiple Response Formats](#5-multiple-response-formats)
6. [CSV Generation & Escaping](#6-csv-generation--escaping)
7. [API Testing Strategies](#7-api-testing-strategies)
8. [Security Considerations](#8-security-considerations)

---

## 1. API Endpoint Architecture in Astro

### File-Based Routing

Astro uses file-based routing for API endpoints:

```
src/pages/api/admin/orders.ts  →  GET /api/admin/orders
```

### Endpoint Structure

```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, url, cookies }) => {
  // 1. Authentication & Authorization
  // 2. Parse & Validate Input
  // 3. Business Logic (via Service Layer)
  // 4. Format & Return Response
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Available HTTP Methods

```typescript
export const GET: APIRoute = async (context) => { ... };
export const POST: APIRoute = async (context) => { ... };
export const PUT: APIRoute = async (context) => { ... };
export const DELETE: APIRoute = async (context) => { ... };
export const PATCH: APIRoute = async (context) => { ... };
```

### Context Object

```typescript
{
  request: Request,      // Standard Web API Request
  url: URL,             // Parsed URL with searchParams
  cookies: AstroCookies, // Cookie management
  redirect: (url) => Response, // Helper for redirects
  locals: Record<string, any>  // Shared data from middleware
}
```

---

## 2. Authentication & Authorization Patterns

### Two-Layer Security Model

```typescript
// Layer 1: Authentication (Who are you?)
const session = await getSessionFromRequest(cookies);
if (!session) {
  return new Response(JSON.stringify({ error: 'Authentication required' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Layer 2: Authorization (What can you do?)
if (session.role !== 'admin') {
  return new Response(JSON.stringify({ error: 'Admin access required' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Session Management

```typescript
// Session stored in HTTP-only cookie
// getSessionFromRequest extracts and validates session
import { getSessionFromRequest } from '@/lib/auth/session';

const session = await getSessionFromRequest(cookies);
// Returns: { userId, email, name, role } | null
```

### HTTP Status Codes

- **401 Unauthorized**: No valid session (user not logged in)
- **403 Forbidden**: Valid session but insufficient permissions
- **200 OK**: Authorized and successful
- **400 Bad Request**: Invalid input parameters
- **500 Internal Server Error**: Server-side error

### Alternative: Middleware Approach

```typescript
// In src/middleware.ts
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname.startsWith('/api/admin')) {
    const session = await getSessionFromRequest(context.cookies);
    if (!session || session.role !== 'admin') {
      return new Response('Unauthorized', { status: 401 });
    }
  }
  return next();
});
```

**Trade-offs**:
- Middleware: DRY (applies to all admin routes), but less flexible
- Per-endpoint: More verbose, but fine-grained control

---

## 3. Query Parameter Validation with Zod

### Why Zod?

1. **Runtime Validation**: Catches invalid data at API boundary
2. **Type Inference**: TypeScript types automatically derived
3. **Transformations**: Convert strings to dates, numbers, etc.
4. **Clear Errors**: Helpful messages for API consumers

### Basic Schema

```typescript
import { z } from 'zod';

const QuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  search: z.string().optional(),
});
```

### Validation Flow

```typescript
// 1. Extract query parameters
const queryParams = Object.fromEntries(url.searchParams.entries());

// 2. Validate
const validatedQuery = QuerySchema.safeParse(queryParams);

// 3. Handle errors
if (!validatedQuery.success) {
  return new Response(
    JSON.stringify({
      error: 'Invalid query parameters',
      details: validatedQuery.error.errors
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

// 4. Use validated data (with TypeScript types!)
const { status, page, search } = validatedQuery.data;
```

### Advanced Transformations

```typescript
const OrdersQuerySchema = z.object({
  // String to Date transformation
  startDate: z.string()
    .optional()
    .transform(val => val ? new Date(val) : undefined),
  
  // String to number with default
  limit: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 20),
  
  // Enum with default
  format: z.enum(['json', 'csv'])
    .optional()
    .default('json'),
  
  // Array from comma-separated string
  tags: z.string()
    .optional()
    .transform(val => val ? val.split(',') : []),
});
```

### Error Response Format

```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "code": "invalid_enum_value",
      "options": ["pending", "completed", "cancelled"],
      "path": ["status"],
      "message": "Invalid enum value. Expected 'pending' | 'completed' | 'cancelled', received 'invalid_status'"
    }
  ]
}
```

---

## 4. Service Layer Integration

### Architecture Pattern

```
API Endpoint (thin)
    ↓
Service Layer (business logic)
    ↓
Database Access
```

### Benefits

1. **Separation of Concerns**: API handles HTTP, service handles business logic
2. **Reusability**: Same service used by multiple endpoints or pages
3. **Testability**: Service can be tested independently
4. **Consistency**: Business rules enforced in one place

### Example

```typescript
// ❌ BAD: Business logic in API endpoint
export const GET: APIRoute = async ({ url }) => {
  const pool = getPool();
  const result = await pool.query(`
    SELECT * FROM orders
    WHERE status = $1 AND created_at >= $2
    ...complex SQL...
  `, [status, startDate]);
  
  // Transform data...
  // Calculate totals...
  // etc.
};

// ✅ GOOD: Delegate to service layer
export const GET: APIRoute = async ({ url }) => {
  const filters = { status, startDate, endDate };
  const orders = await searchOrders(search, filters);
  
  return new Response(JSON.stringify({ success: true, data: orders }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Service Function Design

```typescript
// src/services/order.service.ts
export async function searchOrders(
  query: string,
  filters?: {
    status?: OrderStatus;
    startDate?: Date;
    endDate?: Date;
    itemType?: 'course' | 'event' | 'digital_product';
  }
): Promise<Order[]> {
  // Complex business logic here
  // Database queries
  // Data transformations
  // Error handling
  
  return orders;
}
```

**Benefits**:
- API endpoint stays under 200 lines
- Service function can be unit tested
- Same logic used in UI pages and API endpoints

---

## 5. Multiple Response Formats

### Content Negotiation Pattern

```typescript
export const GET: APIRoute = async ({ url }) => {
  const format = url.searchParams.get('format') || 'json';
  const data = await getData();
  
  if (format === 'csv') {
    return new Response(toCSV(data), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="data.csv"'
      }
    });
  }
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Response Type Indicators

| Format | Content-Type | Content-Disposition |
|--------|-------------|---------------------|
| JSON | `application/json` | (none) - displays in browser |
| CSV | `text/csv` | `attachment; filename="..."` - downloads |
| XML | `application/xml` | (depends on use case) |
| PDF | `application/pdf` | `attachment; filename="..."` |

### JSON Response Structure

```typescript
// Success response
{
  "success": true,
  "data": {
    "orders": [...],
    "count": 42,
    "filters": { ... }
  }
}

// Error response
{
  "error": "Error message",
  "details": [ ... ] // Optional, for validation errors
}
```

**Why wrap in `success` and `data`?**
- Consistent shape for all responses
- Easy to distinguish success from error
- Can add metadata (pagination, filters, etc.)

---

## 6. CSV Generation & Escaping

### CSV Format Basics

```
Header1,Header2,Header3
Value1,Value2,Value3
"Value with, comma",Value5,Value6
```

### Escaping Rules

1. **Commas**: Wrap value in quotes
2. **Quotes**: Double the quote (`" → ""`)
3. **Newlines**: Wrap value in quotes
4. **Null/Undefined**: Empty string

### Implementation

```typescript
function escapeCSV(value: any): string {
  // Handle null/undefined
  if (value === null || value === undefined) return '';
  
  // Convert to string
  const str = String(value);
  
  // Check if escaping needed
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    // Double internal quotes and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}
```

### CSV Generation Pattern

```typescript
function toCSV(data: any[]): string {
  if (data.length === 0) {
    return 'No data\n';
  }
  
  // 1. Define headers
  const headers = ['Column 1', 'Column 2', 'Column 3'];
  
  // 2. Map data to rows
  const rows = data.map(item => [
    escapeCSV(item.field1),
    escapeCSV(item.field2),
    escapeCSV(item.field3),
  ]);
  
  // 3. Combine headers and rows
  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}
```

### Currency Formatting

```typescript
// Database stores cents (integer)
const totalCents = 10692; // $106.92

// CSV should display dollars
const formatCurrency = (cents: number): string => {
  return (cents / 100).toFixed(2); // "106.92"
};
```

### Date Formatting

```typescript
// Database stores Date objects or timestamps
const createdAt = new Date('2025-11-01T10:30:00Z');

// CSV should use ISO 8601 (universally parseable)
const formatDate = (date: Date | string): string => {
  return new Date(date).toISOString(); // "2025-11-01T10:30:00.000Z"
};
```

### Multi-Value Fields

```typescript
// Order has multiple items
const order = {
  id: 'abc-123',
  items: [
    { itemType: 'course', itemTitle: 'Meditation 101' },
    { itemType: 'ebook', itemTitle: 'Mindfulness Guide' }
  ]
};

// CSV: Join with semicolon
const itemTypes = order.items.map(i => i.itemType).join('; '); // "course; ebook"
const itemTitles = order.items.map(i => i.itemTitle).join('; '); // "Meditation 101; Mindfulness Guide"
```

### Security: CSV Injection Prevention

**Threat**: Formulas in CSV files can execute code when opened in Excel

```csv
=1+1,user@example.com  ← Excel will evaluate this!
```

**Mitigation**: Escape leading special characters

```typescript
function escapeCSVFormula(value: string): string {
  // Escape leading =, +, -, @
  if (/^[=+\-@]/.test(value)) {
    return `'${value}`; // Add leading apostrophe
  }
  return value;
}
```

---

## 7. API Testing Strategies

### Test Pyramid for APIs

```
      /\
     /E2E\        ← Few (Integration + Auth)
    /------\
   /  API   \     ← Many (Endpoint logic)
  /----------\
 /   Unit     \   ← Most (Service/Utils)
/--------------\
```

### E2E API Testing with Playwright

#### Traditional Approach (Slow)

```typescript
test('filter orders', async ({ page }) => {
  // 1. Navigate to login page (~500ms)
  await page.goto('/login');
  
  // 2. Fill form (~300ms)
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'password123');
  
  // 3. Submit and wait for redirect (~1000ms)
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  
  // 4. Get cookies (~100ms)
  const cookies = await context.cookies();
  
  // 5. Make API call (~200ms)
  const response = await request.get('/api/admin/orders?status=completed', {
    headers: { 'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ') }
  });
  
  // Total: ~2 seconds per test
});
```

#### Optimized Approach (Fast)

```typescript
let adminCookies: string = '';

test.beforeAll(async ({ browser }) => {
  // Login ONCE for all tests
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAsUser(page, 'admin@test.com', 'password123');
  adminCookies = (await context.cookies()).map(c => `${c.name}=${c.value}`).join('; ');
  await context.close();
});

test('filter orders', async ({ request }) => {
  // Direct API call using cached cookies (~200ms)
  const response = await request.get('/api/admin/orders?status=completed', {
    headers: { 'Cookie': adminCookies }
  });
  
  // Total: ~0.2 seconds per test (10x faster!)
});
```

### Test Data Management

```typescript
test.beforeAll(async () => {
  // 1. Clean up existing test data
  await pool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
  
  // 2. Create test fixtures
  testUser = await createTestUser({ email: 'test@example.com' });
  testCourse = await createTestCourse({ title: 'Test Course' });
  testOrder = await createTestOrder({ userId: testUser.id });
});

test.afterAll(async () => {
  // 3. Clean up test data
  await cleanupTestUser(testUser.id);
  await pool.query('DELETE FROM courses WHERE id = $1', [testCourse.id]);
  await pool.query('DELETE FROM orders WHERE id = $1', [testOrder.id]);
});
```

### Assertions for API Responses

```typescript
test('should return orders', async ({ request }) => {
  const response = await request.get('/api/admin/orders');
  
  // 1. Status code
  expect(response.status()).toBe(200);
  
  // 2. Content type
  expect(response.headers()['content-type']).toContain('application/json');
  
  // 3. Response structure
  const json = await response.json();
  expect(json.success).toBe(true);
  expect(json.data).toBeDefined();
  expect(json.data.orders).toBeDefined();
  expect(Array.isArray(json.data.orders)).toBe(true);
  
  // 4. Data validation
  const order = json.data.orders[0];
  expect(order.id).toBeDefined();
  expect(order.status).toMatch(/pending|completed|cancelled/);
  expect(order.total).toBeGreaterThan(0);
  
  // 5. Business logic
  expect(json.data.count).toBe(json.data.orders.length);
});
```

---

## 8. Security Considerations

### Input Validation

```typescript
// ❌ BAD: Trusting user input
const status = url.searchParams.get('status');
const query = `SELECT * FROM orders WHERE status = '${status}'`; // SQL injection!

// ✅ GOOD: Validate with Zod
const validated = QuerySchema.safeParse(queryParams);
if (!validated.success) {
  return errorResponse(400, 'Invalid input');
}
const { status } = validated.data; // Type-safe, validated
```

### SQL Injection Prevention

```typescript
// ❌ BAD: String concatenation
const query = `SELECT * FROM orders WHERE user_email LIKE '%${search}%'`;

// ✅ GOOD: Parameterized queries
const query = 'SELECT * FROM orders WHERE user_email LIKE $1';
const params = [`%${search}%`];
await pool.query(query, params);
```

### Authentication Checks

```typescript
// ❌ BAD: Trusting headers
const isAdmin = request.headers.get('X-Admin') === 'true';

// ✅ GOOD: Server-side session validation
const session = await getSessionFromRequest(cookies);
const isAdmin = session?.role === 'admin';
```

### Rate Limiting (Future Enhancement)

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

export const GET: APIRoute = async (context) => {
  // Check rate limit
  await limiter(context.request);
  // ... rest of endpoint
};
```

### CORS for External Access

```typescript
export const GET: APIRoute = async () => {
  const response = new Response(JSON.stringify(data));
  
  // Allow specific origins
  response.headers.set('Access-Control-Allow-Origin', 'https://trusted-domain.com');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  
  return response;
};
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Not Handling Empty Results

```typescript
// ❌ BAD: Assumes data exists
const orders = await searchOrders(query);
const firstOrder = orders[0].id; // Error if orders is empty!

// ✅ GOOD: Check for empty
const orders = await searchOrders(query);
if (orders.length === 0) {
  return new Response(JSON.stringify({
    success: true,
    data: { orders: [], count: 0 }
  }), { status: 200 });
}
```

### Pitfall 2: Forgetting Error Handling

```typescript
// ❌ BAD: Unhandled errors crash the server
export const GET: APIRoute = async () => {
  const data = await getData(); // Might throw!
  return new Response(JSON.stringify(data));
};

// ✅ GOOD: Catch and return error response
export const GET: APIRoute = async () => {
  try {
    const data = await getData();
    return new Response(JSON.stringify({ success: true, data }));
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch data' }),
      { status: 500 }
    );
  }
};
```

### Pitfall 3: Inconsistent Response Formats

```typescript
// ❌ BAD: Different shapes for success/error
return orders; // Array
return { error: 'Failed' }; // Object

// ✅ GOOD: Consistent envelope
return { success: true, data: orders };
return { error: 'Failed' };
```

### Pitfall 4: Not Setting Content-Type

```typescript
// ❌ BAD: Browser guesses content type
return new Response(JSON.stringify(data));

// ✅ GOOD: Explicit content type
return new Response(JSON.stringify(data), {
  headers: { 'Content-Type': 'application/json' }
});
```

---

## Summary

Building a robust API endpoint requires:

1. **Clear Structure**: Follow REST principles, use proper HTTP methods and status codes
2. **Security First**: Authentication, authorization, input validation, SQL injection prevention
3. **Validation**: Use Zod for type-safe, runtime validation
4. **Service Layer**: Keep API thin, delegate business logic to services
5. **Multiple Formats**: Support JSON (default) and CSV (reporting)
6. **Error Handling**: Catch errors, return consistent error responses
7. **Testing**: E2E tests with optimized session management
8. **Documentation**: Clear examples of requests/responses

This endpoint demonstrates enterprise-grade API development with:
- ✅ Type safety (TypeScript + Zod)
- ✅ Security (session-based auth, input validation)
- ✅ Maintainability (service layer separation)
- ✅ Usability (multiple export formats)
- ✅ Reliability (comprehensive error handling)
- ✅ Quality (extensive test coverage)
