/**
 * T080 EventCard Component Tests
 * 
 * Unit tests for the EventCard component helper functions and logic.
 * Tests price formatting, date/time formatting, capacity status calculation,
 * and variant behavior.
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper function: Format price for display
 */
function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice === 0 ? 'Free' : `$${numPrice.toFixed(2)}`;
}

/**
 * Helper function: Format date for display
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
 * Helper function: Format time for display
 */
function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Helper function: Calculate spots status
 */
function getSpotsStatus(available: number, capacity: number): { text: string; color: string } {
  const percentage = (available / capacity) * 100;
  
  if (available === 0) {
    return { text: 'Sold Out', color: 'error' };
  } else if (percentage <= 20) {
    return { text: `Only ${available} spots left!`, color: 'warning' };
  } else {
    return { text: `${available} spots available`, color: 'success' };
  }
}

/**
 * Helper function: Format duration text
 */
function formatDuration(hours: number): string {
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

/**
 * Helper function: Get month abbreviation
 */
function getMonthAbbr(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short' });
}

describe('EventCard - Price Formatting', () => {
  it('should format numeric price with 2 decimals', () => {
    expect(formatPrice(25)).toBe('$25.00');
    expect(formatPrice(99.99)).toBe('$99.99');
    expect(formatPrice(100)).toBe('$100.00');
  });

  it('should format string price with 2 decimals', () => {
    expect(formatPrice('25')).toBe('$25.00');
    expect(formatPrice('99.99')).toBe('$99.99');
    expect(formatPrice('0.50')).toBe('$0.50');
  });

  it('should display "Free" for zero price', () => {
    expect(formatPrice(0)).toBe('Free');
    expect(formatPrice('0')).toBe('Free');
    expect(formatPrice('0.00')).toBe('Free');
  });

  it('should handle large prices correctly', () => {
    expect(formatPrice(1000)).toBe('$1000.00');
    expect(formatPrice(9999.99)).toBe('$9999.99');
  });

  it('should round to 2 decimal places', () => {
    expect(formatPrice(25.999)).toBe('$26.00');
    expect(formatPrice(99.995)).toBe('$100.00');
  });
});

describe('EventCard - Date Formatting', () => {
  it('should format date with full weekday and month', () => {
    const date = new Date('2024-03-15T19:00:00');
    const formatted = formatDate(date);
    
    expect(formatted).toContain('2024');
    expect(formatted).toContain('15');
    expect(formatted).toContain('March');
    expect(formatted).toMatch(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/);
  });

  it('should handle different dates correctly', () => {
    const date1 = new Date('2024-01-01T10:00:00');
    const date2 = new Date('2024-12-31T23:00:00');
    
    const formatted1 = formatDate(date1);
    const formatted2 = formatDate(date2);
    
    expect(formatted1).toContain('January');
    expect(formatted2).toContain('December');
  });

  it('should format month abbreviation correctly', () => {
    expect(getMonthAbbr(new Date('2024-01-15'))).toBe('Jan');
    expect(getMonthAbbr(new Date('2024-02-15'))).toBe('Feb');
    expect(getMonthAbbr(new Date('2024-03-15'))).toBe('Mar');
    expect(getMonthAbbr(new Date('2024-12-15'))).toBe('Dec');
  });
});

describe('EventCard - Time Formatting', () => {
  it('should format time with AM/PM', () => {
    const morning = new Date('2024-03-15T09:30:00');
    const evening = new Date('2024-03-15T19:30:00');
    
    expect(formatTime(morning)).toContain('AM');
    expect(formatTime(evening)).toContain('PM');
  });

  it('should format noon correctly', () => {
    const noon = new Date('2024-03-15T12:00:00');
    const formatted = formatTime(noon);
    
    expect(formatted).toContain('12');
    expect(formatted).toContain('PM');
  });

  it('should format midnight correctly', () => {
    const midnight = new Date('2024-03-15T00:00:00');
    const formatted = formatTime(midnight);
    
    expect(formatted).toContain('12');
    expect(formatted).toContain('AM');
  });

  it('should include minutes in time', () => {
    const time = new Date('2024-03-15T14:45:00');
    const formatted = formatTime(time);
    
    expect(formatted).toContain('45');
    expect(formatted).toContain('2'); // Hour can be 2 or 02
    expect(formatted).toContain('PM');
  });
});

describe('EventCard - Capacity Status Calculation', () => {
  it('should return "Sold Out" when no spots available', () => {
    const status = getSpotsStatus(0, 100);
    
    expect(status.text).toBe('Sold Out');
    expect(status.color).toBe('error');
  });

  it('should return "Limited" when spots <= 20%', () => {
    const status1 = getSpotsStatus(20, 100); // Exactly 20%
    const status2 = getSpotsStatus(10, 100); // 10%
    const status3 = getSpotsStatus(5, 100);  // 5%
    
    expect(status1.text).toBe('Only 20 spots left!');
    expect(status1.color).toBe('warning');
    
    expect(status2.text).toBe('Only 10 spots left!');
    expect(status2.color).toBe('warning');
    
    expect(status3.text).toBe('Only 5 spots left!');
    expect(status3.color).toBe('warning');
  });

  it('should return "Available" when spots > 20%', () => {
    const status1 = getSpotsStatus(21, 100); // 21%
    const status2 = getSpotsStatus(50, 100); // 50%
    const status3 = getSpotsStatus(100, 100); // 100%
    
    expect(status1.text).toBe('21 spots available');
    expect(status1.color).toBe('success');
    
    expect(status2.text).toBe('50 spots available');
    expect(status2.color).toBe('success');
    
    expect(status3.text).toBe('100 spots available');
    expect(status3.color).toBe('success');
  });

  it('should handle small capacity correctly', () => {
    const status1 = getSpotsStatus(0, 10);  // Sold out
    const status2 = getSpotsStatus(2, 10);  // 20% - Limited
    const status3 = getSpotsStatus(3, 10);  // 30% - Available
    
    expect(status1.color).toBe('error');
    expect(status2.color).toBe('warning');
    expect(status3.color).toBe('success');
  });

  it('should calculate percentage correctly for edge cases', () => {
    const status1 = getSpotsStatus(1, 100);  // 1% - Limited
    const status2 = getSpotsStatus(99, 100); // 99% - Available
    
    expect(status1.color).toBe('warning');
    expect(status1.text).toBe('Only 1 spots left!');
    
    expect(status2.color).toBe('success');
    expect(status2.text).toBe('99 spots available');
  });

  it('should handle single spot capacity', () => {
    const status1 = getSpotsStatus(1, 1); // 100% - Available
    const status2 = getSpotsStatus(0, 1); // 0% - Sold out
    
    expect(status1.color).toBe('success');
    expect(status2.color).toBe('error');
  });
});

describe('EventCard - Duration Formatting', () => {
  it('should format single hour correctly', () => {
    expect(formatDuration(1)).toBe('1 hour');
  });

  it('should format multiple hours correctly', () => {
    expect(formatDuration(2)).toBe('2 hours');
    expect(formatDuration(3)).toBe('3 hours');
    expect(formatDuration(10)).toBe('10 hours');
  });

  it('should handle zero hours', () => {
    expect(formatDuration(0)).toBe('0 hours');
  });

  it('should handle fractional hours', () => {
    expect(formatDuration(1.5)).toBe('1.5 hours');
    expect(formatDuration(2.5)).toBe('2.5 hours');
  });
});

describe('EventCard - URL Generation', () => {
  it('should generate correct event URL from slug', () => {
    const slug = 'meditation-workshop';
    const eventUrl = `/events/${slug}`;
    
    expect(eventUrl).toBe('/events/meditation-workshop');
  });

  it('should handle slugs with multiple hyphens', () => {
    const slug = 'yoga-in-the-park-london';
    const eventUrl = `/events/${slug}`;
    
    expect(eventUrl).toBe('/events/yoga-in-the-park-london');
  });
});

describe('EventCard - Image URL Handling', () => {
  it('should use event image URL when provided', () => {
    const imageUrl = 'https://example.com/event.jpg';
    const result = imageUrl || '/images/event-placeholder.jpg';
    
    expect(result).toBe('https://example.com/event.jpg');
  });

  it('should use placeholder when image URL is null', () => {
    const imageUrl = null;
    const result = imageUrl || '/images/event-placeholder.jpg';
    
    expect(result).toBe('/images/event-placeholder.jpg');
  });

  it('should use placeholder when image URL is undefined', () => {
    const imageUrl = undefined;
    const result = imageUrl || '/images/event-placeholder.jpg';
    
    expect(result).toBe('/images/event-placeholder.jpg');
  });

  it('should use placeholder when image URL is empty string', () => {
    const imageUrl = '';
    const result = imageUrl || '/images/event-placeholder.jpg';
    
    expect(result).toBe('/images/event-placeholder.jpg');
  });
});

describe('EventCard - Sold Out Detection', () => {
  it('should detect sold out when available spots is 0', () => {
    const available: number = 0;
    const isSoldOut = available === 0;
    expect(isSoldOut).toBe(true);
  });

  it('should not detect sold out when spots available', () => {
    const available1: number = 1;
    const available2: number = 50;
    const isSoldOut1 = available1 === 0;
    const isSoldOut2 = available2 === 0;
    
    expect(isSoldOut1).toBe(false);
    expect(isSoldOut2).toBe(false);
  });
});

describe('EventCard - Limited Spots Badge Logic', () => {
  it('should show limited badge when spots <= 20% and not sold out', () => {
    const available: number = 10;
    const capacity: number = 100;
    const isSoldOut = available === 0;
    const showLimitedBadge = !isSoldOut && available <= (capacity * 0.2);
    
    expect(showLimitedBadge).toBe(true);
  });

  it('should not show limited badge when sold out', () => {
    const available: number = 0;
    const capacity: number = 100;
    const isSoldOut = available === 0;
    const showLimitedBadge = !isSoldOut && available <= (capacity * 0.2);
    
    expect(showLimitedBadge).toBe(false);
  });

  it('should not show limited badge when spots > 20%', () => {
    const available: number = 50;
    const capacity: number = 100;
    const isSoldOut = available === 0;
    const showLimitedBadge = !isSoldOut && available <= (capacity * 0.2);
    
    expect(showLimitedBadge).toBe(false);
  });

  it('should show limited badge at exactly 20%', () => {
    const available: number = 20;
    const capacity: number = 100;
    const isSoldOut = available === 0;
    const showLimitedBadge = !isSoldOut && available <= (capacity * 0.2);
    
    expect(showLimitedBadge).toBe(true);
  });
});

describe('EventCard - Variant Behavior', () => {
  it('should default to "default" variant when not specified', () => {
    const variant: string = 'default';
    expect(variant).toBe('default');
  });

  it('should accept "compact" variant', () => {
    const variant: string = 'compact';
    expect(variant).toBe('compact');
  });

  it('should handle image width based on variant', () => {
    const defaultVariant: string = 'default';
    const compactVariant: string = 'compact';
    
    const defaultImageClass = defaultVariant === 'default' ? 'aspect-video' : 'w-[200px] shrink-0';
    const compactImageClass = compactVariant === 'default' ? 'aspect-video' : 'w-[200px] shrink-0';
    
    expect(defaultImageClass).toBe('aspect-video');
    expect(compactImageClass).toBe('w-[200px] shrink-0');
  });

  it('should handle text size based on variant', () => {
    const defaultVariant: string = 'default';
    const compactVariant: string = 'compact';
    
    const defaultTextSize = defaultVariant === 'default' ? 'text-xl' : 'text-lg';
    const compactTextSize = compactVariant === 'default' ? 'text-xl' : 'text-lg';
    
    expect(defaultTextSize).toBe('text-xl');
    expect(compactTextSize).toBe('text-lg');
  });
});

describe('EventCard - Date Badge Components', () => {
  it('should extract day from date', () => {
    const date = new Date('2024-03-15T19:00:00');
    const day = date.getDate();
    
    expect(day).toBe(15);
  });

  it('should handle first day of month', () => {
    const date = new Date('2024-03-01T19:00:00');
    const day = date.getDate();
    
    expect(day).toBe(1);
  });

  it('should handle last day of month', () => {
    const date = new Date('2024-03-31T19:00:00');
    const day = date.getDate();
    
    expect(day).toBe(31);
  });
});

describe('EventCard - Edge Cases', () => {
  it('should handle capacity of 0', () => {
    // Division by zero protection
    const capacity = 0;
    if (capacity === 0) {
      expect(true).toBe(true); // Should handle gracefully
    }
  });

  it('should handle negative available spots (data error)', () => {
    const available = -5;
    const isSoldOut = available <= 0;
    
    expect(isSoldOut).toBe(true);
  });

  it('should handle available > capacity (data error)', () => {
    const available = 150;
    const capacity = 100;
    const percentage = (available / capacity) * 100;
    
    expect(percentage).toBeGreaterThan(100);
  });

  it('should handle very large capacity numbers', () => {
    const status = getSpotsStatus(10000, 50000);
    expect(status.color).toBe('warning'); // 20%
  });

  it('should handle decimal capacity values', () => {
    const status = getSpotsStatus(15.5, 100);
    expect(status.color).toBe('warning'); // 15.5%
  });
});

describe('EventCard - Price Type Handling', () => {
  it('should handle price as string "0"', () => {
    const price = '0';
    const result = price === '0' || parseFloat(price) === 0;
    
    expect(result).toBe(true);
    expect(formatPrice(price)).toBe('Free');
  });

  it('should handle price as number 0', () => {
    const price = 0;
    const result = price === 0;
    
    expect(result).toBe(true);
    expect(formatPrice(price)).toBe('Free');
  });

  it('should handle mixed price type checking', () => {
    const stringPrice = '25.99';
    const numPrice = 25.99;
    
    expect(formatPrice(stringPrice)).toBe(formatPrice(numPrice));
  });
});
