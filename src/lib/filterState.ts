/**
 * Filter State Management Library
 * 
 * Provides a reusable, type-safe system for managing URL-based filter state
 * across catalog pages (courses, events, products).
 * 
 * Key Features:
 * - Extract filter parameters from URL
 * - Build URLs with preserved filters
 * - Clear individual or all filters
 * - Count active filters
 * - Type-safe parameter handling
 * 
 * Usage:
 * ```typescript
 * const manager = new FilterStateManager(Astro.url, '/products');
 * const filters = manager.getFilters(['type', 'minPrice', 'maxPrice']);
 * const pageUrl = manager.buildPageUrl(2, filters);
 * const clearUrl = manager.buildClearFilterUrl('type', filters);
 * ```
 */

/**
 * Represents a single filter parameter with its value
 */
export interface FilterParam {
  name: string;
  value: string;
}

/**
 * Configuration for a filter parameter
 */
export interface FilterConfig {
  name: string;
  defaultValue?: string; // Value that represents "no filter"
  type?: 'string' | 'number' | 'boolean';
  validate?: (value: string) => boolean;
}

/**
 * Options for building URLs
 */
export interface BuildUrlOptions {
  resetPage?: boolean; // Reset to page 1 (default: false)
  preserveFilters?: string[]; // Only preserve specific filters
  excludeFilters?: string[]; // Exclude specific filters
}

/**
 * Filter State Manager
 * 
 * Manages URL query parameter state for filtering, pagination, and sorting
 * in catalog pages. Provides methods for extracting, building, and clearing
 * filter parameters while maintaining proper URL state.
 */
export class FilterStateManager {
  private url: URL;
  private basePath: string;
  private searchParams: URLSearchParams;

  /**
   * Create a new FilterStateManager
   * 
   * @param url - The current URL object (e.g., Astro.url)
   * @param basePath - The base path for URLs (e.g., '/products', '/courses')
   */
  constructor(url: URL, basePath: string) {
    this.url = url;
    this.basePath = basePath;
    this.searchParams = new URLSearchParams(url.searchParams);
  }

  /**
   * Get a single filter parameter value
   * 
   * @param name - Parameter name
   * @param defaultValue - Default value if parameter doesn't exist
   * @returns The parameter value or default
   */
  getParam(name: string, defaultValue: string = ''): string {
    return this.searchParams.get(name) || defaultValue;
  }

  /**
   * Get a numeric filter parameter
   * 
   * @param name - Parameter name
   * @param defaultValue - Default value if parameter doesn't exist or is invalid
   * @returns The numeric value or default
   */
  getNumericParam(name: string, defaultValue?: number): number | undefined {
    const value = this.searchParams.get(name);
    if (!value) return defaultValue;
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get an integer filter parameter
   * 
   * @param name - Parameter name
   * @param defaultValue - Default value if parameter doesn't exist or is invalid
   * @returns The integer value or default
   */
  getIntParam(name: string, defaultValue: number = 1): number {
    const value = this.searchParams.get(name);
    if (!value) return defaultValue;
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get multiple filter parameters as an object
   * 
   * @param configs - Array of filter configurations
   * @returns Object with parameter names as keys and values as strings
   */
  getFilters(configs: FilterConfig[]): Record<string, string> {
    const filters: Record<string, string> = {};
    
    configs.forEach(config => {
      const value = this.searchParams.get(config.name);
      
      if (value) {
        // Validate if validator provided
        if (config.validate && !config.validate(value)) {
          if (config.defaultValue !== undefined) {
            filters[config.name] = config.defaultValue;
          }
          return;
        }
        
        filters[config.name] = value;
      } else if (config.defaultValue !== undefined) {
        filters[config.name] = config.defaultValue;
      }
    });
    
    return filters;
  }

  /**
   * Build a URL for a specific page with all current filters preserved
   * 
   * @param page - Page number
   * @param currentFilters - Current filter values to preserve
   * @param options - Additional options for URL building
   * @returns Full URL string with query parameters
   */
  buildPageUrl(
    page: number,
    currentFilters: Record<string, string> = {},
    options: BuildUrlOptions = {}
  ): string {
    const params = new URLSearchParams();
    
    // Add page parameter
    params.set('page', page.toString());
    
    // Add all current filters
    Object.entries(currentFilters).forEach(([name, value]) => {
      // Skip if in excludeFilters
      if (options.excludeFilters?.includes(name)) return;
      
      // Skip if preserveFilters specified and name not in it
      if (options.preserveFilters && !options.preserveFilters.includes(name)) return;
      
      // Add non-empty values
      if (value && value !== '') {
        params.set(name, value);
      }
    });
    
    return `${this.basePath}?${params.toString()}`;
  }

  /**
   * Build a URL with a specific filter removed (cleared)
   * 
   * @param filterName - Name of filter to clear
   * @param currentFilters - Current filter values
   * @param options - Additional options for URL building
   * @returns Full URL string with the specified filter removed
   */
  buildClearFilterUrl(
    filterName: string,
    currentFilters: Record<string, string>,
    options: BuildUrlOptions = { resetPage: true }
  ): string {
    const params = new URLSearchParams();
    
    // Add page parameter (reset to 1 by default when clearing filter)
    if (options.resetPage !== false) {
      params.set('page', '1');
    } else {
      const currentPage = this.getIntParam('page', 1);
      params.set('page', currentPage.toString());
    }
    
    // Add all filters except the cleared one
    Object.entries(currentFilters).forEach(([name, value]) => {
      if (name !== filterName && value && value !== '') {
        params.set(name, value);
      }
    });
    
    return `${this.basePath}?${params.toString()}`;
  }

  /**
   * Build a URL with all filters cleared
   * 
   * @param preserveParams - Parameters to preserve (e.g., 'sort')
   * @returns URL string with all filters removed except preserved ones
   */
  buildClearAllFiltersUrl(preserveParams: string[] = []): string {
    const params = new URLSearchParams();
    params.set('page', '1');
    
    // Preserve specified parameters
    preserveParams.forEach(param => {
      const value = this.searchParams.get(param);
      if (value) {
        params.set(param, value);
      }
    });
    
    return `${this.basePath}?${params.toString()}`;
  }

  /**
   * Count the number of active filters
   * 
   * @param filterNames - Names of filters to check
   * @param defaultValues - Map of filter names to their default values (considered inactive)
   * @returns Number of active filters
   */
  countActiveFilters(
    filterNames: string[],
    defaultValues: Record<string, string> = {}
  ): number {
    return filterNames.filter(name => {
      const value = this.searchParams.get(name);
      if (!value || value === '') return false;
      
      const defaultValue = defaultValues[name];
      if (defaultValue !== undefined && value === defaultValue) return false;
      
      return true;
    }).length;
  }

  /**
   * Check if a specific filter is active
   * 
   * @param filterName - Name of the filter
   * @param defaultValue - Default value (considered inactive)
   * @returns True if filter is active (has non-default value)
   */
  isFilterActive(filterName: string, defaultValue?: string): boolean {
    const value = this.searchParams.get(filterName);
    if (!value || value === '') return false;
    if (defaultValue !== undefined && value === defaultValue) return false;
    return true;
  }

  /**
   * Get all active filters as FilterParam array
   * 
   * @param filterNames - Names of filters to check
   * @param defaultValues - Map of default values
   * @returns Array of active filter parameters
   */
  getActiveFilters(
    filterNames: string[],
    defaultValues: Record<string, string> = {}
  ): FilterParam[] {
    return filterNames
      .filter(name => this.isFilterActive(name, defaultValues[name]))
      .map(name => ({
        name,
        value: this.searchParams.get(name) || '',
      }));
  }

  /**
   * Build filter object for service layer
   * 
   * Converts URL parameters to a typed object suitable for passing
   * to service layer functions (getCourses, getProducts, getEvents).
   * 
   * @param configs - Filter configurations with types
   * @returns Object with converted values
   */
  buildServiceFilters(configs: FilterConfig[]): Record<string, any> {
    const filters: Record<string, any> = {};
    
    configs.forEach(config => {
      const value = this.searchParams.get(config.name);
      if (!value || value === '') return;
      
      // Skip if value equals default (represents "no filter")
      if (config.defaultValue !== undefined && value === config.defaultValue) {
        return;
      }
      
      // Validate if validator provided
      if (config.validate && !config.validate(value)) return;
      
      // Convert based on type
      switch (config.type) {
        case 'number':
          const num = parseFloat(value);
          if (!isNaN(num)) {
            filters[config.name] = num;
          }
          break;
        case 'boolean':
          filters[config.name] = value === 'true';
          break;
        case 'string':
        default:
          filters[config.name] = value;
          break;
      }
    });
    
    return filters;
  }

  /**
   * Generate hidden form inputs for preserving filters
   * 
   * Useful for search forms or other forms that need to preserve
   * current filter state when submitting.
   * 
   * @param filterNames - Names of filters to preserve
   * @param excludeFilters - Filters to exclude
   * @returns Array of objects with name/value for hidden inputs
   */
  getHiddenInputs(
    filterNames: string[],
    excludeFilters: string[] = []
  ): Array<{ name: string; value: string }> {
    return filterNames
      .filter(name => !excludeFilters.includes(name))
      .map(name => ({
        name,
        value: this.searchParams.get(name) || '',
      }))
      .filter(input => input.value !== '');
  }

  /**
   * Merge new filter values with existing ones
   * 
   * @param newFilters - New filter values to apply
   * @param currentFilters - Current filter values
   * @returns Merged filter object
   */
  mergeFilters(
    newFilters: Record<string, string>,
    currentFilters: Record<string, string>
  ): Record<string, string> {
    return {
      ...currentFilters,
      ...newFilters,
    };
  }

  /**
   * Build URL with specific filter updates
   * 
   * @param updates - Filters to update
   * @param currentFilters - Current filter values
   * @param options - Build options
   * @returns URL with updated filters
   */
  buildUrlWithUpdates(
    updates: Record<string, string>,
    currentFilters: Record<string, string>,
    options: BuildUrlOptions = { resetPage: true }
  ): string {
    const mergedFilters = this.mergeFilters(updates, currentFilters);
    const page = options.resetPage !== false ? 1 : this.getIntParam('page', 1);
    return this.buildPageUrl(page, mergedFilters, options);
  }
}

/**
 * Helper function to create a FilterStateManager instance
 * 
 * @param url - The current URL
 * @param basePath - Base path for URLs
 * @returns New FilterStateManager instance
 */
export function createFilterManager(url: URL, basePath: string): FilterStateManager {
  return new FilterStateManager(url, basePath);
}

/**
 * Common filter configurations for different catalog types
 */
export const COMMON_FILTERS = {
  // Pagination
  page: {
    name: 'page',
    type: 'number' as const,
    defaultValue: '1',
    validate: (v: string) => {
      const num = parseInt(v, 10);
      return !isNaN(num) && num > 0;
    },
  },
  
  // Search
  search: {
    name: 'search',
    type: 'string' as const,
    defaultValue: '',
  },
  
  // Price range
  minPrice: {
    name: 'minPrice',
    type: 'number' as const,
    validate: (v: string) => {
      const num = parseFloat(v);
      return !isNaN(num) && num >= 0;
    },
  },
  maxPrice: {
    name: 'maxPrice',
    type: 'number' as const,
    validate: (v: string) => {
      const num = parseFloat(v);
      return !isNaN(num) && num >= 0;
    },
  },
  
  // Sort
  sort: {
    name: 'sort',
    type: 'string' as const,
    defaultValue: 'newest',
  },
};

/**
 * Course-specific filter configurations
 */
export const COURSE_FILTERS = {
  ...COMMON_FILTERS,
  category: {
    name: 'category',
    type: 'string' as const,
    defaultValue: 'all',
  },
  level: {
    name: 'level',
    type: 'string' as const,
    defaultValue: 'all',
  },
  minRating: {
    name: 'minRating',
    type: 'number' as const,
    validate: (v: string) => {
      const num = parseFloat(v);
      return !isNaN(num) && num >= 0 && num <= 5;
    },
  },
};

/**
 * Event-specific filter configurations
 */
export const EVENT_FILTERS = {
  ...COMMON_FILTERS,
  country: {
    name: 'country',
    type: 'string' as const,
    defaultValue: 'all',
  },
  city: {
    name: 'city',
    type: 'string' as const,
    defaultValue: 'all',
  },
  timeFrame: {
    name: 'timeFrame',
    type: 'string' as const,
    defaultValue: 'all',
  },
  fromDate: {
    name: 'fromDate',
    type: 'string' as const,
    validate: (v: string) => !isNaN(Date.parse(v)),
  },
  toDate: {
    name: 'toDate',
    type: 'string' as const,
    validate: (v: string) => !isNaN(Date.parse(v)),
  },
  availability: {
    name: 'availability',
    type: 'string' as const,
    defaultValue: 'all',
  },
};

/**
 * Product-specific filter configurations
 */
export const PRODUCT_FILTERS = {
  ...COMMON_FILTERS,
  type: {
    name: 'type',
    type: 'string' as const,
    defaultValue: 'all',
  },
  minSize: {
    name: 'minSize',
    type: 'number' as const,
    validate: (v: string) => {
      const num = parseFloat(v);
      return !isNaN(num) && num >= 0;
    },
  },
  maxSize: {
    name: 'maxSize',
    type: 'number' as const,
    validate: (v: string) => {
      const num = parseFloat(v);
      return !isNaN(num) && num >= 0;
    },
  },
};
