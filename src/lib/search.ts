import pool from './db';

export interface SearchOptions {
  query: string;
  type?: 'course' | 'product' | 'event';
  minPrice?: number;
  maxPrice?: number;
  level?: string;
  productType?: 'pdf' | 'audio' | 'video' | 'ebook';
  city?: string;
  limit?: number;
  offset?: number;
}

export interface CourseResult {
  type: 'course';
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string | null;
  level: string | null;
  durationHours: number | null;
  relevance: number;
}

export interface ProductResult {
  type: 'product';
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string | null;
  productType: string;
  fileSizeMb: number | null;
  relevance: number;
}

export interface EventResult {
  type: 'event';
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string | null;
  venueCity: string;
  venueCountry: string;
  eventDate: Date;
  durationHours: number;
  availableSpots: number;
  relevance: number;
}

export type SearchResultItem = CourseResult | ProductResult | EventResult;

export interface SearchResults {
  items: SearchResultItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Main unified search function across all content types
 */
export async function search(options: SearchOptions): Promise<SearchResults> {
  const {
    query = '',
    type,
    minPrice,
    maxPrice,
    limit = 20,
    offset = 0
  } = options;

  // If type is specified, search only that type
  if (type === 'course') {
    return await searchCourses(options);
  }

  if (type === 'product') {
    return await searchProducts(options);
  }

  if (type === 'event') {
    return await searchEvents(options);
  }

  // Otherwise, search all types
  const [courses, products, events] = await Promise.all([
    searchCourses({ ...options, limit: Math.ceil(limit / 3) }),
    searchProducts({ ...options, limit: Math.ceil(limit / 3) }),
    searchEvents({ ...options, limit: Math.ceil(limit / 3) })
  ]);

  const items = [...courses.items, ...products.items, ...events.items]
    .sort((a, b) => b.relevance - a.relevance)
    .slice(offset, offset + limit);

  return {
    items,
    total: courses.total + products.total + events.total,
    limit,
    offset,
    hasMore: offset + limit < courses.total + products.total + events.total
  };
}

/**
 * Search courses with full-text search
 */
export async function searchCourses(options: SearchOptions): Promise<SearchResults> {
  const { query = '', minPrice, maxPrice, level, limit = 20, offset = 0 } = options;

  const params: any[] = [];
  let paramIndex = 1;

  // Build the WHERE clause
  const conditions: string[] = ['is_published = true', 'deleted_at IS NULL'];

  // Full-text search with relevance ranking
  let selectClause = `
    SELECT 
      id, title, slug, description, price, image_url, 
      level, duration_hours,
      1.0 as relevance
    FROM courses
  `;

  if (query) {
    selectClause = `
      SELECT 
        id, title, slug, description, price, image_url,
        level, duration_hours,
        ts_rank(
          to_tsvector('english', title || ' ' || description),
          plainto_tsquery('english', $${paramIndex})
        ) as relevance
      FROM courses
    `;
    conditions.push(`
      to_tsvector('english', title || ' ' || description) @@ 
      plainto_tsquery('english', $${paramIndex})
    `);
    params.push(query);
    paramIndex++;
  }

  if (minPrice !== undefined) {
    conditions.push(`price >= $${paramIndex}`);
    params.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined) {
    conditions.push(`price <= $${paramIndex}`);
    params.push(maxPrice);
    paramIndex++;
  }

  if (level) {
    conditions.push(`level = $${paramIndex}`);
    params.push(level);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as count
    FROM courses
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Get paginated results
  const searchQuery = `
    ${selectClause}
    ${whereClause}
    ORDER BY relevance DESC, title ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await pool.query(searchQuery, params);

  const items: CourseResult[] = result.rows.map(row => ({
    type: 'course' as const,
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    price: parseFloat(row.price),
    imageUrl: row.image_url,
    level: row.level,
    durationHours: row.duration_hours,
    relevance: parseFloat(row.relevance)
  }));

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + limit < total
  };
}

/**
 * Search digital products with full-text search
 */
export async function searchProducts(options: SearchOptions): Promise<SearchResults> {
  const { query = '', minPrice, maxPrice, productType, limit = 20, offset = 0 } = options;

  const params: any[] = [];
  let paramIndex = 1;

  // Build the WHERE clause
  const conditions: string[] = ['is_published = true'];

  // Full-text search with relevance ranking
  let selectClause = `
    SELECT 
      id, title, slug, description, price, image_url,
      product_type, file_size_mb,
      1.0 as relevance
    FROM digital_products
  `;

  if (query) {
    selectClause = `
      SELECT 
        id, title, slug, description, price, image_url,
        product_type, file_size_mb,
        ts_rank(
          to_tsvector('english', title || ' ' || description),
          plainto_tsquery('english', $${paramIndex})
        ) as relevance
      FROM digital_products
    `;
    conditions.push(`
      to_tsvector('english', title || ' ' || description) @@ 
      plainto_tsquery('english', $${paramIndex})
    `);
    params.push(query);
    paramIndex++;
  }

  if (minPrice !== undefined) {
    conditions.push(`price >= $${paramIndex}`);
    params.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined) {
    conditions.push(`price <= $${paramIndex}`);
    params.push(maxPrice);
    paramIndex++;
  }

  if (productType) {
    conditions.push(`product_type = $${paramIndex}`);
    params.push(productType);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as count
    FROM digital_products
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Get paginated results
  const searchQuery = `
    ${selectClause}
    ${whereClause}
    ORDER BY relevance DESC, title ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await pool.query(searchQuery, params);

  const items: ProductResult[] = result.rows.map(row => ({
    type: 'product' as const,
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    price: parseFloat(row.price),
    imageUrl: row.image_url,
    productType: row.product_type,
    fileSizeMb: row.file_size_mb ? parseFloat(row.file_size_mb) : null,
    relevance: parseFloat(row.relevance)
  }));

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + limit < total
  };
}

/**
 * Search events with full-text search
 */
export async function searchEvents(options: SearchOptions): Promise<SearchResults> {
  const { query = '', minPrice, maxPrice, city, limit = 20, offset = 0 } = options;

  const params: any[] = [];
  let paramIndex = 1;

  // Build the WHERE clause
  const conditions: string[] = ['is_published = true', 'event_date >= NOW()'];

  // Full-text search with relevance ranking
  let selectClause = `
    SELECT 
      id, title, slug, description, price, image_url,
      venue_city, venue_country, event_date, duration_hours, available_spots,
      1.0 as relevance
    FROM events
  `;

  if (query) {
    selectClause = `
      SELECT 
        id, title, slug, description, price, image_url,
        venue_city, venue_country, event_date, duration_hours, available_spots,
        ts_rank(
          to_tsvector('english', title || ' ' || description || ' ' || venue_city || ' ' || venue_country),
          plainto_tsquery('english', $${paramIndex})
        ) as relevance
      FROM events
    `;
    conditions.push(`
      to_tsvector('english', title || ' ' || description || ' ' || venue_city || ' ' || venue_country) @@ 
      plainto_tsquery('english', $${paramIndex})
    `);
    params.push(query);
    paramIndex++;
  }

  if (minPrice !== undefined) {
    conditions.push(`price >= $${paramIndex}`);
    params.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined) {
    conditions.push(`price <= $${paramIndex}`);
    params.push(maxPrice);
    paramIndex++;
  }

  if (city) {
    conditions.push(`venue_city ILIKE $${paramIndex}`);
    params.push(`%${city}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as count
    FROM events
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Get paginated results
  const searchQuery = `
    ${selectClause}
    ${whereClause}
    ORDER BY relevance DESC, event_date ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await pool.query(searchQuery, params);

  const items: EventResult[] = result.rows.map(row => ({
    type: 'event' as const,
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    price: parseFloat(row.price),
    imageUrl: row.image_url,
    venueCity: row.venue_city,
    venueCountry: row.venue_country,
    eventDate: new Date(row.event_date),
    durationHours: row.duration_hours,
    availableSpots: row.available_spots,
    relevance: parseFloat(row.relevance)
  }));

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + limit < total
  };
}

/**
 * Get autocomplete suggestions based on partial query
 */
export async function getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const result = await pool.query(
    `
    SELECT DISTINCT title
    FROM (
      SELECT title FROM courses WHERE title ILIKE $1 AND is_published = true AND deleted_at IS NULL
      UNION
      SELECT title FROM digital_products WHERE title ILIKE $1 AND is_published = true
      UNION
      SELECT title FROM events WHERE title ILIKE $1 AND is_published = true
    ) AS suggestions
    LIMIT $2
    `,
    [`%${query}%`, limit]
  );

  return result.rows.map(row => row.title);
}

/**
 * Get popular search terms (based on most common words in titles)
 */
export async function getPopularSearches(limit: number = 10): Promise<string[]> {
  const result = await pool.query(
    `
    SELECT DISTINCT LOWER(level) as term
    FROM courses
    WHERE level IS NOT NULL AND is_published = true AND deleted_at IS NULL
    UNION
    SELECT DISTINCT LOWER(product_type::text) as term
    FROM digital_products
    WHERE is_published = true
    LIMIT $1
    `,
    [limit]
  );

  return result.rows.map(row => row.term);
}

/**
 * Get available levels for filtering
 */
export async function getLevels(): Promise<string[]> {
  const result = await pool.query(
    `
    SELECT DISTINCT level
    FROM courses
    WHERE level IS NOT NULL AND is_published = true AND deleted_at IS NULL
    ORDER BY level
    `
  );

  return result.rows.map(row => row.level);
}

/**
 * Get available product types for filtering
 */
export async function getProductTypes(): Promise<string[]> {
  const result = await pool.query(
    `
    SELECT DISTINCT product_type::text as type
    FROM digital_products
    WHERE is_published = true
    ORDER BY type
    `
  );

  return result.rows.map(row => row.type);
}

/**
 * Get price range across all content types or specific type
 */
export async function getPriceRange(type?: 'course' | 'product' | 'event'): Promise<{ min: number; max: number }> {
  let query = '';
  
  if (!type) {
    query = `
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM (
        SELECT price FROM courses WHERE is_published = true AND deleted_at IS NULL
        UNION ALL
        SELECT price FROM digital_products WHERE is_published = true
        UNION ALL
        SELECT price FROM events WHERE is_published = true
      ) AS all_prices
    `;
  } else if (type === 'course') {
    query = `
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM courses
      WHERE is_published = true AND deleted_at IS NULL
    `;
  } else if (type === 'product') {
    query = `
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM digital_products
      WHERE is_published = true
    `;
  } else {
    query = `
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM events
      WHERE is_published = true
    `;
  }

  const result = await pool.query(query);
  const row = result.rows[0];

  return {
    min: row.min_price ? parseFloat(row.min_price) : 0,
    max: row.max_price ? parseFloat(row.max_price) : 0
  };
}
