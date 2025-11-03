/**
 * Astro Middleware Configuration
 *
 * Orchestrates all middleware in the correct order:
 * 1. i18n - Language detection and locale context
 * 2. auth - Session and user authentication
 * 3. Additional middleware as needed
 */

import { sequence } from 'astro:middleware';
import { onRequest as i18nMiddleware } from './middleware/i18n';
import { onRequest as authMiddleware } from './middleware/auth';

/**
 * Middleware execution order:
 * - i18n runs first to set locale context for all subsequent middleware
 * - auth runs second to load user session (may need locale for localized redirects)
 */
export const onRequest = sequence(
  i18nMiddleware,
  authMiddleware
);
