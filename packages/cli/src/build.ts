import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { CompiledProblem, CompiledStage, ProblemIndex } from 'lldlab-runner';
import type { Issue } from './issues';
import type { ProblemSource } from './load';

export const MAX_COMPILED_BYTES = 200 * 1024;

/** Recursively sort object keys so JSON output and hashes don't depend on insertion order. */
export function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])]));
  }
  return v;
}

const json = (v: unknown) => JSON.stringify(stable(v));

export function compileProblem(src: ProblemSource): CompiledProblem {
  const stages: CompiledStage[] = src.stages.map((s) => {
    const languages: CompiledStage['languages'] = {};
    for (const lang of src.meta.languages) {
      const ls = s.languages[lang]!;
      languages[lang] = { starter: ls.starter, tests: ls.tests };
    }
    const stage: CompiledStage = { id: s.id, title: s.title, readme: s.readme, languages };
    if (s.hints !== undefined) stage.hints = s.hints;
    return stage;
  });
  const body = { slug: src.slug, meta: src.meta, stages };
  const version = createHash('sha256').update(json(body)).digest('hex').slice(0, 12);
  return { slug: src.slug, version, meta: src.meta, stages };
}

export function buildIndex(problems: CompiledProblem[], now = new Date()): ProblemIndex {
  return {
    generatedAt: now.toISOString(),
    problems: [...problems]
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((p) => ({
        slug: p.slug,
        version: p.version,
        title: p.meta.title,
        summary: p.meta.summary,
        difficulty: p.meta.difficulty,
        kind: p.meta.kind,
        patterns: p.meta.patterns,
        tags: p.meta.tags,
        languages: p.meta.languages,
        stages: p.stages.map((s) => ({ id: s.id, title: s.title })),
      })),
  };
}

/** Write v/<version>/<slug>.json for each problem, then index.json. Returns paths relative to outDir. */
export function writeBuild(outDir: string, problems: CompiledProblem[], now = new Date()): string[] {
  const written: string[] = [];
  for (const p of problems) {
    const rel = `v/${p.version}/${p.slug}.json`;
    mkdirSync(path.join(outDir, 'v', p.version), { recursive: true });
    writeFileSync(path.join(outDir, rel), json(p));
    written.push(rel);
  }
  writeFileSync(path.join(outDir, 'index.json'), json(buildIndex(problems, now)));
  written.push('index.json');
  return written;
}

export function checkCompiledSize(p: CompiledProblem): Issue[] {
  const bytes = Buffer.byteLength(json(p));
  return bytes > MAX_COMPILED_BYTES ? [{ problem: p.slug, message: `compiled problem is ${Math.ceil(bytes / 1024)} KB; the limit is 200 KB` }] : [];
}

export function checkSlugsKept(published: ProblemIndex, slugs: string[]): Issue[] {
  const now = new Set(slugs);
  return published.problems
    .filter((p) => !now.has(p.slug))
    .map((p) => ({ problem: p.slug, message: `published problem "${p.slug}" was removed or renamed; slugs are permanent` }));
}

/** The live index, or undefined before the first publish (404). Other failures throw. */
export async function fetchPublishedIndex(url: string): Promise<ProblemIndex | undefined> {
  const res = await fetch(url);
  if (res.status === 404 || res.status === 403) return undefined;
  if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`);
  return (await res.json()) as ProblemIndex;
}
