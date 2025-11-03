/**
 * Products I18n Service (T170)
 *
 * Locale-aware digital product retrieval functions that return products with content
 * in the user's preferred language (English or Spanish).
 *
 * Uses SQL CASE/COALESCE for automatic fallback to English when Spanish
 * translations are missing.
 *
 * @see T167 - Multilingual schema (added *_es columns)
 * @see T170 - Migration 006 (added base long_description column)
 */

import pool from './db';

export type Locale = 'en' | 'es';

/**
 * Localized Digital Product interface
 * Contains product data in the requested language with fallback to English
 */
export interface LocalizedProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription?: string;
  price: number;
  productType: string;
  fileUrl: string;
  fileSizeMb?: number;
  previewUrl?: string;
  imageUrl?: string;
  downloadLimit: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Aggregated stats
  downloadCount?: number;
}

/**
 * Filters for querying localized products
 */
export interface GetLocalizedProductsFilters {
  productType?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  limit?: number;
  offset?: number;
  locale?: Locale;
}

/**
 * Get a single digital product by ID with localized content
 *
 * @param id - Product UUID
 * @param locale - Language code ('en' or 'es')
 * @returns Localized product or null if not found
 *
 * @example
 * const product = await getLocalizedProductById('uuid-here', 'es');
 * console.log(product.title); // Spanish title or English fallback
 */
export async function getLocalizedProductById(
  id: string,
  locale: Locale = 'en'
): Promise<LocalizedProduct | null> {
  const query = `
    SELECT
      p.id,
      p.slug,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN p.title_es
          ELSE NULL
        END,
        ''
      ), p.title) as title,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN p.description_es
          ELSE NULL
        END,
        ''
      ), p.description) as description,
      COALESCE(
        CASE
          WHEN '${locale}' = 'es' AND p.long_description_es IS NOT NULL AND p.long_description_es != ''
          THEN p.long_description_es
          ELSE p.long_description
        END,
        p.description
      ) as long_description,
      p.price,
      p.product_type,
      p.file_url,
      p.file_size_mb,
      p.preview_url,
      p.image_url,
      p.download_limit,
      p.is_published,
      p.created_at,
      p.updated_at,
      COUNT(d.id)::INTEGER as download_count
    FROM digital_products p
    LEFT JOIN download_logs d ON p.id = d.digital_product_id
    WHERE p.id = $1
    GROUP BY p.id
  `;

  try {
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      longDescription: row.long_description,
      price: parseFloat(row.price),
      productType: row.product_type,
      fileUrl: row.file_url,
      fileSizeMb: row.file_size_mb ? parseFloat(row.file_size_mb) : undefined,
      previewUrl: row.preview_url,
      imageUrl: row.image_url,
      downloadLimit: row.download_limit,
      isPublished: row.is_published,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      downloadCount: row.download_count || 0,
    };
  } catch (error) {
    console.error('[T170] Error fetching localized product:', error);
    throw error;
  }
}

/**
 * Get a single digital product by slug with localized content
 * Only returns published products
 *
 * @param slug - Product URL slug
 * @param locale - Language code ('en' or 'es')
 * @returns Localized product or null if not found/unpublished
 *
 * @example
 * const product = await getLocalizedProductBySlug('meditation-guide', 'es');
 */
export async function getLocalizedProductBySlug(
  slug: string,
  locale: Locale = 'en'
): Promise<LocalizedProduct | null> {
  const query = `
    SELECT
      p.id,
      p.slug,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN p.title_es
          ELSE NULL
        END,
        ''
      ), p.title) as title,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN p.description_es
          ELSE NULL
        END,
        ''
      ), p.description) as description,
      COALESCE(
        CASE
          WHEN '${locale}' = 'es' AND p.long_description_es IS NOT NULL AND p.long_description_es != ''
          THEN p.long_description_es
          ELSE p.long_description
        END,
        p.description
      ) as long_description,
      p.price,
      p.product_type,
      p.file_url,
      p.file_size_mb,
      p.preview_url,
      p.image_url,
      p.download_limit,
      p.is_published,
      p.created_at,
      p.updated_at,
      COUNT(d.id)::INTEGER as download_count
    FROM digital_products p
    LEFT JOIN download_logs d ON p.id = d.digital_product_id
    WHERE p.slug = $1 AND p.is_published = true
    GROUP BY p.id
  `;

  try {
    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      longDescription: row.long_description,
      price: parseFloat(row.price),
      productType: row.product_type,
      fileUrl: row.file_url,
      fileSizeMb: row.file_size_mb ? parseFloat(row.file_size_mb) : undefined,
      previewUrl: row.preview_url,
      imageUrl: row.image_url,
      downloadLimit: row.download_limit,
      isPublished: row.is_published,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      downloadCount: row.download_count || 0,
    };
  } catch (error) {
    console.error('[T170] Error fetching localized product by slug:', error);
    throw error;
  }
}

/**
 * Get multiple digital products with filters and localized content
 * Supports pagination, filtering, and searching
 *
 * @param filters - Optional filters for products
 * @returns Object with items, total count, and hasMore flag
 *
 * @example
 * const result = await getLocalizedProducts({
 *   locale: 'es',
 *   productType: 'ebook',
 *   maxPrice: 50,
 *   limit: 12,
 *   offset: 0
 * });
 */
export async function getLocalizedProducts(
  filters: GetLocalizedProductsFilters = {}
): Promise<{ items: LocalizedProduct[]; total: number; hasMore: boolean }> {
  const {
    productType,
    minPrice,
    maxPrice,
    search,
    limit = 12,
    offset = 0,
    locale = 'en',
  } = filters;

  let query = `
    SELECT
      p.id,
      p.slug,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN p.title_es
          ELSE NULL
        END,
        ''
      ), p.title) as title,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN p.description_es
          ELSE NULL
        END,
        ''
      ), p.description) as description,
      p.price,
      p.product_type,
      p.file_url,
      p.file_size_mb,
      p.preview_url,
      p.image_url,
      p.download_limit,
      p.is_published,
      p.created_at,
      p.updated_at,
      COUNT(d.id)::INTEGER as download_count
    FROM digital_products p
    LEFT JOIN download_logs d ON p.id = d.digital_product_id
    WHERE p.is_published = true
  `;

  const params: any[] = [];
  let paramIndex = 1;

  // Product type filter
  if (productType) {
    query += ` AND p.product_type = $${paramIndex}`;
    params.push(productType);
    paramIndex++;
  }

  // Price range filter
  if (minPrice !== undefined) {
    query += ` AND p.price >= $${paramIndex}`;
    params.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined) {
    query += ` AND p.price <= $${paramIndex}`;
    params.push(maxPrice);
    paramIndex++;
  }

  // Search filter (searches in both English and Spanish fields)
  if (search) {
    query += ` AND (
      p.title ILIKE $${paramIndex} OR
      p.description ILIKE $${paramIndex} OR
      p.title_es ILIKE $${paramIndex} OR
      p.description_es ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Group by and order
  query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

  // Pagination - fetch limit + 1 to determine if more results exist
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit + 1, offset);

  try {
    const result = await pool.query(query, params);
    const hasMore = result.rows.length > limit;
    const items = (hasMore ? result.rows.slice(0, limit) : result.rows).map(
      (row): LocalizedProduct => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        price: parseFloat(row.price),
        productType: row.product_type,
        fileUrl: row.file_url,
        fileSizeMb: row.file_size_mb ? parseFloat(row.file_size_mb) : undefined,
        previewUrl: row.preview_url,
        imageUrl: row.image_url,
        downloadLimit: row.download_limit,
        isPublished: row.is_published,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        downloadCount: row.download_count || 0,
      })
    );

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT p.id)::INTEGER as total
      FROM digital_products p
      WHERE p.is_published = true
      ${productType ? `AND p.product_type = '${productType}'` : ''}
      ${minPrice !== undefined ? `AND p.price >= ${minPrice}` : ''}
      ${maxPrice !== undefined ? `AND p.price <= ${maxPrice}` : ''}
      ${search ? `AND (p.title ILIKE '%${search}%' OR p.description ILIKE '%${search}%' OR p.title_es ILIKE '%${search}%' OR p.description_es ILIKE '%${search}%')` : ''}
    `;

    const countResult = await pool.query(countQuery);
    const total = countResult.rows[0]?.total || 0;

    return {
      items,
      total,
      hasMore,
    };
  } catch (error) {
    console.error('[T170] Error fetching localized products:', error);
    throw error;
  }
}
