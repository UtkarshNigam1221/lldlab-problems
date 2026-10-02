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
    if (s.frozen.length) stage.frozen = s.frozen;
    if (s.checks.length) stage.checks = s.checks;
    return stage;
  });
  // The review isn't in the compiled problem, but it is in the version: published versions are immutable, so an
  // edited review publishes under a new version. Problems without one hash exactly as before.
  const body = src.review === undefined ? { slug: src.slug, meta: src.meta, stages } : { slug: src.slug, meta: src.meta, stages, review: src.review };
  const version = createHash('sha256').update(json(body)).digest('hex').slice(0, 12);
  return { slug: src.slug, version, meta: src.meta, stages };
}

export interface CompiledReview {
  slug: string;
  version: string;
  markdown: string;
}

export function compileReview(src: ProblemSource, version: string): CompiledReview | undefined {
  return src.review === undefined ? undefined : { slug: src.slug, version, markdown: src.review };
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
        ...(p.meta.domain !== undefined && { domain: p.meta.domain }),
      })),
  };
}

/** Write v/<version>/<slug>.json (and .review.json) for each problem, then index.json. Returns paths relative to outDir. */
export function writeBuild(outDir: string, problems: CompiledProblem[], now = new Date(), reviews: CompiledReview[] = []): string[] {
  const written: string[] = [];
  const write = (rel: string, version: string, value: unknown) => {
    mkdirSync(path.join(outDir, 'v', version), { recursive: true });
    writeFileSync(path.join(outDir, rel), json(value));
    written.push(rel);
  };
  for (const p of problems) write(`v/${p.version}/${p.slug}.json`, p.version, p);
  for (const r of reviews) write(`v/${r.version}/${r.slug}.review.json`, r.version, r);
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

/**
 * The live index, or the HTTP status when it isn't there. S3 behind CloudFront answers 403 for a missing key,
 * so 403 and 404 both mean "not published yet"; the caller reports the status. Other failures throw.
 */
export async function fetchPublishedIndex(url: string): Promise<{ index: ProblemIndex } | { missing: number }> {
  const res = await fetch(url);
  if (res.status === 404 || res.status === 403) return { missing: res.status };
  if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`);
  return { index: (await res.json()) as ProblemIndex };
}
