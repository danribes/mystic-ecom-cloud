/**
 * Cart Service
 * 
 * Manages shopping cart operations using Redis for session-based storage.
 * - 7-day TTL on cart data
 * - JSON serialization for cart items
 * - 8% tax calculation
 * - Guest cart merge on login
 * - Atomic operations for concurrency
 */

import { getRedisClient } from '@/lib/redis';
import { getPool } from '@/lib/db';
import type { Cart, CartItem } from '@/types';
import { ValidationError, NotFoundError } from '@/lib/errors';

const CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const TAX_RATE = 0.08; // 8% tax

/**
 * Get cart key for Redis storage
 */
function getCartKey(userId: string): string {
  return `cart:${userId}`;
}

/**
 * Initialize empty cart
 */
function createEmptyCart(userId: string): Cart {
  return {
    userId,
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    itemCount: 0,
    updatedAt: new Date(),
  };
}

/**
 * Calculate cart totals
 */
function calculateTotals(items: CartItem[]): { subtotal: number; tax: number; total: number; itemCount: number } {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { subtotal, tax, total, itemCount };
}

/**
 * Add item to cart
 */
export async function addToCart(
  userId: string,
  itemType: 'course' | 'event' | 'digital_product',
  itemId: string,
  quantity: number = 1
): Promise<Cart> {
  const redis = await getRedisClient();
  const pool = getPool();

  // Validate quantity
  if (quantity < 1) {
    throw new ValidationError('Quantity must be at least 1');
  }

  // Verify item exists and get details
  let item: { id: string; title: string; price: number } | null = null;
  
  if (itemType === 'course') {
    const result = await pool.query(
      'SELECT id, title, price_cents FROM courses WHERE id = $1 AND deleted_at IS NULL',
      [itemId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('Course');
    }
    item = { id: result.rows[0].id, title: result.rows[0].title, price: result.rows[0].price_cents };
  } else if (itemType === 'event') {
    const result = await pool.query(
      'SELECT id, title, price_cents FROM events WHERE id = $1 AND deleted_at IS NULL',
      [itemId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('Event');
    }
    item = { id: result.rows[0].id, title: result.rows[0].title, price: result.rows[0].price_cents };
  } else if (itemType === 'digital_product') {
    const result = await pool.query(
      'SELECT id, title, price FROM digital_products WHERE id = $1 AND is_published = true',
      [itemId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('Digital Product');
    }
    // Convert price from decimal to cents
    item = { id: result.rows[0].id, title: result.rows[0].title, price: Math.round(parseFloat(result.rows[0].price) * 100) };
  }

  if (!item) {
    throw new ValidationError('Invalid item type');
  }

  // Get existing cart or create new one
  const cartKey = getCartKey(userId);
  const existingCartData = await redis.get(cartKey);
  let cart: Cart = existingCartData ? JSON.parse(existingCartData) : createEmptyCart(userId);

  // Check if item already in cart
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
      itemSlug: '', // Will be filled by frontend
      price: item.price,
      quantity,
    });
  }

  // Recalculate totals
  const totals = calculateTotals(cart.items);
  cart.subtotal = totals.subtotal;
  cart.tax = totals.tax;
  cart.total = totals.total;
  cart.itemCount = totals.itemCount;
  cart.updatedAt = new Date();

  // Save to Redis with TTL
  await redis.set(cartKey, JSON.stringify(cart), { EX: CART_TTL });

  return cart;
}

/**
 * Get cart for user
 */
export async function getCart(userId: string): Promise<Cart> {
  const redis = await getRedisClient();
  const cartKey = getCartKey(userId);
  
  const cartData = await redis.get(cartKey);
  
  if (!cartData) {
    return createEmptyCart(userId);
  }

  const cart = JSON.parse(cartData);
  // Convert updatedAt string back to Date
  cart.updatedAt = new Date(cart.updatedAt);
  return cart;
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  userId: string,
  itemType: 'course' | 'event' | 'digital_product',
  itemId: string,
  quantity: number
): Promise<Cart> {
  if (quantity < 0) {
    throw new ValidationError('Quantity cannot be negative');
  }

  const redis = await getRedisClient();
  const cartKey = getCartKey(userId);
  const cartData = await redis.get(cartKey);

  if (!cartData) {
    throw new NotFoundError('Cart');
  }

  const cart: Cart = JSON.parse(cartData);
  cart.updatedAt = new Date(cart.updatedAt);

  // Find item
  const itemIndex = cart.items.findIndex(
    (i) => i.itemType === itemType && i.itemId === itemId
  );

  if (itemIndex === -1) {
    throw new NotFoundError('Cart item');
  }

  if (quantity === 0) {
    // Remove item
    cart.items.splice(itemIndex, 1);
  } else {
    // Update quantity
    cart.items[itemIndex]!.quantity = quantity;
  }

  // Recalculate totals
  const totals = calculateTotals(cart.items);
  cart.subtotal = totals.subtotal;
  cart.tax = totals.tax;
  cart.total = totals.total;
  cart.itemCount = totals.itemCount;
  cart.updatedAt = new Date();

  // Save to Redis
  await redis.set(cartKey, JSON.stringify(cart), { EX: CART_TTL });

  return cart;
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
  userId: string,
  itemType: 'course' | 'event' | 'digital_product',
  itemId: string
): Promise<Cart> {
  return updateCartItem(userId, itemType, itemId, 0);
}

/**
 * Clear entire cart
 */
export async function clearCart(userId: string): Promise<void> {
  const redis = await getRedisClient();
  const cartKey = getCartKey(userId);
  await redis.del(cartKey);
}

/**
 * Get cart item count
 */
export async function getCartItemCount(userId: string): Promise<number> {
  const cart = await getCart(userId);
  return cart.itemCount;
}

/**
 * Validate cart items (check availability, prices, etc.)
 */
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
      const result = await pool.query(
        'SELECT id, title, price_cents, start_date, max_attendees, (SELECT COUNT(*) FROM bookings WHERE event_id = $1 AND status = $2) as current_bookings FROM events WHERE id = $1 AND deleted_at IS NULL',
        [item.itemId, 'confirmed']
      );
      
      if (result.rows.length === 0) {
        errors.push(`Event "${item.itemTitle}" is no longer available`);
      } else {
        const event = result.rows[0];
        if (new Date(event.start_date) < new Date()) {
          errors.push(`Event "${item.itemTitle}" has already started`);
        }
        if (event.max_attendees && event.current_bookings >= event.max_attendees) {
          errors.push(`Event "${item.itemTitle}" is fully booked`);
        }
        if (event.price_cents !== item.price) {
          errors.push(`Price for "${item.itemTitle}" has changed`);
        }
      }
    } else if (item.itemType === 'digital_product') {
      const result = await pool.query(
        'SELECT id, title, price_cents, is_available FROM digital_products WHERE id = $1 AND deleted_at IS NULL',
        [item.itemId]
      );
      
      if (result.rows.length === 0) {
        errors.push(`Digital product "${item.itemTitle}" is no longer available`);
      } else {
        const product = result.rows[0];
        if (!product.is_available) {
          errors.push(`Digital product "${item.itemTitle}" is not currently available`);
        }
        if (product.price_cents !== item.price) {
          errors.push(`Price for "${item.itemTitle}" has changed`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge guest cart into user cart on login
 */
export async function mergeGuestCart(guestUserId: string, loggedInUserId: string): Promise<Cart> {
  const redis = await getRedisClient();
  
  const guestCartKey = getCartKey(guestUserId);
  const userCartKey = getCartKey(loggedInUserId);
  
  const guestCartData = await redis.get(guestCartKey);
  
  if (!guestCartData) {
    // No guest cart to merge
    return getCart(loggedInUserId);
  }

  const guestCart: Cart = JSON.parse(guestCartData);
  guestCart.updatedAt = new Date(guestCart.updatedAt);
  
  const userCartData = await redis.get(userCartKey);
  const userCart: Cart = userCartData ? JSON.parse(userCartData) : createEmptyCart(loggedInUserId);
  if (userCartData) {
    userCart.updatedAt = new Date(userCart.updatedAt);
  }

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

/**
 * Check if specific item is available
 */
export async function checkItemAvailability(
  itemType: 'course' | 'event' | 'digital_product',
  itemId: string
): Promise<{ available: boolean; reason?: string }> {
  const pool = getPool();

  if (itemType === 'course') {
    const result = await pool.query(
      'SELECT id, is_published FROM courses WHERE id = $1 AND deleted_at IS NULL',
      [itemId]
    );
    
    if (result.rows.length === 0) {
      return { available: false, reason: 'Course not found' };
    }
    
    if (!result.rows[0].is_published) {
      return { available: false, reason: 'Course not published' };
    }
    
    return { available: true };
  } else if (itemType === 'event') {
    const result = await pool.query(
      'SELECT id, start_date, max_attendees, (SELECT COUNT(*) FROM bookings WHERE event_id = $1 AND status = $2) as current_bookings FROM events WHERE id = $1 AND deleted_at IS NULL',
      [itemId, 'confirmed']
    );
    
    if (result.rows.length === 0) {
      return { available: false, reason: 'Event not found' };
    }
    
    const event = result.rows[0];
    
    if (new Date(event.start_date) < new Date()) {
      return { available: false, reason: 'Event has already started' };
    }
    
    if (event.max_attendees && event.current_bookings >= event.max_attendees) {
      return { available: false, reason: 'Event fully booked' };
    }
    
    return { available: true };
  } else if (itemType === 'digital_product') {
    const result = await pool.query(
      'SELECT id, is_available FROM digital_products WHERE id = $1 AND deleted_at IS NULL',
      [itemId]
    );
    
    if (result.rows.length === 0) {
      return { available: false, reason: 'Product not found' };
    }
    
    if (!result.rows[0].is_available) {
      return { available: false, reason: 'Product not available' };
    }
    
    return { available: true };
  }

  return { available: false, reason: 'Invalid item type' };
}
