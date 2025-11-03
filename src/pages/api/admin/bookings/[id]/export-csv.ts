/**
 * T090: CSV Export API Endpoint
 * 
 * Separate endpoint for CSV export to match the URL pattern
 * used in the frontend button click handler.
 */

import type { APIRoute } from 'astro';
import { query } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/auth/session';
import { ValidationError } from '@/lib/errors';

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
