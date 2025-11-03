import type { APIRoute } from 'astro';
import { search, getLevels, getProductTypes, getPriceRange } from '../../lib/search';

/**
 * GET /api/search
 * Search across courses, products, and events with filtering and pagination
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    // Get query parameter (required)
    const query = params.get('q') || '';
    
    // Validate query
    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Search query is required'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Validate query length
    if (query.length > 200) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Search query is too long (max 200 characters)'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Get optional type filter
    const type = params.get('type');
    if (type && !['course', 'product', 'event'].includes(type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid type parameter. Must be: course, product, or event'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Get price filters
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    
    // Validate price filters
    if (minPrice && (isNaN(parseFloat(minPrice)) || parseFloat(minPrice) < 0)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid minPrice parameter'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    if (maxPrice && (isNaN(parseFloat(maxPrice)) || parseFloat(maxPrice) < 0)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid maxPrice parameter'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Get level filter (for courses)
    const level = params.get('level') || undefined;

    // Get product type filter
    const productType = params.get('productType');
    if (productType && !['pdf', 'audio', 'video', 'ebook'].includes(productType)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid productType parameter. Must be: pdf, audio, video, or ebook'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Get city filter (for events)
    const city = params.get('city') || undefined;

    // Get pagination parameters
    const limitParam = params.get('limit');
    const offsetParam = params.get('offset');

    let limit = 20; // Default
    let offset = 0; // Default

    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid limit parameter. Must be between 1 and 100'
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
      limit = parsedLimit;
    }

    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid offset parameter. Must be 0 or greater'
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
      offset = parsedOffset;
    }

    // Perform search
    const results = await search({
      query,
      type: type as 'course' | 'product' | 'event' | undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      level,
      productType: productType as 'pdf' | 'audio' | 'video' | 'ebook' | undefined,
      city,
      limit,
      offset
    });

    // Return successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: results
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60' // Cache for 1 minute
        }
      }
    );

  } catch (error) {
    console.error('Search API error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};

/**
 * OPTIONS /api/search
 * Handle CORS preflight requests
 */
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};
