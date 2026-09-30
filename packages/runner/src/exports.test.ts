import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('package exports', () => {
  it('exposes the worker entry for apps that create the Worker themselves', () => {
    expect(pkg.exports['./worker']).toEqual({ 'lldlab-source': './src/worker.ts', import: './dist/worker.js' });
  });

  it('marks the worker as having side effects so bundlers keep a bare import of it', () => {
    expect(pkg.sideEffects).toEqual(['./dist/worker.js', './src/worker.ts']);
  });
});
