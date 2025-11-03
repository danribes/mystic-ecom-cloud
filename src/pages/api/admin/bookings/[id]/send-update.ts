/**
 * T090: Admin Booking Management API
 * 
 * API endpoints for managing event bookings:
 * - Send updates to attendees (email and WhatsApp)
 * - Export booking data to CSV
 */

import type { APIRoute } from 'astro';
import { query } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { ValidationError } from '@/lib/errors';

/**
 * POST - Send update to event attendees
 */
export const POST: APIRoute = async ({ request, params, cookies }) => {
  try {
    // 1. Check admin authentication
    const session = await getSessionFromRequest(cookies);
    
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (session.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Get event ID from params
    const eventId = params.id;
    if (!eventId) {
      throw new ValidationError('Event ID is required');
    }

    // 3. Parse request body
    const body = await request.json();
    const { subject, message, sendWhatsapp, recipient } = body;

    if (!subject || !message) {
      throw new ValidationError('Subject and message are required');
    }

    // 4. Determine which bookings to send to
    let bookings;
    if (recipient === 'all') {
      // Get all confirmed bookings for this event
      const result = await query(
        `SELECT 
          b.id,
          b.user_id,
          u.email,
          u.name,
          u.phone_number
        FROM bookings b
        INNER JOIN users u ON b.user_id = u.id
        WHERE b.event_id = $1 AND b.status = 'confirmed'`,
        [eventId]
      );
      bookings = result.rows;
    } else {
      // Send to specific booking
      const result = await query(
        `SELECT 
          b.id,
          b.user_id,
          u.email,
          u.name,
          u.phone_number
        FROM bookings b
        INNER JOIN users u ON b.user_id = u.id
        WHERE b.id = $1 AND b.event_id = $2`,
        [recipient.id, eventId]
      );
      bookings = result.rows;
    }

    if (bookings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No bookings found to send updates to' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 5. Get event details for the message
    const eventResult = await query(
      'SELECT title, event_date FROM events WHERE id = $1',
      [eventId]
    );
    const event = eventResult.rows[0];

    if (!event) {
      throw new ValidationError('Event not found');
    }

    // 6. Send emails to all recipients
    let emailsSent = 0;
    let whatsappSent = 0;

    for (const booking of bookings) {
      // Send email
      try {
        // In a real implementation, you would integrate with an email service
        // For now, we'll just log and mark as notified
        console.log(`Sending email to ${booking.email}:`, {
          subject,
          message,
          eventTitle: event.title,
          eventDate: event.event_date,
        });

        // Update email_notified flag
        await query(
          'UPDATE bookings SET email_notified = true WHERE id = $1',
          [booking.id]
        );
        emailsSent++;
      } catch (error) {
        console.error(`Failed to send email to ${booking.email}:`, error);
      }

      // Send WhatsApp if requested and phone number available
      if (sendWhatsapp && booking.phone_number) {
        try {
          // In a real implementation, you would integrate with WhatsApp Business API
          // For now, we'll just log and mark as notified
          console.log(`Sending WhatsApp to ${booking.phone_number}:`, {
            message,
            eventTitle: event.title,
            eventDate: event.event_date,
          });

          // Update whatsapp_notified flag
          await query(
            'UPDATE bookings SET whatsapp_notified = true WHERE id = $1',
            [booking.id]
          );
          whatsappSent++;
        } catch (error) {
          console.error(`Failed to send WhatsApp to ${booking.phone_number}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Updates sent successfully',
        stats: {
          totalRecipients: bookings.length,
          emailsSent,
          whatsappSent,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending updates:', error);

    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to send updates',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * GET - Export bookings to CSV
 */
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    // 1. Check admin authentication
    const session = await getSessionFromRequest(cookies);
    
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (session.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Get event ID from params
    const eventId = params.id;
    if (!eventId) {
      throw new ValidationError('Event ID is required');
    }

    // 3. Get event details
    const eventResult = await query(
      'SELECT title, event_date FROM events WHERE id = $1',
      [eventId]
    );
    const event = eventResult.rows[0];

    if (!event) {
      throw new ValidationError('Event not found');
    }

    // 4. Get all bookings with user details
    const bookingsResult = await query(
      `SELECT 
        b.id,
        u.name,
        u.email,
        u.phone_number,
        b.attendees,
        b.total_price,
        b.status,
        b.created_at,
        b.email_notified,
        b.whatsapp_notified
      FROM bookings b
      INNER JOIN users u ON b.user_id = u.id
      WHERE b.event_id = $1
      ORDER BY b.created_at DESC`,
      [eventId]
    );

    const bookings = bookingsResult.rows;

    // 5. Generate CSV content
    const csvHeaders = [
      'Booking ID',
      'Name',
      'Email',
      'Phone',
      'Attendees',
      'Total Price',
      'Status',
      'Booked Date',
      'Email Notified',
      'WhatsApp Notified',
    ];

    const csvRows = bookings.map(booking => [
      booking.id,
      booking.name,
      booking.email,
      booking.phone_number || '',
      booking.attendees,
      parseFloat(booking.total_price).toFixed(2),
      booking.status,
      new Date(booking.created_at).toISOString(),
      booking.email_notified ? 'Yes' : 'No',
      booking.whatsapp_notified ? 'Yes' : 'No',
    ]);

    // Combine headers and rows
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // 6. Generate filename with event name and date
    const sanitizedEventTitle = event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `bookings_${sanitizedEventTitle}_${dateStr}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error exporting bookings:', error);

    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to export bookings',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
