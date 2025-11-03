# T042: Add to Cart API Endpoint

**Status**: ✅ Complete
**Date**: October 31, 2025
**Time**: ~2 hours

## Overview
Implemented POST endpoint for adding items to the shopping cart with session management, validation, and guest cart support.

## Implementation

### File Created
- `src/pages/api/cart/add.ts` (147 lines)

### API Specification

**Endpoint**: `POST /api/cart/add`

**Request Body**:
```typescript
{
  itemId: string;           // Course/event/product ID
  itemType: 'course' | 'event' | 'digital_product';
  quantity?: number;        // Default: 1, Range: 1-10
}
```

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
  message: string;
}
```

**Error Responses**:
- `400 Bad Request`: Invalid itemType, quantity out of range
- `404 Not Found`: Item doesn't exist in database
- `500 Internal Server Error`: Database/Redis errors

### Features Implemented

1. **Session Management**
   - Creates guest session if none exists
   - Sets secure HTTP-only cookie
   - Session ID: `cart_${timestamp}_${random}`
   - Cookie: `cart_session`, httpOnly, secure, sameSite: 'lax'

2. **Item Validation**
   - Validates itemType enum
   - Checks item exists in database
   - Validates quantity (1-10)
   - Returns 400/404 for invalid data

3. **Cart Operations**
   - Uses `cart.service.ts` (Redis-backed)
   - Adds item to session cart
   - Returns updated cart with totals
   - Calculates subtotal, tax (8%), total

4. **Guest Cart Support**
   - Works without authentication
   - Session tracked via cookies
   - Persistent across page reloads
   - Can be merged with user cart later

### Technical Implementation

**Session Creation**:
```typescript
const sessionId = `cart_${Date.now()}_${Math.random().toString(36)}`;
cookies.set('cart_session', sessionId, {
  path: '/',
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7 // 7 days
});
```

**Validation**:
```typescript
// ItemType validation
if (!['course', 'event', 'digital_product'].includes(itemType)) {
  return new Response(JSON.stringify({
    success: false,
    error: 'Invalid item type'
  }), { status: 400 });
}

// Quantity validation
if (quantity < 1 || quantity > 10) {
  return new Response(JSON.stringify({
    success: false,
    error: 'Quantity must be between 1 and 10'
  }), { status: 400 });
}
```

**Cart Service Integration**:
```typescript
const updatedCart = await cartService.addItem(
  sessionId,
  itemId,
  itemType,
  quantity
);
```

### Error Handling
- Try-catch around all operations
- Specific error messages for each case
- Proper HTTP status codes
- Logs errors to console (development)

### Security Features
- HTTP-only cookies (XSS protection)
- Secure flag in production
- SameSite: lax (CSRF protection)
- Input validation on all fields
- Quantity limits prevent abuse

## Testing Results
✅ TypeScript: 0 errors
✅ Successfully adds items to cart
✅ Creates guest session correctly
✅ Sets secure cookies
✅ Validates itemType correctly
✅ Validates quantity range (1-10)
✅ Returns 404 for non-existent items
✅ Returns 400 for invalid inputs
✅ Calculates totals correctly
✅ Works with Redis cart service
✅ Manual test: Cart persists across reloads

## Integration Points
- **Input**: Frontend add-to-cart buttons
- **Storage**: Redis (via cart.service.ts)
- **Output**: Updated cart with totals
- **Cookie**: cart_session for session tracking

## Usage Example
```typescript
// Frontend: Add item to cart
const response = await fetch('/api/cart/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemId: 'course-123',
    itemType: 'course',
    quantity: 2
  })
});

const data = await response.json();
if (data.success) {
  console.log('Cart updated:', data.cart);
  console.log('Total items:', data.cart.itemCount);
}
```

## Dependencies
- `cart.service.ts`: Redis-backed cart operations
- `db/`: Database connection (Drizzle ORM)
- Astro cookies API

## Next Steps
- T043: Remove from cart endpoint
- T044: Get cart endpoint
- Update frontend to use this API instead of sessionStorage
- Add loading states to add-to-cart buttons

## Notes
- First API endpoint to use session cookies
- Redis provides fast cart operations
- Guest carts can be merged with user carts after login
- 7-day cookie expiration allows cart persistence
- Ready for production use
