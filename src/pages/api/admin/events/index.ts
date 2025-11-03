/**
 * T089: Admin Events API - Create Event
 * 
 * POST /api/admin/events - Create a new event
 * GET /api/admin/events - List all events (admin view with unpublished)
 * 
 * Admin authentication required
 */

import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '@/lib/auth/session';
import { query } from '@/lib/db';
import { ValidationError, ConflictError } from '@/lib/errors';
import { z } from 'zod';

// ==================== Validation Schemas ====================

const EventCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be non-negative'),
  event_date: z.string().transform(val => new Date(val)),
  duration_hours: z.number().min(0.5).max(24, 'Duration must be between 0.5 and 24 hours'),
  venue_name: z.string().min(2).max(255),
  venue_address: z.string().min(5),
  venue_city: z.string().min(2).max(100),
  venue_country: z.string().min(2).max(100),
  venue_lat: z.number().min(-90).max(90).optional().nullable(),
  venue_lng: z.number().min(-180).max(180).optional().nullable(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
  available_spots: z.number().int().min(0, 'Available spots must be non-negative'),
  image_url: z.string().url().max(500).optional().nullable(),
  is_published: z.boolean().optional().default(false),
}).refine(
  (data) => data.available_spots <= data.capacity,
  {
    message: 'Available spots cannot exceed capacity',
    path: ['available_spots'],
  }
);

const EventListQuerySchema = z.object({
  status: z.enum(['published', 'unpublished', 'all']).optional().default('all'),
  city: z.string().optional(),
  country: z.string().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  search: z.string().optional(),
});

// ==================== Helper Functions ====================

/**
 * Check if user has admin role
 */
async function checkAdminAuth(cookies: any): Promise<string> {
  const session = await getSessionFromRequest(cookies);
  
  if (!session) {
    throw new ValidationError('Authentication required');
  }

  if (session.role !== 'admin') {
    throw new ValidationError('Admin access required');
  }

  return session.userId;
}

/**
 * Check if slug already exists
 */
async function checkSlugExists(slug: string): Promise<boolean> {
  const result = await query(
    'SELECT id FROM events WHERE slug = $1',
    [slug]
  );

  return result.rows.length > 0;
}

// ==================== POST Handler ====================

/**
 * POST /api/admin/events
 * Create a new event
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    await checkAdminAuth(cookies);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = EventCreateSchema.safeParse(body);

    if (!validatedData.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid event data',
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
          error: 'Event slug already exists',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate event date is in the future (for published events)
    if (data.is_published && data.event_date < new Date()) {
      return new Response(
        JSON.stringify({
          error: 'Published events must have a future date',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert event
    const result = await query(
      `INSERT INTO events (
        title, slug, description, price, event_date, duration_hours,
        venue_name, venue_address, venue_city, venue_country,
        venue_lat, venue_lng, capacity, available_spots,
        image_url, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        data.title,
        data.slug,
        data.description,
        data.price,
        data.event_date,
        data.duration_hours,
        data.venue_name,
        data.venue_address,
        data.venue_city,
        data.venue_country,
        data.venue_lat,
        data.venue_lng,
        data.capacity,
        data.available_spots,
        data.image_url,
        data.is_published ?? false,
      ]
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: result.rows[0],
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating event:', error);

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
          error: 'Event slug already exists',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to create event',
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
 * GET /api/admin/events
 * List all events (admin view includes unpublished)
 */
export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    // Check authentication
    await checkAdminAuth(cookies);

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = EventListQuerySchema.safeParse(queryParams);

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

    const { status, city, country, startDate, endDate, search } = validatedQuery.data;

    // Build query
    let queryText = `
      SELECT 
        e.*,
        (e.capacity - e.available_spots) as booked_spots,
        COUNT(b.id) as bookings_count
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id AND b.status NOT IN ('cancelled')
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by publish status
    if (status === 'published') {
      queryText += ` AND e.is_published = true`;
    } else if (status === 'unpublished') {
      queryText += ` AND e.is_published = false`;
    }
    // 'all' includes both published and unpublished

    // Filter by city
    if (city) {
      queryText += ` AND LOWER(e.venue_city) = LOWER($${paramIndex})`;
      params.push(city);
      paramIndex++;
    }

    // Filter by country
    if (country) {
      queryText += ` AND LOWER(e.venue_country) = LOWER($${paramIndex})`;
      params.push(country);
      paramIndex++;
    }

    // Filter by date range
    if (startDate) {
      queryText += ` AND e.event_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND e.event_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Search filter
    if (search) {
      queryText += ` AND (
        LOWER(e.title) LIKE LOWER($${paramIndex}) OR
        LOWER(e.description) LIKE LOWER($${paramIndex}) OR
        LOWER(e.venue_city) LIKE LOWER($${paramIndex}) OR
        LOWER(e.venue_name) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ` GROUP BY e.id`;
    queryText += ` ORDER BY e.event_date DESC, e.created_at DESC`;

    const result = await query(queryText, params);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          events: result.rows,
          count: result.rows.length,
          filters: {
            status,
            city,
            country,
            startDate,
            endDate,
            search,
          },
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching events:', error);

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
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
