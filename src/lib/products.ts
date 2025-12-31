/**
 * Product Service Library
 * Handles digital product operations including fetching, purchasing, and download management
 *
 * T212: Added caching layer for performance optimization
 */

import { getPool } from './db';
import {
  generateCacheKey,
  getCached,
  setCached,
  invalidateCache,
  CacheNamespace,
  CacheTTL,
} from './redis';

// Web Crypto API compatible HMAC functions
async function createHmacSignature(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataBytes = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, dataBytes);
  const bytes = new Uint8Array(signature);
  // Convert to base64url
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Timing-safe comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export interface DigitalProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  product_type: 'pdf' | 'audio' | 'video' | 'ebook';
  file_url: string;
  file_size_mb: number;
  preview_url?: string;
  image_url?: string;
  download_limit: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductOrder {
  order_id: string;
  purchase_date: Date;
  download_count: number;
  download_limit: number;
}

export interface DownloadLink {
  url: string;
  token: string;
  expires: number;
}

/**
 * Get all published products with optional filtering and sorting
 *
 * T212: Added caching with 5-minute TTL
 */
export async function getProducts(options: {
  type?: 'pdf' | 'audio' | 'video' | 'ebook';
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  sortBy?: 'price-asc' | 'price-desc' | 'title-asc' | 'title-desc' | 'newest' | 'size-asc' | 'size-desc';
  limit?: number;
  offset?: number;
} = {}): Promise<DigitalProduct[]> {
  // Generate cache key based on options
  const cacheKey = generateCacheKey(
    CacheNamespace.PRODUCTS,
    'list',
    JSON.stringify(options)
  );

  // Try to get from cache
  const cached = await getCached<DigitalProduct[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  let query = `
    SELECT * FROM digital_products
    WHERE is_published = true
  `;
  const params: any[] = [];
  let paramIndex = 1;

  // Filter by product type
  if (options.type) {
    query += ` AND product_type = $${paramIndex}`;
    params.push(options.type);
    paramIndex++;
  }

  // Search by title or description
  if (options.search) {
    query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${options.search}%`);
    paramIndex++;
  }

  // Filter by price range
  if (options.minPrice !== undefined) {
    query += ` AND price >= $${paramIndex}`;
    params.push(options.minPrice);
    paramIndex++;
  }
  if (options.maxPrice !== undefined) {
    query += ` AND price <= $${paramIndex}`;
    params.push(options.maxPrice);
    paramIndex++;
  }

  // Filter by file size range
  if (options.minSize !== undefined) {
    query += ` AND file_size_mb >= $${paramIndex}`;
    params.push(options.minSize);
    paramIndex++;
  }
  if (options.maxSize !== undefined) {
    query += ` AND file_size_mb <= $${paramIndex}`;
    params.push(options.maxSize);
    paramIndex++;
  }

  // Sorting
  switch (options.sortBy) {
    case 'price-asc':
      query += ' ORDER BY price ASC';
      break;
    case 'price-desc':
      query += ' ORDER BY price DESC';
      break;
    case 'title-asc':
      query += ' ORDER BY title ASC';
      break;
    case 'title-desc':
      query += ' ORDER BY title DESC';
      break;
    case 'size-asc':
      query += ' ORDER BY file_size_mb ASC';
      break;
    case 'size-desc':
      query += ' ORDER BY file_size_mb DESC';
      break;
    case 'newest':
      query += ' ORDER BY created_at DESC';
      break;
    default:
      query += ' ORDER BY created_at DESC';
  }

  // Pagination
  if (options.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(options.limit);
    paramIndex++;
  }
  if (options.offset) {
    query += ` OFFSET $${paramIndex}`;
    params.push(options.offset);
    paramIndex++;
  }

  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured');
  }
  const result = await pool.query(query, params);
  const products = result.rows;

  // Store in cache
  await setCached(cacheKey, products, CacheTTL.PRODUCTS);

  return products;
}

/**
 * Get a product by ID
 *
 * T212: Added caching with 5-minute TTL
 */
export async function getProductById(productId: string): Promise<DigitalProduct | null> {
  const cacheKey = generateCacheKey(CacheNamespace.PRODUCTS, productId);

  // Try to get from cache
  const cached = await getCached<DigitalProduct | null>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured');
  }
  const result = await pool.query(
    'SELECT * FROM digital_products WHERE id = $1 AND is_published = true',
    [productId]
  );
  const product = result.rows[0] || null;

  // Store in cache
  await setCached(cacheKey, product, CacheTTL.PRODUCTS);

  return product;
}

/**
 * Get a product by slug
 *
 * T212: Added caching with 5-minute TTL
 */
export async function getProductBySlug(slug: string): Promise<DigitalProduct | null> {
  const cacheKey = generateCacheKey(CacheNamespace.PRODUCTS, 'slug', slug);

  // Try to get from cache
  const cached = await getCached<DigitalProduct | null>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured');
  }
  const result = await pool.query(
    'SELECT * FROM digital_products WHERE slug = $1 AND is_published = true',
    [slug]
  );
  const product = result.rows[0] || null;

  // Store in cache
  await setCached(cacheKey, product, CacheTTL.PRODUCTS);

  return product;
}

/**
 * Check if user has purchased a product
 */
export async function hasUserPurchasedProduct(
  userId: string,
  productId: string
): Promise<ProductOrder | null> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured');
  }
  const result = await pool.query(
    `SELECT 
      o.id as order_id,
      o.created_at as purchase_date,
      COUNT(dl.id) as download_count,
      dp.download_limit
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.id
    INNER JOIN digital_products dp ON dp.id = oi.digital_product_id
    LEFT JOIN download_logs dl ON dl.order_id = o.id AND dl.digital_product_id = dp.id
    WHERE o.user_id = $1 
      AND oi.digital_product_id = $2
      AND o.status = 'completed'
    GROUP BY o.id, o.created_at, dp.download_limit
    ORDER BY o.created_at DESC
    LIMIT 1`,
    [userId, productId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    order_id: row.order_id,
    purchase_date: row.purchase_date,
    download_count: parseInt(row.download_count),
    download_limit: row.download_limit,
  };
}

/**
 * Get all products purchased by a user
 */
export async function getUserPurchasedProducts(userId: string): Promise<Array<DigitalProduct & ProductOrder>> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured');
  }
  const result = await pool.query(
    `SELECT 
      dp.*,
      o.id as order_id,
      o.created_at as purchase_date,
      COUNT(dl.id) as download_count
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.id
    INNER JOIN digital_products dp ON dp.id = oi.digital_product_id
    LEFT JOIN download_logs dl ON dl.order_id = o.id AND dl.digital_product_id = dp.id
    WHERE o.user_id = $1 AND o.status = 'completed'
    GROUP BY dp.id, o.id, o.created_at
    ORDER BY o.created_at DESC`,
    [userId]
  );

  return result.rows.map((row: any) => ({
    ...row,
    download_count: parseInt(row.download_count),
  }));
}

/**
 * Generate a secure, time-limited download link
 */
export async function generateDownloadLink(
  productId: string,
  orderId: string,
  userId: string,
  expiresInMinutes: number = 15
): Promise<DownloadLink> {
  const expires = Date.now() + (expiresInMinutes * 60 * 1000);

  // Create a token that includes the product, order, user, and expiry
  const payload = `${productId}:${orderId}:${userId}:${expires}`;

  // Sign the payload with a secret
  // SECURITY: No fallback allowed - must be set in production
  const secret = process.env.DOWNLOAD_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      'DOWNLOAD_TOKEN_SECRET environment variable is required. ' +
      'Generate a secure random secret with: openssl rand -hex 32'
    );
  }

  const token = await createHmacSignature(secret, payload);

  const url = `/api/products/download/${productId}?token=${token}&order=${orderId}&expires=${expires}`;

  return {
    url,
    token,
    expires,
  };
}

/**
 * Verify a download token
 */
export async function verifyDownloadToken(
  productId: string,
  orderId: string,
  userId: string,
  token: string,
  expires: number
): Promise<boolean> {
  // Check if token is expired
  if (Date.now() > expires) {
    return false;
  }

  // Recreate the expected token
  const payload = `${productId}:${orderId}:${userId}:${expires}`;

  // SECURITY: No fallback allowed - must be set in production
  const secret = process.env.DOWNLOAD_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      'DOWNLOAD_TOKEN_SECRET environment variable is required. ' +
      'Generate a secure random secret with: openssl rand -hex 32'
    );
  }

  const expectedToken = await createHmacSignature(secret, payload);

  // Compare tokens (timing-safe comparison)
  return timingSafeEqual(token, expectedToken);
}

/**
 * Log a download
 */
export async function logDownload(
  userId: string,
  productId: string,
  orderId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured');
  }
  await pool.query(
    `INSERT INTO download_logs (user_id, digital_product_id, order_id, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, productId, orderId, ipAddress, userAgent]
  );
}

/**
 * Check if user has exceeded download limit
 */
export async function hasExceededDownloadLimit(
  userId: string,
  productId: string,
  orderId: string
): Promise<boolean> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured');
  }
  const result = await pool.query(
    `SELECT 
      COUNT(dl.id) as download_count,
      dp.download_limit
    FROM digital_products dp
    LEFT JOIN download_logs dl ON dl.digital_product_id = dp.id 
      AND dl.user_id = $1 
      AND dl.order_id = $2
    WHERE dp.id = $3
    GROUP BY dp.download_limit`,
    [userId, orderId, productId]
  );
  
  if (result.rows.length === 0) {
    return false;
  }
  
  const { download_count, download_limit } = result.rows[0];
  return parseInt(download_count) >= download_limit;
}

/**
 * Get download history for a product
 */
export async function getDownloadHistory(
  userId: string,
  productId: string
): Promise<Array<{ downloaded_at: Date; ip_address?: string }>> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not configured');
  }
  const result = await pool.query(
    `SELECT downloaded_at, ip_address
     FROM download_logs
     WHERE user_id = $1 AND digital_product_id = $2
     ORDER BY downloaded_at DESC`,
    [userId, productId]
  );

  return result.rows;
}

// ============================================================================
// Cache Invalidation (T212)
// ============================================================================

/**
 * Invalidate all product caches
 *
 * Call this function when:
 * - A product is created, updated, or deleted
 * - Product data changes (price, title, etc.)
 * - Product publication status changes
 *
 * @returns Number of cache keys deleted
 *
 * @example
 * await invalidateProductCache();
 */
export async function invalidateProductCache(): Promise<number> {
  return await invalidateCache(`${CacheNamespace.PRODUCTS}:*`);
}

/**
 * Invalidate cache for a specific product
 *
 * More targeted than invalidateProductCache(), only invalidates
 * caches related to a specific product.
 *
 * @param productId - Product ID to invalidate
 * @returns Number of cache keys deleted
 *
 * @example
 * await invalidateProductCacheById('product-123');
 */
export async function invalidateProductCacheById(productId: string): Promise<number> {
  let deletedCount = 0;

  // Invalidate specific product cache
  const productKey = generateCacheKey(CacheNamespace.PRODUCTS, productId);
  deletedCount += await invalidateCache(productKey);

  // Invalidate all list caches (since product might appear in lists)
  deletedCount += await invalidateCache(`${CacheNamespace.PRODUCTS}:list:*`);

  return deletedCount;
}

/**
 * Invalidate cache for a product by slug
 *
 * @param slug - Product slug to invalidate
 * @returns Number of cache keys deleted
 *
 * @example
 * await invalidateProductCacheBySlug('my-product');
 */
export async function invalidateProductCacheBySlug(slug: string): Promise<number> {
  let deletedCount = 0;

  // Invalidate specific slug cache
  const slugKey = generateCacheKey(CacheNamespace.PRODUCTS, 'slug', slug);
  deletedCount += await invalidateCache(slugKey);

  // Invalidate all list caches
  deletedCount += await invalidateCache(`${CacheNamespace.PRODUCTS}:list:*`);

  return deletedCount;
}
