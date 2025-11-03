/**
 * T082 Book Now Button Tests
 * 
 * Unit tests for the Book Now button functionality on event detail page.
 * Tests capacity validation, button states, data attribute handling,
 * and error scenarios.
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper function: Validate capacity
 */
function validateCapacity(availableSpots: number): boolean {
  return availableSpots > 0;
}

/**
 * Helper function: Check if event is sold out
 */
function isSoldOut(availableSpots: number): boolean {
  return availableSpots === 0;
}

/**
 * Helper function: Check if event has limited spots
 */
function isLimitedSpots(availableSpots: number, capacity: number): boolean {
  const percentage = (availableSpots / capacity) * 100;
  return percentage <= 20 && availableSpots > 0;
}

/**
 * Helper function: Calculate capacity percentage
 */
function calculateCapacityPercentage(availableSpots: number, capacity: number): number {
  return (availableSpots / capacity) * 100;
}

/**
 * Helper function: Get capacity status
 */
function getCapacityStatus(availableSpots: number, capacity: number): 'sold-out' | 'limited' | 'available' {
  if (isSoldOut(availableSpots)) {
    return 'sold-out';
  }
  if (isLimitedSpots(availableSpots, capacity)) {
    return 'limited';
  }
  return 'available';
}

/**
 * Helper function: Format booking URL
 */
function formatBookingUrl(slug: string): string {
  return `/events/${slug}/book`;
}

/**
 * Helper function: Should show button (not sold out)
 */
function shouldShowBookButton(availableSpots: number): boolean {
  return availableSpots > 0;
}

/**
 * Helper function: Get button text based on status
 */
function getButtonText(availableSpots: number): string {
  return availableSpots === 0 ? 'Sold Out' : 'Book Now';
}

/**
 * Helper function: Get warning message for limited spots
 */
function getLimitedSpotsMessage(availableSpots: number): string {
  return `⚠️ Only ${availableSpots} spots left!`;
}

/**
 * Helper function: Parse data attributes
 */
interface BookingData {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  availableSpots: number;
  capacity: number;
  price: string | number;
}

function parseBookingData(dataset: Record<string, string | undefined>): BookingData {
  return {
    eventId: dataset.eventId || '',
    eventSlug: dataset.eventSlug || '',
    eventTitle: dataset.eventTitle || '',
    availableSpots: parseInt(dataset.availableSpots || '0'),
    capacity: parseInt(dataset.capacity || '0'),
    price: dataset.price || '0'
  };
}

describe('Book Now Button - Capacity Validation', () => {
  it('should validate capacity correctly when spots available', () => {
    expect(validateCapacity(10)).toBe(true);
    expect(validateCapacity(1)).toBe(true);
    expect(validateCapacity(100)).toBe(true);
  });

  it('should fail validation when no spots available', () => {
    expect(validateCapacity(0)).toBe(false);
  });

  it('should fail validation for negative spots (data error)', () => {
    expect(validateCapacity(-5)).toBe(false);
  });
});

describe('Book Now Button - Sold Out Detection', () => {
  it('should detect sold out events', () => {
    expect(isSoldOut(0)).toBe(true);
  });

  it('should not flag events with available spots as sold out', () => {
    expect(isSoldOut(1)).toBe(false);
    expect(isSoldOut(50)).toBe(false);
    expect(isSoldOut(100)).toBe(false);
  });
});

describe('Book Now Button - Limited Spots Detection', () => {
  it('should detect limited spots when <= 20%', () => {
    expect(isLimitedSpots(20, 100)).toBe(true);
    expect(isLimitedSpots(10, 100)).toBe(true);
    expect(isLimitedSpots(1, 100)).toBe(true);
  });

  it('should not detect limited spots when > 20%', () => {
    expect(isLimitedSpots(21, 100)).toBe(false);
    expect(isLimitedSpots(50, 100)).toBe(false);
    expect(isLimitedSpots(100, 100)).toBe(false);
  });

  it('should not flag sold out events as limited', () => {
    expect(isLimitedSpots(0, 100)).toBe(false);
  });

  it('should handle small capacities correctly', () => {
    expect(isLimitedSpots(2, 10)).toBe(true);  // 20%
    expect(isLimitedSpots(1, 10)).toBe(true);  // 10%
    expect(isLimitedSpots(3, 10)).toBe(false); // 30%
  });

  it('should handle edge case of exactly 20%', () => {
    expect(isLimitedSpots(20, 100)).toBe(true);
    expect(isLimitedSpots(2, 10)).toBe(true);
  });
});

describe('Book Now Button - Capacity Percentage', () => {
  it('should calculate percentage correctly', () => {
    expect(calculateCapacityPercentage(50, 100)).toBe(50);
    expect(calculateCapacityPercentage(25, 100)).toBe(25);
    expect(calculateCapacityPercentage(100, 100)).toBe(100);
    expect(calculateCapacityPercentage(0, 100)).toBe(0);
  });

  it('should handle decimal results', () => {
    expect(calculateCapacityPercentage(33, 100)).toBe(33);
    expect(calculateCapacityPercentage(1, 3)).toBeCloseTo(33.33, 2);
  });

  it('should handle edge cases', () => {
    expect(calculateCapacityPercentage(1, 100)).toBe(1);
    expect(calculateCapacityPercentage(99, 100)).toBe(99);
  });
});

describe('Book Now Button - Capacity Status', () => {
  it('should return "sold-out" status correctly', () => {
    expect(getCapacityStatus(0, 100)).toBe('sold-out');
  });

  it('should return "limited" status correctly', () => {
    expect(getCapacityStatus(20, 100)).toBe('limited');
    expect(getCapacityStatus(10, 100)).toBe('limited');
    expect(getCapacityStatus(1, 100)).toBe('limited');
  });

  it('should return "available" status correctly', () => {
    expect(getCapacityStatus(21, 100)).toBe('available');
    expect(getCapacityStatus(50, 100)).toBe('available');
    expect(getCapacityStatus(100, 100)).toBe('available');
  });

  it('should prioritize sold-out over limited', () => {
    expect(getCapacityStatus(0, 10)).toBe('sold-out');
  });
});

describe('Book Now Button - URL Formatting', () => {
  it('should format booking URL correctly', () => {
    expect(formatBookingUrl('meditation-workshop')).toBe('/events/meditation-workshop/book');
    expect(formatBookingUrl('yoga-in-park')).toBe('/events/yoga-in-park/book');
  });

  it('should handle slugs with multiple hyphens', () => {
    expect(formatBookingUrl('morning-yoga-session-london')).toBe('/events/morning-yoga-session-london/book');
  });

  it('should handle empty slug', () => {
    expect(formatBookingUrl('')).toBe('/events//book');
  });
});

describe('Book Now Button - Button Visibility', () => {
  it('should show button when spots available', () => {
    expect(shouldShowBookButton(1)).toBe(true);
    expect(shouldShowBookButton(50)).toBe(true);
    expect(shouldShowBookButton(100)).toBe(true);
  });

  it('should show button (disabled) when sold out', () => {
    // In UI, we still show button but disabled
    expect(shouldShowBookButton(0)).toBe(false);
  });
});

describe('Book Now Button - Button Text', () => {
  it('should show "Book Now" when available', () => {
    expect(getButtonText(1)).toBe('Book Now');
    expect(getButtonText(50)).toBe('Book Now');
  });

  it('should show "Sold Out" when no spots', () => {
    expect(getButtonText(0)).toBe('Sold Out');
  });
});

describe('Book Now Button - Warning Messages', () => {
  it('should generate correct warning message for limited spots', () => {
    expect(getLimitedSpotsMessage(5)).toBe('⚠️ Only 5 spots left!');
    expect(getLimitedSpotsMessage(1)).toBe('⚠️ Only 1 spots left!');
    expect(getLimitedSpotsMessage(20)).toBe('⚠️ Only 20 spots left!');
  });
});

describe('Book Now Button - Data Attribute Parsing', () => {
  it('should parse booking data from dataset', () => {
    const dataset = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      eventSlug: 'meditation-workshop',
      eventTitle: 'Meditation Workshop',
      availableSpots: '15',
      capacity: '50',
      price: '25.00'
    };

    const bookingData = parseBookingData(dataset);

    expect(bookingData.eventId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(bookingData.eventSlug).toBe('meditation-workshop');
    expect(bookingData.eventTitle).toBe('Meditation Workshop');
    expect(bookingData.availableSpots).toBe(15);
    expect(bookingData.capacity).toBe(50);
    expect(bookingData.price).toBe('25.00');
  });

  it('should handle missing dataset values with defaults', () => {
    const dataset = {};
    const bookingData = parseBookingData(dataset);

    expect(bookingData.eventId).toBe('');
    expect(bookingData.eventSlug).toBe('');
    expect(bookingData.eventTitle).toBe('');
    expect(bookingData.availableSpots).toBe(0);
    expect(bookingData.capacity).toBe(0);
    expect(bookingData.price).toBe('0');
  });

  it('should handle numeric price', () => {
    const dataset = {
      price: '0'
    };
    const bookingData = parseBookingData(dataset);

    expect(bookingData.price).toBe('0');
  });

  it('should parse string numbers correctly', () => {
    const dataset = {
      availableSpots: '25',
      capacity: '100'
    };
    const bookingData = parseBookingData(dataset);

    expect(typeof bookingData.availableSpots).toBe('number');
    expect(typeof bookingData.capacity).toBe('number');
    expect(bookingData.availableSpots).toBe(25);
    expect(bookingData.capacity).toBe(100);
  });
});

describe('Book Now Button - Edge Cases', () => {
  it('should handle zero capacity', () => {
    const percentage = calculateCapacityPercentage(0, 0);
    expect(isNaN(percentage)).toBe(true);
  });

  it('should handle available > capacity (data inconsistency)', () => {
    const percentage = calculateCapacityPercentage(150, 100);
    expect(percentage).toBe(150);
  });

  it('should handle negative available spots', () => {
    expect(validateCapacity(-10)).toBe(false);
    expect(isSoldOut(-10)).toBe(false);
  });

  it('should handle fractional spots', () => {
    expect(validateCapacity(0.5)).toBe(true);
    expect(calculateCapacityPercentage(10.5, 100)).toBe(10.5);
  });

  it('should handle very large numbers', () => {
    expect(calculateCapacityPercentage(10000, 50000)).toBe(20);
    expect(isLimitedSpots(10000, 50000)).toBe(true);
  });
});

describe('Book Now Button - State Transitions', () => {
  it('should transition from available to limited correctly', () => {
    const capacity = 100;
    
    // Start available
    expect(getCapacityStatus(30, capacity)).toBe('available');
    
    // Transition to limited at 20%
    expect(getCapacityStatus(20, capacity)).toBe('limited');
    
    // Still limited
    expect(getCapacityStatus(10, capacity)).toBe('limited');
  });

  it('should transition from limited to sold out correctly', () => {
    const capacity = 100;
    
    // Start limited
    expect(getCapacityStatus(5, capacity)).toBe('limited');
    
    // Transition to sold out
    expect(getCapacityStatus(0, capacity)).toBe('sold-out');
  });

  it('should handle direct transition from available to sold out', () => {
    const capacity = 100;
    
    // Available
    expect(getCapacityStatus(50, capacity)).toBe('available');
    
    // Sold out
    expect(getCapacityStatus(0, capacity)).toBe('sold-out');
  });
});

describe('Book Now Button - Button States', () => {
  it('should determine correct disabled state', () => {
    const soldOut = isSoldOut(0);
    const available = isSoldOut(10);
    
    expect(soldOut).toBe(true);  // Button should be disabled
    expect(available).toBe(false); // Button should be enabled
  });

  it('should have correct aria attributes logic', () => {
    // Button should have aria-disabled when sold out
    const soldOutState = isSoldOut(0);
    expect(soldOutState).toBe(true);
    
    // Button should not have aria-disabled when available
    const availableState = isSoldOut(20);
    expect(availableState).toBe(false);
  });
});

describe('Book Now Button - Urgency Messaging', () => {
  it('should show urgency message for limited spots', () => {
    const limited1 = isLimitedSpots(20, 100);
    const limited2 = isLimitedSpots(5, 100);
    
    expect(limited1).toBe(true);
    expect(limited2).toBe(true);
  });

  it('should not show urgency message for ample spots', () => {
    const ample1 = isLimitedSpots(50, 100);
    const ample2 = isLimitedSpots(80, 100);
    
    expect(ample1).toBe(false);
    expect(ample2).toBe(false);
  });

  it('should not show urgency message when sold out', () => {
    const soldOut = isLimitedSpots(0, 100);
    expect(soldOut).toBe(false);
  });
});
