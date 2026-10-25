import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'absolute-open-graph-urls',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          const base = process.env.OG_BASE?.replace(/\/?$/, '/') ?? '';
          const escaped = base.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
          return html.replaceAll('%OG_BASE%', escaped);
        },
      },
    },
  ],
});
