/**
 * Event Service
 * 
 * Business logic for event management including retrieving events,
 * checking capacity, and booking functionality.
 */

import { query, transaction } from './db';
import { 
  NotFoundError, 
  ValidationError, 
  ConflictError, 
  DatabaseError 
} from './errors';

/**
 * Event type definition
 */
export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: string | number;
  event_date: Date;
  duration_hours: number;
  venue_name: string;
  venue_address: string;
  venue_city: string;
  venue_country: string;
  venue_lat?: string | number;
  venue_lng?: string | number;
  capacity: number;
  available_spots: number;
  image_url?: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Event filters for querying
 */
export interface EventFilters {
  city?: string;
  country?: string;
  startDate?: Date;
  endDate?: Date;
  isPublished?: boolean;
  minAvailableSpots?: number;
  minPrice?: number;
  maxPrice?: number;
  timeFrame?: 'all' | 'upcoming' | 'this-week' | 'this-month' | 'custom';
  availability?: 'all' | 'available' | 'limited';
  limit?: number;
  offset?: number;
}

/**
 * Booking result interface
 */
export interface BookingResult {
  bookingId: string;
  eventId: string;
  userId: string;
  attendees: number;
  totalPrice: number;
  status: string;
}

/**
 * Get all events with optional filters
 * 
 * @param filters - Optional filters for querying events
 * @returns Array of events matching the filters
 */
export async function getEvents(filters?: EventFilters): Promise<Event[]> {
  try {
    let queryText = `
      SELECT 
        id, title, slug, description, price, event_date, duration_hours,
        venue_name, venue_address, venue_city, venue_country, 
        venue_lat, venue_lng, capacity, available_spots, image_url,
        is_published, created_at, updated_at
      FROM events
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters?.isPublished !== undefined) {
      queryText += ` AND is_published = $${paramIndex}`;
      params.push(filters.isPublished);
      paramIndex++;
    } else {
      // Default to only published events if not specified
      queryText += ` AND is_published = true`;
    }

    if (filters?.city) {
      queryText += ` AND LOWER(venue_city) = LOWER($${paramIndex})`;
      params.push(filters.city);
      paramIndex++;
    }

    if (filters?.country) {
      queryText += ` AND LOWER(venue_country) = LOWER($${paramIndex})`;
      params.push(filters.country);
      paramIndex++;
    }

    // Time frame filter
    if (filters?.timeFrame && filters.timeFrame !== 'all') {
      const now = new Date();
      
      if (filters.timeFrame === 'upcoming') {
        queryText += ` AND event_date >= $${paramIndex}`;
        params.push(now);
        paramIndex++;
      } else if (filters.timeFrame === 'this-week') {
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + 7);
        queryText += ` AND event_date >= $${paramIndex} AND event_date <= $${paramIndex + 1}`;
        params.push(now, weekEnd);
        paramIndex += 2;
      } else if (filters.timeFrame === 'this-month') {
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        queryText += ` AND event_date >= $${paramIndex} AND event_date <= $${paramIndex + 1}`;
        params.push(now, monthEnd);
        paramIndex += 2;
      }
    }

    // Custom date range (only if timeFrame is 'custom' or not specified)
    if (filters?.startDate && (!filters.timeFrame || filters.timeFrame === 'custom' || filters.timeFrame === 'all')) {
      queryText += ` AND event_date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate && (!filters.timeFrame || filters.timeFrame === 'custom' || filters.timeFrame === 'all')) {
      queryText += ` AND event_date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    // Price range filters
    if (filters?.minPrice !== undefined) {
      queryText += ` AND price >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }

    if (filters?.maxPrice !== undefined) {
      queryText += ` AND price <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }

    // Availability filter
    if (filters?.availability && filters.availability !== 'all') {
      if (filters.availability === 'available') {
        queryText += ` AND available_spots > 0`;
      } else if (filters.availability === 'limited') {
        // Limited: less than 20% capacity remaining
        queryText += ` AND available_spots > 0 AND (CAST(available_spots AS FLOAT) / CAST(capacity AS FLOAT)) < 0.2`;
      }
    }

    // Legacy minAvailableSpots filter (for backwards compatibility)
    if (filters?.minAvailableSpots !== undefined) {
      queryText += ` AND available_spots >= $${paramIndex}`;
      params.push(filters.minAvailableSpots);
      paramIndex++;
    }

    // Order by event date ascending (soonest first)
    queryText += ` ORDER BY event_date ASC, created_at DESC`;

    // Pagination
    if (filters?.limit !== undefined) {
      queryText += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
      
      if (filters?.offset !== undefined) {
        queryText += ` OFFSET $${paramIndex}`;
        params.push(filters.offset);
        paramIndex++;
      }
    }

    const result = await query<Event>(queryText, params);
    return result.rows;
  } catch (error) {
    console.error('[Events] Error fetching events:', error);
    throw new DatabaseError('Failed to fetch events');
  }
}

/**
 * Get a single event by ID or slug
 * 
 * @param identifier - Event ID (UUID) or slug
 * @returns Event object or null if not found
 * @throws NotFoundError if event doesn't exist
 */
export async function getEventById(identifier: string): Promise<Event> {
  try {
    // Determine if identifier is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    const queryText = `
      SELECT 
        id, title, slug, description, price, event_date, duration_hours,
        venue_name, venue_address, venue_city, venue_country, 
        venue_lat, venue_lng, capacity, available_spots, image_url,
        is_published, created_at, updated_at
      FROM events
      WHERE ${isUUID ? 'id' : 'slug'} = $1
    `;

    const result = await query<Event>(queryText, [identifier]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Event');
    }

    return result.rows[0]!;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    console.error('[Events] Error fetching event by ID:', error);
    throw new DatabaseError('Failed to fetch event');
  }
}

/**
 * Check event capacity availability
 * 
 * @param eventId - Event UUID
 * @param requestedSpots - Number of spots being requested
 * @returns Object indicating if spots are available and current availability
 */
export async function checkCapacity(
  eventId: string,
  requestedSpots: number
): Promise<{ available: boolean; availableSpots: number; capacity: number }> {
  try {
    // Validate requested spots
    if (requestedSpots < 1) {
      throw new ValidationError('Requested spots must be at least 1');
    }

    const result = await query<{ available_spots: number; capacity: number }>(
      'SELECT available_spots, capacity FROM events WHERE id = $1',
      [eventId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Event');
    }

    const { available_spots, capacity } = result.rows[0]!;

    return {
      available: available_spots >= requestedSpots,
      availableSpots: available_spots,
      capacity,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }
    console.error('[Events] Error checking capacity:', error);
    throw new DatabaseError('Failed to check event capacity');
  }
}

/**
 * Book an event (create booking and update available spots)
 * 
 * @param userId - User UUID making the booking
 * @param eventId - Event UUID to book
 * @param attendees - Number of attendees (default: 1)
 * @returns Booking result with booking ID and details
 * @throws ValidationError if invalid parameters
 * @throws NotFoundError if event doesn't exist
 * @throws ConflictError if insufficient capacity or duplicate booking
 */
export async function bookEvent(
  userId: string,
  eventId: string,
  attendees: number = 1
): Promise<BookingResult> {
  // Validate inputs
  if (!userId || !eventId) {
    throw new ValidationError('User ID and Event ID are required');
  }

  if (attendees < 1) {
    throw new ValidationError('Number of attendees must be at least 1');
  }

  try {
    // Use transaction to ensure atomicity
    const result = await transaction(async (client) => {
      // 1. Lock the event row and fetch event details
      const eventResult = await client.query(
        `SELECT id, title, price, available_spots, capacity, is_published, event_date
         FROM events 
         WHERE id = $1 
         FOR UPDATE`,
        [eventId]
      );

      if (eventResult.rows.length === 0) {
        throw new NotFoundError('Event');
      }

      const event = eventResult.rows[0] as Event;

      // 2. Validate event is published
      if (!event.is_published) {
        throw new ValidationError('Event is not available for booking');
      }

      // 3. Validate event is in the future
      if (new Date(event.event_date) < new Date()) {
        throw new ValidationError('Cannot book past events');
      }

      // 4. Check if user already has a booking for this event
      const existingBookingResult = await client.query(
        'SELECT id FROM bookings WHERE user_id = $1 AND event_id = $2',
        [userId, eventId]
      );

      if (existingBookingResult.rows.length > 0) {
        throw new ConflictError('You already have a booking for this event');
      }

      // 5. Check capacity
      if (event.available_spots < attendees) {
        throw new ConflictError(
          `Insufficient capacity. Only ${event.available_spots} spot(s) available`
        );
      }

      // 6. Calculate total price
      const pricePerPerson = typeof event.price === 'string' 
        ? parseFloat(event.price) 
        : event.price;
      const totalPrice = pricePerPerson * attendees;

      // 7. Create booking
      const bookingResult = await client.query(
        `INSERT INTO bookings (user_id, event_id, attendees, total_price, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING id, status`,
        [userId, eventId, attendees, totalPrice]
      );

      const booking = bookingResult.rows[0] as { id: string; status: string };

      // 8. Update available spots
      await client.query(
        `UPDATE events 
         SET available_spots = available_spots - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [attendees, eventId]
      );

      return {
        bookingId: booking.id,
        eventId,
        userId,
        attendees,
        totalPrice,
        status: booking.status,
      };
    });

    return result;
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof ValidationError ||
      error instanceof ConflictError
    ) {
      throw error;
    }

    // Handle unique constraint violation (race condition)
    if ((error as any).code === '23505') {
      throw new ConflictError('You already have a booking for this event');
    }

    console.error('[Events] Error booking event:', error);
    throw new DatabaseError('Failed to create booking');
  }
}

/**
 * Cancel a booking and restore available spots
 * 
 * @param bookingId - Booking UUID to cancel
 * @param userId - User UUID (for authorization check)
 * @returns Success status
 * @throws NotFoundError if booking doesn't exist
 * @throws ValidationError if booking already cancelled/completed
 */
export async function cancelBooking(
  bookingId: string,
  userId: string
): Promise<{ success: boolean; refundedSpots: number }> {
  if (!bookingId || !userId) {
    throw new ValidationError('Booking ID and User ID are required');
  }

  try {
    const result = await transaction(async (client) => {
      // 1. Fetch and lock booking
      const bookingResult = await client.query(
        `SELECT id, user_id, event_id, attendees, status
         FROM bookings
         WHERE id = $1
         FOR UPDATE`,
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        throw new NotFoundError('Booking');
      }

      const booking = bookingResult.rows[0] as {
        id: string;
        user_id: string;
        event_id: string;
        attendees: number;
        status: string;
      };

      // 2. Verify ownership
      if (booking.user_id !== userId) {
        throw new ValidationError('You do not have permission to cancel this booking');
      }

      // 3. Verify status
      if (booking.status === 'cancelled') {
        throw new ValidationError('Booking is already cancelled');
      }

      if (booking.status === 'completed') {
        throw new ValidationError('Cannot cancel completed booking');
      }

      // 4. Update booking status
      await client.query(
        `UPDATE bookings 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [bookingId]
      );

      // 5. Restore available spots
      await client.query(
        `UPDATE events 
         SET available_spots = available_spots + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [booking.attendees, booking.event_id]
      );

      return {
        success: true,
        refundedSpots: booking.attendees,
      };
    });

    return result;
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof ValidationError
    ) {
      throw error;
    }

    console.error('[Events] Error cancelling booking:', error);
    throw new DatabaseError('Failed to cancel booking');
  }
}

/**
 * Get upcoming events (future events only)
 * 
 * @param limit - Maximum number of events to return (default: 10)
 * @returns Array of upcoming events
 */
export async function getUpcomingEvents(limit: number = 10): Promise<Event[]> {
  return getEvents({
    startDate: new Date(),
    isPublished: true,
  });
}

/**
 * Get events by city
 * 
 * @param city - City name
 * @returns Array of events in the specified city
 */
export async function getEventsByCity(city: string): Promise<Event[]> {
  return getEvents({
    city,
    isPublished: true,
    startDate: new Date(),
  });
}

/**
 * Search events by title or description
 * 
 * @param searchTerm - Search term
 * @returns Array of matching events
 */
export async function searchEvents(searchTerm: string): Promise<Event[]> {
  try {
    const queryText = `
      SELECT 
        id, title, slug, description, price, event_date, duration_hours,
        venue_name, venue_address, venue_city, venue_country, 
        venue_lat, venue_lng, capacity, available_spots, image_url,
        is_published, created_at, updated_at
      FROM events
      WHERE is_published = true
        AND event_date >= CURRENT_TIMESTAMP
        AND (
          LOWER(title) LIKE LOWER($1) OR
          LOWER(description) LIKE LOWER($1) OR
          LOWER(venue_city) LIKE LOWER($1)
        )
      ORDER BY event_date ASC
    `;

    const searchPattern = `%${searchTerm}%`;
    const result = await query<Event>(queryText, [searchPattern]);

    return result.rows;
  } catch (error) {
    console.error('[Events] Error searching events:', error);
    throw new DatabaseError('Failed to search events');
  }
}
