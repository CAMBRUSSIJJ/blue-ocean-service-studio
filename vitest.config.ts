import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/domain/**', 'src/services/**', 'src/runtime/client.ts', 'src/runtime/data-integrity.ts', 'src/runtime/persistence-kernel.ts'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/services/experience-profile.ts'],
    },
  },
});
