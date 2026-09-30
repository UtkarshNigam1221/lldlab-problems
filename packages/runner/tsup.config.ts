import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/worker.ts'],
  format: ['esm'],
  dts: { entry: 'src/index.ts' },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  // Keep the pyodide/yaegi CDN imports as runtime imports.
  external: [/^https:\/\//],
});
