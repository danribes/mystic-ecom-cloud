/**
 * T103: Admin Products API - Create Product and List Products
 * 
 * POST /api/admin/products - Create a new digital product
 * GET /api/admin/products - List all products (admin view with unpublished)
 * 
 * Admin authentication required for all operations
 */

import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { ValidationError, ConflictError, AuthenticationError, AuthorizationError } from '@/lib/errors';
import { z } from 'zod';

// ==================== Validation Schemas ====================

const ProductCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be non-negative'),
  product_type: z.enum(['pdf', 'audio', 'video', 'ebook'], {
    errorMap: () => ({ message: 'Product type must be one of: pdf, audio, video, ebook' })
  }),
  file_url: z.string().url('File URL must be a valid URL').max(500),
  file_size_mb: z.number().min(0, 'File size must be non-negative').optional().nullable(),
  preview_url: z.string().url('Preview URL must be a valid URL').max(500).optional().nullable(),
  image_url: z.string().url('Image URL must be a valid URL').max(500).optional().nullable(),
  download_limit: z.number().int().min(1, 'Download limit must be at least 1').optional().default(3),
  is_published: z.boolean().optional().default(false),
});

const ProductListQuerySchema = z.object({
  status: z.enum(['published', 'unpublished', 'all']).optional().default('all'),
  type: z.enum(['pdf', 'audio', 'video', 'ebook']).optional(),
  search: z.string().optional(),
  minPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  sortBy: z.enum(['newest', 'oldest', 'price-asc', 'price-desc', 'title-asc', 'title-desc']).optional().default('newest'),
});

// ==================== Helper Functions ====================

/**
 * Check if user has admin role
 */
async function checkAdminAuth(cookies: any): Promise<string> {
  const session = await getSessionFromRequest(cookies);
  
  if (!session) {
    throw new AuthenticationError('Authentication required');
  }

  if (session.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }

  return session.userId;
}

/**
 * Check if slug already exists
 */
async function checkSlugExists(slug: string): Promise<boolean> {
  const result = await query(
    'SELECT id FROM digital_products WHERE slug = $1',
    [slug]
  );

  return result.rows.length > 0;
}

/**
 * Get product sales statistics
 */
async function getProductStats(productId: string) {
  const result = await query(
    `SELECT 
      COUNT(DISTINCT oi.order_id) as sales_count,
      COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
      COUNT(dl.id) as total_downloads
    FROM digital_products dp
    LEFT JOIN order_items oi ON oi.digital_product_id = dp.id
    LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
    LEFT JOIN download_logs dl ON dl.digital_product_id = dp.id
    WHERE dp.id = $1
    GROUP BY dp.id`,
    [productId]
  );

  if (result.rows.length === 0) {
    return {
      sales_count: 0,
      total_revenue: 0,
      total_downloads: 0,
    };
  }

  return {
    sales_count: parseInt(result.rows[0].sales_count),
    total_revenue: parseInt(result.rows[0].total_revenue),
    total_downloads: parseInt(result.rows[0].total_downloads),
  };
}

// ==================== POST Handler ====================

/**
 * POST /api/admin/products
 * Create a new digital product
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    await checkAdminAuth(cookies);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ProductCreateSchema.safeParse(body);

    if (!validatedData.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid product data',
          details: validatedData.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = validatedData.data;

    // Check if slug already exists
    const slugExists = await checkSlugExists(data.slug);
    if (slugExists) {
      return new Response(
        JSON.stringify({
          error: 'Product slug already exists',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert product
    const result = await query(
      `INSERT INTO digital_products (
        title, slug, description, price, product_type,
        file_url, file_size_mb, preview_url, image_url,
        download_limit, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        data.title,
        data.slug,
        data.description,
        data.price,
        data.product_type,
        data.file_url,
        data.file_size_mb,
        data.preview_url,
        data.image_url,
        data.download_limit ?? 3,
        data.is_published ?? false,
      ]
    );

    const product = result.rows[0];

    return new Response(
      JSON.stringify({
        success: true,
        data: product,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating product:', error);

    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (error instanceof ConflictError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle unique constraint violation
    if ((error as any).code === '23505') {
      return new Response(
        JSON.stringify({
          error: 'Product slug already exists',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// ==================== GET Handler ====================

/**
 * GET /api/admin/products
 * List all products (admin view includes unpublished and statistics)
 */
export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    // Check authentication
    await checkAdminAuth(cookies);

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = ProductListQuerySchema.safeParse(queryParams);

    if (!validatedQuery.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid query parameters',
          details: validatedQuery.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { status, type, search, minPrice, maxPrice, sortBy } = validatedQuery.data;

    // Build query
    let queryText = `
      SELECT 
        dp.*,
        COUNT(DISTINCT oi.order_id) FILTER (WHERE o.status = 'completed') as sales_count,
        COALESCE(SUM(oi.price * oi.quantity) FILTER (WHERE o.status = 'completed'), 0) as total_revenue,
        COUNT(dl.id) as total_downloads
      FROM digital_products dp
      LEFT JOIN order_items oi ON oi.digital_product_id = dp.id
      LEFT JOIN orders o ON o.id = oi.order_id
      LEFT JOIN download_logs dl ON dl.digital_product_id = dp.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by publish status
    if (status === 'published') {
      queryText += ` AND dp.is_published = true`;
    } else if (status === 'unpublished') {
      queryText += ` AND dp.is_published = false`;
    }
    // 'all' includes both published and unpublished

    // Filter by product type
    if (type) {
      queryText += ` AND dp.product_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    // Search filter
    if (search) {
      queryText += ` AND (
        LOWER(dp.title) LIKE LOWER($${paramIndex}) OR
        LOWER(dp.description) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Price range filters
    if (minPrice !== undefined) {
      queryText += ` AND dp.price >= $${paramIndex}`;
      params.push(minPrice);
      paramIndex++;
    }

    if (maxPrice !== undefined) {
      queryText += ` AND dp.price <= $${paramIndex}`;
      params.push(maxPrice);
      paramIndex++;
    }

    queryText += ` GROUP BY dp.id`;

    // Sorting
    switch (sortBy) {
      case 'newest':
        queryText += ` ORDER BY dp.created_at DESC`;
        break;
      case 'oldest':
        queryText += ` ORDER BY dp.created_at ASC`;
        break;
      case 'price-asc':
        queryText += ` ORDER BY dp.price ASC`;
        break;
      case 'price-desc':
        queryText += ` ORDER BY dp.price DESC`;
        break;
      case 'title-asc':
        queryText += ` ORDER BY dp.title ASC`;
        break;
      case 'title-desc':
        queryText += ` ORDER BY dp.title DESC`;
        break;
      default:
        queryText += ` ORDER BY dp.created_at DESC`;
    }

    const result = await query(queryText, params);

    // Format the results
    const products = result.rows.map(row => ({
      ...row,
      sales_count: parseInt(row.sales_count || '0'),
      total_revenue: parseInt(row.total_revenue || '0'),
      total_downloads: parseInt(row.total_downloads || '0'),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          products,
          count: products.length,
          filters: {
            status,
            type,
            search,
            minPrice,
            maxPrice,
            sortBy,
          },
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching products:', error);

    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch products',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
