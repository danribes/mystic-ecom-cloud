/**
 * Unit Tests: Stripe Service
 * 
 * Tests for Stripe payment integration functions
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Stripe from 'stripe';
import {
  getPublishableKey,
  createCheckoutSession,
  validateWebhook,
  processWebhookEvent,
  createPaymentIntent,
  getPaymentIntent,
  createRefund,
  getCheckoutSession,
  stripe,
} from '@/lib/stripe';

// Store original env vars
const originalEnv = process.env;

describe('Stripe Service', () => {
  beforeAll(() => {
    // Set test environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_secret_key';
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_publishable_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock_webhook_secret';
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('getPublishableKey', () => {
    it('should return the publishable key from environment', () => {
      const key = getPublishableKey();
      expect(key).toBe('pk_test_mock_publishable_key');
    });

    it('should throw error if publishable key is not configured', () => {
      const originalKey = process.env.STRIPE_PUBLISHABLE_KEY;
      delete process.env.STRIPE_PUBLISHABLE_KEY;

      expect(() => getPublishableKey()).toThrow('STRIPE_PUBLISHABLE_KEY is not configured');

      process.env.STRIPE_PUBLISHABLE_KEY = originalKey;
    });
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session with valid order data', async () => {
      const orderId = 'order_test_123';
      const order = {
        items: [
          {
            itemType: 'course',
            itemTitle: 'Introduction to Meditation',
            price: 4900,
            quantity: 1,
          },
        ],
        subtotal: 4900,
        tax: 392,
        total: 5292,
        userEmail: 'test@example.com',
      };

      // Mock Stripe API call
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
        client_reference_id: orderId,
        metadata: {
          orderId,
          subtotal: '4900',
          tax: '392',
          total: '5292',
        },
      };

      vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue(mockSession as any);

      const session = await createCheckoutSession(
        orderId,
        order,
        'http://localhost:4321/success',
        'http://localhost:4321/cancel'
      );

      expect(session.id).toBe('cs_test_123');
      expect(session.url).toContain('checkout.stripe.com');
      expect(session.client_reference_id).toBe(orderId);
    });

    it('should throw ValidationError for empty orderId', async () => {
      const order = {
        items: [{ itemType: 'course', itemTitle: 'Test', price: 1000, quantity: 1 }],
        subtotal: 1000,
        tax: 80,
        total: 1080,
        userEmail: 'test@example.com',
      };

      await expect(
        createCheckoutSession('', order, 'http://success', 'http://cancel')
      ).rejects.toThrow('Order ID is required');
    });

    it('should throw ValidationError for empty items', async () => {
      const order = {
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        userEmail: 'test@example.com',
      };

      await expect(
        createCheckoutSession('order_123', order, 'http://success', 'http://cancel')
      ).rejects.toThrow('Order must have at least one item');
    });

    it('should throw ValidationError for zero or negative total', async () => {
      const order = {
        items: [{ itemType: 'course', itemTitle: 'Test', price: 0, quantity: 1 }],
        subtotal: 0,
        tax: 0,
        total: 0,
        userEmail: 'test@example.com',
      };

      await expect(
        createCheckoutSession('order_123', order, 'http://success', 'http://cancel')
      ).rejects.toThrow('Order total must be greater than zero');
    });

    it('should include tax as a separate line item', async () => {
      const order = {
        items: [
          { itemType: 'course', itemTitle: 'Test Course', price: 5000, quantity: 1 },
        ],
        subtotal: 5000,
        tax: 400,
        total: 5400,
        userEmail: 'test@example.com',
      };

      const createSpy = vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any);

      await createCheckoutSession('order_123', order, 'http://success', 'http://cancel');

      expect(createSpy).toHaveBeenCalled();
      const callArgs = createSpy.mock.calls[0]?.[0] as Stripe.Checkout.SessionCreateParams;
      
      // Should have 2 line items: course + tax
      expect(callArgs?.line_items).toHaveLength(2);
      expect(callArgs?.line_items?.[1]?.price_data?.product_data?.name).toBe('Tax');
    });

    it('should handle multiple items in order', async () => {
      const order = {
        items: [
          { itemType: 'course', itemTitle: 'Course 1', price: 3000, quantity: 1 },
          { itemType: 'event', itemTitle: 'Event 1', price: 2000, quantity: 2 },
          { itemType: 'product', itemTitle: 'Product 1', price: 1000, quantity: 1 },
        ],
        subtotal: 8000,
        tax: 640,
        total: 8640,
        userEmail: 'test@example.com',
      };

      const createSpy = vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any);

      await createCheckoutSession('order_123', order, 'http://success', 'http://cancel');

      const callArgs = createSpy.mock.calls[0]?.[0] as Stripe.Checkout.SessionCreateParams;
      
      // Should have 4 line items: 3 products + tax
      expect(callArgs?.line_items).toHaveLength(4);
      expect(callArgs?.line_items?.[0]?.quantity).toBe(1);
      expect(callArgs?.line_items?.[1]?.quantity).toBe(2);
    });
  });

  describe('validateWebhook', () => {
    it('should validate webhook with correct signature', () => {
      const payload = JSON.stringify({ type: 'checkout.session.completed' });
      const signature = 'valid_signature';

      // Mock Stripe webhook construction
      const mockEvent = {
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: { object: {} },
      } as Stripe.Event;

      vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(mockEvent);

      const event = validateWebhook(payload, signature);

      expect(event.type).toBe('checkout.session.completed');
      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        'whsec_test_mock_webhook_secret'
      );
    });

    it('should throw ValidationError for invalid signature', () => {
      const payload = JSON.stringify({ type: 'test' });
      const signature = 'invalid_signature';

      vi.spyOn(stripe.webhooks, 'constructEvent').mockImplementation(() => {
        throw new Error('Signature verification failed');
      });

      expect(() => validateWebhook(payload, signature)).toThrow(
        'Webhook signature verification failed'
      );
    });

    it('should throw error if webhook secret is not configured', () => {
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      expect(() => validateWebhook('payload', 'signature')).toThrow(
        'STRIPE_WEBHOOK_SECRET is not configured'
      );

      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    });
  });

  describe('processWebhookEvent', () => {
    it('should process checkout.session.completed event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            object: 'checkout.session',
            client_reference_id: 'order_123',
            payment_intent: 'pi_test',
            amount_total: 9900,
            customer_email: 'test@example.com',
            payment_status: 'paid',
          } as any,
        },
      } as any;

      const result = await processWebhookEvent(event);

      expect(result.type).toBe('checkout.completed');
      expect(result.orderId).toBe('order_123');
      expect(result.paymentIntentId).toBe('pi_test');
      expect(result.amount).toBe(9900);
      expect(result.status).toBe('paid');
      expect(result.data.customerEmail).toBe('test@example.com');
    });

    it('should process payment_intent.succeeded event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test',
            object: 'payment_intent',
            metadata: { orderId: 'order_456' },
            amount: 5000,
            receipt_email: 'test@example.com',
          } as any,
        },
      } as any;

      const result = await processWebhookEvent(event);

      expect(result.type).toBe('payment.succeeded');
      expect(result.orderId).toBe('order_456');
      expect(result.paymentIntentId).toBe('pi_test');
      expect(result.amount).toBe(5000);
      expect(result.status).toBe('paid');
    });

    it('should process payment_intent.payment_failed event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test',
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test',
            object: 'payment_intent',
            metadata: { orderId: 'order_789' },
            amount: 3000,
            last_payment_error: { message: 'Card declined' },
          } as any,
        },
      } as any;

      const result = await processWebhookEvent(event);

      expect(result.type).toBe('payment.failed');
      expect(result.orderId).toBe('order_789');
      expect(result.status).toBe('payment_failed');
      expect(result.data.lastPaymentError).toBe('Card declined');
    });

    it('should process charge.refunded event', async () => {
      const event: Stripe.Event = {
        id: 'evt_test',
        object: 'event',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_test',
            object: 'charge',
            metadata: { orderId: 'order_999' },
            payment_intent: 'pi_test',
            amount_refunded: 2000,
            refunds: {
              data: [{ reason: 'requested_by_customer' }],
            },
          } as any,
        },
      } as any;

      const result = await processWebhookEvent(event);

      expect(result.type).toBe('charge.refunded');
      expect(result.orderId).toBe('order_999');
      expect(result.amount).toBe(2000);
      expect(result.status).toBe('refunded');
      expect(result.data.refundReason).toBe('requested_by_customer');
    });

    it('should handle unknown event types', async () => {
      const event: Stripe.Event = {
        id: 'evt_test',
        object: 'event',
        type: 'customer.created',
        data: { object: {} as any },
      } as any;

      const result = await processWebhookEvent(event);

      expect(result.type).toBe('customer.created');
      expect(result.orderId).toBeNull();
    });

    it('should extract orderId from metadata if client_reference_id is missing', async () => {
      const event: Stripe.Event = {
        id: 'evt_test',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            object: 'checkout.session',
            metadata: { orderId: 'order_from_metadata' },
            payment_intent: 'pi_test',
            amount_total: 5000,
            customer_email: 'test@example.com',
            payment_status: 'paid',
          } as any,
        },
      } as any;

      const result = await processWebhookEvent(event);

      expect(result.orderId).toBe('order_from_metadata');
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent with valid data', async () => {
      const mockIntent = {
        id: 'pi_test_123',
        amount: 9900,
        currency: 'usd',
        metadata: { orderId: 'order_123' },
        client_secret: 'pi_test_secret',
      };

      vi.spyOn(stripe.paymentIntents, 'create').mockResolvedValue(mockIntent as any);

      const intent = await createPaymentIntent('order_123', 9900, 'usd', { test: 'value' });

      expect(intent.id).toBe('pi_test_123');
      expect(intent.amount).toBe(9900);
      expect(intent.metadata.orderId).toBe('order_123');
    });

    it('should throw ValidationError for empty orderId', async () => {
      await expect(createPaymentIntent('', 1000)).rejects.toThrow('Order ID is required');
    });

    it('should throw ValidationError for zero or negative amount', async () => {
      await expect(createPaymentIntent('order_123', 0)).rejects.toThrow(
        'Amount must be greater than zero'
      );
      await expect(createPaymentIntent('order_123', -100)).rejects.toThrow(
        'Amount must be greater than zero'
      );
    });

    it('should use USD as default currency', async () => {
      const createSpy = vi.spyOn(stripe.paymentIntents, 'create').mockResolvedValue({
        id: 'pi_test',
        currency: 'usd',
      } as any);

      await createPaymentIntent('order_123', 5000);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'usd' })
      );
    });

    it('should include additional metadata', async () => {
      const createSpy = vi.spyOn(stripe.paymentIntents, 'create').mockResolvedValue({
        id: 'pi_test',
      } as any);

      await createPaymentIntent('order_123', 5000, 'usd', {
        userId: 'user_456',
        email: 'test@example.com',
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            orderId: 'order_123',
            userId: 'user_456',
            email: 'test@example.com',
          },
        })
      );
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent by ID', async () => {
      const mockIntent = {
        id: 'pi_test_123',
        amount: 5000,
        status: 'succeeded',
      };

      vi.spyOn(stripe.paymentIntents, 'retrieve').mockResolvedValue(mockIntent as any);

      const intent = await getPaymentIntent('pi_test_123');

      expect(intent.id).toBe('pi_test_123');
      expect(intent.status).toBe('succeeded');
    });

    it('should throw ValidationError for empty ID', async () => {
      await expect(getPaymentIntent('')).rejects.toThrow('Payment Intent ID is required');
    });

    it('should throw NotFoundError for non-existent payment intent', async () => {
      const error = new Stripe.errors.StripeError({ message: 'Not found', type: 'invalid_request_error' });
      (error as any).code = 'resource_missing';

      vi.spyOn(stripe.paymentIntents, 'retrieve').mockRejectedValue(error);

      await expect(getPaymentIntent('pi_nonexistent')).rejects.toThrow('Payment Intent');
    });
  });

  describe('createRefund', () => {
    it('should create a full refund', async () => {
      const mockRefund = {
        id: 're_test_123',
        amount: 5000,
        payment_intent: 'pi_test',
        status: 'succeeded',
      };

      vi.spyOn(stripe.refunds, 'create').mockResolvedValue(mockRefund as any);

      const refund = await createRefund('pi_test');

      expect(refund.id).toBe('re_test_123');
      expect(refund.payment_intent).toBe('pi_test');
    });

    it('should create a partial refund with specified amount', async () => {
      const createSpy = vi.spyOn(stripe.refunds, 'create').mockResolvedValue({
        id: 're_test',
        amount: 2500,
      } as any);

      await createRefund('pi_test', 2500);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: 'pi_test',
          amount: 2500,
        })
      );
    });

    it('should include refund reason if provided', async () => {
      const createSpy = vi.spyOn(stripe.refunds, 'create').mockResolvedValue({
        id: 're_test',
      } as any);

      await createRefund('pi_test', undefined, 'requested_by_customer');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'requested_by_customer',
        })
      );
    });

    it('should throw ValidationError for empty payment intent ID', async () => {
      await expect(createRefund('')).rejects.toThrow('Payment Intent ID is required');
    });
  });

  describe('getCheckoutSession', () => {
    it('should retrieve a checkout session by ID', async () => {
      const mockSession = {
        id: 'cs_test_123',
        payment_status: 'paid',
        amount_total: 9900,
      };

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(mockSession as any);

      const session = await getCheckoutSession('cs_test_123');

      expect(session.id).toBe('cs_test_123');
      expect(session.payment_status).toBe('paid');
    });

    it('should throw ValidationError for empty session ID', async () => {
      await expect(getCheckoutSession('')).rejects.toThrow('Session ID is required');
    });

    it('should throw NotFoundError for non-existent session', async () => {
      const error = new Stripe.errors.StripeError({ message: 'Not found', type: 'invalid_request_error' });
      (error as any).code = 'resource_missing';

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockRejectedValue(error);

      await expect(getCheckoutSession('cs_nonexistent')).rejects.toThrow('Checkout Session');
    });
  });

  describe('Error Handling', () => {
    it('should wrap Stripe API errors with descriptive messages', async () => {
      const stripeError = new Stripe.errors.StripeCardError({
        message: 'Your card was declined',
        type: 'card_error',
        code: 'card_declined',
      });

      vi.spyOn(stripe.checkout.sessions, 'create').mockRejectedValue(stripeError);

      const order = {
        items: [{ itemType: 'course', itemTitle: 'Test', price: 1000, quantity: 1 }],
        subtotal: 1000,
        tax: 80,
        total: 1080,
        userEmail: 'test@example.com',
      };

      await expect(
        createCheckoutSession('order_123', order, 'http://success', 'http://cancel')
      ).rejects.toThrow('Stripe error: Your card was declined');
    });

    it('should preserve non-Stripe errors', async () => {
      const customError = new Error('Custom error');

      vi.spyOn(stripe.paymentIntents, 'create').mockRejectedValue(customError);

      await expect(createPaymentIntent('order_123', 1000)).rejects.toThrow('Custom error');
    });
  });

  describe('Integration with Order Service', () => {
    it('should create checkout session compatible with order data structure', async () => {
      // Simulating order data from order service
      const orderData = {
        id: 'order_test_789',
        userId: 'user_123',
        items: [
          {
            itemType: 'course' as const,
            itemId: 'course_1',
            itemTitle: 'Mindfulness Meditation',
            itemSlug: 'mindfulness-meditation',
            price: 4900,
            quantity: 1,
          },
        ],
        subtotal: 4900,
        tax: 392,
        total: 5292,
        status: 'pending' as const,
        userEmail: 'user@example.com',
      };

      const mockSession = {
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
        client_reference_id: orderData.id,
      };

      vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue(mockSession as any);

      const session = await createCheckoutSession(
        orderData.id,
        {
          items: orderData.items.map(item => ({
            itemType: item.itemType,
            itemTitle: item.itemTitle,
            price: item.price,
            quantity: item.quantity,
          })),
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          total: orderData.total,
          userEmail: orderData.userEmail,
        },
        'http://localhost:4321/checkout/success',
        'http://localhost:4321/checkout/cancel'
      );

      expect(session.id).toBe('cs_test');
      expect(session.client_reference_id).toBe(orderData.id);
    });
  });
});
