/**
 * T177: SEO Metadata Tests
 * Tests for multilingual SEO metadata generation
 */

import { describe, it, expect } from 'vitest';
import {
  generateSEOMetadata,
  generateSEOTitle,
  truncateDescription,
  generateBreadcrumbSchema,
  generateOrganizationSchema,
  generateProductSchema,
  generateCourseSchema,
  generateEventSchema,
} from '@/lib/seoMetadata';
import type { Locale } from '@/i18n';

describe('T177: SEO Metadata', () => {
  const baseUrl = 'https://quantumhealingportal.com';

  describe('generateSEOMetadata', () => {
    it('should generate English SEO metadata', () => {
      const metadata = generateSEOMetadata('en', {
        titleKey: 'seo.homeTitle',
        descriptionKey: 'seo.homeDescription',
      });

      expect(metadata.title).toBe('Quantum Healing Portal - Transform Your Mind, Body & Spirit');
      expect(metadata.description).toContain('quantum healing');
      expect(metadata.description).toContain('meditation');
    });

    it('should generate Spanish SEO metadata', () => {
      const metadata = generateSEOMetadata('es', {
        titleKey: 'seo.homeTitle',
        descriptionKey: 'seo.homeDescription',
      });

      expect(metadata.title).toBe('Portal de Sanación Cuántica - Transforma Tu Mente, Cuerpo y Espíritu');
      expect(metadata.description).toContain('sanación cuántica');
      expect(metadata.description).toContain('meditación');
    });

    it('should include optional OG image', () => {
      const metadata = generateSEOMetadata('en', {
        titleKey: 'seo.homeTitle',
        descriptionKey: 'seo.homeDescription',
        ogImage: '/images/home-og.jpg',
      });

      expect(metadata.ogImage).toBe('/images/home-og.jpg');
    });

    it('should include optional OG type', () => {
      const metadata = generateSEOMetadata('en', {
        titleKey: 'seo.homeTitle',
        descriptionKey: 'seo.homeDescription',
        ogType: 'article',
      });

      expect(metadata.ogType).toBe('article');
    });
  });

  describe('generateSEOTitle', () => {
    it('should append site name to English page title', () => {
      const title = generateSEOTitle('Meditation Courses', 'en');
      expect(title).toBe('Meditation Courses | Quantum Healing Portal');
    });

    it('should append site name to Spanish page title', () => {
      const title = generateSEOTitle('Cursos de Meditación', 'es');
      expect(title).toBe('Cursos de Meditación | Portal de Sanación Cuántica');
    });
  });

  describe('truncateDescription', () => {
    it('should not truncate short descriptions', () => {
      const desc = 'This is a short description';
      const result = truncateDescription(desc);
      expect(result).toBe(desc);
    });

    it('should truncate long descriptions to 155 characters', () => {
      const desc = 'A'.repeat(200);
      const result = truncateDescription(desc);
      expect(result.length).toBeLessThanOrEqual(158); // 155 + '...'
      expect(result).toMatch(/\.\.\.$/);
    });

    it('should truncate at word boundary', () => {
      const desc = 'This is a very long description that needs to be truncated at a word boundary to maintain readability and proper formatting for search engine results which need to be within optimal character limits';
      const result = truncateDescription(desc);
      expect(result.length).toBeLessThanOrEqual(158);
      expect(result).not.toMatch(/\s\.\.\.$/); // Should not end with space before ellipsis
      expect(result).toMatch(/\.\.\./);
    });

    it('should respect custom max length', () => {
      const desc = 'A'.repeat(200);
      const result = truncateDescription(desc, 100);
      expect(result.length).toBeLessThanOrEqual(103); // 100 + '...'
    });
  });

  describe('generateBreadcrumbSchema', () => {
    it('should generate valid breadcrumb schema', () => {
      const items = [
        { name: 'Home', path: '/' },
        { name: 'Courses', path: '/courses' },
        { name: 'Meditation 101', path: '/courses/meditation-101' },
      ];

      const schema = generateBreadcrumbSchema(items, baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('BreadcrumbList');
      expect(parsed.itemListElement).toHaveLength(3);
      expect(parsed.itemListElement[0].position).toBe(1);
      expect(parsed.itemListElement[0].name).toBe('Home');
      expect(parsed.itemListElement[0].item).toBe(`${baseUrl}/`);
    });

    it('should handle single item breadcrumb', () => {
      const items = [{ name: 'Home', path: '/' }];
      const schema = generateBreadcrumbSchema(items, baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed.itemListElement).toHaveLength(1);
    });
  });

  describe('generateOrganizationSchema', () => {
    it('should generate English organization schema', () => {
      const schema = generateOrganizationSchema('en', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('Organization');
      expect(parsed.name).toBe('Quantum Healing Portal');
      expect(parsed.url).toBe(baseUrl);
      expect(parsed.logo).toBe(`${baseUrl}/images/logo.png`);
    });

    it('should generate Spanish organization schema', () => {
      const schema = generateOrganizationSchema('es', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed.name).toBe('Portal de Sanación Cuántica');
      expect(parsed.description).toContain('sanación');
    });
  });

  describe('generateProductSchema', () => {
    it('should generate valid product schema', () => {
      const product = {
        name: 'Meditation Guide',
        description: 'Complete meditation guide',
        image: '/images/products/meditation-guide.jpg',
        price: 29.99,
        currency: 'USD',
        sku: 'MED-GUIDE-001',
      };

      const schema = generateProductSchema(product, 'en', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed['@type']).toBe('Product');
      expect(parsed.name).toBe('Meditation Guide');
      expect(parsed.offers.price).toBe('29.99');
      expect(parsed.offers.priceCurrency).toBe('USD');
      expect(parsed.sku).toBe('MED-GUIDE-001');
    });

    it('should handle absolute image URLs', () => {
      const product = {
        name: 'Test Product',
        description: 'Test',
        image: 'https://example.com/image.jpg',
        price: 10,
        currency: 'USD',
      };

      const schema = generateProductSchema(product, 'en', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed.image).toBe('https://example.com/image.jpg');
    });

    it('should handle relative image URLs', () => {
      const product = {
        name: 'Test Product',
        description: 'Test',
        image: '/images/test.jpg',
        price: 10,
        currency: 'USD',
      };

      const schema = generateProductSchema(product, 'en', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed.image).toBe(`${baseUrl}/images/test.jpg`);
    });
  });

  describe('generateCourseSchema', () => {
    it('should generate valid course schema', () => {
      const course = {
        name: 'Quantum Healing 101',
        description: 'Introduction to quantum healing',
        image: '/images/courses/qh-101.jpg',
        price: 99.99,
        currency: 'USD',
        instructor: 'Dr. Quantum',
      };

      const schema = generateCourseSchema(course, 'en', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed['@type']).toBe('Course');
      expect(parsed.name).toBe('Quantum Healing 101');
      expect(parsed.provider.name).toBe('Dr. Quantum');
      expect(parsed.offers.price).toBe('99.99');
    });

    it('should handle course without instructor', () => {
      const course = {
        name: 'Test Course',
        description: 'Test',
        image: '/images/test.jpg',
        price: 50,
        currency: 'USD',
      };

      const schema = generateCourseSchema(course, 'en', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed.provider).toBeUndefined();
    });
  });

  describe('generateEventSchema', () => {
    it('should generate valid event schema', () => {
      const event = {
        name: 'Meditation Workshop',
        description: 'Learn advanced meditation techniques',
        startDate: new Date('2025-03-15T18:00:00Z'),
        endDate: new Date('2025-03-15T20:00:00Z'),
        location: 'Online Platform',
        price: 49.99,
        currency: 'USD',
      };

      const schema = generateEventSchema(event, 'en', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed['@type']).toBe('Event');
      expect(parsed.name).toBe('Meditation Workshop');
      expect(parsed.startDate).toBe('2025-03-15T18:00:00.000Z');
      expect(parsed.endDate).toBe('2025-03-15T20:00:00.000Z');
      expect(parsed.location.name).toBe('Online Platform');
      expect(parsed.offers.price).toBe('49.99');
    });

    it('should handle event without end date', () => {
      const event = {
        name: 'Test Event',
        description: 'Test',
        startDate: new Date('2025-03-15T18:00:00Z'),
        location: 'Test Location',
        price: 0,
        currency: 'USD',
      };

      const schema = generateEventSchema(event, 'en', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed.endDate).toBeUndefined();
    });
  });

  describe('Locale-specific metadata', () => {
    it('should generate different titles for different locales', () => {
      const enMetadata = generateSEOMetadata('en', {
        titleKey: 'seo.coursesTitle',
        descriptionKey: 'seo.coursesDescription',
      });

      const esMetadata = generateSEOMetadata('es', {
        titleKey: 'seo.coursesTitle',
        descriptionKey: 'seo.coursesDescription',
      });

      expect(enMetadata.title).not.toBe(esMetadata.title);
      expect(enMetadata.title).toContain('Courses');
      expect(esMetadata.title).toContain('Cursos');
    });

    it('should generate different descriptions for different locales', () => {
      const enMetadata = generateSEOMetadata('en', {
        titleKey: 'seo.eventsTitle',
        descriptionKey: 'seo.eventsDescription',
      });

      const esMetadata = generateSEOMetadata('es', {
        titleKey: 'seo.eventsTitle',
        descriptionKey: 'seo.eventsDescription',
      });

      expect(enMetadata.description).not.toBe(esMetadata.description);
      expect(enMetadata.description).toContain('events');
      expect(esMetadata.description).toContain('eventos');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty breadcrumb list', () => {
      const schema = generateBreadcrumbSchema([], baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed.itemListElement).toEqual([]);
    });

    it('should handle product with zero price', () => {
      const product = {
        name: 'Free Resource',
        description: 'Free',
        image: '/image.jpg',
        price: 0,
        currency: 'USD',
      };

      const schema = generateProductSchema(product, 'en', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed.offers.price).toBe('0.00');
    });

    it('should format prices with two decimals', () => {
      const product = {
        name: 'Product',
        description: 'Test',
        image: '/image.jpg',
        price: 10.5,
        currency: 'USD',
      };

      const schema = generateProductSchema(product, 'en', baseUrl);
      const parsed = JSON.parse(schema);

      expect(parsed.offers.price).toBe('10.50');
    });
  });
});
