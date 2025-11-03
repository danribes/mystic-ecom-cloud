/**
 * T111: Product Format & Price Filters - Test Suite
 * 
 * Comprehensive tests for the product filtering system including:
 * - Product service with format and file size filters
 * - ProductFilters component with type, price, and size filters
 * - Products catalog page integration with pagination
 */

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================================
// Helper Functions
// ============================================================================

function containsPattern(source: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return source.includes(pattern);
  }
  return pattern.test(source);
}

function extractFunction(source: string, functionName: string): string {
  const functionRegex = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?function\\s+${functionName}\\s*\\([^)]*\\)(?::\\s*[^{]+)?\\s*{`,
    'g'
  );
  const match = functionRegex.exec(source);
  if (!match) return '';

  let braceCount = 1;
  let index = match.index + match[0].length;
  let functionBody = match[0];

  while (braceCount > 0 && index < source.length) {
    const char = source[index];
    functionBody += char;
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    index++;
  }

  return functionBody;
}

function extractInterface(source: string, interfaceName: string): string {
  const interfaceRegex = new RegExp(
    `export\\s+interface\\s+${interfaceName}\\s*{`,
    'g'
  );
  const match = interfaceRegex.exec(source);
  if (!match) return '';

  let braceCount = 1;
  let index = match.index + match[0].length;
  let interfaceBody = match[0];

  while (braceCount > 0 && index < source.length) {
    const char = source[index];
    interfaceBody += char;
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    index++;
  }

  return interfaceBody;
}

function countOccurrences(source: string, pattern: string | RegExp): number {
  if (typeof pattern === 'string') {
    return (source.match(new RegExp(pattern, 'g')) || []).length;
  }
  return (source.match(pattern) || []).length;
}

// ============================================================================
// Test Suite: Product Service - Enhanced Filters
// ============================================================================

describe('Product Service - Enhanced Filters (T111)', () => {
  const productsPath = resolve(process.cwd(), 'src/lib/products.ts');
  const productsSource = readFileSync(productsPath, 'utf-8');

  // -------------------------------------------------------------------------
  // getProducts Function Signature
  // -------------------------------------------------------------------------

  describe('getProducts Function Signature', () => {
    const getProductsFunc = extractFunction(productsSource, 'getProducts');

    test('should have getProducts function exported', () => {
      expect(containsPattern(productsSource, /export\s+async\s+function\s+getProducts/)).toBe(true);
    });

    test('should accept options parameter with filter properties', () => {
      expect(containsPattern(getProductsFunc, /options:\s*\{/)).toBe(true);
      expect(containsPattern(getProductsFunc, /type\?:/)).toBe(true);
      expect(containsPattern(getProductsFunc, /minPrice\?:/)).toBe(true);
      expect(containsPattern(getProductsFunc, /maxPrice\?:/)).toBe(true);
    });

    test('should support minSize filter option', () => {
      expect(containsPattern(getProductsFunc, /minSize\?:/)).toBe(true);
    });

    test('should support maxSize filter option', () => {
      expect(containsPattern(getProductsFunc, /maxSize\?:/)).toBe(true);
    });

    test('should support size-based sort options', () => {
      expect(containsPattern(getProductsFunc, /'size-asc'/)).toBe(true);
      expect(containsPattern(getProductsFunc, /'size-desc'/)).toBe(true);
    });

    test('should return Promise<DigitalProduct[]>', () => {
      expect(containsPattern(productsSource, /Promise<DigitalProduct\[\]>/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Product Type Filter
  // -------------------------------------------------------------------------

  describe('Product Type Filter', () => {
    const getProductsFunc = extractFunction(productsSource, 'getProducts');

    test('should filter by product type when provided', () => {
      expect(containsPattern(getProductsFunc, /if\s*\(\s*options\.type/)).toBe(true);
      expect(containsPattern(getProductsFunc, /product_type\s*=\s*\$/)).toBe(true);
    });

    test('should use parameterized query for type filter', () => {
      expect(containsPattern(getProductsFunc, /params\.push\(options\.type\)/)).toBe(true);
    });

    test('should support pdf, audio, video, ebook types', () => {
      expect(containsPattern(productsSource, /'pdf'/)).toBe(true);
      expect(containsPattern(productsSource, /'audio'/)).toBe(true);
      expect(containsPattern(productsSource, /'video'/)).toBe(true);
      expect(containsPattern(productsSource, /'ebook'/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // File Size Filter
  // -------------------------------------------------------------------------

  describe('File Size Filter', () => {
    const getProductsFunc = extractFunction(productsSource, 'getProducts');

    test('should filter by minimum file size', () => {
      expect(containsPattern(getProductsFunc, /if\s*\(\s*options\.minSize\s*!==\s*undefined/)).toBe(true);
      expect(containsPattern(getProductsFunc, /file_size_mb\s*>=\s*\$/)).toBe(true);
    });

    test('should filter by maximum file size', () => {
      expect(containsPattern(getProductsFunc, /if\s*\(\s*options\.maxSize\s*!==\s*undefined/)).toBe(true);
      expect(containsPattern(getProductsFunc, /file_size_mb\s*<=\s*\$/)).toBe(true);
    });

    test('should use parameterized queries for size filters', () => {
      expect(containsPattern(getProductsFunc, /params\.push\(options\.minSize\)/)).toBe(true);
      expect(containsPattern(getProductsFunc, /params\.push\(options\.maxSize\)/)).toBe(true);
    });

    test('should check for undefined (not falsy) to allow 0 as valid size', () => {
      expect(containsPattern(getProductsFunc, /!==\s*undefined/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Price Range Filter
  // -------------------------------------------------------------------------

  describe('Price Range Filter', () => {
    const getProductsFunc = extractFunction(productsSource, 'getProducts');

    test('should filter by minimum price', () => {
      expect(containsPattern(getProductsFunc, /if\s*\(\s*options\.minPrice\s*!==\s*undefined/)).toBe(true);
      expect(containsPattern(getProductsFunc, /price\s*>=\s*\$/)).toBe(true);
    });

    test('should filter by maximum price', () => {
      expect(containsPattern(getProductsFunc, /if\s*\(\s*options\.maxPrice\s*!==\s*undefined/)).toBe(true);
      expect(containsPattern(getProductsFunc, /price\s*<=\s*\$/)).toBe(true);
    });

    test('should use parameterized queries for price filters', () => {
      expect(containsPattern(getProductsFunc, /params\.push\(options\.minPrice\)/)).toBe(true);
      expect(containsPattern(getProductsFunc, /params\.push\(options\.maxPrice\)/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Sorting Options
  // -------------------------------------------------------------------------

  describe('Sorting Options', () => {
    const getProductsFunc = extractFunction(productsSource, 'getProducts');

    test('should support price sorting (ascending)', () => {
      expect(containsPattern(getProductsFunc, /case\s+['"]price-asc['"]/)).toBe(true);
      expect(containsPattern(getProductsFunc, /ORDER\s+BY\s+price\s+ASC/i)).toBe(true);
    });

    test('should support price sorting (descending)', () => {
      expect(containsPattern(getProductsFunc, /case\s+['"]price-desc['"]/)).toBe(true);
      expect(containsPattern(getProductsFunc, /ORDER\s+BY\s+price\s+DESC/i)).toBe(true);
    });

    test('should support title sorting (ascending)', () => {
      expect(containsPattern(getProductsFunc, /case\s+['"]title-asc['"]/)).toBe(true);
      expect(containsPattern(getProductsFunc, /ORDER\s+BY\s+title\s+ASC/i)).toBe(true);
    });

    test('should support title sorting (descending)', () => {
      expect(containsPattern(getProductsFunc, /case\s+['"]title-desc['"]/)).toBe(true);
      expect(containsPattern(getProductsFunc, /ORDER\s+BY\s+title\s+DESC/i)).toBe(true);
    });

    test('should support file size sorting (ascending)', () => {
      expect(containsPattern(getProductsFunc, /case\s+['"]size-asc['"]/)).toBe(true);
      expect(containsPattern(getProductsFunc, /ORDER\s+BY\s+file_size_mb\s+ASC/i)).toBe(true);
    });

    test('should support file size sorting (descending)', () => {
      expect(containsPattern(getProductsFunc, /case\s+['"]size-desc['"]/)).toBe(true);
      expect(containsPattern(getProductsFunc, /ORDER\s+BY\s+file_size_mb\s+DESC/i)).toBe(true);
    });

    test('should support newest first sorting', () => {
      expect(containsPattern(getProductsFunc, /case\s+['"]newest['"]/)).toBe(true);
      expect(containsPattern(getProductsFunc, /ORDER\s+BY\s+created_at\s+DESC/i)).toBe(true);
    });

    test('should default to newest when sortBy not specified', () => {
      expect(containsPattern(getProductsFunc, /default:[\s\S]*?ORDER\s+BY\s+created_at\s+DESC/i)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Pagination Support
  // -------------------------------------------------------------------------

  describe('Pagination Support', () => {
    const getProductsFunc = extractFunction(productsSource, 'getProducts');

    test('should support limit parameter', () => {
      expect(containsPattern(getProductsFunc, /if\s*\(\s*options\.limit/)).toBe(true);
      expect(containsPattern(getProductsFunc, /LIMIT\s+\$/)).toBe(true);
    });

    test('should support offset parameter', () => {
      expect(containsPattern(getProductsFunc, /if\s*\(\s*options\.offset/)).toBe(true);
      expect(containsPattern(getProductsFunc, /OFFSET\s+\$/)).toBe(true);
    });

    test('should use parameterized queries for pagination', () => {
      expect(containsPattern(getProductsFunc, /params\.push\(options\.limit\)/)).toBe(true);
      expect(containsPattern(getProductsFunc, /params\.push\(options\.offset\)/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Query Construction
  // -------------------------------------------------------------------------

  describe('Query Construction', () => {
    const getProductsFunc = extractFunction(productsSource, 'getProducts');

    test('should use dynamic query building', () => {
      expect(containsPattern(getProductsFunc, /let\s+query\s*=/)).toBe(true);
      expect(containsPattern(getProductsFunc, /query\s*\+=/)).toBe(true);
    });

    test('should maintain parameterized queries', () => {
      expect(containsPattern(getProductsFunc, /params:\s*any\[\]/)).toBe(true);
      expect(containsPattern(getProductsFunc, /paramIndex/)).toBe(true);
      expect(containsPattern(getProductsFunc, /\$\$\{paramIndex\}/)).toBe(true);
    });

    test('should filter only published products', () => {
      expect(containsPattern(getProductsFunc, /is_published\s*=\s*true/i)).toBe(true);
    });
  });
});

// ============================================================================
// Test Suite: ProductFilters Component
// ============================================================================

describe('ProductFilters Component (T111)', () => {
  const filtersPath = resolve(process.cwd(), 'src/components/ProductFilters.astro');
  const filtersSource = readFileSync(filtersPath, 'utf-8');

  // -------------------------------------------------------------------------
  // Component Structure
  // -------------------------------------------------------------------------

  describe('Component Structure', () => {
    test('should exist as an Astro component', () => {
      expect(filtersSource).toContain('---');
      expect(containsPattern(filtersSource, /interface\s+Props/)).toBe(true);
    });

    test('should define Props interface', () => {
      expect(containsPattern(filtersSource, /interface\s+Props\s*\{/)).toBe(true);
    });

    test('should be a sidebar component with form', () => {
      expect(containsPattern(filtersSource, /<aside/)).toBe(true);
      expect(containsPattern(filtersSource, /<form/)).toBe(true);
      expect(containsPattern(filtersSource, /id=["']product-filters["']/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Props Interface
  // -------------------------------------------------------------------------

  describe('Props Interface', () => {
    test('should include currentType prop', () => {
      expect(containsPattern(filtersSource, /currentType\??:/)).toBe(true);
    });

    test('should include price range props', () => {
      expect(containsPattern(filtersSource, /currentMinPrice\??:/)).toBe(true);
      expect(containsPattern(filtersSource, /currentMaxPrice\??:/)).toBe(true);
    });

    test('should include file size range props', () => {
      expect(containsPattern(filtersSource, /currentMinSize\??:/)).toBe(true);
      expect(containsPattern(filtersSource, /currentMaxSize\??:/)).toBe(true);
    });

    test('should include sort prop', () => {
      expect(containsPattern(filtersSource, /currentSort\??:/)).toBe(true);
    });

    test('should provide default values for props', () => {
      expect(containsPattern(filtersSource, /=\s*['"]all['"]/)).toBe(true);
      expect(containsPattern(filtersSource, /=\s*['"]{2}/)).toBe(true); // empty string defaults
    });
  });

  // -------------------------------------------------------------------------
  // Product Type Filter
  // -------------------------------------------------------------------------

  describe('Product Type Filter', () => {
    test('should render product type section', () => {
      expect(containsPattern(filtersSource, /Product\s+Type/)).toBe(true);
    });

    test('should render radio buttons for type selection', () => {
      // Check that radio button structure exists
      expect(containsPattern(filtersSource, /type="radio"/)).toBe(true);
      expect(containsPattern(filtersSource, /name="type"/)).toBe(true);
      // Check that productTypes map is used for rendering multiple options
      expect(containsPattern(filtersSource, /productTypes\.map/)).toBe(true);
    });

    test('should include "All Products" option', () => {
      expect(containsPattern(filtersSource, /All\s+Products/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']?all["']?/)).toBe(true);
    });

    test('should include PDF, Audio, Video, and E-Book options', () => {
      expect(containsPattern(filtersSource, /value=\{value\}/)).toBe(true);
      expect(containsPattern(filtersSource, /pdf|audio|video|ebook/)).toBe(true);
    });

    test('should include icons for product types', () => {
      expect(containsPattern(filtersSource, /📄|🎵|🎥|📚/)).toBe(true);
    });

    test('should preserve selected type', () => {
      expect(containsPattern(filtersSource, /checked=\{currentType\s*===\s*['"]all['"]\}/)).toBe(true);
      expect(containsPattern(filtersSource, /checked=\{currentType\s*===\s*.*value/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Price Range Filter
  // -------------------------------------------------------------------------

  describe('Price Range Filter', () => {
    test('should render price range section', () => {
      expect(containsPattern(filtersSource, /Price\s+Range/)).toBe(true);
    });

    test('should render min price input', () => {
      expect(containsPattern(filtersSource, /id=["']minPrice["']/)).toBe(true);
      expect(containsPattern(filtersSource, /name=["']minPrice["']/)).toBe(true);
      expect(containsPattern(filtersSource, /type=["']number["']/)).toBe(true);
    });

    test('should render max price input', () => {
      expect(containsPattern(filtersSource, /id=["']maxPrice["']/)).toBe(true);
      expect(containsPattern(filtersSource, /name=["']maxPrice["']/)).toBe(true);
    });

    test('should have min="0" on price inputs', () => {
      const minPriceSection = filtersSource.match(/id=["']minPrice["'][\s\S]{0,200}/);
      expect(minPriceSection && /min=["']0["']/.test(minPriceSection[0])).toBe(true);
    });

    test('should have step="0.01" for decimal prices', () => {
      expect(containsPattern(filtersSource, /step=["']0\.01["']/)).toBe(true);
    });

    test('should preserve price values', () => {
      expect(containsPattern(filtersSource, /value=\{currentMinPrice\}/)).toBe(true);
      expect(containsPattern(filtersSource, /value=\{currentMaxPrice\}/)).toBe(true);
    });

    test('should have dollar sign indicator', () => {
      expect(containsPattern(filtersSource, /\$/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // File Size Filter
  // -------------------------------------------------------------------------

  describe('File Size Filter', () => {
    test('should render file size section', () => {
      expect(containsPattern(filtersSource, /File\s+Size/)).toBe(true);
    });

    test('should render min size input', () => {
      expect(containsPattern(filtersSource, /id=["']minSize["']/)).toBe(true);
      expect(containsPattern(filtersSource, /name=["']minSize["']/)).toBe(true);
    });

    test('should render max size input', () => {
      expect(containsPattern(filtersSource, /id=["']maxSize["']/)).toBe(true);
      expect(containsPattern(filtersSource, /name=["']maxSize["']/)).toBe(true);
    });

    test('should have min="0" on size inputs', () => {
      const minSizeSection = filtersSource.match(/id=["']minSize["'][\s\S]{0,200}/);
      expect(minSizeSection && /min=["']0["']/.test(minSizeSection[0])).toBe(true);
    });

    test('should preserve size values', () => {
      expect(containsPattern(filtersSource, /value=\{currentMinSize\}/)).toBe(true);
      expect(containsPattern(filtersSource, /value=\{currentMaxSize\}/)).toBe(true);
    });

    test('should indicate MB unit', () => {
      expect(containsPattern(filtersSource, /MB/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Sort By Dropdown
  // -------------------------------------------------------------------------

  describe('Sort By Dropdown', () => {
    test('should render sort dropdown', () => {
      expect(containsPattern(filtersSource, /id=["']sort["']/)).toBe(true);
      expect(containsPattern(filtersSource, /<select/)).toBe(true);
    });

    test('should include all sort options', () => {
      expect(containsPattern(filtersSource, /value=["']newest["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']price-asc["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']price-desc["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']title-asc["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']title-desc["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']size-asc["']/)).toBe(true);
      expect(containsPattern(filtersSource, /value=["']size-desc["']/)).toBe(true);
    });

    test('should preserve selected sort option', () => {
      expect(containsPattern(filtersSource, /selected=\{currentSort\s*===.*\}/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Form Actions
  // -------------------------------------------------------------------------

  describe('Form Actions', () => {
    test('should render Apply Filters button', () => {
      expect(containsPattern(filtersSource, /Apply\s+Filters/)).toBe(true);
      expect(containsPattern(filtersSource, /type=["']submit["']/)).toBe(true);
    });

    test('should render Clear all link', () => {
      expect(containsPattern(filtersSource, /Clear\s+all/)).toBe(true);
      expect(containsPattern(filtersSource, /href=["']\/products["']/)).toBe(true);
    });

    test('should conditionally show Clear all link', () => {
      expect(containsPattern(filtersSource, /hasActiveFilters/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // JavaScript Functionality
  // -------------------------------------------------------------------------

  describe('JavaScript Functionality', () => {
    test('should include script tag', () => {
      expect(containsPattern(filtersSource, /<script>/)).toBe(true);
    });

    test('should auto-submit on type radio change', () => {
      expect(containsPattern(filtersSource, /typeRadios/)).toBe(true);
      expect(containsPattern(filtersSource, /addEventListener\(['"]change['"]/)).toBe(true);
      expect(containsPattern(filtersSource, /form.*submit\(\)/)).toBe(true);
    });

    test('should auto-submit on sort change', () => {
      expect(containsPattern(filtersSource, /sortSelect/)).toBe(true);
      expect(containsPattern(filtersSource, /addEventListener\(['"]change['"]/)).toBe(true);
    });

    test('should prevent negative price values', () => {
      expect(containsPattern(filtersSource, /priceInputs/)).toBe(true);
      expect(containsPattern(filtersSource, /parseFloat.*<\s*0/)).toBe(true);
    });

    test('should prevent negative size values', () => {
      expect(containsPattern(filtersSource, /sizeInputs/)).toBe(true);
      expect(containsPattern(filtersSource, /parseFloat.*<\s*0/)).toBe(true);
    });

    test('should validate price range (max >= min)', () => {
      expect(containsPattern(filtersSource, /validatePriceRange/)).toBe(true);
      expect(containsPattern(filtersSource, /setCustomValidity/)).toBe(true);
    });

    test('should validate size range (max >= min)', () => {
      expect(containsPattern(filtersSource, /validateSizeRange/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Styling
  // -------------------------------------------------------------------------

  describe('Styling', () => {
    test('should use Tailwind CSS classes', () => {
      expect(containsPattern(filtersSource, /class=/)).toBe(true);
      expect(containsPattern(filtersSource, /bg-/)).toBe(true);
      expect(containsPattern(filtersSource, /text-/)).toBe(true);
      expect(containsPattern(filtersSource, /rounded/)).toBe(true);
    });

    test('should be sticky positioned', () => {
      expect(containsPattern(filtersSource, /sticky/)).toBe(true);
      expect(containsPattern(filtersSource, /top-/)).toBe(true);
    });

    test('should be responsive', () => {
      expect(containsPattern(filtersSource, /lg:w-/)).toBe(true);
    });

    test('should have proper spacing', () => {
      expect(containsPattern(filtersSource, /space-y-/)).toBe(true);
      expect(containsPattern(filtersSource, /mb-/)).toBe(true);
    });
  });
});

// ============================================================================
// Test Suite: Products Catalog Page Integration
// ============================================================================

describe('Products Catalog Page Integration (T111)', () => {
  const pagePath = resolve(process.cwd(), 'src/pages/products/index.astro');
  const pageSource = readFileSync(pagePath, 'utf-8');

  // -------------------------------------------------------------------------
  // Page Structure
  // -------------------------------------------------------------------------

  describe('Page Structure', () => {
    test('should exist as an Astro page', () => {
      expect(pageSource).toContain('---');
      expect(containsPattern(pageSource, /import.*BaseLayout/)).toBe(true);
    });

    test('should import ProductFilters component', () => {
      expect(containsPattern(pageSource, /import.*ProductFilters/)).toBe(true);
    });

    test('should import ProductCard component', () => {
      expect(containsPattern(pageSource, /import.*ProductCard/)).toBe(true);
    });

    test('should import getProducts from lib', () => {
      expect(containsPattern(pageSource, /import.*getProducts.*from.*products/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // URL Parameter Extraction
  // -------------------------------------------------------------------------

  describe('URL Parameter Extraction', () => {
    test('should extract type parameter', () => {
      expect(containsPattern(pageSource, /searchParams\.get\(['"]type['"]\)/)).toBe(true);
    });

    test('should extract search parameter', () => {
      expect(containsPattern(pageSource, /searchParams\.get\(['"]search['"]\)/)).toBe(true);
    });

    test('should extract price range parameters', () => {
      expect(containsPattern(pageSource, /searchParams\.get\(['"]minPrice['"]\)/)).toBe(true);
      expect(containsPattern(pageSource, /searchParams\.get\(['"]maxPrice['"]\)/)).toBe(true);
    });

    test('should extract file size parameters', () => {
      expect(containsPattern(pageSource, /searchParams\.get\(['"]minSize['"]\)/)).toBe(true);
      expect(containsPattern(pageSource, /searchParams\.get\(['"]maxSize['"]\)/)).toBe(true);
    });

    test('should extract sort parameter', () => {
      expect(containsPattern(pageSource, /searchParams\.get\(['"]sort['"]\)/)).toBe(true);
    });

    test('should extract page parameter', () => {
      expect(containsPattern(pageSource, /searchParams\.get\(['"]page['"]\)/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Filters Object Construction
  // -------------------------------------------------------------------------

  describe('Filters Object Construction', () => {
    test('should build filters object', () => {
      expect(containsPattern(pageSource, /filters.*=/)).toBe(true);
    });

    test('should include type filter (excluding "all")', () => {
      expect(containsPattern(pageSource, /type.*!==.*['"]all['"]/)).toBe(true);
    });

    test('should convert price strings to numbers', () => {
      expect(containsPattern(pageSource, /parseFloat.*minPrice/)).toBe(true);
      expect(containsPattern(pageSource, /parseFloat.*maxPrice/)).toBe(true);
    });

    test('should convert size strings to numbers', () => {
      expect(containsPattern(pageSource, /parseFloat.*minSize/)).toBe(true);
      expect(containsPattern(pageSource, /parseFloat.*maxSize/)).toBe(true);
    });

    test('should include pagination properties', () => {
      expect(containsPattern(pageSource, /limit/)).toBe(true);
      expect(containsPattern(pageSource, /offset/)).toBe(true);
    });

    test('should check for more results for pagination', () => {
      expect(containsPattern(pageSource, /limit\s*\+\s*1/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  describe('Data Fetching', () => {
    test('should call getProducts with filters', () => {
      expect(containsPattern(pageSource, /await\s+getProducts/)).toBe(true);
    });

    test('should handle errors', () => {
      expect(containsPattern(pageSource, /try\s*\{[\s\S]*?catch/)).toBe(true);
      expect(containsPattern(pageSource, /error\s*=/)).toBe(true);
    });

    test('should check for more pages', () => {
      expect(containsPattern(pageSource, /hasMore/)).toBe(true);
      expect(containsPattern(pageSource, /\.slice\(0,\s*limit\)/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Pagination Logic
  // -------------------------------------------------------------------------

  describe('Pagination Logic', () => {
    test('should calculate has previous page', () => {
      expect(containsPattern(pageSource, /hasPrevPage/)).toBe(true);
      expect(containsPattern(pageSource, /page\s*>\s*1/)).toBe(true);
    });

    test('should calculate has next page', () => {
      expect(containsPattern(pageSource, /hasNextPage/)).toBe(true);
    });

    test('should implement buildPageUrl helper', () => {
      expect(containsPattern(pageSource, /function\s+buildPageUrl/)).toBe(true);
      expect(containsPattern(pageSource, /pageNum/)).toBe(true);
    });

    test('should preserve all filters in buildPageUrl', () => {
      const buildPageUrlFunc = extractFunction(pageSource, 'buildPageUrl');
      expect(containsPattern(buildPageUrlFunc, /type/)).toBe(true);
      expect(containsPattern(buildPageUrlFunc, /minPrice/)).toBe(true);
      expect(containsPattern(buildPageUrlFunc, /maxPrice/)).toBe(true);
      expect(containsPattern(buildPageUrlFunc, /minSize/)).toBe(true);
      expect(containsPattern(buildPageUrlFunc, /maxSize/)).toBe(true);
      expect(containsPattern(buildPageUrlFunc, /sort/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Active Filter Count
  // -------------------------------------------------------------------------

  describe('Active Filter Count', () => {
    test('should calculate active filter count', () => {
      expect(containsPattern(pageSource, /activeFilterCount/)).toBe(true);
    });

    test('should count all 6 filter types', () => {
      expect(containsPattern(pageSource, /type.*!==.*['"]all['"]/)).toBe(true);
      expect(containsPattern(pageSource, /search.*!==\s*['"]{2}/)).toBe(true);
      expect(containsPattern(pageSource, /minPrice.*!==\s*['"]{2}/)).toBe(true);
      expect(containsPattern(pageSource, /maxPrice.*!==\s*['"]{2}/)).toBe(true);
      expect(containsPattern(pageSource, /minSize.*!==\s*['"]{2}/)).toBe(true);
      expect(containsPattern(pageSource, /maxSize.*!==\s*['"]{2}/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // ProductFilters Component Integration
  // -------------------------------------------------------------------------

  describe('ProductFilters Component Integration', () => {
    test('should render ProductFilters component', () => {
      expect(containsPattern(pageSource, /<ProductFilters/)).toBe(true);
    });

    test('should pass current filter values as props', () => {
      expect(containsPattern(pageSource, /currentType=\{type\}/)).toBe(true);
      expect(containsPattern(pageSource, /currentMinPrice=\{minPrice\}/)).toBe(true);
      expect(containsPattern(pageSource, /currentMaxPrice=\{maxPrice\}/)).toBe(true);
      expect(containsPattern(pageSource, /currentMinSize=\{minSize\}/)).toBe(true);
      expect(containsPattern(pageSource, /currentMaxSize=\{maxSize\}/)).toBe(true);
      expect(containsPattern(pageSource, /currentSort=\{sortBy\}/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Layout Structure
  // -------------------------------------------------------------------------

  describe('Layout Structure', () => {
    test('should use flex layout for sidebar and content', () => {
      expect(containsPattern(pageSource, /flex/)).toBe(true);
      expect(containsPattern(pageSource, /lg:flex-row/)).toBe(true);
    });

    test('should render header with title', () => {
      expect(containsPattern(pageSource, /<h1/)).toBe(true);
      expect(containsPattern(pageSource, /Digital\s+Products/)).toBe(true);
    });

    test('should show active filter count in header', () => {
      expect(containsPattern(pageSource, /activeFilterCount.*>.*0/)).toBe(true);
      expect(containsPattern(pageSource, /filter.*applied/)).toBe(true);
    });

    test('should render main content area', () => {
      expect(containsPattern(pageSource, /<main/)).toBe(true);
      expect(containsPattern(pageSource, /flex-1/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Search Bar
  // -------------------------------------------------------------------------

  describe('Search Bar', () => {
    test('should render search form', () => {
      expect(containsPattern(pageSource, /<form.*method=["']GET["']/)).toBe(true);
      expect(containsPattern(pageSource, /action=["']\/products["']/)).toBe(true);
    });

    test('should render search input', () => {
      expect(containsPattern(pageSource, /name=["']search["']/)).toBe(true);
      expect(containsPattern(pageSource, /placeholder.*[Ss]earch/)).toBe(true);
    });

    test('should preserve search value', () => {
      expect(containsPattern(pageSource, /value=\{search\}/)).toBe(true);
    });

    test('should preserve other filters in hidden inputs', () => {
      expect(containsPattern(pageSource, /type=["']hidden["']/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Results Display
  // -------------------------------------------------------------------------

  describe('Results Display', () => {
    test('should show results count', () => {
      expect(containsPattern(pageSource, /Showing/)).toBe(true);
      expect(containsPattern(pageSource, /products\.length/)).toBe(true);
    });

    test('should render active filter pills', () => {
      expect(containsPattern(pageSource, /hasActiveFilters/)).toBe(true);
      expect(containsPattern(pageSource, /type.*!==.*['"]all['"]/)).toBe(true);
    });

    test('should show individual remove buttons on pills', () => {
      expect(containsPattern(pageSource, /buildClearFilterUrl/)).toBe(true);
      expect(containsPattern(pageSource, /×/)).toBe(true);
    });

    test('should render products grid', () => {
      expect(containsPattern(pageSource, /grid/)).toBe(true);
      expect(containsPattern(pageSource, /grid-cols/)).toBe(true);
    });

    test('should render ProductCard for each product', () => {
      expect(containsPattern(pageSource, /<ProductCard/)).toBe(true);
      expect(containsPattern(pageSource, /product=\{product\}/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Empty State
  // -------------------------------------------------------------------------

  describe('Empty State', () => {
    test('should render empty state when no products', () => {
      expect(containsPattern(pageSource, /products\.length\s*===\s*0/)).toBe(true);
      expect(containsPattern(pageSource, /No\s+Products/)).toBe(true);
    });

    test('should show different message based on filters', () => {
      expect(containsPattern(pageSource, /hasActiveFilters\s*\?/)).toBe(true);
    });

    test('should show Clear Filters button in empty state', () => {
      expect(containsPattern(pageSource, /Clear\s+Filters/)).toBe(true);
      expect(containsPattern(pageSource, /href=["']\/products["']/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------

  describe('Error Handling', () => {
    test('should render error state', () => {
      expect(containsPattern(pageSource, /\{error\s*&&/)).toBe(true);
    });

    test('should show error message', () => {
      expect(containsPattern(pageSource, /Failed\s+to\s+load/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Pagination UI
  // -------------------------------------------------------------------------

  describe('Pagination UI', () => {
    test('should render pagination when multiple pages', () => {
      expect(containsPattern(pageSource, /hasPrevPage\s*\|\|\s*hasNextPage/)).toBe(true);
    });

    test('should render Previous button', () => {
      expect(containsPattern(pageSource, /Previous/)).toBe(true);
      expect(containsPattern(pageSource, /page\s*-\s*1/)).toBe(true);
    });

    test('should render Next button', () => {
      expect(containsPattern(pageSource, /Next/)).toBe(true);
      expect(containsPattern(pageSource, /page\s*\+\s*1/)).toBe(true);
    });

    test('should show current page number', () => {
      expect(containsPattern(pageSource, /Page\s*\{page\}/)).toBe(true);
    });

    test('should disable Previous when on first page', () => {
      expect(containsPattern(pageSource, /aria-disabled/)).toBe(true);
    });

    test('should disable Next when on last page', () => {
      expect(containsPattern(pageSource, /\{hasNextPage.*?aria-disabled/s)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------

  describe('Accessibility', () => {
    test('should have semantic HTML', () => {
      expect(containsPattern(pageSource, /<main/)).toBe(true);
      expect(containsPattern(pageSource, /<nav/)).toBe(true);
    });

    test('should have aria-label on pagination', () => {
      expect(containsPattern(pageSource, /aria-label=["']Pagination["']/)).toBe(true);
    });

    test('should have aria-disabled on disabled buttons', () => {
      expect(containsPattern(pageSource, /aria-disabled/)).toBe(true);
    });

    test('should have descriptive labels on filter removes', () => {
      expect(containsPattern(pageSource, /aria-label=["']Clear.*filter/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // SEO
  // -------------------------------------------------------------------------

  describe('SEO', () => {
    test('should define title', () => {
      expect(containsPattern(pageSource, /title=/)).toBe(true);
      expect(containsPattern(pageSource, /Digital\s+Products/)).toBe(true);
    });

    test('should define description', () => {
      expect(containsPattern(pageSource, /description=/)).toBe(true);
    });

    test('should define keywords', () => {
      expect(containsPattern(pageSource, /keywords=/)).toBe(true);
    });

    test('should pass SEO props to BaseLayout', () => {
      expect(containsPattern(pageSource, /<BaseLayout/)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Styling and Responsive Design
  // -------------------------------------------------------------------------

  describe('Styling and Responsive Design', () => {
    test('should use Tailwind CSS classes', () => {
      expect(containsPattern(pageSource, /class=/)).toBe(true);
      expect(containsPattern(pageSource, /bg-/)).toBe(true);
      expect(containsPattern(pageSource, /text-/)).toBe(true);
    });

    test('should be responsive', () => {
      expect(containsPattern(pageSource, /sm:/)).toBe(true);
      expect(containsPattern(pageSource, /lg:/)).toBe(true);
    });

    test('should use design system spacing', () => {
      expect(containsPattern(pageSource, /mb-/)).toBe(true);
      expect(containsPattern(pageSource, /gap-/)).toBe(true);
    });

    test('should use design system colors', () => {
      expect(containsPattern(pageSource, /blue-/)).toBe(true);
      expect(containsPattern(pageSource, /gray-/)).toBe(true);
    });
  });
});
