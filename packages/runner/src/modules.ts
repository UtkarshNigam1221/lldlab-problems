import { transform } from 'sucrase';
import type { Files } from './types';

export class ModuleError extends Error {
  name = 'ModuleError';
}

const SUFFIXES = ['', '.ts', '.js', '/index.ts', '/index.js'];

function dirname(p: string): string {
  const i = p.lastIndexOf('/');
  return i < 0 ? '' : p.slice(0, i);
}

function join(from: string, spec: string): string | undefined {
  const out: string[] = [];
  for (const part of `${dirname(from)}/${spec}`.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (!out.length) return undefined;
      out.pop();
    } else out.push(part);
  }
  return out.join('/');
}

/** Resolve a relative import against the in-memory workspace. */
export function resolveImport(files: Files, from: string, spec: string): string {
  if (!spec.startsWith('./') && !spec.startsWith('../')) {
    throw new ModuleError(`${from}: cannot import "${spec}": packages aren't available, use a relative path`);
  }
  const base = join(from, spec);
  if (base === undefined) throw new ModuleError(`${from}: import "${spec}" leaves the workspace`);
  for (const suffix of SUFFIXES) {
    if (Object.prototype.hasOwnProperty.call(files, base + suffix)) return base + suffix;
  }
  throw new ModuleError(`${from}: cannot find "${spec}"`);
}

/**
 * A CommonJS loader over in-memory files. Sucrase converts ES imports (including dynamic import()) to require(),
 * so every import goes through resolveImport.
 */
export function createRequire(files: Files, globals: Record<string, unknown>): (path: string) => unknown {
  const cache = new Map<string, { exports: unknown }>();
  const names = Object.keys(globals);
  const values = names.map((n) => globals[n]);

  const load = (path: string): unknown => {
    const cached = cache.get(path);
    if (cached) return cached.exports;
    const module = { exports: {} as unknown };
    cache.set(path, module);
    let code: string;
    try {
      code = transform(files[path], {
        transforms: path.endsWith('.ts') ? ['typescript', 'imports'] : ['imports'],
        filePath: path,
        disableESTransforms: true,
        // Turn import() into require() too, so dynamic imports can't reach packages or URLs.
        preserveDynamicImport: false,
      }).code;
    } catch (e) {
      throw new ModuleError(`${path}: syntax error: ${e instanceof Error ? e.message : String(e)}`);
    }
    const fn = new Function('require', 'module', 'exports', ...names, `${code}\n//# sourceURL=${path}`);
    fn((spec: string) => load(resolveImport(files, path, spec)), module, module.exports, ...values);
    return module.exports;
  };
  return load;
}
