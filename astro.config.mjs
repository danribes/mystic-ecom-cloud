// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

// Cloudflare Pages Configuration
// https://astro.build/config
export default defineConfig({
  site: 'https://mystic-ecom.pages.dev', // Update with your Cloudflare Pages URL
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
