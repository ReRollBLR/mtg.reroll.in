import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://mtg.reroll.in',     // used for canonical URLs / sitemap
  vite: {
    plugins: [tailwindcss()],
  },
  redirects: {
    // Optional. Map short slugs → external URLs. Each becomes a static
    // redirect page at build. Example:
    // '/chat': 'https://discord.gg/XXXX',
  },
});
