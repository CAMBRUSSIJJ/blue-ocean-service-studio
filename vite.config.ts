import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// Gera dist/stats.html somente quando ANALYZE=true (ex: ANALYZE=true npm run build)
const analyze = process.env.ANALYZE === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(analyze
      ? [visualizer({ filename: 'dist/stats.html', open: false, gzipSize: true, brotliSize: true })]
      : []),
  ],
  base: './',
});
