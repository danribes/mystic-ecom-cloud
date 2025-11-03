# T092: Product Service - Learning Guide

**Date:** November 1, 2025  
**Task:** Digital Products - Product Service  
**Level:** Intermediate to Advanced  
**Time to Learn:** 4-6 hours

---

## Learning Objectives

By the end of this guide, you will understand:

1. **Product Management Architecture** - How to design services for digital product management
2. **PostgreSQL Advanced Queries** - Complex JOINs, CTEs, and aggregations
3. **Security Best Practices** - Token generation, HMAC signing, expiration handling
4. **Download Management** - Secure file delivery with limits and logging
5. **Database Design** - Schema design for digital products with analytics
6. **Type Safety** - TypeScript interfaces for complex data structures

---

## Prerequisites

### Required Knowledge

- **JavaScript/TypeScript:** Intermediate level
- **PostgreSQL:** Basic SELECT, INSERT, UPDATE queries
- **Node.js:** Understanding of async/await
- **HTTP:** Basic understanding of APIs

### Required Tools

- Node.js 18+
- PostgreSQL 15+
- Text editor (VS Code recommended)
- Docker (for database)

### Recommended Reading

- [PostgreSQL Documentation - JOINs](https://www.postgresql.org/docs/current/tutorial-join.html)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [TypeScript Handbook - Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)

---

## Core Concepts

### 1. Digital Product Model

A digital product differs from physical products in several ways:

```typescript
interface DigitalProduct {
  id: string;              // UUID primary key
  title: string;           // Product name
  slug: string;            // URL-friendly identifier
  description: string;     // Full description
  price: number;          // Price in dollars (DECIMAL in DB)
  product_type: string;   // pdf, audio, video, software
  file_url: string;       // Actual file location (S3/CDN)
  file_size_mb: number;   // Size for display
  preview_url?: string;   // Optional preview/sample
  image_url?: string;     // Cover image
  download_limit: number; // How many times user can download
  is_published: boolean;  // Visibility control
}
```

**Key Differences from Physical Products:**
- No inventory management
- Instant delivery via download
- Download limits instead of quantity
- File metadata (size, type, preview)
- Digital rights management

### 2. Service Layer Pattern

The Product Service follows a **service layer pattern**:

```
┌─────────────┐
│   Pages     │ (Astro pages, API routes)
└──────┬──────┘
       │ calls
┌──────▼──────┐
│  Services   │ (products.ts, cart.ts, analytics.ts)
└──────┬──────┘
       │ queries
┌──────▼──────┐
│  Database   │ (PostgreSQL)
└─────────────┘
```

**Benefits:**
- Reusable business logic
- Centralized data access
- Easy to test
- Consistent error handling

### 3. Database Connection Pooling

```typescript
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if can't connect
});
```

**Why Pooling?**
- Creating connections is expensive (~50ms)
- Pooling reuses connections (~1ms)
- Handles concurrent requests efficiently
- Prevents connection exhaustion

### 4. Token-Based Security

Digital downloads require secure, time-limited access:

```typescript
// 1. Generate token payload
const payload = {
  productId: 'abc-123',
  userId: 'user-456',
  orderId: 'order-789',
  expiry: Date.now() + (15 * 60 * 1000) // 15 minutes
};

// 2. Create signature
const secret = process.env.DOWNLOAD_SECRET;
const data = JSON.stringify(payload);
const hmac = crypto.createHmac('sha256', secret);
hmac.update(data);
const signature = hmac.digest('hex');

// 3. Combine and encode
const token = Buffer.from(JSON.stringify({
  data: payload,
  signature
})).toString('base64');
```

**Security Properties:**
- **Time-limited:** Expires after 15 minutes
- **Tamper-proof:** HMAC signature detects modifications
- **User-specific:** Tied to specific user and order
- **Single-use capable:** Can add nonce for one-time use

---

## Function Deep Dives

### Function 1: getProducts()

**Purpose:** Retrieve and filter digital products

**Learning Focus:** Complex SQL queries with dynamic filtering

```typescript
export async function getProducts(filters?: {
  search?: string;
  type?: string;
  maxPrice?: number;
  minPrice?: number;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<DigitalProduct[]> {
  // Build dynamic WHERE clause
  const conditions: string[] = ['is_published = true'];
  const params: any[] = [];
  let paramIndex = 1;

  // Search filter
  if (filters?.search) {
    conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  // Type filter
  if (filters?.type) {
    conditions.push(`product_type = $${paramIndex}`);
    params.push(filters.type);
    paramIndex++;
  }

  // Price range filters
  if (filters?.maxPrice !== undefined) {
    conditions.push(`price <= $${paramIndex}`);
    params.push(filters.maxPrice);
    paramIndex++;
  }

  if (filters?.minPrice !== undefined) {
    conditions.push(`price >= $${paramIndex}`);
    params.push(filters.minPrice);
    paramIndex++;
  }

  // Build ORDER BY clause
  let orderBy = 'created_at DESC'; // Default: newest first
  if (filters?.sort === 'price-asc') orderBy = 'price ASC';
  if (filters?.sort === 'price-desc') orderBy = 'price DESC';
  if (filters?.sort === 'title') orderBy = 'title ASC';

  // Build final query
  const whereClause = conditions.join(' AND ');
  const query = `
    SELECT id, title, slug, description, price, product_type,
           file_size_mb, preview_url, image_url, download_limit,
           is_published, created_at
    FROM digital_products
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(filters?.limit || 20, filters?.offset || 0);

  const result = await pool.query(query, params);
  return result.rows;
}
```

**Key Concepts:**

1. **Dynamic Query Building**
   - Start with base conditions
   - Add filters conditionally
   - Use parameterized queries (SQL injection protection)
   - Track parameter index manually

2. **ILIKE vs LIKE**
   - `LIKE`: Case-sensitive search
   - `ILIKE`: Case-insensitive search (PostgreSQL specific)
   - Both support `%` wildcards

3. **Pagination**
   - `LIMIT`: Max results to return
   - `OFFSET`: Skip first N results
   - Essential for large datasets
   - Example: Page 3 with 20 per page = `LIMIT 20 OFFSET 40`

4. **SQL Injection Prevention**
   ```typescript
   // ❌ DANGEROUS - SQL Injection vulnerable
   const query = `SELECT * FROM products WHERE title = '${userInput}'`;
   
   // ✅ SAFE - Parameterized query
   const query = `SELECT * FROM products WHERE title = $1`;
   await pool.query(query, [userInput]);
   ```

**Exercise:**

Add a new filter for `featured` products:

```typescript
if (filters?.featured) {
  conditions.push(`is_featured = $${paramIndex}`);
  params.push(true);
  paramIndex++;
}
```

### Function 2: generateDownloadLink()

**Purpose:** Create secure, time-limited download URLs

**Learning Focus:** Cryptographic signing with HMAC

```typescript
export function generateDownloadLink(
  productId: string,
  orderId: string,
  userId: string
): string {
  // 1. Create payload with expiration
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  const payload = {
    productId,
    orderId,
    userId,
    expiresAt,
  };

  // 2. Generate HMAC signature
  const secret = process.env.DOWNLOAD_SECRET || 'default-secret-key';
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const signature = hmac.digest('hex');

  // 3. Combine payload and signature
  const token = Buffer.from(
    JSON.stringify({
      data: payload,
      signature,
    })
  ).toString('base64');

  // 4. Return download URL
  return `/api/products/download/${productId}?token=${encodeURIComponent(token)}`;
}
```

**Key Concepts:**

1. **HMAC (Hash-based Message Authentication Code)**
   - Combines hashing with secret key
   - Verifies data integrity AND authenticity
   - Standard: HMAC-SHA256
   - Process: `HMAC(key, message) = hash(key + message + key)`

2. **Why HMAC over Simple Hash?**
   ```typescript
   // ❌ WEAK - Anyone can regenerate hash
   const hash = crypto.createHash('sha256')
     .update(JSON.stringify(payload))
     .digest('hex');
   
   // ✅ STRONG - Requires secret key
   const hmac = crypto.createHmac('sha256', secret)
     .update(JSON.stringify(payload))
     .digest('hex');
   ```

3. **Token Structure**
   ```json
   {
     "data": {
       "productId": "abc-123",
       "orderId": "order-456",
       "userId": "user-789",
       "expiresAt": 1698765432000
     },
     "signature": "a1b2c3d4e5f6..." // HMAC-SHA256 hex
   }
   ```
   This is then Base64 encoded for URL safety.

4. **Time-Limited Access**
   - Set expiration timestamp (not duration)
   - Use `Date.now()` for current time in milliseconds
   - 15 minutes = `15 * 60 * 1000` milliseconds
   - Verify on token validation

**Security Analysis:**

| Attack | Prevention |
|--------|------------|
| Token stealing | Short expiration (15 min) |
| Token tampering | HMAC signature validation |
| Brute force | Long secret key (32+ chars) |
| Replay attack | Can add nonce/one-time use |
| Token sharing | Tied to specific user ID |

**Exercise:**

Implement token verification:

```typescript
export function verifyDownloadToken(token: string): {
  valid: boolean;
  payload?: any;
  error?: string;
} {
  try {
    // 1. Decode base64
    const decoded = JSON.parse(
      Buffer.from(token, 'base64').toString('utf-8')
    );
    
    // 2. Extract data and signature
    const { data, signature } = decoded;
    
    // 3. Regenerate signature
    const secret = process.env.DOWNLOAD_SECRET || 'default-secret-key';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(data));
    const expectedSignature = hmac.digest('hex');
    
    // 4. Compare signatures (timing-safe)
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    // 5. Check expiration
    if (Date.now() > data.expiresAt) {
      return { valid: false, error: 'Token expired' };
    }
    
    // 6. Success
    return { valid: true, payload: data };
  } catch (error) {
    return { valid: false, error: 'Invalid token format' };
  }
}
```

### Function 3: hasUserPurchasedProduct()

**Purpose:** Check if user has purchased a specific product

**Learning Focus:** Complex JOINs with order status filtering

```typescript
export async function hasUserPurchasedProduct(
  userId: string,
  productId: string
): Promise<{ purchased: boolean; orderId?: string; purchaseDate?: Date } | null> {
  const query = `
    SELECT 
      oi.order_id,
      o.created_at as purchase_date
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    WHERE oi.item_type = 'digital_product'
      AND oi.item_id = $1
      AND o.user_id = $2
      AND o.status = 'completed'
    LIMIT 1
  `;

  const result = await pool.query(query, [productId, userId]);

  if (result.rows.length === 0) {
    return null;
  }

  return {
    purchased: true,
    orderId: result.rows[0].order_id,
    purchaseDate: result.rows[0].purchase_date,
  };
}
```

**Key Concepts:**

1. **INNER JOIN**
   ```sql
   SELECT *
   FROM order_items oi
   INNER JOIN orders o ON o.id = oi.order_id
   ```
   Only returns rows where both tables have matching data.
   
   **Visual:**
   ```
   order_items:        orders:
   - order_id: 123     - id: 123 ✓ (matches)
   - order_id: 456     - id: 789 ✗ (no match)
   
   Result: Only order_id 123 returned
   ```

2. **Table Aliases**
   - `order_items oi` creates alias `oi`
   - Makes queries shorter: `oi.order_id` vs `order_items.order_id`
   - Essential for self-joins

3. **Multi-Condition WHERE**
   ```sql
   WHERE condition1 AND condition2 AND condition3
   ```
   All conditions must be true (Boolean AND logic).

4. **Order Status Filtering**
   - Only count `completed` orders
   - Ignore `pending`, `cancelled`, `refunded`
   - Prevents access to unpaid products

**Database Schema Context:**

```sql
-- orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL,  -- 'pending', 'completed', 'cancelled'
  total_amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- order_items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  item_type VARCHAR(50),  -- 'digital_product', 'physical_product'
  item_id UUID,           -- References digital_products.id
  quantity INTEGER,
  price DECIMAL(10, 2)
);
```

**Why This Design?**
- Polymorphic relationship (order_items can reference multiple tables)
- Flexible for different product types
- Maintains referential integrity through orders table

**Exercise:**

Extend the function to return ALL purchases:

```typescript
export async function getUserProductPurchases(
  userId: string,
  productId: string
): Promise<Array<{ orderId: string; purchaseDate: Date; amount: number }>> {
  const query = `
    SELECT 
      oi.order_id,
      o.created_at as purchase_date,
      oi.price as amount
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    WHERE oi.item_type = 'digital_product'
      AND oi.item_id = $1
      AND o.user_id = $2
      AND o.status = 'completed'
    ORDER BY o.created_at DESC
  `;

  const result = await pool.query(query, [productId, userId]);
  return result.rows;
}
```

### Function 4: getUserPurchasedProducts()

**Purpose:** Get all products a user has purchased

**Learning Focus:** Complex aggregation with download counts

```typescript
export async function getUserPurchasedProducts(
  userId: string
): Promise<PurchasedProduct[]> {
  const query = `
    SELECT DISTINCT ON (dp.id)
      dp.id,
      dp.title,
      dp.slug,
      dp.description,
      dp.price,
      dp.product_type,
      dp.file_size_mb,
      dp.image_url,
      dp.download_limit,
      oi.order_id,
      o.created_at as purchase_date,
      (
        SELECT COUNT(*)
        FROM download_logs dl
        WHERE dl.digital_product_id = dp.id
          AND dl.user_id = $1
      ) as download_count
    FROM digital_products dp
    INNER JOIN order_items oi ON oi.item_id = dp.id AND oi.item_type = 'digital_product'
    INNER JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = $1
      AND o.status = 'completed'
    ORDER BY dp.id, o.created_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}
```

**Key Concepts:**

1. **DISTINCT ON**
   ```sql
   SELECT DISTINCT ON (dp.id) ...
   ORDER BY dp.id, o.created_at DESC
   ```
   - Returns only first row for each distinct `dp.id`
   - Must match ORDER BY first column
   - PostgreSQL-specific feature
   - Use case: Get latest purchase per product

2. **Subquery (Scalar Subquery)**
   ```sql
   (
     SELECT COUNT(*)
     FROM download_logs dl
     WHERE dl.digital_product_id = dp.id
       AND dl.user_id = $1
   ) as download_count
   ```
   - Executes for each row in outer query
   - Returns single value (count)
   - Can reference outer query columns (`dp.id`)
   - Useful for aggregations per row

3. **Multiple JOINs**
   ```
   digital_products
        ↓ (dp.id = oi.item_id)
   order_items
        ↓ (oi.order_id = o.id)
   orders
   ```
   Each JOIN narrows the result set.

**Performance Considerations:**

```sql
-- ❌ SLOW - Subquery runs N times
SELECT (SELECT COUNT(*) FROM logs WHERE product_id = p.id)
FROM products p;

-- ✅ FAST - Single aggregate query
SELECT p.id, COUNT(l.id) as log_count
FROM products p
LEFT JOIN logs l ON l.product_id = p.id
GROUP BY p.id;
```

For this function, subquery is acceptable because:
- User has limited purchased products (~10-50)
- Download counts are small (~1-10)
- Query runs infrequently (dashboard page load)

**Optimization Alternative:**

```typescript
// Use LEFT JOIN with GROUP BY instead
const query = `
  SELECT 
    dp.id,
    dp.title,
    -- ... other fields
    COUNT(DISTINCT dl.id) as download_count
  FROM digital_products dp
  INNER JOIN order_items oi ON oi.item_id = dp.id
  INNER JOIN orders o ON o.id = oi.order_id
  LEFT JOIN download_logs dl ON dl.digital_product_id = dp.id 
    AND dl.user_id = $1
  WHERE o.user_id = $1
    AND o.status = 'completed'
  GROUP BY dp.id, oi.order_id, o.created_at
  ORDER BY o.created_at DESC
`;
```

**Exercise:**

Add filtering by product type:

```typescript
export async function getUserPurchasedProducts(
  userId: string,
  productType?: string
): Promise<PurchasedProduct[]> {
  const conditions = ['o.user_id = $1', 'o.status = \'completed\''];
  const params = [userId];

  if (productType) {
    params.push(productType);
    conditions.push(`dp.product_type = $${params.length}`);
  }

  const query = `
    SELECT DISTINCT ON (dp.id)
      dp.*,
      -- ... rest of query
    WHERE ${conditions.join(' AND ')}
    -- ... rest of query
  `;

  const result = await pool.query(query, params);
  return result.rows;
}
```

---

## Common Patterns

### Pattern 1: Try-Catch with Database Queries

```typescript
export async function getProduct(id: string): Promise<Product | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('[getProduct] Database error:', error);
    throw new Error('Failed to retrieve product');
  }
}
```

**Why?**
- Catch database errors (connection lost, constraint violations)
- Log for debugging
- Return user-friendly error
- Prevent server crashes

### Pattern 2: Parameterized Queries

```typescript
// ❌ BAD - SQL Injection vulnerable
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`
);

// ✅ GOOD - Safe from injection
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

### Pattern 3: Optional Filters

```typescript
interface Filters {
  type?: string;
  minPrice?: number;
  maxPrice?: number;
}

function buildQuery(filters: Filters) {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.type) {
    conditions.push(`type = $${paramIndex++}`);
    params.push(filters.type);
  }

  if (filters.minPrice !== undefined) {
    conditions.push(`price >= $${paramIndex++}`);
    params.push(filters.minPrice);
  }

  const where = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';

  return { where, params };
}
```

### Pattern 4: Result Type Safety

```typescript
interface QueryResult {
  rows: any[];
  rowCount: number;
}

export async function getProducts(): Promise<Product[]> {
  const result: QueryResult = await pool.query('SELECT * FROM products');
  
  // Type assertion (be careful!)
  return result.rows as Product[];
  
  // Better: Validate and transform
  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    price: parseFloat(row.price), // DECIMAL → number
    // ... map all fields
  }));
}
```

---

## Testing Strategies

### Unit Testing

```typescript
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { getProducts, getProductBySlug } from './products';

describe('Product Service', () => {
  beforeAll(async () => {
    // Setup test database
    await pool.query('BEGIN');
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('ROLLBACK');
  });

  test('getProducts returns all published products', async () => {
    const products = await getProducts();
    
    expect(products).toBeInstanceOf(Array);
    expect(products.length).toBeGreaterThan(0);
    expect(products[0]).toHaveProperty('id');
    expect(products[0]).toHaveProperty('title');
  });

  test('getProductBySlug returns null for invalid slug', async () => {
    const product = await getProductBySlug('non-existent-slug');
    expect(product).toBeNull();
  });
});
```

### Integration Testing

```typescript
describe('Product Purchase Flow', () => {
  test('user can purchase and download product', async () => {
    // 1. Create test user
    const user = await createTestUser();
    
    // 2. Create test product
    const product = await createTestProduct();
    
    // 3. Create order
    const order = await createOrder(user.id, product.id);
    
    // 4. Complete payment
    await completeOrder(order.id);
    
    // 5. Check purchase status
    const purchase = await hasUserPurchasedProduct(user.id, product.id);
    expect(purchase?.purchased).toBe(true);
    
    // 6. Generate download link
    const link = generateDownloadLink(product.id, order.id, user.id);
    expect(link).toContain('/api/products/download/');
    
    // 7. Verify token
    const token = new URL(link, 'http://localhost').searchParams.get('token');
    const verification = verifyDownloadToken(token!);
    expect(verification.valid).toBe(true);
  });
});
```

---

## Performance Optimization

### 1. Database Indexes

```sql
-- Speed up product queries
CREATE INDEX idx_products_slug ON digital_products(slug);
CREATE INDEX idx_products_type ON digital_products(product_type);
CREATE INDEX idx_products_published ON digital_products(is_published) 
  WHERE is_published = true;

-- Speed up purchase checks
CREATE INDEX idx_order_items_user_product 
  ON order_items(item_id, item_type) 
  WHERE item_type = 'digital_product';

-- Speed up download counts
CREATE INDEX idx_download_logs_product_user 
  ON download_logs(digital_product_id, user_id);
```

### 2. Query Optimization

```typescript
// ❌ N+1 Query Problem
async function getProductsWithDownloadCounts() {
  const products = await getProducts();
  
  for (const product of products) {
    const count = await getDownloadCount(product.id); // N queries!
    product.downloadCount = count;
  }
  
  return products;
}

// ✅ Single Query with JOIN
async function getProductsWithDownloadCounts() {
  const query = `
    SELECT 
      p.*,
      COUNT(dl.id) as download_count
    FROM digital_products p
    LEFT JOIN download_logs dl ON dl.digital_product_id = p.id
    GROUP BY p.id
  `;
  
  return await pool.query(query);
}
```

### 3. Connection Pool Tuning

```typescript
const pool = new Pool({
  max: 20,                      // Adjust based on load
  min: 2,                       // Keep connections warm
  idleTimeoutMillis: 30000,     // Close idle after 30s
  connectionTimeoutMillis: 2000, // Fail fast
});
```

**Guidelines:**
- `max`: Start with 20, increase if queues form
- Formula: `max = (core_count * 2) + effective_spindle_count`
- For web app: Usually 10-50
- Monitor: Connection pool exhaustion errors

---

## Security Best Practices

### 1. Environment Variables

```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost/db
DOWNLOAD_SECRET=your-32-character-random-secret-here-12345678
```

```typescript
// Never hardcode secrets
const secret = process.env.DOWNLOAD_SECRET || 'fallback-dev-secret';

if (process.env.NODE_ENV === 'production' && !process.env.DOWNLOAD_SECRET) {
  throw new Error('DOWNLOAD_SECRET must be set in production');
}
```

### 2. Input Validation

```typescript
export async function getProducts(filters?: {
  search?: string;
  type?: string;
  maxPrice?: number;
}) {
  // Validate inputs
  if (filters?.search && filters.search.length > 100) {
    throw new Error('Search term too long');
  }
  
  if (filters?.type && !['pdf', 'audio', 'video', 'software'].includes(filters.type)) {
    throw new Error('Invalid product type');
  }
  
  if (filters?.maxPrice && (filters.maxPrice < 0 || filters.maxPrice > 10000)) {
    throw new Error('Invalid price range');
  }
  
  // Proceed with query...
}
```

### 3. Rate Limiting

```typescript
// Simple in-memory rate limiter
const downloadAttempts = new Map<string, number[]>();

export async function checkDownloadRateLimit(userId: string): Promise<boolean> {
  const now = Date.now();
  const userAttempts = downloadAttempts.get(userId) || [];
  
  // Keep only attempts from last hour
  const recentAttempts = userAttempts.filter(time => now - time < 3600000);
  
  // Allow max 10 downloads per hour
  if (recentAttempts.length >= 10) {
    return false;
  }
  
  recentAttempts.push(now);
  downloadAttempts.set(userId, recentAttempts);
  return true;
}
```

---

## Troubleshooting Guide

### Issue 1: "Pool is closed" Error

**Cause:** Trying to query after pool.end() called

**Solution:**
```typescript
// Don't call pool.end() in application code
// Only call it during shutdown

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
```

### Issue 2: "Too many clients" Error

**Cause:** Connection pool exhausted

**Solutions:**
1. Check for connection leaks
2. Increase pool size
3. Add connection timeout

```typescript
// Always release clients
const client = await pool.connect();
try {
  await client.query('SELECT ...');
} finally {
  client.release(); // Important!
}
```

### Issue 3: Slow Queries

**Debug:**
```typescript
const start = Date.now();
const result = await pool.query(query, params);
console.log(`Query took ${Date.now() - start}ms`);
```

**Solutions:**
1. Add database indexes
2. Use EXPLAIN ANALYZE
3. Optimize query structure
4. Add query result caching

```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM products WHERE slug = 'test';
```

---

## Practice Exercises

### Exercise 1: Add Product Reviews

Add functionality to store and retrieve product reviews:

```typescript
interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number; // 1-5
  comment: string;
  created_at: Date;
}

// TODO: Implement these functions
export async function addProductReview(
  productId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<ProductReview> {
  // Your code here
}

export async function getProductReviews(
  productId: string,
  limit?: number
): Promise<ProductReview[]> {
  // Your code here
}

export async function getAverageRating(
  productId: string
): Promise<number> {
  // Your code here
}
```

### Exercise 2: Download Analytics

Track download analytics per product:

```typescript
interface DownloadStats {
  product_id: string;
  total_downloads: number;
  unique_users: number;
  downloads_today: number;
  downloads_this_week: number;
  downloads_this_month: number;
}

export async function getDownloadStats(
  productId: string
): Promise<DownloadStats> {
  // Hint: Use date functions
  // DATE_TRUNC('day', downloaded_at) = CURRENT_DATE
  // Your code here
}
```

### Exercise 3: Product Search with Full-Text

Implement full-text search using PostgreSQL:

```typescript
export async function searchProducts(
  searchTerm: string
): Promise<Product[]> {
  // Hint: Use to_tsvector and to_tsquery
  const query = `
    SELECT *
    FROM digital_products
    WHERE to_tsvector('english', title || ' ' || description)
      @@ to_tsquery('english', $1)
  `;
  
  // Your code here
}
```

---

## Additional Resources

### Documentation
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [Node.js pg Library](https://node-postgres.com/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### Books
- "PostgreSQL: Up and Running" by Regina Obe
- "Node.js Design Patterns" by Mario Casciaro
- "Secure by Design" by Dan Bergh Johnsson

### Courses
- [PostgreSQL for Developers](https://www.pluralsight.com/)
- [Node.js: Advanced Concepts](https://www.udemy.com/)

---

## Conclusion

You've learned:
- ✅ Service layer architecture
- ✅ Complex SQL queries with JOINs
- ✅ Token-based security with HMAC
- ✅ Database connection pooling
- ✅ Performance optimization
- ✅ Error handling patterns

**Next Steps:**
1. Complete practice exercises
2. Build a similar service for another domain
3. Add caching layer (Redis)
4. Implement API rate limiting
5. Add comprehensive test suite

**Estimated Time Investment:**
- Basic understanding: 4-6 hours
- Proficiency: 2-3 weeks
- Mastery: 2-3 months of practice

Keep coding! 🚀
