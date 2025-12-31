// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

// Cloudflare Pages Configuration
// https://astro.build/config
export default defineConfig({
  // Use CF_PAGES_URL for automatic URL detection, or fallback to Pages subdomain
  site: process.env.CF_PAGES_URL || 'https://mystic-ecom.pages.dev',
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
  }),
  integrations: [
    tailwind({
      applyBaseStyles: false, // Keep our custom global.css
    }),
  ],
  server: {
    port: 4321,
    host: true,
  },
  vite: {
    ssr: {
      external: ['@redis/client', 'redis'],
    },
  },
});
