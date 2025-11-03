/**
 * Stripe Integration Service
 * 
 * Handles payment processing via Stripe:
 * - Create checkout sessions for orders
 * - Validate webhook signatures
 * - Process webhook events (payment success, refunds)
 * - Generate payment intents
 */

import Stripe from 'stripe';
import type { Order } from '@/types';
import { ValidationError, NotFoundError } from '@/lib/errors';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

/**
 * Get Stripe publishable key for client-side
 */
export function getPublishableKey(): string {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is not configured');
  }
  return key;
}

/**
 * Create a Stripe Checkout Session for an order
 * 
 * @param orderId - Order ID
 * @param order - Order details (items, total, user info)
 * @param successUrl - URL to redirect on successful payment
 * @param cancelUrl - URL to redirect if user cancels
 * @returns Stripe Checkout Session
 */
export async function createCheckoutSession(
  orderId: string,
  order: {
    items: Array<{
      itemType: string;
      itemTitle: string;
      price: number;
      quantity: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    userEmail: string;
  },
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  try {
    // Validate inputs
    if (!orderId) {
      throw new ValidationError('Order ID is required');
    }
    if (!order.items || order.items.length === 0) {
      throw new ValidationError('Order must have at least one item');
    }
    if (order.total <= 0) {
      throw new ValidationError('Order total must be greater than zero');
    }

    // Convert items to Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.itemTitle,
          description: `${item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)}`,
        },
        unit_amount: item.price, // Price in cents
      },
      quantity: item.quantity,
    }));

    // Add tax as a separate line item if present
    if (order.tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tax',
            description: 'Sales tax',
          },
          unit_amount: order.tax,
        },
        quantity: 1,
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: order.userEmail,
      client_reference_id: orderId, // Link session to our order
      metadata: {
        orderId,
        subtotal: order.subtotal.toString(),
        tax: order.tax.toString(),
        total: order.total.toString(),
      },
      // Payment intent data for later reference
      payment_intent_data: {
        metadata: {
          orderId,
        },
      },
    });

    return session;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate Stripe webhook signature
 * 
 * @param payload - Raw request body
 * @param signature - Stripe signature header
 * @returns Parsed and verified Stripe event
 * @throws ValidationError if signature is invalid
 */
export function validateWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (error) {
    if (error instanceof Error) {
      throw new ValidationError(`Webhook signature verification failed: ${error.message}`);
    }
    throw new ValidationError('Webhook signature verification failed');
  }
}

/**
 * Process webhook event
 * 
 * Handles various Stripe events:
 * - checkout.session.completed - Payment successful
 * - payment_intent.succeeded - Payment confirmed
 * - payment_intent.payment_failed - Payment failed
 * - charge.refunded - Refund processed
 * 
 * @param event - Stripe event
 * @returns Processed event data with orderId and relevant information
 */
export async function processWebhookEvent(
  event: Stripe.Event
): Promise<{
  type: string;
  orderId: string | null;
  paymentIntentId?: string;
  amount?: number;
  status?: string;
  data?: any;
}> {
  const { type, data } = event;

  switch (type) {
    case 'checkout.session.completed': {
      const session = data.object as Stripe.Checkout.Session;
      return {
        type: 'checkout.completed',
        orderId: session.client_reference_id || session.metadata?.orderId || null,
        paymentIntentId: session.payment_intent as string,
        amount: session.amount_total || 0,
        status: 'paid',
        data: {
          customerEmail: session.customer_email,
          paymentStatus: session.payment_status,
        },
      };
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = data.object as Stripe.PaymentIntent;
      return {
        type: 'payment.succeeded',
        orderId: paymentIntent.metadata?.orderId || null,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: 'paid',
        data: {
          receiptEmail: paymentIntent.receipt_email,
        },
      };
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = data.object as Stripe.PaymentIntent;
      return {
        type: 'payment.failed',
        orderId: paymentIntent.metadata?.orderId || null,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        status: 'payment_failed',
        data: {
          lastPaymentError: paymentIntent.last_payment_error?.message,
        },
      };
    }

    case 'charge.refunded': {
      const charge = data.object as Stripe.Charge;
      return {
        type: 'charge.refunded',
        orderId: charge.metadata?.orderId || null,
        paymentIntentId: charge.payment_intent as string,
        amount: charge.amount_refunded,
        status: 'refunded',
        data: {
          refundReason: charge.refunds?.data[0]?.reason || 'requested_by_customer',
        },
      };
    }

    default:
      // Unhandled event type
      return {
        type,
        orderId: null,
      };
  }
}

/**
 * Create a Payment Intent directly (alternative to Checkout Session)
 * 
 * Used for custom payment flows where you control the UI
 * 
 * @param orderId - Order ID
 * @param amount - Amount in cents
 * @param currency - Currency code (default: 'usd')
 * @param metadata - Additional metadata to attach
 * @returns Stripe Payment Intent
 */
export async function createPaymentIntent(
  orderId: string,
  amount: number,
  currency: string = 'usd',
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
  try {
    if (!orderId) {
      throw new ValidationError('Order ID is required');
    }
    if (amount <= 0) {
      throw new ValidationError('Amount must be greater than zero');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId,
        ...metadata,
      },
    });

    return paymentIntent;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Retrieve a Payment Intent
 * 
 * @param paymentIntentId - Payment Intent ID
 * @returns Stripe Payment Intent
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    if (!paymentIntentId) {
      throw new ValidationError('Payment Intent ID is required');
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      if (error.code === 'resource_missing') {
        throw new NotFoundError('Payment Intent');
      }
      throw new Error(`Stripe error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create a refund for a payment
 * 
 * @param paymentIntentId - Payment Intent ID to refund
 * @param amount - Amount to refund in cents (optional, defaults to full refund)
 * @param reason - Reason for refund
 * @returns Stripe Refund
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<Stripe.Refund> {
  try {
    if (!paymentIntentId) {
      throw new ValidationError('Payment Intent ID is required');
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount !== undefined) {
      refundParams.amount = amount;
    }

    if (reason) {
      refundParams.reason = reason;
    }

    const refund = await stripe.refunds.create(refundParams);
    return refund;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Retrieve checkout session by ID
 * 
 * @param sessionId - Checkout Session ID
 * @returns Stripe Checkout Session
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  try {
    if (!sessionId) {
      throw new ValidationError('Session ID is required');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      if (error.code === 'resource_missing') {
        throw new NotFoundError('Checkout Session');
      }
      throw new Error(`Stripe error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * List all payment methods for a customer
 * 
 * @param customerId - Stripe Customer ID
 * @returns List of payment methods
 */
export async function listPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  try {
    if (!customerId) {
      throw new ValidationError('Customer ID is required');
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Export Stripe client for advanced usage
 */
export { stripe };
