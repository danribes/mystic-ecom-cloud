// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Cloudflare Pages Configuration
// https://astro.build/config
export default defineConfig({
  site: 'https://mystic-international.com', // Custom domain
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
  }),
  integrations: [
    // Tailwind temporarily disabled for initial deployment
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
