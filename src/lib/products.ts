/**
 * Product Service Library
 * Handles digital product operations including fetching, purchasing, and download management
 */

import { getPool } from './db';
import crypto from 'crypto';

const pool = getPool();

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

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get a product by ID
 */
export async function getProductById(productId: string): Promise<DigitalProduct | null> {
  const result = await pool.query(
    'SELECT * FROM digital_products WHERE id = $1 AND is_published = true',
    [productId]
  );
  return result.rows[0] || null;
}

/**
 * Get a product by slug
 */
export async function getProductBySlug(slug: string): Promise<DigitalProduct | null> {
  const result = await pool.query(
    'SELECT * FROM digital_products WHERE slug = $1 AND is_published = true',
    [slug]
  );
  return result.rows[0] || null;
}

/**
 * Check if user has purchased a product
 */
export async function hasUserPurchasedProduct(
  userId: string,
  productId: string
): Promise<ProductOrder | null> {
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
export function generateDownloadLink(
  productId: string,
  orderId: string,
  userId: string,
  expiresInMinutes: number = 15
): DownloadLink {
  const expires = Date.now() + (expiresInMinutes * 60 * 1000);
  
  // Create a token that includes the product, order, user, and expiry
  const payload = `${productId}:${orderId}:${userId}:${expires}`;
  
  // Sign the payload with a secret
  const secret = process.env.DOWNLOAD_TOKEN_SECRET || 'your-secret-key-change-in-production';
  const token = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  
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
export function verifyDownloadToken(
  productId: string,
  orderId: string,
  userId: string,
  token: string,
  expires: number
): boolean {
  // Check if token is expired
  if (Date.now() > expires) {
    return false;
  }
  
  // Recreate the expected token
  const payload = `${productId}:${orderId}:${userId}:${expires}`;
  const secret = process.env.DOWNLOAD_TOKEN_SECRET || 'your-secret-key-change-in-production';
  const expectedToken = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');
  
  // Compare tokens (timing-safe comparison)
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  );
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
  const result = await pool.query(
    `SELECT downloaded_at, ip_address
     FROM download_logs
     WHERE user_id = $1 AND digital_product_id = $2
     ORDER BY downloaded_at DESC`,
    [userId, productId]
  );
  
  return result.rows;
}
