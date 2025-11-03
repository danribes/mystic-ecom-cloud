/**
 * T046: Stripe Checkout Session API Endpoint Tests
 * 
 * Tests the POST /api/checkout/create-session endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Cart } from '@/types';

// Mock dependencies
vi.mock('@/services/cart.service', () => ({
  getCart: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  createCheckoutSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getPool: vi.fn(() => ({
    query: vi.fn(),
  })),
}));

import { getCart } from '@/services/cart.service';
import { createCheckoutSession } from '@/lib/stripe';
import { getPool } from '@/lib/db';
import { POST } from '../../src/pages/api/checkout/create-session';

describe('Checkout Session API - T046', () => {
  let mockRequest: Request;
  let mockCookies: any;
  const mockSessionId = 'test-session-123';
  const mockUserId = 'user-uuid-456';
  const mockUserEmail = 'test@example.com';

  // Mock cart data
  const mockCart: Cart = {
    userId: mockSessionId,
    items: [
      {
        itemId: 'course-1',
        itemType: 'course',
        itemTitle: 'Meditation Course',
        itemSlug: 'meditation-course',
        price: 4900, // $49.00 in cents
        quantity: 1,
      },
      {
        itemId: 'product-1',
        itemType: 'digital_product',
        itemTitle: 'Guided Meditation MP3',
        itemSlug: 'guided-meditation-mp3',
        price: 1500, // $15.00 in cents
        quantity: 2,
      },
    ],
    subtotal: 7900, // $79.00 in cents
    tax: 632, // 8% tax in cents
    total: 8532, // $85.32 in cents
    itemCount: 3,
    updatedAt: new Date(),
  };

  // Mock Stripe session response
  const mockStripeSession = {
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/pay/cs_test_123',
    payment_intent: 'pi_test_456',
    customer_email: mockUserEmail,
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    (getCart as any).mockResolvedValue(mockCart);
    (createCheckoutSession as any).mockResolvedValue(mockStripeSession);

    const mockPool = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'order-uuid-789' }] }) // INSERT order
        .mockResolvedValue({ rows: [] }), // INSERT order_items
    };
    (getPool as any).mockReturnValue(mockPool);

    // Setup mock cookies
    mockCookies = {
      get: vi.fn((name: string) => {
        if (name === 'session_id') {
          return { value: mockSessionId };
        }
        return undefined;
      }),
      set: vi.fn(),
    };

    // Setup environment
    process.env.BASE_URL = 'http://localhost:4321';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful Checkout Session Creation', () => {
    it('should create checkout session with valid cart and email', async () => {
      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      const response = await POST({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessionId).toBe(mockStripeSession.id);
      expect(data.sessionUrl).toBe(mockStripeSession.url);
      expect(data.orderId).toBeDefined();
      expect(data.message).toBe('Checkout session created successfully');
    });

    it('should get cart from session ID', async () => {
      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      await POST({ request: mockRequest, cookies: mockCookies } as any);

      expect(getCart).toHaveBeenCalledWith(mockSessionId);
    });

    it('should create order in database with correct data', async () => {
      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      const mockPool = getPool();
      await POST({ request: mockRequest, cookies: mockCookies } as any);

      // Check order insertion
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO orders'),
        expect.arrayContaining([
          mockUserId,
          'pending',
          expect.any(Number), // total_amount
          'USD',
        ])
      );
    });

    it('should create order items for each cart item', async () => {
      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      const mockPool = getPool();
      await POST({ request: mockRequest, cookies: mockCookies } as any);

      // Should insert order items (called after order insert)
      const orderItemCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
        call[0].includes('INSERT INTO order_items')
      );
      
      expect(orderItemCalls.length).toBeGreaterThan(0);
    });

    it('should call Stripe with correct session parameters', async () => {
      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      await POST({ request: mockRequest, cookies: mockCookies } as any);

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.any(String), // orderId
        expect.objectContaining({
          items: expect.any(Array),
          subtotal: mockCart.subtotal,
          tax: mockCart.tax,
          total: mockCart.total,
          userEmail: mockUserEmail,
        }),
        expect.stringContaining('success'), // successUrl
        expect.stringContaining('cancel') // cancelUrl
      );
    });

    it('should use custom success and cancel URLs if provided', async () => {
      const customSuccessUrl = 'https://example.com/success';
      const customCancelUrl = 'https://example.com/cancel';

      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
          successUrl: customSuccessUrl,
          cancelUrl: customCancelUrl,
        }),
      });

      await POST({ request: mockRequest, cookies: mockCookies } as any);

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        customSuccessUrl,
        customCancelUrl
      );
    });

    it('should handle guest checkout (userId null)', async () => {
      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          // No userId provided
        }),
      });

      const response = await POST({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should update order with Stripe payment intent ID', async () => {
      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      const mockPool = getPool();
      await POST({ request: mockRequest, cookies: mockCookies } as any);

      // Check payment intent update
      const updateCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
        call[0].includes('UPDATE orders')
      );

      expect(updateCalls.length).toBeGreaterThan(0);
      expect(updateCalls[0][1]).toContain(mockStripeSession.payment_intent);
    });
  });

  describe('Validation & Error Handling', () => {
    it('should return 401 if no session cookie', async () => {
      mockCookies.get = vi.fn(() => undefined);

      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
        }),
      });

      const response = await POST({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No active session');
    });

    it('should return 400 if cart is empty', async () => {
      (getCart as any).mockResolvedValue({
        ...mockCart,
        items: [],
      });

      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
        }),
      });

      const response = await POST({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Cart is empty');
    });

    it('should return 400 if email is missing', async () => {
      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: mockUserId,
          // No email
        }),
      });

      const response = await POST({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Email is required');
    });

    it('should return 400 if email format is invalid', async () => {
      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: 'invalid-email',
          userId: mockUserId,
        }),
      });

      const response = await POST({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid email format');
    });

    it('should handle malformed JSON request body', async () => {
      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await POST({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle Stripe API errors', async () => {
      (createCheckoutSession as any).mockRejectedValue(
        new Error('Stripe error: Invalid API key')
      );

      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      const response = await POST({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Payment system error');
    });

    it('should handle cart not found error', async () => {
      (getCart as any).mockRejectedValue(new Error('Cart not found'));

      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      const response = await POST({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Cart not found');
    });

    it('should handle database errors', async () => {
      const mockPool = {
        query: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      (getPool as any).mockReturnValue(mockPool);

      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      const response = await POST({ request: mockRequest, cookies: mockCookies } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to create checkout session');
    });
  });

  describe('Event Booking Integration', () => {
    it('should create booking records for event items', async () => {
      const cartWithEvent: Cart = {
        ...mockCart,
        items: [
          {
            itemId: 'event-1',
            itemType: 'event',
            itemTitle: 'Meditation Workshop',
            itemSlug: 'meditation-workshop',
            price: 5000, // $50.00
            quantity: 2, // 2 attendees
          },
        ],
      };

      (getCart as any).mockResolvedValue(cartWithEvent);

      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      const mockPool = getPool();
      await POST({ request: mockRequest, cookies: mockCookies } as any);

      // Check for booking insertion
      const bookingCalls = (mockPool.query as any).mock.calls.filter((call: any) =>
        call[0].includes('INSERT INTO bookings')
      );

      expect(bookingCalls.length).toBeGreaterThan(0);
    });
  });

  describe('URL Configuration', () => {
    it('should use BASE_URL from environment', async () => {
      process.env.BASE_URL = 'https://production.com';

      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      await POST({ request: mockRequest, cookies: mockCookies } as any);

      const callArgs = (createCheckoutSession as any).mock.calls[0];
      expect(callArgs[2]).toContain('https://production.com');
      expect(callArgs[3]).toContain('https://production.com');
    });

    it('should default to localhost if BASE_URL not set', async () => {
      delete process.env.BASE_URL;

      mockRequest = new Request('http://localhost/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: mockUserEmail,
          userId: mockUserId,
        }),
      });

      await POST({ request: mockRequest, cookies: mockCookies } as any);

      const callArgs = (createCheckoutSession as any).mock.calls[0];
      expect(callArgs[2]).toContain('http://localhost:4321');
      expect(callArgs[3]).toContain('http://localhost:4321');
    });
  });
});
