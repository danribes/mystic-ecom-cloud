/**
 * Events I18n Service (T169)
 *
 * Locale-aware event retrieval functions that return events with content
 * in the user's preferred language (English or Spanish).
 *
 * Uses SQL COALESCE for automatic fallback to English when Spanish
 * translations are missing.
 *
 * @see T167 - Multilingual schema (added *_es columns)
 * @see T169 - Migration 005 (added base long_description column)
 */

import pool from './db';
import { getSQLCoalesce } from './i18nContent';

export type Locale = 'en' | 'es';

/**
 * Localized Event interface
 * Contains event data in the requested language with fallback to English
 */
export interface LocalizedEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription?: string;
  price: number;
  eventDate: Date;
  durationHours: number;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueCountry: string;
  venueLat?: number;
  venueLng?: number;
  capacity: number;
  availableSpots: number;
  imageUrl?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Aggregated stats
  bookingCount?: number;
}

/**
 * Filters for querying localized events
 */
export interface GetLocalizedEventsFilters {
  city?: string;
  country?: string;
  startDate?: Date;
  endDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  minAvailableSpots?: number;
  limit?: number;
  offset?: number;
  locale?: Locale;
}

/**
 * Get a single event by ID with localized content
 *
 * @param id - Event UUID
 * @param locale - Language code ('en' or 'es')
 * @returns Localized event or null if not found
 *
 * @example
 * const event = await getLocalizedEventById('uuid-here', 'es');
 * console.log(event.title); // Spanish title or English fallback
 */
export async function getLocalizedEventById(
  id: string,
  locale: Locale = 'en'
): Promise<LocalizedEvent | null> {
  const query = `
    SELECT
      e.id,
      e.slug,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.title_es
          ELSE NULL
        END,
        ''
      ), e.title) as title,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.description_es
          ELSE NULL
        END,
        ''
      ), e.description) as description,
      COALESCE(
        CASE
          WHEN '${locale}' = 'es' AND e.long_description_es IS NOT NULL AND e.long_description_es != ''
          THEN e.long_description_es
          ELSE e.long_description
        END,
        e.description
      ) as long_description,
      e.price,
      e.event_date,
      e.duration_hours,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.venue_name_es
          ELSE NULL
        END,
        ''
      ), e.venue_name) as venue_name,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.venue_address_es
          ELSE NULL
        END,
        ''
      ), e.venue_address) as venue_address,
      e.venue_city,
      e.venue_country,
      e.venue_lat,
      e.venue_lng,
      e.capacity,
      e.available_spots,
      e.image_url,
      e.is_published,
      e.created_at,
      e.updated_at,
      COUNT(b.id)::INTEGER as booking_count
    FROM events e
    LEFT JOIN bookings b ON e.id = b.event_id AND b.status = 'confirmed'
    WHERE e.id = $1
    GROUP BY e.id
  `;

  try {
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      longDescription: row.long_description,
      price: parseFloat(row.price),
      eventDate: new Date(row.event_date),
      durationHours: row.duration_hours,
      venueName: row.venue_name,
      venueAddress: row.venue_address,
      venueCity: row.venue_city,
      venueCountry: row.venue_country,
      venueLat: row.venue_lat ? parseFloat(row.venue_lat) : undefined,
      venueLng: row.venue_lng ? parseFloat(row.venue_lng) : undefined,
      capacity: row.capacity,
      availableSpots: row.available_spots,
      imageUrl: row.image_url,
      isPublished: row.is_published,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      bookingCount: row.booking_count || 0,
    };
  } catch (error) {
    console.error('[T169] Error fetching localized event:', error);
    throw error;
  }
}

/**
 * Get a single event by slug with localized content
 * Only returns published events
 *
 * @param slug - Event URL slug
 * @param locale - Language code ('en' or 'es')
 * @returns Localized event or null if not found/unpublished
 *
 * @example
 * const event = await getLocalizedEventBySlug('mindfulness-retreat', 'es');
 */
export async function getLocalizedEventBySlug(
  slug: string,
  locale: Locale = 'en'
): Promise<LocalizedEvent | null> {
  const query = `
    SELECT
      e.id,
      e.slug,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.title_es
          ELSE NULL
        END,
        ''
      ), e.title) as title,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.description_es
          ELSE NULL
        END,
        ''
      ), e.description) as description,
      COALESCE(
        CASE
          WHEN '${locale}' = 'es' AND e.long_description_es IS NOT NULL AND e.long_description_es != ''
          THEN e.long_description_es
          ELSE e.long_description
        END,
        e.description
      ) as long_description,
      e.price,
      e.event_date,
      e.duration_hours,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.venue_name_es
          ELSE NULL
        END,
        ''
      ), e.venue_name) as venue_name,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.venue_address_es
          ELSE NULL
        END,
        ''
      ), e.venue_address) as venue_address,
      e.venue_city,
      e.venue_country,
      e.venue_lat,
      e.venue_lng,
      e.capacity,
      e.available_spots,
      e.image_url,
      e.is_published,
      e.created_at,
      e.updated_at,
      COUNT(b.id)::INTEGER as booking_count
    FROM events e
    LEFT JOIN bookings b ON e.id = b.event_id AND b.status = 'confirmed'
    WHERE e.slug = $1 AND e.is_published = true
    GROUP BY e.id
  `;

  try {
    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      longDescription: row.long_description,
      price: parseFloat(row.price),
      eventDate: new Date(row.event_date),
      durationHours: row.duration_hours,
      venueName: row.venue_name,
      venueAddress: row.venue_address,
      venueCity: row.venue_city,
      venueCountry: row.venue_country,
      venueLat: row.venue_lat ? parseFloat(row.venue_lat) : undefined,
      venueLng: row.venue_lng ? parseFloat(row.venue_lng) : undefined,
      capacity: row.capacity,
      availableSpots: row.available_spots,
      imageUrl: row.image_url,
      isPublished: row.is_published,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      bookingCount: row.booking_count || 0,
    };
  } catch (error) {
    console.error('[T169] Error fetching localized event by slug:', error);
    throw error;
  }
}

/**
 * Get multiple events with filters and localized content
 * Supports pagination, filtering, and searching
 *
 * @param filters - Optional filters for events
 * @returns Object with items, total count, and hasMore flag
 *
 * @example
 * const result = await getLocalizedEvents({
 *   locale: 'es',
 *   city: 'Barcelona',
 *   startDate: new Date('2025-01-01'),
 *   limit: 12,
 *   offset: 0
 * });
 */
export async function getLocalizedEvents(
  filters: GetLocalizedEventsFilters = {}
): Promise<{ items: LocalizedEvent[]; total: number; hasMore: boolean }> {
  const {
    city,
    country,
    startDate,
    endDate,
    minPrice,
    maxPrice,
    search,
    minAvailableSpots,
    limit = 12,
    offset = 0,
    locale = 'en',
  } = filters;

  let query = `
    SELECT
      e.id,
      e.slug,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.title_es
          ELSE NULL
        END,
        ''
      ), e.title) as title,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.description_es
          ELSE NULL
        END,
        ''
      ), e.description) as description,
      e.price,
      e.event_date,
      e.duration_hours,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.venue_name_es
          ELSE NULL
        END,
        ''
      ), e.venue_name) as venue_name,
      COALESCE(NULLIF(
        CASE
          WHEN '${locale}' = 'es' THEN e.venue_address_es
          ELSE NULL
        END,
        ''
      ), e.venue_address) as venue_address,
      e.venue_city,
      e.venue_country,
      e.venue_lat,
      e.venue_lng,
      e.capacity,
      e.available_spots,
      e.image_url,
      e.is_published,
      e.created_at,
      e.updated_at,
      COUNT(b.id)::INTEGER as booking_count
    FROM events e
    LEFT JOIN bookings b ON e.id = b.event_id AND b.status = 'confirmed'
    WHERE e.is_published = true
  `;

  const params: any[] = [];
  let paramIndex = 1;

  // City filter
  if (city) {
    query += ` AND e.venue_city = $${paramIndex}`;
    params.push(city);
    paramIndex++;
  }

  // Country filter
  if (country) {
    query += ` AND e.venue_country = $${paramIndex}`;
    params.push(country);
    paramIndex++;
  }

  // Start date filter (events on or after this date)
  if (startDate) {
    query += ` AND e.event_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  // End date filter (events on or before this date)
  if (endDate) {
    query += ` AND e.event_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  // Price range filter
  if (minPrice !== undefined) {
    query += ` AND e.price >= $${paramIndex}`;
    params.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined) {
    query += ` AND e.price <= $${paramIndex}`;
    params.push(maxPrice);
    paramIndex++;
  }

  // Minimum available spots filter
  if (minAvailableSpots !== undefined) {
    query += ` AND e.available_spots >= $${paramIndex}`;
    params.push(minAvailableSpots);
    paramIndex++;
  }

  // Search filter (searches in both English and Spanish fields)
  if (search) {
    query += ` AND (
      e.title ILIKE $${paramIndex} OR
      e.description ILIKE $${paramIndex} OR
      e.title_es ILIKE $${paramIndex} OR
      e.description_es ILIKE $${paramIndex} OR
      e.venue_name ILIKE $${paramIndex} OR
      e.venue_city ILIKE $${paramIndex}
    )`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Group by and order
  query += ` GROUP BY e.id ORDER BY e.event_date ASC`;

  // Pagination - fetch limit + 1 to determine if more results exist
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit + 1, offset);

  try {
    const result = await pool.query(query, params);
    const hasMore = result.rows.length > limit;
    const items = (hasMore ? result.rows.slice(0, limit) : result.rows).map(
      (row): LocalizedEvent => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        price: parseFloat(row.price),
        eventDate: new Date(row.event_date),
        durationHours: row.duration_hours,
        venueName: row.venue_name,
        venueAddress: row.venue_address,
        venueCity: row.venue_city,
        venueCountry: row.venue_country,
        venueLat: row.venue_lat ? parseFloat(row.venue_lat) : undefined,
        venueLng: row.venue_lng ? parseFloat(row.venue_lng) : undefined,
        capacity: row.capacity,
        availableSpots: row.available_spots,
        imageUrl: row.image_url,
        isPublished: row.is_published,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        bookingCount: row.booking_count || 0,
      })
    );

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT e.id)::INTEGER as total
      FROM events e
      WHERE e.is_published = true
      ${city ? `AND e.venue_city = '${city}'` : ''}
      ${country ? `AND e.venue_country = '${country}'` : ''}
      ${startDate ? `AND e.event_date >= '${startDate.toISOString()}'` : ''}
      ${endDate ? `AND e.event_date <= '${endDate.toISOString()}'` : ''}
      ${minPrice !== undefined ? `AND e.price >= ${minPrice}` : ''}
      ${maxPrice !== undefined ? `AND e.price <= ${maxPrice}` : ''}
      ${minAvailableSpots !== undefined ? `AND e.available_spots >= ${minAvailableSpots}` : ''}
      ${search ? `AND (e.title ILIKE '%${search}%' OR e.description ILIKE '%${search}%' OR e.title_es ILIKE '%${search}%' OR e.description_es ILIKE '%${search}%' OR e.venue_name ILIKE '%${search}%' OR e.venue_city ILIKE '%${search}%')` : ''}
    `;

    const countResult = await pool.query(countQuery);
    const total = countResult.rows[0]?.total || 0;

    return {
      items,
      total,
      hasMore,
    };
  } catch (error) {
    console.error('[T169] Error fetching localized events:', error);
    throw error;
  }
}
