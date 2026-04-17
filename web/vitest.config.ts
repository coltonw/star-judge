import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      $lib: resolve('./src/lib'),
      '$app/state': resolve('./src/__mocks__/app-state.ts'),
      '$app/navigation': resolve('./src/__mocks__/app-navigation.ts'),
    },
    // Use browser exports — prevents Svelte from resolving to its SSR/server bundle
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
