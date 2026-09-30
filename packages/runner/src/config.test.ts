import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PYODIDE_VERSION, YAEGI_BASE_URL } from './config';

const json = (rel: string) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'));

describe('config', () => {
  it('PYODIDE_VERSION matches the installed pyodide', () => {
    expect(PYODIDE_VERSION).toBe(json('../../../node_modules/pyodide/package.json').version);
  });

  it('YAEGI_BASE_URL pins the runtime package version', () => {
    const pkg = json('../../yaegi-runtime/npm/package.json');
    expect(YAEGI_BASE_URL).toBe(`https://cdn.jsdelivr.net/npm/${pkg.name}@${pkg.version}/`);
  });
});
