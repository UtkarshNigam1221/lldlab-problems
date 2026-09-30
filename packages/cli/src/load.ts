import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import { parse } from 'yaml';
import { LANGUAGES, type Files, type Language, type ProblemMeta } from 'lldlab-runner';
import type { Issue } from './issues';

export interface SourceLanguageStage {
  present: boolean;
  starter: Files;
  solution: Files;
  tests: Files;
}

export interface SourceStage {
  id: string;
  title: string;
  /** "<n>-<id>" */
  folder: string;
  readme: string;
  hints?: string;
  languages: Partial<Record<Language, SourceLanguageStage>>;
}

export interface ProblemSource {
  dir: string;
  /** Folder name. */
  slug: string;
  /** The slug written in problem.yaml; checkStructure requires it to equal `slug`. */
  yamlSlug: string;
  meta: ProblemMeta;
  stages: SourceStage[];
  /** Folders that problem.yaml doesn't account for, relative to the problem folder. */
  extraFolders: string[];
}

const schema = JSON.parse(readFileSync(new URL('../../../schema/problem.schema.json', import.meta.url), 'utf8'));
const validate = new Ajv({ allErrors: true }).compile(schema);

const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory();
const readText = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : undefined);

/** Every file under dir, keyed by POSIX path relative to dir. Missing dir → {}. Dotfiles are skipped. */
export function readTree(dir: string): Files {
  const out: Files = {};
  if (!isDir(dir)) return out;
  const walk = (rel: string) => {
    for (const name of readdirSync(path.join(dir, rel)).sort()) {
      if (name.startsWith('.')) continue;
      const r = rel ? `${rel}/${name}` : name;
      if (lstatSync(path.join(dir, r)).isDirectory()) walk(r);
      else out[r] = readFileSync(path.join(dir, r), 'utf8');
    }
  };
  walk('');
  return out;
}

/**
 * Symlinks under dir, relative to dir. Contributed folders are untrusted: following a link could publish
 * a file from the build machine (for example /proc/self/environ) or loop forever.
 */
function findSymlinks(dir: string, rel = ''): string[] {
  const found: string[] = [];
  for (const name of readdirSync(path.join(dir, rel)).sort()) {
    const r = rel ? `${rel}/${name}` : name;
    const st = lstatSync(path.join(dir, r));
    if (st.isSymbolicLink()) found.push(r);
    else if (st.isDirectory()) found.push(...findSymlinks(dir, r));
  }
  return found;
}

export function listProblemDirs(root: string): string[] {
  return readdirSync(root)
    .sort()
    .map((d) => path.join(root, d))
    .filter(isDir);
}

export function loadProblem(dir: string): { source?: ProblemSource; issues: Issue[] } {
  const slug = path.basename(dir);
  const issue = (message: string): Issue => ({ problem: slug, message });

  if (isDir(dir)) {
    const links = findSymlinks(dir);
    if (links.length) return { issues: links.map((l) => issue(`${l} is a symlink; symlinks aren't allowed`)) };
  }

  const yamlText = readText(path.join(dir, 'problem.yaml'));
  if (yamlText === undefined) return { issues: [issue('problem.yaml is missing')] };
  let raw: unknown;
  try {
    raw = parse(yamlText);
  } catch (e) {
    return { issues: [issue(`problem.yaml: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`)] };
  }
  if (!validate(raw)) {
    return { issues: (validate.errors ?? []).map((e) => issue(`problem.yaml ${e.instancePath || '(root)'}: ${e.message}`)) };
  }
  const y = raw as ProblemMeta & { slug: string; stages: { id: string; title: string }[] };
  const meta: ProblemMeta = {
    title: y.title,
    summary: y.summary,
    difficulty: y.difficulty,
    kind: y.kind,
    patterns: y.patterns,
    tags: y.tags ?? [],
    authors: y.authors,
    timeLimitMs: y.timeLimitMs,
    languages: y.languages,
    entry: y.entry,
    readonly: y.readonly ?? [],
  };

  const stages: SourceStage[] = y.stages.map((s, i) => {
    const folder = `${i + 1}-${s.id}`;
    const languages: Partial<Record<Language, SourceLanguageStage>> = {};
    for (const lang of LANGUAGES) {
      const base = path.join(dir, lang, 'stages', folder);
      languages[lang] = {
        present: isDir(base),
        starter: readTree(path.join(base, 'starter')),
        solution: readTree(path.join(base, 'solution')),
        tests: readTree(path.join(base, 'tests')),
      };
    }
    const stage: SourceStage = { id: s.id, title: s.title, folder, readme: readText(path.join(dir, 'stages', folder, 'README.md')) ?? '', languages };
    const hints = readText(path.join(dir, 'stages', folder, 'hints.md'));
    if (hints !== undefined) stage.hints = hints;
    return stage;
  });

  const expected = new Set(stages.map((s) => s.folder));
  const extraFolders: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (!isDir(full)) continue;
    if (name === 'stages') {
      for (const f of readdirSync(full).sort()) if (!expected.has(f)) extraFolders.push(`stages/${f}`);
    } else if ((LANGUAGES as string[]).includes(name)) {
      if (!meta.languages.includes(name as Language)) extraFolders.push(name);
      else for (const f of isDir(path.join(full, 'stages')) ? readdirSync(path.join(full, 'stages')).sort() : []) if (!expected.has(f)) extraFolders.push(`${name}/stages/${f}`);
    } else {
      extraFolders.push(name);
    }
  }

  return { source: { dir, slug, yamlSlug: y.slug, meta, stages, extraFolders }, issues: [] };
}
