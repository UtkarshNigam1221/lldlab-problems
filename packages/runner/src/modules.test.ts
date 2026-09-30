import { describe, expect, it } from 'vitest';
import { createRequire, resolveImport } from './modules';

describe('resolveImport', () => {
  const files = { 'src/a.ts': '', 'src/b.js': '', 'src/lib/index.ts': '', 'tests/x.test.ts': '' };

  it.each([
    ['src/b.js', './a', 'src/a.ts'],
    ['src/b.js', './a.ts', 'src/a.ts'],
    ['src/a.ts', './lib', 'src/lib/index.ts'],
    ['tests/x.test.ts', '../src/b', 'src/b.js'],
  ])('from %s import %s -> %s', (from, spec, want) => {
    expect(resolveImport(files, from, spec)).toBe(want);
  });

  it('rejects package imports', () => {
    expect(() => resolveImport(files, 'src/a.ts', 'lodash')).toThrow(
      'src/a.ts: cannot import "lodash": packages aren\'t available, use a relative path',
    );
  });

  it('rejects URLs', () => {
    expect(() => resolveImport(files, 'src/a.ts', 'https://evil.test/x.js')).toThrow("packages aren't available");
  });

  it('rejects imports that escape the workspace', () => {
    expect(() => resolveImport(files, 'src/a.ts', '../../x')).toThrow('src/a.ts: import "../../x" leaves the workspace');
  });

  it('reports missing files', () => {
    expect(() => resolveImport(files, 'src/a.ts', './nope')).toThrow('src/a.ts: cannot find "./nope"');
  });
});

describe('createRequire', () => {
  it('runs each module once and shares exports', () => {
    const files = {
      'counter.js': 'export let n = 0; export function inc() { n++; return n; }',
      'a.js': "import { inc } from './counter'; export const a = inc();",
      'b.js': "import { inc } from './counter'; export const b = inc();",
    };
    const req = createRequire(files, {});
    expect((req('a.js') as { a: number }).a).toBe(1);
    expect((req('b.js') as { b: number }).b).toBe(2);
  });

  it('passes globals to every module', () => {
    const req = createRequire({ 'x.js': 'export const v = answer;' }, { answer: 42 });
    expect((req('x.js') as { v: number }).v).toBe(42);
  });

  it('names the file in syntax errors', () => {
    const req = createRequire({ 'bad.ts': 'export const = ;' }, {});
    expect(() => req('bad.ts')).toThrow(/^bad\.ts: syntax error/);
  });
});
