import { describe, expect, it } from 'vitest';
import { loadRuntimes } from './runtimes';

const yaegiDir = process.env.LLDLAB_YAEGI_DIR;

describe('loadRuntimes', () => {
  it('loads only the requested languages', async () => {
    const rt = await loadRuntimes(['javascript']);
    expect(Object.keys(rt)).toEqual(['javascript']);
  });

  it('runs Python from the pyodide npm package', async () => {
    const rt = await loadRuntimes(['python']);
    const out = await rt.python!({ files: { 'm.py': 'X = 3\n' }, tests: [{ stage: 's', files: { 'test_m.py': 'import m\ntest("x", lambda: assertEqual(m.X, 3))\n' } }] });
    expect(out.results.map((r) => r.passed)).toEqual([true]);
  });

  it.skipIf(!yaegiDir)('runs Go from a local yaegi build', async () => {
    const rt = await loadRuntimes(['go'], { yaegiDir });
    const out = await rt.go!({
      files: { 'spot/spot.go': 'package spot\n\nfunc N() int { return 4 }\n' },
      tests: [{ stage: 's', files: { 'spot_test.go': 'package main\n\nimport "app/spot"\n\nfunc lldlabTests() {\n\ttest("n", func() { assertEqual(spot.N(), 4) })\n}\n' } }],
    });
    expect(out.error).toBeUndefined();
    expect(out.results.map((r) => r.passed)).toEqual([true]);
  });
});
