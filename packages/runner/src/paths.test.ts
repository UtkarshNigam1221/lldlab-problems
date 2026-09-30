import { describe, expect, it } from 'vitest';
import { workspacePathError } from './paths';

describe('workspacePathError', () => {
  it('accepts nested relative paths', () => {
    expect(workspacePathError({ 'lot/lot.go': '', 'README.md': '', 'a/b/c.py': '' })).toBeUndefined();
  });

  it.each([
    ['tests/x.js', 'tests/x.js: the tests/ folder is reserved for the problem\'s tests'],
    ['tests', 'tests: the tests/ folder is reserved for the problem\'s tests'],
    ['../x.py', '../x.py: paths must stay inside the workspace'],
    ['a/../../x.py', 'a/../../x.py: paths must stay inside the workspace'],
    ['/etc/x', '/etc/x: paths must be relative'],
    ['a//b.js', 'a//b.js: empty path segment'],
    ['a/./b.js', 'a/./b.js: paths must not contain "." segments'],
    ['a\\b.js', 'a\\b.js: use "/" as the separator'],
    ['', '(empty): empty path'],
  ])('rejects %j', (p, message) => {
    expect(workspacePathError({ [p]: '' })).toBe(message);
  });
});
