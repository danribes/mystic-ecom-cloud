# T103: Admin Products API - Learning Guide

**Topic:** Building RESTful Admin APIs with Authentication & Business Logic  
**Difficulty:** Intermediate  
**Technologies:** Astro, TypeScript, PostgreSQL, Zod, Playwright

---

## 🎯 Learning Objectives

By studying this implementation, you will learn:

1. **RESTful API Design** - How to structure CRUD endpoints following REST principles
2. **Authentication & Authorization** - Implementing session-based admin access control
3. **Input Validation** - Using Zod for robust schema validation
4. **Business Logic** - Enforcing complex business rules in APIs
5. **Error Handling** - Creating custom error hierarchies
6. **Database Operations** - Writing efficient SQL queries with joins
7. **Testing Strategy** - E2E testing for API endpoints

---

## 📚 Core Concepts

### 1. REST API Design Principles

#### HTTP Methods Mapping
```
POST   → CREATE new resource
GET    → READ/RETRIEVE resources
PUT    → UPDATE existing resource
DELETE → REMOVE resource
```

#### URL Structure
```
/api/admin/products     → Collection endpoint
/api/admin/products/:id → Individual resource endpoint
```

**Why This Matters:**
- Predictable API structure
- Standard HTTP semantics
- Easy to understand and document
- Client libraries can auto-generate

**Example from T103:**
```typescript
// Collection operations
POST   /api/admin/products      // Create
GET    /api/admin/products      // List

// Individual resource operations
GET    /api/admin/products/:id  // Read one
PUT    /api/admin/products/:id  // Update
DELETE /api/admin/products/:id  // Delete
```

---

### 2. Astro API Routes

#### File-Based Routing
```
src/pages/api/admin/products/
├── index.ts    → /api/admin/products
└── [id].ts     → /api/admin/products/:id
```

**Key Concepts:**
- File location determines URL
- `index.ts` handles collection endpoints
- `[id].ts` handles parameterized routes
- Export named functions for each HTTP method

**Example:**
```typescript
// src/pages/api/admin/products/index.ts
export const POST: APIRoute = async ({ request, cookies }) => {
  // Handle POST /api/admin/products
};

export const GET: APIRoute = async ({ request, cookies }) => {
  // Handle GET /api/admin/products
};
```

```typescript
// src/pages/api/admin/products/[id].ts
export const GET: APIRoute = async ({ params, cookies }) => {
  const productId = params.id; // Extract :id from URL
  // Handle GET /api/admin/products/:id
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const productId = params.id;
  // Handle PUT /api/admin/products/:id
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const productId = params.id;
  // Handle DELETE /api/admin/products/:id
};
```

---

### 3. Authentication & Authorization

#### Two-Layer Security

**Layer 1: Authentication (Who are you?)**
```typescript
async function checkAdminAuth(cookies: any): Promise<string> {
  const session = await getSessionFromRequest(cookies);
  
  if (!session) {
    throw new AuthenticationError('Authentication required'); // 401
  }
  
  // ... rest of function
}
```

**Layer 2: Authorization (What can you do?)**
```typescript
  if (session.role !== 'admin') {
    throw new AuthorizationError('Admin access required'); // 403
  }
  
  return session.userId;
}
```

**HTTP Status Codes:**
- `401 Unauthorized` - No valid session/credentials
- `403 Forbidden` - Valid session but insufficient permissions

**Why Separate?**
- Clear error messages for clients
- Different retry strategies
- Audit logging distinctions

---

### 4. Input Validation with Zod

#### Schema Definition
```typescript
import { z } from 'zod';

const ProductCreateSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(255),
  
  slug: z.string()
    .min(3)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Must be lowercase with hyphens'),
  
  price: z.number()
    .min(0, 'Price cannot be negative'),
  
  product_type: z.enum(['pdf', 'audio', 'video', 'ebook']),
  
  download_limit: z.number()
    .int()
    .min(1)
    .optional()
    .default(3),
});
```

#### Type Inference
```typescript
// Zod automatically infers TypeScript type
type ProductCreate = z.infer<typeof ProductCreateSchema>;
// Equivalent to:
// type ProductCreate = {
//   title: string;
//   slug: string;
//   price: number;
//   product_type: 'pdf' | 'audio' | 'video' | 'ebook';
//   download_limit?: number;
// }
```

#### Usage in API
```typescript
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validate and transform
    const validated = ProductCreateSchema.parse(body);
    // If validation fails, throws ZodError with detailed messages
    
    // validated is now type-safe ProductCreate
    await createProduct(validated);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Validation failed',
        fields: error.flatten().fieldErrors
      }), { status: 400 });
    }
  }
};
```

**Benefits:**
- Runtime validation
- TypeScript type safety
- Detailed error messages
- Automatic type inference
- Composable schemas

---

### 5. Custom Error Hierarchy

#### Error Class Structure
```typescript
// Base class
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

// Specific errors
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}
```

#### Usage Pattern
```typescript
// Throw specific errors
if (!session) {
  throw new AuthenticationError(); // Auto 401
}

if (slugExists) {
  throw new ConflictError('Slug already exists'); // Auto 409
}

// Centralized error handling
try {
  // ... business logic
} catch (error) {
  if (error instanceof AppError) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      code: error.code
    }), { 
      status: error.statusCode 
    });
  }
  
  // Unexpected errors
  return new Response(JSON.stringify({
    success: false,
    error: 'Internal server error'
  }), { status: 500 });
}
```

**Advantages:**
- Consistent error responses
- Automatic status codes
- Type-safe error handling
- Easy to extend

---

### 6. Database Operations

#### Parameterized Queries (SQL Injection Prevention)
```typescript
// ❌ NEVER DO THIS (SQL injection vulnerable)
const result = await query(
  `SELECT * FROM products WHERE slug = '${slug}'`
);

// ✅ ALWAYS DO THIS (safe)
const result = await query(
  'SELECT * FROM products WHERE slug = $1',
  [slug]
);
```

#### Dynamic Query Building
```typescript
function buildProductListQuery(filters: ProductFilters) {
  let sql = `
    SELECT dp.*, 
           COALESCE(SUM(oi.quantity), 0) as sales_count
    FROM digital_products dp
    LEFT JOIN order_items oi ON dp.id = oi.product_id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  let paramIndex = 1;
  
  // Add filters dynamically
  if (filters.type) {
    sql += ` AND dp.product_type = $${paramIndex}`;
    params.push(filters.type);
    paramIndex++;
  }
  
  if (filters.minPrice) {
    sql += ` AND dp.price >= $${paramIndex}`;
    params.push(filters.minPrice);
    paramIndex++;
  }
  
  if (filters.search) {
    sql += ` AND (dp.title ILIKE $${paramIndex} OR dp.description ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  
  sql += ' GROUP BY dp.id ORDER BY dp.created_at DESC';
  
  return { sql, params };
}
```

#### JOINs for Statistics
```typescript
const result = await query(`
  SELECT 
    dp.*,
    COALESCE(SUM(pv.view_count), 0) as total_views,
    COALESCE(COUNT(DISTINCT oi.order_id), 0) as total_purchases
  FROM digital_products dp
  LEFT JOIN product_views pv ON dp.id = pv.product_id
  LEFT JOIN order_items oi ON dp.id = oi.product_id
  WHERE dp.id = $1
  GROUP BY dp.id
`, [productId]);
```

**Key Points:**
- LEFT JOIN for optional relations
- COALESCE for null handling
- GROUP BY after aggregations
- Parameterized for safety

---

### 7. Business Logic Enforcement

#### Example: Preventing Product Deletion with Purchases
```typescript
async function validateProductDeletion(productId: string) {
  // Check for any purchases
  const purchaseCheck = await query(
    'SELECT COUNT(*) as count FROM order_items WHERE product_id = $1',
    [productId]
  );
  
  const purchaseCount = parseInt(purchaseCheck.rows[0].count);
  
  if (purchaseCount > 0) {
    throw new ValidationError(
      `Cannot delete product with ${purchaseCount} purchase(s). ` +
      `Consider unpublishing instead.`
    );
  }
}

// Usage in DELETE endpoint
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    await checkAdminAuth(cookies);
    
    const product = await getProduct(params.id);
    if (!product) {
      throw new NotFoundError('Product');
    }
    
    // Business logic check
    await validateProductDeletion(params.id);
    
    // Only delete if validation passes
    await query('DELETE FROM digital_products WHERE id = $1', [params.id]);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Product deleted successfully'
    }), { status: 200 });
  } catch (error) {
    return handleError(error);
  }
};
```

#### Example: Slug Uniqueness
```typescript
async function checkSlugUniqueness(slug: string, excludeId?: string) {
  let sql = 'SELECT id FROM digital_products WHERE slug = $1';
  const params = [slug];
  
  if (excludeId) {
    sql += ' AND id != $2';
    params.push(excludeId);
  }
  
  const result = await query(sql, params);
  
  if (result.rows.length > 0) {
    throw new ConflictError('A product with this slug already exists');
  }
}

// Used in both CREATE and UPDATE
// CREATE: checkSlugUniqueness(slug)
// UPDATE: checkSlugUniqueness(slug, productId)
```

---

## 💡 Best Practices from T103

### 1. Consistent Response Format
```typescript
// Success response
{
  success: true,
  data: { /* resource data */ }
}

// Error response
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE",
  statusCode: 400,
  fields?: { /* validation errors */ }
}
```

### 2. Separation of Concerns
```typescript
// ✅ Good: Separate functions for each concern
async function checkAdminAuth(cookies) { /* ... */ }
async function validateInput(data) { /* ... */ }
async function checkSlugExists(slug) { /* ... */ }
async function createProduct(data) { /* ... */ }

// API route just orchestrates
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    await checkAdminAuth(cookies);
    const validated = validateInput(await request.json());
    await checkSlugExists(validated.slug);
    const product = await createProduct(validated);
    return successResponse(product, 201);
  } catch (error) {
    return handleError(error);
  }
};
```

### 3. Early Returns for Errors
```typescript
// ✅ Good: Early return pattern
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    await checkAdminAuth(cookies);
  } catch (error) {
    return handleError(error); // Early return
  }
  
  try {
    const product = await getProduct(params.id);
    return successResponse(product);
  } catch (error) {
    return handleError(error);
  }
};
```

### 4. Type Safety
```typescript
// Define types from Zod schemas
type ProductCreate = z.infer<typeof ProductCreateSchema>;
type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
type ProductListQuery = z.infer<typeof ProductListQuerySchema>;

// Use in functions
async function createProduct(data: ProductCreate): Promise<Product> {
  // TypeScript ensures data matches schema
}
```

---

## 🧪 Testing Patterns

### Setup & Teardown
```typescript
test.beforeAll(async () => {
  // Create test admin user
  const hashedPassword = await bcrypt.hash(adminUser.password, 10);
  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, role, email_verified)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
    [adminUser.id, adminUser.email, hashedPassword, adminUser.name, 'admin']
  );
});

test.beforeEach(async () => {
  // Clean up test products before each test
  await pool.query('DELETE FROM digital_products WHERE slug LIKE $1', ['%test%']);
});

test.afterAll(async () => {
  // Cleanup
  await pool.query('DELETE FROM users WHERE email = $1', [adminUser.email]);
  await pool.end();
});
```

### API Testing with Playwright
```typescript
test('should create product', async ({ page }) => {
  // Login first
  await loginAsAdmin(page);
  
  // Make API request using page context (has cookies)
  const response = await page.request.post('/api/admin/products', {
    data: testProductData
  });
  
  // Assertions
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  expect(result.success).toBe(true);
  expect(result.data.slug).toBe(testProductData.slug);
});
```

---

## 🚀 Common Pitfalls & Solutions

### Pitfall 1: SQL Injection
```typescript
// ❌ Vulnerable
const sql = `SELECT * FROM products WHERE slug = '${slug}'`;

// ✅ Safe
const sql = 'SELECT * FROM products WHERE slug = $1';
const result = await query(sql, [slug]);
```

### Pitfall 2: Wrong Error Status Codes
```typescript
// ❌ Confusing
if (!session) {
  throw new ValidationError('Authentication required'); // 400 wrong!
}

// ✅ Clear
if (!session) {
  throw new AuthenticationError('Authentication required'); // 401 correct!
}
```

### Pitfall 3: Not Validating Before Business Logic
```typescript
// ❌ Business logic might fail with invalid data
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  await createProduct(body); // Might have invalid data!
};

// ✅ Validate first
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const validated = ProductCreateSchema.parse(body); // Validates first
  await createProduct(validated); // Clean data guaranteed
};
```

### Pitfall 4: Forgetting Transaction for Multi-Step Operations
```typescript
// ❌ If second query fails, first change persists (inconsistent state)
await query('INSERT INTO products ...');
await query('INSERT INTO product_metadata ...');

// ✅ Use transaction
const client = await getClient();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO products ...');
  await client.query('INSERT INTO product_metadata ...');
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

---

## 📖 Further Learning

### Topics to Explore Next
1. **Pagination** - Implementing limit/offset or cursor-based pagination
2. **Rate Limiting** - Preventing API abuse
3. **Caching** - Using Redis for frequently accessed data
4. **Batch Operations** - Handling multiple resources in one request
5. **GraphQL** - Alternative to REST for flexible queries
6. **OpenAPI/Swagger** - API documentation standards
7. **Webhooks** - Event-driven API integrations

### Related Tasks
- T089: Events API (similar pattern)
- T092-T099: Digital Products Frontend
- T104: Product Categories API (extends this)
- T105: Bulk Product Operations

---

## ✅ Key Takeaways

1. **RESTful Design:** Use standard HTTP methods and status codes
2. **Security Layers:** Authentication (who?) + Authorization (what?)
3. **Validation:** Always validate input before processing
4. **Error Handling:** Use custom error classes for clarity
5. **Business Logic:** Enforce rules at API level, not just UI
6. **Type Safety:** Leverage TypeScript + Zod
7. **Testing:** E2E tests ensure endpoints work end-to-end

---

**Difficulty Rating:** ⭐⭐⭐☆☆ (3/5)  
**Time to Learn:** 4-6 hours  
**Prerequisites:** TypeScript, REST APIs, SQL basics

**Next Steps:** Apply these patterns to build your own admin API!
