import type { Language } from 'lldlab-runner';
import type { Issue } from '../issues';
import type { ProblemSource } from '../load';

// ponytail: regexes over source text, so a banned name inside a comment or string is flagged too;
// the runner's worker lockdown is the real protection, this is an early warning for reviewers.
const JS: { re: RegExp; what: string }[] = [
  { re: /\bfetch\s*\(/, what: 'fetch' },
  { re: /\bXMLHttpRequest\b/, what: 'XMLHttpRequest' },
  { re: /\bWebSocket\b/, what: 'WebSocket' },
  { re: /\bEventSource\b/, what: 'EventSource' },
  { re: /\bimportScripts\b/, what: 'importScripts' },
  { re: /\beval\s*\(/, what: 'eval' },
  { re: /\bFunction\s*\(/, what: 'Function(' },
  { re: /\brequire\s*\(/, what: 'require(' },
  { re: /\bimport\s*\(\s*['"`](?!\.\.?\/)/, what: 'a dynamic import of a package or URL' },
  { re: /\bfrom\s+['"](?!\.\.?\/)/, what: 'an import of a package (use a relative path)' },
  { re: /^\s*import\s+['"](?!\.\.?\/)/m, what: 'an import of a package (use a relative path)' },
];

const PY_BANNED = new Set(['js', 'pyodide', 'pyodide_js', 'urllib', 'http', 'socket', 'subprocess', 'importlib', 'builtins', 'ctypes']);
// __import__("js") and friends reach the same modules without an import statement.
const PY_DYNAMIC_IMPORT = /\b__import__\s*\(/;
const PY_IMPORT = /^\s*(?:from\s+([A-Za-z_][\w.]*)\s+import|import\s+([A-Za-z_][\w.]*(?:\s*,\s*[A-Za-z_][\w.]*)*))/gm;

const GO_BANNED = /^(net|os\/exec|os\/signal|plugin|syscall|unsafe)(\/|$)/;
// Pure parsing packages the runtime allows under net/ (packages/yaegi-runtime/runner.go allowedUnderBlocked).
const GO_ALLOWED = new Set(['net/url', 'net/netip']);
const GO_IMPORT_BLOCK = /\bimport\s*\(([\s\S]*?)\)/g;
const GO_IMPORT_LINE = /\bimport\s+(?:[\w.]+\s+)?"([^"]+)"/g;

function jsFindings(code: string): string[] {
  return [...new Set(JS.filter((b) => b.re.test(code)).map((b) => `uses ${b.what}`))];
}

function pyFindings(code: string): string[] {
  const found = new Set<string>();
  for (const m of code.matchAll(PY_IMPORT)) {
    const mods = m[1] ? [m[1]] : m[2].split(',').map((x) => x.trim());
    for (const mod of mods) {
      const top = mod.split('.')[0];
      if (PY_BANNED.has(top)) found.add(`imports ${top}`);
    }
  }
  if (PY_DYNAMIC_IMPORT.test(code)) found.add('uses __import__');
  return [...found];
}

function goFindings(code: string): string[] {
  const paths: string[] = [];
  for (const m of code.matchAll(GO_IMPORT_BLOCK)) for (const q of m[1].matchAll(/"([^"]+)"/g)) paths.push(q[1]);
  for (const m of code.matchAll(GO_IMPORT_LINE)) paths.push(m[1]);
  return [...new Set(paths.filter((p) => GO_BANNED.test(p) && !GO_ALLOWED.has(p)).map((p) => `imports ${p}`))];
}

const FIND: Record<Language, (code: string) => string[]> = { javascript: jsFindings, typescript: jsFindings, python: pyFindings, go: goFindings };

export function checkBanned(src: ProblemSource): Issue[] {
  const out: string[] = [];
  for (const lang of src.meta.languages) {
    for (const s of src.stages) {
      const ls = s.languages[lang]!;
      for (const kind of ['starter', 'solution', 'tests'] as const) {
        for (const [p, code] of Object.entries(ls[kind])) {
          for (const f of FIND[lang](code)) out.push(`${lang}/stages/${s.folder}/${kind}/${p} ${f}`);
        }
      }
    }
  }
  return out.map((message) => ({ problem: src.slug, message }));
}
