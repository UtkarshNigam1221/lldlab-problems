import { beforeAll, describe, expect, it } from 'vitest';
import { loadPyodide } from 'pyodide';
import { executePython, type PyodideLike } from './python';

let py: PyodideLike;
beforeAll(async () => {
  py = (await loadPyodide()) as unknown as PyodideLike;
});

const pkg = {
  'shop/__init__.py': '',
  'shop/cart.py': 'from shop.money import cents\n\nclass Cart:\n    def __init__(self):\n        self.items = []\n    def add(self, price):\n        self.items.append(cents(price))\n    def total(self):\n        return sum(self.items)\n',
  'shop/money.py': 'def cents(x):\n    return int(x)\n',
};

describe('executePython', () => {
  it('imports packages and tags stage and file', async () => {
    const out = await executePython(py, {
      files: pkg,
      tests: [
        { stage: 'basic', files: { 'test_cart.py': 'from shop.cart import Cart\n\n@test("adds")\ndef _():\n    c = Cart()\n    c.add(3)\n    assertEqual(c.total(), 3)\n' } },
        { stage: 'more', files: { 'test_more.py': 'from shop.cart import Cart\n\ntest("empty", lambda: assertEqual(Cart().total(), 1))\n' } },
      ],
    });
    expect(out.error).toBeUndefined();
    expect(out.results.map(({ name, stage, file, passed }) => ({ name, stage, file, passed }))).toEqual([
      { name: 'adds', stage: 'basic', file: 'test_cart.py', passed: true },
      { name: 'empty', stage: 'more', file: 'test_more.py', passed: false },
    ]);
    expect(out.results[1].error).toBe('AssertionError: expected 1, got 0');
  });

  it('sees edits between runs', async () => {
    const t = [{ stage: 's', files: { 'test_v.py': 'import v\ntest("v", lambda: assertEqual(v.X, 2))\n' } }];
    expect((await executePython(py, { files: { 'v.py': 'X = 1\n' }, tests: t })).results[0].passed).toBe(false);
    expect((await executePython(py, { files: { 'v.py': 'X = 2\n' }, tests: t })).results[0].passed).toBe(true);
  });

  it('forgets files deleted between runs', async () => {
    const t = [{ stage: 's', files: { 'test_gone.py': 'import gone\ntest("t", lambda: None)\n' } }];
    expect((await executePython(py, { files: { 'gone.py': '' }, tests: t })).error).toBeUndefined();
    const out = await executePython(py, { files: {}, tests: t });
    expect(out.error).toContain("No module named 'gone'");
  });

  it('forgets packages renamed between runs', async () => {
    const t = [{ stage: 's', files: { 'test_pkg.py': 'import oldpkg.mod\ntest("t", lambda: None)\n' } }];
    expect((await executePython(py, { files: { 'oldpkg/mod.py': '' }, tests: t })).error).toBeUndefined();
    const out = await executePython(py, { files: { 'newpkg/mod.py': '' }, tests: t });
    expect(out.error).toContain("No module named 'oldpkg'");
  });

  it('shows the user file in syntax errors', async () => {
    const out = await executePython(py, {
      files: { 'bad.py': 'def f(:\n' },
      tests: [{ stage: 's', files: { 'test_bad.py': 'import bad\n' } }],
    });
    expect(out.error).toContain('/workspace/bad.py');
    expect(out.error).toContain('SyntaxError');
  });

  it('captures prints', async () => {
    const out = await executePython(py, { files: { 'p.py': 'print("hello")\n' }, tests: [{ stage: 's', files: { 'test_p.py': 'import p\n' } }] });
    expect(out.stdout).toBe('hello\n');
  });

  it('rejects user files under tests/', async () => {
    const out = await executePython(py, { files: { 'tests/x.py': '' }, tests: [] });
    expect(out.error).toBe("tests/x.py: the tests/ folder is reserved for the problem's tests");
  });

  it('formats non-Error exceptions from Pyodide', async () => {
    const fake = {
      runPythonAsync: async () => undefined,
      FS: { mkdirTree: () => { throw { name: 'ErrnoError', errno: 20, code: 'ENOTDIR' }; }, writeFile: () => {} },
      setStdout: () => {},
      setStderr: () => {},
      globals: { get: () => () => ({}) },
    } as unknown as PyodideLike;
    const out = await executePython(fake, { files: { 'a/b.py': '' }, tests: [] });
    expect(out.error).toBe('ErrnoError ENOTDIR');
  });

  it('sys.exit() inside a test fails only that test', async () => {
    const out = await executePython(py, {
      files: { 'm.py': 'import sys\n\ndef quit():\n    sys.exit(3)\n' },
      tests: [{ stage: 's', files: { 'test_m.py': 'import m\n\ntest("exits", m.quit)\ntest("after", lambda: assertEqual(1, 1))\n' } }],
    });
    expect(out.error).toBeUndefined();
    expect(out.results.map((r) => [r.name, r.passed, r.error])).toEqual([
      ['exits', false, 'SystemExit: 3'],
      ['after', true, undefined],
    ]);
  });
});

