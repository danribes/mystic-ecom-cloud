/**
 * T079 Events Page Tests
 * 
 * Unit tests for the events catalog page filtering and pagination logic.
 * Tests URL parameter parsing, filter building, and pagination calculations.
 */

import { describe, it, expect } from 'vitest';

/**
 * Helper function to simulate URL parsing for filters
 */
function parseFilters(searchParams: URLSearchParams) {
  const city = searchParams.get('city') || undefined;
  const country = searchParams.get('country') || undefined;
  const startDateStr = searchParams.get('startDate') || undefined;
  const endDateStr = searchParams.get('endDate') || undefined;

  return {
    city,
    country,
    startDate: startDateStr ? new Date(startDateStr) : undefined,
    endDate: endDateStr ? new Date(endDateStr) : undefined,
    isPublished: true,
  };
}

/**
 * Helper function to simulate pagination logic
 */
function calculatePagination(
  totalItems: number,
  page: number,
  pageSize: number
) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    totalPages,
    startIndex,
    endIndex,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Helper function to build page URL with filters
 */
function buildPageUrl(
  baseUrl: string,
  page: number,
  filters: { city?: string; country?: string; startDate?: string; endDate?: string }
): string {
  const searchParams = new URLSearchParams();
  
  if (filters.city) searchParams.set('city', filters.city);
  if (filters.country) searchParams.set('country', filters.country);
  if (filters.startDate) searchParams.set('startDate', filters.startDate);
  if (filters.endDate) searchParams.set('endDate', filters.endDate);
  if (page > 1) searchParams.set('page', page.toString());

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

describe('Events Page Filter Parsing', () => {
  it('should parse city filter from URL params', () => {
    const params = new URLSearchParams('city=London');
    const filters = parseFilters(params);

    expect(filters.city).toBe('London');
    expect(filters.country).toBeUndefined();
    expect(filters.isPublished).toBe(true);
  });

  it('should parse country filter from URL params', () => {
    const params = new URLSearchParams('country=UK');
    const filters = parseFilters(params);

    expect(filters.country).toBe('UK');
    expect(filters.city).toBeUndefined();
  });

  it('should parse date range filters from URL params', () => {
    const params = new URLSearchParams('startDate=2024-01-01&endDate=2024-12-31');
    const filters = parseFilters(params);

    expect(filters.startDate).toEqual(new Date('2024-01-01'));
    expect(filters.endDate).toEqual(new Date('2024-12-31'));
  });

  it('should parse multiple filters from URL params', () => {
    const params = new URLSearchParams('city=Paris&country=France&startDate=2024-06-01');
    const filters = parseFilters(params);

    expect(filters.city).toBe('Paris');
    expect(filters.country).toBe('France');
    expect(filters.startDate).toEqual(new Date('2024-06-01'));
    expect(filters.isPublished).toBe(true);
  });

  it('should return undefined for missing filters', () => {
    const params = new URLSearchParams();
    const filters = parseFilters(params);

    expect(filters.city).toBeUndefined();
    expect(filters.country).toBeUndefined();
    expect(filters.startDate).toBeUndefined();
    expect(filters.endDate).toBeUndefined();
    expect(filters.isPublished).toBe(true);
  });

  it('should handle URL-encoded filter values', () => {
    const params = new URLSearchParams('city=New%20York&country=United%20States');
    const filters = parseFilters(params);

    expect(filters.city).toBe('New York');
    expect(filters.country).toBe('United States');
  });
});

describe('Events Page Pagination Logic', () => {
  const pageSize = 12;

  it('should calculate correct pagination for first page', () => {
    const totalItems = 50;
    const page = 1;
    const pagination = calculatePagination(totalItems, page, pageSize);

    expect(pagination.totalPages).toBe(5);
    expect(pagination.startIndex).toBe(0);
    expect(pagination.endIndex).toBe(12);
    expect(pagination.hasNextPage).toBe(true);
    expect(pagination.hasPrevPage).toBe(false);
  });

  it('should calculate correct pagination for middle page', () => {
    const totalItems = 50;
    const page = 3;
    const pagination = calculatePagination(totalItems, page, pageSize);

    expect(pagination.totalPages).toBe(5);
    expect(pagination.startIndex).toBe(24);
    expect(pagination.endIndex).toBe(36);
    expect(pagination.hasNextPage).toBe(true);
    expect(pagination.hasPrevPage).toBe(true);
  });

  it('should calculate correct pagination for last page', () => {
    const totalItems = 50;
    const page = 5;
    const pagination = calculatePagination(totalItems, page, pageSize);

    expect(pagination.totalPages).toBe(5);
    expect(pagination.startIndex).toBe(48);
    expect(pagination.endIndex).toBe(60);
    expect(pagination.hasNextPage).toBe(false);
    expect(pagination.hasPrevPage).toBe(true);
  });

  it('should handle exact page boundary', () => {
    const totalItems = 48; // Exactly 4 pages
    const page = 4;
    const pagination = calculatePagination(totalItems, page, pageSize);

    expect(pagination.totalPages).toBe(4);
    expect(pagination.startIndex).toBe(36);
    expect(pagination.endIndex).toBe(48);
    expect(pagination.hasNextPage).toBe(false);
    expect(pagination.hasPrevPage).toBe(true);
  });

  it('should handle single page of results', () => {
    const totalItems = 8;
    const page = 1;
    const pagination = calculatePagination(totalItems, page, pageSize);

    expect(pagination.totalPages).toBe(1);
    expect(pagination.startIndex).toBe(0);
    expect(pagination.endIndex).toBe(12);
    expect(pagination.hasNextPage).toBe(false);
    expect(pagination.hasPrevPage).toBe(false);
  });

  it('should handle empty results', () => {
    const totalItems = 0;
    const page = 1;
    const pagination = calculatePagination(totalItems, page, pageSize);

    expect(pagination.totalPages).toBe(0);
    expect(pagination.startIndex).toBe(0);
    expect(pagination.endIndex).toBe(12);
    expect(pagination.hasNextPage).toBe(false);
    expect(pagination.hasPrevPage).toBe(false);
  });

  it('should calculate indices for slicing results array', () => {
    const totalItems = 50;
    const page = 2;
    const pagination = calculatePagination(totalItems, page, pageSize);
    
    // Simulate slicing
    const mockEvents = Array.from({ length: totalItems }, (_, i) => ({ id: i + 1 }));
    const pageEvents = mockEvents.slice(pagination.startIndex, pagination.endIndex);

    expect(pageEvents.length).toBe(12);
    expect(pageEvents[0]!.id).toBe(13); // First item on page 2
    expect(pageEvents[11]!.id).toBe(24); // Last item on page 2
  });
});

describe('Events Page URL Building', () => {
  const baseUrl = '/events';

  it('should build URL with page parameter only', () => {
    const url = buildPageUrl(baseUrl, 2, {});
    expect(url).toBe('/events?page=2');
  });

  it('should build URL with city filter', () => {
    const url = buildPageUrl(baseUrl, 1, { city: 'London' });
    expect(url).toBe('/events?city=London');
  });

  it('should build URL with multiple filters', () => {
    const url = buildPageUrl(baseUrl, 1, { 
      city: 'Paris', 
      country: 'France' 
    });
    expect(url).toContain('city=Paris');
    expect(url).toContain('country=France');
  });

  it('should build URL with filters and page number', () => {
    const url = buildPageUrl(baseUrl, 3, { 
      city: 'Tokyo', 
      startDate: '2024-06-01' 
    });
    expect(url).toContain('city=Tokyo');
    expect(url).toContain('startDate=2024-06-01');
    expect(url).toContain('page=3');
  });

  it('should omit page parameter for page 1', () => {
    const url = buildPageUrl(baseUrl, 1, { country: 'USA' });
    expect(url).toBe('/events?country=USA');
    expect(url).not.toContain('page=');
  });

  it('should handle URL encoding for filter values', () => {
    const url = buildPageUrl(baseUrl, 1, { city: 'New York' });
    expect(url).toContain('city=New+York');
  });

  it('should build URL with date range filters', () => {
    const url = buildPageUrl(baseUrl, 1, { 
      startDate: '2024-01-01', 
      endDate: '2024-12-31' 
    });
    expect(url).toContain('startDate=2024-01-01');
    expect(url).toContain('endDate=2024-12-31');
  });

  it('should return base URL when no filters or page', () => {
    const url = buildPageUrl(baseUrl, 1, {});
    expect(url).toBe('/events');
  });
});

describe('Events Page Filter Combinations', () => {
  it('should handle city filter only', () => {
    const params = new URLSearchParams('city=Berlin');
    const filters = parseFilters(params);

    expect(filters).toEqual({
      city: 'Berlin',
      country: undefined,
      startDate: undefined,
      endDate: undefined,
      isPublished: true,
    });
  });

  it('should handle country filter only', () => {
    const params = new URLSearchParams('country=Germany');
    const filters = parseFilters(params);

    expect(filters).toEqual({
      city: undefined,
      country: 'Germany',
      startDate: undefined,
      endDate: undefined,
      isPublished: true,
    });
  });

  it('should handle date range filter only', () => {
    const params = new URLSearchParams('startDate=2024-03-01&endDate=2024-03-31');
    const filters = parseFilters(params);

    expect(filters.startDate).toEqual(new Date('2024-03-01'));
    expect(filters.endDate).toEqual(new Date('2024-03-31'));
    expect(filters.city).toBeUndefined();
    expect(filters.country).toBeUndefined();
  });

  it('should handle all filters combined', () => {
    const params = new URLSearchParams(
      'city=Barcelona&country=Spain&startDate=2024-07-01&endDate=2024-07-31'
    );
    const filters = parseFilters(params);

    expect(filters.city).toBe('Barcelona');
    expect(filters.country).toBe('Spain');
    expect(filters.startDate).toEqual(new Date('2024-07-01'));
    expect(filters.endDate).toEqual(new Date('2024-07-31'));
    expect(filters.isPublished).toBe(true);
  });
});

describe('Events Page Edge Cases', () => {
  it('should handle invalid date strings gracefully', () => {
    const params = new URLSearchParams('startDate=invalid-date');
    const filters = parseFilters(params);

    expect(filters.startDate).toBeInstanceOf(Date);
    expect(isNaN(filters.startDate!.getTime())).toBe(true); // Invalid Date
  });

  it('should handle empty filter values', () => {
    const params = new URLSearchParams('city=&country=');
    const filters = parseFilters(params);

    expect(filters.city).toBeUndefined();
    expect(filters.country).toBeUndefined();
  });

  it('should handle very large page numbers', () => {
    const totalItems = 50;
    const page = 999;
    const pageSize = 12;
    const pagination = calculatePagination(totalItems, page, pageSize);

    expect(pagination.totalPages).toBe(5);
    expect(pagination.hasNextPage).toBe(false);
    expect(pagination.startIndex).toBe(11976); // (999-1) * 12
  });

  it('should handle page 0 or negative pages', () => {
    const totalItems = 50;
    const page = 0;
    const pageSize = 12;
    const pagination = calculatePagination(totalItems, page, pageSize);

    expect(pagination.startIndex).toBe(-12); // (0-1) * 12
    expect(pagination.endIndex).toBe(0);
  });

  it('should preserve filter order in URL', () => {
    const url1 = buildPageUrl('/events', 2, { 
      city: 'London', 
      country: 'UK',
      startDate: '2024-01-01'
    });
    
    // URL should contain all filters
    expect(url1).toContain('city=London');
    expect(url1).toContain('country=UK');
    expect(url1).toContain('startDate=2024-01-01');
    expect(url1).toContain('page=2');
  });
});

describe('Events Page Data Slicing', () => {
  it('should correctly slice array for page 1', () => {
    const mockEvents = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
    const { startIndex, endIndex } = calculatePagination(50, 1, 12);
    const pageEvents = mockEvents.slice(startIndex, endIndex);

    expect(pageEvents.length).toBe(12);
    expect(pageEvents[0]!.id).toBe(1);
    expect(pageEvents[11]!.id).toBe(12);
  });

  it('should correctly slice array for last partial page', () => {
    const mockEvents = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
    const { startIndex, endIndex } = calculatePagination(50, 5, 12);
    const pageEvents = mockEvents.slice(startIndex, endIndex);

    expect(pageEvents.length).toBe(2); // Only 2 items on last page
    expect(pageEvents[0]!.id).toBe(49);
    expect(pageEvents[1]!.id).toBe(50);
  });

  it('should handle slicing beyond array length', () => {
    const mockEvents = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
    const { startIndex, endIndex } = calculatePagination(20, 3, 12);
    const pageEvents = mockEvents.slice(startIndex, endIndex);

    expect(pageEvents.length).toBe(0); // Page 3 is beyond data
  });
});
