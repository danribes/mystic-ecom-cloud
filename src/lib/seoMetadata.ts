/**
 * T177: SEO Metadata Helpers
 *
 * Utilities for generating SEO-optimized metadata for multilingual pages
 */

import type { Locale } from '@/i18n';
import { t } from '@/i18n';

export interface SEOMetadata {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  noindex?: boolean;
}

export interface PageSEOConfig {
  titleKey: string;
  descriptionKey: string;
  variables?: Record<string, string | number>;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
}

/**
 * Generate SEO metadata for a page using translation keys
 *
 * @param locale - Current locale
 * @param config - Page SEO configuration
 * @returns SEO metadata object
 */
export function generateSEOMetadata(
  locale: Locale,
  config: PageSEOConfig
): SEOMetadata {
  const { titleKey, descriptionKey, variables, ogImage, ogType } = config;

  return {
    title: t(locale, titleKey, variables),
    description: t(locale, descriptionKey, variables),
    ogImage,
    ogType,
  };
}

/**
 * Generate SEO title with site name
 *
 * @param pageTitle - Page-specific title
 * @param locale - Current locale
 * @returns Formatted title with site name
 */
export function generateSEOTitle(pageTitle: string, locale: Locale): string {
  const siteName = t(locale, 'seo.siteName');
  return `${pageTitle} | ${siteName}`;
}

/**
 * Truncate description to SEO-optimal length (155-160 characters)
 *
 * @param description - Full description
 * @param maxLength - Maximum length (default: 155)
 * @returns Truncated description
 */
export function truncateDescription(
  description: string,
  maxLength: number = 155
): string {
  if (description.length <= maxLength) {
    return description;
  }

  // Truncate at last complete word before maxLength
  const truncated = description.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  return lastSpace > 0
    ? `${truncated.substring(0, lastSpace)}...`
    : `${truncated}...`;
}

/**
 * Generate breadcrumb schema for SEO
 *
 * @param items - Breadcrumb items
 * @param baseUrl - Site base URL
 * @returns JSON-LD schema
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; path: string }>,
  baseUrl: string
): string {
  const itemListElement = items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: `${baseUrl}${item.path}`,
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };

  return JSON.stringify(schema);
}

/**
 * Generate organization schema for SEO
 *
 * @param locale - Current locale
 * @param baseUrl - Site base URL
 * @returns JSON-LD schema
 */
export function generateOrganizationSchema(
  locale: Locale,
  baseUrl: string
): string {
  const name = t(locale, 'seo.siteName');
  const description = t(locale, 'seo.siteDescription');

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url: baseUrl,
    logo: `${baseUrl}/images/logo.png`,
    sameAs: [
      // Add social media URLs
    ],
  };

  return JSON.stringify(schema);
}

/**
 * Generate product schema for SEO
 *
 * @param product - Product data
 * @param locale - Current locale
 * @param baseUrl - Site base URL
 * @returns JSON-LD schema
 */
export function generateProductSchema(
  product: {
    name: string;
    description: string;
    image: string;
    price: number;
    currency: string;
    sku?: string;
  },
  locale: Locale,
  baseUrl: string
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image.startsWith('http')
      ? product.image
      : `${baseUrl}${product.image}`,
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: product.currency,
      availability: 'https://schema.org/InStock',
    },
    ...(product.sku && { sku: product.sku }),
  };

  return JSON.stringify(schema);
}

/**
 * Generate course schema for SEO
 *
 * @param course - Course data
 * @param locale - Current locale
 * @param baseUrl - Site base URL
 * @returns JSON-LD schema
 */
export function generateCourseSchema(
  course: {
    name: string;
    description: string;
    image: string;
    price: number;
    currency: string;
    instructor?: string;
  },
  locale: Locale,
  baseUrl: string
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.name,
    description: course.description,
    image: course.image.startsWith('http')
      ? course.image
      : `${baseUrl}${course.image}`,
    ...(course.instructor && {
      provider: {
        '@type': 'Organization',
        name: course.instructor,
      },
    }),
    offers: {
      '@type': 'Offer',
      price: course.price.toFixed(2),
      priceCurrency: course.currency,
    },
  };

  return JSON.stringify(schema);
}

/**
 * Generate event schema for SEO
 *
 * @param event - Event data
 * @param locale - Current locale
 * @param baseUrl - Site base URL
 * @returns JSON-LD schema
 */
export function generateEventSchema(
  event: {
    name: string;
    description: string;
    startDate: Date;
    endDate?: Date;
    location: string;
    price: number;
    currency: string;
  },
  locale: Locale,
  baseUrl: string
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description,
    startDate: event.startDate.toISOString(),
    ...(event.endDate && { endDate: event.endDate.toISOString() }),
    location: {
      '@type': 'Place',
      name: event.location,
    },
    offers: {
      '@type': 'Offer',
      price: event.price.toFixed(2),
      priceCurrency: event.currency,
      availability: 'https://schema.org/InStock',
    },
  };

  return JSON.stringify(schema);
}
