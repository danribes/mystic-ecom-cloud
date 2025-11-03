/**
 * DELETE /api/cart/remove
 * 
 * Remove an item from the shopping cart
 * Uses Redis-backed cart service
 */

import type { APIRoute } from 'astro';
import { removeFromCart } from '@/services/cart.service';
import type { OrderItemType } from '@/types';

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    // Get user ID from session cookie
    const sessionId = cookies.get('session_id')?.value;
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active session found',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { itemType, itemId } = body;

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

    // Remove item from cart
    const cart = await removeFromCart(
      sessionId,
      itemType as OrderItemType,
      itemId
    );

    return new Response(
      JSON.stringify({
        success: true,
        cart,
        message: 'Item removed from cart successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error removing item from cart:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // Item not in cart error
      if (error.message.includes('not found') || error.message.includes('not in cart')) {
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
    }

    // Generic server error
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to remove item from cart',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
