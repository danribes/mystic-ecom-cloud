# Quick Reference: Key Concepts by Topic

## Table of Contents

- [Architecture Decisions](#architecture-decisions)
- [Security Best Practices](#security-best-practices)
- [Performance Optimization](#performance-optimization)
- [Testing Strategy](#testing-strategy)
- [Common Patterns](#common-patterns)

---

## Architecture Decisions

### Why Astro?
- **SSR + Static**: Best of both worlds (fast static pages + dynamic APIs)
- **Zero JS by default**: Ship less JavaScript = faster page loads
- **Islands architecture**: Only interactive components get JavaScript
- **Built-in API routes**: No separate backend needed

📖 See: [Phase 1: Initial Setup](./phase1-setup.md#why-astro)

### Why PostgreSQL?
- **ACID compliance**: Data integrity for financial transactions
- **Relationships**: Complex joins (orders ↔ courses ↔ users)
- **Full-text search**: Course catalog search
- **JSON support**: Flexible metadata storage

📖 See: [Phase 2: Database & Redis](./phase2-database-redis.md#why-postgresql)

### Why Redis?
- **Session storage**: Fast, auto-expiring user sessions
- **Caching**: Reduce database load for frequently accessed data
- **Shopping cart**: Temporary storage for anonymous users
- **Rate limiting**: Prevent API abuse

📖 See: [Phase 2: Database & Redis](./phase2-database-redis.md#why-redis)

---

## Security Best Practices

### Password Hashing

```typescript
// ❌ NEVER DO THIS
await db.insert({ password: userPassword });  // Plain text!

// ✅ ALWAYS DO THIS
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(userPassword, 10);
await db.insert({ password: hash });

// Verify on login
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

**Why bcrypt?**
- One-way encryption (can't reverse)
- Salted (same password → different hashes)
- Slow by design (prevents brute force)

📖 See: [Phase 1: Setup](./phase1-setup.md#4-security)

### Input Validation

```typescript
// Client-side: Fast feedback
if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  return showError('Invalid email');
}

// Server-side: Security (NEVER TRUST CLIENT)
const schema = z.object({
  email: z.string().email(),
  quantity: z.number().int().min(1).max(10)
});

const validated = schema.parse(userInput);  // Throws if invalid
```

**Always validate on server** - client validation can be bypassed!

📖 See: [Phase 3: Cart & Checkout](./phase3-cart-checkout.md#4-input-validation)

### SQL Injection Prevention

```typescript
// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;
// If userEmail = "' OR '1'='1", gets all users!

// ✅ SAFE: Parameterized queries
const query = 'SELECT * FROM users WHERE email = $1';
await db.query(query, [userEmail]);  // PostgreSQL escapes input
```

📖 See: [Phase 2: Database](./phase2-database-redis.md#t016-postgresql-connection-pool)

### Session Security

```typescript
// Secure cookie configuration
cookies.set('session_id', sessionId, {
  httpOnly: true,    // JavaScript can't access (XSS protection)
  secure: true,      // HTTPS only
  sameSite: 'lax',   // CSRF protection
  maxAge: 3600       // 1 hour expiration
});
```

📖 See: [Phase 3: Cart](./phase3-cart-checkout.md#2-session-based-cart-anonymous-users)

### Stripe Webhook Verification

```typescript
// Verify webhook is really from Stripe
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

// Prevents fake "payment succeeded" events from attackers
```

📖 See: [Phase 3: Checkout](./phase3-cart-checkout.md#webhook-handler-t047---future)

---

## Performance Optimization

### Connection Pooling

```typescript
// ❌ Slow: New connection per request
const client = new Client();
await client.connect();  // ~100ms overhead

// ✅ Fast: Reuse connections
const pool = new Pool({ max: 20 });
await pool.query(sql, params);  // ~1ms overhead
```

**Benefits:**
- Reuses existing connections
- Limits max connections (prevents overload)
- Automatic connection management

📖 See: [Phase 2: Database](./phase2-database-redis.md#why-connection-pooling)

### Redis Caching

```typescript
// Check cache first
let courses = await redis.get('courses:featured');

if (!courses) {
  // Cache miss - query database
  courses = await db.query('SELECT * FROM courses WHERE featured = true');
  
  // Cache for 5 minutes
  await redis.setEx('courses:featured', 300, JSON.stringify(courses));
}

return JSON.parse(courses);
```

**When to cache:**
- Data that doesn't change often (featured courses)
- Expensive queries (complex joins, aggregations)
- High-traffic endpoints

📖 See: [Phase 2: Redis](./phase2-database-redis.md#3-caching-expensive-queries)

### Decimal Precision for Money

```typescript
// ❌ Floating point errors
const total = 49.99 + 0.01;  // 50.00000000001

// ✅ Use DECIMAL in database
price DECIMAL(10, 2)  // Exact precision

// ✅ Round to cents in JavaScript
const total = Math.round((subtotal + tax) * 100) / 100;
```

📖 See: [Phase 2: Database Schema](./phase2-database-redis.md#2-price-precision)

---

## Testing Strategy

### Test Pyramid

```
        /\
       /E2E\      ← Few (slow, expensive)
      /------\
     /Integration\   ← Some (medium speed)
    /------------\
   /  Unit Tests  \  ← Many (fast, cheap)
  /----------------\
```

**Unit Tests (70%):**
- Test individual functions
- Use mocks for dependencies
- Fast (milliseconds)
- Example: `calculateTotal([items])`

**Integration Tests (20%):**
- Test multiple components together
- Use test database
- Medium speed (seconds)
- Example: Add to cart → verify in database

**E2E Tests (10%):**
- Test complete user flows
- Real browser automation
- Slow (minutes)
- Example: Browse → Add to cart → Checkout → Confirm

📖 See: [Phase 3: TDD](./phase3-tdd.md#testing-strategy)

### Arrange-Act-Assert Pattern

```typescript
it('should calculate cart total with tax', () => {
  // Arrange: Set up test data
  const items = [
    { price: 49.99, quantity: 1 },
    { price: 29.99, quantity: 2 }
  ];
  
  // Act: Execute function
  const total = calculateTotal(items);
  
  // Assert: Verify results
  expect(total.subtotal).toBe(109.97);
  expect(total.tax).toBe(8.80);  // 8% of 109.97
  expect(total.total).toBe(118.77);
});
```

📖 See: [Phase 3: TDD](./phase3-tdd.md#anatomy-of-a-test)

### Mocking External Dependencies

```typescript
// Mock database to avoid real I/O
vi.spyOn(db, 'query').mockResolvedValue({
  rows: [{ id: '1', title: 'Test Course', price: 49.99 }]
});

// Test function without hitting database
const courses = await getCourses();
expect(courses).toHaveLength(1);
```

**Benefits:**
- Fast (no I/O)
- Isolated (no side effects)
- Can test error cases easily

📖 See: [Phase 3: TDD](./phase3-tdd.md#why-mock-the-database)

---

## Common Patterns

### Server-Side Rendering (SSR)

```astro
---
// Runs on SERVER before HTML is sent
const courses = await db.query('SELECT * FROM courses');
---

<!-- HTML sent to browser with data already rendered -->
<div>
  {courses.map(course => (
    <div>{course.title}</div>
  ))}
</div>
```

**Benefits:**
- SEO (search engines see content)
- Fast initial render (no loading spinner)
- Works with JavaScript disabled

📖 See: [Phase 3: Cart](./phase3-cart-checkout.md#1-server-side-rendering-ssr)

### Progressive Enhancement

```html
<!-- Works WITHOUT JavaScript -->
<form method="POST" action="/api/cart/add">
  <button type="submit">Add to Cart</button>
</form>

<!-- Enhanced WITH JavaScript -->
<script>
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await fetch('/api/cart/add', { method: 'POST' });
    updateUI();  // No page reload!
  });
</script>
```

📖 See: [Phase 3: Cart](./phase3-cart-checkout.md#3-progressive-enhancement)

### RESTful API Design

```typescript
GET    /api/cart       // Read cart
POST   /api/cart/add   // Add item
DELETE /api/cart/remove // Remove item
PUT    /api/cart/update // Update quantity
```

**Conventions:**
- Use HTTP verbs (GET, POST, PUT, DELETE)
- Use plural nouns (/api/courses not /api/course)
- Return proper status codes (200, 201, 400, 404, 500)

📖 See: [Phase 3: Cart API](./phase3-cart-checkout.md#1-restful-conventions)

### Component Props with TypeScript

```typescript
interface Props {
  item: {
    id: string;
    title: string;
    price: number;
  };
}

const { item } = Astro.props;
```

**Benefits:**
- Type safety (prevents typos)
- IDE autocomplete
- Compile-time error checking
- Self-documenting code

📖 See: [Phase 3: Components](./phase3-cart-checkout.md#1-props-interface-type-safety)

### Error Handling Pattern

```typescript
export async function POST({ request }: APIContext) {
  try {
    // Validate input
    const schema = z.object({ /* ... */ });
    const validated = schema.parse(await request.json());
    
    // Business logic
    const result = await processData(validated);
    
    // Success response
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    // Log error (for debugging)
    console.error('API error:', error);
    
    // User-friendly error response
    return new Response(JSON.stringify({
      error: error.message,
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

📖 See: [Phase 3: Cart API](./phase3-cart-checkout.md#t042-add-to-cart-api)

---

## Database Patterns

### UUID vs Auto-increment

```sql
-- ❌ Sequential (security risk)
id SERIAL PRIMARY KEY  -- 1, 2, 3, 4...
-- Attacker can enumerate: /api/users/1, /api/users/2, etc.

-- ✅ UUID (unpredictable)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- a3bb189e-8bf9-3888-9912-ace4e6543002
```

📖 See: [Phase 2: Database Schema](./phase2-database-redis.md#1-uuid-vs-auto-incrementing-id)

### Soft Delete Pattern

```sql
-- Don't actually delete
is_published BOOLEAN DEFAULT false

-- Query for active records
SELECT * FROM courses WHERE is_published = true;
```

**Benefits:**
- Preserve order history
- Allow rollback
- Maintain referential integrity

📖 See: [Phase 2: Database Schema](./phase2-database-redis.md#5-soft-delete-via-is_published)

### Transaction Safety

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  await client.query('INSERT INTO orders...');
  await client.query('INSERT INTO order_items...');
  await client.query('DELETE FROM cart_items...');
  
  await client.query('COMMIT');  // All or nothing
} catch (error) {
  await client.query('ROLLBACK');  // Undo all changes
  throw error;
} finally {
  client.release();
}
```

📖 See: [Phase 3: TDD](./phase3-tdd.md#testing-transaction-safety)

---

## Quick Tips

### TypeScript Strict Mode Benefits
✅ Catch errors at compile time, not runtime  
✅ Better IDE autocomplete  
✅ Self-documenting code (types = documentation)  
✅ Easier refactoring

### Security Checklist
✅ Hash passwords with bcrypt  
✅ Validate input on server  
✅ Use parameterized queries (prevent SQL injection)  
✅ Set httpOnly cookies (prevent XSS)  
✅ Use HTTPS only  
✅ Verify webhook signatures

### Performance Checklist
✅ Use connection pooling  
✅ Cache frequently accessed data  
✅ Use DECIMAL for money (not FLOAT)  
✅ Index foreign keys  
✅ Lazy load large images  
✅ Minimize JavaScript bundle

### Testing Checklist
✅ Test happy path  
✅ Test error cases  
✅ Test edge cases (null, empty, max values)  
✅ Test business rules  
✅ Mock external dependencies  
✅ Aim for 70%+ code coverage

---

## Learning Path

**Beginner (Start Here):**
1. [Phase 1: Project Setup](./phase1-setup.md) - Foundation
2. [Phase 2: Database & Redis](./phase2-database-redis.md) - Data layer

**Intermediate:**
3. [Phase 3: Test-Driven Development](./phase3-tdd.md) - Testing methodology
4. [Phase 3: Cart & Checkout](./phase3-cart-checkout.md) - E-commerce flow

**Advanced (Coming Soon):**
5. Authentication & Sessions - User management
6. Stripe Integration - Payment processing
7. Email & Notifications - Communication
8. Admin Dashboard - Management interface

---

**Questions or feedback?** Create an issue or update these guides with improvements!
