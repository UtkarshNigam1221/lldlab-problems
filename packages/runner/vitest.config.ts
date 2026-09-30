import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['lldlab-source'] },
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 120_000 },
});
