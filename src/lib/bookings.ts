/**
 * Booking Service
 * 
 * Business logic for booking management including creating bookings,
 * retrieving booking details, and managing user bookings.
 * 
 * This service acts as a higher-level abstraction over the event service's
 * bookEvent function, adding order integration and additional booking management.
 */

import { query, transaction } from './db';
import { bookEvent as createEventBooking } from './events';
import { 
  NotFoundError, 
  ValidationError, 
  DatabaseError,
  ConflictError 
} from './errors';

/**
 * Booking type definition
 */
export interface Booking {
  id: string;
  user_id: string;
  event_id: string;
  order_id: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'attended';
  attendees: number;
  total_price: number;
  whatsapp_notified: boolean;
  email_notified: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Booking with event details (for user-facing displays)
 */
export interface BookingWithEvent extends Booking {
  event: {
    title: string;
    slug: string;
    event_date: Date;
    duration_hours: number;
    venue_name: string;
    venue_address: string;
    venue_city: string;
    venue_country: string;
    image_url: string | null;
  };
}

/**
 * Create booking options
 */
export interface CreateBookingOptions {
  userId: string;
  eventId: string;
  attendees?: number;
  orderId?: string;
  status?: 'pending' | 'confirmed';
}

/**
 * User bookings filter options
 */
export interface UserBookingsFilters {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'attended';
  includeEvent?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Create a new booking for an event
 * 
 * This is a higher-level wrapper around the event service's bookEvent function
 * that adds order integration and returns a full booking object.
 * 
 * @param options - Booking creation options
 * @returns Created booking with full details
 * @throws ValidationError if parameters are invalid
 * @throws NotFoundError if event doesn't exist
 * @throws ConflictError if capacity exceeded or duplicate booking
 */
export async function createBooking(
  options: CreateBookingOptions
): Promise<Booking> {
  const { userId, eventId, attendees = 1, orderId, status = 'pending' } = options;

  // Validate inputs
  if (!userId || !eventId) {
    throw new ValidationError('User ID and Event ID are required');
  }

  if (attendees < 1) {
    throw new ValidationError('Number of attendees must be at least 1');
  }

  try {
    // Use the event service to create the booking with transaction safety
    const bookingResult = await createEventBooking(userId, eventId, attendees);

    // If orderId provided, update the booking with order reference
    if (orderId) {
      await query(
        `UPDATE bookings 
         SET order_id = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [orderId, status, bookingResult.bookingId]
      );
    } else if (status !== 'pending') {
      // Update status if different from default
      await query(
        `UPDATE bookings 
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [status, bookingResult.bookingId]
      );
    }

    // Fetch and return the complete booking
    const result = await query(
      `SELECT 
        id, user_id, event_id, order_id, status, attendees, 
        total_price, whatsapp_notified, email_notified, 
        created_at, updated_at
       FROM bookings
       WHERE id = $1`,
      [bookingResult.bookingId]
    );

    if (result.rows.length === 0) {
      throw new DatabaseError('Booking created but could not be retrieved');
    }

    return result.rows[0] as Booking;
  } catch (error) {
    // Re-throw known errors (including ConflictError from event service)
    if (
      error instanceof NotFoundError ||
      error instanceof ValidationError ||
      error instanceof DatabaseError ||
      error instanceof ConflictError
    ) {
      throw error;
    }

    console.error('[Bookings] Error creating booking:', error);
    throw new DatabaseError('Failed to create booking');
  }
}

/**
 * Get a booking by ID
 * 
 * @param bookingId - Booking UUID
 * @param includeEvent - Whether to include event details (default: false)
 * @returns Booking details
 * @throws NotFoundError if booking doesn't exist
 */
export async function getBookingById(
  bookingId: string,
  includeEvent: boolean = false
): Promise<Booking | BookingWithEvent> {
  if (!bookingId) {
    throw new ValidationError('Booking ID is required');
  }

  try {
    let queryText: string;
    
    if (includeEvent) {
      queryText = `
        SELECT 
          b.id, b.user_id, b.event_id, b.order_id, b.status, b.attendees, 
          b.total_price, b.whatsapp_notified, b.email_notified, 
          b.created_at, b.updated_at,
          e.title as event_title,
          e.slug as event_slug,
          e.event_date,
          e.duration_hours,
          e.venue_name,
          e.venue_address,
          e.venue_city,
          e.venue_country,
          e.image_url as event_image_url
        FROM bookings b
        INNER JOIN events e ON b.event_id = e.id
        WHERE b.id = $1
      `;
    } else {
      queryText = `
        SELECT 
          id, user_id, event_id, order_id, status, attendees, 
          total_price, whatsapp_notified, email_notified, 
          created_at, updated_at
        FROM bookings
        WHERE id = $1
      `;
    }

    const result = await query(queryText, [bookingId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Booking');
    }

    const row = result.rows[0];

    if (includeEvent) {
      // Transform flat result into nested structure
      return {
        id: row.id,
        user_id: row.user_id,
        event_id: row.event_id,
        order_id: row.order_id,
        status: row.status,
        attendees: row.attendees,
        total_price: row.total_price,
        whatsapp_notified: row.whatsapp_notified,
        email_notified: row.email_notified,
        created_at: row.created_at,
        updated_at: row.updated_at,
        event: {
          title: row.event_title,
          slug: row.event_slug,
          event_date: row.event_date,
          duration_hours: row.duration_hours,
          venue_name: row.venue_name,
          venue_address: row.venue_address,
          venue_city: row.venue_city,
          venue_country: row.venue_country,
          image_url: row.event_image_url,
        },
      } as BookingWithEvent;
    }

    return row as Booking;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    console.error('[Bookings] Error fetching booking:', error);
    throw new DatabaseError('Failed to retrieve booking');
  }
}

/**
 * Get all bookings for a specific user
 * 
 * @param userId - User UUID
 * @param filters - Optional filters for status, pagination, etc.
 * @returns Array of user bookings
 * @throws ValidationError if userId is missing
 */
export async function getUserBookings(
  userId: string,
  filters?: UserBookingsFilters
): Promise<(Booking | BookingWithEvent)[]> {
  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const {
    status,
    includeEvent = true,
    limit = 50,
    offset = 0,
  } = filters || {};

  try {
    let queryText: string;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (includeEvent) {
      queryText = `
        SELECT 
          b.id, b.user_id, b.event_id, b.order_id, b.status, b.attendees, 
          b.total_price, b.whatsapp_notified, b.email_notified, 
          b.created_at, b.updated_at,
          e.title as event_title,
          e.slug as event_slug,
          e.event_date,
          e.duration_hours,
          e.venue_name,
          e.venue_address,
          e.venue_city,
          e.venue_country,
          e.image_url as event_image_url
        FROM bookings b
        INNER JOIN events e ON b.event_id = e.id
        WHERE b.user_id = $1
      `;
    } else {
      queryText = `
        SELECT 
          id, user_id, event_id, order_id, status, attendees, 
          total_price, whatsapp_notified, email_notified, 
          created_at, updated_at
        FROM bookings
        WHERE user_id = $1
      `;
    }

    // Add status filter if provided
    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Order by event date descending (newest first)
    queryText += includeEvent 
      ? ` ORDER BY e.event_date DESC` 
      : ` ORDER BY created_at DESC`;

    // Add pagination
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    if (includeEvent) {
      // Transform flat results into nested structure
      return result.rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        event_id: row.event_id,
        order_id: row.order_id,
        status: row.status,
        attendees: row.attendees,
        total_price: row.total_price,
        whatsapp_notified: row.whatsapp_notified,
        email_notified: row.email_notified,
        created_at: row.created_at,
        updated_at: row.updated_at,
        event: {
          title: row.event_title,
          slug: row.event_slug,
          event_date: row.event_date,
          duration_hours: row.duration_hours,
          venue_name: row.venue_name,
          venue_address: row.venue_address,
          venue_city: row.venue_city,
          venue_country: row.venue_country,
          image_url: row.event_image_url,
        },
      })) as BookingWithEvent[];
    }

    return result.rows as Booking[];
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    console.error('[Bookings] Error fetching user bookings:', error);
    throw new DatabaseError('Failed to retrieve user bookings');
  }
}

/**
 * Update booking notification status
 * 
 * @param bookingId - Booking UUID
 * @param type - Notification type ('email' or 'whatsapp')
 * @returns Updated booking
 */
export async function markNotificationSent(
  bookingId: string,
  type: 'email' | 'whatsapp'
): Promise<Booking> {
  if (!bookingId) {
    throw new ValidationError('Booking ID is required');
  }

  if (type !== 'email' && type !== 'whatsapp') {
    throw new ValidationError('Notification type must be "email" or "whatsapp"');
  }

  try {
    const field = type === 'email' ? 'email_notified' : 'whatsapp_notified';
    
    const result = await query(
      `UPDATE bookings 
       SET ${field} = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, user_id, event_id, order_id, status, attendees, 
                 total_price, whatsapp_notified, email_notified, 
                 created_at, updated_at`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Booking');
    }

    return result.rows[0] as Booking;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    console.error('[Bookings] Error updating notification status:', error);
    throw new DatabaseError('Failed to update notification status');
  }
}

/**
 * Update booking status
 * 
 * @param bookingId - Booking UUID
 * @param newStatus - New booking status
 * @returns Updated booking
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: 'pending' | 'confirmed' | 'cancelled' | 'attended'
): Promise<Booking> {
  if (!bookingId) {
    throw new ValidationError('Booking ID is required');
  }

  const validStatuses = ['pending', 'confirmed', 'cancelled', 'attended'];
  if (!validStatuses.includes(newStatus)) {
    throw new ValidationError('Invalid booking status');
  }

  try {
    const result = await query(
      `UPDATE bookings 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, user_id, event_id, order_id, status, attendees, 
                 total_price, whatsapp_notified, email_notified, 
                 created_at, updated_at`,
      [newStatus, bookingId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Booking');
    }

    return result.rows[0] as Booking;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      throw error;
    }

    console.error('[Bookings] Error updating booking status:', error);
    throw new DatabaseError('Failed to update booking status');
  }
}

/**
 * Get booking count for a specific event
 * 
 * Useful for admin views and capacity management
 * 
 * @param eventId - Event UUID
 * @param status - Optional status filter
 * @returns Count of bookings
 */
export async function getEventBookingCount(
  eventId: string,
  status?: 'pending' | 'confirmed' | 'cancelled' | 'attended'
): Promise<number> {
  if (!eventId) {
    throw new ValidationError('Event ID is required');
  }

  try {
    let queryText = 'SELECT COUNT(*) as count FROM bookings WHERE event_id = $1';
    const params: any[] = [eventId];

    if (status) {
      queryText += ' AND status = $2';
      params.push(status);
    }

    const result = await query(queryText, params);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('[Bookings] Error counting event bookings:', error);
    throw new DatabaseError('Failed to count event bookings');
  }
}

/**
 * Get total attendees for a specific event
 * 
 * Sums up all attendees across all bookings (useful for capacity tracking)
 * 
 * @param eventId - Event UUID
 * @param includeStatuses - Statuses to include (default: ['confirmed', 'pending'])
 * @returns Total number of attendees
 */
export async function getEventTotalAttendees(
  eventId: string,
  includeStatuses: string[] = ['confirmed', 'pending']
): Promise<number> {
  if (!eventId) {
    throw new ValidationError('Event ID is required');
  }

  try {
    const result = await query(
      `SELECT COALESCE(SUM(attendees), 0) as total
       FROM bookings
       WHERE event_id = $1 AND status = ANY($2)`,
      [eventId, includeStatuses]
    );

    return parseInt(result.rows[0].total, 10);
  } catch (error) {
    console.error('[Bookings] Error calculating total attendees:', error);
    throw new DatabaseError('Failed to calculate total attendees');
  }
}
