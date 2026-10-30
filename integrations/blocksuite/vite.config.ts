import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  base: '/blocksuite/',
  plugins: [wasm(), topLevelAwait()],
  build: {
    outDir: '../../public/blocksuite',
    emptyOutDir: true,
    target: 'esnext',
    sourcemap: false,
  },
});
