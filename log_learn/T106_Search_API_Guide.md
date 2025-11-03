# T106: Search API Endpoint - Learning Guide

## Overview

This guide covers key concepts, patterns, and best practices learned while implementing a REST API endpoint in Astro that wraps a search service with comprehensive validation and error handling.

## Table of Contents
1. [Astro API Routes](#astro-api-routes)
2. [Query Parameter Validation](#query-parameter-validation)
3. [Error Handling Patterns](#error-handling-patterns)
4. [Integration Testing](#integration-testing)
5. [Environment Variables](#environment-variables)
6. [TypeScript Type Safety](#typescript-type-safety)
7. [Performance Optimization](#performance-optimization)
8. [CORS Configuration](#cors-configuration)

---

## 1. Astro API Routes

### Basics

Astro API routes live in `src/pages/api/` and export handler functions for HTTP methods.

```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const params = url.searchParams;
  
  return new Response(JSON.stringify({ data: 'response' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Key Concepts

**Context Object**: Handler receives context with:
- `request`: Standard Request object
- `url`: Pre-parsed URL object  
- `params`: Route parameters (for dynamic routes)
- `redirect()`: Helper for redirects
- `locals`: Shared request data

**Response Format**: Return standard `Response` object
- Must set `Content-Type` header
- JSON responses need `JSON.stringify()`
- Set appropriate status codes

### URL vs Request.url

**Option 1: Use Request (More Explicit)**
```typescript
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const params = url.searchParams;
  // ...
};
```

**Option 2: Use Pre-parsed URL**
```typescript
export const GET: APIRoute = async ({ url }) => {
  const params = url.searchParams;
  // ...
};
```

**Recommendation**: Use `{ url }` directly - it's already parsed by Astro.

### File-Based Routing

```
src/pages/api/
├── search.ts          → /api/search
├── users/
│   ├── [id].ts       → /api/users/:id
│   └── index.ts      → /api/users
└── [...slug].ts      → /api/* (catch-all)
```

### Multiple HTTP Methods

```typescript
export const GET: APIRoute = async () => { /* ... */ };
export const POST: APIRoute = async () => { /* ... */ };
export const OPTIONS: APIRoute = async () => { /* ... */ };
```

---

## 2. Query Parameter Validation

### Best Practices

**1. Validate Early, Return Early**
```typescript
const query = params.get('q')?.trim();
if (!query) {
  return new Response(JSON.stringify({
    success: false,
    error: 'Query parameter "q" is required'
  }), { status: 400 });
}
```

**2. Specific Error Messages**
```typescript
// ❌ Bad: Generic message
if (invalid) {
  return error('Invalid input');
}

// ✅ Good: Specific message
if (query.length > 200) {
  return error('Query must be 200 characters or less');
}
```

**3. Type Coercion with Validation**
```typescript
const limit = params.get('limit');
if (limit) {
  const limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return error('Limit must be between 1 and 100');
  }
}
```

### Validation Patterns

**Required String Parameter**
```typescript
const query = params.get('q')?.trim();
if (!query) {
  return error('Query is required');
}
if (query.length > 200) {
  return error('Query too long');
}
```

**Optional Enum Parameter**
```typescript
const type = params.get('type');
if (type && !['course', 'product', 'event'].includes(type)) {
  return error('Invalid type. Must be: course, product, event');
}
```

**Optional Number Parameter**
```typescript
const minPrice = params.get('minPrice');
if (minPrice) {
  const num = parseFloat(minPrice);
  if (isNaN(num) || num < 0) {
    return error('minPrice must be non-negative number');
  }
}
```

**Pagination Parameters**
```typescript
const limit = parseInt(params.get('limit') || '20', 10);
const offset = parseInt(params.get('offset') || '0', 10);

if (limit < 1 || limit > 100) {
  return error('Limit must be between 1 and 100');
}
if (offset < 0) {
  return error('Offset must be non-negative');
}
```

### Helper Function Pattern

```typescript
function validateParams(params: URLSearchParams) {
  const errors: string[] = [];
  
  const query = params.get('q')?.trim();
  if (!query) errors.push('Query required');
  else if (query.length > 200) errors.push('Query too long');
  
  const limit = params.get('limit');
  if (limit) {
    const num = parseInt(limit);
    if (isNaN(num) || num < 1 || num > 100) {
      errors.push('Invalid limit');
    }
  }
  
  return errors.length > 0 ? errors : null;
}

// Usage
const errors = validateParams(params);
if (errors) {
  return new Response(JSON.stringify({
    success: false,
    errors
  }), { status: 400 });
}
```

---

## 3. Error Handling Patterns

### Response Envelope Pattern

**Consistent Structure**:
```typescript
// Success
{
  "success": true,
  "data": { /* actual data */ }
}

// Error
{
  "success": false,
  "error": "Error message"
}
```

**Benefits**:
- Client can always check `success` field
- Consistent error handling in frontend
- Easy to add metadata later

### HTTP Status Codes

**Use Semantic Status Codes**:
```typescript
// 200 OK: Successful request
return new Response(JSON.stringify({ success: true, data }), {
  status: 200
});

// 400 Bad Request: Client error (validation)
return new Response(JSON.stringify({ success: false, error: 'Invalid input' }), {
  status: 400
});

// 500 Internal Server Error: Server error
return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
  status: 500
});
```

### Try-Catch Pattern

```typescript
export const GET: APIRoute = async ({ url }) => {
  try {
    // Validation
    const params = url.searchParams;
    const query = params.get('q');
    if (!query) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Query required'
      }), { status: 400 });
    }
    
    // Business logic
    const results = await search(query);
    
    // Success response
    return new Response(JSON.stringify({
      success: true,
      data: results
    }), { status: 200 });
    
  } catch (error) {
    // Log detailed error server-side
    console.error('Search API error:', error);
    
    // Return generic error to client
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), { status: 500 });
  }
};
```

### Security Consideration

**Never Expose Internal Errors**:
```typescript
// ❌ Bad: Leaks internal details
catch (error) {
  return error(error.message); // Might expose DB schema, paths, etc.
}

// ✅ Good: Generic message, detailed logs
catch (error) {
  console.error('Detailed error:', error);
  return error('Internal server error');
}
```

---

## 4. Integration Testing

### Integration vs Unit Tests

**Unit Tests**: Test function in isolation
```typescript
// Test the search service directly
import { search } from '../lib/search';

it('should search courses', async () => {
  const results = await search({ query: 'meditation' });
  expect(results.items).toBeDefined();
});
```

**Integration Tests**: Test full HTTP request/response cycle
```typescript
// Test the API endpoint via HTTP
it('should search courses', async () => {
  const response = await fetch('http://localhost:4321/api/search?q=meditation');
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
});
```

### Test Server Management

**Challenge**: Integration tests need live server

**Solution 1: Two-Terminal Approach**
```bash
# Terminal 1
npm run dev

# Terminal 2  
npm test -- api/__tests__/search.test.ts --run
```

**Solution 2: Automated Script**
```bash
#!/bin/bash
npm run dev &
SERVER_PID=$!
sleep 5  # Wait for startup
npm test
kill $SERVER_PID
```

**Solution 3: Dynamic Port Detection**
```typescript
const baseUrl = process.env.ASTRO_TEST_URL || 'http://localhost:4321';
```

### Test Data Management

**Setup/Teardown Pattern**:
```typescript
describe('API Tests', () => {
  let testDataIds: string[] = [];
  
  beforeAll(async () => {
    // Insert test data
    const result = await pool.query('INSERT INTO ...');
    testDataIds.push(result.rows[0].id);
  });
  
  afterAll(async () => {
    // Clean up test data
    for (const id of testDataIds) {
      await pool.query('DELETE FROM ... WHERE id = $1', [id]);
    }
  });
  
  it('test case', async () => {
    // Test uses testDataIds
  });
});
```

**Unique Test Data**:
```typescript
// Use unique slugs to prevent conflicts
const testSlug = `test-item-${Date.now()}`;
// OR
const testSlug = 'test-item-suffix';
```

### Async Test Patterns

```typescript
// ✅ Good: Proper async/await
it('should return results', async () => {
  const response = await fetch(url);
  const data = await response.json();
  expect(data.success).toBe(true);
});

// ❌ Bad: Missing await
it('should return results', async () => {
  const response = fetch(url); // Promise, not Response!
  expect(response.status).toBe(200); // Will fail
});
```

---

## 5. Environment Variables

### Loading Environment Variables

**In Astro**:
- Astro automatically loads `.env` files
- Access via `process.env.VARIABLE_NAME`
- Only `PUBLIC_` prefixed vars available in client code

**In Vitest**:
```typescript
import { config } from 'dotenv';
config(); // Load .env file
```

Or in `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    env: {
      ...process.env
    }
  }
});
```

### Common Pitfall: Environment Loading Differences

**Problem**: Same code works in tests but fails in Astro dev server

**Example from T106**:
- ✅ Vitest tests: Database connects successfully
- ❌ Astro dev server: "client password must be a string"

**Cause**: Different environment variable loading mechanisms

**Solution**: Ensure consistent environment loading
```typescript
// Check if variable is loaded
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set');
}
```

### Database Connection Strings

**Format**:
```
postgresql://username:password@host:port/database
```

**Common Issues**:
- Special characters in password need URL encoding
- Missing protocol (`postgresql://`)
- Wrong port (default: 5432)

**Debugging**:
```typescript
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
// Never log actual value in production!
```

---

## 6. TypeScript Type Safety

### API Route Types

```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  // context is typed with all properties
  const { request, url, params, redirect, locals } = context;
};
```

### Type Assertions After Validation

```typescript
// After validation, assert types
const type = params.get('type');
if (type && !['course', 'product', 'event'].includes(type)) {
  return error('Invalid type');
}

// Now safe to assert
const results = await search({
  type: type as 'course' | 'product' | 'event' | undefined
});
```

### Response Type Safety

```typescript
// Define response shape
interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: string;
}

type APIResponse<T> = SuccessResponse<T> | ErrorResponse;

// Use in handler
export const GET: APIRoute = async ({ url }) => {
  const response: APIResponse<SearchResults> = {
    success: true,
    data: results
  };
  
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Generic Response Helper

```typescript
function jsonResponse<T>(
  data: T,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Usage
return jsonResponse({ success: true, data: results });
return jsonResponse({ success: false, error: 'Not found' }, 404);
```

---

## 7. Performance Optimization

### Caching Headers

```typescript
return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60' // Cache for 60 seconds
  }
});
```

**When to Cache**:
- ✅ Public search results
- ✅ Static content
- ❌ User-specific data
- ❌ Real-time data

### Pagination

**Always Implement Pagination**:
```typescript
const limit = Math.min(parseInt(params.get('limit') || '20'), 100);
const offset = parseInt(params.get('offset') || '0');

const results = await search({
  query,
  limit,
  offset
});

return {
  success: true,
  data: {
    items: results.items,
    total: results.total,
    limit,
    offset,
    hasMore: offset + limit < results.total
  }
};
```

### Query Optimization

**Limit Query Complexity**:
```typescript
// Set maximum query length
if (query.length > 200) {
  return error('Query too long');
}

// Set maximum result limit
const MAX_LIMIT = 100;
const limit = Math.min(requestedLimit, MAX_LIMIT);
```

### Early Returns

```typescript
// ✅ Good: Return early on validation failure
if (!query) return error('Query required');
if (invalid) return error('Invalid input');

const results = await search(query);
return success(results);

// ❌ Bad: Nested conditions
if (query) {
  if (!invalid) {
    const results = await search(query);
    return success(results);
  } else {
    return error('Invalid');
  }
} else {
  return error('Required');
}
```

---

## 8. CORS Configuration

### Basic CORS Setup

```typescript
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};

export const GET: APIRoute = async ({ url }) => {
  // ... handle request
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*' // Also on actual response
    }
  });
};
```

### Security Considerations

**Development vs Production**:
```typescript
const allowOrigin = process.env.NODE_ENV === 'production'
  ? 'https://yourdomain.com'
  : '*';

headers: {
  'Access-Control-Allow-Origin': allowOrigin
}
```

**Credentials**:
```typescript
headers: {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Credentials': 'true'
}
```

### Preflight Requests

Browsers send OPTIONS request before actual request for:
- Custom headers
- Methods other than GET/POST
- Content-Type other than standard types

**Handle Preflight**:
```typescript
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400' // Cache preflight for 24 hours
    }
  });
};
```

---

## Key Takeaways

### 1. API Design
- ✅ Use consistent response envelopes (`{success, data/error}`)
- ✅ Validate all inputs explicitly
- ✅ Return specific error messages for validation
- ✅ Use semantic HTTP status codes

### 2. Error Handling
- ✅ Try-catch around async operations
- ✅ Log detailed errors server-side
- ✅ Return generic errors to client
- ✅ Never expose internal implementation details

### 3. Testing
- ✅ Unit test business logic separately
- ✅ Integration test full request/response cycle
- ✅ Manage test data lifecycle properly
- ✅ Use unique test data identifiers

### 4. Performance
- ✅ Implement pagination
- ✅ Add cache headers where appropriate
- ✅ Limit query complexity
- ✅ Use early returns

### 5. TypeScript
- ✅ Use Astro's `APIRoute` type
- ✅ Type assert after validation
- ✅ Define response interfaces
- ✅ Use generics for reusable helpers

### 6. Security
- ✅ Validate all inputs
- ✅ Sanitize error messages
- ✅ Configure CORS appropriately
- ✅ Rate limit in production

---

## Common Pitfalls

### 1. Missing Content-Type Header
```typescript
// ❌ Browser won't parse as JSON
return new Response(JSON.stringify(data));

// ✅ Proper JSON response
return new Response(JSON.stringify(data), {
  headers: { 'Content-Type': 'application/json' }
});
```

### 2. Not Awaiting Async Operations
```typescript
// ❌ Returns Promise, not data
const results = search(query);

// ✅ Awaits result
const results = await search(query);
```

### 3. Inconsistent Error Responses
```typescript
// ❌ Different structures
if (error1) return { error: 'message' };
if (error2) return { message: 'error' };

// ✅ Consistent structure
if (error1) return { success: false, error: 'message' };
if (error2) return { success: false, error: 'different message' };
```

### 4. Over-Trusting Client Input
```typescript
// ❌ No validation
const limit = parseInt(params.get('limit'));
const results = await search({ limit }); // Could be negative, huge, NaN

// ✅ Validate and constrain
const limit = Math.max(1, Math.min(100, parseInt(params.get('limit') || '20')));
```

### 5. Forgetting CORS Headers
```typescript
// ❌ Will fail in browser
return new Response(JSON.stringify(data));

// ✅ Include CORS headers
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }
});
```

---

## Further Reading

- [Astro API Routes Documentation](https://docs.astro.build/en/core-concepts/endpoints/)
- [MDN HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [REST API Best Practices](https://restfulapi.net/rest-api-design-tutorial-with-example/)
- [Vitest Documentation](https://vitest.dev/)

---

**Document Version**: 1.0  
**Last Updated**: November 2, 2025  
**Related Tasks**: T105 (Search Service), T106 (Search API)
