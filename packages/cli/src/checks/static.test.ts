import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadProblem, type ProblemSource } from '../load';
import { checkBanned, checkFileCounts, checkPaths, checkStructure, staticChecks } from './static';

const good = () => structuredClone(loadProblem(fileURLToPath(new URL('../../fixtures/good/hello', import.meta.url))).source!) as ProblemSource;
const messages = (issues: { message: string }[]) => issues.map((i) => i.message);

describe('static checks', () => {
  it('pass on the good fixture', () => {
    expect(staticChecks(good())).toEqual([]);
  });

  it('slug must match the folder', () => {
    const src = good();
    src.slug = 'other';
    expect(messages(checkStructure(src))).toContain('slug "hello" in problem.yaml must match the folder name "other"');
  });

  it('every stage needs a README', () => {
    const src = good();
    src.stages[1].readme = '  ';
    expect(messages(checkStructure(src))).toContain('stages/2-shout/README.md is missing or empty');
  });

  it('every listed language needs every stage folder, tests and a solution', () => {
    const src = good();
    src.stages[1].languages.javascript = { present: false, starter: {}, solution: {}, tests: {} };
    expect(messages(checkStructure(src))).toContain('javascript/stages/2-shout is missing');
    src.stages[1].languages.javascript = { present: true, starter: {}, solution: {}, tests: {} };
    const m = messages(checkStructure(src));
    expect(m).toContain('javascript/stages/2-shout/tests has no test files');
    expect(m).toContain('javascript/stages/2-shout/solution is empty');
  });

  it('entry must exist in the first starter', () => {
    const src = good();
    src.meta.entry.javascript = 'nope.js';
    expect(messages(checkStructure(src))).toContain('entry.javascript "nope.js" is not in javascript/stages/1-greet/starter');
    delete src.meta.entry.javascript;
    expect(messages(checkStructure(src))).toContain('entry.javascript is required');
  });

  it('reports unexpected folders', () => {
    const src = good();
    src.extraFolders = ['go', 'stages/9-extra'];
    expect(messages(checkStructure(src))).toEqual(['unexpected folder go: not listed in problem.yaml', 'unexpected folder stages/9-extra: not listed in problem.yaml']);
  });

  it('later starters may only add files', () => {
    const src = good();
    src.stages[1].languages.javascript!.starter['greet.js'] = 'x';
    expect(messages(checkPaths(src))).toContain('javascript/stages/2-shout/starter/greet.js already exists in an earlier stage; later stages may only add files');
  });

  it('rejects two stages with the same test file name', () => {
    const src = good();
    src.stages[1].languages.javascript!.tests['greet.test.js'] = 'x';
    expect(messages(checkPaths(src))).toContain('javascript/stages/2-shout/tests/greet.test.js has the same name as a test in an earlier stage');
  });

  it('rejects nested or wrongly typed test files', () => {
    const src = good();
    src.stages[0].languages.javascript!.tests['sub/a.test.js'] = 'x';
    src.stages[0].languages.javascript!.tests['a.test.py'] = 'x';
    const m = messages(checkPaths(src));
    expect(m).toContain('javascript/stages/1-greet/tests/sub/a.test.js: test files must be directly in tests/');
    expect(m).toContain('javascript/stages/1-greet/tests/a.test.py: javascript test files must end in .js');
  });

  it('rejects starter and solution paths under tests/', () => {
    const src = good();
    src.stages[0].languages.javascript!.starter['tests/x.js'] = 'x';
    expect(messages(checkPaths(src))).toContain("javascript/stages/1-greet/starter: tests/x.js: the tests/ folder is reserved for the problem's tests");
  });

  it('flags banned APIs per language', () => {
    const src = good();
    const s = src.stages[0].languages.javascript!;
    s.solution['greet.js'] = "fetch('https://x'); import x from 'lodash'; const f = new Function('a');";
    const m = messages(checkBanned(src));
    expect(m).toContain('javascript/stages/1-greet/solution/greet.js uses fetch');
    expect(m).toContain("javascript/stages/1-greet/solution/greet.js uses an import of a package (use a relative path)");
    expect(m).toContain('javascript/stages/1-greet/solution/greet.js uses Function(');
  });

  it('flags banned Python and Go imports', () => {
    const src = good();
    src.meta.languages = ['javascript', 'python', 'go'];
    src.stages[0].languages.python = { present: true, starter: { 'a.py': 'import js\nfrom urllib import request\n' }, solution: {}, tests: {} };
    src.stages[0].languages.go = { present: true, starter: { 'a/a.go': 'package a\n\nimport (\n\t"fmt"\n\t"net/http"\n)\n' }, solution: { 'b/b.go': 'package b\n\nimport "os/exec"\n' }, tests: {} };
    const m = messages(checkBanned(src));
    expect(m).toContain('python/stages/1-greet/starter/a.py imports js');
    expect(m).toContain('python/stages/1-greet/starter/a.py imports urllib');
    expect(m).toContain('go/stages/1-greet/starter/a/a.go imports net/http');
    expect(m).toContain('go/stages/1-greet/solution/b/b.go imports os/exec');
    expect(m.filter((x) => x.includes('fmt'))).toEqual([]);
  });

  it('limits files per stage', () => {
    const src = good();
    for (let i = 0; i < 40; i++) src.stages[0].languages.javascript!.starter[`f${i}.js`] = '';
    expect(messages(checkFileCounts(src))).toEqual(['javascript/stages/1-greet has 42 starter and test files; the limit is 40']);
  });

  it('stage ids must be unique', () => {
    const src = good();
    src.stages[1].id = 'greet';
    expect(messages(checkStructure(src))).toContain('stage id "greet" is used more than once');
  });

  it('allows the Go URL parsing packages the runtime allows', () => {
    const src = good();
    src.meta.languages = ['javascript', 'go'];
    src.stages[0].languages.go = { present: true, starter: { 'a/a.go': 'package a\n\nimport (\n\t"net/url"\n\t"net/netip"\n\t"net/http"\n)\n' }, solution: {}, tests: {} };
    const m = messages(checkBanned(src));
    expect(m).toEqual(['go/stages/1-greet/starter/a/a.go imports net/http']);
  });

  it('flags every Go package the runtime blocks', () => {
    const src = good();
    src.meta.languages = ['javascript', 'go'];
    src.stages[0].languages.go = { present: true, starter: { 'a/a.go': 'package a\n\nimport (\n\t"plugin"\n\t"os/signal"\n\t"syscall"\n)\n' }, solution: {}, tests: {} };
    expect(messages(checkBanned(src)).sort()).toEqual([
      'go/stages/1-greet/starter/a/a.go imports os/signal',
      'go/stages/1-greet/starter/a/a.go imports plugin',
      'go/stages/1-greet/starter/a/a.go imports syscall',
    ]);
  });

  it('flags indirect ways to reach Python host modules', () => {
    const src = good();
    src.meta.languages = ['javascript', 'python'];
    src.stages[0].languages.python = {
      present: true,
      starter: { 'a.py': 'import pyodide_js\nimport importlib\nimport builtins\nm = __import__("js")\n' },
      solution: {},
      tests: {},
    };
    expect(messages(checkBanned(src)).sort()).toEqual([
      'python/stages/1-greet/starter/a.py imports builtins',
      'python/stages/1-greet/starter/a.py imports importlib',
      'python/stages/1-greet/starter/a.py imports pyodide_js',
      'python/stages/1-greet/starter/a.py uses __import__',
    ]);
  });
});

