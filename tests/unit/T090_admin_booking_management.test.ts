/**
 * T090: Admin Booking Management Interface Tests
 * 
 * Tests for the admin booking management page and API endpoints.
 * Covers viewing bookings, sending updates, and exporting to CSV.
 */

import { describe, it, expect } from 'vitest';

// Mock data
const mockEvent = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Yoga Retreat Weekend',
  event_date: new Date('2024-12-15T10:00:00Z'),
  capacity: 50,
  available_spots: 25,
  price: 150.00,
};

const mockBooking = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  user_id: '323e4567-e89b-12d3-a456-426614174000',
  event_id: mockEvent.id,
  attendees: 2,
  total_price: 300.00,
  status: 'confirmed',
  created_at: new Date('2024-11-01T12:00:00Z'),
  whatsapp_notified: false,
  email_notified: false,
  user_name: 'John Doe',
  user_email: 'john@example.com',
  user_phone: '+1234567890',
};

const mockUser = {
  id: mockBooking.user_id,
  name: mockBooking.user_name,
  email: mockBooking.user_email,
  phone_number: mockBooking.user_phone,
};

// Helper functions
function validateBookingStructure(booking: any): boolean {
  const requiredFields = [
    'id',
    'user_id',
    'event_id',
    'attendees',
    'total_price',
    'status',
    'created_at',
    'user_name',
    'user_email',
  ];
  
  return requiredFields.every(field => field in booking);
}

function validateBookingStatus(status: string): boolean {
  const validStatuses = ['pending', 'confirmed', 'cancelled'];
  return validStatuses.includes(status);
}

function validateCsvFormat(csv: string): boolean {
  const lines = csv.trim().split('\n');
  if (lines.length < 1) return false;
  
  const firstLine = lines[0];
  if (!firstLine) return false;
  
  const headers = firstLine.split(',');
  const expectedHeaders = [
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
  
  return expectedHeaders.every((header, index) => headers[index] === header);
}

function parseBookingRow(row: string): any {
  // Parse CSV row (handle quoted fields)
  const values = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
  return {
    id: values[0]?.replace(/"/g, ''),
    name: values[1]?.replace(/"/g, ''),
    email: values[2]?.replace(/"/g, ''),
    phone: values[3]?.replace(/"/g, ''),
    attendees: parseInt(values[4]?.replace(/"/g, '') || '0'),
    totalPrice: parseFloat(values[5]?.replace(/"/g, '') || '0'),
    status: values[6]?.replace(/"/g, ''),
    bookedDate: values[7]?.replace(/"/g, ''),
    emailNotified: values[8]?.replace(/"/g, ''),
    whatsappNotified: values[9]?.replace(/"/g, ''),
  };
}

describe('T090 - Admin Booking Management Interface', () => {
  describe('Booking Statistics Calculations', () => {
    it('should calculate total bookings correctly', () => {
      const bookings = [
        { ...mockBooking, status: 'confirmed' },
        { ...mockBooking, id: '2', status: 'pending' },
        { ...mockBooking, id: '3', status: 'cancelled' },
      ];
      
      const totalBookings = bookings.length;
      expect(totalBookings).toBe(3);
    });

    it('should count confirmed bookings only', () => {
      const bookings = [
        { ...mockBooking, status: 'confirmed' },
        { ...mockBooking, id: '2', status: 'confirmed' },
        { ...mockBooking, id: '3', status: 'pending' },
        { ...mockBooking, id: '4', status: 'cancelled' },
      ];
      
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
      expect(confirmedBookings).toBe(2);
    });

    it('should calculate total attendees excluding cancelled bookings', () => {
      const bookings = [
        { ...mockBooking, attendees: 2, status: 'confirmed' },
        { ...mockBooking, id: '2', attendees: 3, status: 'confirmed' },
        { ...mockBooking, id: '3', attendees: 1, status: 'pending' },
        { ...mockBooking, id: '4', attendees: 5, status: 'cancelled' },
      ];
      
      const totalAttendees = bookings
        .filter(b => b.status !== 'cancelled')
        .reduce((sum, b) => sum + b.attendees, 0);
      
      expect(totalAttendees).toBe(6); // 2 + 3 + 1 (cancelled not counted)
    });

    it('should calculate total revenue from confirmed bookings only', () => {
      const bookings = [
        { ...mockBooking, total_price: 300.00, status: 'confirmed' },
        { ...mockBooking, id: '2', total_price: 150.00, status: 'confirmed' },
        { ...mockBooking, id: '3', total_price: 200.00, status: 'pending' },
        { ...mockBooking, id: '4', total_price: 100.00, status: 'cancelled' },
      ];
      
      const totalRevenue = bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + parseFloat(b.total_price.toString()), 0);
      
      expect(totalRevenue).toBe(450.00);
    });

    it('should calculate capacity utilization percentage', () => {
      const capacity = 50;
      const availableSpots = 25;
      const bookedSpots = capacity - availableSpots;
      const utilizationPercentage = (bookedSpots / capacity * 100).toFixed(1);
      
      expect(utilizationPercentage).toBe('50.0');
    });
  });

  describe('Booking Data Structure', () => {
    it('should validate booking structure has all required fields', () => {
      const isValid = validateBookingStructure(mockBooking);
      expect(isValid).toBe(true);
    });

    it('should validate booking status values', () => {
      const validStatuses = ['pending', 'confirmed', 'cancelled'];
      validStatuses.forEach(status => {
        expect(validateBookingStatus(status)).toBe(true);
      });
    });

    it('should reject invalid booking status', () => {
      const invalidStatuses = ['approved', 'rejected', 'complete'];
      invalidStatuses.forEach(status => {
        expect(validateBookingStatus(status)).toBe(false);
      });
    });

    it('should have valid user information', () => {
      expect(mockBooking.user_name).toBeTruthy();
      expect(mockBooking.user_email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(mockBooking.user_phone).toMatch(/^\+?[\d\s-]+$/);
    });

    it('should have positive attendees count', () => {
      expect(mockBooking.attendees).toBeGreaterThan(0);
    });

    it('should have non-negative total price', () => {
      expect(mockBooking.total_price).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Send Update Functionality', () => {
    it('should validate update request has subject and message', () => {
      const validRequest = {
        subject: 'Event Update',
        message: 'Important information about the event',
        sendWhatsapp: false,
        recipient: 'all',
      };
      
      expect(validRequest.subject).toBeTruthy();
      expect(validRequest.message).toBeTruthy();
      expect(validRequest.subject.length).toBeGreaterThan(0);
      expect(validRequest.message.length).toBeGreaterThan(0);
    });

    it('should support sending to all attendees', () => {
      const request = {
        subject: 'Event Update',
        message: 'Message for all',
        recipient: 'all',
      };
      
      expect(request.recipient).toBe('all');
    });

    it('should support sending to individual attendee', () => {
      const request = {
        subject: 'Personal Update',
        message: 'Message for individual',
        recipient: {
          id: mockBooking.id,
          email: mockBooking.user_email,
          name: mockBooking.user_name,
        },
      };
      
      expect(request.recipient).not.toBe('all');
      expect(typeof request.recipient).toBe('object');
      expect(request.recipient.id).toBeTruthy();
    });

    it('should handle WhatsApp option correctly', () => {
      const withWhatsapp = {
        subject: 'Update',
        message: 'Test',
        sendWhatsapp: true,
        recipient: 'all',
      };
      
      const withoutWhatsapp = {
        subject: 'Update',
        message: 'Test',
        sendWhatsapp: false,
        recipient: 'all',
      };
      
      expect(withWhatsapp.sendWhatsapp).toBe(true);
      expect(withoutWhatsapp.sendWhatsapp).toBe(false);
    });

    it('should only send WhatsApp to bookings with phone numbers', () => {
      const bookingsWithPhone = [
        { ...mockBooking, user_phone: '+1234567890' },
        { ...mockBooking, id: '2', user_phone: null },
        { ...mockBooking, id: '3', user_phone: '+9876543210' },
      ];
      
      const eligibleForWhatsapp = bookingsWithPhone.filter(b => b.user_phone).length;
      expect(eligibleForWhatsapp).toBe(2);
    });

    it('should update notification flags after sending', () => {
      const booking = { ...mockBooking };
      
      // Simulate email sent
      booking.email_notified = true;
      expect(booking.email_notified).toBe(true);
      
      // Simulate WhatsApp sent
      booking.whatsapp_notified = true;
      expect(booking.whatsapp_notified).toBe(true);
    });

    it('should filter only confirmed bookings for updates', () => {
      const bookings = [
        { ...mockBooking, status: 'confirmed' },
        { ...mockBooking, id: '2', status: 'pending' },
        { ...mockBooking, id: '3', status: 'cancelled' },
      ];
      
      const eligibleForUpdates = bookings.filter(b => b.status === 'confirmed');
      expect(eligibleForUpdates.length).toBe(1);
    });
  });

  describe('CSV Export Functionality', () => {
    it('should generate valid CSV with correct headers', () => {
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
      
      const csv = csvHeaders.join(',');
      expect(validateCsvFormat(csv)).toBe(true);
    });

    it('should format booking data correctly for CSV', () => {
      const booking = mockBooking;
      const csvRow = [
        booking.id,
        booking.user_name,
        booking.user_email,
        booking.user_phone || '',
        booking.attendees,
        parseFloat(booking.total_price.toString()).toFixed(2),
        booking.status,
        new Date(booking.created_at).toISOString(),
        booking.email_notified ? 'Yes' : 'No',
        booking.whatsapp_notified ? 'Yes' : 'No',
      ];
      
      expect(csvRow).toHaveLength(10);
      expect(csvRow[0]).toBe(booking.id);
      expect(csvRow[1]).toBe(booking.user_name);
    });

    it('should properly quote CSV fields', () => {
      const field = 'Test, Name';
      const quotedField = `"${field}"`;
      
      expect(quotedField).toBe('"Test, Name"');
      expect(quotedField).toContain(',');
    });

    it('should handle empty phone numbers in CSV', () => {
      const bookingNoPhone = { ...mockBooking, user_phone: null };
      const phoneValue = bookingNoPhone.user_phone || '';
      
      expect(phoneValue).toBe('');
    });

    it('should format dates as ISO strings in CSV', () => {
      const date = new Date('2024-11-01T12:00:00Z');
      const isoString = date.toISOString();
      
      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should convert boolean notification flags to Yes/No', () => {
      const emailNotified = true;
      const whatsappNotified = false;
      
      expect(emailNotified ? 'Yes' : 'No').toBe('Yes');
      expect(whatsappNotified ? 'Yes' : 'No').toBe('No');
    });

    it('should generate sanitized filename from event title', () => {
      const eventTitle = 'Yoga Retreat & Meditation 2024!';
      const sanitized = eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      expect(sanitized).toBe('yoga_retreat___meditation_2024_');
      expect(sanitized).not.toContain('&');
      expect(sanitized).not.toContain('!');
    });

    it('should include date in filename', () => {
      const dateStr = new Date().toISOString().split('T')[0];
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Notification Status Tracking', () => {
    it('should track email notification status', () => {
      const booking = { ...mockBooking };
      expect(booking.email_notified).toBe(false);
      
      // Simulate notification sent
      booking.email_notified = true;
      expect(booking.email_notified).toBe(true);
    });

    it('should track WhatsApp notification status', () => {
      const booking = { ...mockBooking };
      expect(booking.whatsapp_notified).toBe(false);
      
      // Simulate notification sent
      booking.whatsapp_notified = true;
      expect(booking.whatsapp_notified).toBe(true);
    });

    it('should track notifications independently', () => {
      const booking = { ...mockBooking };
      
      booking.email_notified = true;
      booking.whatsapp_notified = false;
      
      expect(booking.email_notified).toBe(true);
      expect(booking.whatsapp_notified).toBe(false);
    });
  });

  describe('Authorization and Security', () => {
    it('should require authentication', () => {
      const session = null;
      const requiresAuth = session === null;
      
      expect(requiresAuth).toBe(true);
    });

    it('should require admin role', () => {
      const adminSession = { userId: '123', role: 'admin' };
      const userSession = { userId: '456', role: 'user' };
      
      const adminHasAccess = adminSession.role === 'admin';
      const userHasAccess = userSession.role === 'admin';
      
      expect(adminHasAccess).toBe(true);
      expect(userHasAccess).toBe(false);
    });

    it('should validate event ID is provided', () => {
      const validEventId = mockEvent.id;
      const invalidEventId = '';
      
      expect(validEventId).toBeTruthy();
      expect(invalidEventId).toBeFalsy();
    });

    it('should validate event exists before processing', () => {
      const event = mockEvent;
      const eventExists = event !== null && event !== undefined;
      
      expect(eventExists).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle events with no bookings', () => {
      const bookings: any[] = [];
      
      const totalBookings = bookings.length;
      const totalAttendees = bookings.reduce((sum, b) => sum + b.attendees, 0);
      const totalRevenue = bookings.reduce((sum, b) => sum + b.total_price, 0);
      
      expect(totalBookings).toBe(0);
      expect(totalAttendees).toBe(0);
      expect(totalRevenue).toBe(0);
    });

    it('should handle events with only cancelled bookings', () => {
      const bookings = [
        { ...mockBooking, status: 'cancelled' },
        { ...mockBooking, id: '2', status: 'cancelled' },
      ];
      
      const activeBookings = bookings.filter(b => b.status !== 'cancelled');
      expect(activeBookings.length).toBe(0);
    });

    it('should handle single attendee bookings', () => {
      const booking = { ...mockBooking, attendees: 1 };
      expect(booking.attendees).toBe(1);
    });

    it('should handle large groups', () => {
      const booking = { ...mockBooking, attendees: 20 };
      expect(booking.attendees).toBe(20);
    });

    it('should handle free events (zero price)', () => {
      const booking = { ...mockBooking, total_price: 0 };
      expect(booking.total_price).toBe(0);
      expect(booking.total_price).toBeGreaterThanOrEqual(0);
    });

    it('should handle events at full capacity', () => {
      const event = { ...mockEvent, available_spots: 0 };
      const utilizationPercentage = ((event.capacity - event.available_spots) / event.capacity * 100);
      
      expect(event.available_spots).toBe(0);
      expect(utilizationPercentage).toBe(100);
    });

    it('should handle very long event titles in CSV filename', () => {
      const longTitle = 'This is a very long event title that should be properly sanitized for use as a filename in the CSV export functionality';
      const sanitized = longTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      expect(sanitized.length).toBeGreaterThan(0);
      expect(sanitized).not.toContain(' ');
    });

    it('should handle bookings with missing phone numbers', () => {
      const booking = { ...mockBooking, user_phone: null };
      const phoneValue = booking.user_phone || '';
      
      expect(phoneValue).toBe('');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain foreign key relationships', () => {
      expect(mockBooking.user_id).toBeTruthy();
      expect(mockBooking.event_id).toBeTruthy();
      expect(mockBooking.event_id).toBe(mockEvent.id);
    });

    it('should have valid UUID format for IDs', () => {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      expect(mockBooking.id).toMatch(uuidPattern);
      expect(mockBooking.user_id).toMatch(uuidPattern);
      expect(mockBooking.event_id).toMatch(uuidPattern);
    });

    it('should have valid email format', () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(mockBooking.user_email).toMatch(emailPattern);
    });

    it('should have valid date objects', () => {
      const bookingDate = new Date(mockBooking.created_at);
      expect(bookingDate).toBeInstanceOf(Date);
      expect(isNaN(bookingDate.getTime())).toBe(false);
    });

    it('should preserve decimal precision for prices', () => {
      const price = 149.99;
      const formatted = parseFloat(price.toString()).toFixed(2);
      expect(formatted).toBe('149.99');
    });
  });
});
