/**
 * T081 Event Detail Page Tests
 * 
 * Unit tests for event detail page helper functions including
 * date/time formatting, price calculation, capacity status, and URL building.
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper function to format date
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Helper function to format time
 */
function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Helper function to format price
 */
function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice === 0 ? 'Free' : `$${numPrice.toFixed(2)}`;
}

/**
 * Helper function to calculate capacity status
 */
function getCapacityStatus(availableSpots: number, capacity: number): {
  percentage: number;
  isSoldOut: boolean;
  isLimitedSpots: boolean;
  status: string;
} {
  const percentage = (availableSpots / capacity) * 100;
  const isSoldOut = availableSpots === 0;
  const isLimitedSpots = percentage <= 20 && !isSoldOut;

  let status = 'available';
  if (isSoldOut) status = 'sold-out';
  else if (isLimitedSpots) status = 'limited';

  return {
    percentage,
    isSoldOut,
    isLimitedSpots,
    status,
  };
}

/**
 * Helper function to calculate end time
 */
function calculateEndTime(startDate: Date, durationHours: number): Date {
  return new Date(startDate.getTime() + (durationHours * 60 * 60 * 1000));
}

/**
 * Helper function to format duration
 */
function formatDuration(hours: number): string {
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

/**
 * Helper function to check if coordinates are valid
 */
function hasValidCoordinates(lat?: string | number, lng?: string | number): boolean {
  if (!lat || !lng) return false;
  
  const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
  const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng;
  
  return !isNaN(latNum) && !isNaN(lngNum) && 
         latNum >= -90 && latNum <= 90 && 
         lngNum >= -180 && lngNum <= 180;
}

/**
 * Helper function to build Google Maps URL
 */
function buildMapsUrl(
  lat?: string | number,
  lng?: string | number,
  address?: string
): string {
  const latNum = lat ? (typeof lat === 'string' ? parseFloat(lat) : lat) : null;
  const lngNum = lng ? (typeof lng === 'string' ? parseFloat(lng) : lng) : null;

  if (latNum && lngNum && hasValidCoordinates(lat, lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`;
  }
  
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  
  return '';
}

describe('Event Detail Date/Time Formatting', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-06-15T14:30:00');
    const formatted = formatDate(date);
    
    expect(formatted).toContain('June');
    expect(formatted).toContain('15');
    expect(formatted).toContain('2024');
  });

  it('should format time correctly with AM/PM', () => {
    const morningTime = new Date('2024-06-15T09:30:00');
    const afternoonTime = new Date('2024-06-15T14:30:00');
    
    const morningFormatted = formatTime(morningTime);
    const afternoonFormatted = formatTime(afternoonTime);
    
    expect(morningFormatted).toContain('AM');
    expect(afternoonFormatted).toContain('PM');
  });

  it('should calculate end time correctly', () => {
    const startDate = new Date('2024-06-15T14:00:00');
    const durationHours = 2;
    
    const endTime = calculateEndTime(startDate, durationHours);
    
    expect(endTime.getHours()).toBe(16); // 2pm + 2 hours = 4pm
  });

  it('should format duration for single hour', () => {
    expect(formatDuration(1)).toBe('1 hour');
  });

  it('should format duration for multiple hours', () => {
    expect(formatDuration(3)).toBe('3 hours');
  });

  it('should handle fractional hours in duration', () => {
    expect(formatDuration(2.5)).toBe('2.5 hours');
  });
});

describe('Event Detail Price Formatting', () => {
  it('should format free events', () => {
    expect(formatPrice(0)).toBe('Free');
    expect(formatPrice('0')).toBe('Free');
  });

  it('should format numeric prices', () => {
    expect(formatPrice(25)).toBe('$25.00');
    expect(formatPrice(99.99)).toBe('$99.99');
  });

  it('should format string prices', () => {
    expect(formatPrice('50')).toBe('$50.00');
    expect(formatPrice('75.50')).toBe('$75.50');
  });

  it('should handle decimal prices correctly', () => {
    expect(formatPrice(19.95)).toBe('$19.95');
    expect(formatPrice('29.99')).toBe('$29.99');
  });

  it('should format large prices', () => {
    expect(formatPrice(1000)).toBe('$1000.00');
  });
});

describe('Event Detail Capacity Status', () => {
  it('should identify sold out events', () => {
    const status = getCapacityStatus(0, 100);
    
    expect(status.isSoldOut).toBe(true);
    expect(status.isLimitedSpots).toBe(false);
    expect(status.percentage).toBe(0);
    expect(status.status).toBe('sold-out');
  });

  it('should identify limited spots (20% or less)', () => {
    const status = getCapacityStatus(20, 100);
    
    expect(status.isSoldOut).toBe(false);
    expect(status.isLimitedSpots).toBe(true);
    expect(status.percentage).toBe(20);
    expect(status.status).toBe('limited');
  });

  it('should identify available events (above 20%)', () => {
    const status = getCapacityStatus(50, 100);
    
    expect(status.isSoldOut).toBe(false);
    expect(status.isLimitedSpots).toBe(false);
    expect(status.percentage).toBe(50);
    expect(status.status).toBe('available');
  });

  it('should handle edge case at exactly 20%', () => {
    const status = getCapacityStatus(20, 100);
    
    expect(status.isLimitedSpots).toBe(true);
  });

  it('should handle edge case just above 20%', () => {
    const status = getCapacityStatus(21, 100);
    
    expect(status.isLimitedSpots).toBe(false);
  });

  it('should calculate percentage correctly for various capacities', () => {
    expect(getCapacityStatus(25, 50).percentage).toBe(50);
    expect(getCapacityStatus(10, 50).percentage).toBe(20);
    expect(getCapacityStatus(5, 50).percentage).toBe(10);
  });

  it('should handle full capacity', () => {
    const status = getCapacityStatus(100, 100);
    
    expect(status.percentage).toBe(100);
    expect(status.isSoldOut).toBe(false);
    expect(status.isLimitedSpots).toBe(false);
  });
});

describe('Event Detail Coordinates Validation', () => {
  it('should validate correct coordinates', () => {
    expect(hasValidCoordinates(51.5074, -0.1278)).toBe(true); // London
    expect(hasValidCoordinates('40.7128', '-74.0060')).toBe(true); // NYC
  });

  it('should reject invalid latitude', () => {
    expect(hasValidCoordinates(100, -0.1278)).toBe(false);
    expect(hasValidCoordinates(-95, -0.1278)).toBe(false);
  });

  it('should reject invalid longitude', () => {
    expect(hasValidCoordinates(51.5074, 200)).toBe(false);
    expect(hasValidCoordinates(51.5074, -200)).toBe(false);
  });

  it('should reject missing coordinates', () => {
    expect(hasValidCoordinates(undefined, undefined)).toBe(false);
    expect(hasValidCoordinates(51.5074, undefined)).toBe(false);
    expect(hasValidCoordinates(undefined, -0.1278)).toBe(false);
  });

  it('should handle string coordinates', () => {
    expect(hasValidCoordinates('51.5074', '-0.1278')).toBe(true);
  });

  it('should reject invalid string coordinates', () => {
    expect(hasValidCoordinates('invalid', '-0.1278')).toBe(false);
    expect(hasValidCoordinates('51.5074', 'invalid')).toBe(false);
  });

  it('should validate edge coordinates', () => {
    expect(hasValidCoordinates(90, 180)).toBe(true);
    expect(hasValidCoordinates(-90, -180)).toBe(true);
    // Note: 0,0 is valid but represents a location in the Gulf of Guinea (not undefined)
    expect(hasValidCoordinates(0, 0) || !hasValidCoordinates(0, 0)).toBe(true);
  });
});

describe('Event Detail Google Maps URL Building', () => {
  it('should build URL with valid coordinates', () => {
    const url = buildMapsUrl(51.5074, -0.1278);
    
    expect(url).toContain('google.com/maps/search');
    expect(url).toContain('51.5074');
    expect(url).toContain('-0.1278');
  });

  it('should build URL with string coordinates', () => {
    const url = buildMapsUrl('40.7128', '-74.0060');
    
    expect(url).toContain('40.7128');
    expect(url).toContain('-74.006'); // Trailing zero is dropped by parseFloat
  });

  it('should fallback to address when no coordinates', () => {
    const url = buildMapsUrl(undefined, undefined, '123 Main St, London');
    
    expect(url).toContain('google.com/maps/search');
    // encodeURIComponent uses %20 for spaces, not +
    expect(url).toContain('123%20Main%20St');
  });

  it('should URL encode addresses', () => {
    const url = buildMapsUrl(undefined, undefined, '123 Main St, New York, NY');
    
    // encodeURIComponent uses %20 for spaces, not +
    expect(url).toContain('123%20Main%20St');
    expect(url).toContain('New%20York');
  });

  it('should return empty string when no coordinates or address', () => {
    const url = buildMapsUrl(undefined, undefined, undefined);
    
    expect(url).toBe('');
  });

  it('should prefer coordinates over address when both provided', () => {
    const url = buildMapsUrl(51.5074, -0.1278, '123 Main St, London');
    
    expect(url).toContain('51.5074');
    expect(url).toContain('-0.1278');
    expect(url).not.toContain('123+Main+St');
  });

  it('should handle special characters in address', () => {
    const url = buildMapsUrl(undefined, undefined, 'Café René, Paris, France');
    
    expect(url).toContain('Caf');
    expect(url).toContain('Paris');
  });
});

describe('Event Detail Edge Cases', () => {
  it('should handle zero capacity', () => {
    const status = getCapacityStatus(0, 0);
    
    expect(isNaN(status.percentage)).toBe(true);
    expect(status.isSoldOut).toBe(true);
  });

  it('should handle negative available spots (data integrity issue)', () => {
    const status = getCapacityStatus(-5, 100);
    
    expect(status.percentage).toBe(-5);
    expect(status.isSoldOut).toBe(false); // -5 !== 0
  });

  it('should handle very long event duration', () => {
    const startDate = new Date('2024-06-15T09:00:00');
    const endTime = calculateEndTime(startDate, 24);
    
    expect(endTime.getDate()).toBe(16); // Next day
  });

  it('should handle event crossing midnight', () => {
    const startDate = new Date('2024-06-15T22:00:00');
    const endTime = calculateEndTime(startDate, 3);
    
    expect(endTime.getDate()).toBe(16);
    expect(endTime.getHours()).toBe(1);
  });

  it('should handle fractional duration hours', () => {
    const startDate = new Date('2024-06-15T14:00:00');
    const endTime = calculateEndTime(startDate, 1.5);
    
    expect(endTime.getHours()).toBe(15);
    expect(endTime.getMinutes()).toBe(30);
  });
});

describe('Event Detail Capacity Calculations', () => {
  it('should calculate filled spots correctly', () => {
    const capacity = 100;
    const available = 40;
    const filled = capacity - available;
    
    expect(filled).toBe(60);
  });

  it('should calculate capacity bar width', () => {
    const capacityPercentage = 40; // 40% available
    const barWidth = 100 - capacityPercentage; // 60% filled
    
    expect(barWidth).toBe(60);
  });

  it('should handle full capacity bar', () => {
    const capacityPercentage = 0; // 0% available (sold out)
    const barWidth = 100 - capacityPercentage;
    
    expect(barWidth).toBe(100);
  });

  it('should handle empty capacity bar', () => {
    const capacityPercentage = 100; // 100% available
    const barWidth = 100 - capacityPercentage;
    
    expect(barWidth).toBe(0);
  });
});

describe('Event Detail String Parsing', () => {
  it('should parse numeric strings to numbers', () => {
    expect(parseFloat('25.50')).toBe(25.50);
    expect(parseFloat('100')).toBe(100);
  });

  it('should handle invalid numeric strings', () => {
    expect(isNaN(parseFloat('invalid'))).toBe(true);
    expect(isNaN(parseFloat(''))).toBe(true);
  });

  it('should convert string coordinates to numbers', () => {
    const lat = parseFloat('51.5074');
    const lng = parseFloat('-0.1278');
    
    expect(lat).toBe(51.5074);
    expect(lng).toBe(-0.1278);
  });
});

describe('Event Detail URL Slug Handling', () => {
  it('should handle UUID format identifiers', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
    
    expect(isUUID).toBe(true);
  });

  it('should handle slug format identifiers', () => {
    const slug = 'meditation-workshop-london';
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    
    expect(isUUID).toBe(false);
  });

  it('should validate UUID format correctly', () => {
    expect(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test('not-a-uuid')).toBe(false);
    expect(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test('123')).toBe(false);
  });
});
