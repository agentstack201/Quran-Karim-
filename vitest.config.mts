import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Test configuration.
 *
 * Two environments, chosen per file rather than globally: pure logic runs in
 * Node (fast, no DOM setup cost), and anything touching browser APIs opts into
 * jsdom with a `@vitest-environment` docblock.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` throws on import outside a React Server Component, which
      // is exactly what it is for. Under test there is no RSC graph, so it
      // resolves to the package's own no-op entry — the same file Next resolves
      // in a server environment.
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['src/utils/**', 'src/services/**', 'src/constants/**'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
