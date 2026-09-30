import { globToRegExp } from './glob';
import type { Files, Language, RunInput, StageTests } from './types';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Kind = 'implement' | 'debug';

export interface ProblemMeta {
  title: string;
  summary: string;
  difficulty: Difficulty;
  kind: Kind;
  patterns: string[];
  tags: string[];
  authors: string[];
  timeLimitMs: number;
  languages: Language[];
  entry: Partial<Record<Language, string>>;
  readonly: string[];
}

export interface CompiledLanguageStage {
  starter: Files;
  tests: Files;
}

export interface CompiledStage {
  id: string;
  title: string;
  readme: string;
  hints?: string;
  languages: Partial<Record<Language, CompiledLanguageStage>>;
}

export interface CompiledProblem {
  slug: string;
  /** First 12 hex chars of the SHA-256 of the compiled content. */
  version: string;
  meta: ProblemMeta;
  stages: CompiledStage[];
}

export interface IndexEntry {
  slug: string;
  version: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  kind: Kind;
  patterns: string[];
  tags: string[];
  languages: Language[];
  stages: { id: string; title: string }[];
}

export interface ProblemIndex {
  generatedAt: string;
  problems: IndexEntry[];
}

const EMPTY: CompiledLanguageStage = { starter: {}, tests: {} };

function langStage(p: CompiledProblem, lang: Language, i: number): CompiledLanguageStage {
  return p.stages[i]?.languages[lang] ?? EMPTY;
}

/** Starter files of stages 0..stage merged; later stages only add files. */
export function cumulativeStarter(p: CompiledProblem, lang: Language, stage: number): Files {
  const out: Files = {};
  for (let i = 0; i <= stage; i++) Object.assign(out, langStage(p, lang, i).starter);
  return out;
}

/** Test files of stages 0..stage, in stage order. */
export function testsThrough(p: CompiledProblem, lang: Language, stage: number): StageTests[] {
  return p.stages.slice(0, stage + 1).map((s, i) => ({ stage: s.id, files: { ...langStage(p, lang, i).tests } }));
}

/**
 * Add stage `stage`'s starter files to the user's workspace. A path the user already has keeps their file;
 * the new one is added as `<path>.part<stage+1>` (or `-2`, `-3`, … if that is taken too).
 */
export function unlockStage(p: CompiledProblem, lang: Language, workspace: Files, stage: number): { files: Files; renamed: { from: string; to: string }[] } {
  const files: Files = { ...workspace };
  const renamed: { from: string; to: string }[] = [];
  for (const [path, src] of Object.entries(langStage(p, lang, stage).starter)) {
    if (!(path in files)) {
      files[path] = src;
      continue;
    }
    let to = `${path}.part${stage + 1}`;
    for (let n = 2; to in files; n++) to = `${path}.part${stage + 1}-${n}`;
    files[to] = src;
    renamed.push({ from: path, to });
  }
  return { files, renamed };
}

export function runInputFor(p: CompiledProblem, lang: Language, workspace: Files, stage: number): RunInput {
  return { files: workspace, tests: testsThrough(p, lang, stage) };
}

export function isReadonly(meta: ProblemMeta, path: string): boolean {
  return meta.readonly.some((g) => globToRegExp(g).test(path));
}
