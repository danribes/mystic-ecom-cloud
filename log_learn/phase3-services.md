# Phase 3: Business Logic Services (T032-T035)

## Overview

This phase implements the business logic layer that sits between API routes and the database. Services encapsulate domain-specific operations like course management, shopping cart functionality, order processing, and payment integration with Stripe.

---

## T032: Course Service

### File: `src/services/course.service.ts`

### Service Layer Pattern

**Why separate services?**

```typescript
// ❌ Business logic in API route (bad)
export async function POST({ request }: APIContext) {
  const data = await request.json();
  
  // Validation logic
  if (!data.title || data.title.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Title required' }), { status: 400 });
  }
  
  // Database logic
  const result = await pool.query('INSERT INTO courses...', [data.title, data.price]);
  
  // Business logic
  if (data.isPublished) {
    await pool.query('UPDATE courses SET published_at = NOW()...');
  }
  
  return new Response(JSON.stringify(result.rows[0]));
}
// Problem: Logic is tied to HTTP layer, can't reuse, hard to test

// ✅ Business logic in service (good)
export async function POST({ request }: APIContext) {
  const data = await request.json();
  const course = await createCourse(data);  // Service handles everything
  return new Response(JSON.stringify(course));
}
// Benefit: Reusable, testable, clean separation of concerns
```

### Course CRUD Operations

**Create Course:**
```typescript
export async function createCourse(input: CreateCourseInput): Promise<Course> {
  // 1. Validate input
  if (!input.title || input.title.trim().length === 0) {
    throw new ValidationError('Title is required', { title: 'Title cannot be empty' });
  }
  
  if (input.price < 0) {
    throw new ValidationError('Price cannot be negative', { price: 'Price must be non-negative' });
  }
  
  // 2. Verify instructor exists
  const instructorCheck = await pool.query(
    'SELECT id, name FROM users WHERE id = $1 AND deleted_at IS NULL',
    [input.instructorId]
  );
  
  if (instructorCheck.rows.length === 0) {
    throw new NotFoundError('Instructor not found');
  }
  
  // 3. Generate unique slug
  const uniqueSlug = await generateUniqueSlug(pool, input.slug);
  
  // 4. Insert into database
  const result = await pool.query(
    `INSERT INTO courses (title, slug, price, instructor_id, ...)
     VALUES ($1, $2, $3, $4, ...) RETURNING *`,
    [input.title, uniqueSlug, input.price, input.instructorId, ...]
  );
  
  return mapRowToCourse(result.rows[0]);
}
```

**Key features:**
- Input validation before database operations
- Foreign key verification (instructor exists)
- Unique slug generation with conflict resolution
- Structured error handling

### Slug Generation

**Why slugs?**
```
Title: "Introduction to Meditation"
Slug: "introduction-to-meditation"

URL: /courses/introduction-to-meditation
  ✓ Human-readable
  ✓ SEO-friendly
  ✓ Memorable
  
vs URL: /courses/a3f5b2c1-d4e6-f7a8-b9c0-d1e2f3a4b5c6
  ✗ Not readable
  ✗ Poor SEO
  ✗ Hard to remember
```

**Unique slug generation:**
```typescript
async function generateUniqueSlug(pool: Pool, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    // Check if slug exists
    const query = excludeId
      ? 'SELECT id FROM courses WHERE slug = $1 AND id != $2 AND deleted_at IS NULL'
      : 'SELECT id FROM courses WHERE slug = $1 AND deleted_at IS NULL';
    
    const params = excludeId ? [slug, excludeId] : [slug];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return slug;  // Slug is unique
    }

    // Conflict - append number
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
```

**Example:**
```
First course: "meditation" → "meditation"
Second course: "meditation" → "meditation-2"
Third course: "meditation" → "meditation-3"
```

### Advanced Filtering & Search

**List courses with complex filters:**
```typescript
export async function listCourses(options: ListCoursesOptions = {}): Promise<PaginatedCourses> {
  const {
    page = 1,
    limit = 10,
    category,        // Filter by category
    level,           // Filter by difficulty level
    minPrice,        // Price range
    maxPrice,
    search,          // Full-text search
    tags,            // Array of tags
    isPublished,     // Published only
    isFeatured,      // Featured courses
    sortBy = 'createdAt',
    sortOrder = 'DESC',
  } = options;

  const offset = (page - 1) * limit;

  // Build dynamic WHERE clause
  const conditions: string[] = ['c.deleted_at IS NULL'];
  const values: any[] = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`c.category = $${paramIndex++}`);
    values.push(category);
  }

  if (search) {
    conditions.push(`(
      c.title ILIKE $${paramIndex} OR 
      c.description ILIKE $${paramIndex} OR
      c.category ILIKE $${paramIndex}
    )`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  if (tags && tags.length > 0) {
    conditions.push(`c.tags ?| $${paramIndex++}`);  // PostgreSQL JSON array contains operator
    values.push(tags);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as count FROM courses c WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get paginated results
  const result = await pool.query(
    `SELECT c.*, u.name as instructor_name
     FROM courses c
     LEFT JOIN users u ON c.instructor_id = u.id
     WHERE ${whereClause}
     ORDER BY ${sortColumn} ${sortOrder}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  return {
    courses: result.rows.map(mapRowToCourse),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

**Dynamic WHERE clause building:**
```sql
-- No filters:
WHERE c.deleted_at IS NULL

-- With category filter:
WHERE c.deleted_at IS NULL AND c.category = 'Meditation'

-- With search:
WHERE c.deleted_at IS NULL 
  AND c.category = 'Meditation'
  AND (c.title ILIKE '%yoga%' OR c.description ILIKE '%yoga%')

-- With tags:
WHERE c.deleted_at IS NULL 
  AND c.category = 'Meditation'
  AND c.tags ?| ARRAY['beginner', 'mindfulness']
```

### Soft Deletes

**Why soft delete?**
```typescript
// ❌ Hard delete (permanent)
await pool.query('DELETE FROM courses WHERE id = $1', [id]);
// Problem: Can't recover, breaks foreign key references, lost audit trail

// ✅ Soft delete (recoverable)
await pool.query('UPDATE courses SET deleted_at = NOW() WHERE id = $1', [id]);
// Benefit: Recoverable, preserves history, maintains referential integrity
```

**All queries exclude deleted:**
```typescript
// Always include deleted_at check
'SELECT * FROM courses WHERE deleted_at IS NULL'
'UPDATE courses SET ... WHERE id = $1 AND deleted_at IS NULL'
```

---

## T033: Cart Service

### File: `src/services/cart.service.ts`

### Why Redis for Carts?

**Comparison of cart storage methods:**

**1. Database (PostgreSQL)**
```
✗ Slow (disk I/O for every add/update)
✗ Table pollution (millions of abandoned carts)
✓ Persistent
✓ ACID transactions
```

**2. Cookies**
```
✗ Size limit (4KB)
✗ Security issues (visible to user)
✗ Sent with every request (bandwidth)
✓ No server storage
```

**3. Redis ✅**
```
✓ Fast (<1ms operations)
✓ Automatic expiration (7-day TTL)
✓ No manual cleanup needed
✓ Scales well
✓ Atomic operations
✓ Session-based isolation
```

### Cart Data Structure

```typescript
interface Cart {
  userId: string;           // Session-based user ID
  items: CartItem[];        // Array of cart items
  subtotal: number;         // Total before tax (cents)
  tax: number;              // Tax amount (cents)
  total: number;            // Final total (cents)
  itemCount: number;        // Total number of items
  updatedAt: Date;          // Last modification timestamp
}

interface CartItem {
  itemType: 'course' | 'event' | 'digital_product';
  itemId: string;           // ID of the item
  itemTitle: string;        // Cached for display
  itemSlug: string;         // For URL generation
  price: number;            // Price in cents
  quantity: number;         // Quantity
}
```

### Cart Operations

**Add to cart:**
```typescript
export async function addToCart(
  userId: string,
  itemType: 'course' | 'event' | 'digital_product',
  itemId: string,
  quantity: number = 1
): Promise<Cart> {
  const redis = await getRedisClient();
  const pool = getPool();

  // 1. Validate quantity
  if (quantity < 1) {
    throw new ValidationError('Quantity must be at least 1');
  }

  // 2. Verify item exists
  if (itemType === 'course') {
    const result = await pool.query(
      'SELECT id, title, price_cents FROM courses WHERE id = $1 AND deleted_at IS NULL',
      [itemId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('Course');
    }
    item = { id: result.rows[0].id, title: result.rows[0].title, price: result.rows[0].price_cents };
  }

  // 3. Get existing cart or create new
  const cartKey = `cart:${userId}`;
  const existingCartData = await redis.get(cartKey);
  let cart: Cart = existingCartData ? JSON.parse(existingCartData) : createEmptyCart(userId);

  // 4. Check if item already in cart
  const existingItemIndex = cart.items.findIndex(
    (i) => i.itemType === itemType && i.itemId === itemId
  );

  if (existingItemIndex >= 0) {
    // Increment quantity
    cart.items[existingItemIndex]!.quantity += quantity;
  } else {
    // Add new item
    cart.items.push({
      itemType,
      itemId,
      itemTitle: item.title,
      itemSlug: '',
      price: item.price,
      quantity,
    });
  }

  // 5. Recalculate totals
  const totals = calculateTotals(cart.items);
  cart.subtotal = totals.subtotal;
  cart.tax = totals.tax;
  cart.total = totals.total;
  cart.itemCount = totals.itemCount;
  cart.updatedAt = new Date();

  // 6. Save to Redis with TTL
  await redis.set(cartKey, JSON.stringify(cart), { EX: CART_TTL });  // 7 days

  return cart;
}
```

### Tax Calculation

```typescript
const TAX_RATE = 0.08; // 8% tax

function calculateTotals(items: CartItem[]): {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE);  // Round to nearest cent
  const total = subtotal + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { subtotal, tax, total, itemCount };
}
```

**Example:**
```
Course 1: $29.99 × 1 = $29.99
Course 2: $49.99 × 1 = $49.99
Subtotal:              $79.98
Tax (8%):              $6.40
Total:                 $86.38
```

### Cart Validation

**Why validate before checkout?**
```typescript
// Prices may have changed
// Items may be out of stock
// Events may have started
// Courses may be unpublished
```

```typescript
export async function validateCart(userId: string): Promise<{ valid: boolean; errors: string[] }> {
  const cart = await getCart(userId);
  const pool = getPool();
  const errors: string[] = [];

  for (const item of cart.items) {
    if (item.itemType === 'course') {
      const result = await pool.query(
        'SELECT id, title, price_cents, is_published FROM courses WHERE id = $1 AND deleted_at IS NULL',
        [item.itemId]
      );
      
      if (result.rows.length === 0) {
        errors.push(`Course "${item.itemTitle}" is no longer available`);
      } else {
        const course = result.rows[0];
        if (!course.is_published) {
          errors.push(`Course "${item.itemTitle}" is not currently available`);
        }
        if (course.price_cents !== item.price) {
          errors.push(`Price for "${item.itemTitle}" has changed`);
        }
      }
    } else if (item.itemType === 'event') {
      // Check event availability, capacity, start date
      const result = await pool.query(
        'SELECT id, start_date, max_attendees, current_bookings FROM events WHERE id = $1',
        [item.itemId]
      );
      
      if (result.rows.length === 0) {
        errors.push(`Event "${item.itemTitle}" is no longer available`);
      } else {
        const event = result.rows[0];
        if (new Date(event.start_date) < new Date()) {
          errors.push(`Event "${item.itemTitle}" has already started`);
        }
        if (event.current_bookings >= event.max_attendees) {
          errors.push(`Event "${item.itemTitle}" is fully booked`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Guest Cart Merge

**Scenario:**
1. User adds items to cart as guest
2. User logs in
3. User already has items in logged-in cart
4. Merge guest cart into user cart

```typescript
export async function mergeGuestCart(guestUserId: string, loggedInUserId: string): Promise<Cart> {
  const redis = await getRedisClient();
  
  const guestCartKey = `cart:${guestUserId}`;
  const userCartKey = `cart:${loggedInUserId}`;
  
  const guestCartData = await redis.get(guestCartKey);
  
  if (!guestCartData) {
    return getCart(loggedInUserId);  // No guest cart to merge
  }

  const guestCart: Cart = JSON.parse(guestCartData);
  const userCart: Cart = await getCart(loggedInUserId);

  // Merge items
  for (const guestItem of guestCart.items) {
    const existingItemIndex = userCart.items.findIndex(
      (i) => i.itemType === guestItem.itemType && i.itemId === guestItem.itemId
    );

    if (existingItemIndex >= 0) {
      // Combine quantities
      userCart.items[existingItemIndex]!.quantity += guestItem.quantity;
    } else {
      // Add guest item to user cart
      userCart.items.push(guestItem);
    }
  }

  // Recalculate totals
  const totals = calculateTotals(userCart.items);
  userCart.userId = loggedInUserId;
  userCart.subtotal = totals.subtotal;
  userCart.tax = totals.tax;
  userCart.total = totals.total;
  userCart.itemCount = totals.itemCount;
  userCart.updatedAt = new Date();

  // Save merged cart
  await redis.set(userCartKey, JSON.stringify(userCart), { EX: CART_TTL });

  // Delete guest cart
  await redis.del(guestCartKey);

  return userCart;
}
```

---

## T034: Order Service

### File: `src/services/order.service.ts`

### Order Lifecycle

```
1. pending           → Initial state after createOrder()
   ↓
2. payment_pending   → Stripe Checkout Session created
   ↓
3. paid              → Payment successful (webhook)
   ↓
4. processing        → Fulfilling order (granting access)
   ↓
5. completed         → Access granted, order fulfilled
   
Side paths:
- cancelled          → From pending or payment_pending
- refunded           → From completed
```

### Transaction-Based Order Creation

**Why transactions?**
```typescript
// ❌ Without transaction
await pool.query('INSERT INTO orders ...'); // ✓ Succeeds
await pool.query('INSERT INTO order_items ...'); // ✗ Fails
// Result: Order exists but has no items (orphaned record)

// ✅ With transaction
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO orders ...');
  await client.query('INSERT INTO order_items ...');
  await client.query('COMMIT');
  // Result: Both succeed or both fail (atomic)
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**Create order:**
```typescript
export async function createOrder(
  userId: string,
  cartItems: Cart['items'],
  userEmail: string
): Promise<Order> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Validate cart is not empty
    if (!cartItems || cartItems.length === 0) {
      throw new ValidationError('Cart is empty');
    }

    // 2. Verify all items still exist and are available
    for (const item of cartItems) {
      if (item.itemType === 'course') {
        const result = await client.query(
          'SELECT id, is_published FROM courses WHERE id = $1 AND deleted_at IS NULL',
          [item.itemId]
        );
        if (result.rows.length === 0 || !result.rows[0].is_published) {
          throw new ValidationError(`Course "${item.itemTitle}" is not available`);
        }
      }
      // Similar checks for events and products
    }

    // 3. Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * 0.08);
    const total = subtotal + tax;

    // 4. Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, status, subtotal, tax, total, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, user_id, status, subtotal, tax, total, created_at, updated_at`,
      [userId, 'pending', subtotal, tax, total]
    );

    const order = orderResult.rows[0];

    // 5. Create order items
    for (const item of cartItems) {
      await client.query(
        `INSERT INTO order_items (order_id, item_type, item_id, item_title, price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.itemType, item.itemId, item.itemTitle, item.price, item.quantity]
      );
    }

    await client.query('COMMIT');

    return getOrderById(order.id, userId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Order Status Validation

**Allowed transitions:**
```typescript
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['payment_pending', 'cancelled'],
  payment_pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: ['refunded'],
  cancelled: [],        // Terminal state
  refunded: [],         // Terminal state
};
```

**Why enforce transitions?**
```
❌ Prevent invalid flows:
  completed → pending (can't uncomplete an order)
  refunded → paid (can't unpay a refund)
  cancelled → processing (can't process cancelled order)
```

### Order Fulfillment

**Grant access to purchased items:**
```typescript
export async function fulfillOrder(orderId: string): Promise<Order> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get order
    const orderResult = await client.query(
      'SELECT id, user_id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundError('Order');
    }

    const order = orderResult.rows[0];

    // 2. Validate order is paid
    if (order.status !== 'paid' && order.status !== 'processing') {
      throw new ValidationError('Order must be paid before fulfillment');
    }

    // 3. Get order items
    const itemsResult = await client.query(
      'SELECT item_type, item_id, quantity FROM order_items WHERE order_id = $1',
      [orderId]
    );

    // 4. Fulfill each item
    for (const item of itemsResult.rows) {
      if (item.item_type === 'course') {
        // Grant course access
        await client.query(
          `INSERT INTO course_progress (user_id, course_id, enrollment_date, status)
           VALUES ($1, $2, NOW(), 'enrolled')
           ON CONFLICT (user_id, course_id) DO NOTHING`,
          [order.user_id, item.item_id]
        );

        // Increment enrollment count
        await client.query(
          'UPDATE courses SET enrollment_count = enrollment_count + 1 WHERE id = $1',
          [item.item_id]
        );
      } else if (item.item_type === 'event') {
        // Create booking
        await client.query(
          `INSERT INTO bookings (user_id, event_id, status, booking_date, number_of_attendees)
           VALUES ($1, $2, 'confirmed', NOW(), $3)`,
          [order.user_id, item.item_id, item.quantity]
        );
      } else if (item.item_type === 'digital_product') {
        // Grant download access
        await client.query(
          `INSERT INTO download_logs (user_id, product_id, downloaded_at)
           VALUES ($1, $2, NOW())`,
          [order.user_id, item.item_id]
        );
      }
    }

    // 5. Update order status to completed
    await client.query(
      `UPDATE orders SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [orderId]
    );

    await client.query('COMMIT');

    return getOrderById(orderId, order.user_id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Order Refunds

**Reverse fulfillment:**
```typescript
export async function refundOrder(orderId: string, reason?: string): Promise<Order> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get order
    const order = await getOrderById(orderId, userId);

    // 2. Validate order is completed
    if (order.status !== 'completed') {
      throw new ValidationError('Only completed orders can be refunded');
    }

    // 3. Revoke access for each item
    for (const item of order.items) {
      if (item.itemType === 'course') {
        // Revoke course access
        await client.query(
          `UPDATE course_progress 
           SET status = 'cancelled'
           WHERE user_id = $1 AND course_id = $2`,
          [order.userId, item.itemId]
        );

        // Decrement enrollment count
        await client.query(
          'UPDATE courses SET enrollment_count = GREATEST(enrollment_count - 1, 0) WHERE id = $1',
          [item.itemId]
        );
      } else if (item.itemType === 'event') {
        // Cancel booking
        await client.query(
          `UPDATE bookings 
           SET status = 'cancelled'
           WHERE user_id = $1 AND event_id = $2 AND status = 'confirmed'`,
          [order.userId, item.itemId]
        );
      }
      // Similar for digital products
    }

    // 4. Update order status to refunded
    await client.query(
      `UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
      [orderId]
    );

    await client.query('COMMIT');

    return getOrderById(orderId, order.userId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## T035: Stripe Integration Service

### File: `src/lib/stripe.ts`

### Payment Flow

```
1. User clicks "Checkout"
   ↓
2. Frontend calls /api/checkout
   ↓
3. createCheckoutSession() creates Stripe session
   ↓
4. User redirected to Stripe Checkout page
   ↓
5. User enters payment details
   ↓
6. Stripe processes payment
   ↓
7. Stripe sends webhook to /api/webhooks/stripe
   ↓
8. validateWebhook() verifies signature
   ↓
9. processWebhookEvent() handles event
   ↓
10. updateOrderStatus() marks order as paid
    ↓
11. fulfillOrder() grants access to courses/events
    ↓
12. User redirected to success page
```

### Create Checkout Session

```typescript
export async function createCheckoutSession(
  orderId: string,
  order: {
    items: Array<{ itemType: string; itemTitle: string; price: number; quantity: number }>;
    subtotal: number;
    tax: number;
    total: number;
    userEmail: string;
  },
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  // 1. Validate inputs
  if (order.total <= 0) {
    throw new ValidationError('Order total must be greater than zero');
  }

  // 2. Convert items to Stripe line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.itemTitle,
        description: `${item.itemType}`,
      },
      unit_amount: item.price, // Price in cents
    },
    quantity: item.quantity,
  }));

  // 3. Add tax as separate line item
  if (order.tax > 0) {
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Tax',
          description: 'Sales tax',
        },
        unit_amount: order.tax,
      },
      quantity: 1,
    });
  }

  // 4. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: order.userEmail,
    client_reference_id: orderId,          // Link session to our order
    metadata: {
      orderId,
      subtotal: order.subtotal.toString(),
      tax: order.tax.toString(),
      total: order.total.toString(),
    },
    payment_intent_data: {
      metadata: {
        orderId,                            // Also attach to payment intent
      },
    },
  });

  return session;
}
```

**Stripe session response:**
```json
{
  "id": "cs_test_a1B2c3D4e5F6g7H8i9J0",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "payment_status": "unpaid",
  "amount_total": 8638,
  "metadata": {
    "orderId": "order_123"
  }
}
```

### Webhook Validation

**Why validate webhooks?**
```typescript
// ❌ Without validation
POST /api/webhooks/stripe
{
  "type": "checkout.session.completed",
  "data": { "orderId": "order_123" }
}
// Attacker could fake this and get free access!

// ✅ With signature validation
POST /api/webhooks/stripe
Headers: Stripe-Signature: t=1234,v1=abc123...
// Stripe signs the payload with webhook secret
// Only Stripe knows the secret
// Cannot be faked
```

```typescript
export function validateWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (error) {
    throw new ValidationError(`Webhook signature verification failed: ${error.message}`);
  }
}
```

### Process Webhook Events

```typescript
export async function processWebhookEvent(
  event: Stripe.Event
): Promise<{
  type: string;
  orderId: string | null;
  paymentIntentId?: string;
  amount?: number;
  status?: string;
}> {
  const { type, data } = event;

  switch (type) {
    case 'checkout.session.completed': {
      const session = data.object as Stripe.Checkout.Session;
      return {
        type: 'checkout.completed',
        orderId: session.client_reference_id || session.metadata?.orderId || null,
        paymentIntentId: session.payment_intent as string,
        amount: session.amount_total || 0,
        status: 'paid',
        data: {
          customerEmail: session.customer_email,
          paymentStatus: session.payment_status,
        },
      };
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = data.object as Stripe.PaymentIntent;
      return {
        type: 'payment.succeeded',
        orderId: paymentIntent.metadata?.orderId || null,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: 'paid',
      };
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = data.object as Stripe.PaymentIntent;
      return {
        type: 'payment.failed',
        orderId: paymentIntent.metadata?.orderId || null,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: 'payment_failed',
        data: {
          lastPaymentError: paymentIntent.last_payment_error?.message,
        },
      };
    }

    case 'charge.refunded': {
      const charge = data.object as Stripe.Charge;
      return {
        type: 'charge.refunded',
        orderId: charge.metadata?.orderId || null,
        paymentIntentId: charge.payment_intent as string,
        amount: charge.amount_refunded,
        status: 'refunded',
      };
    }

    default:
      return {
        type,
        orderId: null,
      };
  }
}
```

### Webhook Handler in API Route

```typescript
// src/pages/api/webhooks/stripe.ts
export async function POST({ request }: APIContext) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  try {
    // 1. Validate webhook
    const event = validateWebhook(payload, signature);

    // 2. Process event
    const result = await processWebhookEvent(event);

    // 3. Update order based on event
    if (result.orderId && result.status === 'paid') {
      await updateOrderStatus(result.orderId, 'paid');
      await fulfillOrder(result.orderId);
    } else if (result.orderId && result.status === 'refunded') {
      await refundOrder(result.orderId);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
```

---

## Service Layer Benefits

### 1. Separation of Concerns

```
API Routes (HTTP layer)
  ↓ calls
Services (Business logic)
  ↓ calls
Database (Data persistence)
```

**Each layer has one job:**
- API Routes: Handle HTTP requests/responses
- Services: Business logic, validation, orchestration
- Database: Store and retrieve data

### 2. Reusability

```typescript
// Use from API route
export async function POST({ request }: APIContext) {
  const data = await request.json();
  const course = await createCourse(data);
  return new Response(JSON.stringify(course));
}

// Use from admin dashboard
async function bulkImportCourses(csvData: string) {
  for (const row of parseCSV(csvData)) {
    await createCourse(row);  // Same service function
  }
}

// Use from scheduled job
async function dailyCourseSync() {
  const externalCourses = await fetchFromExternal();
  for (const course of externalCourses) {
    await createCourse(course);  // Same service function
  }
}
```

### 3. Testability

```typescript
// Test service directly (no HTTP needed)
describe('Course Service', () => {
  it('creates course with valid data', async () => {
    const courseData = {
      title: 'Test Course',
      price: 2999,
      instructorId: 'user-123',
      // ...
    };
    
    const course = await createCourse(courseData);
    
    expect(course.title).toBe('Test Course');
    expect(course.price).toBe(2999);
  });

  it('throws ValidationError with invalid data', async () => {
    const courseData = {
      title: '',  // Empty title
      price: -100, // Negative price
    };
    
    await expect(createCourse(courseData)).rejects.toThrow(ValidationError);
  });
});
```

### 4. Transaction Management

```typescript
// Service handles complex multi-step operations atomically
async function createOrderAndEnroll(userId: string, cartItems: CartItem[]) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Create order
    const order = await createOrder(userId, cartItems);
    
    // Step 2: Charge payment
    const payment = await chargeStripe(order.total);
    
    // Step 3: Enroll in courses
    for (const item of cartItems) {
      await enrollInCourse(userId, item.courseId);
    }
    
    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## Complete Purchase Flow

```
1. User adds Course A ($29.99) to cart
   → addToCart('user-123', 'course', 'course-a', 1)
   → Redis: cart:user-123 = { items: [...], subtotal: 2999, tax: 240, total: 3239 }

2. User adds Event B ($49.99) to cart
   → addToCart('user-123', 'event', 'event-b', 1)
   → Redis: cart:user-123 = { items: [...], subtotal: 7998, tax: 640, total: 8638 }

3. User clicks "Checkout"
   → validateCart('user-123')
   → createOrder('user-123', cartItems, 'user@example.com')
   → PostgreSQL: INSERT INTO orders (...) RETURNING id
   → PostgreSQL: INSERT INTO order_items (...)

4. Create Stripe session
   → createCheckoutSession(orderId, orderData, '/success', '/cancel')
   → Stripe API: Create checkout session
   → Return session.url

5. Redirect user to Stripe
   → window.location.href = session.url

6. User completes payment on Stripe
   → Stripe processes card
   → Stripe sends webhook: checkout.session.completed

7. Webhook handler
   → validateWebhook(payload, signature)
   → processWebhookEvent(event)
   → updateOrderStatus(orderId, 'paid')
   → fulfillOrder(orderId)
   → PostgreSQL: INSERT INTO course_progress (user_id, course_id, status)
   → PostgreSQL: INSERT INTO bookings (user_id, event_id, status)
   → PostgreSQL: UPDATE orders SET status = 'completed'

8. User redirected to success page
   → clearCart('user-123')
   → Redis: DEL cart:user-123

9. User can now access purchased courses/events
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Cart Service', () => {
  it('calculates tax correctly', () => {
    const items = [
      { price: 2999, quantity: 1 },
      { price: 4999, quantity: 1 },
    ];
    const totals = calculateTotals(items);
    expect(totals.subtotal).toBe(7998);
    expect(totals.tax).toBe(640); // 8% of 7998
    expect(totals.total).toBe(8638);
  });

  it('merges guest cart quantities', async () => {
    await addToCart('guest-123', 'course', 'course-a', 2);
    await addToCart('user-456', 'course', 'course-a', 1);
    
    const merged = await mergeGuestCart('guest-123', 'user-456');
    
    const courseItem = merged.items.find(i => i.itemId === 'course-a');
    expect(courseItem.quantity).toBe(3); // 2 + 1
  });
});
```

### Integration Tests

```typescript
describe('Order Service', () => {
  it('creates order and fulfills access', async () => {
    const cartItems = [{ itemType: 'course', itemId: 'course-a', ... }];
    
    // Create order
    const order = await createOrder('user-123', cartItems, 'user@example.com');
    expect(order.status).toBe('pending');
    
    // Mark as paid
    await updateOrderStatus(order.id, 'paid');
    
    // Fulfill
    await fulfillOrder(order.id);
    
    // Verify access granted
    const progress = await pool.query(
      'SELECT * FROM course_progress WHERE user_id = $1 AND course_id = $2',
      ['user-123', 'course-a']
    );
    expect(progress.rows.length).toBe(1);
    expect(progress.rows[0].status).toBe('enrolled');
  });
});
```

---

## Key Takeaways

1. **Service Layer** - Encapsulates business logic, separate from HTTP layer
2. **Redis Carts** - Fast, auto-expiring session storage with TTL
3. **PostgreSQL Transactions** - Atomic multi-step operations (orders + items)
4. **Stripe Integration** - Secure payment processing with webhook validation
5. **Order Lifecycle** - State machine with validated transitions
6. **Fulfillment** - Automated access granting for purchased items

---

**Related Files:**
- [src/services/course.service.ts](/home/dan/web/src/services/course.service.ts)
- [src/services/cart.service.ts](/home/dan/web/src/services/cart.service.ts)
- [src/services/order.service.ts](/home/dan/web/src/services/order.service.ts)
- [src/lib/stripe.ts](/home/dan/web/src/lib/stripe.ts)

**Previous Guide:** [Test-Driven Development (T029-T031)](./phase3-tdd.md)
**Next Guide:** [Course Pages & Components (T036-T039)](./phase3-course-pages.md)
