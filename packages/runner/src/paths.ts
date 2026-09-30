import type { Files } from './types';

/** Test files are mounted here; user workspaces may not use it. */
export const TESTS_DIR = 'tests';

function pathError(p: string): string | undefined {
  const label = p === '' ? '(empty)' : p;
  if (p === '') return `${label}: empty path`;
  if (p.includes('\\')) return `${label}: use "/" as the separator`;
  if (p.startsWith('/')) return `${label}: paths must be relative`;
  const parts = p.split('/');
  if (parts.includes('..')) return `${label}: paths must stay inside the workspace`;
  if (parts.includes('.')) return `${label}: paths must not contain "." segments`;
  if (parts.includes('')) return `${label}: empty path segment`;
  if (parts[0] === TESTS_DIR) return `${label}: the tests/ folder is reserved for the problem's tests`;
  return undefined;
}

/** First invalid workspace path, as a user-facing message; undefined when all are valid. */
export function workspacePathError(files: Files): string | undefined {
  const paths = Object.keys(files);
  for (const p of paths) {
    const err = pathError(p);
    if (err) return err;
  }
  // "lot" and "lot/lot.py" can't both exist: one would have to be a file and a folder.
  const all = new Set(paths);
  for (const p of paths) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join('/');
      if (all.has(dir)) return `${dir}: a file and a folder can't share this name`;
    }
  }
  return undefined;
}
