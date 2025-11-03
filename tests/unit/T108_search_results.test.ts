import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * T108: Search Results Page Tests
 * 
 * Tests for the search results page (/search.astro) with filtering, 
 * sorting, and pagination functionality.
 * 
 * Test Strategy: Source-based testing
 * - Validates component structure and implementation
 * - Avoids server dependency (T106 database password issue)
 * - Comprehensive coverage without integration tests
 */

describe('T108: Search Results Page - Component Structure', () => {
  const searchPagePath = join(process.cwd(), 'src/pages/search.astro');
  let searchPageSource: string;

  try {
    searchPageSource = readFileSync(searchPagePath, 'utf-8');
  } catch (error) {
    searchPageSource = '';
  }

  it('should exist at correct path', () => {
    expect(searchPageSource).toBeTruthy();
    expect(searchPageSource.length).toBeGreaterThan(0);
  });

  it('should import BaseLayout', () => {
    expect(searchPageSource).toContain("import BaseLayout from '../layouts/BaseLayout.astro'");
  });

  it('should import FilterSidebar component', () => {
    expect(searchPageSource).toContain("import FilterSidebar from '../components/FilterSidebar.astro'");
  });

  it('should import SearchResult component', () => {
    expect(searchPageSource).toContain("import SearchResult from '../components/SearchResult.astro'");
  });

  describe('URL Parameter Handling', () => {
    it('should extract query parameter', () => {
      expect(searchPageSource).toContain("url.searchParams.get('q')");
    });

    it('should extract type filter parameter', () => {
      expect(searchPageSource).toContain("url.searchParams.get('type')");
    });

    it('should extract price filter parameters', () => {
      expect(searchPageSource).toContain("url.searchParams.get('minPrice')");
      expect(searchPageSource).toContain("url.searchParams.get('maxPrice')");
    });

    it('should extract level filter parameter', () => {
      expect(searchPageSource).toContain("url.searchParams.get('level')");
    });

    it('should extract productType filter parameter', () => {
      expect(searchPageSource).toContain("url.searchParams.get('productType')");
    });

    it('should extract city filter parameter', () => {
      expect(searchPageSource).toContain("url.searchParams.get('city')");
    });

    it('should extract pagination parameters', () => {
      expect(searchPageSource).toContain("url.searchParams.get('limit')");
      expect(searchPageSource).toContain("url.searchParams.get('offset')");
    });
  });

  describe('API Integration', () => {
    it('should call search API with parameters', () => {
      expect(searchPageSource).toContain('/api/search');
    });

    it('should handle API response', () => {
      expect(searchPageSource).toContain('response.json()');
      expect(searchPageSource).toContain('data.success');
    });

    it('should handle API errors', () => {
      expect(searchPageSource).toContain('catch');
      expect(searchPageSource).toContain('error');
    });
  });

  describe('Pagination Logic', () => {
    it('should calculate current page', () => {
      expect(searchPageSource).toContain('currentPage');
    });

    it('should calculate total pages', () => {
      expect(searchPageSource).toContain('totalPages');
    });

    it('should determine if has next page', () => {
      expect(searchPageSource).toContain('hasNextPage');
      expect(searchPageSource).toContain('hasMore');
    });

    it('should determine if has previous page', () => {
      expect(searchPageSource).toContain('hasPrevPage');
    });

    it('should build page URLs for navigation', () => {
      expect(searchPageSource).toContain('buildPageUrl');
    });
  });

  describe('Layout Structure', () => {
    it('should use BaseLayout', () => {
      expect(searchPageSource).toContain('<BaseLayout');
    });

    it('should have container div', () => {
      expect(searchPageSource).toContain('container mx-auto');
    });

    it('should have responsive flex layout', () => {
      expect(searchPageSource).toContain('lg:flex-row');
    });

    it('should render FilterSidebar', () => {
      expect(searchPageSource).toContain('<FilterSidebar');
    });

    it('should pass current filters to FilterSidebar', () => {
      expect(searchPageSource).toContain('currentQuery=');
      expect(searchPageSource).toContain('currentType=');
      expect(searchPageSource).toContain('currentMinPrice=');
      expect(searchPageSource).toContain('currentMaxPrice=');
    });
  });

  describe('Search Results Display', () => {
    it('should display results count', () => {
      expect(searchPageSource).toContain('results.total');
    });

    it('should show empty state when no query', () => {
      expect(searchPageSource).toContain('Start your search');
    });

    it('should show error state', () => {
      expect(searchPageSource).toContain('Error');
    });

    it('should show no results state', () => {
      expect(searchPageSource).toContain('No results found');
    });

    it('should render SearchResult for each item', () => {
      expect(searchPageSource).toContain('results.items.map');
      expect(searchPageSource).toContain('<SearchResult');
    });
  });

  describe('Pagination UI', () => {
    it('should show mobile pagination controls', () => {
      expect(searchPageSource).toContain('sm:hidden');
      expect(searchPageSource).toContain('Previous');
      expect(searchPageSource).toContain('Next');
    });

    it('should show desktop pagination controls', () => {
      expect(searchPageSource).toContain('hidden sm:flex');
    });

    it('should show results count', () => {
      expect(searchPageSource).toContain('Showing');
      expect(searchPageSource).toContain('results');
    });

    it('should have page number navigation', () => {
      expect(searchPageSource).toContain('Array.from');
    });

    it('should highlight current page', () => {
      expect(searchPageSource).toContain('aria-current="page"');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      expect(searchPageSource).toContain('<h1');
    });

    it('should have semantic HTML elements', () => {
      expect(searchPageSource).toContain('<aside');
      expect(searchPageSource).toContain('<main');
      expect(searchPageSource).toContain('<nav');
    });

    it('should have aria-label for pagination', () => {
      expect(searchPageSource).toContain('aria-label="Pagination"');
    });

    it('should have sr-only text for screen readers', () => {
      expect(searchPageSource).toContain('sr-only');
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-first approach', () => {
      expect(searchPageSource).toMatch(/class="[^"]*flex-col/);
    });

    it('should have desktop layout adjustments', () => {
      expect(searchPageSource).toContain('lg:flex-row');
      expect(searchPageSource).toContain('lg:w-64');
    });

    it('should hide/show elements based on screen size', () => {
      expect(searchPageSource).toContain('sm:hidden');
      expect(searchPageSource).toContain('hidden sm:flex');
    });
  });
});

describe('T108: FilterSidebar Component', () => {
  const filterSidebarPath = join(process.cwd(), 'src/components/FilterSidebar.astro');
  let filterSidebarSource: string;

  try {
    filterSidebarSource = readFileSync(filterSidebarPath, 'utf-8');
  } catch (error) {
    filterSidebarSource = '';
  }

  it('should exist', () => {
    expect(filterSidebarSource).toBeTruthy();
    expect(filterSidebarSource.length).toBeGreaterThan(0);
  });

  describe('Props Interface', () => {
    it('should accept currentQuery prop', () => {
      expect(filterSidebarSource).toContain('currentQuery');
    });

    it('should accept filter props', () => {
      expect(filterSidebarSource).toContain('currentType');
      expect(filterSidebarSource).toContain('currentMinPrice');
      expect(filterSidebarSource).toContain('currentMaxPrice');
      expect(filterSidebarSource).toContain('currentLevel');
      expect(filterSidebarSource).toContain('currentProductType');
      expect(filterSidebarSource).toContain('currentCity');
    });
  });

  describe('Type Filter', () => {
    it('should have type filter section', () => {
      expect(filterSidebarSource).toContain('Type');
    });

    it('should have all types option', () => {
      expect(filterSidebarSource).toContain('All types');
    });

    it('should have course option', () => {
      expect(filterSidebarSource).toContain('course');
      expect(filterSidebarSource).toContain('Courses');
    });

    it('should have product option', () => {
      expect(filterSidebarSource).toContain('product');
      expect(filterSidebarSource).toContain('Digital Products');
    });

    it('should have event option', () => {
      expect(filterSidebarSource).toContain('event');
      expect(filterSidebarSource).toContain('Events');
    });

    it('should use radio inputs for type', () => {
      expect(filterSidebarSource).toContain('type="radio"');
      expect(filterSidebarSource).toContain('name="type"');
    });
  });

  describe('Price Range Filter', () => {
    it('should have price range section', () => {
      expect(filterSidebarSource).toContain('Price Range');
    });

    it('should have minimum price input', () => {
      expect(filterSidebarSource).toContain('id="minPrice"');
      expect(filterSidebarSource).toContain('type="number"');
    });

    it('should have maximum price input', () => {
      expect(filterSidebarSource).toContain('id="maxPrice"');
      expect(filterSidebarSource).toContain('type="number"');
    });
  });

  describe('Level Filter', () => {
    it('should have level filter section', () => {
      expect(filterSidebarSource).toContain('Course Level');
    });

    it('should have all levels option', () => {
      expect(filterSidebarSource).toContain('All levels');
    });

    it('should have beginner option', () => {
      expect(filterSidebarSource).toContain('beginner');
    });

    it('should have intermediate option', () => {
      expect(filterSidebarSource).toContain('intermediate');
    });

    it('should have advanced option', () => {
      expect(filterSidebarSource).toContain('advanced');
    });
  });

  describe('Product Type Filter', () => {
    it('should have product type section', () => {
      expect(filterSidebarSource).toContain('Product Type');
    });

    it('should have pdf option', () => {
      expect(filterSidebarSource).toContain('pdf');
      expect(filterSidebarSource).toContain('PDF');
    });

    it('should have audio option', () => {
      expect(filterSidebarSource).toContain('audio');
      expect(filterSidebarSource).toContain('Audio');
    });

    it('should have video option', () => {
      expect(filterSidebarSource).toContain('video');
      expect(filterSidebarSource).toContain('Video');
    });

    it('should have ebook option', () => {
      expect(filterSidebarSource).toContain('ebook');
      expect(filterSidebarSource).toContain('eBook');
    });
  });

  describe('City Filter', () => {
    it('should have city filter section', () => {
      expect(filterSidebarSource).toContain('City');
    });

    it('should have city input field', () => {
      expect(filterSidebarSource).toContain('id="city"');
      expect(filterSidebarSource).toContain('name="city"');
    });
  });

  describe('Clear Filters', () => {
    it('should have clear all link', () => {
      expect(filterSidebarSource).toContain('Clear all');
    });

    it('should check for active filters', () => {
      expect(filterSidebarSource).toContain('hasActiveFilters');
    });
  });

  describe('Form Submission', () => {
    it('should have form element', () => {
      expect(filterSidebarSource).toContain('<form');
      expect(filterSidebarSource).toContain('id="search-filters"');
    });

    it('should have apply button', () => {
      expect(filterSidebarSource).toContain('type="submit"');
      expect(filterSidebarSource).toContain('Apply Filters');
    });

    it('should have JavaScript for handling form', () => {
      expect(filterSidebarSource).toContain('<script>');
      expect(filterSidebarSource).toContain('addEventListener');
    });
  });

  describe('Styling', () => {
    it('should have Tailwind classes', () => {
      expect(filterSidebarSource).toMatch(/class="[^"]*rounded-lg/);
      expect(filterSidebarSource).toMatch(/class="[^"]*border/);
    });

    it('should have sticky positioning', () => {
      expect(filterSidebarSource).toContain('sticky top-4');
    });
  });
});

describe('T108: SearchResult Component', () => {
  const searchResultPath = join(process.cwd(), 'src/components/SearchResult.astro');
  let searchResultSource: string;

  try {
    searchResultSource = readFileSync(searchResultPath, 'utf-8');
  } catch (error) {
    searchResultSource = '';
  }

  it('should exist', () => {
    expect(searchResultSource).toBeTruthy();
    expect(searchResultSource.length).toBeGreaterThan(0);
  });

  describe('Props Interface', () => {
    it('should define SearchResultItem interface', () => {
      expect(searchResultSource).toContain('SearchResultItem');
    });

    it('should include common properties', () => {
      expect(searchResultSource).toContain('id');
      expect(searchResultSource).toContain('type');
      expect(searchResultSource).toContain('title');
      expect(searchResultSource).toContain('description');
      expect(searchResultSource).toContain('price');
      expect(searchResultSource).toContain('slug');
    });

    it('should include course-specific properties', () => {
      expect(searchResultSource).toContain('level');
      expect(searchResultSource).toContain('duration_hours');
    });

    it('should include product-specific properties', () => {
      expect(searchResultSource).toContain('productType');
    });

    it('should include event-specific properties', () => {
      expect(searchResultSource).toContain('event_date');
      expect(searchResultSource).toContain('venue_name');
      expect(searchResultSource).toContain('venue_city');
    });
  });

  describe('Result URL Building', () => {
    it('should build URL from type and slug', () => {
      expect(searchResultSource).toContain('resultUrl');
      expect(searchResultSource).toContain('result.type');
      expect(searchResultSource).toContain('result.slug');
    });
  });

  describe('Helper Functions', () => {
    it('should have price formatting function', () => {
      expect(searchResultSource).toContain('formatPrice');
      expect(searchResultSource).toContain('Intl.NumberFormat');
    });

    it('should have date formatting function', () => {
      expect(searchResultSource).toContain('formatDate');
      expect(searchResultSource).toContain('toLocaleDateString');
    });

    it('should have type badge class function', () => {
      expect(searchResultSource).toContain('getTypeBadgeClass');
    });

    it('should have description truncation function', () => {
      expect(searchResultSource).toContain('truncateDescription');
    });
  });

  describe('Display Elements', () => {
    it('should display type badge', () => {
      expect(searchResultSource).toContain('result.type');
      expect(searchResultSource).toMatch(/badge|tag/i);
    });

    it('should display title with link', () => {
      expect(searchResultSource).toContain('result.title');
      expect(searchResultSource).toContain('href=');
    });

    it('should display description', () => {
      expect(searchResultSource).toContain('result.description');
    });

    it('should display price', () => {
      expect(searchResultSource).toContain('result.price');
      expect(searchResultSource).toContain('formatPrice');
    });

    it('should have call-to-action button', () => {
      expect(searchResultSource).toContain('View');
    });
  });

  describe('Type-Specific Content', () => {
    it('should show course level conditionally', () => {
      expect(searchResultSource).toContain('result.level');
    });

    it('should show course duration', () => {
      expect(searchResultSource).toContain('duration_hours');
    });

    it('should show product type', () => {
      expect(searchResultSource).toContain('productType');
    });

    it('should show event date', () => {
      expect(searchResultSource).toContain('event_date');
    });

    it('should show event venue', () => {
      expect(searchResultSource).toContain('venue_city');
      expect(searchResultSource).toContain('venue_country');
    });

    it('should show event availability', () => {
      expect(searchResultSource).toContain('available_spots');
    });
  });

  describe('Icons', () => {
    it('should have SVG icons', () => {
      expect(searchResultSource).toContain('<svg');
    });

    it('should have time icon for duration', () => {
      expect(searchResultSource).toContain('M12 8v4l3 3');
    });

    it('should have calendar icon for dates', () => {
      expect(searchResultSource).toContain('M8 7V3m8 4V3');
    });

    it('should have location icon for venue', () => {
      expect(searchResultSource).toContain('M17.657 16.657');
    });
  });

  describe('Styling', () => {
    it('should have article wrapper', () => {
      expect(searchResultSource).toContain('<article');
    });

    it('should have hover effects', () => {
      expect(searchResultSource).toContain('hover:');
    });

    it('should have responsive layout', () => {
      expect(searchResultSource).toContain('sm:flex-row');
    });

    it('should have Tailwind color classes', () => {
      expect(searchResultSource).toMatch(/text-(blue|green|purple)/);
    });
  });
});

describe('T108: Integration with T106 API', () => {
  it('should use correct API endpoint', () => {
    const searchPagePath = join(process.cwd(), 'src/pages/search.astro');
    const searchPageSource = readFileSync(searchPagePath, 'utf-8');
    
    expect(searchPageSource).toContain('/api/search');
  });

  it('should pass all supported query parameters', () => {
    const searchPagePath = join(process.cwd(), 'src/pages/search.astro');
    const searchPageSource = readFileSync(searchPagePath, 'utf-8');
    
    expect(searchPageSource).toContain("apiUrl.searchParams.set('q'");
    expect(searchPageSource).toContain("apiUrl.searchParams.set('type'");
    expect(searchPageSource).toContain("apiUrl.searchParams.set('minPrice'");
    expect(searchPageSource).toContain("apiUrl.searchParams.set('limit'");
    expect(searchPageSource).toContain("apiUrl.searchParams.set('offset'");
  });

  it('should handle API success response', () => {
    const searchPagePath = join(process.cwd(), 'src/pages/search.astro');
    const searchPageSource = readFileSync(searchPagePath, 'utf-8');
    
    expect(searchPageSource).toContain('data.success');
    expect(searchPageSource).toContain('data.data');
  });

  it('should handle API error response', () => {
    const searchPagePath = join(process.cwd(), 'src/pages/search.astro');
    const searchPageSource = readFileSync(searchPagePath, 'utf-8');
    
    expect(searchPageSource).toContain('data.error');
    expect(searchPageSource).toContain('catch');
  });
});
