import { globToRegExp } from './glob';
import type { CompiledProblem } from './problem';
import type { CheckResult, DesignCheck, Files } from './types';

const matchesAny = (globs: string[], path: string) => globs.some((g) => globToRegExp(g).test(path));

/** Problem-level readonly globs, plus every `frozen` glob of stages at or before `stage`. */
export function isReadonlyAt(p: CompiledProblem, path: string, stage: number): boolean {
  if (matchesAny(p.meta.readonly, path)) return true;
  return p.stages.slice(0, stage + 1).some((s) => matchesAny(s.frozen ?? [], path));
}

/** The workspace files that stage `stage` freezes, as they are now. */
export function frozenSnapshot(p: CompiledProblem, stage: number, workspace: Files): Files {
  const globs = p.stages[stage]?.frozen ?? [];
  return Object.fromEntries(Object.entries(workspace).filter(([path]) => matchesAny(globs, path)));
}

/**
 * The design checks that apply at `stage`: every forbid check of stages 1..N, and one unchanged check per frozen
 * path (from the snapshots or the workspace), named after the first stage that froze it.
 */
export function checksThrough(p: CompiledProblem, workspace: Files, stage: number, snapshots: Files): DesignCheck[] {
  const out: DesignCheck[] = [];
  const seen = new Set<string>();
  const paths = [...new Set([...Object.keys(snapshots), ...Object.keys(workspace)])];
  p.stages.slice(0, stage + 1).forEach((s, i) => {
    for (const c of s.checks ?? []) out.push({ kind: 'forbid', stage: s.id, name: c.message, pattern: c.forbid, in: c.in });
    for (const path of paths) {
      if (seen.has(path) || !matchesAny(s.frozen ?? [], path)) continue;
      seen.add(path);
      out.push({ kind: 'unchanged', stage: s.id, name: `${path} unchanged since part ${i + 1}`, path, snapshot: snapshots[path] });
    }
  });
  return out;
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split('\n').length;
}

function forbid(files: Files, c: Extract<DesignCheck, { kind: 'forbid' }>): CheckResult {
  let re: RegExp;
  try {
    re = new RegExp(c.pattern);
  } catch (e) {
    return { name: c.name, stage: c.stage, passed: false, message: `Invalid pattern: ${e instanceof Error ? e.message : String(e)}` };
  }
  for (const [path, src] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    if (!matchesAny(c.in, path)) continue;
    const m = re.exec(src);
    if (m) return { name: c.name, stage: c.stage, passed: false, message: `${path}:${lineOf(src, m.index)} matches /${c.pattern}/` };
  }
  return { name: c.name, stage: c.stage, passed: true };
}

function unchanged(files: Files, c: Extract<DesignCheck, { kind: 'unchanged' }>): CheckResult {
  const base = { name: c.name, stage: c.stage };
  if (c.snapshot === undefined) return { ...base, passed: false, message: 'No snapshot (unlock the part again)' };
  if (!Object.prototype.hasOwnProperty.call(files, c.path)) return { ...base, passed: false, message: `${c.path} was deleted` };
  if (files[c.path] !== c.snapshot) return { ...base, passed: false, message: `${c.path} changed since the part unlocked` };
  return { ...base, passed: true };
}

/** Results in check order. Never throws: a bad pattern is a failed check. */
export function evaluateChecks(files: Files, checks: DesignCheck[]): CheckResult[] {
  return checks.map((c) => (c.kind === 'forbid' ? forbid(files, c) : unchanged(files, c)));
}
