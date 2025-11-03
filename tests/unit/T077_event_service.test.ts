/**
 * T077 Event Service Tests
 * 
 * Unit tests for event service functions including getEvents, getEventById,
 * checkCapacity, bookEvent, and cancelBooking.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { pool } from '../setup/database';
import {
  getEvents,
  getEventById,
  checkCapacity,
  bookEvent,
  cancelBooking,
  getUpcomingEvents,
  getEventsByCity,
  searchEvents,
  type Event,
} from '../../src/lib/events';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../../src/lib/errors';

// Test data IDs
let testUserId: string;
let testEventId: string;
let testEvent2Id: string;
let testEvent3Id: string;

describe('T077 - Event Service', () => {
  beforeAll(async () => {
    // Clean up any existing test data first
    await pool.query(
      `DELETE FROM users WHERE email IN ($1, $2)`,
      ['event-service-test@example.com', 'event-test-user2@example.com']
    );
    await pool.query(
      `DELETE FROM events WHERE slug IN ($1, $2, $3)`,
      ['meditation-retreat-bali-test', 'yoga-workshop-nyc-test', 'private-event-test']
    );

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, name, role, email_verified, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['event-service-test@example.com', 'Event Test User', 'user', true, '$2a$10$test.hash.for.unit.tests.only']
    );
    testUserId = userResult.rows[0].id;

    // Create test events
    const event1Result = await pool.query(
      `INSERT INTO events (
        title, slug, description, price, event_date, duration_hours,
        venue_name, venue_address, venue_city, venue_country,
        venue_lat, venue_lng, capacity, available_spots, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id`,
      [
        'Meditation Retreat Bali',
        'meditation-retreat-bali-test',
        'A peaceful meditation retreat in Bali',
        299.99,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        3,
        'Serenity Center',
        '123 Peace Road',
        'Ubud',
        'Indonesia',
        -8.5069,
        115.2625,
        20,
        20,
        true,
      ]
    );
    testEventId = event1Result.rows[0].id;

    // Create second test event (different city)
    const event2Result = await pool.query(
      `INSERT INTO events (
        title, slug, description, price, event_date, duration_hours,
        venue_name, venue_address, venue_city, venue_country,
        capacity, available_spots, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        'Yoga Workshop NYC',
        'yoga-workshop-nyc-test',
        'Advanced yoga techniques workshop',
        79.99,
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        2,
        'Yoga Studio Downtown',
        '456 Wellness Ave',
        'New York',
        'USA',
        50,
        50,
        true,
      ]
    );
    testEvent2Id = event2Result.rows[0].id;

    // Create third test event (unpublished)
    const event3Result = await pool.query(
      `INSERT INTO events (
        title, slug, description, price, event_date, duration_hours,
        venue_name, venue_address, venue_city, venue_country,
        capacity, available_spots, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        'Private Event Test',
        'private-event-test',
        'This is a private event',
        199.99,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
        4,
        'Private Venue',
        '789 Secret St',
        'London',
        'UK',
        10,
        10,
        false, // Not published
      ]
    );
    testEvent3Id = event3Result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM bookings WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM events WHERE id = ANY($1)', [
      [testEventId, testEvent2Id, testEvent3Id],
    ]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    // Don't close shared pool
  });

  describe('getEvents', () => {
    it('should return all published events by default', async () => {
      const events = await getEvents();

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThanOrEqual(2);

      // Should include published events
      const eventIds = events.map((e) => e.id);
      expect(eventIds).toContain(testEventId);
      expect(eventIds).toContain(testEvent2Id);

      // Should NOT include unpublished event
      expect(eventIds).not.toContain(testEvent3Id);

      // Verify event structure
      const event = events.find((e) => e.id === testEventId);
      expect(event).toBeDefined();
      expect(event?.title).toBe('Meditation Retreat Bali');
      expect(event?.is_published).toBe(true);
    });

    it('should filter events by city', async () => {
      const events = await getEvents({ city: 'Ubud' });

      expect(events.length).toBeGreaterThanOrEqual(1);

      const event = events.find((e) => e.id === testEventId);
      expect(event).toBeDefined();
      expect(event?.venue_city).toBe('Ubud');
    });

    it('should filter events by country', async () => {
      const events = await getEvents({ country: 'USA' });

      expect(events.length).toBeGreaterThanOrEqual(1);

      const event = events.find((e) => e.id === testEvent2Id);
      expect(event).toBeDefined();
      expect(event?.venue_country).toBe('USA');
    });

    it('should filter events by date range', async () => {
      const startDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

      const events = await getEvents({ startDate, endDate });

      // Should include event 1 (7 days from now)
      const eventIds = events.map((e) => e.id);
      expect(eventIds).toContain(testEventId);

      // Should NOT include event 2 (14 days from now - outside range)
      expect(eventIds).not.toContain(testEvent2Id);
    });

    it('should filter events by minimum available spots', async () => {
      const events = await getEvents({ minAvailableSpots: 40 });

      expect(events.length).toBeGreaterThanOrEqual(1);

      // Should include event 2 (50 spots)
      const eventIds = events.map((e) => e.id);
      expect(eventIds).toContain(testEvent2Id);

      // Verify all events have at least 40 spots
      events.forEach((event) => {
        expect(event.available_spots).toBeGreaterThanOrEqual(40);
      });
    });

    it('should return unpublished events when explicitly requested', async () => {
      const events = await getEvents({ isPublished: false });

      const eventIds = events.map((e) => e.id);
      expect(eventIds).toContain(testEvent3Id);
    });

    it('should combine multiple filters', async () => {
      const events = await getEvents({
        city: 'Ubud',
        minAvailableSpots: 10,
        isPublished: true,
      });

      expect(events.length).toBeGreaterThanOrEqual(1);

      const event = events.find((e) => e.id === testEventId);
      expect(event).toBeDefined();
      expect(event?.venue_city).toBe('Ubud');
      expect(event?.available_spots).toBeGreaterThanOrEqual(10);
      expect(event?.is_published).toBe(true);
    });

    it('should return events ordered by date ascending', async () => {
      const events = await getEvents();

      // Check that events are ordered by date
      for (let i = 0; i < events.length - 1; i++) {
        const date1 = new Date(events[i]!.event_date);
        const date2 = new Date(events[i + 1]!.event_date);
        expect(date1.getTime()).toBeLessThanOrEqual(date2.getTime());
      }
    });
  });

  describe('getEventById', () => {
    it('should return event by UUID', async () => {
      const event = await getEventById(testEventId);

      expect(event).toBeDefined();
      expect(event.id).toBe(testEventId);
      expect(event.title).toBe('Meditation Retreat Bali');
      expect(event.slug).toBe('meditation-retreat-bali-test');
    });

    it('should return event by slug', async () => {
      const event = await getEventById('meditation-retreat-bali-test');

      expect(event).toBeDefined();
      expect(event.id).toBe(testEventId);
      expect(event.title).toBe('Meditation Retreat Bali');
    });

    it('should include all event fields', async () => {
      const event = await getEventById(testEventId);

      expect(event.id).toBeDefined();
      expect(event.title).toBeDefined();
      expect(event.slug).toBeDefined();
      expect(event.description).toBeDefined();
      expect(event.price).toBeDefined();
      expect(event.event_date).toBeDefined();
      expect(event.duration_hours).toBeDefined();
      expect(event.venue_name).toBeDefined();
      expect(event.venue_address).toBeDefined();
      expect(event.venue_city).toBeDefined();
      expect(event.venue_country).toBeDefined();
      expect(event.capacity).toBeDefined();
      expect(event.available_spots).toBeDefined();
      expect(event.is_published).toBeDefined();
      expect(event.created_at).toBeDefined();
      expect(event.updated_at).toBeDefined();
    });

    it('should throw NotFoundError for non-existent event ID', async () => {
      await expect(
        getEventById('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-existent slug', async () => {
      await expect(getEventById('non-existent-event-slug')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('checkCapacity', () => {
    it('should return available capacity information', async () => {
      const capacity = await checkCapacity(testEventId, 5);

      expect(capacity).toBeDefined();
      expect(capacity.available).toBe(true);
      expect(capacity.availableSpots).toBe(20);
      expect(capacity.capacity).toBe(20);
    });

    it('should indicate when requested spots exceed available', async () => {
      const capacity = await checkCapacity(testEventId, 25);

      expect(capacity.available).toBe(false);
      expect(capacity.availableSpots).toBe(20);
      expect(capacity.capacity).toBe(20);
    });

    it('should throw ValidationError for invalid spot count', async () => {
      await expect(checkCapacity(testEventId, 0)).rejects.toThrow(
        ValidationError
      );

      await expect(checkCapacity(testEventId, -5)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw NotFoundError for non-existent event', async () => {
      await expect(
        checkCapacity('00000000-0000-0000-0000-000000000000', 5)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('bookEvent', () => {
    beforeEach(async () => {
      // Clean up any existing bookings before each test
      await pool.query('DELETE FROM bookings WHERE user_id = $1', [testUserId]);
      // Reset available spots
      await pool.query(
        'UPDATE events SET available_spots = capacity WHERE id = $1',
        [testEventId]
      );
    });

    it('should successfully book an event', async () => {
      const booking = await bookEvent(testUserId, testEventId, 2);

      expect(booking).toBeDefined();
      expect(booking.bookingId).toBeDefined();
      expect(booking.eventId).toBe(testEventId);
      expect(booking.userId).toBe(testUserId);
      expect(booking.attendees).toBe(2);
      expect(booking.totalPrice).toBe(599.98); // 299.99 * 2
      expect(booking.status).toBe('pending');

      // Verify booking in database
      const bookingResult = await pool.query(
        'SELECT * FROM bookings WHERE id = $1',
        [booking.bookingId]
      );
      expect(bookingResult.rows.length).toBe(1);
      expect(bookingResult.rows[0].attendees).toBe(2);

      // Verify available spots updated
      const eventResult = await pool.query(
        'SELECT available_spots FROM events WHERE id = $1',
        [testEventId]
      );
      expect(eventResult.rows[0].available_spots).toBe(18); // 20 - 2
    });

    it('should book with default 1 attendee', async () => {
      const booking = await bookEvent(testUserId, testEventId);

      expect(booking.attendees).toBe(1);
      expect(booking.totalPrice).toBe(299.99);
    });

    it('should throw ValidationError for missing parameters', async () => {
      await expect(bookEvent('', testEventId, 2)).rejects.toThrow(
        ValidationError
      );

      await expect(bookEvent(testUserId, '', 2)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for invalid attendee count', async () => {
      await expect(bookEvent(testUserId, testEventId, 0)).rejects.toThrow(
        ValidationError
      );

      await expect(bookEvent(testUserId, testEventId, -1)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw NotFoundError for non-existent event', async () => {
      await expect(
        bookEvent(testUserId, '00000000-0000-0000-0000-000000000000', 2)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for unpublished event', async () => {
      await expect(bookEvent(testUserId, testEvent3Id, 2)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ConflictError when exceeding capacity', async () => {
      await expect(bookEvent(testUserId, testEventId, 25)).rejects.toThrow(
        ConflictError
      );
    });

    it('should throw ConflictError for duplicate booking', async () => {
      // First booking should succeed
      await bookEvent(testUserId, testEventId, 2);

      // Second booking should fail
      await expect(bookEvent(testUserId, testEventId, 1)).rejects.toThrow(
        ConflictError
      );
    });

    it('should handle concurrent bookings correctly', async () => {
      // Update event to have only 5 spots
      await pool.query(
        'UPDATE events SET available_spots = 5 WHERE id = $1',
        [testEventId]
      );

      // Create second test user
      const user2Result = await pool.query(
        `INSERT INTO users (email, name, role, email_verified, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        ['event-test-user2@example.com', 'Test User 2', 'user', true, '$2a$10$test.hash.for.unit.tests.only']
      );
      const user2Id = user2Result.rows[0].id;

      try {
        // Try to book simultaneously (one should fail)
        const bookings = await Promise.allSettled([
          bookEvent(testUserId, testEventId, 3),
          bookEvent(user2Id, testEventId, 3),
        ]);

        // One should succeed, one should fail
        const successful = bookings.filter((b) => b.status === 'fulfilled');
        const failed = bookings.filter((b) => b.status === 'rejected');

        expect(successful.length).toBe(1);
        expect(failed.length).toBe(1);

        // Verify final available spots
        const eventResult = await pool.query(
          'SELECT available_spots FROM events WHERE id = $1',
          [testEventId]
        );
        expect(eventResult.rows[0].available_spots).toBe(2); // 5 - 3
      } finally {
        // Clean up second user
        await pool.query('DELETE FROM bookings WHERE user_id = $1', [user2Id]);
        await pool.query('DELETE FROM users WHERE id = $1', [user2Id]);
      }
    });
  });

  describe('cancelBooking', () => {
    let bookingId: string;

    beforeEach(async () => {
      // Clean up and reset
      await pool.query('DELETE FROM bookings WHERE user_id = $1', [testUserId]);
      await pool.query(
        'UPDATE events SET available_spots = capacity WHERE id = $1',
        [testEventId]
      );

      // Create a booking to cancel
      const booking = await bookEvent(testUserId, testEventId, 3);
      bookingId = booking.bookingId;
    });

    it('should successfully cancel a booking', async () => {
      const result = await cancelBooking(bookingId, testUserId);

      expect(result.success).toBe(true);
      expect(result.refundedSpots).toBe(3);

      // Verify booking status updated
      const bookingResult = await pool.query(
        'SELECT status FROM bookings WHERE id = $1',
        [bookingId]
      );
      expect(bookingResult.rows[0].status).toBe('cancelled');

      // Verify spots restored
      const eventResult = await pool.query(
        'SELECT available_spots FROM events WHERE id = $1',
        [testEventId]
      );
      expect(eventResult.rows[0].available_spots).toBe(20); // Restored to full capacity
    });

    it('should throw ValidationError for missing parameters', async () => {
      await expect(cancelBooking('', testUserId)).rejects.toThrow(
        ValidationError
      );

      await expect(cancelBooking(bookingId, '')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw NotFoundError for non-existent booking', async () => {
      await expect(
        cancelBooking('00000000-0000-0000-0000-000000000000', testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when cancelling other user\'s booking', async () => {
      await expect(
        cancelBooking(bookingId, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when cancelling already cancelled booking', async () => {
      // Cancel once
      await cancelBooking(bookingId, testUserId);

      // Try to cancel again
      await expect(cancelBooking(bookingId, testUserId)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return only future published events', async () => {
      const events = await getUpcomingEvents();

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);

      // All events should be in the future
      const now = new Date();
      events.forEach((event) => {
        expect(new Date(event.event_date).getTime()).toBeGreaterThan(
          now.getTime()
        );
        expect(event.is_published).toBe(true);
      });
    });
  });

  describe('getEventsByCity', () => {
    it('should return events for specific city', async () => {
      const events = await getEventsByCity('Ubud');

      expect(events.length).toBeGreaterThanOrEqual(1);

      events.forEach((event) => {
        expect(event.venue_city).toBe('Ubud');
        expect(event.is_published).toBe(true);
      });
    });

    it('should return empty array for city with no events', async () => {
      const events = await getEventsByCity('NonExistentCity123');

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(0);
    });
  });

  describe('searchEvents', () => {
    it('should find events by title', async () => {
      const events = await searchEvents('Meditation');

      expect(events.length).toBeGreaterThanOrEqual(1);

      const event = events.find((e) => e.id === testEventId);
      expect(event).toBeDefined();
    });

    it('should find events by description', async () => {
      const events = await searchEvents('peaceful');

      expect(events.length).toBeGreaterThanOrEqual(1);

      const event = events.find((e) => e.id === testEventId);
      expect(event).toBeDefined();
    });

    it('should find events by city', async () => {
      const events = await searchEvents('Ubud');

      expect(events.length).toBeGreaterThanOrEqual(1);

      const event = events.find((e) => e.id === testEventId);
      expect(event).toBeDefined();
    });

    it('should be case-insensitive', async () => {
      const events = await searchEvents('MEDITATION');

      expect(events.length).toBeGreaterThanOrEqual(1);

      const event = events.find((e) => e.id === testEventId);
      expect(event).toBeDefined();
    });

    it('should return empty array when no matches', async () => {
      const events = await searchEvents('xyznonexistent999');

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(0);
    });
  });
});
