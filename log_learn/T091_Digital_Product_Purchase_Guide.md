# T091: Digital Product Purchase - Learning Guide

## Overview
Learn how to build a secure digital product purchase and download system with token-based authentication, download limits, and user management.

## Architecture Overview

```
User Flow:
Browse Products → View Details → Purchase (Stripe) → Success → Download → Dashboard

Components:
┌─────────────────────────────────────────────────────────────┐
│                     Product Catalog                         │
│  /products/index.astro (filtering, sorting, search)        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Product Detail                            │
│  /products/[slug].astro (info, preview, purchase button)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
            ┌──────────┴─────────────┐
            │                        │
┌───────────▼────────┐    ┌─────────▼────────────┐
│ Purchase (Stripe)  │    │  Already Owned       │
│ Checkout Session   │    │  Show Download       │
└───────────┬────────┘    └──────────────────────┘
            │
┌───────────▼────────────────────────────────────────────────┐
│                     Success Page                           │
│  /products/[slug]/success.astro (download link, receipt)  │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                 Download API                               │
│  /api/products/download/[id] (token verification, limits) │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│               User Dashboard                               │
│  /dashboard/my-products (all purchases, re-download)      │
└────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Secure Download Tokens

**Problem:** How to securely deliver digital files without allowing unauthorized access?

**Solution:** HMAC-signed, time-limited tokens

```typescript
// Generate token (server-side only)
function generateDownloadLink(productId, orderId, userId, expiresInMinutes = 15) {
  // Create expiry timestamp
  const expires = Date.now() + (expiresInMinutes * 60 * 1000);
  
  // Create payload
  const payload = `${productId}:${orderId}:${userId}:${expires}`;
  
  // Sign with HMAC-SHA256
  const secret = process.env.DOWNLOAD_TOKEN_SECRET;
  const token = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  
  // Return URL with token
  return {
    url: `/api/products/download/${productId}?token=${token}&order=${orderId}&expires=${expires}`,
    token,
    expires
  };
}

// Verify token (on download request)
function verifyDownloadToken(productId, orderId, userId, token, expires) {
  // Check expiry
  if (Date.now() > expires) return false;
  
  // Recreate expected token
  const payload = `${productId}:${orderId}:${userId}:${expires}`;
  const expectedToken = crypto
    .createHmac('sha256', process.env.DOWNLOAD_TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  
  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  );
}
```

**Key Principles:**
- ✅ Tokens include all critical context (product, order, user, expiry)
- ✅ Tokens cannot be tampered with (HMAC signature)
- ✅ Tokens expire automatically (time-based)
- ✅ Tokens are validated server-side only
- ✅ Use timing-safe comparison to prevent timing attacks

### 2. Download Limit Enforcement

**Problem:** How to prevent unlimited downloads and file sharing?

**Solution:** Track downloads in database, enforce limits before delivery

```typescript
// Check if limit exceeded
async function hasExceededDownloadLimit(userId, productId, orderId) {
  const result = await pool.query(`
    SELECT COUNT(*) as download_count, dp.download_limit
    FROM download_logs dl
    INNER JOIN digital_products dp ON dp.id = dl.digital_product_id
    WHERE dl.user_id = $1 
      AND dl.digital_product_id = $2 
      AND dl.order_id = $3
    GROUP BY dp.download_limit
  `, [userId, productId, orderId]);
  
  if (!result.rows[0]) return false;
  
  const { download_count, download_limit } = result.rows[0];
  return parseInt(download_count) >= download_limit;
}

// Log every download
async function logDownload(userId, productId, orderId, ipAddress, userAgent) {
  await pool.query(`
    INSERT INTO download_logs (
      user_id, digital_product_id, order_id,
      ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5)
  `, [userId, productId, orderId, ipAddress, userAgent]);
}
```

**Download Flow:**
1. User clicks "Download Now"
2. Server checks purchase ownership
3. Server generates time-limited token
4. Server checks download count < limit
5. Server increments counter in download_logs
6. Server delivers file (redirect or stream)
7. Token expires automatically

**Benefits:**
- Prevents unlimited file sharing
- Tracks usage for analytics
- Records IP/user agent for abuse detection
- Allows customer support to reset limits if needed

### 3. Ownership Verification

**Problem:** How to ensure users can only download products they've purchased?

**Solution:** Complex JOIN query verifying order ownership

```typescript
async function hasUserPurchasedProduct(userId, productId) {
  const result = await pool.query(`
    SELECT 
      o.id as order_id,
      o.created_at as purchase_date,
      COUNT(dl.id) as download_count,
      dp.download_limit
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.id
    INNER JOIN digital_products dp ON dp.id = oi.digital_product_id
    LEFT JOIN download_logs dl ON dl.order_id = o.id 
      AND dl.digital_product_id = dp.id
    WHERE o.user_id = $1 
      AND oi.digital_product_id = $2 
      AND o.status = 'completed'
    GROUP BY o.id, o.created_at, dp.download_limit
  `, [userId, productId]);
  
  return result.rows[0] || null;
}
```

**What This Query Does:**
1. Starts with orders table (user's orders)
2. Joins order_items (links orders to products)
3. Joins digital_products (product details)
4. LEFT JOINs download_logs (counts downloads, allows 0)
5. Filters by user ID, product ID, completed status
6. Groups to aggregate download count
7. Returns null if no purchase found

**Security Checks:**
- ✅ User must own the order
- ✅ Order must contain the product
- ✅ Order must be completed (not pending/cancelled)
- ✅ Returns download count for limit enforcement

### 4. Product Filtering and Sorting

**Problem:** How to build flexible product queries without SQL injection?

**Solution:** Dynamic query builder with parameterized values

```typescript
async function getProducts(options = {}) {
  let query = 'SELECT * FROM digital_products WHERE is_published = true';
  const params = [];
  let paramIndex = 1;
  
  // Add filters dynamically
  if (options.type) {
    query += ` AND product_type = $${paramIndex}`;
    params.push(options.type);
    paramIndex++;
  }
  
  if (options.search) {
    query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${options.search}%`);
    paramIndex++;
  }
  
  if (options.minPrice !== undefined) {
    query += ` AND price >= $${paramIndex}`;
    params.push(options.minPrice);
    paramIndex++;
  }
  
  if (options.maxPrice !== undefined) {
    query += ` AND price <= $${paramIndex}`;
    params.push(options.maxPrice);
    paramIndex++;
  }
  
  // Add sorting
  switch (options.sortBy) {
    case 'price-asc':
      query += ' ORDER BY price ASC';
      break;
    case 'price-desc':
      query += ' ORDER BY price DESC';
      break;
    case 'title-asc':
      query += ' ORDER BY title ASC';
      break;
    case 'title-desc':
      query += ' ORDER BY title DESC';
      break;
    case 'newest':
    default:
      query += ' ORDER BY created_at DESC';
  }
  
  // Add pagination
  if (options.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(options.limit);
    paramIndex++;
  }
  
  if (options.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(options.offset);
    paramIndex++;
  }
  
  const result = await pool.query(query, params);
  return result.rows;
}
```

**Key Principles:**
- ✅ Never concatenate user input directly into SQL
- ✅ Use parameterized queries ($1, $2, etc.)
- ✅ Build query dynamically based on provided options
- ✅ Maintain parameter index for multiple filters
- ✅ ILIKE for case-insensitive search
- ✅ % wildcards for partial matching

### 5. Database Type Conversion

**Problem:** PostgreSQL returns DECIMAL as string, causing runtime errors

**Example Error:**
```javascript
// This fails at runtime
${product.price.toFixed(2)}
// Error: product.price.toFixed is not a function
```

**Solution:** Always convert to number explicitly

```typescript
// Good practice
${Number(product.price).toFixed(2)}

// Or in helper function
function formatFileSize(sizeMB: number): string {
  const size = Number(sizeMB); // Convert first
  if (size < 1) return `${(size * 1024).toFixed(0)} KB`;
  if (size >= 1000) return `${(size / 1024).toFixed(1)} GB`;
  return `${size.toFixed(1)} MB`;
}
```

**Why This Happens:**
- PostgreSQL's `pg` driver returns DECIMAL/NUMERIC as strings
- Prevents precision loss for large numbers
- TypeScript types don't enforce runtime behavior
- Database layer overrides type annotations

**Best Practices:**
- ✅ Always use `Number()` before numeric operations
- ✅ Create helper functions that handle conversion
- ✅ Test with actual database data, not mock objects
- ✅ Use `parseInt()` for integers, `parseFloat()` for decimals

## Implementation Patterns

### Pattern 1: Astro Page Data Fetching

```typescript
---
// Top-level await in Astro frontmatter
import { getProductBySlug, hasUserPurchasedProduct } from '@/lib/products';
import { getSessionFromRequest } from '@/lib/auth/session';

const { slug } = Astro.params;

// Fetch product
const product = await getProductBySlug(slug);
if (!product) {
  return Astro.redirect('/404');
}

// Check authentication
const session = await getSessionFromRequest(Astro.cookies);

// Check ownership
let purchaseInfo = null;
if (session) {
  purchaseInfo = await hasUserPurchasedProduct(session.userId, product.id);
}
---

<!-- Template uses fetched data -->
<h1>{product.title}</h1>
{purchaseInfo && (
  <p>You own this product</p>
)}
```

### Pattern 2: Astro API Route

```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, url, cookies, request }) => {
  // Extract parameters
  const { id: productId } = params;
  const token = url.searchParams.get('token');
  
  // Get session from cookies
  const session = await getSessionFromRequest(cookies);
  
  // Validate
  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Process request
  // ...
  
  // Return response
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

### Pattern 3: Conditional Rendering in Astro

```astro
{purchaseInfo ? (
  <!-- User owns product -->
  <>
    {purchaseInfo.download_count < purchaseInfo.download_limit ? (
      <!-- Downloads remaining -->
      <a href={downloadLink.url} class="btn-primary">
        Download Now
      </a>
    ) : (
      <!-- Limit reached -->
      <div class="alert-warning">
        Download limit reached
      </div>
    )}
  </>
) : (
  <!-- User doesn't own product -->
  <>
    {session ? (
      <!-- Logged in - show buy button -->
      <button class="btn-primary" data-buy-button>
        Buy Now
      </button>
    ) : (
      <!-- Not logged in - redirect to login -->
      <a href={`/login?redirect=/products/${product.slug}`}>
        Buy Now (Login Required)
      </a>
    )}
  </>
)}
```

## Common Pitfalls & Solutions

### Pitfall 1: Direct SQL String Concatenation
❌ **Wrong:**
```typescript
const query = `SELECT * FROM products WHERE type = '${type}'`; // SQL injection!
```

✅ **Right:**
```typescript
const query = 'SELECT * FROM products WHERE type = $1';
const params = [type];
const result = await pool.query(query, params);
```

### Pitfall 2: Trusting Client-Side Data
❌ **Wrong:**
```typescript
// Client sends productId, orderId
// Server trusts it without verification
```

✅ **Right:**
```typescript
// Always verify ownership server-side
const purchaseInfo = await hasUserPurchasedProduct(session.userId, productId);
if (!purchaseInfo || purchaseInfo.order_id !== orderId) {
  return new Response('Unauthorized', { status: 403 });
}
```

### Pitfall 3: Missing Type Conversion
❌ **Wrong:**
```typescript
const price = product.price; // String from database
const total = price * quantity; // NaN!
```

✅ **Right:**
```typescript
const price = Number(product.price);
const total = price * quantity; // Correct calculation
```

### Pitfall 4: Weak Token Generation
❌ **Wrong:**
```typescript
const token = Math.random().toString(36); // Predictable!
```

✅ **Right:**
```typescript
const token = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('base64url'); // Cryptographically secure
```

### Pitfall 5: Ignoring Download Limits
❌ **Wrong:**
```typescript
// Just deliver the file
return Response.redirect(fileUrl);
```

✅ **Right:**
```typescript
// Check limit first
if (await hasExceededDownloadLimit(userId, productId, orderId)) {
  return new Response('Download limit exceeded', { status: 403 });
}

// Log download
await logDownload(userId, productId, orderId, ipAddress, userAgent);

// Then deliver
return Response.redirect(fileUrl);
```

## Testing Strategy

### Unit Tests (Service Functions)
```typescript
describe('products service', () => {
  test('generateDownloadLink creates valid token', () => {
    const link = generateDownloadLink('prod-123', 'order-456', 'user-789');
    expect(link.token).toBeDefined();
    expect(link.expires).toBeGreaterThan(Date.now());
  });
  
  test('verifyDownloadToken rejects expired tokens', () => {
    const pastExpires = Date.now() - 1000;
    const isValid = verifyDownloadToken('prod', 'order', 'user', 'token', pastExpires);
    expect(isValid).toBe(false);
  });
  
  test('hasExceededDownloadLimit returns true when limit reached', async () => {
    // Set up test data with 3 downloads, limit of 3
    const exceeded = await hasExceededDownloadLimit('user', 'product', 'order');
    expect(exceeded).toBe(true);
  });
});
```

### Integration Tests (API Endpoints)
```typescript
describe('Download API', () => {
  test('requires authentication', async () => {
    const response = await fetch('/api/products/download/prod-123');
    expect(response.status).toBe(401);
  });
  
  test('requires valid token', async () => {
    const response = await authenticatedFetch(
      '/api/products/download/prod-123?token=invalid&order=order-123&expires=9999999999999'
    );
    expect(response.status).toBe(403);
  });
  
  test('enforces download limits', async () => {
    // Download 3 times (limit)
    // Fourth attempt should fail
    const response = await downloadProduct();
    expect(response.status).toBe(403);
    expect(await response.text()).toContain('limit');
  });
});
```

### E2E Tests (User Flow)
```typescript
test('complete purchase and download flow', async ({ page }) => {
  // Browse catalog
  await page.goto('/products');
  
  // View product
  await page.click('text=Meditation Guide');
  
  // Login
  await page.click('text=Buy Now');
  await loginAsUser(page);
  
  // Purchase (mock Stripe)
  await page.click('button:has-text("Buy Now")');
  // ... complete checkout ...
  
  // Verify success page
  expect(page.url()).toContain('/success');
  
  // Download
  await page.click('text=Download Now');
  
  // Verify download logged
  const downloads = await getDownloadLogs('user-id', 'product-id');
  expect(downloads).toHaveLength(1);
});
```

## Security Checklist

- ✅ Download tokens are HMAC-signed
- ✅ Tokens include expiry timestamp
- ✅ Tokens verified server-side only
- ✅ Ownership checked on every download
- ✅ Download limits enforced
- ✅ Downloads logged with IP/user agent
- ✅ SQL queries use parameterization
- ✅ Session validation on protected routes
- ✅ Order status checked (completed only)
- ✅ Timing-safe token comparison

## Performance Optimization

### Database Queries
- Use indexes on frequently queried columns (slug, user_id, product_id)
- Use JOINs instead of multiple queries
- Implement pagination for large result sets
- Consider caching product catalog in Redis

### File Delivery
- Use CDN for static file delivery
- Implement streaming for large files
- Use signed URLs with short expiry
- Consider range requests for video streaming

### Caching Strategy
```typescript
// Cache product catalog (invalidate on changes)
const cacheKey = `products:${type}:${sort}`;
let products = await redis.get(cacheKey);

if (!products) {
  products = await getProducts({ type, sortBy: sort });
  await redis.set(cacheKey, JSON.stringify(products), { EX: 3600 }); // 1 hour
}

// Don't cache download tokens (security risk)
// Don't cache user-specific data (purchase info, dashboard)
```

## Deployment Considerations

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://...
DOWNLOAD_TOKEN_SECRET=your-secret-here
STRIPE_SECRET_KEY=sk_test_...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=digital-products

# Optional
REDIS_URL=redis://...
```

### File Storage Setup
1. Upload products to S3/R2/CloudFlare
2. Set file_url in database to storage URLs
3. Configure CORS for direct downloads (optional)
4. Use signed URLs for additional security
5. Set appropriate cache headers

### Monitoring
- Track download success/failure rates
- Monitor download speeds
- Alert on unusual download patterns
- Log failed token verifications
- Track products hitting limit frequently

## Next Steps

1. **Complete Stripe Integration**
   - Handle webhook events
   - Test payment failures
   - Implement refunds

2. **Set Up File Hosting**
   - Upload products to cloud storage
   - Implement streaming endpoint
   - Configure CDN

3. **Add Email Notifications**
   - Purchase confirmation
   - Download link email
   - Receipt generation

4. **Build Admin Interface**
   - Upload/manage products
   - View analytics
   - Reset download limits

5. **Implement Analytics**
   - Track popular products
   - Monitor download patterns
   - Revenue reporting

## Additional Resources

- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Stripe Documentation](https://stripe.com/docs)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/best-practices.html)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)

## Conclusion

Building a secure digital product system requires careful attention to:
- Authentication and authorization
- Token-based security
- Download limit enforcement
- Database query optimization
- Type safety and conversion
- Comprehensive testing

This implementation provides a solid foundation that can be extended with additional features like reviews, recommendations, and advanced analytics.
