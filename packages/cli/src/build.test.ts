import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildIndex, checkCompiledSize, checkSlugsKept, compileProblem, stable, writeBuild } from './build';
import { loadProblem } from './load';

const src = () => loadProblem(fileURLToPath(new URL('../fixtures/good/hello', import.meta.url))).source!;

describe('compileProblem', () => {
  it('keeps starters, tests, readmes and hints, and drops solutions', () => {
    const p = compileProblem(src());
    expect(p.slug).toBe('hello');
    expect(p.version).toMatch(/^[0-9a-f]{12}$/);
    expect(p.stages[0]).toEqual({
      id: 'greet',
      title: 'Greet',
      readme: expect.stringContaining('Return "Hello, <name>!".'),
      hints: expect.stringContaining('Use a template string.'),
      languages: { javascript: { starter: { 'greet.js': expect.any(String) }, tests: { 'greet.test.js': expect.any(String) } } },
    });
    expect(p.stages[1]).not.toHaveProperty('hints');
    expect(JSON.stringify(p)).not.toContain('solution');
    expect(JSON.stringify(p)).not.toContain('Hello, ${name}!`;\n}');
  });

  it('only includes listed languages', () => {
    expect(Object.keys(compileProblem(src()).stages[0].languages)).toEqual(['javascript']);
  });

  it('version is stable and changes with content', () => {
    const a = compileProblem(src()).version;
    expect(compileProblem(src()).version).toBe(a);
    const changed = src();
    changed.stages[0].readme += '!';
    expect(compileProblem(changed).version).not.toBe(a);
  });
});

describe('stable', () => {
  it('sorts object keys recursively', () => {
    expect(JSON.stringify(stable({ b: 1, a: { d: 1, c: [{ z: 1, y: 2 }] } }))).toBe('{"a":{"c":[{"y":2,"z":1}],"d":1},"b":1}');
  });
});

describe('index and output', () => {
  it('builds a sorted index', () => {
    const idx = buildIndex([compileProblem(src())], new Date('2026-09-30T00:00:00Z'));
    expect(idx).toEqual({
      generatedAt: '2026-09-30T00:00:00.000Z',
      problems: [{
        slug: 'hello', version: expect.stringMatching(/^[0-9a-f]{12}$/), title: 'Hello', summary: 'Greets people.', difficulty: 'easy',
        kind: 'implement', patterns: [], tags: [], languages: ['javascript'], stages: [{ id: 'greet', title: 'Greet' }, { id: 'shout', title: 'Shout' }],
      }],
    });
  });

  it('writes index.json and v/<version>/<slug>.json', () => {
    const out = mkdtempSync(path.join(os.tmpdir(), 'build-'));
    const p = compileProblem(src());
    const written = writeBuild(out, [p]);
    expect(written.sort()).toEqual(['index.json', `v/${p.version}/hello.json`]);
    expect(JSON.parse(readFileSync(path.join(out, 'v', p.version, 'hello.json'), 'utf8'))).toEqual(stable(p));
  });
});

describe('limits and permanence', () => {
  it('rejects a compiled problem over 200 KB', () => {
    const p = compileProblem(src());
    p.stages[0].readme = 'x'.repeat(205_000);
    expect(checkCompiledSize(p)).toEqual([{ problem: 'hello', message: expect.stringMatching(/^compiled problem is \d+ KB; the limit is 200 KB$/) }]);
  });

  it('rejects removing a published slug', () => {
    const published = { generatedAt: '', problems: [{ slug: 'hello' }, { slug: 'gone' }] } as never;
    expect(checkSlugsKept(published, ['hello'])).toEqual([{ problem: 'gone', message: 'published problem "gone" was removed or renamed; slugs are permanent' }]);
  });
});
