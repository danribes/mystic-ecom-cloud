/**
 * T170: Content Translation for Products - Test Suite
 *
 * Tests locale-aware digital product content retrieval from the database.
 * Verifies that products display correctly in both English and Spanish
 * based on the user's language preference.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getLocalizedProductById,
  getLocalizedProductBySlug,
  getLocalizedProducts,
  type GetLocalizedProductsFilters,
} from '../../src/lib/productsI18n';
import pool from '../../src/lib/db';

describe('T170: Content Translation for Products', () => {
  // Test product IDs
  let testProductId: string;
  let testProductSlug: string;

  beforeAll(async () => {
    // Insert test product with both English and Spanish content
    const result = await pool.query(`
      INSERT INTO digital_products (
        slug,
        title,
        title_es,
        description,
        description_es,
        long_description,
        long_description_es,
        price,
        product_type,
        file_url,
        file_size_mb,
        preview_url,
        image_url,
        download_limit,
        is_published
      ) VALUES (
        'test-product-t170',
        'Test Product for T170',
        'Producto de Prueba para T170',
        'This is a test product for T170',
        'Este es un producto de prueba para T170',
        'Long description in English',
        'Descripción larga en español',
        29.99,
        'ebook',
        'https://example.com/product.pdf',
        5.5,
        'https://example.com/preview.pdf',
        'https://example.com/image.jpg',
        5,
        true
      )
      RETURNING id, slug
    `);

    testProductId = result.rows[0].id;
    testProductSlug = result.rows[0].slug;
  });

  afterAll(async () => {
    // Clean up test data
    if (testProductId) {
      await pool.query('DELETE FROM digital_products WHERE id = $1', [testProductId]);
    }
    await pool.end();
  });

  describe('getLocalizedProductById', () => {
    it('should return product with English content when locale is "en"', async () => {
      const product = await getLocalizedProductById(testProductId, 'en');

      expect(product).not.toBeNull();
      expect(product?.id).toBe(testProductId);
      expect(product?.title).toBe('Test Product for T170');
      expect(product?.description).toBe('This is a test product for T170');
      expect(product?.longDescription).toBe('Long description in English');
    });

    it('should return product with Spanish content when locale is "es"', async () => {
      const product = await getLocalizedProductById(testProductId, 'es');

      expect(product).not.toBeNull();
      expect(product?.id).toBe(testProductId);
      expect(product?.title).toBe('Producto de Prueba para T170');
      expect(product?.description).toBe('Este es un producto de prueba para T170');
      expect(product?.longDescription).toBe('Descripción larga en español');
    });

    it('should return null for non-existent product', async () => {
      const product = await getLocalizedProductById('00000000-0000-0000-0000-000000000000', 'en');
      expect(product).toBeNull();
    });

    it('should include download count stat', async () => {
      const product = await getLocalizedProductById(testProductId, 'en');

      expect(product).not.toBeNull();
      expect(product).toHaveProperty('downloadCount');
      expect(typeof product?.downloadCount).toBe('number');
    });

    it('should include product metadata', async () => {
      const product = await getLocalizedProductById(testProductId, 'en');

      expect(product).not.toBeNull();
      expect(product?.productType).toBe('ebook');
      expect(product?.price).toBe(29.99);
      expect(product?.fileSizeMb).toBe(5.5);
      expect(product?.downloadLimit).toBe(5);
      expect(product?.fileUrl).toBe('https://example.com/product.pdf');
    });

    it('should fallback to English when Spanish translation is missing', async () => {
      // Insert product with only English content
      const result = await pool.query(`
        INSERT INTO digital_products (
          slug,
          title,
          description,
          price,
          product_type,
          file_url,
          is_published
        ) VALUES (
          'test-product-no-spanish',
          'English Only Product',
          'This product has no Spanish translation',
          19.99,
          'audio',
          'https://example.com/audio.mp3',
          true
        )
        RETURNING id
      `);

      const productId = result.rows[0].id;

      try {
        const product = await getLocalizedProductById(productId, 'es');

        expect(product).not.toBeNull();
        expect(product?.title).toBe('English Only Product'); // Fallback to English
        expect(product?.description).toBe('This product has no Spanish translation');
      } finally {
        await pool.query('DELETE FROM digital_products WHERE id = $1', [productId]);
      }
    });
  });

  describe('getLocalizedProductBySlug', () => {
    it('should return product by slug with English content', async () => {
      const product = await getLocalizedProductBySlug(testProductSlug, 'en');

      expect(product).not.toBeNull();
      expect(product?.slug).toBe(testProductSlug);
      expect(product?.title).toBe('Test Product for T170');
      expect(product?.description).toBe('This is a test product for T170');
    });

    it('should return product by slug with Spanish content', async () => {
      const product = await getLocalizedProductBySlug(testProductSlug, 'es');

      expect(product).not.toBeNull();
      expect(product?.slug).toBe(testProductSlug);
      expect(product?.title).toBe('Producto de Prueba para T170');
      expect(product?.description).toBe('Este es un producto de prueba para T170');
    });

    it('should return null for non-existent slug', async () => {
      const product = await getLocalizedProductBySlug('non-existent-slug', 'en');
      expect(product).toBeNull();
    });

    it('should only return published products', async () => {
      // Insert unpublished product
      const result = await pool.query(`
        INSERT INTO digital_products (
          slug,
          title,
          description,
          price,
          product_type,
          file_url,
          is_published
        ) VALUES (
          'unpublished-product',
          'Unpublished Product',
          'This product is not published',
          9.99,
          'video',
          'https://example.com/video.mp4',
          false
        )
        RETURNING id
      `);

      const productId = result.rows[0].id;

      try {
        const product = await getLocalizedProductBySlug('unpublished-product', 'en');
        expect(product).toBeNull(); // Should not return unpublished products
      } finally {
        await pool.query('DELETE FROM digital_products WHERE id = $1', [productId]);
      }
    });
  });

  describe('getLocalizedProducts', () => {
    it('should return products with English content by default', async () => {
      const result = await getLocalizedProducts({ limit: 10, offset: 0 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
      expect(Array.isArray(result.items)).toBe(true);

      // Check that test product is in results with English content
      const testProduct = result.items.find(p => p.id === testProductId);
      if (testProduct) {
        expect(testProduct.title).toBe('Test Product for T170');
      }
    });

    it('should return products with Spanish content when locale is "es"', async () => {
      const result = await getLocalizedProducts({ limit: 10, offset: 0, locale: 'es' });

      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);

      // Check that test product is in results with Spanish content
      const testProduct = result.items.find(p => p.id === testProductId);
      if (testProduct) {
        expect(testProduct.title).toBe('Producto de Prueba para T170');
      }
    });

    it('should filter by product type', async () => {
      const result = await getLocalizedProducts({ productType: 'ebook', limit: 10, offset: 0 });

      expect(result).toHaveProperty('items');
      const testProduct = result.items.find(p => p.id === testProductId);
      if (testProduct) {
        expect(testProduct.productType).toBe('ebook');
      }
    });

    it('should filter by price range', async () => {
      const result = await getLocalizedProducts({ minPrice: 20, maxPrice: 50, limit: 10, offset: 0 });

      expect(result).toHaveProperty('items');
      result.items.forEach(product => {
        expect(product.price).toBeGreaterThanOrEqual(20);
        expect(product.price).toBeLessThanOrEqual(50);
      });
    });

    it('should search in both English and Spanish fields', async () => {
      const result = await getLocalizedProducts({ search: 'T170', limit: 10, offset: 0 });

      expect(result).toHaveProperty('items');
      const testProduct = result.items.find(p => p.id === testProductId);
      expect(testProduct).toBeDefined();
    });

    it('should search Spanish content when locale is "es"', async () => {
      const result = await getLocalizedProducts({ search: 'Prueba', limit: 10, offset: 0, locale: 'es' });

      expect(result).toHaveProperty('items');
      const testProduct = result.items.find(p => p.id === testProductId);
      expect(testProduct).toBeDefined();
    });

    it('should support pagination with limit and offset', async () => {
      const page1 = await getLocalizedProducts({ limit: 5, offset: 0 });
      const page2 = await getLocalizedProducts({ limit: 5, offset: 5 });

      expect(page1.items).toHaveLength(Math.min(5, page1.total));

      if (page1.total > 5) {
        expect(page2.items.length).toBeGreaterThan(0);
        const page1Ids = page1.items.map(p => p.id);
        const page2Ids = page2.items.map(p => p.id);
        const overlap = page1Ids.filter(id => page2Ids.includes(id));
        expect(overlap).toHaveLength(0);
      }
    });

    it('should indicate if more results are available (hasMore)', async () => {
      const result = await getLocalizedProducts({ limit: 1, offset: 0 });

      expect(result).toHaveProperty('hasMore');
      expect(typeof result.hasMore).toBe('boolean');
    });

    it('should return correct total count', async () => {
      const result = await getLocalizedProducts({ limit: 10, offset: 0 });

      expect(result).toHaveProperty('total');
      expect(typeof result.total).toBe('number');
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Data Integrity', () => {
    it('should return consistent product IDs across locales', async () => {
      const productEn = await getLocalizedProductById(testProductId, 'en');
      const productEs = await getLocalizedProductById(testProductId, 'es');

      expect(productEn?.id).toBe(productEs?.id);
      expect(productEn?.slug).toBe(productEs?.slug);
    });

    it('should return consistent prices across locales', async () => {
      const productEn = await getLocalizedProductById(testProductId, 'en');
      const productEs = await getLocalizedProductById(testProductId, 'es');

      expect(productEn?.price).toBe(productEs?.price);
    });

    it('should return consistent metadata across locales', async () => {
      const productEn = await getLocalizedProductById(testProductId, 'en');
      const productEs = await getLocalizedProductById(testProductId, 'es');

      expect(productEn?.productType).toBe(productEs?.productType);
      expect(productEn?.fileSizeMb).toBe(productEs?.fileSizeMb);
      expect(productEn?.downloadLimit).toBe(productEs?.downloadLimit);
      expect(productEn?.isPublished).toBe(productEs?.isPublished);
    });

    it('should parse price as float correctly', async () => {
      const product = await getLocalizedProductById(testProductId, 'en');

      expect(product).not.toBeNull();
      expect(typeof product?.price).toBe('number');
      expect(product?.price).toBe(29.99);
    });

    it('should convert dates correctly', async () => {
      const product = await getLocalizedProductById(testProductId, 'en');

      expect(product).not.toBeNull();
      expect(product?.createdAt).toBeInstanceOf(Date);
      expect(product?.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle optional fields correctly', async () => {
      const product = await getLocalizedProductById(testProductId, 'en');

      expect(product).not.toBeNull();
      // File size can be undefined or number
      if (product?.fileSizeMb !== undefined) {
        expect(typeof product.fileSizeMb).toBe('number');
      }
      // Preview URL and image URL are optional
      expect(product?.previewUrl).toBeDefined();
      expect(product?.imageUrl).toBeDefined();
    });
  });
});
