/**
 * Event Booking API Endpoint
 * 
 * POST /api/events/book
 * Creates a new event booking with capacity validation and payment processing
 * 
 * Request Body:
 * {
 *   eventId: string;      // UUID of the event to book
 *   attendees: number;    // Number of attendees (default: 1)
 * }
 * 
 * Responses:
 * - 200: Booking created successfully
 * - 400: Validation error (missing fields, invalid data)
 * - 401: Unauthorized (not logged in)
 * - 404: Event not found
 * - 409: Conflict (insufficient capacity, duplicate booking)
 * - 500: Internal server error
 */

import type { APIRoute } from 'astro';
import { bookEvent, getEventById } from '@/lib/events';
import { getSessionFromRequest } from '@/lib/auth/session';
import { createPaymentIntent } from '@/lib/stripe';
import { sendEventBookingWhatsApp } from '@/lib/whatsapp';
import { sendEventBookingEmail } from '@/lib/email';
import { query } from '@/lib/db';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  AuthenticationError 
} from '@/lib/errors';

// Disable prerendering for this API route
export const prerender = false;

/**
 * POST handler for event booking
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Authenticate user
    const session = await getSessionFromRequest(cookies);
    if (!session) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to book an event',
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Parse request body
    let body: { eventId?: string; attendees?: number };
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 3. Validate input
    const { eventId, attendees = 1 } = body;

    if (!eventId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation error',
          message: 'Event ID is required',
          details: { field: 'eventId', issue: 'missing' },
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation error',
          message: 'Invalid event ID format',
          details: { field: 'eventId', issue: 'invalid_format' },
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate attendees
    if (typeof attendees !== 'number' || attendees < 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation error',
          message: 'Attendees must be a positive number',
          details: { field: 'attendees', issue: 'invalid_value' },
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (attendees > 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation error',
          message: 'Maximum 10 attendees per booking',
          details: { field: 'attendees', issue: 'exceeds_maximum' },
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 4. Fetch event details (for payment calculation)
    const event = await getEventById(eventId);

    // 5. Create booking (includes capacity validation and atomic update)
    const booking = await bookEvent(session.userId, eventId, attendees);

    // 6. Create Stripe payment intent
    const price = typeof event.price === 'string' 
      ? parseFloat(event.price) 
      : event.price;
    const amountInCents = Math.round(price * attendees * 100); // Convert to cents

    const paymentIntent = await createPaymentIntent(
      booking.bookingId,
      amountInCents,
      'usd',
      {
        eventId: event.id,
        eventTitle: event.title,
        userId: session.userId,
        userEmail: session.email,
        attendees: attendees.toString(),
      }
    );

    // 7. Send notifications (non-blocking)
    // Note: We don't await this to avoid slowing down the API response
    // Notification failures won't affect the booking
    const sendNotifications = async () => {
      try {
        // Get user phone number
        const userResult = await query(
          'SELECT phone FROM users WHERE id = $1',
          [session.userId]
        );

        const phone = userResult.rows.length > 0 ? userResult.rows[0].phone : null;

        // Format event time
        const eventDate = new Date(event.event_date);
        const eventTime = eventDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        // Send Email notification (always)
        const emailResult = await sendEventBookingEmail({
          bookingId: booking.bookingId,
          customerName: session.name || session.email,
          customerEmail: session.email,
          eventTitle: event.title,
          eventDate: eventDate,
          eventTime: eventTime,
          venue: {
            name: event.venue_name,
            address: `${event.venue_address}, ${event.venue_city}, ${event.venue_country}`,
            mapLink: event.venue_lat && event.venue_lng 
              ? `https://www.google.com/maps?q=${event.venue_lat},${event.venue_lng}`
              : undefined,
          },
          ticketCount: booking.attendees,
          totalPrice: booking.totalPrice,
        });

        // Update email_notified flag
        if (emailResult.success) {
          await query(
            'UPDATE bookings SET email_notified = true WHERE id = $1',
            [booking.bookingId]
          );
          console.log(`[Email] Notification sent for booking ${booking.bookingId}`);
        } else {
          console.error(`[Email] Failed to send notification: ${emailResult.error}`);
        }

        // Send WhatsApp notification (only if phone available)
        if (phone) {
          const whatsappResult = await sendEventBookingWhatsApp({
            bookingId: booking.bookingId,
            customerName: session.name || session.email,
            customerPhone: phone,
            eventTitle: event.title,
            eventDate: eventDate,
            eventTime: eventTime,
            venueName: event.venue_name,
            venueAddress: `${event.venue_address}, ${event.venue_city}, ${event.venue_country}`,
            ticketCount: booking.attendees,
          });

          // Update whatsapp_notified flag
          if (whatsappResult.success) {
            await query(
              'UPDATE bookings SET whatsapp_notified = true WHERE id = $1',
              [booking.bookingId]
            );
            console.log(`[WhatsApp] Notification sent for booking ${booking.bookingId}`);
          } else {
            console.error(`[WhatsApp] Failed to send notification: ${whatsappResult.error}`);
          }
        } else {
          console.log('[WhatsApp] User has no phone number, skipping notification');
        }
      } catch (error) {
        console.error('[Notifications] Error sending notifications:', error);
        // Don't throw - notification failure shouldn't affect booking
      }
    };

    // Trigger notifications but don't wait for them
    sendNotifications();

    // 8. Return success response with booking details
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Booking created successfully',
        data: {
          booking: {
            id: booking.bookingId,
            eventId: booking.eventId,
            eventTitle: event.title,
            eventDate: event.event_date,
            venue: {
              name: event.venue_name,
              address: event.venue_address,
              city: event.venue_city,
              country: event.venue_country,
            },
            attendees: booking.attendees,
            totalPrice: booking.totalPrice,
            status: booking.status,
          },
          payment: {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: amountInCents,
            currency: 'usd',
          },
        },
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[API] Event booking error:', error);

    // Handle known error types
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation error',
          message: error.message,
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Not found',
          message: `${error.message} not found`,
        }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (error instanceof ConflictError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Conflict',
          message: error.message,
        }),
        { 
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (error instanceof AuthenticationError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: error.message,
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Unknown error
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your booking',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * OPTIONS handler for CORS preflight
 */
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
