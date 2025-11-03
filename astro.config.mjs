// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://mystic-ecom.netlify.app', // Update with your Netlify URL
  output: 'server',
  adapter: netlify({
    edgeMiddleware: false, // Disable edge middleware to use regular functions
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
