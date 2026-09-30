import { describe, expect, it } from 'vitest';
import { testsError, workspacePathError } from './paths';

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

  it('rejects a file and a folder with the same name', () => {
    expect(workspacePathError({ lot: 'x', 'lot/lot.py': 'y' })).toBe('lot: a file and a folder can\'t share this name');
    expect(workspacePathError({ 'a/b/c.py': '', 'a/b': '' })).toBe('a/b: a file and a folder can\'t share this name');
  });
});

describe('testsError', () => {
  it('accepts distinct flat test files', () => {
    expect(testsError([{ stage: 'a', files: { 'a.test.js': '' } }, { stage: 'b', files: { 'b.test.js': '' } }])).toBeUndefined();
  });

  it('rejects the same test file name in two stages', () => {
    expect(testsError([{ stage: 'a', files: { 'x.test.js': '' } }, { stage: 'b', files: { 'x.test.js': '' } }])).toBe(
      'tests/x.test.js is defined by stages a and b; test file names must be unique',
    );
  });

  it('rejects test files in folders', () => {
    expect(testsError([{ stage: 'a', files: { 'sub/x.test.js': '' } }])).toBe('tests/sub/x.test.js: test files must be directly in tests/');
  });
});

