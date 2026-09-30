import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { executeGo, GO_HELPER, type YaegiRun } from './go';

describe('GO_HELPER', () => {
  it('matches the helper the Go tests use', () => {
    const goSrc = readFileSync(new URL('../../yaegi-runtime/runner_test.go', import.meta.url), 'utf8');
    const match = goSrc.match(/const goHelper = `([\s\S]*?)`/);
    expect(match?.[1]).toBe(GO_HELPER);
  });
});

describe('executeGo', () => {
  it('sends the workspace and flattened tests', async () => {
    const calls: string[] = [];
    const run: YaegiRun = (req) => {
      calls.push(req);
      return { stdout: 'out', results: '[{"name":"t","stage":"s","file":"a_test.go","passed":true,"ms":1}]' };
    };
    const out = await executeGo(run, { files: { 'lot/lot.go': 'L' }, tests: [{ stage: 's', files: { 'a_test.go': 'T' } }] });
    expect(JSON.parse(calls[0])).toEqual({ helper: GO_HELPER, workspace: { 'lot/lot.go': 'L' }, tests: [{ stage: 's', file: 'a_test.go', src: 'T' }] });
    expect(out).toEqual({ stdout: 'out', results: [{ name: 't', stage: 's', file: 'a_test.go', passed: true, ms: 1 }] });
  });

  it('returns runtime errors without results', async () => {
    const out = await executeGo(() => ({ stdout: '', error: 'boom' }), { files: {}, tests: [] });
    expect(out).toEqual({ results: [], stdout: '', error: 'boom' });
  });

  it('rejects user files under tests/', async () => {
    const out = await executeGo(() => ({ stdout: '' }), { files: { 'tests/x.go': '' }, tests: [] });
    expect(out.error).toBe("tests/x.go: the tests/ folder is reserved for the problem's tests");
  });
});
