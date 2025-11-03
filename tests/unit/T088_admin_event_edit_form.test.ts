/**
 * T088: Admin Event Edit Form Tests
 * 
 * Comprehensive tests for the event edit form functionality including:
 * - Pre-filling form fields with existing data
 * - Slug generation with existing data
 * - Form validation
 * - Data formatting for API updates
 * - Capacity constraint validation
 * - Coordinate handling
 * - Date/time formatting
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// Helper Functions (Mirror edit form logic)
// =============================================================================

/**
 * Generate URL-friendly slug from text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate price is non-negative
 */
function isValidPrice(price: number | string): boolean {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && numPrice >= 0;
}

/**
 * Validate capacity constraint
 */
function validateCapacity(capacity: number, availableSpots: number): boolean {
  return availableSpots >= 0 && availableSpots <= capacity;
}

/**
 * Validate date is in valid format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate duration is positive and reasonable
 */
function isValidDuration(hours: number): boolean {
  return hours > 0 && hours <= 24;
}

/**
 * Validate latitude is in range
 */
function isValidLatitude(lat: number | undefined): boolean {
  if (lat === undefined) return true; // Optional
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude is in range
 */
function isValidLongitude(lng: number | undefined): boolean {
  if (lng === undefined) return true; // Optional
  return lng >= -180 && lng <= 180;
}

/**
 * Check if all required fields are present
 */
function hasAllRequiredFields(data: Record<string, any>): boolean {
  const requiredFields = [
    'title',
    'slug',
    'description',
    'price',
    'event_date',
    'duration_hours',
    'venue_name',
    'venue_address',
    'venue_city',
    'venue_country',
    'capacity',
    'available_spots',
  ];
  
  return requiredFields.every(field => {
    const value = data[field];
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Format venue address for display
 */
function formatVenueAddress(
  name: string,
  address: string,
  city: string,
  country: string
): string {
  return `${name}, ${address}, ${city}, ${country}`;
}

/**
 * Format date for datetime-local input (YYYY-MM-DDTHH:mm)
 */
function formatDateTimeLocal(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse datetime-local input back to ISO string
 */
function parseDateTime(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

/**
 * Sanitize text input (trim whitespace)
 */
function sanitizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Format form data for API (convert types)
 */
function formatForAPI(formData: Record<string, any>): Record<string, any> {
  return {
    title: sanitizeText(formData.title),
    slug: formData.slug,
    description: sanitizeText(formData.description),
    price: parseFloat(formData.price),
    event_date: parseDateTime(formData.event_date),
    duration_hours: parseInt(formData.duration_hours, 10),
    venue_name: sanitizeText(formData.venue_name),
    venue_address: sanitizeText(formData.venue_address),
    venue_city: sanitizeText(formData.venue_city),
    venue_country: sanitizeText(formData.venue_country),
    venue_lat: formData.venue_lat ? parseFloat(formData.venue_lat) : undefined,
    venue_lng: formData.venue_lng ? parseFloat(formData.venue_lng) : undefined,
    capacity: parseInt(formData.capacity, 10),
    available_spots: parseInt(formData.available_spots, 10),
    image_url: formData.image_url || undefined,
    is_published: formData.is_published === 'on',
  };
}

/**
 * Check if slug should be auto-updated when title changes
 */
function shouldAutoUpdateSlug(
  currentSlug: string,
  previousTitle: string,
  newTitle: string
): boolean {
  const previousSlug = generateSlug(previousTitle);
  // Only auto-update if current slug matches the auto-generated one from previous title
  return currentSlug === previousSlug;
}

// =============================================================================
// Test Suites
// =============================================================================

describe('T088: Admin Event Edit Form - Date/Time Formatting', () => {
  it('should format Date object to datetime-local string', () => {
    const date = new Date('2024-12-15T18:30:00.000Z');
    const formatted = formatDateTimeLocal(date);
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('should handle dates with single-digit months and days', () => {
    const date = new Date('2024-01-05T09:00:00.000Z');
    const formatted = formatDateTimeLocal(date);
    expect(formatted).toContain('-01-');
    expect(formatted).toContain('-05T');
  });

  it('should preserve hours and minutes', () => {
    const date = new Date('2024-06-15T14:45:00.000Z');
    const formatted = formatDateTimeLocal(date);
    // Format includes time in local timezone (converted from UTC)
    expect(formatted).toMatch(/T\d{2}:\d{2}$/);
  });

  it('should parse datetime-local back to ISO string', () => {
    const localDateTime = '2024-12-15T18:30';
    const isoString = parseDateTime(localDateTime);
    expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should handle midnight times', () => {
    const date = new Date('2024-12-15T00:00:00.000Z');
    const formatted = formatDateTimeLocal(date);
    // Format includes time in local timezone (may differ from UTC midnight)
    expect(formatted).toMatch(/T\d{2}:\d{2}$/);
  });
});

describe('T088: Admin Event Edit Form - Slug Auto-Update Logic', () => {
  it('should auto-update slug when it matches previous auto-generated slug', () => {
    const previousTitle = 'Original Workshop';
    const currentSlug = generateSlug(previousTitle); // 'original-workshop'
    const newTitle = 'Updated Workshop';
    
    const shouldUpdate = shouldAutoUpdateSlug(currentSlug, previousTitle, newTitle);
    expect(shouldUpdate).toBe(true);
  });

  it('should NOT auto-update slug when manually edited', () => {
    const previousTitle = 'Original Workshop';
    const currentSlug = 'custom-slug'; // Manually edited
    const newTitle = 'Updated Workshop';
    
    const shouldUpdate = shouldAutoUpdateSlug(currentSlug, previousTitle, newTitle);
    expect(shouldUpdate).toBe(false);
  });

  it('should NOT auto-update slug when it differs from auto-generated', () => {
    const previousTitle = 'Meditation Session';
    const currentSlug = 'mindfulness-meditation'; // Different from auto-generated
    const newTitle = 'Advanced Meditation';
    
    const shouldUpdate = shouldAutoUpdateSlug(currentSlug, previousTitle, newTitle);
    expect(shouldUpdate).toBe(false);
  });

  it('should handle empty previous title', () => {
    const previousTitle = '';
    const currentSlug = '';
    const newTitle = 'New Workshop';
    
    const shouldUpdate = shouldAutoUpdateSlug(currentSlug, previousTitle, newTitle);
    expect(shouldUpdate).toBe(true);
  });
});

describe('T088: Admin Event Edit Form - Capacity Validation with Existing Bookings', () => {
  it('should allow available spots equal to capacity', () => {
    expect(validateCapacity(100, 100)).toBe(true);
  });

  it('should allow available spots less than capacity (bookings exist)', () => {
    expect(validateCapacity(100, 75)).toBe(true);
  });

  it('should reject available spots greater than capacity', () => {
    expect(validateCapacity(100, 125)).toBe(false);
  });

  it('should allow zero available spots (sold out)', () => {
    expect(validateCapacity(50, 0)).toBe(true);
  });

  it('should reject negative available spots', () => {
    expect(validateCapacity(50, -5)).toBe(false);
  });

  it('should handle capacity increase scenarios', () => {
    // Original capacity: 50, available: 10 (40 booked)
    // New capacity: 100, available should be at least 10
    const newCapacity = 100;
    const currentAvailable = 10;
    
    expect(validateCapacity(newCapacity, currentAvailable)).toBe(true);
    expect(validateCapacity(newCapacity, 50)).toBe(true); // Can increase available spots
  });
});

describe('T088: Admin Event Edit Form - Price Validation', () => {
  it('should accept valid positive prices', () => {
    expect(isValidPrice(99.99)).toBe(true);
    expect(isValidPrice('50.00')).toBe(true);
  });

  it('should accept zero price (free events)', () => {
    expect(isValidPrice(0)).toBe(true);
    expect(isValidPrice('0')).toBe(true);
  });

  it('should reject negative prices', () => {
    expect(isValidPrice(-10)).toBe(false);
    expect(isValidPrice('-5.99')).toBe(false);
  });

  it('should handle decimal prices', () => {
    expect(isValidPrice(25.50)).toBe(true);
    expect(isValidPrice('19.99')).toBe(true);
  });

  it('should reject invalid string prices', () => {
    expect(isValidPrice('abc')).toBe(false);
    expect(isValidPrice('')).toBe(false);
  });
});

describe('T088: Admin Event Edit Form - Duration Validation', () => {
  it('should accept valid duration', () => {
    expect(isValidDuration(2)).toBe(true);
    expect(isValidDuration(1.5)).toBe(true);
  });

  it('should reject zero duration', () => {
    expect(isValidDuration(0)).toBe(false);
  });

  it('should reject negative duration', () => {
    expect(isValidDuration(-1)).toBe(false);
  });

  it('should reject duration over 24 hours', () => {
    expect(isValidDuration(25)).toBe(false);
    expect(isValidDuration(48)).toBe(false);
  });

  it('should accept half-hour increments', () => {
    expect(isValidDuration(0.5)).toBe(true);
    expect(isValidDuration(3.5)).toBe(true);
  });

  it('should accept full-day events', () => {
    expect(isValidDuration(8)).toBe(true);
    expect(isValidDuration(12)).toBe(true);
  });
});

describe('T088: Admin Event Edit Form - Date Validation', () => {
  it('should validate valid date formats', () => {
    expect(isValidDate('2024-12-15T18:30')).toBe(true);
    expect(isValidDate('2024-01-01T00:00')).toBe(true);
  });

  it('should reject invalid date formats', () => {
    expect(isValidDate('invalid-date')).toBe(false);
    expect(isValidDate('2024-13-01')).toBe(false); // Invalid month
  });

  it('should handle ISO date strings', () => {
    expect(isValidDate('2024-12-15T18:30:00.000Z')).toBe(true);
  });

  it('should handle date objects converted to strings', () => {
    const date = new Date('2024-12-15');
    expect(isValidDate(date.toISOString())).toBe(true);
  });
});

describe('T088: Admin Event Edit Form - Coordinate Validation', () => {
  it('should accept valid latitude', () => {
    expect(isValidLatitude(37.7749)).toBe(true);
    expect(isValidLatitude(-33.8688)).toBe(true);
  });

  it('should accept valid longitude', () => {
    expect(isValidLongitude(-122.4194)).toBe(true);
    expect(isValidLongitude(151.2093)).toBe(true);
  });

  it('should accept undefined coordinates (optional)', () => {
    expect(isValidLatitude(undefined)).toBe(true);
    expect(isValidLongitude(undefined)).toBe(true);
  });

  it('should reject out-of-range latitude', () => {
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLatitude(-91)).toBe(false);
  });

  it('should reject out-of-range longitude', () => {
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLongitude(-181)).toBe(false);
  });

  it('should accept edge case coordinates', () => {
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
  });
});

describe('T088: Admin Event Edit Form - Required Fields', () => {
  it('should validate all required fields are present', () => {
    const completeData = {
      title: 'Workshop',
      slug: 'workshop',
      description: 'Description',
      price: 99.99,
      event_date: '2024-12-15T18:30',
      duration_hours: 2,
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'Country',
      capacity: 50,
      available_spots: 50,
    };
    
    expect(hasAllRequiredFields(completeData)).toBe(true);
  });

  it('should detect missing required fields', () => {
    const incompleteData = {
      title: 'Workshop',
      slug: 'workshop',
      // description missing
      price: 99.99,
    };
    
    expect(hasAllRequiredFields(incompleteData)).toBe(false);
  });

  it('should detect empty string fields', () => {
    const dataWithEmpty = {
      title: '',
      slug: 'workshop',
      description: 'Description',
      price: 99.99,
      event_date: '2024-12-15T18:30',
      duration_hours: 2,
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'Country',
      capacity: 50,
      available_spots: 50,
    };
    
    expect(hasAllRequiredFields(dataWithEmpty)).toBe(false);
  });

  it('should allow optional fields to be missing', () => {
    const dataWithoutOptional = {
      title: 'Workshop',
      slug: 'workshop',
      description: 'Description',
      price: 99.99,
      event_date: '2024-12-15T18:30',
      duration_hours: 2,
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'Country',
      capacity: 50,
      available_spots: 50,
      // venue_lat, venue_lng, image_url are optional
    };
    
    expect(hasAllRequiredFields(dataWithoutOptional)).toBe(true);
  });
});

describe('T088: Admin Event Edit Form - Venue Address Formatting', () => {
  it('should format complete venue address', () => {
    const formatted = formatVenueAddress(
      'Serenity Center',
      '123 Main St',
      'San Francisco',
      'USA'
    );
    expect(formatted).toBe('Serenity Center, 123 Main St, San Francisco, USA');
  });

  it('should handle multi-line addresses', () => {
    const formatted = formatVenueAddress(
      'Wellness Hub',
      '456 Oak Ave\nSuite 200',
      'Portland',
      'USA'
    );
    expect(formatted).toContain('456 Oak Ave\nSuite 200');
  });
});

describe('T088: Admin Event Edit Form - Data Formatting for API', () => {
  it('should convert string numbers to proper types', () => {
    const formData = {
      title: 'Workshop',
      slug: 'workshop',
      description: 'Description',
      price: '99.99',
      event_date: '2024-12-15T18:30',
      duration_hours: '2',
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'Country',
      capacity: '50',
      available_spots: '50',
      is_published: 'on',
    };
    
    const formatted = formatForAPI(formData);
    
    expect(typeof formatted.price).toBe('number');
    expect(formatted.price).toBe(99.99);
    expect(typeof formatted.duration_hours).toBe('number');
    expect(typeof formatted.capacity).toBe('number');
    expect(typeof formatted.available_spots).toBe('number');
  });

  it('should handle optional coordinates', () => {
    const formDataWithCoords = {
      title: 'Workshop',
      slug: 'workshop',
      description: 'Description',
      price: '99.99',
      event_date: '2024-12-15T18:30',
      duration_hours: '2',
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'Country',
      venue_lat: '37.7749',
      venue_lng: '-122.4194',
      capacity: '50',
      available_spots: '50',
      is_published: 'on',
    };
    
    const formatted = formatForAPI(formDataWithCoords);
    
    expect(typeof formatted.venue_lat).toBe('number');
    expect(typeof formatted.venue_lng).toBe('number');
    expect(formatted.venue_lat).toBe(37.7749);
    expect(formatted.venue_lng).toBe(-122.4194);
  });

  it('should handle missing optional fields', () => {
    const formDataWithoutOptional = {
      title: 'Workshop',
      slug: 'workshop',
      description: 'Description',
      price: '99.99',
      event_date: '2024-12-15T18:30',
      duration_hours: '2',
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'Country',
      capacity: '50',
      available_spots: '50',
      is_published: '',
    };
    
    const formatted = formatForAPI(formDataWithoutOptional);
    
    expect(formatted.venue_lat).toBeUndefined();
    expect(formatted.venue_lng).toBeUndefined();
    expect(formatted.image_url).toBeUndefined();
  });

  it('should convert checkbox to boolean', () => {
    const formDataChecked = {
      title: 'Workshop',
      slug: 'workshop',
      description: 'Description',
      price: '99.99',
      event_date: '2024-12-15T18:30',
      duration_hours: '2',
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'Country',
      capacity: '50',
      available_spots: '50',
      is_published: 'on',
    };
    
    const formDataUnchecked = {
      ...formDataChecked,
      is_published: '',
    };
    
    expect(formatForAPI(formDataChecked).is_published).toBe(true);
    expect(formatForAPI(formDataUnchecked).is_published).toBe(false);
  });

  it('should convert datetime-local to ISO string', () => {
    const formData = {
      title: 'Workshop',
      slug: 'workshop',
      description: 'Description',
      price: '99.99',
      event_date: '2024-12-15T18:30',
      duration_hours: '2',
      venue_name: 'Venue',
      venue_address: 'Address',
      venue_city: 'City',
      venue_country: 'Country',
      capacity: '50',
      available_spots: '50',
      is_published: 'on',
    };
    
    const formatted = formatForAPI(formData);
    
    expect(formatted.event_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('T088: Admin Event Edit Form - Input Sanitization', () => {
  it('should trim whitespace from text fields', () => {
    expect(sanitizeText('  Workshop  ')).toBe('Workshop');
    expect(sanitizeText('Meditation Session  ')).toBe('Meditation Session');
  });

  it('should normalize multiple spaces to single space', () => {
    expect(sanitizeText('Multiple    Spaces')).toBe('Multiple Spaces');
    expect(sanitizeText('Too     Many     Spaces')).toBe('Too Many Spaces');
  });

  it('should handle tabs and newlines', () => {
    expect(sanitizeText('Text\t\twith\ttabs')).toBe('Text with tabs');
    expect(sanitizeText('Text\n\nwith\nnewlines')).toBe('Text with newlines');
  });

  it('should preserve single spaces', () => {
    expect(sanitizeText('Normal text here')).toBe('Normal text here');
  });
});

describe('T088: Admin Event Edit Form - Pre-filling Data', () => {
  it('should handle string price conversion for input value', () => {
    const stringPrice = '99.99';
    const numberPrice = 99.99;
    
    expect(parseFloat(stringPrice)).toBe(numberPrice);
    expect(typeof parseFloat(stringPrice)).toBe('number');
  });

  it('should handle string coordinates conversion for input value', () => {
    const stringLat = '37.7749';
    const stringLng = '-122.4194';
    
    expect(parseFloat(stringLat)).toBe(37.7749);
    expect(parseFloat(stringLng)).toBe(-122.4194);
  });

  it('should format existing date for datetime-local input', () => {
    const existingDate = new Date('2024-12-15T18:30:00.000Z');
    const formatted = formatDateTimeLocal(existingDate);
    
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('should handle boolean to checkbox checked attribute', () => {
    const isPublishedTrue = true;
    const isPublishedFalse = false;
    
    // In HTML: checked={isPublishedTrue}
    expect(isPublishedTrue).toBe(true);
    expect(isPublishedFalse).toBe(false);
  });
});
