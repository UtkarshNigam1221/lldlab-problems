import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['lldlab-source'] },
  // Node test environments resolve through Vite's SSR resolver, which only reads ssr.resolve.conditions.
  ssr: { resolve: { conditions: ['lldlab-source'] } },
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 120_000 },
});
