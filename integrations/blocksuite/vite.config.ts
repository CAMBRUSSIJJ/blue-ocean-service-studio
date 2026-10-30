import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/**
 * Work around a published BlockSuite 0.19.5 package typo.
 * affine-components and data-view reference CheckBoxCkeckSolidIcon,
 * while @blocksuite/icons/lit exports CheckBoxCheckSolidIcon.
 * Keep the compatibility transform scoped to those vendor modules.
 */
function blocksuite0195IconCompatibility(): Plugin {
  return {
    name: 'blocksuite-0195-checkbox-icon-compat',
    enforce: 'pre',
    transform(code, id) {
      const path = id.replaceAll('\\', '/');
      if (!/node_modules\/@blocksuite\/(?:affine-components|data-view)\//.test(path)) return null;
      if (!code.includes('CheckBoxCkeckSolidIcon')) return null;
      return { code: code.replaceAll('CheckBoxCkeckSolidIcon', 'CheckBoxCheckSolidIcon'), map: null };
    },
  };
}

import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  base: '/blocksuite/',
  plugins: [blocksuite0195IconCompatibility(), wasm(), topLevelAwait()],
  build: {
    outDir: '../../public/blocksuite',
    emptyOutDir: true,
    target: 'esnext',
    sourcemap: false,
  },
});
