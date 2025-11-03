/**
 * T047: Stripe Webhook Handler Tests
 * 
 * Tests the POST /api/checkout/webhook endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type Stripe from 'stripe';

// Mock dependencies
vi.mock('@/lib/stripe', () => ({
  validateWebhook: vi.fn(),
  processWebhookEvent: vi.fn(),
  getCheckoutSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getPool: vi.fn(() => ({
    query: vi.fn(),
  })),
}));

vi.mock('@/services/cart.service', () => ({
  clearCart: vi.fn(),
}));

vi.mock('@/lib/whatsapp', () => ({
  sendOrderNotifications: vi.fn(),
}));

import { validateWebhook, processWebhookEvent, getCheckoutSession } from '@/lib/stripe';
import { getPool } from '@/lib/db';
import { clearCart } from '@/services/cart.service';
import { sendOrderNotifications } from '@/lib/whatsapp';
import { POST } from '../../src/pages/api/checkout/webhook';

describe('Webhook Handler - T047', () => {
  let mockRequest: Request;
  const mockOrderId = 'order-uuid-123';
  const mockUserId = 'user-uuid-456';
  const mockSessionId = 'cs_test_abc123';
  const mockPaymentIntentId = 'pi_test_789';

  // Mock Stripe event
  const mockCheckoutCompletedEvent: Stripe.Event = {
    id: 'evt_test_123',
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: Date.now() / 1000,
    type: 'checkout.session.completed',
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id: mockSessionId,
        object: 'checkout.session',
        customer_email: 'test@example.com',
        client_reference_id: mockOrderId,
        payment_intent: mockPaymentIntentId,
      } as any,
    },
  };

  const mockStripeSession = {
    id: mockSessionId,
    customer_email: 'test@example.com',
    client_reference_id: mockOrderId,
    payment_intent: mockPaymentIntentId,
  };

  const mockOrder = {
    id: mockOrderId,
    user_id: mockUserId,
    total_amount: 85.32,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const mockOrderItems = [
    {
      id: 'item-1',
      item_type: 'course',
      title: 'Meditation Course',
      price: 49.00,
      quantity: 1,
      course_id: 'course-uuid-1',
      digital_product_id: null,
    },
    {
      id: 'item-2',
      item_type: 'digital_product',
      title: 'Guided Meditation MP3',
      price: 15.00,
      quantity: 2,
      course_id: null,
      digital_product_id: 'product-uuid-1',
    },
  ];

  const mockUser = {
    name: 'John Doe',
    email: 'test@example.com',
    phone: '+15555550123',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    (validateWebhook as any).mockReturnValue(mockCheckoutCompletedEvent);
    (processWebhookEvent as any).mockResolvedValue({
      type: 'checkout.completed',
      orderId: mockOrderId,
      paymentIntentId: mockPaymentIntentId,
      amount: 8532,
      status: 'paid',
      data: {
        customerEmail: 'test@example.com',
        paymentStatus: 'paid',
      },
    });
    (getCheckoutSession as any).mockResolvedValue(mockStripeSession);

    const mockPool = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [mockOrder] }) // Get order
        .mockResolvedValueOnce({ rows: [] }) // Update order
        .mockResolvedValueOnce({ rows: mockOrderItems }) // Get order items
        .mockResolvedValueOnce({ rows: [mockUser] }) // Get user
        .mockResolvedValue({ rows: [] }), // Other queries
    };
    (getPool as any).mockReturnValue(mockPool);

    (clearCart as any).mockResolvedValue(undefined);
    (sendOrderNotifications as any).mockResolvedValue({
      email: { success: true, messageId: 'email-123' },
      whatsapp: { success: true, messageId: 'whatsapp-456' },
      adminWhatsapp: { success: true, messageId: 'admin-789' },
    });

    process.env.BASE_URL = 'http://localhost:4321';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Webhook Processing', () => {
    it('should process checkout.session.completed event successfully', async () => {
      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Order completed successfully');
      expect(data.orderId).toBe(mockOrderId);
    });

    it('should verify webhook signature', async () => {
      const mockSignature = 't=timestamp,v1=signature';
      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': mockSignature,
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      await POST({ request: mockRequest } as any);

      expect(validateWebhook).toHaveBeenCalledWith(
        expect.any(String),
        mockSignature
      );
    });

    it('should update order status to completed', async () => {
      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const mockPool = getPool();
      await POST({ request: mockRequest } as any);

      // Check for UPDATE orders query
      const updateCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
        call[0].includes('UPDATE orders') && call[0].includes("status = 'completed'")
      );

      expect(updateCalls.length).toBeGreaterThan(0);
      expect(updateCalls[0][1]).toContain(mockOrderId);
    });

    it('should grant course access to user', async () => {
      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const mockPool = getPool();
      await POST({ request: mockRequest } as any);

      // Check for INSERT into course_enrollments
      const enrollmentCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
        call[0].includes('INSERT INTO course_enrollments')
      );

      expect(enrollmentCalls.length).toBeGreaterThan(0);
    });

    it('should update booking status to confirmed', async () => {
      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const mockPool = getPool();
      await POST({ request: mockRequest } as any);

      // Check for UPDATE bookings query
      const bookingCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
        call[0].includes('UPDATE bookings') && call[0].includes("status = 'confirmed'")
      );

      expect(bookingCalls.length).toBeGreaterThan(0);
    });

    it('should send email and WhatsApp notifications', async () => {
      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      await POST({ request: mockRequest } as any);

      expect(sendOrderNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: mockOrderId,
          customerName: mockUser.name,
          customerEmail: mockUser.email,
          items: expect.any(Array),
        }),
        expect.objectContaining({
          customerPhone: mockUser.phone,
          dashboardUrl: expect.stringContaining('/dashboard/orders/'),
        })
      );
    });

    it('should clear customer cart', async () => {
      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      await POST({ request: mockRequest } as any);

      expect(clearCart).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle already completed orders gracefully', async () => {
      const completedOrder = { ...mockOrder, status: 'completed' };
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [completedOrder] }),
      };
      (getPool as any).mockReturnValue(mockPool);

      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Order already processed');
    });

    it('should continue processing even if notifications fail', async () => {
      (sendOrderNotifications as any).mockRejectedValue(new Error('Notification service down'));

      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      // Should still succeed
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should continue processing even if cart clear fails', async () => {
      (clearCart as any).mockRejectedValue(new Error('Cart service error'));

      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      // Should still succeed
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Validation & Error Handling', () => {
    it('should return 400 if stripe-signature header is missing', async () => {
      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing Stripe signature');
    });

    it('should return 400 if signature verification fails', async () => {
      (validateWebhook as any).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid-signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid signature');
    });

    it('should return 400 if orderId is missing from event', async () => {
      (processWebhookEvent as any).mockResolvedValue({
        type: 'checkout.completed',
        orderId: null,
        paymentIntentId: mockPaymentIntentId,
      });

      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Order ID not found');
    });

    it('should return 404 if order not found in database', async () => {
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      (getPool as any).mockReturnValue(mockPool);

      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Order not found');
    });

    it('should return 500 if database error occurs', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      (getPool as any).mockReturnValue(mockPool);

      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify(mockCheckoutCompletedEvent),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Webhook processing failed');
    });
  });

  describe('Other Webhook Events', () => {
    it('should handle payment_intent.succeeded event', async () => {
      (processWebhookEvent as any).mockResolvedValue({
        type: 'payment.succeeded',
        orderId: mockOrderId,
        paymentIntentId: mockPaymentIntentId,
      });

      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify({
          ...mockCheckoutCompletedEvent,
          type: 'payment_intent.succeeded',
        }),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Payment confirmed');
    });

    it('should handle payment_intent.payment_failed event', async () => {
      (processWebhookEvent as any).mockResolvedValue({
        type: 'payment.failed',
        orderId: mockOrderId,
        paymentIntentId: mockPaymentIntentId,
      });

      const mockPool = getPool();
      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify({
          ...mockCheckoutCompletedEvent,
          type: 'payment_intent.payment_failed',
        }),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Check for payment_failed status update
      const updateCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
        call[0].includes("status = 'payment_failed'")
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it('should handle charge.refunded event', async () => {
      (processWebhookEvent as any).mockResolvedValue({
        type: 'charge.refunded',
        orderId: mockOrderId,
        paymentIntentId: mockPaymentIntentId,
      });

      const mockPool = getPool();
      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify({
          ...mockCheckoutCompletedEvent,
          type: 'charge.refunded',
        }),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Refund processed');

      // Check for refunded status update
      const updateCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
        call[0].includes("status = 'refunded'")
      );
      expect(updateCalls.length).toBeGreaterThan(0);

      // Check for course enrollment deletion
      const deleteCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
        call[0].includes('DELETE FROM course_enrollments')
      );
      expect(deleteCalls.length).toBeGreaterThan(0);

      // Check for booking cancellation
      const cancelCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
        call[0].includes('UPDATE bookings') && call[0].includes("status = 'cancelled'")
      );
      expect(cancelCalls.length).toBeGreaterThan(0);
    });

    it('should handle unknown event types gracefully', async () => {
      (processWebhookEvent as any).mockResolvedValue({
        type: 'customer.created',
        orderId: null,
      });

      mockRequest = new Request('http://localhost/api/checkout/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=timestamp,v1=signature',
        },
        body: JSON.stringify({
          ...mockCheckoutCompletedEvent,
          type: 'customer.created',
        }),
      });

      const response = await POST({ request: mockRequest } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Event received');
    });
  });
});
