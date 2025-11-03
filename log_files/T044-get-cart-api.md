# T044: Get Cart API Endpoint

**Status**: ✅ Complete
**Date**: October 31, 2025
**Time**: ~45 minutes

## Overview
Implemented GET endpoint for retrieving the current shopping cart state with support for both guest and authenticated users.

## Implementation

### File Created
- `src/pages/api/cart/index.ts` (88 lines)

### API Specification

**Endpoint**: `GET /api/cart`

**Request**: No body required

**Response** (200 OK):
```typescript
{
  success: true;
  cart: {
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    itemCount: number;
  };
}
```

**Empty Cart Response** (200 OK):
```typescript
{
  success: true;
  cart: {
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    itemCount: 0
  };
}
```

**Error Responses**:
- `500 Internal Server Error`: Redis connection or unexpected errors

### Features Implemented

1. **Guest Cart Support**
   - Returns empty cart if no session exists
   - No authentication required
   - Creates session on first add-to-cart (T042)

2. **Session-Based Retrieval**
   - Reads cart_session cookie
   - Fetches cart from Redis
   - Returns empty cart gracefully if not found

3. **Cart Calculations**
   - Returns all cart items with details
   - Includes subtotal, tax (8%), total
   - Item count for badge display

4. **Graceful Fallbacks**
   - No session → empty cart (not error)
   - Cart not found in Redis → empty cart
   - Errors logged but don't crash

### Technical Implementation

**Session Handling**:
```typescript
const sessionId = cookies.get('cart_session')?.value;
if (!sessionId) {
  // No session = empty cart (not an error)
  return new Response(JSON.stringify({
    success: true,
    cart: {
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      itemCount: 0
    }
  }), { status: 200 });
}
```

**Cart Retrieval**:
```typescript
try {
  const cart = await cartService.getCart(sessionId);
  
  if (!cart || cart.items.length === 0) {
    // Return empty cart structure
    return emptyCartResponse();
  }
  
  return new Response(JSON.stringify({
    success: true,
    cart
  }), { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
} catch (error) {
  console.error('Error fetching cart:', error);
  return new Response(JSON.stringify({
    success: false,
    error: 'Failed to fetch cart'
  }), { status: 500 });
}
```

**Empty Cart Structure**:
```typescript
const emptyCart = {
  items: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  itemCount: 0
};
```

### Design Decisions

**Why Return Empty Cart Instead of 404?**
- Better UX (no error states for new users)
- Simplifies frontend logic
- Matches e-commerce standards
- Reduces error handling code

**Why Not Require Authentication?**
- Supports guest checkout
- Reduces friction for new users
- Session provides sufficient tracking
- Can merge with user cart after login

### Error Handling
- Try-catch around Redis operations
- Logs errors to console
- Returns 500 only for unexpected errors
- Empty cart is success, not failure

## Testing Results
✅ TypeScript: 0 errors
✅ Returns empty cart without session
✅ Fetches cart from Redis correctly
✅ Returns empty cart if not found in Redis
✅ Calculates totals correctly
✅ ItemCount matches items array length
✅ Handles Redis errors gracefully
✅ Manual test: Cart state persists across page loads

## Integration Points
- **Input**: Frontend cart/checkout pages on load
- **Storage**: Redis (via cart.service.ts)
- **Output**: Current cart state
- **Cookie**: Reads cart_session if exists

## Usage Example

**Frontend: Load cart on page**
```typescript
// On page load or component mount
async function loadCart() {
  try {
    const response = await fetch('/api/cart');
    const data = await response.json();
    
    if (data.success) {
      displayCart(data.cart);
      updateCartBadge(data.cart.itemCount);
    }
  } catch (error) {
    console.error('Failed to load cart:', error);
    displayEmptyCart();
  }
}
```

**Update Cart Badge**:
```typescript
// Update header cart icon count
function updateCartBadge(itemCount: number) {
  const badge = document.querySelector('.cart-badge');
  if (badge) {
    badge.textContent = itemCount.toString();
    badge.style.display = itemCount > 0 ? 'block' : 'none';
  }
}
```

**Checkout Page Load**:
```typescript
// Load cart for checkout page
async function initCheckout() {
  const { cart } = await fetch('/api/cart').then(r => r.json());
  
  if (cart.items.length === 0) {
    showEmptyCartMessage();
    disableCheckoutButton();
  } else {
    renderOrderSummary(cart);
    calculateTotals(cart.subtotal, cart.tax, cart.total);
  }
}
```

## Dependencies
- `cart.service.ts`: Redis cart operations (getCart method)
- Astro cookies API
- Redis connection

## Response Examples

**Cart with Items**:
```json
{
  "success": true,
  "cart": {
    "items": [
      {
        "id": "course-123",
        "title": "Advanced TypeScript",
        "price": 99.99,
        "quantity": 2,
        "itemType": "course",
        "image": "/images/typescript.jpg"
      }
    ],
    "subtotal": 199.98,
    "tax": 15.99,
    "total": 215.97,
    "itemCount": 2
  }
}
```

**Empty Cart**:
```json
{
  "success": true,
  "cart": {
    "items": [],
    "subtotal": 0,
    "tax": 0,
    "total": 0,
    "itemCount": 0
  }
}
```

## Next Steps
- Update cart page to fetch from API on load
- Update checkout page to use API
- Add cart badge to header
- Implement cart sync across tabs
- Add loading states while fetching

## Notes
- Completes cart API trilogy (add, remove, get)
- Read-only endpoint (safe for caching)
- No side effects
- Idempotent (same result every call)
- Works seamlessly with T042 and T043
- Ready for frontend integration
