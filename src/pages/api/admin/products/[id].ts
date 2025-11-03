/**
 * T103: Admin Products API - Individual Product Operations
 * 
 * GET /api/admin/products/:id - Get a single product with stats
 * PUT /api/admin/products/:id - Update a product
 * DELETE /api/admin/products/:id - Delete a product
 * 
 * Admin authentication required for all operations
 */

import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { 
  NotFoundError, 
  ValidationError, 
  ConflictError,
  AuthenticationError,
  AuthorizationError
} from '@/lib/errors';
import { z } from 'zod';

// ==================== Validation Schemas ====================

const ProductUpdateSchema = z.object({
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
 * Check if slug is unique (excluding current product)
 */
async function checkSlugUniqueness(slug: string, productId: string): Promise<void> {
  const result = await query(
    'SELECT id FROM digital_products WHERE slug = $1 AND id != $2',
    [slug, productId]
  );

  if (result.rows.length > 0) {
    throw new ConflictError('Product slug already exists');
  }
}

/**
 * Get product by ID
 */
async function getProductById(productId: string) {
  const result = await query(
    'SELECT * FROM digital_products WHERE id = $1',
    [productId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Product');
  }

  return result.rows[0];
}

/**
 * Get product with statistics
 */
async function getProductWithStats(productId: string) {
  const result = await query(
    `SELECT 
      dp.*,
      COUNT(DISTINCT oi.order_id) FILTER (WHERE o.status = 'completed') as sales_count,
      COALESCE(SUM(oi.price * oi.quantity) FILTER (WHERE o.status = 'completed'), 0) as total_revenue,
      COUNT(dl.id) as total_downloads,
      COUNT(DISTINCT dl.user_id) as unique_downloaders
    FROM digital_products dp
    LEFT JOIN order_items oi ON oi.digital_product_id = dp.id
    LEFT JOIN orders o ON o.id = oi.order_id
    LEFT JOIN download_logs dl ON dl.digital_product_id = dp.id
    WHERE dp.id = $1
    GROUP BY dp.id`,
    [productId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Product');
  }

  const product = result.rows[0];
  return {
    ...product,
    sales_count: parseInt(product.sales_count || '0'),
    total_revenue: parseInt(product.total_revenue || '0'),
    total_downloads: parseInt(product.total_downloads || '0'),
    unique_downloaders: parseInt(product.unique_downloaders || '0'),
  };
}

/**
 * Check if product has any sales
 */
async function getProductSalesCount(productId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(DISTINCT oi.order_id) as count 
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE oi.digital_product_id = $1 AND o.status = 'completed'`,
    [productId]
  );

  return parseInt(result.rows[0]?.count || '0');
}

// ==================== GET Handler ====================

/**
 * GET /api/admin/products/:id
 * Get a single product with detailed statistics
 */
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    // Check authentication
    await checkAdminAuth(cookies);

    // Get product ID from params
    const productId = params.id;
    if (!productId) {
      return new Response(
        JSON.stringify({
          error: 'Product ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get product with statistics
    const product = await getProductWithStats(productId);

    return new Response(
      JSON.stringify({
        success: true,
        data: product,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching product:', error);

    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
        error: 'Failed to fetch product',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// ==================== PUT Handler ====================

/**
 * PUT /api/admin/products/:id
 * Update an existing product
 */
export const PUT: APIRoute = async ({ request, params, cookies }) => {
  try {
    // Check authentication
    await checkAdminAuth(cookies);

    // Get product ID from params
    const productId = params.id;
    if (!productId) {
      return new Response(
        JSON.stringify({
          error: 'Product ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ProductUpdateSchema.safeParse(body);

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

    // Check if product exists
    await getProductById(productId);

    // Check slug uniqueness
    await checkSlugUniqueness(data.slug, productId);

    // Update product
    const result = await query(
      `UPDATE digital_products SET
        title = $1,
        slug = $2,
        description = $3,
        price = $4,
        product_type = $5,
        file_url = $6,
        file_size_mb = $7,
        preview_url = $8,
        image_url = $9,
        download_limit = $10,
        is_published = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
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
        productId,
      ]
    );

    const product = result.rows[0];

    return new Response(
      JSON.stringify({
        success: true,
        data: product,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating product:', error);

    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (error instanceof ValidationError || error instanceof ConflictError) {
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
        error: 'Failed to update product',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// ==================== DELETE Handler ====================

/**
 * DELETE /api/admin/products/:id
 * Delete a product (only if no completed sales)
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    // Check authentication
    await checkAdminAuth(cookies);

    // Get product ID from params
    const productId = params.id;
    if (!productId) {
      return new Response(
        JSON.stringify({
          error: 'Product ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if product exists
    await getProductById(productId);

    // Check for completed sales
    const salesCount = await getProductSalesCount(productId);
    
    if (salesCount > 0) {
      return new Response(
        JSON.stringify({
          error: `Cannot delete product with ${salesCount} completed sale(s). Unpublish the product instead to hide it from customers.`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Delete product
    // Note: Download logs will be cascade deleted if configured in schema
    await query('DELETE FROM digital_products WHERE id = $1', [productId]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Product deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error deleting product:', error);

    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: error.message,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
        error: 'Failed to delete product',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
