import { describe, expect, it } from 'vitest';
import { globToRegExp } from './glob';

describe('globToRegExp', () => {
  it.each([
    ['**/types.*', 'types.ts', true],
    ['**/types.*', 'src/deep/types.go', true],
    ['**/types.*', 'src/typesx', false],
    ['src/*.ts', 'src/a.ts', true],
    ['src/*.ts', 'src/x/a.ts', false],
    ['src/vehicle.ts', 'src/vehicle.ts', true],
    ['src/vehicle.ts', 'src/vehicle.tsx', false],
    ['a?.py', 'ab.py', true],
    ['a?.py', 'a/.py', false],
    ['docs/**', 'docs/a/b.md', true],
    ['a.b', 'axb', false],
  ])('%s matches %s: %s', (glob, path, want) => {
    expect(globToRegExp(glob).test(path)).toBe(want);
  });
});
