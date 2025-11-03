# Phase 3: Shopping Cart & Checkout (T040-T045)

## Overview

This phase implements the complete e-commerce checkout flow: cart management, cart API endpoints, and Stripe integration.

---

## T040: Shopping Cart Page

### File: `src/pages/cart.astro`

### What It Does

Displays user's shopping cart with:
- List of courses in cart
- Quantity controls
- Remove button for each item
- Subtotal, tax, and total
- Checkout button

### Key Concepts

#### 1. Server-Side Rendering (SSR)

```astro
---
// This code runs on the SERVER (before HTML is sent to browser)
import { getCartItems } from '@lib/cart';

const sessionId = Astro.cookies.get('cart_session')?.value;
const cartItems = sessionId ? await getCartItems(sessionId) : [];
const total = calculateTotal(cartItems);
---

<!-- This HTML is sent to the browser -->
<html>
  <body>
    <h1>Your Cart</h1>
    {cartItems.map(item => (
      <div>{item.title} - ${item.price}</div>
    ))}
  </body>
</html>
```

**Why SSR?**
- SEO: Search engines see full content
- Performance: HTML arrives ready to display
- Security: Database credentials never sent to browser

**Flow:**
```
User requests /cart
  ↓
Server runs Astro frontmatter (---)
  ↓
Fetches cart from database
  ↓
Renders HTML with cart data
  ↓
Sends complete HTML to browser
  ↓
User sees cart immediately
```

#### 2. Session-Based Cart (Anonymous Users)

```typescript
// Server generates session ID on first visit
const sessionId = crypto.randomUUID();  // "a3bb189e-8bf9-3888-9912-ace4e6543002"

// Store in cookie
Astro.cookies.set('cart_session', sessionId, {
  httpOnly: true,   // JavaScript can't access (security)
  secure: true,     // Only sent over HTTPS
  sameSite: 'lax',  // CSRF protection
  maxAge: 60 * 60 * 24 * 7  // 7 days
});

// All cart operations use this session ID
await addToCart(sessionId, courseId, quantity);
```

**Why session-based?**
- Works for logged-out users
- No account required to browse
- Can merge with user cart after login

#### 3. Progressive Enhancement

```astro
<!-- Works without JavaScript -->
<form method="POST" action="/api/cart/remove">
  <input type="hidden" name="courseId" value={item.id} />
  <button type="submit">Remove</button>
</form>

<!-- Enhanced with JavaScript -->
<script>
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();  // Prevent full page reload
      
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        // Update UI without page reload
        form.closest('.cart-item').remove();
        updateTotal();
      }
    });
  });
</script>
```

**Benefits:**
- Works with JavaScript disabled (accessibility)
- Enhanced experience with JavaScript enabled
- Resilient to JavaScript errors

---

## T041: Cart Item Component

### File: `src/components/CartItem.astro`

### Component Design

```astro
---
interface Props {
  item: {
    id: string;
    title: string;
    price: number;
    image_url: string;
    quantity: number;
  };
}

const { item } = Astro.props;
const itemTotal = (item.price * item.quantity).toFixed(2);
---

<div class="cart-item flex gap-4 p-4 border rounded">
  <img src={item.image_url} alt={item.title} class="w-24 h-24 object-cover" />
  
  <div class="flex-1">
    <h3 class="text-lg font-semibold">{item.title}</h3>
    <p class="text-gray-600">${item.price.toFixed(2)}</p>
  </div>
  
  <div class="flex items-center gap-2">
    <button onclick="updateQuantity('{item.id}', -1)">-</button>
    <span>{item.quantity}</span>
    <button onclick="updateQuantity('{item.id}', 1)">+</button>
  </div>
  
  <div class="text-right">
    <p class="font-semibold">${itemTotal}</p>
    <button onclick="removeItem('{item.id}')">Remove</button>
  </div>
</div>
```

### Component Principles

#### 1. Props Interface (Type Safety)

```typescript
interface Props {
  item: CartItem;  // TypeScript ensures all required fields exist
}

const { item } = Astro.props;
```

**Without types:**
```astro
---
const { item } = Astro.props;  // item could be anything!
---
<h3>{item.titel}</h3>  <!-- Typo! Runtime error -->
```

**With types:**
```astro
---
interface Props {
  item: { title: string };  // 'title' is required
}
const { item } = Astro.props;
---
<h3>{item.titel}</h3>  <!-- TypeScript error: Property 'titel' does not exist -->
```

#### 2. Single Responsibility

Each component does ONE thing:
- `CartItem` = Display one item
- `Cart` = List of items + totals
- `CheckoutButton` = Payment initiation

**Benefits:**
- Easy to test (isolated)
- Reusable (can use CartItem in order history)
- Easy to modify (change without affecting others)

#### 3. Composability

```astro
<!-- Parent component -->
<div class="cart">
  {cartItems.map(item => (
    <CartItem item={item} />  <!-- Reusable component -->
  ))}
</div>
```

---

## T042-T044: Cart API Endpoints

### File Structure

```
src/pages/api/cart/
├── add.ts      # POST /api/cart/add
├── remove.ts   # DELETE /api/cart/remove
└── index.ts    # GET /api/cart
```

### T042: Add to Cart API

```typescript
// src/pages/api/cart/add.ts
export async function POST({ request, cookies }: APIContext) {
  try {
    // 1. Get or create session
    let sessionId = cookies.get('cart_session')?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      cookies.set('cart_session', sessionId, { /* options */ });
    }
    
    // 2. Parse and validate request
    const body = await request.json();
    const { courseId, quantity = 1 } = body;
    
    if (!courseId) {
      return new Response(JSON.stringify({ error: 'Course ID required' }), {
        status: 400
      });
    }
    
    // 3. Validate quantity
    if (quantity < 1 || quantity > 10) {
      return new Response(JSON.stringify({ 
        error: 'Quantity must be between 1 and 10' 
      }), { status: 400 });
    }
    
    // 4. Add to cart
    const cartItem = await addToCart(sessionId, courseId, quantity);
    
    // 5. Return success
    return new Response(JSON.stringify({ 
      success: true, 
      item: cartItem 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Add to cart error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to add to cart' 
    }), { status: 500 });
  }
}
```

### API Design Principles

#### 1. RESTful Conventions

```
POST   /api/cart/add       # Create cart item
GET    /api/cart           # Read cart
DELETE /api/cart/remove    # Delete cart item
PUT    /api/cart/update    # Update quantity (future)
```

#### 2. HTTP Status Codes

```typescript
200  OK                   // Success (GET, PUT)
201  Created              // Resource created (POST)
400  Bad Request          // Invalid input
401  Unauthorized         // Not logged in (when required)
404  Not Found            // Course doesn't exist
500  Internal Server Error // Database error, etc.
```

#### 3. Error Responses

```typescript
// ❌ Bad: Vague error
return new Response('Error', { status: 500 });

// ✅ Good: Descriptive error
return new Response(JSON.stringify({
  error: 'Course not found',
  code: 'COURSE_NOT_FOUND',
  courseId: courseId
}), { status: 404 });
```

**Benefits:**
- Client knows what went wrong
- Can display helpful message to user
- Easier to debug

#### 4. Input Validation

```typescript
// Validate before processing
const AddToCartSchema = z.object({
  courseId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10)
});

try {
  const validated = AddToCartSchema.parse(body);
  // Safe to use validated.courseId and validated.quantity
} catch (error) {
  return new Response(JSON.stringify({
    error: 'Invalid input',
    details: error.errors
  }), { status: 400 });
}
```

**Why validate?**
- Prevent SQL injection
- Prevent invalid data in database
- Provide clear error messages

---

## T045: Checkout Page

### File: `src/pages/checkout.astro`

### Checkout Flow

```
User clicks "Checkout"
  ↓
1. Load cart from session
  ↓
2. Display order summary
  ↓
3. Collect billing info
  ↓
4. Create Stripe checkout session
  ↓
5. Redirect to Stripe payment page
  ↓
6. User enters card details (on Stripe)
  ↓
7. Payment processed by Stripe
  ↓
8. Stripe webhook notifies our server
  ↓
9. Create order in database
  ↓
10. Send confirmation email
  ↓
11. Redirect to success page
```

### Key Features

#### 1. Form Validation

```typescript
// Client-side validation (instant feedback)
function validateForm() {
  const email = document.getElementById('email').value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    showError('email', 'Please enter a valid email');
    return false;
  }
  
  // All fields valid
  return true;
}

// Server-side validation (security)
export async function POST({ request }) {
  const formData = await request.formData();
  const email = formData.get('email');
  
  if (!email || !emailRegex.test(email)) {
    return new Response('Invalid email', { status: 400 });
  }
  
  // Process checkout...
}
```

**Why both?**
- **Client-side**: Fast feedback, better UX
- **Server-side**: Security (never trust client)

#### 2. Cart Total Calculation

```typescript
function calculateTotal(cartItems: CartItem[]) {
  // Subtotal: Sum of all items
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  // Tax: 8% of subtotal
  const taxRate = 0.08;
  const tax = Math.round(subtotal * taxRate * 100) / 100;  // Round to 2 decimals
  
  // Total: Subtotal + tax
  const total = Math.round((subtotal + tax) * 100) / 100;
  
  return { subtotal, tax, total };
}
```

**Rounding for Money:**
```typescript
// ❌ Bad: Floating point errors
const tax = subtotal * 0.08;  // 49.99 * 0.08 = 3.9992000000000003

// ✅ Good: Round to cents
const tax = Math.round(subtotal * 0.08 * 100) / 100;  // 4.00
```

#### 3. Preventing Duplicate Submissions

```typescript
let isSubmitting = false;

async function handleCheckout(e) {
  e.preventDefault();
  
  // Prevent double-click
  if (isSubmitting) return;
  isSubmitting = true;
  
  try {
    // Disable button
    const submitButton = document.getElementById('checkout-btn');
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';
    
    // Process payment
    const response = await fetch('/api/checkout/create-session', {
      method: 'POST',
      body: JSON.stringify({ /* checkout data */ })
    });
    
    if (response.ok) {
      const { sessionUrl } = await response.json();
      window.location.href = sessionUrl;  // Redirect to Stripe
    }
  } catch (error) {
    // Re-enable button on error
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = 'Checkout';
  }
}
```

**Why this matters:**
- User accidentally double-clicks
- Without protection: 2 orders created
- Result: User charged twice, angry customer

#### 4. Security Considerations

```typescript
// ❌ Bad: Calculate total on client
const total = calculateTotal(cartItems);  // User can modify this!
await createStripeSession({ amount: total });

// ✅ Good: Calculate total on server
export async function POST({ cookies }) {
  const sessionId = cookies.get('cart_session').value;
  const cartItems = await getCartItems(sessionId);  // From database
  const total = calculateTotal(cartItems);  // Server-side calculation
  
  // User can't manipulate this
  await createStripeSession({ amount: total });
}
```

**Never trust client-side data for:**
- Prices
- Quantities
- Totals
- User roles/permissions

---

## Stripe Integration

### Why Stripe?

1. **PCI Compliance**
   - We never handle credit card numbers
   - Stripe takes care of security requirements
   - Reduces liability

2. **Global Payment Methods**
   - Credit/debit cards (all major brands)
   - Apple Pay, Google Pay
   - Bank transfers, wallets

3. **Webhook System**
   - Reliable payment confirmation
   - Handles async processing
   - Retry logic built-in

### Checkout Session Flow

```typescript
// 1. Create Stripe session
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: cartItems.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.title,
        images: [item.image_url]
      },
      unit_amount: Math.round(item.price * 100)  // Convert to cents
    },
    quantity: item.quantity
  })),
  success_url: 'https://yoursite.com/checkout/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yoursite.com/cart',
  customer_email: email,
  metadata: {
    cartSessionId: sessionId  // Link back to our cart
  }
});

// 2. Redirect to Stripe
return new Response(JSON.stringify({
  sessionUrl: session.url
}), { status: 200 });
```

### Webhook Handler (T047 - Future)

```typescript
// Stripe calls this when payment succeeds
export async function POST({ request }) {
  const signature = request.headers.get('stripe-signature');
  const body = await request.text();
  
  // 1. Verify webhook is from Stripe
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // 2. Create order in database
    const order = await createOrder({
      userId: session.customer,
      sessionId: session.metadata.cartSessionId,
      stripeSessionId: session.id,
      total: session.amount_total / 100  // Convert from cents
    });
    
    // 3. Send confirmation email
    await sendOrderConfirmation(order);
    
    // 4. Clear cart
    await clearCart(session.metadata.cartSessionId);
  }
  
  return new Response('OK', { status: 200 });
}
```

**Webhook Security:**
- Stripe signs each webhook with secret
- We verify signature to prevent fake webhooks
- Prevents: Attacker sending fake "payment succeeded" events

---

## Key Takeaways

1. **Cart Architecture**
   - Session-based (works for anonymous users)
   - Server-side rendering (performance + SEO)
   - Progressive enhancement (works without JS)

2. **API Design**
   - RESTful conventions
   - Proper status codes
   - Comprehensive error handling
   - Input validation (client + server)

3. **Security**
   - Never trust client calculations
   - Validate all inputs
   - Use HTTPS only
   - httpOnly cookies (prevent XSS)
   - Verify webhook signatures

4. **User Experience**
   - Instant feedback (client validation)
   - Loading states (prevent double-submission)
   - Clear error messages
   - Responsive design

---

**Related Files:**
- [src/pages/cart.astro](/home/dan/web/src/pages/cart.astro)
- [src/components/CartItem.astro](/home/dan/web/src/components/CartItem.astro)
- [src/pages/api/cart/add.ts](/home/dan/web/src/pages/api/cart/add.ts)
- [src/pages/checkout.astro](/home/dan/web/src/pages/checkout.astro)
- [tests/unit/T045-checkout.test.ts](/home/dan/web/tests/unit/T045-checkout.test.ts)

**Next Steps:**
- T046: Implement Stripe checkout session endpoint
- T047: Implement Stripe webhook handler
- T048: Email notifications
- T050-T052: User dashboard
