# T074: Webhook Notifications - Learning Guide

## Introduction

This guide teaches you how to integrate notification systems into Stripe webhook handlers for e-commerce applications. You'll learn about webhook architecture, event-driven notifications, idempotency, error handling strategies, and how to orchestrate multiple notification channels (email + WhatsApp) reliably.

---

## Table of Contents

1. [What are Webhooks?](#what-are-webhooks)
2. [Stripe Webhooks Explained](#stripe-webhooks-explained)
3. [Notification Orchestration](#notification-orchestration)
4. [Implementation Architecture](#implementation-architecture)
5. [Code Walkthrough](#code-walkthrough)
6. [Idempotency Patterns](#idempotency-patterns)
7. [Error Handling Strategies](#error-handling-strategies)
8. [Testing Webhooks](#testing-webhooks)
9. [Security Best Practices](#security-best-practices)
10. [Common Pitfalls](#common-pitfalls)
11. [Advanced Topics](#advanced-topics)
12. [Exercises](#exercises)

---

## What are Webhooks?

**Webhooks** are HTTP callbacks that allow services to send real-time notifications to your application when specific events occur.

### How Webhooks Work

```
┌──────────────┐                    ┌──────────────┐
│   External   │                    │     Your     │
│   Service    │                    │  Application │
│  (Stripe)    │                    │   (Server)   │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │ 1. Event occurs                   │
       │    (payment succeeds)             │
       │                                   │
       │ 2. HTTP POST request              │
       │    (webhook payload)              │
       ├──────────────────────────────────>│
       │                                   │
       │                            3. Process event
       │                               (update DB,
       │                                send emails)
       │                                   │
       │ 4. HTTP 200 response              │
       │<──────────────────────────────────┤
       │                                   │
```

### Key Characteristics

1. **Server-to-Server**: External service calls your server directly
2. **Push Model**: You receive data when events happen (vs. polling)
3. **Asynchronous**: Events happen independently of user actions
4. **Reliable**: Services retry failed webhooks automatically

### Real-World Analogy

Think of webhooks like **doorbell notifications**:
- You don't check your door every minute (polling)
- The doorbell rings when someone arrives (webhook)
- You respond to the notification (process event)
- If you don't answer, they ring again (retry)

---

## Stripe Webhooks Explained

### Why Stripe Uses Webhooks

When customers make payments:
1. User clicks "Pay" on your frontend
2. Browser redirects to Stripe Checkout
3. User completes payment
4. **Browser redirects back to your site**

**Problem**: What if user closes browser before redirect?

**Solution**: Stripe sends webhook **regardless** of user actions. Your server receives payment confirmation even if user never returns.

### Common Stripe Events

| Event Type | When It Fires | Your Action |
|------------|---------------|-------------|
| `checkout.session.completed` | User completes checkout | Create order, grant access |
| `payment_intent.succeeded` | Payment successfully charged | Confirm payment received |
| `payment_intent.payment_failed` | Payment declined | Mark order as failed |
| `charge.refunded` | Money refunded | Revoke access, update order |
| `customer.subscription.created` | Subscription started | Grant recurring access |
| `customer.subscription.deleted` | Subscription cancelled | Revoke access |

### Webhook Payload Structure

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_abc123",
      "payment_intent": "pi_abc123",
      "payment_status": "paid",
      "customer_email": "customer@example.com",
      "metadata": {
        "orderId": "ORD-123"
      }
    }
  },
  "created": 1234567890
}
```

**Key Fields**:
- `type`: Event name (what happened)
- `data.object`: Event-specific data
- `metadata`: Custom data you attached during checkout

---

## Notification Orchestration

### Multi-Channel Notification Pattern

Modern applications send notifications through multiple channels:

```
┌─────────────────┐
│  Webhook Event  │
│  (Order Created)│
└────────┬────────┘
         │
         ▼
┌────────────────────┐
│  Orchestrator      │
│  (webhook handler) │
└────────┬───────────┘
         │
         ├─────────────────┬──────────────────┬───────────────┐
         │                 │                  │               │
         ▼                 ▼                  ▼               ▼
┌────────────┐  ┌───────────────┐  ┌──────────────┐  ┌─────────────┐
│ Customer   │  │ Customer      │  │ Admin        │  │ Admin       │
│ Email      │  │ WhatsApp      │  │ Email        │  │ WhatsApp    │
│            │  │               │  │              │  │             │
│ Order      │  │ Quick         │  │ New order    │  │ Real-time   │
│ details    │  │ confirmation  │  │ summary      │  │ alert       │
└────────────┘  └───────────────┘  └──────────────┘  └─────────────┘
```

### Why Multiple Channels?

**Customer Notifications**:
- **Email**: Detailed receipt, access links, legal record
- **WhatsApp**: Quick confirmation, immediate visibility

**Admin Notifications**:
- **Email**: Full details, can be filed/searched
- **WhatsApp**: Instant alert for time-sensitive actions

### Notification Priority Levels

```typescript
// Priority 1: MUST succeed (blocking)
await updateOrderStatus();      // Order completion
await grantCourseAccess();      // Customer gets what they paid for
await clearCart();              // Clean up

// Priority 2: SHOULD succeed (best effort)
try {
  await sendCustomerEmail();    // Customer wants this
  await sendCustomerWhatsApp(); // Nice to have
} catch (e) {
  console.error('Customer notification failed', e);
}

// Priority 3: MAY succeed (optional)
try {
  await sendAdminNotifications(); // Internal alert
} catch (e) {
  console.error('Admin notification failed', e);
}

// ALWAYS return success to Stripe if Priority 1 succeeded
return new Response('OK', { status: 200 });
```

---

## Implementation Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Stripe Payment Flow                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ checkout.session.completed
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Webhook Endpoint                           │
│                   POST /api/checkout/webhook                 │
│                                                              │
│  1. ✅ Verify Stripe signature (security)                   │
│  2. ✅ Parse event type                                      │
│  3. ✅ Extract order ID from metadata                        │
│  4. ✅ Check idempotency (already processed?)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Order Completion (MUST succeed)                 │
│                                                              │
│  5. ✅ UPDATE orders SET status = 'completed'                │
│  6. ✅ INSERT INTO course_enrollments (grant access)         │
│  7. ✅ UPDATE bookings SET status = 'confirmed'              │
│  8. ✅ DELETE FROM cart_items (clear cart)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          Notification Layer (SHOULD succeed)                 │
│                                                              │
│  9. 🔔 Email customer (order confirmation)                   │
│  10. 🔔 WhatsApp customer (if phone provided)                │
│  11. 🔔 WhatsApp admins (T073 with retry)                    │
│                                                              │
│  ⚠️  Errors logged but don't fail webhook                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Response to Stripe                              │
│                                                              │
│  12. ✅ HTTP 200 OK (success)                                │
│      OR                                                      │
│  12. ❌ HTTP 500 Error (Stripe will retry)                   │
└─────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

**webhook.ts** (Orchestrator):
- Receive and verify Stripe events
- Coordinate order completion
- Orchestrate all notifications
- Handle errors and retries

**email.ts** (Email Service):
- Send customer order confirmations
- Format email templates
- Handle email service errors

**whatsapp.ts** (Customer WhatsApp):
- Send customer WhatsApp messages
- Format customer-friendly messages

**twilio.ts** (Admin WhatsApp - T073):
- Send admin WhatsApp notifications
- Support multiple admin numbers
- Retry with exponential backoff
- Bulk message sending

---

## Code Walkthrough

### 1. Webhook Signature Verification

```typescript
export const POST: APIRoute = async ({ request }) => {
  // Get raw body (needed for signature)
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  // Verify signature
  try {
    const event = validateWebhook(body, signature);
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }
  
  // Continue processing...
};
```

**Key Concepts**:

1. **Raw Body Required**: Signature is computed from raw request body
2. **Signature in Header**: `stripe-signature` header contains HMAC signature
3. **Reject Invalid**: Return 400 to tell Stripe event is invalid (don't retry)
4. **Security Critical**: Prevents attackers from sending fake webhooks

**How Stripe Signatures Work**:

```
Stripe's Secret:           "whsec_abc123..."
Webhook Payload:           '{"id":"evt_123",...}'
Timestamp from Header:     "1234567890"

Computed Signature = HMAC-SHA256(
  secret = whsec_abc123,
  message = timestamp + "." + payload
)

If computed == signature from header: ✅ Valid
If computed != signature from header: ❌ Reject
```

### 2. Event Type Handling

```typescript
const processedEvent = await processWebhookEvent(event);

if (processedEvent.type === 'checkout.completed') {
  // Handle successful checkout
  const { orderId } = processedEvent;
  await completeOrder(orderId);
}

if (processedEvent.type === 'payment.failed') {
  // Handle failed payment
  await markOrderFailed(orderId);
}

if (processedEvent.type === 'charge.refunded') {
  // Handle refund
  await revokeAccess(orderId);
}
```

**Pattern**: Use specific handlers for each event type. Don't try to handle all events in one function.

### 3. Idempotency Check

```typescript
// Get order from database
const order = await pool.query(
  'SELECT id, status FROM orders WHERE id = $1',
  [orderId]
);

// Check if already processed
if (order.status === 'completed') {
  console.log('Order already processed, skipping');
  return new Response('Already processed', { status: 200 });
}

// Continue with processing...
```

**Why Idempotency Matters**:

Stripe may send the same event multiple times:
- Network issues cause retries
- Your server responds slowly (timeout)
- Stripe's internal retry logic

**Without idempotency check**:
- Customer charged once, receives 3 order confirmations
- Course access granted 3 times (database errors)
- Admins receive duplicate alerts

**With idempotency check**:
- First webhook: Process order, send notifications
- Second webhook: "Already processed", return immediately
- Third webhook: "Already processed", return immediately

### 4. Order Completion (Critical Path)

```typescript
try {
  // Update order status
  await pool.query(
    `UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [orderId]
  );

  // Grant course access
  await pool.query(
    `INSERT INTO course_enrollments (user_id, course_id, enrolled_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, course_id) DO NOTHING`,
    [userId, courseId]
  );

  // Clear cart
  await clearCart(sessionId);
  
} catch (error) {
  // Critical error - return 500 so Stripe retries
  return new Response('Order completion failed', { status: 500 });
}
```

**Critical Path**: These operations **MUST** succeed. If they fail, return 500 so Stripe retries.

### 5. Notification Orchestration (Best Effort)

```typescript
// Notifications happen AFTER critical operations
try {
  // Customer email
  if (customerEmail) {
    const emailResult = await sendOrderConfirmationEmail(emailData);
    console.log('Email sent:', emailResult.success);
  }

  // Customer WhatsApp (if phone provided)
  if (customerPhone) {
    const whatsappResult = await sendOrderWhatsApp({
      orderId,
      customerName,
      customerPhone,
      items,
      total,
    });
    console.log('Customer WhatsApp sent:', whatsappResult.success);
  }

  // Admin WhatsApp (T073 enhanced with retry)
  const adminResults = await notifyAdminsNewOrder({
    orderId,
    customerName,
    customerEmail,
    totalAmount,
    items,
  });
  console.log('Admin notifications:', {
    successCount: adminResults.filter(r => r !== null).length,
    totalAdmins: adminResults.length,
  });

} catch (notificationError) {
  // Log error but DON'T fail webhook
  console.error('Notification error:', notificationError);
  // ⚠️ Do NOT rethrow or return error
}

// Always return success if order completed
return new Response('OK', { status: 200 });
```

**Key Principles**:

1. **Separate try-catch**: Notifications have own error handling
2. **Log failures**: Record what went wrong for debugging
3. **Don't throw**: Never let notifications break order completion
4. **Return 200**: Tell Stripe webhook succeeded (even if notifications failed)

### 6. T073 Enhanced Admin Notifications

```typescript
// Old implementation (single admin, no retry)
await sendAdminOrderNotification({
  orderId,
  customerName,
  total,
});

// T073 enhanced (multiple admins, retry logic)
const results = await notifyAdminsNewOrder({
  orderId,
  customerName,
  customerEmail,
  totalAmount,
  items: [
    { title: 'Course', quantity: 1, price: 99.99 },
  ],
});

// results = [
//   'SM123abc...', // Admin 1: success
//   null,          // Admin 2: failed after 3 retries
//   'SM456def...', // Admin 3: success
// ]
```

**T073 Improvements**:

1. **Multiple Admins**: Send to comma-separated list
2. **Parallel Sending**: Use `Promise.all()` for speed
3. **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s)
4. **Detailed Results**: Know which admins received notifications
5. **Better Formatting**: Emojis, item list, customer details

---

## Idempotency Patterns

### What is Idempotency?

**Idempotent Operation**: Performing it multiple times has the same result as performing it once.

**Examples**:

```typescript
// ✅ Idempotent
x = 5;        // Setting value
x = 5;        // Same result
x = 5;        // Same result

// ❌ NOT Idempotent
x = x + 1;    // x = 1
x = x + 1;    // x = 2
x = x + 1;    // x = 3 (different each time!)
```

### Why Webhooks Need Idempotency

```
Scenario: Network hiccup

Attempt 1:
Stripe → Webhook  ✅ Process order
Webhook → Stripe  ❌ Response lost (network)

Stripe thinks: "No response received, must retry"

Attempt 2:
Stripe → Webhook  ⚠️  Process order AGAIN?
Webhook → Stripe  ✅ Response received

Result: Order processed twice!
```

### Idempotency Strategies

#### Strategy 1: Status Check (Our Implementation)

```typescript
const order = await getOrder(orderId);

if (order.status === 'completed') {
  return 'Already processed';
}

await processOrder(orderId);
```

**Pros**: Simple, works for state transitions  
**Cons**: Requires database query

#### Strategy 2: Idempotency Key

```typescript
const key = event.id; // Use Stripe event ID

if (await redis.exists(key)) {
  return 'Already processed';
}

await processOrder(orderId);
await redis.set(key, 'processed', 'EX', 86400); // 24 hour TTL
```

**Pros**: Fast (Redis), works for any operation  
**Cons**: Requires Redis, keys expire

#### Strategy 3: Database Tracking

```typescript
await pool.query(
  `INSERT INTO webhook_events (event_id, processed_at)
   VALUES ($1, NOW())
   ON CONFLICT (event_id) DO NOTHING
   RETURNING id`,
  [event.id]
);

if (result.rowCount === 0) {
  return 'Already processed';
}

await processOrder(orderId);
```

**Pros**: Permanent record, audit trail  
**Cons**: Extra database table

### Choosing a Strategy

| Strategy | Speed | Complexity | Audit Trail |
|----------|-------|------------|-------------|
| Status Check | Medium | Low | Implicit |
| Redis Key | Fast | Medium | No |
| Database | Slow | High | Yes |

**Recommendation**: Status Check for simple webhooks, Database for compliance-critical systems.

---

## Error Handling Strategies

### Error Classification

```typescript
// 1. CRITICAL: Must succeed or retry
try {
  await updateOrderStatus();
  await grantAccess();
} catch (error) {
  return new Response('Failed', { status: 500 }); // Stripe will retry
}

// 2. IMPORTANT: Should succeed, log if fails
try {
  await sendCustomerEmail();
} catch (error) {
  console.error('Email failed:', error);
  // Continue - don't fail webhook
}

// 3. OPTIONAL: Nice to have
try {
  await sendAdminNotification();
} catch (error) {
  console.warn('Admin notification failed:', error);
  // Continue - don't fail webhook
}

// Always return success if critical operations succeeded
return new Response('OK', { status: 200 });
```

### Nested Try-Catch Pattern

```typescript
export const POST = async ({ request }) => {
  try {
    // Outer try-catch: Critical operations
    const event = await validateWebhook(body, signature);
    await updateOrder(orderId);
    await grantAccess(userId, courseId);
    
    try {
      // Inner try-catch: Non-critical operations
      await sendNotifications(orderData);
    } catch (notificationError) {
      console.error('Notifications failed:', notificationError);
      // Don't rethrow - continue to success response
    }
    
    return new Response('OK', { status: 200 });
    
  } catch (criticalError) {
    // Critical operation failed
    console.error('Webhook failed:', criticalError);
    return new Response('Error', { status: 500 });
  }
};
```

**Pattern**:
- **Outer catch**: Returns 500, Stripe retries
- **Inner catch**: Logs error, returns 200

### Retry Decision Tree

```
Error occurs
    │
    ▼
Is operation critical? ──Yes──> Return 500 (Stripe retries)
    │
    No
    │
    ▼
Log error
    │
    ▼
Continue processing
    │
    ▼
Return 200 (success)
```

---

## Testing Webhooks

### Testing Strategies

#### 1. Unit Tests (Mock Stripe)

```typescript
test('should process order on checkout.completed', async () => {
  const mockEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        metadata: { orderId: '123' }
      }
    }
  };
  
  // Mock Stripe validation
  jest.spyOn(stripe, 'validateWebhook').mockReturnValue(mockEvent);
  
  const response = await POST({ request: mockRequest });
  
  expect(response.status).toBe(200);
});
```

#### 2. Integration Tests (Test Mode)

```typescript
test('should send notifications after order completion', async () => {
  // Use Stripe test mode
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: 'http://localhost/success',
    line_items: [{ price: 'price_test', quantity: 1 }],
  });
  
  // Simulate webhook
  await triggerWebhook('checkout.session.completed', session);
  
  // Verify notifications sent
  expect(emailSpy).toHaveBeenCalled();
  expect(whatsappSpy).toHaveBeenCalled();
});
```

#### 3. Manual Testing (Stripe CLI)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:4321/api/checkout/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

### Test Checklist

- [ ] Valid webhook signature accepted
- [ ] Invalid webhook signature rejected
- [ ] Order status updated to 'completed'
- [ ] Course access granted
- [ ] Cart cleared
- [ ] Customer email sent
- [ ] Customer WhatsApp sent (if phone provided)
- [ ] Admin WhatsApp sent to all admins
- [ ] Idempotency: duplicate events handled
- [ ] Payment failure handled
- [ ] Refund revokes access
- [ ] Notification failures don't break webhook
- [ ] Returns 200 on success
- [ ] Returns 500 on critical failure

---

## Security Best Practices

### 1. Always Verify Signatures

```typescript
// ❌ DANGER: Trust all webhooks
const event = JSON.parse(request.body);
await processOrder(event.data.orderId);

// ✅ SECURE: Verify signature first
const signature = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);
```

**Attack Without Verification**:
Attacker sends: `{"type":"checkout.completed","orderId":"attacker_order"}`
Your server: Processes fake order, grants free access

### 2. Use Environment-Specific Secrets

```bash
# Development
STRIPE_WEBHOOK_SECRET=whsec_dev_abc123

# Production
STRIPE_WEBHOOK_SECRET=whsec_live_xyz789
```

**Why**: Test webhooks should never trigger production actions.

### 3. Rate Limiting

```typescript
// Prevent webhook flooding attacks
const rateLimiter = new RateLimiter({
  windowMs: 60000,  // 1 minute
  max: 100          // Max 100 webhooks per minute
});

export const POST = async ({ request }) => {
  if (!(await rateLimiter.check(request.ip))) {
    return new Response('Too many requests', { status: 429 });
  }
  
  // Process webhook...
};
```

### 4. Credential Protection

```typescript
// ❌ BAD: Credentials in code
const twilioClient = twilio('AC123', 'secret_token');

// ✅ GOOD: Credentials from environment
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
```

### 5. Input Validation

```typescript
// Validate order ID format
if (!/^ORD-\d{6}$/.test(orderId)) {
  return new Response('Invalid order ID', { status: 400 });
}

// Validate email format
if (!isValidEmail(customerEmail)) {
  console.error('Invalid email:', customerEmail);
  // Don't send email, but don't fail webhook
}
```

---

## Common Pitfalls

### 1. Blocking on Notifications

```typescript
// ❌ BAD: Webhook times out
await sendCustomerEmail();      // 3 seconds
await sendCustomerWhatsApp();   // 2 seconds
await notifyAdminsNewOrder();   // 5 seconds
return new Response('OK');      // After 10 seconds!

// ✅ GOOD: Return quickly
await updateOrder();
// Fire notifications asynchronously
Promise.all([
  sendCustomerEmail(),
  sendCustomerWhatsApp(),
  notifyAdminsNewOrder()
]).catch(console.error);
return new Response('OK');      // Immediately!
```

**Why**: Stripe expects responses within 5 seconds. Slow responses cause retries.

### 2. Throwing on Notification Failures

```typescript
// ❌ BAD: Notification failure breaks webhook
await updateOrder();
await sendNotifications();  // Throws error
// Never reaches return statement!

// ✅ GOOD: Catch notification errors
await updateOrder();
try {
  await sendNotifications();
} catch (e) {
  console.error(e);
}
return new Response('OK');
```

### 3. Not Handling Duplicates

```typescript
// ❌ BAD: Process every event
await createOrder(orderId);

// Duplicate webhook arrives...
await createOrder(orderId);  // ERROR: Order already exists!

// ✅ GOOD: Check first
const existing = await getOrder(orderId);
if (existing) return 'Already processed';
await createOrder(orderId);
```

### 4. Logging Sensitive Data

```typescript
// ❌ BAD: Logs contain PII
console.log('Processing order:', {
  customerEmail: 'user@example.com',
  customerPhone: '+1234567890',
  creditCard: '4242 4242 4242 4242'
});

// ✅ GOOD: Redact sensitive data
console.log('Processing order:', {
  orderId: 'ORD-123',
  customerEmail: 'u***@e***.com',
  amount: 99.99
});
```

### 5. Wrong HTTP Status Codes

```typescript
// ❌ BAD: Returns 200 even when failed
try {
  await updateOrder();
} catch (e) {
  console.error(e);
  return new Response('Error', { status: 200 }); // Wrong!
}

// ✅ GOOD: Return 500 for failures
try {
  await updateOrder();
  return new Response('OK', { status: 200 });
} catch (e) {
  console.error(e);
  return new Response('Error', { status: 500 }); // Stripe retries
}
```

---

## Advanced Topics

### 1. Webhook Event Sequencing

Events may arrive out of order:

```
Time 0: payment_intent.created      (arrives at 0:00)
Time 1: payment_intent.succeeded    (arrives at 0:05) ⚠️  Out of order!
Time 2: checkout.session.completed  (arrives at 0:03)
```

**Solution**: Use event timestamps, not arrival time.

```typescript
const eventTimestamp = event.created;
const order = await getOrder(orderId);

if (order.lastProcessedEventTime > eventTimestamp) {
  console.log('Skipping old event');
  return 'OK';
}

await processEvent(event);
await updateOrder({ lastProcessedEventTime: eventTimestamp });
```

### 2. Webhook Forwarding

Forward webhooks to other services:

```typescript
await Promise.all([
  processOrderLocally(event),
  forwardToAnalytics(event),
  forwardToInventoryService(event)
]);
```

### 3. Batch Notifications

Instead of one notification per order:

```typescript
// Collect orders for 5 minutes
const orders = await redis.lpush('pending_orders', orderId);

// Every 5 minutes, send digest
setInterval(async () => {
  const orders = await redis.lrange('pending_orders', 0, -1);
  if (orders.length === 0) return;
  
  await sendAdminDigest({
    count: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
    orders: orders.slice(0, 10) // Top 10
  });
  
  await redis.del('pending_orders');
}, 5 * 60 * 1000);
```

### 4. Dead Letter Queue

For events that fail repeatedly:

```typescript
const MAX_RETRIES = 3;

try {
  await processWebhook(event);
} catch (error) {
  const retryCount = await redis.incr(`webhook:${event.id}:retries`);
  
  if (retryCount >= MAX_RETRIES) {
    // Move to dead letter queue for manual investigation
    await redis.lpush('webhook_failures', JSON.stringify({
      event,
      error: error.message,
      timestamp: Date.now()
    }));
    
    // Alert team
    await sendAdminAlert(`Webhook failed after ${MAX_RETRIES} retries`);
  }
  
  throw error; // Let Stripe retry
}
```

---

## Exercises

### Exercise 1: Basic Webhook Handler
Create a webhook endpoint that logs events:

```typescript
export const POST: APIRoute = async ({ request }) => {
  // TODO: Get body and signature
  // TODO: Verify signature
  // TODO: Log event type
  // TODO: Return 200
};
```

<details>
<summary>Solution</summary>

```typescript
export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing signature', { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    console.log(`Received event: ${event.type}`);
    
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }
};
```
</details>

### Exercise 2: Idempotency Check
Add idempotency to prevent duplicate processing:

```typescript
async function processOrder(orderId: string) {
  // TODO: Check if order already completed
  // TODO: If yes, return early
  // TODO: If no, process order
}
```

<details>
<summary>Solution</summary>

```typescript
async function processOrder(orderId: string) {
  const order = await pool.query(
    'SELECT status FROM orders WHERE id = $1',
    [orderId]
  );
  
  if (order.rows[0]?.status === 'completed') {
    console.log(`Order ${orderId} already processed`);
    return 'already_processed';
  }
  
  await pool.query(
    `UPDATE orders SET status = 'completed' WHERE id = $1`,
    [orderId]
  );
  
  console.log(`Order ${orderId} processed successfully`);
  return 'processed';
}
```
</details>

### Exercise 3: Notification Orchestration
Send notifications without breaking webhook:

```typescript
async function handleOrderComplete(orderData) {
  // TODO: Update order (must succeed)
  // TODO: Send email (best effort)
  // TODO: Send WhatsApp (best effort)
  // TODO: Always return success if order updated
}
```

<details>
<summary>Solution</summary>

```typescript
async function handleOrderComplete(orderData) {
  try {
    // Critical: Update order
    await pool.query(
      `UPDATE orders SET status = 'completed' WHERE id = $1`,
      [orderData.orderId]
    );
  } catch (error) {
    console.error('Order update failed:', error);
    throw error; // Fail webhook so Stripe retries
  }
  
  // Non-critical: Notifications
  try {
    await sendOrderConfirmationEmail(orderData);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Email failed:', error);
    // Don't throw - continue
  }
  
  try {
    if (orderData.customerPhone) {
      await sendOrderWhatsApp(orderData);
      console.log('WhatsApp sent successfully');
    }
  } catch (error) {
    console.error('WhatsApp failed:', error);
    // Don't throw - continue
  }
  
  return { success: true };
}
```
</details>

---

## Summary

You've learned:

1. **What webhooks are** and how they enable real-time event handling
2. **Stripe webhook architecture** and common event types
3. **Notification orchestration** across multiple channels (email + WhatsApp)
4. **Implementation patterns** for reliable webhook processing
5. **Idempotency strategies** to prevent duplicate processing
6. **Error handling** with priority-based approach
7. **Testing approaches** for webhooks (unit, integration, manual)
8. **Security best practices** including signature verification
9. **Common pitfalls** and how to avoid them
10. **Advanced topics** like event sequencing and dead letter queues

### Key Takeaways

1. **Always verify signatures** - Never trust webhook data without verification
2. **Idempotency is critical** - Stripe sends duplicate events
3. **Prioritize operations** - Critical operations must succeed, notifications are best effort
4. **Return 200 liberally** - Only return 500 if critical operations fail
5. **Nested error handling** - Separate critical and non-critical errors
6. **Log everything** - Debugging production webhooks is hard
7. **Test thoroughly** - Use Stripe CLI for realistic testing
8. **Keep webhooks fast** - Respond within 5 seconds
9. **Use retry logic** - T073's exponential backoff improves reliability
10. **Monitor in production** - Track success rates and failures

### Next Steps

1. Implement signature verification in your webhook
2. Add idempotency checks using status or Redis
3. Separate critical and non-critical operations
4. Test with Stripe CLI
5. Add comprehensive logging
6. Set up monitoring and alerts
7. Review error rates in production
8. Optimize notification delivery

---

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Idempotency Guide](https://stripe.com/docs/api/idempotent_requests)
- [Webhook Signature Verification](https://stripe.com/docs/webhooks/signatures)
- [T073 Twilio Integration](learn/T073_Twilio_WhatsApp_Guide.md)

---

**Happy Coding! 🚀**
