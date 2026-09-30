import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { listProblemDirs, loadProblem, readTree } from './load';

const fx = (p: string) => fileURLToPath(new URL(`../fixtures/${p}`, import.meta.url));

describe('readTree', () => {
  it('reads files recursively with POSIX paths', () => {
    expect(Object.keys(readTree(fx('good/hello/javascript/stages/2-shout/solution'))).sort()).toEqual(['greet.js', 'shout.js']);
  });

  it('returns {} for a missing folder', () => {
    expect(readTree(fx('good/hello/nope'))).toEqual({});
  });
});

describe('loadProblem', () => {
  it('loads metadata, stages and per-language files', () => {
    const { source, issues } = loadProblem(fx('good/hello'));
    expect(issues).toEqual([]);
    expect(source!.slug).toBe('hello');
    expect(source!.yamlSlug).toBe('hello');
    expect(source!.meta.tags).toEqual([]);
    expect(source!.meta.readonly).toEqual([]);
    expect(source!.stages.map((s) => [s.id, s.folder])).toEqual([['greet', '1-greet'], ['shout', '2-shout']]);
    expect(source!.stages[0].hints?.trim()).toBe('Use a template string.');
    expect(source!.stages[1].hints).toBeUndefined();
    const js = source!.stages[1].languages.javascript!;
    expect(js.present).toBe(true);
    expect(Object.keys(js.starter)).toEqual(['shout.js']);
    expect(Object.keys(js.tests)).toEqual(['shout.test.js']);
    expect(source!.extraFolders).toEqual([]);
  });

  it('reports YAML syntax errors', () => {
    const { source, issues } = loadProblem(fx('bad-yaml/broken'));
    expect(source).toBeUndefined();
    expect(issues[0].problem).toBe('broken');
    expect(issues[0].message).toMatch(/^problem\.yaml: /);
  });

  it('reports every schema error', () => {
    const { source, issues } = loadProblem(fx('bad-schema/wrong'));
    expect(source).toBeUndefined();
    const messages = issues.map((i) => i.message);
    expect(messages).toContain('problem.yaml /slug: must match pattern "^[a-z0-9]+(-[a-z0-9]+)*$"');
    expect(messages).toContain('problem.yaml /difficulty: must be equal to one of the allowed values');
    expect(messages).toContain('problem.yaml /stages: must NOT have fewer than 1 items');
  });

  it('reports a missing problem.yaml', () => {
    const { issues } = loadProblem(fx('good'));
    expect(issues).toEqual([{ problem: 'good', message: 'problem.yaml is missing' }]);
  });
});

describe('listProblemDirs', () => {
  it('lists problem folders sorted', () => {
    expect(listProblemDirs(fx('good')).map((d) => d.split('/').pop())).toEqual(['hello']);
  });
});
