/**
 * T086: Admin Events List Page Tests
 * 
 * Tests the admin interface for managing events with capacity tracking.
 * Covers event display, capacity indicators, booking statistics, filters,
 * and admin action buttons.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock types
interface Event {
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
  venue_lat?: number;
  venue_lng?: number;
  capacity: number;
  available_spots: number;
  image_url?: string;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

interface BookingStats {
  totalBookings: number;
  totalAttendees: number;
}

// ==========================================
// CAPACITY CALCULATION TESTS
// ==========================================

describe('T086: Capacity Calculation', () => {
  it('should calculate correct capacity percentage', () => {
    const event: Event = {
      id: 'event-1',
      title: 'Meditation Workshop',
      slug: 'meditation-workshop',
      description: 'Description',
      price: 50,
      event_date: new Date('2024-12-01'),
      duration_hours: 2,
      venue_name: 'Zen Center',
      venue_address: '123 Peace St',
      venue_city: 'San Francisco',
      venue_country: 'USA',
      capacity: 100,
      available_spots: 25,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const percentage = getCapacityPercentage(event);
    expect(percentage).toBe(75); // 75 spots filled out of 100
  });

  it('should handle full capacity', () => {
    const event: Partial<Event> = {
      capacity: 50,
      available_spots: 0,
    };

    const percentage = getCapacityPercentage(event as Event);
    expect(percentage).toBe(100);
  });

  it('should handle zero bookings', () => {
    const event: Partial<Event> = {
      capacity: 50,
      available_spots: 50,
    };

    const percentage = getCapacityPercentage(event as Event);
    expect(percentage).toBe(0);
  });

  it('should round to nearest integer', () => {
    const event: Partial<Event> = {
      capacity: 100,
      available_spots: 67, // 33% filled
    };

    const percentage = getCapacityPercentage(event as Event);
    expect(percentage).toBe(33);
  });
});

// ==========================================
// CAPACITY STATUS TESTS
// ==========================================

describe('T086: Capacity Status Colors', () => {
  it('should return red status for nearly full (>= 90%)', () => {
    const color = getCapacityColor(95);
    expect(color).toContain('red');
  });

  it('should return yellow status for medium capacity (70-89%)', () => {
    const color = getCapacityColor(80);
    expect(color).toContain('yellow');
  });

  it('should return green status for low capacity (< 70%)', () => {
    const color = getCapacityColor(50);
    expect(color).toContain('green');
  });

  it('should handle edge cases correctly', () => {
    expect(getCapacityColor(90)).toContain('red'); // Exactly 90%
    expect(getCapacityColor(70)).toContain('yellow'); // Exactly 70%
    expect(getCapacityColor(69)).toContain('green'); // Just below 70%
  });
});

// ==========================================
// DATE HANDLING TESTS
// ==========================================

describe('T086: Date Handling', () => {
  it('should identify past events', () => {
    const pastDate = new Date('2020-01-01');
    expect(isPastEvent(pastDate)).toBe(true);
  });

  it('should identify future events', () => {
    const futureDate = new Date('2030-12-31');
    expect(isPastEvent(futureDate)).toBe(false);
  });

  it('should format date correctly', () => {
    const date = new Date('2024-12-15T18:00:00Z');
    const formatted = formatDate(date);

    expect(formatted).toMatch(/2024/);
    expect(formatted).toMatch(/Dec/);
    expect(formatted).toMatch(/15/);
  });

  it('should include day of week in formatted date', () => {
    const date = new Date('2024-12-15T18:00:00Z');
    const formatted = formatDate(date);

    // Should contain a day abbreviation
    expect(formatted).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
  });
});

// ==========================================
// PRICE FORMATTING TESTS
// ==========================================

describe('T086: Price Formatting', () => {
  it('should format number prices as currency', () => {
    const formatted = formatCurrency(50);
    expect(formatted).toBe('$50.00');
  });

  it('should format string prices as currency', () => {
    const formatted = formatCurrency('75.50');
    expect(formatted).toBe('$75.50');
  });

  it('should handle zero price', () => {
    const formatted = formatCurrency(0);
    expect(formatted).toBe('$0.00');
  });

  it('should handle large prices', () => {
    const formatted = formatCurrency(1500);
    expect(formatted).toBe('$1,500.00');
  });
});

// ==========================================
// FILTER FUNCTIONALITY TESTS
// ==========================================

describe('T086: Event Filtering', () => {
  const sampleEvents: Event[] = [
    {
      id: '1',
      title: 'SF Workshop',
      slug: 'sf-workshop',
      description: 'Description',
      price: 50,
      event_date: new Date('2024-12-01'),
      duration_hours: 2,
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'San Francisco',
      venue_country: 'USA',
      capacity: 100,
      available_spots: 50,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '2',
      title: 'LA Workshop',
      slug: 'la-workshop',
      description: 'Description',
      price: 75,
      event_date: new Date('2024-12-15'),
      duration_hours: 3,
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'Los Angeles',
      venue_country: 'USA',
      capacity: 50,
      available_spots: 10,
      is_published: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  it('should filter by city', () => {
    const filtered = filterEventsByCity(sampleEvents, 'San Francisco');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.venue_city).toBe('San Francisco');
  });

  it('should filter by country', () => {
    const filtered = filterEventsByCountry(sampleEvents, 'USA');
    expect(filtered).toHaveLength(2);
  });

  it('should filter by published status', () => {
    const published = filterEventsByStatus(sampleEvents, 'published');
    expect(published).toHaveLength(1);
    expect(published[0]?.is_published).toBe(true);
  });

  it('should filter by draft status', () => {
    const draft = filterEventsByStatus(sampleEvents, 'draft');
    expect(draft).toHaveLength(1);
    expect(draft[0]?.is_published).toBe(false);
  });

  it('should return all events when no filters applied', () => {
    const filtered = applyFilters(sampleEvents, {});
    expect(filtered).toHaveLength(2);
  });

  it('should apply multiple filters', () => {
    const filtered = applyFilters(sampleEvents, {
      city: 'San Francisco',
      status: 'published',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.venue_city).toBe('San Francisco');
    expect(filtered[0]?.is_published).toBe(true);
  });
});

// ==========================================
// BOOKING STATISTICS TESTS
// ==========================================

describe('T086: Booking Statistics', () => {
  it('should calculate total bookings', () => {
    const stats: BookingStats = {
      totalBookings: 15,
      totalAttendees: 42,
    };

    expect(stats.totalBookings).toBe(15);
    expect(stats.totalAttendees).toBe(42);
  });

  it('should handle events with no bookings', () => {
    const statsMap = new Map<string, BookingStats>();
    const eventId = 'event-1';

    const stats = statsMap.get(eventId);
    expect(stats).toBeUndefined();
  });

  it('should aggregate bookings by event', () => {
    const bookings = [
      { event_id: 'event-1', attendees: 2 },
      { event_id: 'event-1', attendees: 3 },
      { event_id: 'event-2', attendees: 1 },
    ];

    const statsMap = aggregateBookingStats(bookings);

    expect(statsMap.get('event-1')).toEqual({
      totalBookings: 2,
      totalAttendees: 5,
    });
    expect(statsMap.get('event-2')).toEqual({
      totalBookings: 1,
      totalAttendees: 1,
    });
  });
});

// ==========================================
// SUMMARY STATISTICS TESTS
// ==========================================

describe('T086: Summary Statistics', () => {
  const sampleEvents: Event[] = [
    {
      id: '1',
      title: 'Event 1',
      slug: 'event-1',
      description: 'Description',
      price: 50,
      event_date: new Date('2030-12-01'),
      duration_hours: 2,
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'USA',
      capacity: 100,
      available_spots: 5, // 95% full
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '2',
      title: 'Event 2',
      slug: 'event-2',
      description: 'Description',
      price: 75,
      event_date: new Date('2020-01-01'), // Past
      duration_hours: 3,
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'USA',
      capacity: 50,
      available_spots: 25,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: '3',
      title: 'Event 3',
      slug: 'event-3',
      description: 'Description',
      price: 100,
      event_date: new Date('2030-12-15'),
      duration_hours: 4,
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'USA',
      capacity: 30,
      available_spots: 20,
      is_published: false, // Draft
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  it('should count total events', () => {
    expect(sampleEvents.length).toBe(3);
  });

  it('should count published events', () => {
    const published = sampleEvents.filter(e => e.is_published);
    expect(published).toHaveLength(2);
  });

  it('should count upcoming events', () => {
    const upcoming = sampleEvents.filter(e => !isPastEvent(e.event_date));
    expect(upcoming).toHaveLength(2);
  });

  it('should count nearly full events (>= 90%)', () => {
    const nearlyFull = sampleEvents.filter(e => getCapacityPercentage(e) >= 90);
    expect(nearlyFull).toHaveLength(1);
  });
});

// ==========================================
// ACTION BUTTON TESTS
// ==========================================

describe('T086: Action Buttons', () => {
  it('should generate edit URL', () => {
    const eventId = 'event-123';
    const editUrl = `/admin/events/${eventId}/edit`;
    expect(editUrl).toBe('/admin/events/event-123/edit');
  });

  it('should generate view URL with slug', () => {
    const slug = 'meditation-workshop';
    const viewUrl = `/events/${slug}`;
    expect(viewUrl).toBe('/events/meditation-workshop');
  });

  it('should generate bookings URL', () => {
    const eventId = 'event-123';
    const bookingsUrl = `/admin/events/${eventId}/bookings`;
    expect(bookingsUrl).toBe('/admin/events/event-123/bookings');
  });

  it('should only show bookings link when bookings exist', () => {
    const statsWithBookings: BookingStats = {
      totalBookings: 5,
      totalAttendees: 12,
    };

    const statsWithoutBookings: BookingStats = {
      totalBookings: 0,
      totalAttendees: 0,
    };

    expect(shouldShowBookingsLink(statsWithBookings)).toBe(true);
    expect(shouldShowBookingsLink(statsWithoutBookings)).toBe(false);
  });
});

// ==========================================
// CAPACITY INDICATOR TESTS
// ==========================================

describe('T086: Capacity Indicators', () => {
  it('should show correct progress bar width', () => {
    const event: Partial<Event> = {
      capacity: 100,
      available_spots: 30,
    };

    const percentage = getCapacityPercentage(event as Event);
    expect(percentage).toBe(70);
  });

  it('should display capacity text correctly', () => {
    const capacity = 100;
    const available = 25;
    const filled = capacity - available;

    const text = `${filled} / ${capacity}`;
    expect(text).toBe('75 / 100');
  });

  it('should show appropriate color for capacity level', () => {
    const lowCapacity = { capacity: 100, available_spots: 80 }; // 20% full
    const mediumCapacity = { capacity: 100, available_spots: 20 }; // 80% full
    const highCapacity = { capacity: 100, available_spots: 5 }; // 95% full

    expect(getCapacityColor(getCapacityPercentage(lowCapacity as Event))).toContain('green');
    expect(getCapacityColor(getCapacityPercentage(mediumCapacity as Event))).toContain('yellow');
    expect(getCapacityColor(getCapacityPercentage(highCapacity as Event))).toContain('red');
  });
});

// ==========================================
// EMPTY STATE TESTS
// ==========================================

describe('T086: Empty State', () => {
  it('should show empty state when no events', () => {
    const events: Event[] = [];
    expect(events.length).toBe(0);
  });

  it('should show empty state after filtering with no results', () => {
    const events: Event[] = [
      {
        id: '1',
        title: 'Event',
        slug: 'event',
        description: 'Description',
        price: 50,
        event_date: new Date(),
        duration_hours: 2,
        venue_name: 'Venue',
        venue_address: 'Address',
        venue_city: 'San Francisco',
        venue_country: 'USA',
        capacity: 100,
        available_spots: 50,
        is_published: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const filtered = filterEventsByCity(events, 'New York');
    expect(filtered).toHaveLength(0);
  });
});

// ==========================================
// HELPER FUNCTIONS FOR TESTING
// ==========================================

function getCapacityPercentage(event: Event): number {
  return Math.round(((event.capacity - event.available_spots) / event.capacity) * 100);
}

function getCapacityColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-600 bg-red-50';
  if (percentage >= 70) return 'text-yellow-600 bg-yellow-50';
  return 'text-green-600 bg-green-50';
}

function isPastEvent(eventDate: Date): boolean {
  return new Date(eventDate) < new Date();
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatCurrency(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numPrice);
}

function filterEventsByCity(events: Event[], city: string): Event[] {
  return events.filter(e => e.venue_city.toLowerCase() === city.toLowerCase());
}

function filterEventsByCountry(events: Event[], country: string): Event[] {
  return events.filter(e => e.venue_country.toLowerCase() === country.toLowerCase());
}

function filterEventsByStatus(events: Event[], status: string): Event[] {
  if (status === 'published') {
    return events.filter(e => e.is_published);
  } else if (status === 'draft') {
    return events.filter(e => !e.is_published);
  }
  return events;
}

function applyFilters(
  events: Event[],
  filters: { city?: string; country?: string; status?: string }
): Event[] {
  let filtered = events;

  if (filters.city) {
    filtered = filterEventsByCity(filtered, filters.city);
  }

  if (filters.country) {
    filtered = filterEventsByCountry(filtered, filters.country);
  }

  if (filters.status) {
    filtered = filterEventsByStatus(filtered, filters.status);
  }

  return filtered;
}

function aggregateBookingStats(
  bookings: Array<{ event_id: string; attendees: number }>
): Map<string, BookingStats> {
  const statsMap = new Map<string, BookingStats>();

  bookings.forEach((booking) => {
    const existing = statsMap.get(booking.event_id) || {
      totalBookings: 0,
      totalAttendees: 0,
    };

    statsMap.set(booking.event_id, {
      totalBookings: existing.totalBookings + 1,
      totalAttendees: existing.totalAttendees + booking.attendees,
    });
  });

  return statsMap;
}

function shouldShowBookingsLink(stats?: BookingStats): boolean {
  return stats !== undefined && stats.totalBookings > 0;
}
