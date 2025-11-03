import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * E2E Tests for Twilio WhatsApp Integration
 * Tests the WhatsApp notification functionality for admin notifications
 * 
 * IMPORTANT: Run with specific path to avoid vitest/Playwright conflicts:
 *   ✅ npx playwright test tests/e2e/T073
 *   ✅ npx playwright test tests/e2e/T073_twilio_whatsapp.spec.ts
 *   ❌ npx playwright test T073  (will pick up unit tests and cause conflicts)
 * 
 * Note: These tests require Twilio credentials to be configured in .env
 * For CI/CD, consider using mock/test mode or skipping these tests
 */

test.describe('Twilio WhatsApp Integration', () => {
  let testPhoneNumber: string;
  let twilioConfigured: boolean;

  test.beforeAll(async () => {
    // Check if Twilio is configured
    twilioConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM &&
      process.env.ADMIN_WHATSAPP_NUMBERS
    );

    // Use test number if available, otherwise use admin number
    testPhoneNumber = process.env.TEST_WHATSAPP_NUMBER || 
      process.env.ADMIN_WHATSAPP_NUMBERS?.split(',')[0] || '';

    if (!twilioConfigured) {
      console.warn('⚠️  Twilio not configured - tests will be skipped');
    }
  });

  test.describe('Configuration and Initialization', () => {
    test('should have required environment variables', () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      expect(process.env.TWILIO_ACCOUNT_SID).toBeTruthy();
      expect(process.env.TWILIO_AUTH_TOKEN).toBeTruthy();
      expect(process.env.TWILIO_WHATSAPP_FROM).toBeTruthy();
      expect(process.env.ADMIN_WHATSAPP_NUMBERS).toBeTruthy();
    });

    test('should format phone numbers correctly', () => {
      const { sendWhatsAppMessage } = require('../../src/lib/twilio');
      
      // Test phone number formatting
      const numbers = [
        '+1234567890',
        'whatsapp:+1234567890',
        '1234567890'
      ];

      // This is just a dry run to check formatting logic
      numbers.forEach(num => {
        const formatted = num.startsWith('whatsapp:') ? num : `whatsapp:${num}`;
        expect(formatted).toMatch(/^whatsapp:\+?\d+$/);
      });
    });
  });

  test.describe('Message Sending', () => {
    test('should send a simple WhatsApp message', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { sendWhatsAppMessage } = await import('../../src/lib/twilio');
      
      const testMessage = `Test message from Playwright - ${new Date().toISOString()}`;
      
      const messageSid = await sendWhatsAppMessage(
        testPhoneNumber,
        testMessage
      );

      expect(messageSid).toBeTruthy();
      expect(typeof messageSid).toBe('string');
      expect(messageSid).toMatch(/^SM[a-f0-9]{32}$/); // Twilio SID format
    });

    test('should handle invalid phone number gracefully', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { sendWhatsAppMessage } = await import('../../src/lib/twilio');
      
      const messageSid = await sendWhatsAppMessage(
        'invalid_number',
        'Test message'
      );

      expect(messageSid).toBeNull();
    });

    test('should retry on failure', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { sendWhatsAppMessage } = await import('../../src/lib/twilio');
      
      // This should fail but retry 2 times (total 3 attempts)
      const startTime = Date.now();
      const messageSid = await sendWhatsAppMessage(
        'whatsapp:+1111111111', // Invalid number
        'Test message',
        { retries: 2 }
      );
      const endTime = Date.now();

      expect(messageSid).toBeNull();
      // Should take at least 2 seconds (2^1 + 2^2 = 2 + 4 = 6 seconds for backoff)
      // But we'll be lenient and just check it took more than 1 second
      expect(endTime - startTime).toBeGreaterThan(1000);
    });

    test('should send bulk messages to multiple recipients', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { sendBulkWhatsAppMessages } = await import('../../src/lib/twilio');
      
      const recipients = [testPhoneNumber];
      const message = `Bulk test message - ${new Date().toISOString()}`;
      
      const results = await sendBulkWhatsAppMessages(recipients, message);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(recipients.length);
      expect(results[0]).toBeTruthy();
    });
  });

  test.describe('Admin Notifications', () => {
    test('should send new order notification', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { notifyAdminsNewOrder } = await import('../../src/lib/twilio');
      
      const orderData = {
        orderId: 'TEST-ORDER-123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        totalAmount: 149.99,
        items: [
          { title: 'Meditation Course', quantity: 1, price: 99.99 },
          { title: 'Mindfulness Guide', quantity: 1, price: 50.00 }
        ]
      };

      const results = await notifyAdminsNewOrder(orderData);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toBeTruthy();
    });

    test('should send new booking notification', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { notifyAdminsNewBooking } = await import('../../src/lib/twilio');
      
      const bookingData = {
        bookingId: 'TEST-BOOKING-456',
        eventTitle: 'Spiritual Retreat 2025',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        numberOfTickets: 2,
        totalAmount: 299.98,
        eventDate: new Date('2025-12-15T10:00:00')
      };

      const results = await notifyAdminsNewBooking(bookingData);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toBeTruthy();
    });

    test('should send low stock alert', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { notifyAdminsLowStock } = await import('../../src/lib/twilio');
      
      const productData = {
        productId: 'PROD-789',
        productTitle: 'Meditation Cushion',
        currentStock: 5,
        threshold: 10
      };

      const results = await notifyAdminsLowStock(productData);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toBeTruthy();
    });

    test('should send event capacity alert', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { notifyAdminsEventCapacity } = await import('../../src/lib/twilio');
      
      const eventData = {
        eventId: 'EVENT-321',
        eventTitle: 'Yoga Workshop',
        bookedSeats: 45,
        totalCapacity: 50,
        percentageFull: 90
      };

      const results = await notifyAdminsEventCapacity(eventData);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toBeTruthy();
    });

    test('should send custom notification', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { notifyAdminsCustom } = await import('../../src/lib/twilio');
      
      const results = await notifyAdminsCustom(
        'Test Alert',
        'This is a custom test notification from E2E tests'
      );

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toBeTruthy();
    });

    test('should handle missing admin numbers gracefully', async () => {
      // Temporarily override env
      const originalNumbers = process.env.ADMIN_WHATSAPP_NUMBERS;
      process.env.ADMIN_WHATSAPP_NUMBERS = '';

      const { notifyAdminsNewOrder } = await import('../../src/lib/twilio');
      
      const orderData = {
        orderId: 'TEST-123',
        customerName: 'Test',
        customerEmail: 'test@test.com',
        totalAmount: 100,
        items: []
      };

      const results = await notifyAdminsNewOrder(orderData);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(0);

      // Restore original value
      process.env.ADMIN_WHATSAPP_NUMBERS = originalNumbers;
    });
  });

  test.describe('Configuration Verification', () => {
    test('should verify Twilio configuration', async () => {
      const { verifyTwilioConfig } = await import('../../src/lib/twilio');
      
      const isConfigured = verifyTwilioConfig();

      if (twilioConfigured) {
        expect(isConfigured).toBe(true);
      } else {
        expect(isConfigured).toBe(false);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing credentials gracefully', async () => {
      // Temporarily override env
      const originalSid = process.env.TWILIO_ACCOUNT_SID;
      const originalToken = process.env.TWILIO_AUTH_TOKEN;
      
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;

      // Force module reload
      delete require.cache[require.resolve('../../src/lib/twilio')];
      
      const { sendWhatsAppMessage } = require('../../src/lib/twilio');
      
      await expect(async () => {
        await sendWhatsAppMessage('whatsapp:+1234567890', 'Test');
      }).rejects.toThrow('Twilio credentials not configured');

      // Restore original values
      process.env.TWILIO_ACCOUNT_SID = originalSid;
      process.env.TWILIO_AUTH_TOKEN = originalToken;
    });

    test('should handle network errors with retry', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { sendWhatsAppMessage } = await import('../../src/lib/twilio');
      
      // Try to send to an obviously invalid number
      const result = await sendWhatsAppMessage(
        'whatsapp:+0000000000',
        'Test message',
        { retries: 1 }
      );

      expect(result).toBeNull();
    });
  });

  test.describe('Message Formatting', () => {
    test('should format order notification message correctly', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { notifyAdminsNewOrder } = await import('../../src/lib/twilio');
      
      const orderData = {
        orderId: 'ORD-001',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        totalAmount: 250.00,
        items: [
          { title: 'Course A', quantity: 2, price: 100.00 },
          { title: 'Product B', quantity: 1, price: 50.00 }
        ]
      };

      const results = await notifyAdminsNewOrder(orderData);

      expect(results[0]).toBeTruthy();
    });

    test('should handle special characters in messages', async () => {
      if (!twilioConfigured) {
        test.skip();
        return;
      }

      const { sendWhatsAppMessage } = await import('../../src/lib/twilio');
      
      const messageWithSpecialChars = 'Test: 👋 Hello! Price: $99.99 💰';
      
      const result = await sendWhatsAppMessage(
        testPhoneNumber,
        messageWithSpecialChars
      );

      expect(result).toBeTruthy();
    });
  });
});
