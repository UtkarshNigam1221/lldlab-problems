import { cpSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
  it('loads the brief, domain, review, frozen files and checks', () => {
    const { source, issues } = loadProblem(fx('design/promo'));
    expect(issues).toEqual([]);
    expect(source!.meta.domain).toBe('Pricing · Checkout');
    expect(source!.meta.brief).toMatch(/^# Ticket: promo codes at checkout/);
    expect(source!.review).toMatch(/^# Design review/);
    expect(source!.stages[0].checks).toEqual([{ forbid: 'SAVE10|FLAT100', in: ['checkout.js'], message: "Checkout shouldn't know specific promotions" }]);
    expect(source!.stages[0].frozen).toEqual([]);
    expect(source!.stages[1].frozen).toEqual(['checkout.js']);
    expect(source!.stages[1].checks).toEqual([]);
    expect(source!.extraFolders).toEqual([]);
  });

  it('leaves the new fields out for problems that do not use them', () => {
    const { source } = loadProblem(fx('good/hello'));
    expect(source!.meta.domain).toBeUndefined();
    expect(source!.meta.brief).toBeUndefined();
    expect(source!.review).toBeUndefined();
    expect(source!.stages.map((s) => [s.frozen, s.checks])).toEqual([[[], []], [[], []]]);
  });

  it('accepts the refactor kind and rejects unknown check fields', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'promo-'));
    cpSync(fx('design/promo'), dir, { recursive: true });
    const yaml = (extra: string) => `slug: promo\ntitle: P\nsummary: s\ndifficulty: easy\nkind: refactor\npatterns: []\nauthors: [a]\ntimeLimitMs: 5000\nlanguages: [javascript]\nentry: { javascript: checkout.js }\nstages:\n  - id: codes\n    title: C\n${extra}  - id: stack\n    title: S\n`;
    writeFileSync(path.join(dir, 'problem.yaml'), yaml(''));
    expect(loadProblem(dir).issues).toEqual([]);
    writeFileSync(path.join(dir, 'problem.yaml'), yaml('    checks:\n      - { forbid: x, in: [a.js], message: m, extra: 1 }\n'));
    expect(loadProblem(dir).issues.map((i) => i.message)).toContainEqual(expect.stringMatching(/stages\/0\/checks\/0: must NOT have additional properties/));
  });
});

describe('listProblemDirs', () => {
  it('lists problem folders sorted', () => {
    expect(listProblemDirs(fx('good')).map((d) => d.split('/').pop())).toEqual(['hello']);
  });
});

describe('untrusted file trees', () => {
  const copy = () => {
    const dir = path.join(mkdtempSync(path.join(os.tmpdir(), 'load-')), 'hello');
    cpSync(fx('good/hello'), dir, { recursive: true });
    return dir;
  };

  it('rejects symlinks instead of following them', () => {
    const dir = copy();
    symlinkSync('/etc/hosts', path.join(dir, 'javascript/stages/1-greet/starter/leak.js'));
    const { source, issues } = loadProblem(dir);
    expect(source).toBeUndefined();
    expect(issues).toEqual([{ problem: 'hello', message: "javascript/stages/1-greet/starter/leak.js is a symlink; symlinks aren't allowed" }]);
  });

  it('ignores dotfiles such as .DS_Store', () => {
    const dir = copy();
    writeFileSync(path.join(dir, 'javascript/stages/1-greet/starter/.DS_Store'), 'junk');
    const { source } = loadProblem(dir);
    expect(Object.keys(source!.stages[0].languages.javascript!.starter)).toEqual(['greet.js']);
  });
});
