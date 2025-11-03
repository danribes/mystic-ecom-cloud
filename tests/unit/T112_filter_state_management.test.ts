/**
 * Tests for Filter State Management Library
 * 
 * Comprehensive test suite validating URL-based filter state management
 * functionality used across catalog pages.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  FilterStateManager,
  createFilterManager,
  COMMON_FILTERS,
  COURSE_FILTERS,
  EVENT_FILTERS,
  PRODUCT_FILTERS,
  type FilterConfig,
  type FilterParam,
  type BuildUrlOptions,
} from '../../src/lib/filterState';

// Helper to create test URLs
function createTestUrl(path: string, params: Record<string, string> = {}): URL {
  const url = new URL(`http://localhost${path}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
}

describe('FilterStateManager', () => {
  describe('Constructor and Basic Initialization', () => {
    test('should create instance with valid URL and base path', () => {
      const url = createTestUrl('/products');
      const manager = new FilterStateManager(url, '/products');
      
      expect(manager).toBeInstanceOf(FilterStateManager);
    });

    test('should handle URLs with existing query parameters', () => {
      const url = createTestUrl('/products', { type: 'pdf', minPrice: '10' });
      const manager = new FilterStateManager(url, '/products');
      
      expect(manager.getParam('type')).toBe('pdf');
      expect(manager.getParam('minPrice')).toBe('10');
    });

    test('should work with different base paths', () => {
      const paths = ['/products', '/courses', '/events', '/search'];
      
      paths.forEach(path => {
        const url = createTestUrl(path);
        const manager = new FilterStateManager(url, path);
        expect(manager).toBeInstanceOf(FilterStateManager);
      });
    });
  });

  describe('getParam', () => {
    let manager: FilterStateManager;

    beforeEach(() => {
      const url = createTestUrl('/products', {
        type: 'pdf',
        search: 'meditation',
        minPrice: '10.50',
      });
      manager = new FilterStateManager(url, '/products');
    });

    test('should retrieve existing string parameter', () => {
      expect(manager.getParam('type')).toBe('pdf');
      expect(manager.getParam('search')).toBe('meditation');
    });

    test('should return empty string for non-existent parameter', () => {
      expect(manager.getParam('nonexistent')).toBe('');
    });

    test('should return custom default value for non-existent parameter', () => {
      expect(manager.getParam('sort', 'newest')).toBe('newest');
      expect(manager.getParam('page', '1')).toBe('1');
    });

    test('should return actual value over default if parameter exists', () => {
      expect(manager.getParam('type', 'all')).toBe('pdf');
    });
  });

  describe('getNumericParam', () => {
    let manager: FilterStateManager;

    beforeEach(() => {
      const url = createTestUrl('/products', {
        minPrice: '10.50',
        maxPrice: '100',
        minSize: '0',
        invalid: 'not-a-number',
      });
      manager = new FilterStateManager(url, '/products');
    });

    test('should parse float values correctly', () => {
      expect(manager.getNumericParam('minPrice')).toBe(10.50);
      expect(manager.getNumericParam('maxPrice')).toBe(100);
    });

    test('should handle zero as valid number', () => {
      expect(manager.getNumericParam('minSize')).toBe(0);
    });

    test('should return undefined for non-existent parameter', () => {
      expect(manager.getNumericParam('nonexistent')).toBeUndefined();
    });

    test('should return custom default for non-existent parameter', () => {
      expect(manager.getNumericParam('missing', 5.5)).toBe(5.5);
    });

    test('should return default for invalid number string', () => {
      expect(manager.getNumericParam('invalid')).toBeUndefined();
      expect(manager.getNumericParam('invalid', 0)).toBe(0);
    });
  });

  describe('getIntParam', () => {
    let manager: FilterStateManager;

    beforeEach(() => {
      const url = createTestUrl('/products', {
        page: '3',
        limit: '20',
        zero: '0',
        float: '3.7',
        invalid: 'abc',
      });
      manager = new FilterStateManager(url, '/products');
    });

    test('should parse integer values correctly', () => {
      expect(manager.getIntParam('page')).toBe(3);
      expect(manager.getIntParam('limit')).toBe(20);
    });

    test('should handle zero correctly', () => {
      expect(manager.getIntParam('zero')).toBe(0);
    });

    test('should truncate float to integer', () => {
      expect(manager.getIntParam('float')).toBe(3);
    });

    test('should return default 1 for non-existent parameter', () => {
      expect(manager.getIntParam('nonexistent')).toBe(1);
    });

    test('should return custom default for non-existent parameter', () => {
      expect(manager.getIntParam('missing', 10)).toBe(10);
    });

    test('should return default for invalid integer string', () => {
      expect(manager.getIntParam('invalid')).toBe(1);
      expect(manager.getIntParam('invalid', 5)).toBe(5);
    });
  });

  describe('getFilters', () => {
    test('should extract multiple filters based on configs', () => {
      const url = createTestUrl('/products', {
        type: 'pdf',
        minPrice: '10',
        maxPrice: '50',
      });
      const manager = new FilterStateManager(url, '/products');

      const configs: FilterConfig[] = [
        { name: 'type' },
        { name: 'minPrice' },
        { name: 'maxPrice' },
        { name: 'search' },
      ];

      const filters = manager.getFilters(configs);

      expect(filters.type).toBe('pdf');
      expect(filters.minPrice).toBe('10');
      expect(filters.maxPrice).toBe('50');
      expect(filters.search).toBeUndefined();
    });

    test('should apply default values for missing parameters', () => {
      const url = createTestUrl('/products');
      const manager = new FilterStateManager(url, '/products');

      const configs: FilterConfig[] = [
        { name: 'type', defaultValue: 'all' },
        { name: 'sort', defaultValue: 'newest' },
      ];

      const filters = manager.getFilters(configs);

      expect(filters.type).toBe('all');
      expect(filters.sort).toBe('newest');
    });

    test('should validate parameters using custom validator', () => {
      const url = createTestUrl('/products', {
        minPrice: '-10',
        maxPrice: '50',
      });
      const manager = new FilterStateManager(url, '/products');

      const configs: FilterConfig[] = [
        {
          name: 'minPrice',
          validate: (v) => parseFloat(v) >= 0,
          defaultValue: '0',
        },
        {
          name: 'maxPrice',
          validate: (v) => parseFloat(v) >= 0,
        },
      ];

      const filters = manager.getFilters(configs);

      expect(filters.minPrice).toBe('0'); // Invalid, used default
      expect(filters.maxPrice).toBe('50'); // Valid
    });

    test('should skip invalid parameters without default', () => {
      const url = createTestUrl('/products', { minPrice: 'invalid' });
      const manager = new FilterStateManager(url, '/products');

      const configs: FilterConfig[] = [
        {
          name: 'minPrice',
          validate: (v) => !isNaN(parseFloat(v)),
        },
      ];

      const filters = manager.getFilters(configs);

      expect(filters.minPrice).toBeUndefined();
    });
  });

  describe('buildPageUrl', () => {
    let manager: FilterStateManager;
    const currentFilters = {
      type: 'pdf',
      search: 'meditation',
      minPrice: '10',
      maxPrice: '50',
    };

    beforeEach(() => {
      const url = createTestUrl('/products', currentFilters);
      manager = new FilterStateManager(url, '/products');
    });

    test('should build URL with page number and all filters', () => {
      const url = manager.buildPageUrl(2, currentFilters);

      expect(url).toContain('/products?');
      expect(url).toContain('page=2');
      expect(url).toContain('type=pdf');
      expect(url).toContain('search=meditation');
      expect(url).toContain('minPrice=10');
      expect(url).toContain('maxPrice=50');
    });

    test('should handle page 1 correctly', () => {
      const url = manager.buildPageUrl(1, currentFilters);

      expect(url).toContain('page=1');
    });

    test('should skip empty filter values', () => {
      const filtersWithEmpty = {
        ...currentFilters,
        category: '',
        level: '',
      };

      const url = manager.buildPageUrl(1, filtersWithEmpty);

      expect(url).not.toContain('category');
      expect(url).not.toContain('level');
    });

    test('should handle options.preserveFilters', () => {
      const url = manager.buildPageUrl(1, currentFilters, {
        preserveFilters: ['type', 'search'],
      });

      expect(url).toContain('type=pdf');
      expect(url).toContain('search=meditation');
      expect(url).not.toContain('minPrice');
      expect(url).not.toContain('maxPrice');
    });

    test('should handle options.excludeFilters', () => {
      const url = manager.buildPageUrl(1, currentFilters, {
        excludeFilters: ['minPrice', 'maxPrice'],
      });

      expect(url).toContain('type=pdf');
      expect(url).toContain('search=meditation');
      expect(url).not.toContain('minPrice');
      expect(url).not.toContain('maxPrice');
    });
  });

  describe('buildClearFilterUrl', () => {
    let manager: FilterStateManager;
    const currentFilters = {
      type: 'pdf',
      search: 'meditation',
      minPrice: '10',
      maxPrice: '50',
      sort: 'price-asc',
    };

    beforeEach(() => {
      const url = createTestUrl('/products', { page: '3', ...currentFilters });
      manager = new FilterStateManager(url, '/products');
    });

    test('should clear specific filter and reset page to 1', () => {
      const url = manager.buildClearFilterUrl('type', currentFilters);

      expect(url).toContain('page=1');
      expect(url).not.toContain('type');
      expect(url).toContain('search=meditation');
      expect(url).toContain('minPrice=10');
      expect(url).toContain('maxPrice=50');
      expect(url).toContain('sort=price-asc');
    });

    test('should clear minPrice filter', () => {
      const url = manager.buildClearFilterUrl('minPrice', currentFilters);

      expect(url).not.toContain('minPrice');
      expect(url).toContain('type=pdf');
      expect(url).toContain('maxPrice=50');
    });

    test('should preserve page when resetPage is false', () => {
      const url = manager.buildClearFilterUrl('type', currentFilters, {
        resetPage: false,
      });

      expect(url).toContain('page=3');
      expect(url).not.toContain('type');
    });

    test('should handle clearing non-existent filter gracefully', () => {
      const url = manager.buildClearFilterUrl('nonexistent', currentFilters);

      expect(url).toContain('type=pdf');
      expect(url).toContain('search=meditation');
      expect(url).toContain('minPrice=10');
    });
  });

  describe('buildClearAllFiltersUrl', () => {
    let manager: FilterStateManager;

    beforeEach(() => {
      const url = createTestUrl('/products', {
        page: '3',
        type: 'pdf',
        search: 'meditation',
        minPrice: '10',
        sort: 'price-asc',
      });
      manager = new FilterStateManager(url, '/products');
    });

    test('should clear all filters and reset to page 1', () => {
      const url = manager.buildClearAllFiltersUrl();

      expect(url).toBe('/products?page=1');
    });

    test('should preserve specified parameters', () => {
      const url = manager.buildClearAllFiltersUrl(['sort']);

      expect(url).toContain('page=1');
      expect(url).toContain('sort=price-asc');
      expect(url).not.toContain('type');
      expect(url).not.toContain('search');
      expect(url).not.toContain('minPrice');
    });

    test('should preserve multiple specified parameters', () => {
      const url = manager.buildClearAllFiltersUrl(['sort', 'search']);

      expect(url).toContain('sort=price-asc');
      expect(url).toContain('search=meditation');
      expect(url).not.toContain('type');
      expect(url).not.toContain('minPrice');
    });
  });

  describe('countActiveFilters', () => {
    test('should count filters with values', () => {
      const url = createTestUrl('/products', {
        type: 'pdf',
        search: 'meditation',
        minPrice: '10',
      });
      const manager = new FilterStateManager(url, '/products');

      const count = manager.countActiveFilters(['type', 'search', 'minPrice', 'maxPrice']);

      expect(count).toBe(3);
    });

    test('should exclude filters with default values', () => {
      const url = createTestUrl('/products', {
        type: 'all',
        search: 'meditation',
        sort: 'newest',
      });
      const manager = new FilterStateManager(url, '/products');

      const count = manager.countActiveFilters(
        ['type', 'search', 'sort'],
        { type: 'all', sort: 'newest' }
      );

      expect(count).toBe(1); // Only search is active
    });

    test('should return 0 when no filters are active', () => {
      const url = createTestUrl('/products');
      const manager = new FilterStateManager(url, '/products');

      const count = manager.countActiveFilters(['type', 'search', 'minPrice']);

      expect(count).toBe(0);
    });

    test('should handle empty string values as inactive', () => {
      const url = createTestUrl('/products', {
        type: '',
        search: 'meditation',
      });
      const manager = new FilterStateManager(url, '/products');

      const count = manager.countActiveFilters(['type', 'search']);

      expect(count).toBe(1);
    });
  });

  describe('isFilterActive', () => {
    let manager: FilterStateManager;

    beforeEach(() => {
      const url = createTestUrl('/products', {
        type: 'pdf',
        search: '',
        sort: 'newest',
      });
      manager = new FilterStateManager(url, '/products');
    });

    test('should return true for filter with value', () => {
      expect(manager.isFilterActive('type')).toBe(true);
    });

    test('should return false for filter with empty value', () => {
      expect(manager.isFilterActive('search')).toBe(false);
    });

    test('should return false for non-existent filter', () => {
      expect(manager.isFilterActive('nonexistent')).toBe(false);
    });

    test('should return false when value equals default', () => {
      expect(manager.isFilterActive('sort', 'newest')).toBe(false);
    });

    test('should return true when value differs from default', () => {
      expect(manager.isFilterActive('type', 'all')).toBe(true);
    });
  });

  describe('getActiveFilters', () => {
    test('should return array of active filters', () => {
      const url = createTestUrl('/products', {
        type: 'pdf',
        search: 'meditation',
        minPrice: '10',
        sort: 'newest',
      });
      const manager = new FilterStateManager(url, '/products');

      const activeFilters = manager.getActiveFilters(
        ['type', 'search', 'minPrice', 'sort', 'maxPrice'],
        { sort: 'newest' }
      );

      expect(activeFilters).toHaveLength(3);
      expect(activeFilters).toEqual(
        expect.arrayContaining([
          { name: 'type', value: 'pdf' },
          { name: 'search', value: 'meditation' },
          { name: 'minPrice', value: '10' },
        ])
      );
    });

    test('should return empty array when no filters are active', () => {
      const url = createTestUrl('/products');
      const manager = new FilterStateManager(url, '/products');

      const activeFilters = manager.getActiveFilters(['type', 'search']);

      expect(activeFilters).toHaveLength(0);
    });
  });

  describe('buildServiceFilters', () => {
    test('should convert string parameters correctly', () => {
      const url = createTestUrl('/products', {
        type: 'pdf',
        search: 'meditation',
      });
      const manager = new FilterStateManager(url, '/products');

      const configs: FilterConfig[] = [
        { name: 'type', type: 'string' },
        { name: 'search', type: 'string' },
      ];

      const filters = manager.buildServiceFilters(configs);

      expect(filters.type).toBe('pdf');
      expect(filters.search).toBe('meditation');
    });

    test('should convert numeric parameters correctly', () => {
      const url = createTestUrl('/products', {
        minPrice: '10.5',
        maxPrice: '50',
      });
      const manager = new FilterStateManager(url, '/products');

      const configs: FilterConfig[] = [
        { name: 'minPrice', type: 'number' },
        { name: 'maxPrice', type: 'number' },
      ];

      const filters = manager.buildServiceFilters(configs);

      expect(filters.minPrice).toBe(10.5);
      expect(filters.maxPrice).toBe(50);
    });

    test('should convert boolean parameters correctly', () => {
      const url = createTestUrl('/products', {
        featured: 'true',
        archived: 'false',
      });
      const manager = new FilterStateManager(url, '/products');

      const configs: FilterConfig[] = [
        { name: 'featured', type: 'boolean' },
        { name: 'archived', type: 'boolean' },
      ];

      const filters = manager.buildServiceFilters(configs);

      expect(filters.featured).toBe(true);
      expect(filters.archived).toBe(false);
    });

    test('should skip parameters with default values', () => {
      const url = createTestUrl('/products', {
        type: 'all',
        sort: 'newest',
        search: 'meditation',
      });
      const manager = new FilterStateManager(url, '/products');

      const configs: FilterConfig[] = [
        { name: 'type', type: 'string', defaultValue: 'all' },
        { name: 'sort', type: 'string', defaultValue: 'newest' },
        { name: 'search', type: 'string' },
      ];

      const filters = manager.buildServiceFilters(configs);

      expect(filters.type).toBeUndefined();
      expect(filters.sort).toBeUndefined();
      expect(filters.search).toBe('meditation');
    });

    test('should validate and skip invalid parameters', () => {
      const url = createTestUrl('/products', {
        minPrice: '-10',
        maxPrice: '50',
      });
      const manager = new FilterStateManager(url, '/products');

      const configs: FilterConfig[] = [
        {
          name: 'minPrice',
          type: 'number',
          validate: (v) => parseFloat(v) >= 0,
        },
        {
          name: 'maxPrice',
          type: 'number',
          validate: (v) => parseFloat(v) >= 0,
        },
      ];

      const filters = manager.buildServiceFilters(configs);

      expect(filters.minPrice).toBeUndefined(); // Invalid, skipped
      expect(filters.maxPrice).toBe(50); // Valid
    });

    test('should handle missing parameters', () => {
      const url = createTestUrl('/products', { type: 'pdf' });
      const manager = new FilterStateManager(url, '/products');

      const configs: FilterConfig[] = [
        { name: 'type', type: 'string' },
        { name: 'search', type: 'string' },
        { name: 'minPrice', type: 'number' },
      ];

      const filters = manager.buildServiceFilters(configs);

      expect(filters.type).toBe('pdf');
      expect(filters.search).toBeUndefined();
      expect(filters.minPrice).toBeUndefined();
    });
  });

  describe('getHiddenInputs', () => {
    let manager: FilterStateManager;

    beforeEach(() => {
      const url = createTestUrl('/products', {
        type: 'pdf',
        search: 'meditation',
        minPrice: '10',
        sort: 'price-asc',
      });
      manager = new FilterStateManager(url, '/products');
    });

    test('should generate hidden inputs for all specified filters', () => {
      const inputs = manager.getHiddenInputs(['type', 'minPrice', 'sort']);

      expect(inputs).toHaveLength(3);
      expect(inputs).toEqual(
        expect.arrayContaining([
          { name: 'type', value: 'pdf' },
          { name: 'minPrice', value: '10' },
          { name: 'sort', value: 'price-asc' },
        ])
      );
    });

    test('should exclude specified filters', () => {
      const inputs = manager.getHiddenInputs(
        ['type', 'search', 'minPrice', 'sort'],
        ['search']
      );

      expect(inputs).toHaveLength(3);
      expect(inputs).not.toEqual(
        expect.arrayContaining([{ name: 'search', value: 'meditation' }])
      );
    });

    test('should skip filters with empty values', () => {
      const urlWithEmpty = createTestUrl('/products', {
        type: 'pdf',
        search: '',
        minPrice: '10',
      });
      const mgr = new FilterStateManager(urlWithEmpty, '/products');

      const inputs = mgr.getHiddenInputs(['type', 'search', 'minPrice']);

      expect(inputs).toHaveLength(2);
      expect(inputs).not.toEqual(
        expect.arrayContaining([{ name: 'search', value: '' }])
      );
    });

    test('should return empty array when no filters have values', () => {
      const emptyUrl = createTestUrl('/products');
      const mgr = new FilterStateManager(emptyUrl, '/products');

      const inputs = mgr.getHiddenInputs(['type', 'search']);

      expect(inputs).toHaveLength(0);
    });
  });

  describe('mergeFilters', () => {
    let manager: FilterStateManager;

    beforeEach(() => {
      const url = createTestUrl('/products');
      manager = new FilterStateManager(url, '/products');
    });

    test('should merge new filters with existing filters', () => {
      const currentFilters = {
        type: 'pdf',
        search: 'meditation',
      };

      const newFilters = {
        minPrice: '10',
        maxPrice: '50',
      };

      const merged = manager.mergeFilters(newFilters, currentFilters);

      expect(merged).toEqual({
        type: 'pdf',
        search: 'meditation',
        minPrice: '10',
        maxPrice: '50',
      });
    });

    test('should override existing values with new values', () => {
      const currentFilters = {
        type: 'pdf',
        minPrice: '10',
      };

      const newFilters = {
        type: 'audio',
        maxPrice: '50',
      };

      const merged = manager.mergeFilters(newFilters, currentFilters);

      expect(merged.type).toBe('audio');
      expect(merged.minPrice).toBe('10');
      expect(merged.maxPrice).toBe('50');
    });

    test('should handle empty new filters', () => {
      const currentFilters = {
        type: 'pdf',
        search: 'meditation',
      };

      const merged = manager.mergeFilters({}, currentFilters);

      expect(merged).toEqual(currentFilters);
    });

    test('should handle empty current filters', () => {
      const newFilters = {
        type: 'pdf',
        search: 'meditation',
      };

      const merged = manager.mergeFilters(newFilters, {});

      expect(merged).toEqual(newFilters);
    });
  });

  describe('buildUrlWithUpdates', () => {
    let manager: FilterStateManager;

    beforeEach(() => {
      const url = createTestUrl('/products', {
        page: '3',
        type: 'pdf',
        search: 'meditation',
      });
      manager = new FilterStateManager(url, '/products');
    });

    test('should build URL with updated filters and reset page', () => {
      const currentFilters = {
        type: 'pdf',
        search: 'meditation',
      };

      const updates = {
        minPrice: '10',
        maxPrice: '50',
      };

      const url = manager.buildUrlWithUpdates(updates, currentFilters);

      expect(url).toContain('page=1');
      expect(url).toContain('type=pdf');
      expect(url).toContain('search=meditation');
      expect(url).toContain('minPrice=10');
      expect(url).toContain('maxPrice=50');
    });

    test('should override existing filter values', () => {
      const currentFilters = {
        type: 'pdf',
        minPrice: '10',
      };

      const updates = {
        type: 'audio',
      };

      const url = manager.buildUrlWithUpdates(updates, currentFilters);

      expect(url).toContain('type=audio');
      expect(url).not.toContain('type=pdf');
    });

    test('should preserve page when resetPage is false', () => {
      const currentFilters = { type: 'pdf' };
      const updates = { minPrice: '10' };

      const url = manager.buildUrlWithUpdates(updates, currentFilters, {
        resetPage: false,
      });

      expect(url).toContain('page=3');
    });
  });
});

describe('Helper Function: createFilterManager', () => {
  test('should create FilterStateManager instance', () => {
    const url = createTestUrl('/products');
    const manager = createFilterManager(url, '/products');

    expect(manager).toBeInstanceOf(FilterStateManager);
  });

  test('should work with different base paths', () => {
    const paths = ['/products', '/courses', '/events'];

    paths.forEach(path => {
      const url = createTestUrl(path);
      const manager = createFilterManager(url, path);
      expect(manager).toBeInstanceOf(FilterStateManager);
    });
  });
});

describe('Predefined Filter Configurations', () => {
  describe('COMMON_FILTERS', () => {
    test('should include page filter with number type', () => {
      expect(COMMON_FILTERS.page).toBeDefined();
      expect(COMMON_FILTERS.page.type).toBe('number');
      expect(COMMON_FILTERS.page.defaultValue).toBe('1');
    });

    test('should include search filter', () => {
      expect(COMMON_FILTERS.search).toBeDefined();
      expect(COMMON_FILTERS.search.type).toBe('string');
    });

    test('should include price range filters', () => {
      expect(COMMON_FILTERS.minPrice).toBeDefined();
      expect(COMMON_FILTERS.maxPrice).toBeDefined();
      expect(COMMON_FILTERS.minPrice.type).toBe('number');
      expect(COMMON_FILTERS.maxPrice.type).toBe('number');
    });

    test('should include sort filter', () => {
      expect(COMMON_FILTERS.sort).toBeDefined();
      expect(COMMON_FILTERS.sort.defaultValue).toBe('newest');
    });

    test('page validator should reject invalid values', () => {
      const validator = COMMON_FILTERS.page.validate;
      if (validator) {
        expect(validator('0')).toBe(false);
        expect(validator('-1')).toBe(false);
        expect(validator('abc')).toBe(false);
      }
    });

    test('page validator should accept valid values', () => {
      const validator = COMMON_FILTERS.page.validate;
      if (validator) {
        expect(validator('1')).toBe(true);
        expect(validator('10')).toBe(true);
        expect(validator('999')).toBe(true);
      }
    });

    test('price validators should reject negative values', () => {
      const minValidator = COMMON_FILTERS.minPrice.validate;
      const maxValidator = COMMON_FILTERS.maxPrice.validate;

      if (minValidator) expect(minValidator('-10')).toBe(false);
      if (maxValidator) expect(maxValidator('-5')).toBe(false);
    });

    test('price validators should accept valid values', () => {
      const minValidator = COMMON_FILTERS.minPrice.validate;
      const maxValidator = COMMON_FILTERS.maxPrice.validate;

      if (minValidator) {
        expect(minValidator('0')).toBe(true);
        expect(minValidator('10.5')).toBe(true);
      }
      if (maxValidator) {
        expect(maxValidator('0')).toBe(true);
        expect(maxValidator('100')).toBe(true);
      }
    });
  });

  describe('COURSE_FILTERS', () => {
    test('should include all common filters', () => {
      expect(COURSE_FILTERS.page).toBeDefined();
      expect(COURSE_FILTERS.search).toBeDefined();
      expect(COURSE_FILTERS.minPrice).toBeDefined();
      expect(COURSE_FILTERS.maxPrice).toBeDefined();
      expect(COURSE_FILTERS.sort).toBeDefined();
    });

    test('should include course-specific filters', () => {
      expect(COURSE_FILTERS.category).toBeDefined();
      expect(COURSE_FILTERS.level).toBeDefined();
      expect(COURSE_FILTERS.minRating).toBeDefined();
    });

    test('minRating validator should enforce 0-5 range', () => {
      const validator = COURSE_FILTERS.minRating.validate;

      if (validator) {
        expect(validator('-1')).toBe(false);
        expect(validator('6')).toBe(false);
        expect(validator('0')).toBe(true);
        expect(validator('3.5')).toBe(true);
        expect(validator('5')).toBe(true);
      }
    });
  });

  describe('EVENT_FILTERS', () => {
    test('should include all common filters', () => {
      expect(EVENT_FILTERS.page).toBeDefined();
      expect(EVENT_FILTERS.search).toBeDefined();
      expect(EVENT_FILTERS.minPrice).toBeDefined();
      expect(EVENT_FILTERS.maxPrice).toBeDefined();
      expect(EVENT_FILTERS.sort).toBeDefined();
    });

    test('should include event-specific filters', () => {
      expect(EVENT_FILTERS.country).toBeDefined();
      expect(EVENT_FILTERS.city).toBeDefined();
      expect(EVENT_FILTERS.timeFrame).toBeDefined();
      expect(EVENT_FILTERS.fromDate).toBeDefined();
      expect(EVENT_FILTERS.toDate).toBeDefined();
      expect(EVENT_FILTERS.availability).toBeDefined();
    });

    test('date validators should validate date strings', () => {
      const fromDateValidator = EVENT_FILTERS.fromDate.validate;
      const toDateValidator = EVENT_FILTERS.toDate.validate;

      if (fromDateValidator) {
        expect(fromDateValidator('2025-11-02')).toBe(true);
        expect(fromDateValidator('invalid-date')).toBe(false);
      }

      if (toDateValidator) {
        expect(toDateValidator('2025-12-31')).toBe(true);
        expect(toDateValidator('not-a-date')).toBe(false);
      }
    });
  });

  describe('PRODUCT_FILTERS', () => {
    test('should include all common filters', () => {
      expect(PRODUCT_FILTERS.page).toBeDefined();
      expect(PRODUCT_FILTERS.search).toBeDefined();
      expect(PRODUCT_FILTERS.minPrice).toBeDefined();
      expect(PRODUCT_FILTERS.maxPrice).toBeDefined();
      expect(PRODUCT_FILTERS.sort).toBeDefined();
    });

    test('should include product-specific filters', () => {
      expect(PRODUCT_FILTERS.type).toBeDefined();
      expect(PRODUCT_FILTERS.minSize).toBeDefined();
      expect(PRODUCT_FILTERS.maxSize).toBeDefined();
    });

    test('size validators should reject negative values', () => {
      const minSizeValidator = PRODUCT_FILTERS.minSize.validate;
      const maxSizeValidator = PRODUCT_FILTERS.maxSize.validate;

      if (minSizeValidator) expect(minSizeValidator('-10')).toBe(false);
      if (maxSizeValidator) expect(maxSizeValidator('-5')).toBe(false);
    });

    test('size validators should accept valid values', () => {
      const minSizeValidator = PRODUCT_FILTERS.minSize.validate;
      const maxSizeValidator = PRODUCT_FILTERS.maxSize.validate;

      if (minSizeValidator) {
        expect(minSizeValidator('0')).toBe(true);
        expect(minSizeValidator('100.5')).toBe(true);
      }
      if (maxSizeValidator) {
        expect(maxSizeValidator('0')).toBe(true);
        expect(maxSizeValidator('500')).toBe(true);
      }
    });
  });
});

describe('Integration Tests', () => {
  describe('Products Page Scenario', () => {
    test('should handle complete product filtering workflow', () => {
      // Initial page load with filters
      const url = createTestUrl('/products', {
        type: 'pdf',
        minPrice: '10',
        maxPrice: '50',
        minSize: '1',
        maxSize: '10',
        sort: 'price-asc',
        page: '1',
      });

      const manager = new FilterStateManager(url, '/products');

      // Extract filters for service layer
      const serviceFilters = manager.buildServiceFilters([
        { name: 'type', type: 'string', defaultValue: 'all' },
        { name: 'minPrice', type: 'number' },
        { name: 'maxPrice', type: 'number' },
        { name: 'minSize', type: 'number' },
        { name: 'maxSize', type: 'number' },
        { name: 'sort', type: 'string', defaultValue: 'newest' },
      ]);

      expect(serviceFilters).toEqual({
        type: 'pdf',
        minPrice: 10,
        maxPrice: 50,
        minSize: 1,
        maxSize: 10,
        sort: 'price-asc',
      });

      // Count active filters (excluding sort with default)
      const activeCount = manager.countActiveFilters(
        ['type', 'minPrice', 'maxPrice', 'minSize', 'maxSize'],
        { type: 'all' }
      );
      expect(activeCount).toBe(5);

      // Build pagination URL
      const page2Url = manager.buildPageUrl(2, {
        type: 'pdf',
        minPrice: '10',
        maxPrice: '50',
        minSize: '1',
        maxSize: '10',
        sort: 'price-asc',
      });
      expect(page2Url).toContain('page=2');
      expect(page2Url).toContain('type=pdf');

      // Clear type filter
      const clearTypeUrl = manager.buildClearFilterUrl('type', {
        type: 'pdf',
        minPrice: '10',
        maxPrice: '50',
        minSize: '1',
        maxSize: '10',
        sort: 'price-asc',
      });
      expect(clearTypeUrl).not.toContain('type');
      expect(clearTypeUrl).toContain('minPrice=10');
    });
  });

  describe('Courses Page Scenario', () => {
    test('should handle complete course filtering workflow', () => {
      const url = createTestUrl('/courses', {
        category: 'meditation',
        level: 'beginner',
        minPrice: '0',
        maxPrice: '100',
        minRating: '4',
        search: 'mindfulness',
        page: '1',
      });

      const manager = new FilterStateManager(url, '/courses');

      // Build service filters
      const serviceFilters = manager.buildServiceFilters([
        { name: 'category', type: 'string', defaultValue: 'all' },
        { name: 'level', type: 'string', defaultValue: 'all' },
        { name: 'minPrice', type: 'number' },
        { name: 'maxPrice', type: 'number' },
        { name: 'minRating', type: 'number' },
        { name: 'search', type: 'string' },
      ]);

      expect(serviceFilters).toEqual({
        category: 'meditation',
        level: 'beginner',
        minPrice: 0,
        maxPrice: 100,
        minRating: 4,
        search: 'mindfulness',
      });

      // Get hidden inputs for search form
      const hiddenInputs = manager.getHiddenInputs(
        ['category', 'level', 'minPrice', 'maxPrice', 'minRating'],
        ['search'] // Exclude search since it's in visible input
      );

      expect(hiddenInputs).toHaveLength(5);
      expect(hiddenInputs).toEqual(
        expect.arrayContaining([
          { name: 'category', value: 'meditation' },
          { name: 'level', value: 'beginner' },
        ])
      );
    });
  });

  describe('Events Page Scenario', () => {
    test('should handle complete event filtering workflow', () => {
      const url = createTestUrl('/events', {
        country: 'USA',
        city: 'New York',
        timeFrame: 'upcoming',
        fromDate: '2025-11-01',
        toDate: '2025-12-31',
        availability: 'available',
        minPrice: '20',
        page: '1',
      });

      const manager = new FilterStateManager(url, '/events');

      // Build service filters
      const serviceFilters = manager.buildServiceFilters([
        { name: 'country', type: 'string', defaultValue: 'all' },
        { name: 'city', type: 'string', defaultValue: 'all' },
        { name: 'timeFrame', type: 'string', defaultValue: 'all' },
        { name: 'fromDate', type: 'string' },
        { name: 'toDate', type: 'string' },
        { name: 'availability', type: 'string', defaultValue: 'all' },
        { name: 'minPrice', type: 'number' },
      ]);

      expect(serviceFilters).toEqual({
        country: 'USA',
        city: 'New York',
        timeFrame: 'upcoming',
        fromDate: '2025-11-01',
        toDate: '2025-12-31',
        availability: 'available',
        minPrice: 20,
      });

      // Get active filters for pills
      const activeFilters = manager.getActiveFilters(
        ['country', 'city', 'timeFrame', 'availability', 'minPrice'],
        { country: 'all', city: 'all', timeFrame: 'all', availability: 'all' }
      );

      expect(activeFilters.length).toBeGreaterThan(0);
      expect(activeFilters).toEqual(
        expect.arrayContaining([
          { name: 'country', value: 'USA' },
          { name: 'city', value: 'New York' },
        ])
      );
    });
  });
});
