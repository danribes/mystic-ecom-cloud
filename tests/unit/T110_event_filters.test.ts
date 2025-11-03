/**
 * T110 Event Filters Test Suite
 * 
 * Comprehensive tests for the advanced event filtering system including:
 * - Event service with new filters (timeFrame, price, availability)
 * - EventFilters component (5 filter types with instant filtering)
 * - Events catalog page integration
 * 
 * Testing Strategy: Source-based testing with static analysis
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Read source file content
 */
function readSource(relativePath: string): string {
  const fullPath = join(process.cwd(), relativePath);
  return readFileSync(fullPath, 'utf-8');
}

/**
 * Check if source contains pattern
 */
function containsPattern(source: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return source.includes(pattern);
  }
  return pattern.test(source);
}

/**
 * Count occurrences of pattern in source
 */
function countOccurrences(source: string, pattern: string | RegExp): number {
  if (typeof pattern === 'string') {
    return (source.match(new RegExp(pattern, 'g')) || []).length;
  }
  return (source.match(new RegExp(pattern, 'g')) || []).length;
}

/**
 * Extract interface/type definition
 */
function extractInterface(source: string, interfaceName: string): string {
  const pattern = new RegExp(`(?:export\\s+)?(?:interface|type)\\s+${interfaceName}[^{]*{[^}]*}`, 's');
  const match = source.match(pattern);
  return match ? match[0] : '';
}

/**
 * Extract function definition
 */
function extractFunction(source: string, functionName: string): string {
  const pattern = new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${functionName}[^{]*{`, 's');
  const startMatch = source.match(pattern);
  if (!startMatch) return '';
  
  const startIndex = source.indexOf(startMatch[0]);
  let braceCount = 1;
  let endIndex = startIndex + startMatch[0].length;
  
  while (braceCount > 0 && endIndex < source.length) {
    if (source[endIndex] === '{') braceCount++;
    if (source[endIndex] === '}') braceCount--;
    endIndex++;
  }
  
  return source.substring(startIndex, endIndex);
}

// ============================================================================
// TEST SUITE: EVENT SERVICE (src/lib/events.ts)
// ============================================================================

describe('Event Service - Enhanced Filters (T110)', () => {
  const eventsSource = readSource('src/lib/events.ts');

  describe('EventFilters Interface', () => {
    it('should define EventFilters interface', () => {
      expect(containsPattern(eventsSource, 'interface EventFilters')).toBe(true);
    });

    it('should include minPrice property', () => {
      const interfaceDef = extractInterface(eventsSource, 'EventFilters');
      expect(containsPattern(interfaceDef, 'minPrice')).toBe(true);
      expect(containsPattern(interfaceDef, 'number')).toBe(true);
    });

    it('should include maxPrice property', () => {
      const interfaceDef = extractInterface(eventsSource, 'EventFilters');
      expect(containsPattern(interfaceDef, 'maxPrice')).toBe(true);
    });

    it('should include timeFrame property with union type', () => {
      const interfaceDef = extractInterface(eventsSource, 'EventFilters');
      expect(containsPattern(interfaceDef, 'timeFrame')).toBe(true);
      expect(containsPattern(interfaceDef, /['"]all['"]/)).toBe(true);
      expect(containsPattern(interfaceDef, /['"]upcoming['"]/)).toBe(true);
      expect(containsPattern(interfaceDef, /['"]this-week['"]/)).toBe(true);
      expect(containsPattern(interfaceDef, /['"]this-month['"]/)).toBe(true);
      expect(containsPattern(interfaceDef, /['"]custom['"]/)).toBe(true);
    });

    it('should include availability property', () => {
      const interfaceDef = extractInterface(eventsSource, 'EventFilters');
      expect(containsPattern(interfaceDef, 'availability')).toBe(true);
      expect(containsPattern(interfaceDef, /['"]available['"]/)).toBe(true);
      expect(containsPattern(interfaceDef, /['"]limited['"]/)).toBe(true);
    });

    it('should include pagination properties', () => {
      const interfaceDef = extractInterface(eventsSource, 'EventFilters');
      expect(containsPattern(interfaceDef, 'limit')).toBe(true);
      expect(containsPattern(interfaceDef, 'offset')).toBe(true);
    });

    it('should make new properties optional', () => {
      const interfaceDef = extractInterface(eventsSource, 'EventFilters');
      expect(containsPattern(interfaceDef, 'minPrice?:')).toBe(true);
      expect(containsPattern(interfaceDef, 'maxPrice?:')).toBe(true);
      expect(containsPattern(interfaceDef, 'timeFrame?:')).toBe(true);
      expect(containsPattern(interfaceDef, 'availability?:')).toBe(true);
    });
  });

  describe('getEvents Function - Time Frame Filter', () => {
    it('should implement upcoming filter', () => {
      expect(containsPattern(eventsSource, /timeFrame\s*===\s*['"]upcoming['"]/)).toBe(true);
      expect(containsPattern(eventsSource, /event_date\s*>=\s*\$/)).toBe(true);
    });

    it('should implement this-week filter', () => {
      expect(containsPattern(eventsSource, /timeFrame\s*===\s*['"]this-week['"]/)).toBe(true);
      expect(containsPattern(eventsSource, /event_date\s*>=.*AND\s*event_date\s*<=/)).toBe(true);
    });

    it('should implement this-month filter', () => {
      expect(containsPattern(eventsSource, /timeFrame\s*===\s*['"]this-month['"]/)).toBe(true);
      expect(containsPattern(eventsSource, /event_date\s*>=.*AND\s*event_date\s*<=/)).toBe(true);
    });

    it('should calculate week end date correctly', () => {
      expect(containsPattern(eventsSource, /\.setDate\(/)).toBe(true);
      expect(containsPattern(eventsSource, /\+ 7/)).toBe(true);
    });

    it('should calculate month end date correctly', () => {
      expect(containsPattern(eventsSource, /new Date\(now\.getFullYear\(\), now\.getMonth\(\) \+ 1, 0\)/)).toBe(true);
    });

    it('should use custom date range when timeFrame is custom', () => {
      const getEventsFunc = extractFunction(eventsSource, 'getEvents');
      expect(containsPattern(getEventsFunc, /timeFrame\s*===\s*['"]custom['"]/)).toBe(true);
      expect(containsPattern(getEventsFunc, 'startDate')).toBe(true);
      expect(containsPattern(getEventsFunc, 'endDate')).toBe(true);
    });
  });

  describe('getEvents Function - Price Range Filter', () => {
    it('should implement minPrice filter', () => {
      expect(containsPattern(eventsSource, /minPrice\s*!==\s*undefined/)).toBe(true);
      expect(containsPattern(eventsSource, /price\s*>=\s*\$/)).toBe(true);
    });

    it('should implement maxPrice filter', () => {
      expect(containsPattern(eventsSource, /maxPrice\s*!==\s*undefined/)).toBe(true);
      expect(containsPattern(eventsSource, /price\s*<=\s*\$/)).toBe(true);
    });

    it('should use parameterized queries for price filters', () => {
      const getEventsFunc = extractFunction(eventsSource, 'getEvents');
      expect(containsPattern(getEventsFunc, /params\.push\(.*minPrice/)).toBe(true);
      expect(containsPattern(getEventsFunc, /params\.push\(.*maxPrice/)).toBe(true);
    });
  });

  describe('getEvents Function - Availability Filter', () => {
    it('should implement available filter', () => {
      expect(containsPattern(eventsSource, /availability\s*===\s*['"]available['"]/)).toBe(true);
      expect(containsPattern(eventsSource, /available_spots\s*>\s*0/)).toBe(true);
    });

    it('should implement limited spots filter', () => {
      expect(containsPattern(eventsSource, /availability\s*===\s*['"]limited['"]/)).toBe(true);
      expect(containsPattern(eventsSource, /\(CAST\(available_spots AS FLOAT\) \/ CAST\(capacity AS FLOAT\)\) < 0\.2/)).toBe(true);
    });

    it('should check for both spots and capacity in limited filter', () => {
      const getEventsFunc = extractFunction(eventsSource, 'getEvents');
      const limitedSection = getEventsFunc.match(/availability\s*===\s*['"]limited['"][^}]+/s);
      expect(limitedSection).toBeTruthy();
      if (limitedSection) {
        expect(containsPattern(limitedSection[0], /available_spots\s*>\s*0/)).toBe(true);
      }
    });
  });

  describe('getEvents Function - Pagination', () => {
    it('should implement LIMIT clause', () => {
      expect(containsPattern(eventsSource, /LIMIT\s+\$/)).toBe(true);
    });

    it('should implement OFFSET clause', () => {
      expect(containsPattern(eventsSource, /OFFSET\s+\$/)).toBe(true);
    });

    it('should add limit and offset to query params', () => {
      const getEventsFunc = extractFunction(eventsSource, 'getEvents');
      expect(containsPattern(getEventsFunc, /params\.push\(.*limit/)).toBe(true);
      expect(containsPattern(getEventsFunc, /params\.push\(.*offset/)).toBe(true);
    });
  });

  describe('getEvents Function - Query Construction', () => {
    it('should use dynamic query building', () => {
      const getEventsFunc = extractFunction(eventsSource, 'getEvents');
      expect(containsPattern(getEventsFunc, /queryText\s*\+=\s*`/)).toBe(true);
    });

    it('should maintain parameterized queries', () => {
      const getEventsFunc = extractFunction(eventsSource, 'getEvents');
      expect(containsPattern(getEventsFunc, /params\.push/)).toBe(true);
      expect(containsPattern(getEventsFunc, /paramIndex/)).toBe(true);
    });

    it('should preserve backward compatibility with minAvailableSpots', () => {
      expect(containsPattern(eventsSource, 'minAvailableSpots')).toBe(true);
      expect(containsPattern(eventsSource, /available_spots\s*>=\s*\$/)).toBe(true);
    });
  });
});

// ============================================================================
// TEST SUITE: EVENT FILTERS COMPONENT (src/components/EventFilters.astro)
// ============================================================================

describe('EventFilters Component (T110)', () => {
  const filtersSource = readSource('src/components/EventFilters.astro');

  describe('Component Structure', () => {
    it('should exist as an Astro component', () => {
      expect(filtersSource).toBeTruthy();
      expect(containsPattern(filtersSource, '---')).toBe(true);
    });

    it('should define props interface', () => {
      expect(containsPattern(filtersSource, 'interface Props')).toBe(true);
    });

    it('should be a sidebar component with form', () => {
      expect(containsPattern(filtersSource, /<form/)).toBe(true);
      expect(containsPattern(filtersSource, /method=["']GET["']/)).toBe(true);
      expect(containsPattern(filtersSource, /action=["']\/events["']/)).toBe(true);
    });
  });

  describe('Props Interface', () => {
    const propsInterface = extractInterface(filtersSource, 'Props');

    it('should include current filter value props', () => {
      expect(containsPattern(propsInterface, 'currentCity')).toBe(true);
      expect(containsPattern(propsInterface, 'currentCountry')).toBe(true);
      expect(containsPattern(propsInterface, 'currentTimeFrame')).toBe(true);
      expect(containsPattern(propsInterface, 'currentMinPrice')).toBe(true);
      expect(containsPattern(propsInterface, 'currentMaxPrice')).toBe(true);
      expect(containsPattern(propsInterface, 'currentAvailability')).toBe(true);
    });

    it('should include date range props', () => {
      expect(containsPattern(propsInterface, 'currentStartDate')).toBe(true);
      expect(containsPattern(propsInterface, 'currentEndDate')).toBe(true);
    });

    it('should include filter options arrays', () => {
      expect(containsPattern(propsInterface, 'cities')).toBe(true);
      expect(containsPattern(propsInterface, 'countries')).toBe(true);
    });
  });

  describe('Location Filters', () => {
    it('should render country dropdown', () => {
      expect(containsPattern(filtersSource, /<select[^>]*name=["']country["']/)).toBe(true);
      expect(containsPattern(filtersSource, /All Countries/)).toBe(true);
    });

    it('should render city dropdown', () => {
      expect(containsPattern(filtersSource, /<select[^>]*name=["']city["']/)).toBe(true);
      expect(containsPattern(filtersSource, /All Cities/)).toBe(true);
    });

    it('should populate country options from props', () => {
      expect(containsPattern(filtersSource, /countries\.map/)).toBe(true);
    });

    it('should populate city options from props', () => {
      expect(containsPattern(filtersSource, /cities\.map/)).toBe(true);
    });

    it('should preserve selected country', () => {
      expect(containsPattern(filtersSource, /selected=\{currentCountry === country\}/)).toBe(true);
    });

    it('should preserve selected city', () => {
      expect(containsPattern(filtersSource, /selected=\{currentCity === city\}/)).toBe(true);
    });
  });

  describe('Time Frame Filter', () => {
    it('should render time frame radio buttons', () => {
      expect(containsPattern(filtersSource, /type=["']radio["']/)).toBe(true);
      expect(containsPattern(filtersSource, /name=["']timeFrame["']/)).toBe(true);
    });

    it('should include all 5 time frame options', () => {
      expect(containsPattern(filtersSource, /value=["']all["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']upcoming["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']this-week["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']this-month["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']custom["']/)).toBe(true);
    });

    it('should have descriptive labels for each option', () => {
      expect(containsPattern(filtersSource, /All Events/)).toBe(true);
      expect(containsPattern(filtersSource, /Upcoming Only/)).toBe(true);
      expect(containsPattern(filtersSource, /This Week/)).toBe(true);
      expect(containsPattern(filtersSource, /This Month/)).toBe(true);
      expect(containsPattern(filtersSource, /Custom Range/)).toBe(true);
    });

    it('should preserve selected time frame', () => {
      expect(containsPattern(filtersSource, /checked=\{currentTimeFrame === ['"]all['"]\}/)).toBe(true);
      expect(containsPattern(filtersSource, /checked=\{currentTimeFrame === ['"]upcoming['"]\}/)).toBe(true);
    });
  });

  describe('Custom Date Range Filter', () => {
    it('should render custom date range container', () => {
      expect(containsPattern(filtersSource, /custom.*date.*range/i)).toBe(true);
    });

    it('should render start date input', () => {
      expect(containsPattern(filtersSource, /type=["']date["']/)).toBe(true);
      expect(containsPattern(filtersSource, /name=["']startDate["']/)).toBe(true);
    });

    it('should render end date input', () => {
      expect(containsPattern(filtersSource, /name=["']endDate["']/)).toBe(true);
    });

    it('should preserve date values', () => {
      expect(containsPattern(filtersSource, /value=\{currentStartDate\}/)).toBe(true);
      expect(containsPattern(filtersSource, /value=\{currentEndDate\}/)).toBe(true);
    });

    it('should have labels for date inputs', () => {
      expect(containsPattern(filtersSource, />\s*From\s*</)).toBe(true);
      expect(containsPattern(filtersSource, />\s*To\s*</)).toBe(true);
    });
  });

  describe('Price Range Filter', () => {
    it('should render min price input', () => {
      expect(containsPattern(filtersSource, /type=["']number["']/)).toBe(true);
      expect(containsPattern(filtersSource, /name=["']minPrice["']/)).toBe(true);
    });

    it('should render max price input', () => {
      expect(containsPattern(filtersSource, /name=["']maxPrice["']/)).toBe(true);
    });

    it('should have min="0" on price inputs', () => {
      const minPriceCount = countOccurrences(filtersSource, /min=["']0["']/);
      expect(minPriceCount).toBeGreaterThanOrEqual(2); // Both price inputs
    });

    it('should preserve price values', () => {
      expect(containsPattern(filtersSource, /value=\{currentMinPrice\}/)).toBe(true);
      expect(containsPattern(filtersSource, /value=\{currentMaxPrice\}/)).toBe(true);
    });

    it('should have price range labels', () => {
      expect(containsPattern(filtersSource, /Min.*Price/)).toBe(true);
      expect(containsPattern(filtersSource, /Max.*Price/)).toBe(true);
    });
  });

  describe('Availability Filter', () => {
    it('should render availability radio buttons', () => {
      const availabilityRadios = filtersSource.match(/name=["']availability["']/g);
      expect(availabilityRadios).toBeTruthy();
      expect(availabilityRadios!.length).toBeGreaterThanOrEqual(3);
    });

    it('should include all 3 availability options', () => {
      expect(containsPattern(filtersSource, /value=["']all["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']available["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']limited["']/)).toBe(true);
    });

    it('should have descriptive labels for availability', () => {
      expect(containsPattern(filtersSource, /All Events/)).toBe(true);
      expect(containsPattern(filtersSource, /Spots Available/)).toBe(true);
      expect(containsPattern(filtersSource, /Limited Spots/)).toBe(true);
    });

    it('should preserve selected availability', () => {
      expect(containsPattern(filtersSource, /checked=\{currentAvailability === ['"]all['"]\}/)).toBe(true);
      expect(containsPattern(filtersSource, /checked=\{currentAvailability === ['"]available['"]\}/)).toBe(true);
    });
  });

  describe('Form Actions', () => {
    it('should render Apply Filters button', () => {
      expect(containsPattern(filtersSource, /<button[^>]*type=["']submit["']/)).toBe(true);
      expect(containsPattern(filtersSource, /Apply Filters/)).toBe(true);
    });

    it('should render Clear Filters link', () => {
      expect(containsPattern(filtersSource, /Clear\s+(?:all\s+)?filters/i)).toBe(true);
      expect(containsPattern(filtersSource, /href=["']\/events["']/)).toBe(true);
    });

    it('should conditionally show Clear Filters', () => {
      expect(containsPattern(filtersSource, /hasActiveFilters/)).toBe(true);
    });
  });

  describe('JavaScript Functionality', () => {
    it('should include script tag', () => {
      expect(containsPattern(filtersSource, /<script>/)).toBe(true);
    });

    it('should auto-submit on radio button change', () => {
      expect(containsPattern(filtersSource, /radio\.addEventListener\(['"]change['"]/)).toBe(true);
      expect(containsPattern(filtersSource, /form\.submit\(\)/)).toBe(true);
    });

    it('should auto-submit on select change', () => {
      expect(containsPattern(filtersSource, /select\.addEventListener\(['"]change['"]/)).toBe(true);
    });

    it('should show/hide custom date range', () => {
      expect(containsPattern(filtersSource, /timeFrame/)).toBe(true);
      expect(containsPattern(filtersSource, /<script>/)).toBe(true);
      expect(containsPattern(filtersSource, /classList\.(remove|add)\(['"]hidden['"]\)/)).toBe(true);
    });

    it('should validate date range', () => {
      expect(containsPattern(filtersSource, /startDate/)).toBe(true);
      expect(containsPattern(filtersSource, /endDate/)).toBe(true);
      expect(containsPattern(filtersSource, /addEventListener\(['"]change['"]/)).toBe(true);
    });

    it('should prevent negative prices', () => {
      const scriptSection = filtersSource.match(/<script>[\s\S]*?<\/script>/);
      expect(scriptSection).toBeTruthy();
      // min="0" is in HTML, not script
      expect(containsPattern(filtersSource, /min=["']0["']/)).toBe(true);
    });
  });

  describe('Styling', () => {
    it('should use Tailwind CSS classes', () => {
      expect(containsPattern(filtersSource, /class="/)).toBe(true);
      expect(containsPattern(filtersSource, /rounded/)).toBe(true);
      expect(containsPattern(filtersSource, /shadow/)).toBe(true);
    });

    it('should be sticky positioned', () => {
      expect(containsPattern(filtersSource, /sticky/)).toBe(true);
      expect(containsPattern(filtersSource, /top-/)).toBe(true);
    });

    it('should be responsive', () => {
      expect(containsPattern(filtersSource, /lg:w-/)).toBe(true);
    });

    it('should have proper spacing', () => {
      expect(containsPattern(filtersSource, /space-y-/)).toBe(true);
      expect(containsPattern(filtersSource, /mb-/)).toBe(true);
    });
  });
});

// ============================================================================
// TEST SUITE: EVENTS CATALOG PAGE (src/pages/events/index.astro)
// ============================================================================

describe('Events Catalog Page Integration (T110)', () => {
  const pageSource = readSource('src/pages/events/index.astro');

  describe('Page Structure', () => {
    it('should exist as an Astro page', () => {
      expect(pageSource).toBeTruthy();
      expect(containsPattern(pageSource, '---')).toBe(true);
    });

    it('should import EventFilters component', () => {
      expect(containsPattern(pageSource, /import\s+EventFilters\s+from/)).toBe(true);
      expect(containsPattern(pageSource, /@\/components\/EventFilters\.astro/)).toBe(true);
    });

    it('should import EventCard component', () => {
      expect(containsPattern(pageSource, /import\s+EventCard\s+from/)).toBe(true);
    });

    it('should import getEvents from lib', () => {
      expect(containsPattern(pageSource, /import.*getEvents.*from\s+['"]@\/lib\/events['"]/)).toBe(true);
    });

    it('should import EventFilters type', () => {
      expect(containsPattern(pageSource, /import\s+type.*EventFilters/)).toBe(true);
    });
  });

  describe('URL Parameter Extraction', () => {
    it('should extract city parameter', () => {
      expect(containsPattern(pageSource, /const city = url\.searchParams\.get\(['"]city['"]\)/)).toBe(true);
    });

    it('should extract country parameter', () => {
      expect(containsPattern(pageSource, /const country = url\.searchParams\.get\(['"]country['"]\)/)).toBe(true);
    });

    it('should extract timeFrame parameter', () => {
      expect(containsPattern(pageSource, /const timeFrame = url\.searchParams\.get\(['"]timeFrame['"]\)/)).toBe(true);
    });

    it('should extract date range parameters', () => {
      expect(containsPattern(pageSource, /const startDate = url\.searchParams\.get\(['"]startDate['"]\)/)).toBe(true);
      expect(containsPattern(pageSource, /const endDate = url\.searchParams\.get\(['"]endDate['"]\)/)).toBe(true);
    });

    it('should extract price range parameters', () => {
      expect(containsPattern(pageSource, /const minPrice = url\.searchParams\.get\(['"]minPrice['"]\)/)).toBe(true);
      expect(containsPattern(pageSource, /const maxPrice = url\.searchParams\.get\(['"]maxPrice['"]\)/)).toBe(true);
    });

    it('should extract availability parameter', () => {
      expect(containsPattern(pageSource, /const availability = url\.searchParams\.get\(['"]availability['"]\)/)).toBe(true);
    });

    it('should extract page parameter', () => {
      expect(containsPattern(pageSource, /const page = .*url\.searchParams\.get\(['"]page['"]\)/)).toBe(true);
    });
  });

  describe('Filters Object Construction', () => {
    it('should build filters object', () => {
      expect(containsPattern(pageSource, /const filters:.*EventFilters/)).toBe(true);
    });

    it('should include isPublished: true', () => {
      expect(containsPattern(pageSource, /isPublished:\s*true/)).toBe(true);
    });

    it('should include all new filter properties', () => {
      expect(containsPattern(pageSource, /timeFrame:/)).toBe(true);
      expect(containsPattern(pageSource, /minPrice:/)).toBe(true);
      expect(containsPattern(pageSource, /maxPrice:/)).toBe(true);
      expect(containsPattern(pageSource, /availability:/)).toBe(true);
    });

    it('should convert date strings to Date objects', () => {
      expect(containsPattern(pageSource, /startDate.*new Date\(startDate\)/)).toBe(true);
      expect(containsPattern(pageSource, /endDate.*new Date\(endDate\)/)).toBe(true);
    });

    it('should convert price strings to numbers', () => {
      expect(containsPattern(pageSource, /minPrice.*parseFloat\(minPrice\)/)).toBe(true);
      expect(containsPattern(pageSource, /maxPrice.*parseFloat\(maxPrice\)/)).toBe(true);
    });

    it('should include pagination properties', () => {
      expect(containsPattern(pageSource, /limit:/)).toBe(true);
      expect(containsPattern(pageSource, /offset:/)).toBe(true);
    });
  });

  describe('Data Fetching', () => {
    it('should call getEvents with filters', () => {
      expect(containsPattern(pageSource, /getEvents\(filters\)/)).toBe(true);
    });

    it('should handle errors', () => {
      expect(containsPattern(pageSource, /try\s*\{/)).toBe(true);
      expect(containsPattern(pageSource, /catch/)).toBe(true);
      expect(containsPattern(pageSource, /error\s*=/)).toBe(true);
    });

    it('should check for more results (pagination)', () => {
      expect(containsPattern(pageSource, /hasMore\s*=\s*.*length\s*>\s*limit/)).toBe(true);
    });

    it('should fetch cities for dropdown', () => {
      expect(containsPattern(pageSource, /const cities\s*=/)).toBe(true);
      expect(containsPattern(pageSource, /map\(e => e\.venue_city\)/)).toBe(true);
    });

    it('should fetch countries for dropdown', () => {
      expect(containsPattern(pageSource, /const countries\s*=/)).toBe(true);
      expect(containsPattern(pageSource, /map\(e => e\.venue_country\)/)).toBe(true);
    });

    it('should get total count for pagination', () => {
      expect(containsPattern(pageSource, /totalEvents/)).toBe(true);
    });
  });

  describe('Pagination Logic', () => {
    it('should calculate total pages', () => {
      expect(containsPattern(pageSource, /const totalPages\s*=\s*Math\.ceil/)).toBe(true);
    });

    it('should determine hasNextPage', () => {
      expect(containsPattern(pageSource, /hasNextPage/)).toBe(true);
    });

    it('should determine hasPrevPage', () => {
      expect(containsPattern(pageSource, /hasPrevPage/)).toBe(true);
    });

    it('should implement buildPageUrl helper', () => {
      expect(containsPattern(pageSource, /function buildPageUrl/)).toBe(true);
    });

    it('should preserve all filters in buildPageUrl', () => {
      const buildPageUrl = extractFunction(pageSource, 'buildPageUrl');
      expect(containsPattern(buildPageUrl, 'city')).toBe(true);
      expect(containsPattern(buildPageUrl, 'country')).toBe(true);
      expect(containsPattern(buildPageUrl, 'timeFrame')).toBe(true);
      expect(containsPattern(buildPageUrl, 'minPrice')).toBe(true);
      expect(containsPattern(buildPageUrl, 'maxPrice')).toBe(true);
      expect(containsPattern(buildPageUrl, 'availability')).toBe(true);
    });
  });

  describe('Active Filter Count', () => {
    it('should calculate active filter count', () => {
      expect(containsPattern(pageSource, /activeFilterCount/)).toBe(true);
    });

    it('should count all 8 filter types', () => {
      const filterCountSection = pageSource.match(/activeFilterCount\s*=\s*\[[\s\S]*?\]/);
      expect(filterCountSection).toBeTruthy();
      if (filterCountSection) {
        expect(containsPattern(filterCountSection[0], 'city')).toBe(true);
        expect(containsPattern(filterCountSection[0], 'country')).toBe(true);
        expect(containsPattern(filterCountSection[0], 'timeFrame')).toBe(true);
        expect(containsPattern(filterCountSection[0], 'startDate')).toBe(true);
        expect(containsPattern(filterCountSection[0], 'endDate')).toBe(true);
        expect(containsPattern(filterCountSection[0], 'minPrice')).toBe(true);
        expect(containsPattern(filterCountSection[0], 'maxPrice')).toBe(true);
        expect(containsPattern(filterCountSection[0], 'availability')).toBe(true);
      }
    });
  });

  describe('EventFilters Component Integration', () => {
    it('should render EventFilters component', () => {
      expect(containsPattern(pageSource, /<EventFilters/)).toBe(true);
    });

    it('should pass current filter values as props', () => {
      const eventFiltersUsage = pageSource.match(/<EventFilters[\s\S]*?\/>/);
      expect(eventFiltersUsage).toBeTruthy();
      if (eventFiltersUsage) {
        expect(containsPattern(eventFiltersUsage[0], 'currentCity')).toBe(true);
        expect(containsPattern(eventFiltersUsage[0], 'currentCountry')).toBe(true);
        expect(containsPattern(eventFiltersUsage[0], 'currentTimeFrame')).toBe(true);
        expect(containsPattern(eventFiltersUsage[0], 'currentMinPrice')).toBe(true);
        expect(containsPattern(eventFiltersUsage[0], 'currentMaxPrice')).toBe(true);
        expect(containsPattern(eventFiltersUsage[0], 'currentAvailability')).toBe(true);
      }
    });

    it('should pass filter options (cities, countries)', () => {
      const eventFiltersUsage = pageSource.match(/<EventFilters[\s\S]*?\/>/);
      expect(eventFiltersUsage).toBeTruthy();
      if (eventFiltersUsage) {
        expect(containsPattern(eventFiltersUsage[0], 'cities=')).toBe(true);
        expect(containsPattern(eventFiltersUsage[0], 'countries=')).toBe(true);
      }
    });
  });

  describe('Layout Structure', () => {
    it('should use flex layout for sidebar and content', () => {
      expect(containsPattern(pageSource, /flex\s+flex-col\s+lg:flex-row/)).toBe(true);
    });

    it('should render header with title', () => {
      expect(containsPattern(pageSource, /<h1/)).toBe(true);
      expect(containsPattern(pageSource, /Browse Events/)).toBe(true);
    });

    it('should show active filter count in header', () => {
      const headerSection = pageSource.match(/<header[\s\S]*?<\/header>/);
      expect(headerSection).toBeTruthy();
      if (headerSection) {
        expect(containsPattern(headerSection[0], 'activeFilterCount')).toBe(true);
      }
    });

    it('should render main content area', () => {
      expect(containsPattern(pageSource, /<main/)).toBe(true);
    });
  });

  describe('Results Display', () => {
    it('should show results count', () => {
      expect(containsPattern(pageSource, /Showing.*of.*events/)).toBe(true);
    });

    it('should render active filter pills', () => {
      expect(containsPattern(pageSource, /Active Filters:/)).toBe(true);
    });

    it('should show filter pills conditionally', () => {
      expect(containsPattern(pageSource, /activeFilterCount\s*>\s*0/)).toBe(true);
    });

    it('should render events grid', () => {
      expect(containsPattern(pageSource, /grid\s+grid-cols/)).toBe(true);
    });

    it('should render EventCard for each event', () => {
      expect(containsPattern(pageSource, /<EventCard/)).toBe(true);
      expect(containsPattern(pageSource, /event=/)).toBe(true);
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no events', () => {
      expect(containsPattern(pageSource, /No Events Found/)).toBe(true);
    });

    it('should show different message based on filters', () => {
      expect(containsPattern(pageSource, /activeFilterCount\s*>\s*0/)).toBe(true);
      expect(containsPattern(pageSource, /No events match your current filters/)).toBe(true);
      expect(containsPattern(pageSource, /There are no upcoming events/)).toBe(true);
    });

    it('should show Clear Filters button in empty state', () => {
      const emptyStateSection = pageSource.match(/No Events Found[\s\S]{0,700}Clear Filters/);
      expect(emptyStateSection).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should render error state', () => {
      expect(containsPattern(pageSource, /error\s*&&/)).toBe(true);
    });

    it('should show error message', () => {
      expect(containsPattern(pageSource, /Failed to load events/)).toBe(true);
    });
  });

  describe('Pagination UI', () => {
    it('should render pagination when multiple pages', () => {
      expect(containsPattern(pageSource, /totalPages\s*>\s*1/)).toBe(true);
    });

    it('should render Previous button', () => {
      expect(containsPattern(pageSource, /Previous/)).toBe(true);
      expect(containsPattern(pageSource, /hasPrevPage/)).toBe(true);
    });

    it('should render Next button', () => {
      expect(containsPattern(pageSource, /Next/)).toBe(true);
      expect(containsPattern(pageSource, /hasNextPage/)).toBe(true);
    });

    it('should render page numbers', () => {
      expect(containsPattern(pageSource, /\[\.\.\.Array\(totalPages\)\]/)).toBe(true);
    });

    it('should implement smart truncation', () => {
      expect(containsPattern(pageSource, /showPage/)).toBe(true);
      expect(containsPattern(pageSource, /\.\.\./)).toBe(true);
    });

    it('should highlight current page', () => {
      expect(containsPattern(pageSource, /pageNum === page/)).toBe(true);
      expect(containsPattern(pageSource, /aria-current=["']page["']/)).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML', () => {
      expect(containsPattern(pageSource, /<header/)).toBe(true);
      expect(containsPattern(pageSource, /<main/)).toBe(true);
      expect(containsPattern(pageSource, /<nav/)).toBe(true);
    });

    it('should have aria-label on pagination', () => {
      expect(containsPattern(pageSource, /aria-label=["']Pagination["']/)).toBe(true);
    });

    it('should have aria-disabled on disabled buttons', () => {
      expect(containsPattern(pageSource, /aria-disabled/)).toBe(true);
    });

    it('should have descriptive page title', () => {
      expect(containsPattern(pageSource, /title=/)).toBe(true);
    });
  });

  describe('SEO', () => {
    it('should define title', () => {
      expect(containsPattern(pageSource, /const title\s*=/)).toBe(true);
    });

    it('should define description', () => {
      expect(containsPattern(pageSource, /const description\s*=/)).toBe(true);
    });

    it('should define keywords', () => {
      expect(containsPattern(pageSource, /const keywords\s*=/)).toBe(true);
    });

    it('should pass SEO props to BaseLayout', () => {
      expect(containsPattern(pageSource, /<BaseLayout/)).toBe(true);
      const layoutUsage = pageSource.match(/<BaseLayout[\s\S]*?>/);
      expect(layoutUsage).toBeTruthy();
      if (layoutUsage) {
        expect(containsPattern(layoutUsage[0], 'title')).toBe(true);
        expect(containsPattern(layoutUsage[0], 'description')).toBe(true);
        expect(containsPattern(layoutUsage[0], 'keywords')).toBe(true);
      }
    });
  });

  describe('Styling and Responsive Design', () => {
    it('should use Tailwind CSS classes', () => {
      expect(containsPattern(pageSource, /class="/)).toBe(true);
    });

    it('should be responsive', () => {
      expect(containsPattern(pageSource, /md:/)).toBe(true);
      expect(containsPattern(pageSource, /lg:/)).toBe(true);
    });

    it('should use design system spacing', () => {
      expect(containsPattern(pageSource, /px-lg/)).toBe(true);
      expect(containsPattern(pageSource, /mb-xl/)).toBe(true);
    });

    it('should use design system colors', () => {
      expect(containsPattern(pageSource, /text-text/)).toBe(true);
      expect(containsPattern(pageSource, /bg-surface/)).toBe(true);
    });
  });
});
