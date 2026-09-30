import { describe, expect, it } from 'vitest';
import { executeJs } from './js';

const counter = {
  'src/counter.js': 'export class Counter { constructor() { this.n = 0; } inc() { return ++this.n; } }',
};

describe('executeJs', () => {
  it('runs tests across files and tags stage and file', async () => {
    const out = await executeJs({
      files: counter,
      tests: [
        { stage: 'basic', files: { 'counter.test.js': "import { Counter } from '../src/counter';\ntest('inc', () => assertEqual(new Counter().inc(), 1));" } },
        { stage: 'more', files: { 'twice.test.js': "import { Counter } from '../src/counter';\ntest('twice', () => { const c = new Counter(); c.inc(); assertEqual(c.inc(), 3); });" } },
      ],
    });
    expect(out.error).toBeUndefined();
    expect(out.results.map(({ name, stage, file, passed }) => ({ name, stage, file, passed }))).toEqual([
      { name: 'inc', stage: 'basic', file: 'counter.test.js', passed: true },
      { name: 'twice', stage: 'more', file: 'twice.test.js', passed: false },
    ]);
    expect(out.results[1].error).toBe('expected 3, got 2');
  });

  it('strips TypeScript types and resolves .ts files', async () => {
    const out = await executeJs({
      files: { 'src/add.ts': 'export function add(a: number, b: number): number { return a + b; }', 'src/index.ts': "export { add } from './add';" },
      tests: [{ stage: 's', files: { 'add.test.ts': "import { add } from '../src';\ntest('adds', () => assertEqual(add(2, 3) as number, 5));" } }],
    });
    expect(out.results.map((r) => r.passed)).toEqual([true]);
  });

  it('awaits async tests', async () => {
    const out = await executeJs({
      files: {},
      tests: [{ stage: 's', files: { 'a.test.js': "test('async', async () => { await Promise.resolve(); assertEqual([1], [1]); });" } }],
    });
    expect(out.results[0].passed).toBe(true);
  });

  it('reports a thrown non-assertion error with its type', async () => {
    const out = await executeJs({
      files: { 'x.js': 'export function boom() { return null.x; }' },
      tests: [{ stage: 's', files: { 'x.test.js': "import { boom } from '../x';\ntest('boom', () => boom());" } }],
    });
    expect(out.results[0].error).toMatch(/^TypeError: /);
  });

  it('captures console output', async () => {
    const out = await executeJs({ files: {}, tests: [{ stage: 's', files: { 'a.test.js': "console.log('hi', { a: 1 }); test('t', () => {});" } }] });
    expect(out.stdout).toBe('hi {"a":1}\n');
  });

  it('returns a load error without results', async () => {
    const out = await executeJs({ files: {}, tests: [{ stage: 's', files: { 'a.test.js': "import { x } from '../missing';" } }] });
    expect(out.results).toEqual([]);
    expect(out.error).toBe('ModuleError: tests/a.test.js: cannot find "../missing"');
  });

  it('blocks dynamic import of URLs', async () => {
    const out = await executeJs({
      files: { 'x.js': "export const load = () => import('https://evil.test/x.js');" },
      tests: [{ stage: 's', files: { 'x.test.js': "import { load } from '../x';\ntest('net', async () => { await load(); });" } }],
    });
    expect(out.results[0].passed).toBe(false);
    expect(out.results[0].error).toContain("packages aren't available");
  });

  it('rejects user files under tests/', async () => {
    const out = await executeJs({ files: { 'tests/fake.test.js': '' }, tests: [] });
    expect(out.error).toBe("tests/fake.test.js: the tests/ folder is reserved for the problem's tests");
  });

  it('rejects two stages with the same test file name instead of running only one', async () => {
    const out = await executeJs({ files: {}, tests: [{ stage: 'a', files: { 't.test.js': "test('a', () => {});" } }, { stage: 'b', files: { 't.test.js': "test('b', () => {});" } }] });
    expect(out.error).toBe('tests/t.test.js is defined by stages a and b; test file names must be unique');
  });
});

