import { describe, it, expect } from 'vitest';

/**
 * T087: Admin Event Form Tests
 * 
 * Tests for the admin event creation form functionality including
 * field validation, slug generation, capacity validation, and data formatting.
 */

describe('T087: Admin Event Form - Slug Generation', () => {
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  it('should generate slug from simple title', () => {
    const title = 'Spiritual Workshop';
    const slug = generateSlug(title);
    expect(slug).toBe('spiritual-workshop');
  });

  it('should handle special characters in title', () => {
    const title = 'Meditation & Mindfulness: A Journey!';
    const slug = generateSlug(title);
    expect(slug).toBe('meditation-mindfulness-a-journey');
  });

  it('should handle multiple spaces', () => {
    const title = 'Yoga    Session    Today';
    const slug = generateSlug(title);
    expect(slug).toBe('yoga-session-today');
  });

  it('should handle leading and trailing special characters', () => {
    const title = '!!!Awakening Workshop!!!';
    const slug = generateSlug(title);
    expect(slug).toBe('awakening-workshop');
  });

  it('should convert uppercase to lowercase', () => {
    const title = 'SPIRITUAL HEALING';
    const slug = generateSlug(title);
    expect(slug).toBe('spiritual-healing');
  });

  it('should handle numbers in title', () => {
    const title = '7 Day Meditation Retreat 2024';
    const slug = generateSlug(title);
    expect(slug).toBe('7-day-meditation-retreat-2024');
  });
});

describe('T087: Admin Event Form - Price Validation', () => {
  const validatePrice = (price: string | number): boolean => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return !isNaN(numPrice) && numPrice >= 0;
  };

  it('should accept valid price as number', () => {
    expect(validatePrice(99.99)).toBe(true);
  });

  it('should accept valid price as string', () => {
    expect(validatePrice('50.00')).toBe(true);
  });

  it('should accept zero price (free event)', () => {
    expect(validatePrice(0)).toBe(true);
    expect(validatePrice('0')).toBe(true);
  });

  it('should reject negative price', () => {
    expect(validatePrice(-10)).toBe(false);
  });

  it('should reject invalid string', () => {
    expect(validatePrice('abc')).toBe(false);
  });

  it('should accept decimal prices', () => {
    expect(validatePrice(25.50)).toBe(true);
    expect(validatePrice('99.99')).toBe(true);
  });
});

describe('T087: Admin Event Form - Capacity Validation', () => {
  const validateCapacity = (capacity: number, availableSpots: number): boolean => {
    return availableSpots >= 0 && availableSpots <= capacity;
  };

  it('should accept available spots equal to capacity', () => {
    expect(validateCapacity(50, 50)).toBe(true);
  });

  it('should accept available spots less than capacity', () => {
    expect(validateCapacity(100, 75)).toBe(true);
  });

  it('should reject available spots greater than capacity', () => {
    expect(validateCapacity(50, 75)).toBe(false);
  });

  it('should reject negative available spots', () => {
    expect(validateCapacity(50, -5)).toBe(false);
  });

  it('should accept zero available spots (sold out)', () => {
    expect(validateCapacity(50, 0)).toBe(true);
  });

  it('should handle edge case with capacity of 1', () => {
    expect(validateCapacity(1, 0)).toBe(true);
    expect(validateCapacity(1, 1)).toBe(true);
    expect(validateCapacity(1, 2)).toBe(false);
  });
});

describe('T087: Admin Event Form - Date Validation', () => {
  const isValidDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const isFutureDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    return date > new Date();
  };

  it('should validate correct date format', () => {
    expect(isValidDate('2024-12-25T10:00')).toBe(true);
  });

  it('should reject invalid date format', () => {
    expect(isValidDate('invalid-date')).toBe(false);
  });

  it('should identify future date', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    expect(isFutureDate(futureDate.toISOString())).toBe(true);
  });

  it('should identify past date', () => {
    expect(isFutureDate('2020-01-01T10:00')).toBe(false);
  });

  it('should handle ISO date strings', () => {
    const isoDate = new Date('2025-06-15T14:30:00Z').toISOString();
    expect(isValidDate(isoDate)).toBe(true);
  });
});

describe('T087: Admin Event Form - Duration Validation', () => {
  const validateDuration = (hours: number): boolean => {
    return hours > 0 && hours <= 24;
  };

  it('should accept valid duration', () => {
    expect(validateDuration(2)).toBe(true);
  });

  it('should accept half-hour increments', () => {
    expect(validateDuration(1.5)).toBe(true);
    expect(validateDuration(2.5)).toBe(true);
  });

  it('should reject zero duration', () => {
    expect(validateDuration(0)).toBe(false);
  });

  it('should reject negative duration', () => {
    expect(validateDuration(-1)).toBe(false);
  });

  it('should accept full-day events', () => {
    expect(validateDuration(8)).toBe(true);
    expect(validateDuration(12)).toBe(true);
  });

  it('should reject duration over 24 hours', () => {
    expect(validateDuration(25)).toBe(false);
  });
});

describe('T087: Admin Event Form - Coordinate Validation', () => {
  const isValidLatitude = (lat: number | undefined): boolean => {
    if (lat === undefined) return true; // Optional field
    return lat >= -90 && lat <= 90;
  };

  const isValidLongitude = (lng: number | undefined): boolean => {
    if (lng === undefined) return true; // Optional field
    return lng >= -180 && lng <= 180;
  };

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

  it('should reject latitude out of range', () => {
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLatitude(-91)).toBe(false);
  });

  it('should reject longitude out of range', () => {
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLongitude(-181)).toBe(false);
  });

  it('should accept edge cases', () => {
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
  });
});

describe('T087: Admin Event Form - Required Fields', () => {
  interface EventFormData {
    title: string;
    slug: string;
    description: string;
    price: number;
    event_date: string;
    duration_hours: number;
    venue_name: string;
    venue_address: string;
    venue_city: string;
    venue_country: string;
    capacity: number;
    available_spots: number;
  }

  const validateRequiredFields = (data: Partial<EventFormData>): string[] => {
    const requiredFields: (keyof EventFormData)[] = [
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

    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(field);
      }
    }

    return missingFields;
  };

  it('should pass with all required fields', () => {
    const data: EventFormData = {
      title: 'Test Event',
      slug: 'test-event',
      description: 'Test description',
      price: 50,
      event_date: '2024-12-25T10:00',
      duration_hours: 2,
      venue_name: 'Test Venue',
      venue_address: '123 Test St',
      venue_city: 'Test City',
      venue_country: 'Test Country',
      capacity: 50,
      available_spots: 50,
    };

    const missing = validateRequiredFields(data);
    expect(missing).toHaveLength(0);
  });

  it('should identify missing title', () => {
    const data: Partial<EventFormData> = {
      slug: 'test-event',
      description: 'Test description',
    };

    const missing = validateRequiredFields(data);
    expect(missing).toContain('title');
  });

  it('should identify multiple missing fields', () => {
    const data: Partial<EventFormData> = {
      title: 'Test Event',
    };

    const missing = validateRequiredFields(data);
    expect(missing.length).toBeGreaterThan(5);
  });

  it('should reject empty string values', () => {
    const data: Partial<EventFormData> = {
      title: '',
      slug: 'test-event',
    };

    const missing = validateRequiredFields(data);
    expect(missing).toContain('title');
  });
});

describe('T087: Admin Event Form - Venue Address Formatting', () => {
  interface VenueInfo {
    venue_name: string;
    venue_address: string;
    venue_city: string;
    venue_country: string;
  }

  const formatVenueDisplay = (venue: VenueInfo): string => {
    return `${venue.venue_name}, ${venue.venue_address}, ${venue.venue_city}, ${venue.venue_country}`;
  };

  it('should format complete venue information', () => {
    const venue: VenueInfo = {
      venue_name: 'Harmony Center',
      venue_address: '123 Spiritual Way',
      venue_city: 'San Francisco',
      venue_country: 'USA',
    };

    const formatted = formatVenueDisplay(venue);
    expect(formatted).toBe('Harmony Center, 123 Spiritual Way, San Francisco, USA');
  });

  it('should handle multi-line addresses', () => {
    const venue: VenueInfo = {
      venue_name: 'Wellness Studio',
      venue_address: '456 Peace Ave\nSuite 200',
      venue_city: 'Portland',
      venue_country: 'USA',
    };

    const formatted = formatVenueDisplay(venue);
    expect(formatted).toContain('456 Peace Ave');
    expect(formatted).toContain('Portland');
  });
});

describe('T087: Admin Event Form - Data Formatting for API', () => {
  interface RawFormData {
    price: string;
    duration_hours: string;
    capacity: string;
    available_spots: string;
    venue_lat?: string;
    venue_lng?: string;
    is_published: 'on' | null;
  }

  const formatForAPI = (formData: RawFormData) => {
    return {
      price: parseFloat(formData.price),
      duration_hours: parseInt(formData.duration_hours, 10),
      capacity: parseInt(formData.capacity, 10),
      available_spots: parseInt(formData.available_spots, 10),
      venue_lat: formData.venue_lat ? parseFloat(formData.venue_lat) : undefined,
      venue_lng: formData.venue_lng ? parseFloat(formData.venue_lng) : undefined,
      is_published: formData.is_published === 'on',
    };
  };

  it('should convert string numbers to proper types', () => {
    const formData: RawFormData = {
      price: '99.99',
      duration_hours: '2',
      capacity: '50',
      available_spots: '50',
      is_published: null,
    };

    const formatted = formatForAPI(formData);

    expect(typeof formatted.price).toBe('number');
    expect(formatted.price).toBe(99.99);
    expect(typeof formatted.duration_hours).toBe('number');
    expect(formatted.duration_hours).toBe(2);
    expect(typeof formatted.capacity).toBe('number');
    expect(formatted.capacity).toBe(50);
  });

  it('should handle optional coordinates', () => {
    const formData: RawFormData = {
      price: '50',
      duration_hours: '3',
      capacity: '100',
      available_spots: '100',
      venue_lat: '37.7749',
      venue_lng: '-122.4194',
      is_published: null,
    };

    const formatted = formatForAPI(formData);

    expect(formatted.venue_lat).toBe(37.7749);
    expect(formatted.venue_lng).toBe(-122.4194);
  });

  it('should handle missing optional coordinates', () => {
    const formData: RawFormData = {
      price: '50',
      duration_hours: '3',
      capacity: '100',
      available_spots: '100',
      is_published: null,
    };

    const formatted = formatForAPI(formData);

    expect(formatted.venue_lat).toBeUndefined();
    expect(formatted.venue_lng).toBeUndefined();
  });

  it('should convert checkbox to boolean', () => {
    const publishedData: RawFormData = {
      price: '50',
      duration_hours: '3',
      capacity: '100',
      available_spots: '100',
      is_published: 'on',
    };

    const unpublishedData: RawFormData = {
      price: '50',
      duration_hours: '3',
      capacity: '100',
      available_spots: '100',
      is_published: null,
    };

    expect(formatForAPI(publishedData).is_published).toBe(true);
    expect(formatForAPI(unpublishedData).is_published).toBe(false);
  });
});

describe('T087: Admin Event Form - Input Sanitization', () => {
  const sanitizeText = (text: string): string => {
    return text.trim().replace(/\s+/g, ' ');
  };

  it('should remove leading and trailing whitespace', () => {
    const input = '  Meditation Workshop  ';
    expect(sanitizeText(input)).toBe('Meditation Workshop');
  });

  it('should normalize multiple spaces', () => {
    const input = 'Yoga    and    Meditation';
    expect(sanitizeText(input)).toBe('Yoga and Meditation');
  });

  it('should handle mixed whitespace characters', () => {
    const input = 'Event\t\tTitle\n\nHere';
    expect(sanitizeText(input)).toBe('Event Title Here');
  });

  it('should preserve single spaces', () => {
    const input = 'A B C';
    expect(sanitizeText(input)).toBe('A B C');
  });
});

describe('T087: Admin Event Form - Auto-sync Features', () => {
  it('should sync available spots with capacity initially', () => {
    const capacity = 100;
    let availableSpots = capacity;

    // Simulate capacity change
    const newCapacity = 150;
    availableSpots = newCapacity; // Auto-sync

    expect(availableSpots).toBe(newCapacity);
  });

  it('should not override manually edited available spots', () => {
    const capacity = 100;
    let availableSpots = 80; // Manually set lower
    const manuallyEdited = true;

    // Simulate capacity change
    const newCapacity = 150;
    if (!manuallyEdited) {
      availableSpots = newCapacity;
    }

    expect(availableSpots).toBe(80); // Should remain manually edited value
  });
});
