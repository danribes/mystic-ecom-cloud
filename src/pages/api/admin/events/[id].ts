/**
 * T089: Admin Events API - Individual Event Operations
 * 
 * PUT /api/admin/events/:id - Update an event
 * DELETE /api/admin/events/:id - Delete an event
 * 
 * Admin authentication required for all operations
 */

import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '@/lib/auth/session';
import { query, transaction } from '@/lib/db';
import { 
  NotFoundError, 
  ValidationError, 
  DatabaseError,
  ConflictError 
} from '@/lib/errors';
import { z } from 'zod';

// ==================== Validation Schemas ====================

const EventUpdateSchema = z.object({
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
  // Spanish translation fields (T168 i18n)
  title_es: z.string().max(255).optional().nullable(),
  description_es: z.string().optional().nullable(),
  venue_name_es: z.string().max(255).optional().nullable(),
  venue_address_es: z.string().optional().nullable(),
}).refine(
  (data) => data.available_spots <= data.capacity,
  {
    message: 'Available spots cannot exceed capacity',
    path: ['available_spots'],
  }
);

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
 * Check if slug is unique (excluding current event)
 */
async function checkSlugUniqueness(slug: string, eventId: string): Promise<void> {
  const result = await query(
    'SELECT id FROM events WHERE slug = $1 AND id != $2',
    [slug, eventId]
  );

  if (result.rows.length > 0) {
    throw new ConflictError('Event slug already exists');
  }
}

/**
 * Get event by ID
 */
async function getEventById(eventId: string) {
  const result = await query(
    'SELECT * FROM events WHERE id = $1',
    [eventId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Event');
  }

  return result.rows[0];
}

/**
 * Check if event has any bookings
 */
async function getEventBookingsCount(eventId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM bookings 
     WHERE event_id = $1 AND status NOT IN ('cancelled')`,
    [eventId]
  );

  return parseInt(result.rows[0]?.count || '0');
}

// ==================== PUT Handler ====================

/**
 * PUT /api/admin/events/:id
 * Update an existing event
 */
export const PUT: APIRoute = async ({ request, params, cookies }) => {
  try {
    // Check authentication
    await checkAdminAuth(cookies);

    // Get event ID from params
    const eventId = params.id;
    if (!eventId) {
      return new Response(
        JSON.stringify({
          error: 'Event ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = EventUpdateSchema.safeParse(body);

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

    // Check if event exists
    const existingEvent = await getEventById(eventId);

    // Check slug uniqueness
    await checkSlugUniqueness(data.slug, eventId);

    // Check if capacity reduction affects existing bookings
    const bookedSpots = existingEvent.capacity - existingEvent.available_spots;
    if (data.capacity < bookedSpots) {
      return new Response(
        JSON.stringify({
          error: `Cannot reduce capacity below ${bookedSpots} (existing bookings)`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate available spots with new capacity
    if (data.available_spots > data.capacity) {
      return new Response(
        JSON.stringify({
          error: 'Available spots cannot exceed capacity',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Ensure available spots respects existing bookings
    const maxAvailableSpots = data.capacity - bookedSpots;
    if (data.available_spots > maxAvailableSpots) {
      return new Response(
        JSON.stringify({
          error: `Available spots cannot exceed ${maxAvailableSpots} (${bookedSpots} spots are already booked)`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Update event
    const result = await query(
      `UPDATE events SET
        title = $1,
        slug = $2,
        description = $3,
        price = $4,
        event_date = $5,
        duration_hours = $6,
        venue_name = $7,
        venue_address = $8,
        venue_city = $9,
        venue_country = $10,
        venue_lat = $11,
        venue_lng = $12,
        capacity = $13,
        available_spots = $14,
        image_url = $15,
        is_published = $16,
        title_es = $17,
        description_es = $18,
        venue_name_es = $19,
        venue_address_es = $20,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
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
        data.title_es || null,
        data.description_es || null,
        data.venue_name_es || null,
        data.venue_address_es || null,
        eventId,
      ]
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: result.rows[0],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating event:', error);

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

    return new Response(
      JSON.stringify({
        error: 'Failed to update event',
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
 * DELETE /api/admin/events/:id
 * Delete an event (only if no active bookings)
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    // Check authentication
    await checkAdminAuth(cookies);

    // Get event ID from params
    const eventId = params.id;
    if (!eventId) {
      return new Response(
        JSON.stringify({
          error: 'Event ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if event exists
    await getEventById(eventId);

    // Check for active bookings
    const bookingsCount = await getEventBookingsCount(eventId);
    
    if (bookingsCount > 0) {
      return new Response(
        JSON.stringify({
          error: `Cannot delete event with ${bookingsCount} active booking(s). Cancel bookings first or unpublish the event.`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Delete event
    await query('DELETE FROM events WHERE id = $1', [eventId]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Event deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error deleting event:', error);

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
        error: 'Failed to delete event',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
