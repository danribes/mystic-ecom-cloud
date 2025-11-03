import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '../db';
import {
  search,
  searchCourses,
  searchProducts,
  searchEvents,
  getSearchSuggestions,
  getPopularSearches,
  getLevels,
  getProductTypes,
  getPriceRange
} from '../search';

describe('Search Service', () => {
  let courseId: string;
  let productId: string;
  let eventId: string;

  beforeAll(async () => {
    // Insert test course
    const courseResult = await pool.query(
      `INSERT INTO courses (title, slug, description, price, level, duration_hours, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      ['Meditation Fundamentals', 'meditation-fundamentals', 'Learn the basics of meditation and mindfulness', 49.99, 'beginner', 10, true]
    );
    courseId = courseResult.rows[0].id;

    // Insert test product
    const productResult = await pool.query(
      `INSERT INTO digital_products (title, slug, description, price, product_type, file_url, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      ['Mindfulness Guide', 'mindfulness-guide', 'Complete guide to mindfulness practices', 29.99, 'pdf', 'https://example.com/file.pdf', true]
    );
    productId = productResult.rows[0].id;

    // Insert test event
    const eventResult = await pool.query(
      `INSERT INTO events (title, slug, description, price, event_date, duration_hours, venue_name, venue_address, venue_city, venue_country, capacity, available_spots, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      ['Yoga Retreat', 'yoga-retreat', 'Weekend yoga and meditation retreat', 199.99, new Date('2025-12-01'), 48, 'Wellness Center', '123 Beach Rd', 'Bali', 'Indonesia', 20, 15, true]
    );
    eventId = eventResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
    await pool.query('DELETE FROM digital_products WHERE id = $1', [productId]);
    await pool.query('DELETE FROM courses WHERE id = $1', [courseId]);
  });

  describe('search()', () => {
    it('should search across all types', async () => {
      const results = await search({ query: 'meditation' });
      expect(results.items.length).toBeGreaterThan(0);
      expect(results.items.some(item => item.type === 'course')).toBe(true);
    });

    it('should filter by type', async () => {
      const results = await search({ query: 'meditation', type: 'course' });
      expect(results.items.every(item => item.type === 'course')).toBe(true);
    });

    it('should filter by price range', async () => {
      const results = await search({ query: 'meditation', minPrice: 40, maxPrice: 60 });
      expect(results.items.every(item => item.price >= 40 && item.price <= 60)).toBe(true);
    });

    it('should support pagination', async () => {
      const page1 = await search({ query: 'meditation', limit: 1, offset: 0 });
      const page2 = await search({ query: 'meditation', limit: 1, offset: 1 });
      expect(page1.items[0]?.id).not.toBe(page2.items[0]?.id);
    });

    it('should return empty results for non-matching query', async () => {
      const results = await search({ query: 'xyznonexistent' });
      expect(results.items).toHaveLength(0);
      expect(results.total).toBe(0);
    });

    it('should rank results by relevance', async () => {
      const results = await search({ query: 'meditation mindfulness' });
      if (results.items.length > 1) {
        expect(results.items[0]!.relevance).toBeGreaterThanOrEqual(results.items[1]!.relevance);
      }
    });
  });

  describe('searchCourses()', () => {
    it('should find courses by title', async () => {
      const results = await searchCourses({ query: 'Meditation' });
      expect(results.items.length).toBeGreaterThan(0);
      expect(results.items[0]!.title).toContain('Meditation');
    });

    it('should find courses by description', async () => {
      const results = await searchCourses({ query: 'mindfulness' });
      expect(results.items.length).toBeGreaterThan(0);
    });

    it('should filter by level', async () => {
      const results = await searchCourses({ query: '', level: 'beginner' });
      const courseResults = results.items.filter((item): item is import('../search').CourseResult => item.type === 'course');
      expect(courseResults.every(item => item.level === 'beginner')).toBe(true);
    });

    it('should filter by price', async () => {
      const results = await searchCourses({ query: '', minPrice: 40, maxPrice: 60 });
      expect(results.items.every(item => item.price >= 40 && item.price <= 60)).toBe(true);
    });

    it('should include level and duration in results', async () => {
      const results = await searchCourses({ query: 'Meditation' });
      expect(results.items[0]).toHaveProperty('level');
      expect(results.items[0]).toHaveProperty('durationHours');
    });
  });

  describe('searchProducts()', () => {
    it('should find products by title', async () => {
      const results = await searchProducts({ query: 'Guide' });
      expect(results.items.length).toBeGreaterThan(0);
      expect(results.items[0]!.title).toContain('Guide');
    });

    it('should find products by description', async () => {
      const results = await searchProducts({ query: 'mindfulness' });
      expect(results.items.length).toBeGreaterThan(0);
    });

    it('should filter by product type', async () => {
      const results = await searchProducts({ query: '', productType: 'pdf' });
      const productResults = results.items.filter((item): item is import('../search').ProductResult => item.type === 'product');
      expect(productResults.every(item => item.productType === 'pdf')).toBe(true);
    });

    it('should include productType in results', async () => {
      const results = await searchProducts({ query: 'Guide' });
      const product = results.items[0];
      expect(product).toHaveProperty('productType');
      if (product && product.type === 'product') {
        expect(product.productType).toBe('pdf');
      }
    });
  });

  describe('searchEvents()', () => {
    it('should find events by title', async () => {
      const results = await searchEvents({ query: 'Yoga' });
      expect(results.items.length).toBeGreaterThan(0);
      expect(results.items[0]!.title).toContain('Yoga');
    });

    it('should find events by city', async () => {
      const results = await searchEvents({ query: 'Bali' });
      expect(results.items.length).toBeGreaterThan(0);
    });

    it('should filter by city parameter', async () => {
      const results = await searchEvents({ query: '', city: 'Bali' });
      expect(results.items.length).toBeGreaterThan(0);
      const eventResults = results.items.filter((item): item is import('../search').EventResult => item.type === 'event');
      expect(eventResults.every(item => item.venueCity.toLowerCase().includes('bali'))).toBe(true);
    });

    it('should include venue and date info in results', async () => {
      const results = await searchEvents({ query: 'Yoga' });
      expect(results.items[0]).toHaveProperty('venueCity');
      expect(results.items[0]).toHaveProperty('venueCountry');
      expect(results.items[0]).toHaveProperty('eventDate');
      expect(results.items[0]).toHaveProperty('availableSpots');
    });
  });

  describe('getSearchSuggestions()', () => {
    it('should return suggestions for partial query', async () => {
      const suggestions = await getSearchSuggestions('Medi');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should limit number of suggestions', async () => {
      const suggestions = await getSearchSuggestions('a', 3);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for short queries', async () => {
      const suggestions = await getSearchSuggestions('a');
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return empty array for empty query', async () => {
      const suggestions = await getSearchSuggestions('');
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('getPopularSearches()', () => {
    it('should return popular search terms', async () => {
      const popular = await getPopularSearches();
      expect(Array.isArray(popular)).toBe(true);
      expect(popular.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const popular = await getPopularSearches(5);
      expect(popular.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getLevels()', () => {
    it('should return available levels', async () => {
      const levels = await getLevels();
      expect(Array.isArray(levels)).toBe(true);
      expect(levels).toContain('beginner');
    });
  });

  describe('getProductTypes()', () => {
    it('should return available product types', async () => {
      const types = await getProductTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types).toContain('pdf');
    });
  });

  describe('getPriceRange()', () => {
    it('should return price range for all types', async () => {
      const range = await getPriceRange();
      expect(range).toHaveProperty('min');
      expect(range).toHaveProperty('max');
      expect(range.min).toBeLessThanOrEqual(range.max);
    });

    it('should return price range for courses', async () => {
      const range = await getPriceRange('course');
      expect(range.min).toBeGreaterThan(0);
    });

    it('should return price range for products', async () => {
      const range = await getPriceRange('product');
      expect(range.min).toBeGreaterThan(0);
    });

    it('should return price range for events', async () => {
      const range = await getPriceRange('event');
      expect(range.min).toBeGreaterThan(0);
    });
  });
});
