/**
 * POST /api/checkout/create-session
 * 
 * Create a Stripe Checkout Session for the current cart
 * 
 * Flow:
 * 1. Get user's cart from Redis
 * 2. Validate cart has items
 * 3. Create a pending order in database
 * 4. Create Stripe checkout session with order ID
 * 5. Return session ID to client for redirect
 * 
 * The webhook handler (T047) will complete the order after payment
 */

import type { APIRoute } from 'astro';
import { getCart } from '@/services/cart.service';
import { createCheckoutSession } from '@/lib/stripe';
import { getPool } from '@/lib/db';
import type { OrderItemType } from '@/types';

export const POST: APIRoute = async ({ request, cookies }) => {
  const pool = getPool();
  
  try {
    // Get user ID from session cookie
    const sessionId = cookies.get('session_id')?.value;
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active session. Please add items to cart first.',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get cart data from Redis
    const cart = await getCart(sessionId);

    // Validate cart has items
    if (!cart.items || cart.items.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cart is empty. Please add items before checkout.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body for additional data
    const body = await request.json().catch(() => ({}));
    const { 
      userEmail, 
      userId, 
      successUrl, 
      cancelUrl 
    } = body;

    // Validate required fields
    if (!userEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email is required for checkout',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email format',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get frontend URL from environment or use default
    const frontendUrl = process.env.BASE_URL || 'http://localhost:4321';
    
    // Set default URLs if not provided
    const defaultSuccessUrl = `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${frontendUrl}/checkout/cancel`;
    
    const finalSuccessUrl = successUrl || defaultSuccessUrl;
    const finalCancelUrl = cancelUrl || defaultCancelUrl;

    // Create a pending order in the database
    // The webhook handler will update this to 'completed' after payment
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, status, total_amount, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        userId || null, // Can be null for guest checkout
        'pending',
        cart.total / 100, // Convert cents to dollars for DB
        'USD'
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Insert order items
    for (const item of cart.items) {
      let courseId = null;
      let productId = null;
      
      if (item.itemType === 'course') {
        courseId = item.itemId;
      } else if (item.itemType === 'digital_product') {
        productId = item.itemId;
      }

      await pool.query(
        `INSERT INTO order_items (
          order_id, 
          course_id, 
          digital_product_id, 
          item_type, 
          title, 
          price, 
          quantity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orderId,
          courseId,
          productId,
          item.itemType,
          item.itemTitle,
          item.price / 100, // Convert cents to dollars
          item.quantity
        ]
      );
    }

    // For events, also create booking records
    const eventItems = cart.items.filter(item => item.itemType === 'event');
    for (const eventItem of eventItems) {
      await pool.query(
        `INSERT INTO bookings (
          user_id,
          event_id,
          order_id,
          status,
          attendees,
          total_price
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId || null,
          eventItem.itemId,
          orderId,
          'pending',
          eventItem.quantity,
          (eventItem.price * eventItem.quantity) / 100 // Convert cents to dollars
        ]
      );
    }

    // Prepare items for Stripe checkout
    const stripeItems = cart.items.map(item => ({
      itemType: item.itemType,
      itemTitle: item.itemTitle,
      price: item.price, // Stripe expects cents
      quantity: item.quantity,
    }));

    // Create Stripe Checkout Session
    const session = await createCheckoutSession(
      orderId,
      {
        items: stripeItems,
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total,
        userEmail,
      },
      finalSuccessUrl,
      finalCancelUrl
    );

    // Update order with Stripe payment intent ID
    await pool.query(
      'UPDATE orders SET stripe_payment_intent_id = $1 WHERE id = $2',
      [session.payment_intent, orderId]
    );

    // Return session information to client
    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        sessionUrl: session.url,
        orderId,
        message: 'Checkout session created successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creating checkout session:', error);

    // Handle specific error types
    if (error instanceof Error) {
      // Stripe errors (check first, before general validation)
      if (error.message.includes('Stripe')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Payment system error. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Validation errors
      if (error.message.includes('required') || error.message.includes('Invalid')) {
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

      // Cart not found
      if (error.message.includes('Cart') || error.message.includes('not found')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Cart not found or expired. Please add items again.',
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
        error: 'Failed to create checkout session',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
