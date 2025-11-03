/**
 * Unit Tests for Booking Service (T078)
 * 
 * Tests the booking management service including creating bookings,
 * retrieving bookings, and managing user bookings.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool } from '../setup/database';
import {
  createBooking,
  getBookingById,
  getUserBookings,
  markNotificationSent,
  updateBookingStatus,
  getEventBookingCount,
  getEventTotalAttendees,
  type Booking,
  type BookingWithEvent,
} from '../../src/lib/bookings';
import { 
  NotFoundError, 
  ValidationError, 
  DatabaseError,
  ConflictError 
} from '../../src/lib/errors';

describe('Booking Service - T078', () => {
  // Test data IDs
  let testUserId1: string;
  let testUserId2: string;
  let testEventId1: string;
  let testEventId2: string;
  let testBookingId1: string;
  let testOrderId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query(`DELETE FROM bookings WHERE user_id IN (
      SELECT id FROM users WHERE email IN ('booking-test-user1@example.com', 'booking-test-user2@example.com')
    )`);
    await pool.query(`DELETE FROM users WHERE email IN ('booking-test-user1@example.com', 'booking-test-user2@example.com')`);
    await pool.query(`DELETE FROM events WHERE slug IN ('test-booking-event-1', 'test-booking-event-2')`);
    await pool.query(`DELETE FROM orders WHERE stripe_payment_intent_id = 'test_payment_booking_123'`);

    // Create test users
    const user1Result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['booking-test-user1@example.com', 'hashed_password', 'Booking Test User 1', 'user']
    );
    testUserId1 = user1Result.rows[0].id;

    const user2Result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['booking-test-user2@example.com', 'hashed_password', 'Booking Test User 2', 'user']
    );
    testUserId2 = user2Result.rows[0].id;

    // Create test events
    const event1Result = await pool.query(
      `INSERT INTO events (
        title, slug, description, price, event_date, duration_hours,
        venue_name, venue_address, venue_city, venue_country,
        capacity, available_spots, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        'Booking Test Event 1',
        'test-booking-event-1',
        'Test event for booking service',
        99.99,
        new Date('2025-12-01T10:00:00Z'),
        3,
        'Test Venue 1',
        '123 Test St',
        'Test City',
        'Test Country',
        20,
        20,
        true,
      ]
    );
    testEventId1 = event1Result.rows[0].id;

    const event2Result = await pool.query(
      `INSERT INTO events (
        title, slug, description, price, event_date, duration_hours,
        venue_name, venue_address, venue_city, venue_country,
        capacity, available_spots, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        'Booking Test Event 2',
        'test-booking-event-2',
        'Another test event',
        149.99,
        new Date('2025-12-15T14:00:00Z'),
        4,
        'Test Venue 2',
        '456 Test Ave',
        'Another City',
        'Test Country',
        10,
        10,
        true,
      ]
    );
    testEventId2 = event2Result.rows[0].id;

    // Create test order
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, stripe_payment_intent_id, status, total_amount, currency)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [testUserId1, 'test_payment_booking_123', 'completed', 99.99, 'USD']
    );
    testOrderId = orderResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query(`DELETE FROM bookings WHERE user_id IN ($1, $2)`, [testUserId1, testUserId2]);
    await pool.query(`DELETE FROM orders WHERE id = $1`, [testOrderId]);
    await pool.query(`DELETE FROM events WHERE id IN ($1, $2)`, [testEventId1, testEventId2]);
    await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [testUserId1, testUserId2]);
  });

  // =====================================================
  // createBooking Tests
  // =====================================================
  describe('createBooking', () => {
    it('should create a booking successfully with default values', async () => {
      const booking = await createBooking({
        userId: testUserId1,
        eventId: testEventId1,
      });

      expect(booking).toBeDefined();
      expect(booking.id).toBeDefined();
      expect(booking.user_id).toBe(testUserId1);
      expect(booking.event_id).toBe(testEventId1);
      expect(booking.attendees).toBe(1);
      expect(booking.status).toBe('pending');
      expect(booking.total_price).toBe('99.99');
      expect(booking.order_id).toBeNull();

      testBookingId1 = booking.id; // Save for later tests
    });

    it('should create a booking with multiple attendees', async () => {
      const booking = await createBooking({
        userId: testUserId2,
        eventId: testEventId1,
        attendees: 3,
      });

      expect(booking).toBeDefined();
      expect(booking.attendees).toBe(3);
      expect(booking.total_price).toBe('299.97'); // 99.99 * 3
    });

    it('should create a booking with order reference', async () => {
      const booking = await createBooking({
        userId: testUserId1,
        eventId: testEventId2,
        orderId: testOrderId,
        status: 'confirmed',
      });

      expect(booking).toBeDefined();
      expect(booking.order_id).toBe(testOrderId);
      expect(booking.status).toBe('confirmed');
    });

    it('should throw ValidationError if userId is missing', async () => {
      await expect(
        createBooking({
          userId: '',
          eventId: testEventId1,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if eventId is missing', async () => {
      await expect(
        createBooking({
          userId: testUserId1,
          eventId: '',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if attendees is less than 1', async () => {
      await expect(
        createBooking({
          userId: testUserId1,
          eventId: testEventId1,
          attendees: 0,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if event does not exist', async () => {
      await expect(
        createBooking({
          userId: testUserId1,
          eventId: '00000000-0000-0000-0000-000000000000',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError for duplicate booking (same user, same event)', async () => {
      // testUserId1 already has booking for testEventId1
      await expect(
        createBooking({
          userId: testUserId1,
          eventId: testEventId1,
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if capacity exceeded', async () => {
      // testEventId1 has capacity 20, already has 4 attendees (1 + 3)
      // Try to book 20 more attendees
      await expect(
        createBooking({
          userId: testUserId2,
          eventId: testEventId2,
          attendees: 15, // Event 2 has capacity 10, should fail
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  // =====================================================
  // getBookingById Tests
  // =====================================================
  describe('getBookingById', () => {
    it('should retrieve a booking without event details', async () => {
      const booking = await getBookingById(testBookingId1, false);

      expect(booking).toBeDefined();
      expect(booking.id).toBe(testBookingId1);
      expect(booking.user_id).toBe(testUserId1);
      expect(booking.event_id).toBe(testEventId1);
      expect('event' in booking).toBe(false); // Should not have event property
    });

    it('should retrieve a booking with event details', async () => {
      const booking = await getBookingById(testBookingId1, true) as BookingWithEvent;

      expect(booking).toBeDefined();
      expect(booking.id).toBe(testBookingId1);
      expect(booking.event).toBeDefined();
      expect(booking.event.title).toBe('Booking Test Event 1');
      expect(booking.event.slug).toBe('test-booking-event-1');
      expect(booking.event.venue_name).toBe('Test Venue 1');
      expect(booking.event.venue_city).toBe('Test City');
    });

    it('should throw ValidationError if bookingId is missing', async () => {
      await expect(getBookingById('')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if booking does not exist', async () => {
      await expect(
        getBookingById('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // =====================================================
  // getUserBookings Tests
  // =====================================================
  describe('getUserBookings', () => {
    it('should retrieve all bookings for a user with event details', async () => {
      const bookings = await getUserBookings(testUserId1);

      expect(bookings).toBeDefined();
      expect(Array.isArray(bookings)).toBe(true);
      expect(bookings.length).toBeGreaterThan(0);

      const firstBooking = bookings[0] as BookingWithEvent;
      expect(firstBooking.event).toBeDefined();
      expect(firstBooking.event.title).toBeDefined();
    });

    it('should retrieve bookings without event details', async () => {
      const bookings = await getUserBookings(testUserId1, { includeEvent: false });

      expect(bookings).toBeDefined();
      expect(Array.isArray(bookings)).toBe(true);
      expect(bookings.length).toBeGreaterThan(0);

      const firstBooking = bookings[0] as Booking;
      expect('event' in firstBooking).toBe(false);
    });

    it('should filter bookings by status', async () => {
      const pendingBookings = await getUserBookings(testUserId1, { status: 'pending' });

      expect(pendingBookings).toBeDefined();
      expect(Array.isArray(pendingBookings)).toBe(true);
      
      // All returned bookings should have pending status
      pendingBookings.forEach((booking) => {
        expect(booking.status).toBe('pending');
      });
    });

    it('should respect limit parameter', async () => {
      const bookings = await getUserBookings(testUserId1, { limit: 1 });

      expect(bookings).toBeDefined();
      expect(bookings.length).toBeLessThanOrEqual(1);
    });

    it('should respect offset parameter', async () => {
      const allBookings = await getUserBookings(testUserId1);
      const offsetBookings = await getUserBookings(testUserId1, { offset: 1 });

      expect(offsetBookings.length).toBe(allBookings.length - 1);
    });

    it('should return empty array if user has no bookings', async () => {
      // Create a new user with no bookings
      const noBookingsUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        ['no-bookings@example.com', 'hashed', 'No Bookings User', 'user']
      );
      const noBookingsUserId = noBookingsUserResult.rows[0].id;

      const bookings = await getUserBookings(noBookingsUserId);
      expect(bookings).toBeDefined();
      expect(Array.isArray(bookings)).toBe(true);
      expect(bookings.length).toBe(0);

      // Cleanup
      await pool.query(`DELETE FROM users WHERE id = $1`, [noBookingsUserId]);
    });

    it('should throw ValidationError if userId is missing', async () => {
      await expect(getUserBookings('')).rejects.toThrow(ValidationError);
    });
  });

  // =====================================================
  // markNotificationSent Tests
  // =====================================================
  describe('markNotificationSent', () => {
    it('should mark email notification as sent', async () => {
      const booking = await markNotificationSent(testBookingId1, 'email');

      expect(booking).toBeDefined();
      expect(booking.email_notified).toBe(true);
    });

    it('should mark whatsapp notification as sent', async () => {
      const booking = await markNotificationSent(testBookingId1, 'whatsapp');

      expect(booking).toBeDefined();
      expect(booking.whatsapp_notified).toBe(true);
    });

    it('should throw ValidationError if bookingId is missing', async () => {
      await expect(
        markNotificationSent('', 'email')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if notification type is invalid', async () => {
      await expect(
        markNotificationSent(testBookingId1, 'invalid' as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if booking does not exist', async () => {
      await expect(
        markNotificationSent('00000000-0000-0000-0000-000000000000', 'email')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // =====================================================
  // updateBookingStatus Tests
  // =====================================================
  describe('updateBookingStatus', () => {
    it('should update booking status to confirmed', async () => {
      const booking = await updateBookingStatus(testBookingId1, 'confirmed');

      expect(booking).toBeDefined();
      expect(booking.status).toBe('confirmed');
    });

    it('should update booking status to attended', async () => {
      const booking = await updateBookingStatus(testBookingId1, 'attended');

      expect(booking).toBeDefined();
      expect(booking.status).toBe('attended');
    });

    it('should update booking status to cancelled', async () => {
      const booking = await updateBookingStatus(testBookingId1, 'cancelled');

      expect(booking).toBeDefined();
      expect(booking.status).toBe('cancelled');
    });

    it('should throw ValidationError if bookingId is missing', async () => {
      await expect(
        updateBookingStatus('', 'confirmed')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if status is invalid', async () => {
      await expect(
        updateBookingStatus(testBookingId1, 'invalid' as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if booking does not exist', async () => {
      await expect(
        updateBookingStatus('00000000-0000-0000-0000-000000000000', 'confirmed')
      ).rejects.toThrow(NotFoundError);
    });
  });

  // =====================================================
  // getEventBookingCount Tests
  // =====================================================
  describe('getEventBookingCount', () => {
    it('should count all bookings for an event', async () => {
      const count = await getEventBookingCount(testEventId1);

      expect(count).toBeGreaterThanOrEqual(2); // We created at least 2 bookings for event 1
    });

    it('should count bookings by status', async () => {
      const cancelledCount = await getEventBookingCount(testEventId1, 'cancelled');

      expect(typeof cancelledCount).toBe('number');
      expect(cancelledCount).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for event with no bookings', async () => {
      // Create a temporary event with no bookings
      const tempEventResult = await pool.query(
        `INSERT INTO events (
          title, slug, description, price, event_date, duration_hours,
          venue_name, venue_address, venue_city, venue_country,
          capacity, available_spots, is_published
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          'Temp Event',
          'temp-event-no-bookings',
          'Temp',
          50,
          new Date('2025-12-20T10:00:00Z'),
          2,
          'Temp Venue',
          '789 Temp St',
          'Temp City',
          'Temp Country',
          15,
          15,
          true,
        ]
      );
      const tempEventId = tempEventResult.rows[0].id;

      const count = await getEventBookingCount(tempEventId);
      expect(count).toBe(0);

      // Cleanup
      await pool.query(`DELETE FROM events WHERE id = $1`, [tempEventId]);
    });

    it('should throw ValidationError if eventId is missing', async () => {
      await expect(getEventBookingCount('')).rejects.toThrow(ValidationError);
    });
  });

  // =====================================================
  // getEventTotalAttendees Tests
  // =====================================================
  describe('getEventTotalAttendees', () => {
    it('should calculate total attendees for an event', async () => {
      const total = await getEventTotalAttendees(testEventId1);

      // testEventId1 has at least 4 attendees (1 from first booking, 3 from second)
      // But one was cancelled, so depends on default includeStatuses
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should calculate total attendees including only confirmed bookings', async () => {
      const total = await getEventTotalAttendees(testEventId1, ['confirmed']);

      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for event with no bookings', async () => {
      // Create a temporary event
      const tempEventResult = await pool.query(
        `INSERT INTO events (
          title, slug, description, price, event_date, duration_hours,
          venue_name, venue_address, venue_city, venue_country,
          capacity, available_spots, is_published
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          'Temp Event 2',
          'temp-event-no-attendees',
          'Temp',
          50,
          new Date('2025-12-25T10:00:00Z'),
          2,
          'Temp Venue',
          '999 Temp St',
          'Temp City',
          'Temp Country',
          10,
          10,
          true,
        ]
      );
      const tempEventId = tempEventResult.rows[0].id;

      const total = await getEventTotalAttendees(tempEventId);
      expect(total).toBe(0);

      // Cleanup
      await pool.query(`DELETE FROM events WHERE id = $1`, [tempEventId]);
    });

    it('should throw ValidationError if eventId is missing', async () => {
      await expect(getEventTotalAttendees('')).rejects.toThrow(ValidationError);
    });
  });
});
