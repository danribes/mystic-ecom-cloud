/**
 * Site Configuration (T233)
 *
 * Centralized configuration for site metadata, organization details, and social media profiles.
 * Used for generating Schema.org Organization structured data and site-wide metadata.
 *
 * @see https://schema.org/Organization
 */

import type { OrganizationSchema } from './structuredData';

/**
 * Site metadata configuration
 */
export const siteConfig = {
  /**
   * Site name (also used as Organization name)
   */
  name: 'Mystic Ecommerce',

  /**
   * Site description
   */
  description: 'Your premier destination for spiritual growth, mindfulness, and holistic wellness. Discover transformative courses, events, and products.',

  /**
   * Site URL (should match astro.config.mjs site)
   * Uses environment variable or defaults to Cloudflare Pages URL
   */
  url: import.meta.env.PUBLIC_SITE_URL || 'https://mystic-ecom-cloud.pages.dev',

  /**
   * Organization logo (relative path - will be combined with site URL)
   * Should be a high-quality image
   */
  logo: '/images/logo.png',

  /**
   * Contact email
   */
  email: 'contact@mystic-ecom.com',

  /**
   * Contact telephone (optional)
   */
  telephone: undefined,

  /**
   * Organization founding date (ISO 8601 format)
   */
  foundingDate: '2024-01-01',

  /**
   * Founder information (optional)
   */
  founder: {
    '@type': 'Person' as const,
    name: 'Mystic Ecommerce Team',
  },

  /**
   * Organization address (optional)
   */
  address: undefined,

  /**
   * Social media profiles
   * These appear in the Organization schema as sameAs property
   */
  socialMedia: {
    facebook: 'https://facebook.com/mysticecommerce',
    twitter: 'https://twitter.com/mysticecommerce',
    instagram: 'https://instagram.com/mysticecommerce',
    linkedin: 'https://linkedin.com/company/mysticecommerce',
    youtube: 'https://youtube.com/@mysticecommerce',
  },

  /**
   * Default SEO metadata
   */
  defaultSeo: {
    title: 'Mystic Ecommerce - Spiritual Growth & Wellness',
    description: 'Your premier destination for spiritual growth, mindfulness, and holistic wellness. Discover transformative courses, events, and products.',
    keywords: 'spirituality, meditation, mindfulness, wellness, courses, events, spiritual growth, yoga, holistic health, spiritual awakening',
    ogImage: '/images/og-default.svg',
  },
} as const;

/**
 * Get Organization schema data
 *
 * Converts site configuration to Schema.org Organization format
 *
 * @returns Organization schema data (without @context and @type)
 *
 * @example
 * ```typescript
 * import { getOrganizationData } from '@/lib/siteConfig';
 * import { generateOrganizationSchema } from '@/lib/structuredData';
 *
 * const schema = generateOrganizationSchema(getOrganizationData());
 * ```
 */
export function getOrganizationData(): Omit<OrganizationSchema, '@type'> {
  // Collect all social media URLs into an array
  const sameAs = Object.values(siteConfig.socialMedia).filter(Boolean);

  // Construct absolute logo URL from relative path
  const absoluteLogoUrl = siteConfig.logo.startsWith('http')
    ? siteConfig.logo
    : `${siteConfig.url}${siteConfig.logo}`;

  return {
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteLogoUrl,
    description: siteConfig.description,
    email: siteConfig.email,
    telephone: siteConfig.telephone,
    address: siteConfig.address,
    sameAs,
    foundingDate: siteConfig.foundingDate,
    founder: siteConfig.founder,
  };
}

/**
 * Get all social media profile URLs as an array
 *
 * @returns Array of social media profile URLs
 */
export function getSocialMediaUrls(): string[] {
  return Object.values(siteConfig.socialMedia).filter(Boolean);
}

/**
 * Get a specific social media profile URL
 *
 * @param platform - Social media platform name
 * @returns URL or undefined if not configured
 */
export function getSocialMediaUrl(platform: keyof typeof siteConfig.socialMedia): string | undefined {
  return siteConfig.socialMedia[platform];
}

/**
 * Check if a social media platform is configured
 *
 * @param platform - Social media platform name
 * @returns True if configured
 */
export function hasSocialMedia(platform: keyof typeof siteConfig.socialMedia): boolean {
  return Boolean(siteConfig.socialMedia[platform]);
}
