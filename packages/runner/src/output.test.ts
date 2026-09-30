import { describe, expect, it } from 'vitest';
import { MAX_STDOUT, capOutput } from './output';

describe('capOutput', () => {
  it('leaves short output alone', () => {
    expect(capOutput('hello\n')).toBe('hello\n');
  });
  it('truncates long output with a note', () => {
    const out = capOutput('x'.repeat(MAX_STDOUT + 10));
    expect(out.length).toBeLessThan(MAX_STDOUT + 100);
    expect(out).toMatch(/output truncated/);
  });
});
