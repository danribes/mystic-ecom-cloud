/**
 * POST /api/checkout/webhook
 * 
 * Stripe webhook handler for payment events
 * 
 * Flow:
 * 1. Verify webhook signature
 * 2. Parse event type
 * 3. Handle checkout.session.completed event
 * 4. Update order status to 'completed'
 * 5. Send email + WhatsApp notifications
 * 6. Clear customer's cart
 * 7. Grant access to purchased items
 * 
 * Security:
 * - Stripe signature verification required
 * - Raw body needed for signature validation
 * - Returns 400 if signature invalid
 */

import type { APIRoute } from 'astro';
import { validateWebhook, processWebhookEvent, getCheckoutSession } from '@/lib/stripe';
import { getPool } from '@/lib/db';
import { clearCart } from '@/services/cart.service';
import { sendOrderNotifications } from '@/lib/whatsapp';
import { notifyAdminsNewOrder } from '@/lib/twilio'; // T074: Enhanced admin notifications with retry logic
import { sendOrderConfirmationEmail } from '@/lib/email';
import type { OrderConfirmationData } from '@/lib/email';

export const POST: APIRoute = async ({ request }) => {
  const pool = getPool();
  
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[WEBHOOK] Missing Stripe signature');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Stripe signature',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify webhook signature and construct event
    let event;
    try {
      event = validateWebhook(body, signature);
    } catch (err) {
      console.error('[WEBHOOK] Signature verification failed:', err);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid signature',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[WEBHOOK] Received event: ${event.type}`);

    // Process the webhook event
    const processedEvent = await processWebhookEvent(event);

    // Handle checkout.session.completed event
    if (processedEvent.type === 'checkout.completed') {
      const { orderId, paymentIntentId } = processedEvent;

      if (!orderId) {
        console.error('[WEBHOOK] No orderId in checkout session');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Order ID not found in session',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Get order details
      const orderResult = await pool.query(
        `SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at
         FROM orders o
         WHERE o.id = $1`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        console.error(`[WEBHOOK] Order not found: ${orderId}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Order not found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const order = orderResult.rows[0];

      // Check if order already processed
      if (order.status === 'completed') {
        console.log(`[WEBHOOK] Order already completed: ${orderId}`);
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Order already processed',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Update order status to completed
      await pool.query(
        `UPDATE orders 
         SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [orderId]
      );

      console.log(`[WEBHOOK] Order completed: ${orderId}`);

      // Get order items
      const itemsResult = await pool.query(
        `SELECT 
          oi.id,
          oi.item_type,
          oi.title,
          oi.price,
          oi.quantity,
          oi.course_id,
          oi.digital_product_id
         FROM order_items oi
         WHERE oi.order_id = $1`,
        [orderId]
      );

      const orderItems = itemsResult.rows;

      // Get customer email from Stripe session
      const sessionData = event.data.object as any;
      const session = await getCheckoutSession(sessionData.id);
      const customerEmail = session.customer_email || processedEvent.data?.customerEmail;
      const sessionId = order.user_id || session.client_reference_id;

      if (!customerEmail) {
        console.error(`[WEBHOOK] No customer email found for order: ${orderId}`);
        // Continue processing even without email
      }

      // Get user details if user_id exists
      let customerName = 'Valued Customer';
      let customerPhone = null;

      if (order.user_id) {
        const userResult = await pool.query(
          'SELECT name, email, phone FROM users WHERE id = $1',
          [order.user_id]
        );
        
        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          customerName = user.name || customerName;
          customerPhone = user.phone;
        }
      }

      // Grant access to purchased items
      for (const item of orderItems) {
        if (item.item_type === 'course' && item.course_id) {
          // Grant course access
          await pool.query(
            `INSERT INTO course_enrollments (user_id, course_id, enrolled_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, course_id) DO NOTHING`,
            [order.user_id, item.course_id]
          );
          
          console.log(`[WEBHOOK] Granted course access: user=${order.user_id}, course=${item.course_id}`);
        }

        // For digital products, access is granted via order_items table
        // Frontend checks if user has purchased by querying order_items
      }

      // Update event bookings status if any
      await pool.query(
        `UPDATE bookings 
         SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
         WHERE order_id = $1 AND status = 'pending'`,
        [orderId]
      );

      // Prepare notification data
      const emailData: OrderConfirmationData = {
        orderId: orderId,
        customerName: customerName,
        customerEmail: customerEmail || '',
        orderDate: new Date(order.created_at),
        items: orderItems.map(item => ({
          type: item.item_type,
          title: item.title,
          price: item.price * 100, // Convert back to cents for email template
          quantity: item.quantity,
        })),
        subtotal: Math.round((order.total_amount / 1.08) * 100), // Remove tax, convert to cents
        tax: Math.round(order.total_amount * 0.08 * 100), // 8% tax in cents
        total: Math.round(order.total_amount * 100), // Convert to cents
        accessLinks: [], // Frontend will provide course access links
      };

      // Send email + WhatsApp notifications
      try {
        // T074: Send customer notifications (email + WhatsApp if phone provided)
        if (customerEmail) {
          // Send email confirmation to customer
          const emailResult = await sendOrderConfirmationEmail(emailData);
          console.log(`[WEBHOOK] Customer email notification for order ${orderId}:`, {
            success: emailResult.success,
            messageId: emailResult.messageId,
          });

          // Send WhatsApp confirmation to customer if phone provided
          if (customerPhone) {
            const { sendOrderWhatsApp } = await import('@/lib/whatsapp');
            const whatsappResult = await sendOrderWhatsApp({
              orderId: orderId,
              customerName: customerName,
              customerPhone: customerPhone,
              items: orderItems.map(item => ({
                title: item.title,
                price: item.price,
              })),
              total: order.total_amount,
              dashboardUrl: `${process.env.BASE_URL || 'http://localhost:4321'}/dashboard/orders/${orderId}`,
            });
            console.log(`[WEBHOOK] Customer WhatsApp notification for order ${orderId}:`, {
              success: whatsappResult.success,
            });
          }
        }

        // T074: Send admin notifications using enhanced T073 implementation
        // This uses the improved notifyAdminsNewOrder with retry logic and better formatting
        const adminNotificationResult = await notifyAdminsNewOrder({
          orderId: orderId,
          customerName: customerName,
          customerEmail: customerEmail || 'No email provided',
          totalAmount: order.total_amount,
          items: orderItems.map(item => ({
            title: item.title,
            quantity: item.quantity,
            price: item.price,
          })),
        });

        console.log(`[WEBHOOK] Admin notifications sent for order ${orderId}:`, {
          successCount: adminNotificationResult.filter(r => r !== null).length,
          totalAdmins: adminNotificationResult.length,
        });
      } catch (notificationError) {
        // Log error but don't fail the webhook
        console.error('[WEBHOOK] Notification error:', notificationError);
      }

      // Clear customer's cart
      try {
        if (sessionId) {
          await clearCart(sessionId);
          console.log(`[WEBHOOK] Cart cleared for session: ${sessionId}`);
        }
      } catch (cartError) {
        // Log error but don't fail the webhook
        console.error('[WEBHOOK] Cart clear error:', cartError);
      }

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Order completed successfully',
          orderId: orderId,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle payment_intent.succeeded event
    if (processedEvent.type === 'payment.succeeded') {
      console.log(`[WEBHOOK] Payment succeeded: ${processedEvent.paymentIntentId}`);
      
      // This is handled by checkout.completed, but we log it
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment confirmed',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle payment_intent.payment_failed event
    if (processedEvent.type === 'payment.failed') {
      console.error(`[WEBHOOK] Payment failed: ${processedEvent.paymentIntentId}`);
      
      if (processedEvent.orderId) {
        await pool.query(
          `UPDATE orders 
           SET status = 'payment_failed', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [processedEvent.orderId]
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment failure recorded',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle charge.refunded event
    if (processedEvent.type === 'charge.refunded') {
      console.log(`[WEBHOOK] Charge refunded: ${processedEvent.paymentIntentId}`);
      
      if (processedEvent.orderId) {
        await pool.query(
          `UPDATE orders 
           SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [processedEvent.orderId]
        );

        // Revoke course access
        await pool.query(
          `DELETE FROM course_enrollments 
           WHERE user_id IN (SELECT user_id FROM orders WHERE id = $1)
           AND course_id IN (
             SELECT course_id FROM order_items WHERE order_id = $1 AND course_id IS NOT NULL
           )`,
          [processedEvent.orderId]
        );

        // Cancel bookings
        await pool.query(
          `UPDATE bookings 
           SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
           WHERE order_id = $1`,
          [processedEvent.orderId]
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Refund processed',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Unknown event type - log and return success
    console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Event received',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);

    // Return 500 to tell Stripe to retry
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Webhook processing failed',
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
