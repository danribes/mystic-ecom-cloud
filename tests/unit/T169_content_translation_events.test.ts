/**
 * T169: Content Translation for Events - Test Suite
 *
 * Tests locale-aware event content retrieval from the database.
 * Verifies that events display correctly in both English and Spanish
 * based on the user's language preference.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getLocalizedEventById,
  getLocalizedEventBySlug,
  getLocalizedEvents,
  type GetLocalizedEventsFilters,
} from '../../src/lib/eventsI18n';
import pool from '../../src/lib/db';

describe('T169: Content Translation for Events', () => {
  // Test event IDs
  let testEventId: string;
  let testEventSlug: string;

  beforeAll(async () => {
    // Insert test event with both English and Spanish content
    const result = await pool.query(`
      INSERT INTO events (
        slug,
        title,
        title_es,
        description,
        description_es,
        long_description,
        long_description_es,
        price,
        event_date,
        duration_hours,
        venue_name,
        venue_name_es,
        venue_address,
        venue_address_es,
        venue_city,
        venue_country,
        capacity,
        available_spots,
        is_published
      ) VALUES (
        'test-event-t169',
        'Test Event for T169',
        'Evento de Prueba para T169',
        'This is a test event for T169',
        'Este es un evento de prueba para T169',
        'Long description in English',
        'Descripción larga en español',
        99.00,
        '2025-06-15 10:00:00',
        2,
        'Test Venue',
        'Lugar de Prueba',
        '123 Test Street',
        'Calle de Prueba 123',
        'TestCity',
        'TestCountry',
        100,
        50,
        true
      )
      RETURNING id, slug
    `);

    testEventId = result.rows[0].id;
    testEventSlug = result.rows[0].slug;
  });

  afterAll(async () => {
    // Clean up test data
    if (testEventId) {
      await pool.query('DELETE FROM events WHERE id = $1', [testEventId]);
    }
    await pool.end();
  });

  describe('getLocalizedEventById', () => {
    it('should return event with English content when locale is "en"', async () => {
      const event = await getLocalizedEventById(testEventId, 'en');

      expect(event).not.toBeNull();
      expect(event?.id).toBe(testEventId);
      expect(event?.title).toBe('Test Event for T169');
      expect(event?.description).toBe('This is a test event for T169');
      expect(event?.longDescription).toBe('Long description in English');
      expect(event?.venueName).toBe('Test Venue');
      expect(event?.venueAddress).toBe('123 Test Street');
    });

    it('should return event with Spanish content when locale is "es"', async () => {
      const event = await getLocalizedEventById(testEventId, 'es');

      expect(event).not.toBeNull();
      expect(event?.id).toBe(testEventId);
      expect(event?.title).toBe('Evento de Prueba para T169');
      expect(event?.description).toBe('Este es un evento de prueba para T169');
      expect(event?.longDescription).toBe('Descripción larga en español');
      expect(event?.venueName).toBe('Lugar de Prueba');
      expect(event?.venueAddress).toBe('Calle de Prueba 123');
    });

    it('should return null for non-existent event', async () => {
      const event = await getLocalizedEventById('00000000-0000-0000-0000-000000000000', 'en');
      expect(event).toBeNull();
    });

    it('should include booking count stat', async () => {
      const event = await getLocalizedEventById(testEventId, 'en');

      expect(event).not.toBeNull();
      expect(event).toHaveProperty('bookingCount');
      expect(typeof event?.bookingCount).toBe('number');
    });

    it('should fallback to English when Spanish translation is missing', async () => {
      // Insert event with only English content
      const result = await pool.query(`
        INSERT INTO events (
          slug,
          title,
          description,
          price,
          event_date,
          duration_hours,
          venue_name,
          venue_address,
          venue_city,
          venue_country,
          capacity,
          available_spots,
          is_published
        ) VALUES (
          'test-event-no-spanish',
          'English Only Event',
          'This event has no Spanish translation',
          50.00,
          '2025-07-01 14:00:00',
          3,
          'English Venue',
          '456 English St',
          'EnglishCity',
          'EnglishCountry',
          75,
          40,
          true
        )
        RETURNING id
      `);

      const eventId = result.rows[0].id;

      try {
        const event = await getLocalizedEventById(eventId, 'es');

        expect(event).not.toBeNull();
        expect(event?.title).toBe('English Only Event'); // Fallback to English
        expect(event?.description).toBe('This event has no Spanish translation');
        expect(event?.venueName).toBe('English Venue');
      } finally {
        await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
      }
    });
  });

  describe('getLocalizedEventBySlug', () => {
    it('should return event by slug with English content', async () => {
      const event = await getLocalizedEventBySlug(testEventSlug, 'en');

      expect(event).not.toBeNull();
      expect(event?.slug).toBe(testEventSlug);
      expect(event?.title).toBe('Test Event for T169');
      expect(event?.venueName).toBe('Test Venue');
    });

    it('should return event by slug with Spanish content', async () => {
      const event = await getLocalizedEventBySlug(testEventSlug, 'es');

      expect(event).not.toBeNull();
      expect(event?.slug).toBe(testEventSlug);
      expect(event?.title).toBe('Evento de Prueba para T169');
      expect(event?.venueName).toBe('Lugar de Prueba');
    });

    it('should return null for non-existent slug', async () => {
      const event = await getLocalizedEventBySlug('non-existent-slug', 'en');
      expect(event).toBeNull();
    });

    it('should only return published events', async () => {
      // Insert unpublished event
      const result = await pool.query(`
        INSERT INTO events (
          slug,
          title,
          description,
          price,
          event_date,
          duration_hours,
          venue_name,
          venue_address,
          venue_city,
          venue_country,
          capacity,
          available_spots,
          is_published
        ) VALUES (
          'unpublished-event',
          'Unpublished Event',
          'This event is not published',
          25.00,
          '2025-08-01 16:00:00',
          1,
          'Unpublished Venue',
          '789 Unpublished Ave',
          'UnpubCity',
          'UnpubCountry',
          30,
          30,
          false
        )
        RETURNING id
      `);

      const eventId = result.rows[0].id;

      try {
        const event = await getLocalizedEventBySlug('unpublished-event', 'en');
        expect(event).toBeNull(); // Should not return unpublished events
      } finally {
        await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
      }
    });
  });

  describe('getLocalizedEvents', () => {
    it('should return events with English content by default', async () => {
      const result = await getLocalizedEvents({ limit: 10, offset: 0 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
      expect(Array.isArray(result.items)).toBe(true);

      // Check that test event is in results with English content
      const testEvent = result.items.find(e => e.id === testEventId);
      if (testEvent) {
        expect(testEvent.title).toBe('Test Event for T169');
      }
    });

    it('should return events with Spanish content when locale is "es"', async () => {
      const result = await getLocalizedEvents({ limit: 10, offset: 0, locale: 'es' });

      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);

      // Check that test event is in results with Spanish content
      const testEvent = result.items.find(e => e.id === testEventId);
      if (testEvent) {
        expect(testEvent.title).toBe('Evento de Prueba para T169');
      }
    });

    it('should filter by city', async () => {
      const result = await getLocalizedEvents({ city: 'TestCity', limit: 10, offset: 0 });

      expect(result).toHaveProperty('items');
      const testEvent = result.items.find(e => e.id === testEventId);
      if (testEvent) {
        expect(testEvent.venueCity).toBe('TestCity');
      }
    });

    it('should filter by country', async () => {
      const result = await getLocalizedEvents({ country: 'TestCountry', limit: 10, offset: 0 });

      expect(result).toHaveProperty('items');
      const testEvent = result.items.find(e => e.id === testEventId);
      if (testEvent) {
        expect(testEvent.venueCountry).toBe('TestCountry');
      }
    });

    it('should filter by price range', async () => {
      const result = await getLocalizedEvents({ minPrice: 50, maxPrice: 150, limit: 10, offset: 0 });

      expect(result).toHaveProperty('items');
      result.items.forEach(event => {
        expect(event.price).toBeGreaterThanOrEqual(50);
        expect(event.price).toBeLessThanOrEqual(150);
      });
    });

    it('should filter by date range', async () => {
      const result = await getLocalizedEvents({
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-30'),
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveProperty('items');
      const testEvent = result.items.find(e => e.id === testEventId);
      expect(testEvent).toBeDefined();
    });

    it('should search in both English and Spanish fields', async () => {
      const result = await getLocalizedEvents({ search: 'T169', limit: 10, offset: 0 });

      expect(result).toHaveProperty('items');
      const testEvent = result.items.find(e => e.id === testEventId);
      expect(testEvent).toBeDefined();
    });

    it('should search Spanish content when locale is "es"', async () => {
      const result = await getLocalizedEvents({ search: 'Prueba', limit: 10, offset: 0, locale: 'es' });

      expect(result).toHaveProperty('items');
      const testEvent = result.items.find(e => e.id === testEventId);
      expect(testEvent).toBeDefined();
    });

    it('should support pagination with limit and offset', async () => {
      const page1 = await getLocalizedEvents({ limit: 5, offset: 0 });
      const page2 = await getLocalizedEvents({ limit: 5, offset: 5 });

      expect(page1.items).toHaveLength(Math.min(5, page1.total));

      if (page1.total > 5) {
        expect(page2.items.length).toBeGreaterThan(0);
        const page1Ids = page1.items.map(e => e.id);
        const page2Ids = page2.items.map(e => e.id);
        const overlap = page1Ids.filter(id => page2Ids.includes(id));
        expect(overlap).toHaveLength(0);
      }
    });

    it('should indicate if more results are available (hasMore)', async () => {
      const result = await getLocalizedEvents({ limit: 1, offset: 0 });

      expect(result).toHaveProperty('hasMore');
      expect(typeof result.hasMore).toBe('boolean');
    });

    it('should return correct total count', async () => {
      const result = await getLocalizedEvents({ limit: 10, offset: 0 });

      expect(result).toHaveProperty('total');
      expect(typeof result.total).toBe('number');
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Data Integrity', () => {
    it('should return consistent event IDs across locales', async () => {
      const eventEn = await getLocalizedEventById(testEventId, 'en');
      const eventEs = await getLocalizedEventById(testEventId, 'es');

      expect(eventEn?.id).toBe(eventEs?.id);
      expect(eventEn?.slug).toBe(eventEs?.slug);
    });

    it('should return consistent prices across locales', async () => {
      const eventEn = await getLocalizedEventById(testEventId, 'en');
      const eventEs = await getLocalizedEventById(testEventId, 'es');

      expect(eventEn?.price).toBe(eventEs?.price);
    });

    it('should return consistent venue data across locales', async () => {
      const eventEn = await getLocalizedEventById(testEventId, 'en');
      const eventEs = await getLocalizedEventById(testEventId, 'es');

      expect(eventEn?.venueCity).toBe(eventEs?.venueCity);
      expect(eventEn?.venueCountry).toBe(eventEs?.venueCountry);
      expect(eventEn?.capacity).toBe(eventEs?.capacity);
      expect(eventEn?.availableSpots).toBe(eventEs?.availableSpots);
    });

    it('should parse price as float correctly', async () => {
      const event = await getLocalizedEventById(testEventId, 'en');

      expect(event).not.toBeNull();
      expect(typeof event?.price).toBe('number');
      expect(event?.price).toBe(99);
    });

    it('should convert dates correctly', async () => {
      const event = await getLocalizedEventById(testEventId, 'en');

      expect(event).not.toBeNull();
      expect(event?.eventDate).toBeInstanceOf(Date);
      expect(event?.createdAt).toBeInstanceOf(Date);
      expect(event?.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle optional coordinates correctly', async () => {
      const event = await getLocalizedEventById(testEventId, 'en');

      expect(event).not.toBeNull();
      // Coordinates can be undefined or numbers
      if (event?.venueLat !== undefined) {
        expect(typeof event.venueLat).toBe('number');
      }
      if (event?.venueLng !== undefined) {
        expect(typeof event.venueLng).toBe('number');
      }
    });
  });
});
