/**
 * GET /api/cart
 * 
 * Retrieve the current user's shopping cart
 * Uses Redis-backed cart service
 */

import type { APIRoute } from 'astro';
import { getCart } from '@/services/cart.service';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Get user ID from session cookie
    const sessionId = cookies.get('session_id')?.value;
    
    if (!sessionId) {
      // Return empty cart for users without a session
      return new Response(
        JSON.stringify({
          success: true,
          cart: {
            userId: 'guest',
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0,
            itemCount: 0,
            updatedAt: new Date(),
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get cart from Redis
    const cart = await getCart(sessionId);

    return new Response(
      JSON.stringify({
        success: true,
        cart,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error retrieving cart:', error);

    // If cart not found, return empty cart instead of error
    if (error instanceof Error && error.message.includes('not found')) {
      return new Response(
        JSON.stringify({
          success: true,
          cart: {
            userId: 'guest',
            items: [],
            subtotal: 0,
            tax: 0,
            total: 0,
            itemCount: 0,
            updatedAt: new Date(),
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generic server error
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to retrieve cart',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
