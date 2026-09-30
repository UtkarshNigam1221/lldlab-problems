export function errorMessage(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  // Object.keys() of Map/Set/Date is empty, so compare their contents explicitly.
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false;
    return [...a].every(([k, v]) => b.has(k) && deepEqual(v, b.get(k)));
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) return false;
    return [...a].every((x) => b.has(x) || [...b].some((y) => deepEqual(x, y)));
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(
    (k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

export function show(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return JSON.stringify(v);
  if (v instanceof Map) return `Map(${v.size}) {${[...v].map(([k, x]) => `${show(k)} => ${show(x)}`).join(', ')}}`;
  if (v instanceof Set) return `Set(${v.size}) {${[...v].map(show).join(', ')}}`;
  if (v instanceof Date) return `Date(${v.toISOString()})`;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

export class AssertionError extends Error {
  name = 'AssertionError';
}
