import path from 'node:path';
import { globToRegExp, type Files, type Language } from 'lldlab-runner';
import type { Issue } from '../issues';
import type { ProblemSource } from '../load';

// A group containing a quantifier, itself quantified: (a+)+, (a*)*, (a+){2,}. The classic catastrophic-backtracking shape.
const NESTED_QUANTIFIER = /\((?:[^()\\]|\\.)*[+*}]\)\s*[+*{]/;

function starterThrough(src: ProblemSource, lang: Language, stage: number): Files {
  const out: Files = {};
  for (let i = 0; i <= stage; i++) Object.assign(out, src.stages[i].languages[lang]!.starter);
  return out;
}

const matchesSome = (glob: string, files: Files) => Object.keys(files).some((f) => globToRegExp(glob).test(f));

/** Workspace modules a test file imports, as paths without extension (relative to the workspace root). */
function importsOf(lang: Language, src: string): string[] {
  const found: string[] = [];
  const add = (spec: string) => found.push(spec);
  if (lang === 'javascript' || lang === 'typescript') {
    for (const m of src.matchAll(/(?:from\s+|require\(\s*|import\(\s*)['"](\.\.\/[^'"]+)['"]/g)) add(path.posix.normalize(m[1].slice(3)));
  } else if (lang === 'python') {
    for (const m of src.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm)) add((m[1] ?? m[2]).replace(/\./g, '/'));
  } else {
    for (const m of src.matchAll(/"app\/([^"]+)"/g)) add(m[1]);
  }
  return found;
}

const stripExt = (p: string) => p.replace(/\.[^./]+$/, '');

export function checkDesign(src: ProblemSource): Issue[] {
  const out: Issue[] = [];
  const err = (message: string) => out.push({ problem: src.slug, message });
  const warn = (message: string) => out.push({ problem: src.slug, message, level: 'warning' });

  if (src.review !== undefined && !src.review.trim()) err('review.md is empty');

  src.stages.forEach((s, i) => {
    if (i === 0 && s.frozen.length) err(`stage ${s.id}: frozen files need an earlier part; use readonly for files that are never editable`);
    for (const c of s.checks) {
      const label = `stage ${s.id}: check "${c.message}"`;
      try {
        new RegExp(c.forbid);
      } catch (e) {
        err(`${label}: invalid pattern: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
      if (NESTED_QUANTIFIER.test(c.forbid)) err(`${label}: pattern /${c.forbid}/ nests quantifiers; it can take exponential time`);
      for (const lang of src.meta.languages) {
        const files = starterThrough(src, lang, i);
        for (const g of c.in) if (!matchesSome(g, files)) err(`${label}: in glob "${g}" matches no ${lang} starter file`);
      }
    }
    for (const g of s.frozen) {
      for (const lang of src.meta.languages) if (!matchesSome(g, starterThrough(src, lang, i))) err(`stage ${s.id}: frozen glob "${g}" matches no ${lang} starter file`);
    }
  });

  for (const lang of src.meta.languages) {
    const entry = src.meta.entry[lang];
    if (!entry) continue;
    const allowed = lang === 'go' ? path.posix.dirname(entry) : stripExt(entry);
    // Only workspace modules count: Python's `from datetime import …` is the standard library, not the workspace.
    const roots = new Set(Object.keys(starterThrough(src, lang, src.stages.length - 1)).map((f) => stripExt(f.split('/')[0])));
    for (const s of src.stages) {
      for (const [file, text] of Object.entries(s.languages[lang]!.tests)) {
        for (const mod of importsOf(lang, text)) {
          if (!roots.has(mod.split('/')[0])) continue;
          if (stripExt(mod) !== allowed) warn(`${lang}/stages/${s.folder}/tests/${file} imports ${mod}; tests should only use the entry point ${entry}`);
        }
      }
    }
  }
  return out;
}
