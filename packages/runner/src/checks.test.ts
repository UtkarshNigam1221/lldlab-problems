import { describe, expect, it } from 'vitest';
import { checksThrough, evaluateChecks, frozenSnapshot, isReadonlyAt } from './checks';
import { runInputFor, unlockStage, type CompiledProblem } from './problem';

const p: CompiledProblem = {
  slug: 'promo',
  version: 'abc123abc123',
  meta: {
    title: 'Promo', summary: 's', difficulty: 'easy', kind: 'implement', patterns: [], tags: [], authors: ['a'],
    timeLimitMs: 5000, languages: ['javascript'], entry: { javascript: 'checkout/checkout.js' }, readonly: ['**/types.js'],
  },
  stages: [
    { id: 'codes', title: 'Codes', readme: '', checks: [{ forbid: 'SAVE10', in: ['checkout/**'], message: 'Checkout must not know codes' }],
      languages: { javascript: { starter: { 'checkout/checkout.js': 'C', 'promotions/index.js': 'P', 'types.js': 'T' }, tests: {} } } },
    { id: 'stack', title: 'Stack', readme: '', frozen: ['checkout/**'], languages: { javascript: { starter: {}, tests: {} } } },
    { id: 'tiers', title: 'Tiers', readme: '', frozen: ['checkout/**', 'cart/**'], languages: { javascript: { starter: { 'cart/cart.js': 'K' }, tests: {} } } },
  ],
};

describe('isReadonlyAt', () => {
  it('adds frozen globs from their stage on to the problem-level readonly list', () => {
    expect(isReadonlyAt(p, 'types.js', 0)).toBe(true);
    expect(isReadonlyAt(p, 'checkout/checkout.js', 0)).toBe(false);
    expect(isReadonlyAt(p, 'checkout/checkout.js', 1)).toBe(true);
    expect(isReadonlyAt(p, 'cart/cart.js', 1)).toBe(false);
    expect(isReadonlyAt(p, 'cart/cart.js', 2)).toBe(true);
    expect(isReadonlyAt(p, 'promotions/index.js', 2)).toBe(false);
  });
});

describe('frozenSnapshot and unlockStage', () => {
  it('snapshots the files a stage freezes, as they are when it unlocks', () => {
    const ws = { 'checkout/checkout.js': 'WIRED', 'promotions/index.js': 'MINE' };
    expect(frozenSnapshot(p, 1, ws)).toEqual({ 'checkout/checkout.js': 'WIRED' });
    expect(unlockStage(p, 'javascript', ws, 1).snapshots).toEqual({ 'checkout/checkout.js': 'WIRED' });
  });

  it('snapshots files the unlocked stage adds when that stage freezes them', () => {
    expect(unlockStage(p, 'javascript', { 'checkout/checkout.js': 'C' }, 2).snapshots).toEqual({ 'checkout/checkout.js': 'C', 'cart/cart.js': 'K' });
  });

  it('a stage without frozen files snapshots nothing', () => {
    expect(unlockStage(p, 'javascript', { 'checkout/checkout.js': 'C' }, 0).snapshots).toEqual({});
  });
});

describe('checksThrough', () => {
  it('collects forbid checks of stages 1..N and unchanged checks for frozen files', () => {
    const snaps = { 'checkout/checkout.js': 'C' };
    expect(checksThrough(p, { 'checkout/checkout.js': 'C', 'promotions/index.js': 'P' }, 0, snaps)).toEqual([
      { kind: 'forbid', stage: 'codes', name: 'Checkout must not know codes', pattern: 'SAVE10', in: ['checkout/**'] },
    ]);
    expect(checksThrough(p, { 'checkout/checkout.js': 'C' }, 1, snaps)).toEqual([
      { kind: 'forbid', stage: 'codes', name: 'Checkout must not know codes', pattern: 'SAVE10', in: ['checkout/**'] },
      { kind: 'unchanged', stage: 'stack', name: 'checkout/checkout.js unchanged since part 2', path: 'checkout/checkout.js', snapshot: 'C' },
    ]);
  });

  it('lists a path once, under the first stage that froze it', () => {
    const checks = checksThrough(p, { 'checkout/checkout.js': 'C', 'cart/cart.js': 'K' }, 2, { 'checkout/checkout.js': 'C', 'cart/cart.js': 'K' });
    expect(checks.filter((c) => c.kind === 'unchanged').map((c) => c.name)).toEqual([
      'checkout/checkout.js unchanged since part 2',
      'cart/cart.js unchanged since part 3',
    ]);
  });

  it('checks a frozen path that only exists in the workspace or only in the snapshot', () => {
    const checks = checksThrough(p, { 'checkout/new.js': 'X' }, 1, { 'checkout/checkout.js': 'C' });
    expect(checks.filter((c) => c.kind === 'unchanged').map((c) => (c.kind === 'unchanged' ? [c.path, c.snapshot] : []))).toEqual([
      ['checkout/checkout.js', 'C'],
      ['checkout/new.js', undefined],
    ]);
  });
});

describe('evaluateChecks', () => {
  it('passes a forbid check when no matching file contains the pattern', () => {
    expect(evaluateChecks({ 'checkout/checkout.js': 'price()', 'promotions/index.js': 'SAVE10' }, [
      { kind: 'forbid', stage: 'codes', name: 'n', pattern: 'SAVE10', in: ['checkout/**'] },
    ])).toEqual([{ name: 'n', stage: 'codes', passed: true }]);
  });

  it('fails with the first matching file and line', () => {
    expect(evaluateChecks({ 'checkout/checkout.js': 'a\nif (c === "SAVE10") {}' }, [
      { kind: 'forbid', stage: 'codes', name: 'n', pattern: 'SAVE10', in: ['checkout/**'] },
    ])).toEqual([{ name: 'n', stage: 'codes', passed: false, message: 'checkout/checkout.js:2 matches /SAVE10/' }]);
  });

  it('fails an unchanged check on edits, deletion or a missing snapshot', () => {
    const c = (path: string, snapshot?: string) => ({ kind: 'unchanged' as const, stage: 'stack', name: `${path} unchanged`, path, snapshot });
    expect(evaluateChecks({ 'a.js': 'A' }, [c('a.js', 'A')])[0].passed).toBe(true);
    expect(evaluateChecks({ 'a.js': 'A2' }, [c('a.js', 'A')])[0]).toMatchObject({ passed: false, message: 'a.js changed since the part unlocked' });
    expect(evaluateChecks({}, [c('a.js', 'A')])[0]).toMatchObject({ passed: false, message: 'a.js was deleted' });
    expect(evaluateChecks({ 'a.js': 'A' }, [c('a.js')])[0]).toMatchObject({ passed: false, message: 'No snapshot (unlock the part again)' });
  });

  it('reports a pattern that does not compile instead of throwing', () => {
    expect(evaluateChecks({ 'a.js': 'x' }, [{ kind: 'forbid', stage: 's', name: 'n', pattern: '(', in: ['*.js'] }])[0]).toMatchObject({
      passed: false,
      message: expect.stringMatching(/^Invalid pattern: /),
    });
  });
});

describe('runInputFor', () => {
  it('includes the design checks for the stage', () => {
    const input = runInputFor(p, 'javascript', { 'checkout/checkout.js': 'C' }, 1, { 'checkout/checkout.js': 'C' });
    expect(input.checks?.map((c) => c.kind)).toEqual(['forbid', 'unchanged']);
  });
});
