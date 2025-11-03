/**
 * POST /api/cart/add
 * 
 * Add an item to the shopping cart
 * Uses Redis-backed cart service
 */

import type { APIRoute } from 'astro';
import { addToCart } from '@/services/cart.service';
import type { OrderItemType } from '@/types';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get user ID from session cookie (or use 'guest' for anonymous users)
    const sessionId = cookies.get('session_id')?.value;
    const userId = sessionId || `guest-${Date.now()}`;

    // Parse request body
    const body = await request.json();
    const { itemType, itemId, quantity = 1 } = body;

    // Validate required fields
    if (!itemType || !itemId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: itemType and itemId',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate item type
    const validTypes: OrderItemType[] = ['course', 'event', 'digital_product'];
    if (!validTypes.includes(itemType as OrderItemType)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid itemType. Must be one of: ${validTypes.join(', ')}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate quantity
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1 || qty > 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Quantity must be between 1 and 10',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Add item to cart
    const cart = await addToCart(
      userId,
      itemType as OrderItemType,
      itemId,
      qty
    );

    // If this is a guest user, set a cookie so we can track their cart
    if (!sessionId) {
      cookies.set('session_id', userId, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        cart,
        message: 'Item added to cart successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error adding item to cart:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // Item not found error
      if (error.message.includes('not found')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Invalid item error
      if (error.message.includes('Invalid')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Generic server error
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to add item to cart',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
