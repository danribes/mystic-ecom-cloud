/**
 * Analytics Service
 * Tracks downloads, views, and other user interactions with digital products
 */

import { getPool } from './db';

const pool = getPool();

export interface DownloadStats {
  product_id: string;
  total_downloads: number;
  unique_users: number;
  avg_downloads_per_user: number;
  last_download: Date | null;
}

export interface ProductView {
  product_id: string;
  user_id: string | null;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  viewed_at: Date;
}

export interface PopularProduct {
  product_id: string;
  title: string;
  slug: string;
  total_downloads: number;
  total_views: number;
  unique_users: number;
  conversion_rate: number;
}

/**
 * Track a product view
 */
export async function trackProductView(
  productId: string,
  userId: string | null,
  ipAddress?: string,
  userAgent?: string,
  referrer?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO product_views (digital_product_id, user_id, ip_address, user_agent, referrer)
       VALUES ($1, $2, $3, $4, $5)`,
      [productId, userId, ipAddress, userAgent, referrer]
    );
  } catch (error) {
    console.error('Error tracking product view:', error);
    // Don't throw - analytics failures shouldn't break the user experience
  }
}

/**
 * Get download statistics for a product
 */
export async function getProductDownloadStats(productId: string): Promise<DownloadStats | null> {
  const result = await pool.query(
    `SELECT 
      digital_product_id as product_id,
      COUNT(*) as total_downloads,
      COUNT(DISTINCT user_id) as unique_users,
      ROUND(COUNT(*)::decimal / NULLIF(COUNT(DISTINCT user_id), 0), 2) as avg_downloads_per_user,
      MAX(downloaded_at) as last_download
    FROM download_logs
    WHERE digital_product_id = $1
    GROUP BY digital_product_id`,
    [productId]
  );

  if (result.rows.length === 0) {
    return {
      product_id: productId,
      total_downloads: 0,
      unique_users: 0,
      avg_downloads_per_user: 0,
      last_download: null,
    };
  }

  const row = result.rows[0];
  return {
    product_id: row.product_id,
    total_downloads: parseInt(row.total_downloads),
    unique_users: parseInt(row.unique_users),
    avg_downloads_per_user: parseFloat(row.avg_downloads_per_user) || 0,
    last_download: row.last_download,
  };
}

/**
 * Get view statistics for a product
 */
export async function getProductViewStats(productId: string): Promise<{
  total_views: number;
  unique_visitors: number;
  views_last_30_days: number;
}> {
  const result = await pool.query(
    `SELECT 
      COUNT(*) as total_views,
      COUNT(DISTINCT COALESCE(user_id::text, ip_address)) as unique_visitors,
      COUNT(*) FILTER (WHERE viewed_at > NOW() - INTERVAL '30 days') as views_last_30_days
    FROM product_views
    WHERE digital_product_id = $1`,
    [productId]
  );

  if (result.rows.length === 0) {
    return {
      total_views: 0,
      unique_visitors: 0,
      views_last_30_days: 0,
    };
  }

  const row = result.rows[0];
  return {
    total_views: parseInt(row.total_views),
    unique_visitors: parseInt(row.unique_visitors),
    views_last_30_days: parseInt(row.views_last_30_days),
  };
}

/**
 * Get most popular products
 */
export async function getPopularProducts(limit: number = 10): Promise<PopularProduct[]> {
  const result = await pool.query(
    `SELECT 
      dp.id as product_id,
      dp.title,
      dp.slug,
      COALESCE(dl_stats.total_downloads, 0) as total_downloads,
      COALESCE(pv_stats.total_views, 0) as total_views,
      COALESCE(dl_stats.unique_users, 0) as unique_users,
      CASE 
        WHEN COALESCE(pv_stats.total_views, 0) > 0 
        THEN ROUND((COALESCE(dl_stats.unique_users, 0)::decimal / pv_stats.total_views) * 100, 2)
        ELSE 0 
      END as conversion_rate
    FROM digital_products dp
    LEFT JOIN (
      SELECT 
        digital_product_id,
        COUNT(*) as total_downloads,
        COUNT(DISTINCT user_id) as unique_users
      FROM download_logs
      GROUP BY digital_product_id
    ) dl_stats ON dl_stats.digital_product_id = dp.id
    LEFT JOIN (
      SELECT 
        digital_product_id,
        COUNT(*) as total_views
      FROM product_views
      GROUP BY digital_product_id
    ) pv_stats ON pv_stats.digital_product_id = dp.id
    WHERE dp.is_published = true
    ORDER BY total_downloads DESC, total_views DESC
    LIMIT $1`,
    [limit]
  );

  return result.rows.map(row => ({
    product_id: row.product_id,
    title: row.title,
    slug: row.slug,
    total_downloads: parseInt(row.total_downloads),
    total_views: parseInt(row.total_views),
    unique_users: parseInt(row.unique_users),
    conversion_rate: parseFloat(row.conversion_rate),
  }));
}

/**
 * Get recent views for a user
 */
export async function getUserRecentViews(
  userId: string,
  limit: number = 10
): Promise<Array<{
  product_id: string;
  title: string;
  slug: string;
  image_url: string | null;
  viewed_at: Date;
}>> {
  const result = await pool.query(
    `SELECT 
      dp.id as product_id,
      dp.title,
      dp.slug,
      dp.image_url,
      pv.viewed_at
    FROM product_views pv
    INNER JOIN digital_products dp ON dp.id = pv.digital_product_id
    WHERE pv.user_id = $1
    ORDER BY pv.viewed_at DESC
    LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

/**
 * Get trending products (high views in last 7 days)
 */
export async function getTrendingProducts(limit: number = 10): Promise<PopularProduct[]> {
  const result = await pool.query(
    `SELECT 
      dp.id as product_id,
      dp.title,
      dp.slug,
      COALESCE(dl_stats.total_downloads, 0) as total_downloads,
      COALESCE(pv_stats.total_views, 0) as total_views,
      COALESCE(dl_stats.unique_users, 0) as unique_users,
      CASE 
        WHEN COALESCE(pv_stats.total_views, 0) > 0 
        THEN ROUND((COALESCE(dl_stats.unique_users, 0)::decimal / pv_stats.total_views) * 100, 2)
        ELSE 0 
      END as conversion_rate
    FROM digital_products dp
    LEFT JOIN (
      SELECT 
        digital_product_id,
        COUNT(*) as total_downloads,
        COUNT(DISTINCT user_id) as unique_users
      FROM download_logs
      WHERE downloaded_at > NOW() - INTERVAL '7 days'
      GROUP BY digital_product_id
    ) dl_stats ON dl_stats.digital_product_id = dp.id
    LEFT JOIN (
      SELECT 
        digital_product_id,
        COUNT(*) as total_views
      FROM product_views
      WHERE viewed_at > NOW() - INTERVAL '7 days'
      GROUP BY digital_product_id
    ) pv_stats ON pv_stats.digital_product_id = dp.id
    WHERE dp.is_published = true
      AND (pv_stats.total_views > 0 OR dl_stats.total_downloads > 0)
    ORDER BY pv_stats.total_views DESC, dl_stats.total_downloads DESC
    LIMIT $1`,
    [limit]
  );

  return result.rows.map(row => ({
    product_id: row.product_id,
    title: row.title,
    slug: row.slug,
    total_downloads: parseInt(row.total_downloads),
    total_views: parseInt(row.total_views),
    unique_users: parseInt(row.unique_users),
    conversion_rate: parseFloat(row.conversion_rate),
  }));
}

/**
 * Track search queries for analytics
 */
export async function trackSearch(
  query: string,
  userId: string | null,
  resultsCount: number,
  ipAddress?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO search_logs (query, user_id, results_count, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [query, userId, resultsCount, ipAddress]
    );
  } catch (error) {
    console.error('Error tracking search:', error);
    // Don't throw - analytics failures shouldn't break the user experience
  }
}

/**
 * Get popular search terms
 */
export async function getPopularSearches(limit: number = 10): Promise<Array<{
  query: string;
  search_count: number;
  avg_results: number;
}>> {
  const result = await pool.query(
    `SELECT 
      query,
      COUNT(*) as search_count,
      ROUND(AVG(results_count), 0) as avg_results
    FROM search_logs
    WHERE searched_at > NOW() - INTERVAL '30 days'
    GROUP BY query
    ORDER BY search_count DESC
    LIMIT $1`,
    [limit]
  );

  return result.rows.map(row => ({
    query: row.query,
    search_count: parseInt(row.search_count),
    avg_results: parseInt(row.avg_results),
  }));
}
