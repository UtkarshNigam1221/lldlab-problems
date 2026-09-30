import { describe, expect, it } from 'vitest';
import { cumulativeStarter, isReadonly, runInputFor, testsThrough, unlockStage, type CompiledProblem } from './problem';

const p: CompiledProblem = {
  slug: 'demo',
  version: 'abc123abc123',
  meta: {
    title: 'Demo', summary: 's', difficulty: 'easy', kind: 'implement', patterns: [], tags: [], authors: ['a'],
    timeLimitMs: 5000, languages: ['javascript'], entry: { javascript: 'a.js' }, readonly: ['**/types.*'],
  },
  stages: [
    { id: 'one', title: 'One', readme: '# 1', languages: { javascript: { starter: { 'a.js': 'A1', 'types.js': 'T' }, tests: { 'a.test.js': 'TA' } } } },
    { id: 'two', title: 'Two', readme: '# 2', languages: { javascript: { starter: { 'b.js': 'B2' }, tests: { 'b.test.js': 'TB' } } } },
    { id: 'three', title: 'Three', readme: '# 3', languages: { javascript: { starter: {}, tests: { 'c.test.js': 'TC' } } } },
  ],
};

describe('stage helpers', () => {
  it('merges starters up to a stage', () => {
    expect(cumulativeStarter(p, 'javascript', 0)).toEqual({ 'a.js': 'A1', 'types.js': 'T' });
    expect(cumulativeStarter(p, 'javascript', 1)).toEqual({ 'a.js': 'A1', 'types.js': 'T', 'b.js': 'B2' });
  });

  it('collects tests for stages 1..N in order', () => {
    expect(testsThrough(p, 'javascript', 2)).toEqual([
      { stage: 'one', files: { 'a.test.js': 'TA' } },
      { stage: 'two', files: { 'b.test.js': 'TB' } },
      { stage: 'three', files: { 'c.test.js': 'TC' } },
    ]);
  });

  it('unlock adds new starter files and keeps the user code', () => {
    const r = unlockStage(p, 'javascript', { 'a.js': 'MINE', 'types.js': 'T' }, 1);
    expect(r).toEqual({ files: { 'a.js': 'MINE', 'types.js': 'T', 'b.js': 'B2' }, renamed: [] });
  });

  it('unlock never overwrites a file the user created at the same path', () => {
    const r = unlockStage(p, 'javascript', { 'a.js': 'A', 'b.js': 'USER B' }, 1);
    expect(r.files['b.js']).toBe('USER B');
    expect(r.files['b.js.part2']).toBe('B2');
    expect(r.renamed).toEqual([{ from: 'b.js', to: 'b.js.part2' }]);
  });

  it('unlock picks a free name when the .part name is taken too', () => {
    const r = unlockStage(p, 'javascript', { 'b.js': 'U', 'b.js.part2': 'U2' }, 1);
    expect(r.files['b.js.part2-2']).toBe('B2');
  });

  it('unlock of a stage without starter files changes nothing', () => {
    expect(unlockStage(p, 'javascript', { 'a.js': 'A' }, 2)).toEqual({ files: { 'a.js': 'A' }, renamed: [] });
  });

  it('builds a run input', () => {
    expect(runInputFor(p, 'javascript', { 'a.js': 'X' }, 0)).toEqual({ files: { 'a.js': 'X' }, tests: [{ stage: 'one', files: { 'a.test.js': 'TA' } }] });
  });

  it('matches readonly globs', () => {
    expect(isReadonly(p.meta, 'types.js')).toBe(true);
    expect(isReadonly(p.meta, 'src/types.js')).toBe(true);
    expect(isReadonly(p.meta, 'a.js')).toBe(false);
  });

  it('treats a language missing from a stage as empty', () => {
    expect(cumulativeStarter(p, 'go', 1)).toEqual({});
    expect(testsThrough(p, 'go', 0)).toEqual([{ stage: 'one', files: {} }]);
  });
});
