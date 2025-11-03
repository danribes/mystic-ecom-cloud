# T043: Remove from Cart API Endpoint

**Status**: ✅ Complete
**Date**: October 31, 2025
**Time**: ~1 hour

## Overview
Implemented DELETE endpoint for removing items from the shopping cart with session validation and error handling.

## Implementation

### File Created
- `src/pages/api/cart/remove.ts` (111 lines)

### API Specification

**Endpoint**: `DELETE /api/cart/remove`

**Request Body**:
```typescript
{
  itemId: string;           // ID of item to remove
  itemType: 'course' | 'event' | 'digital_product';
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
- `400 Bad Request`: Missing required fields, invalid itemType
- `401 Unauthorized`: No active cart session
- `404 Not Found`: Item not in cart
- `500 Internal Server Error`: Database/Redis errors

### Features Implemented

1. **Session Validation**
   - Requires existing cart session
   - Returns 401 if no session cookie
   - Verifies session exists in Redis

2. **Item Validation**
   - Validates itemType enum
   - Checks item exists in cart
   - Returns 404 if item not found

3. **Cart Operations**
   - Removes item from Redis cart
   - Returns updated cart with recalculated totals
   - Handles empty cart gracefully

4. **Response Format**
   - Success message with item details
   - Updated cart state
   - Consistent error format

### Technical Implementation

**Session Check**:
```typescript
const sessionId = cookies.get('cart_session')?.value;
if (!sessionId) {
  return new Response(JSON.stringify({
    success: false,
    error: 'No active cart session'
  }), { 
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**Item Removal**:
```typescript
const updatedCart = await cartService.removeItem(
  sessionId,
  itemId,
  itemType
);

// Cart service handles Redis operations
// Returns updated cart or throws if item not found
```

**Error Handling**:
```typescript
try {
  const updatedCart = await cartService.removeItem(...);
  return new Response(JSON.stringify({
    success: true,
    cart: updatedCart,
    message: `Removed ${itemType} from cart`
  }), { status: 200 });
} catch (error) {
  if (error.message.includes('not found')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Item not in cart'
    }), { status: 404 });
  }
  throw error; // Re-throw unexpected errors
}
```

### Validation
- **Required Fields**: itemId, itemType
- **ItemType Enum**: 'course' | 'event' | 'digital_product'
- **Session**: Must have active cart_session cookie
- **Item Existence**: Verified in cart before removal

### Security Features
- Session validation prevents unauthorized access
- HTTP-only cookies (cannot be read by JavaScript)
- Input validation on all fields
- Specific error messages (no sensitive data)

## Testing Results
✅ TypeScript: 0 errors
✅ Successfully removes items from cart
✅ Returns 401 without session
✅ Returns 404 for non-existent items
✅ Returns 400 for invalid itemType
✅ Recalculates totals correctly
✅ Works with empty cart
✅ Handles Redis errors gracefully
✅ Manual test: Removal persists across reloads

## Integration Points
- **Input**: Frontend remove buttons (cart page, checkout)
- **Storage**: Redis (via cart.service.ts)
- **Output**: Updated cart without removed item
- **Cookie**: Reads cart_session for session ID

## Usage Example
```typescript
// Frontend: Remove item from cart
const response = await fetch('/api/cart/remove', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemId: 'course-123',
    itemType: 'course'
  })
});

const data = await response.json();
if (data.success) {
  console.log('Item removed');
  console.log('Updated cart:', data.cart);
  // Update UI with new cart state
} else {
  console.error('Error:', data.error);
}
```

## Error Scenarios

**No Session**:
```json
{
  "success": false,
  "error": "No active cart session"
}
```

**Item Not in Cart**:
```json
{
  "success": false,
  "error": "Item not in cart"
}
```

**Invalid ItemType**:
```json
{
  "success": false,
  "error": "Invalid item type. Must be: course, event, digital_product"
}
```

## Dependencies
- `cart.service.ts`: Redis cart operations (removeItem method)
- Astro cookies API
- Redis connection

## Next Steps
- T044: Get cart endpoint (read-only)
- Update cart page to use remove API
- Update checkout page to use remove API
- Add optimistic UI updates
- Add loading states during removal

## Notes
- Works in conjunction with T042 (add) and T044 (get)
- Session-based (no authentication required)
- Graceful error handling
- Redis provides atomic operations
- Ready for frontend integration
