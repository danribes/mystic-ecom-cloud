# Phase 2: Database & Caching Infrastructure (T013-T017)

## Overview

This phase establishes the data layer - how we store, retrieve, and cache information. Think of it as building the storage and filing system for our e-commerce platform.

---

## T013: Database Schema Design

### What We Created

A comprehensive PostgreSQL schema in `database/schema.sql` with 8 core tables.

### Schema Architecture

```
Users
  ↓ (1:many)
Orders ←→ Courses (many:many via order_items)
  ↓
order_items
  
Users → cart_items ← Courses

Events ← Bookings → Users
```

### Key Tables Explained

#### 1. Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Design Decisions:**

1. **UUID vs Auto-incrementing ID**
   ```sql
   -- Sequential IDs (bad for security)
   id SERIAL PRIMARY KEY  -- 1, 2, 3, 4...
   -- User can guess: "If I'm user 100, let me try user 101's data"
   
   -- UUID (good for security)
   id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   -- "a3bb189e-8bf9-3888-9912-ace4e6543002" - impossible to guess
   ```

2. **Password Storage**
   - `password_hash` - NEVER store plain text passwords
   - Length: 255 chars (bcrypt output is 60, but allows for future algorithms)
   
3. **Email as Unique Identifier**
   ```sql
   email VARCHAR(255) UNIQUE NOT NULL
   ```
   - Used for login
   - Must be unique (can't have duplicate accounts)
   - NOT NULL ensures every user has an email

4. **Role-Based Access Control (RBAC)**
   ```sql
   role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'))
   ```
   - Enum-like constraint (only 'user' or 'admin' allowed)
   - Default: 'user' (most accounts are regular users)
   - Enables authorization checks: `if (user.role !== 'admin') return 403;`

5. **Timestamps**
   ```sql
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ```
   - Audit trail (when was account created?)
   - Useful for analytics (user growth over time)

#### 2. Courses Table

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  full_description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  instructor_name VARCHAR(255),
  instructor_bio TEXT,
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  category VARCHAR(50),
  image_url TEXT,
  video_url TEXT,
  rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  enrollment_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Design Decisions:**

1. **Slug for SEO-Friendly URLs**
   ```sql
   slug VARCHAR(255) UNIQUE NOT NULL
   ```
   - Converts title to URL-safe string
   - Example: "Meditation for Beginners" → "meditation-for-beginners"
   - Better than: `/courses/a3bb189e-8bf9-3888-9912-ace4e6543002`
   - Good for: `/courses/meditation-for-beginners` (human-readable, SEO-friendly)

2. **Price Precision**
   ```sql
   price DECIMAL(10, 2) NOT NULL CHECK (price >= 0)
   ```
   - `DECIMAL(10, 2)`: 10 digits total, 2 after decimal
   - Supports: $99,999,999.99 (max price)
   - **Why not FLOAT?** Floating point has rounding errors:
     ```
     FLOAT: 99.99 + 0.01 = 100.00000001 (❌ wrong for money!)
     DECIMAL: 99.99 + 0.01 = 100.00 (✅ accurate)
     ```
   - `CHECK (price >= 0)`: Can't have negative prices

3. **Two-Level Descriptions**
   ```sql
   description TEXT,        -- Short (for listing pages)
   full_description TEXT,   -- Long (for detail pages)
   ```
   - Short: "Learn meditation basics in 30 days"
   - Full: Complete course overview with modules, outcomes, etc.
   - Performance: Don't load full description when showing 100 courses

4. **Enumerated Fields**
   ```sql
   level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'advanced'))
   ```
   - Database-enforced values (can't insert 'expert' by mistake)
   - Application can use TypeScript enums to match:
     ```typescript
     enum CourseLevel {
       Beginner = 'beginner',
       Intermediate = 'intermediate',
       Advanced = 'advanced'
     }
     ```

5. **Soft Delete via is_published**
   ```sql
   is_published BOOLEAN DEFAULT false
   ```
   - Don't delete courses (preserves order history)
   - Unpublished courses hidden from public but visible to admins
   - Allows draft → review → publish workflow

#### 3. Orders Table

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Design Decisions:**

1. **User Relationship with Cascade**
   ```sql
   user_id UUID REFERENCES users(id) ON DELETE CASCADE
   ```
   - Foreign key ensures user exists
   - `ON DELETE CASCADE`: If user deleted, delete their orders too
   - Alternative: `ON DELETE SET NULL` (keep order but anonymize)

2. **Human-Readable Order Numbers**
   ```sql
   order_number VARCHAR(50) UNIQUE NOT NULL
   ```
   - UUID: `a3bb189e-8bf9-3888-9912-ace4e6543002` (hard to reference)
   - Order number: `ORD-2025-000123` (customer service friendly)
   - Generated in application code:
     ```typescript
     const orderNumber = `ORD-${year}-${String(count).padStart(6, '0')}`;
     ```

3. **Order Status State Machine**
   ```sql
   status VARCHAR(20) DEFAULT 'pending' 
     CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
   ```
   - **pending**: Checkout session created, waiting for payment
   - **completed**: Payment successful, user has access
   - **failed**: Payment declined or error occurred
   - **refunded**: Money returned to customer

   Flow:
   ```
   pending → completed → refunded
       ↓
     failed
   ```

4. **Stripe Integration Fields**
   ```sql
   stripe_payment_intent_id VARCHAR(255),
   stripe_session_id VARCHAR(255)
   ```
   - Links order to Stripe payment records
   - Enables refunds: `stripe.refunds.create({ payment_intent: id })`
   - Webhook verification: Match incoming payment to order

#### 4. Cart Items (Session Storage)

```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('course', 'event', 'digital_product')),
  item_id UUID NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10),
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Design Decisions:**

1. **Session-Based (No User ID)**
   ```sql
   session_id VARCHAR(255) NOT NULL
   ```
   - Works for logged-out users (anonymous cart)
   - Session ID from cookie: `cart_session=abc123...`
   - After login, can merge session cart with user's saved cart

2. **Polymorphic Item Type**
   ```sql
   item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('course', 'event', 'digital_product')),
   item_id UUID NOT NULL
   ```
   - One cart table for multiple product types
   - `item_type + item_id` determines what table to join
   - Example query:
     ```sql
     SELECT cart_items.*, courses.title, courses.image_url
     FROM cart_items
     JOIN courses ON cart_items.item_id = courses.id
     WHERE cart_items.item_type = 'course'
     ```

3. **Quantity Limits**
   ```sql
   quantity INTEGER DEFAULT 1 CHECK (quantity > 0 AND quantity <= 10)
   ```
   - Digital products don't need quantity > 1 (buying same course twice doesn't make sense)
   - Max 10 prevents abuse/errors
   - Could be 1 for courses, up to 10 for event tickets

4. **Price Snapshot**
   ```sql
   price DECIMAL(10, 2) NOT NULL
   ```
   - Store price at time of adding to cart
   - If course price changes, cart shows original price
   - Prevents: "I added at $49.99, now it's $99.99!" complaints

---

## T016: PostgreSQL Connection Pool

### What We Created

`src/lib/db.ts` - A robust database connection manager.

### Implementation

```typescript
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // Maximum connections
  idleTimeoutMillis: 30000,  // Close idle connections after 30s
  connectionTimeoutMillis: 2000,  // Timeout if can't connect in 2s
});

// Graceful shutdown
process.on('SIGTERM', () => pool.end());
```

### Why Connection Pooling?

**Without Pooling (Bad):**
```typescript
// Every request creates new connection
async function getUser(id) {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();  // Slow! (~100ms)
  const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
  await client.end();
  return result.rows[0];
}
// 1000 requests = 1000 new connections = 💥 database overload
```

**With Pooling (Good):**
```typescript
// Reuses existing connections
async function getUser(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  // Connection automatically returned to pool
  return result.rows[0];
}
// 1000 requests = 20 connections (reused) = ✅ efficient
```

### Configuration Explained

```typescript
max: 20  // Maximum connections
```
- PostgreSQL default max connections: 100
- Leave headroom for admin tools, migrations, etc.
- Formula: `(num_servers * max_connections_per_server) < db_max_connections`

```typescript
idleTimeoutMillis: 30000
```
- Close connections idle for 30 seconds
- Frees resources during low traffic
- Prevents holding connections unnecessarily

```typescript
connectionTimeoutMillis: 2000
```
- Fail fast if database is down
- Better to show error than hang for 30 seconds
- User gets immediate feedback

### Error Handling

```typescript
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Log to monitoring service (Sentry, DataDog, etc.)
});
```

Catches errors on idle connections (database restarted, network issues, etc.)

---

## T017: Redis Client Configuration

### What We Created

`src/lib/redis.ts` - In-memory cache and session store.

### Implementation

```typescript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Too many retries');
      return Math.min(retries * 100, 3000);  // Exponential backoff
    }
  }
});

redis.on('error', (err) => console.error('Redis error:', err));
await redis.connect();
```

### Why Redis?

**Use Cases in Our Platform:**

1. **Session Storage**
   ```typescript
   // Store user session
   await redis.setEx(
     `session:${sessionId}`, 
     3600,  // 1 hour TTL (auto-delete)
     JSON.stringify({ userId, email, role })
   );
   
   // Retrieve session
   const session = await redis.get(`session:${sessionId}`);
   ```
   - Fast: In-memory (microseconds vs milliseconds for database)
   - Automatic expiration: Old sessions cleaned up automatically
   - Scalable: Can handle millions of sessions

2. **Shopping Cart (Temporary Data)**
   ```typescript
   // Store cart
   await redis.setEx(
     `cart:${sessionId}`,
     86400,  // 24 hours
     JSON.stringify(cartItems)
   );
   ```
   - Carts are temporary (abandoned after 24 hours)
   - Fast access (critical for checkout flow)
   - Less database load

3. **Caching Expensive Queries**
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
   - Featured courses don't change often
   - Serve from cache instead of hitting database
   - Update cache every 5 minutes (stale data acceptable)

4. **Rate Limiting**
   ```typescript
   // Allow 10 API calls per minute
   const key = `rate_limit:${userId}`;
   const count = await redis.incr(key);
   
   if (count === 1) {
     await redis.expire(key, 60);  // Reset after 60 seconds
   }
   
   if (count > 10) {
     throw new Error('Rate limit exceeded');
   }
   ```
   - Prevents abuse (user making 1000s of requests)
   - Protects API from overload

### Reconnection Strategy

```typescript
reconnectStrategy: (retries) => {
  if (retries > 10) return new Error('Too many retries');
  return Math.min(retries * 100, 3000);
}
```

**Exponential Backoff:**
- Attempt 1: Wait 100ms
- Attempt 2: Wait 200ms
- Attempt 3: Wait 300ms
- ...
- Attempt 10+: Give up

**Why?**
- Don't hammer a down server (makes problem worse)
- Give server time to recover
- Fail gracefully if Redis is truly down

---

## Key Takeaways

1. **Database Design**
   - UUIDs for security (unpredictable IDs)
   - DECIMAL for money (no rounding errors)
   - CHECK constraints for data integrity
   - Foreign keys with CASCADE for referential integrity

2. **Connection Pooling**
   - Reuses connections (performance)
   - Limits max connections (prevents overload)
   - Handles errors gracefully

3. **Redis Strategy**
   - Session storage (fast, auto-expiring)
   - Caching (reduce database load)
   - Rate limiting (prevent abuse)
   - Temporary data (carts, tokens)

4. **Resilience**
   - Connection timeouts (fail fast)
   - Retry logic (exponential backoff)
   - Error logging (monitoring)
   - Graceful shutdown (cleanup)

---

**Related Files:**
- [database/schema.sql](/home/dan/web/database/schema.sql)
- [src/lib/db.ts](/home/dan/web/src/lib/db.ts)
- [src/lib/redis.ts](/home/dan/web/src/lib/redis.ts)

**Next Guide:** [Authentication & Sessions (T018-T021)](./phase2-auth-sessions.md)
