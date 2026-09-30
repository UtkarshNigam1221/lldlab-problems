import { describe, expect, it } from 'vitest';
import { deepEqual, show } from './harness';

describe('deepEqual', () => {
  it.each([
    [1, 1, true],
    [1, '1', false],
    [[1, [2, 3]], [1, [2, 3]], true],
    [[1, 2], [1, 2, 3], false],
    [{ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 }, true],
    [{ a: 1 }, { a: 1, b: undefined }, false],
    [NaN, NaN, true],
    [null, undefined, false],
    [new Map([[1, 2]]), new Map([[1, 2]]), true],
    [new Map([[1, 2]]), new Map([[1, 3]]), false],
    [new Map([[1, 2]]), new Map([[3, 2]]), false],
    [new Map([[1, { a: [1] }]]), new Map([[1, { a: [1] }]]), true],
    [new Set([1, 2]), new Set([2, 1]), true],
    [new Set([1, 2]), new Set([1, 3]), false],
    [new Date(1), new Date(1), true],
    [new Date(1), new Date(2), false],
    [new Map(), {}, false],
    [new Set([1]), [1], false],
  ])('deepEqual(%j, %j) = %s', (a, b, want) => {
    expect(deepEqual(a, b)).toBe(want);
  });
});

describe('show', () => {
  it('formats values for assertion messages', () => {
    expect(show('a')).toBe('"a"');
    expect(show(undefined)).toBe('undefined');
    expect(show(new Map([[1, 'x']]))).toBe('Map(1) {1 => "x"}');
    expect(show(new Set([1]))).toBe('Set(1) {1}');
    expect(show([1, { a: 2 }])).toBe('[1,{"a":2}]');
  });
});
