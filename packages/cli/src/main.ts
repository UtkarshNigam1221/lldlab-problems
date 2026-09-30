import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import type { Language } from 'lldlab-runner';
import { checkCompiledSize, checkSlugsKept, compileProblem, fetchPublishedIndex, writeBuild } from './build';
import { staticChecks } from './checks/static';
import { runChecks } from './checks/run';
import type { Issue } from './issues';
import { listProblemDirs, loadProblem, type ProblemSource } from './load';
import { loadRuntimes } from './runtimes';

const USAGE = 'usage: lldlab-problems <validate|test|build> [slug...] [--root problems] [--out dist] [--published <index.json URL>] [--yaegi-dir <dir>]';

export async function main(argv: string[], io: { log(s: string): void } = console): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      root: { type: 'string', default: 'problems' },
      out: { type: 'string', default: 'dist' },
      published: { type: 'string', default: '' },
      'yaegi-dir': { type: 'string', default: process.env.LLDLAB_YAEGI_DIR ?? '' },
    },
  });
  const [command, ...slugs] = positionals;
  if (!['validate', 'test', 'build'].includes(command ?? '')) {
    io.log(USAGE);
    return 2;
  }

  const root = values.root!;
  const allDirs = listProblemDirs(root);
  const issues: Issue[] = [];
  const dirs = slugs.length ? slugs.map((s) => path.join(root, s)) : allDirs;
  const sources: ProblemSource[] = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      issues.push({ problem: path.basename(dir), message: 'no such problem folder' });
      continue;
    }
    const { source, issues: loadIssues } = loadProblem(dir);
    issues.push(...loadIssues);
    if (!source) continue;
    const found = [...staticChecks(source), ...checkCompiledSize(compileProblem(source))];
    issues.push(...found);
    sources.push(source);
  }

  if (values.published) {
    const published = await fetchPublishedIndex(values.published);
    if (published) issues.push(...checkSlugsKept(published, allDirs.map((d) => path.basename(d))));
    else io.log(`note: ${values.published} not published yet; skipped the slug check`);
  } else {
    io.log('note: no --published index; skipped the slug check');
  }

  if (command === 'test' && !issues.length) {
    const langs = [...new Set(sources.flatMap((s) => s.meta.languages))] as Language[];
    const runtimes = await loadRuntimes(langs, { yaegiDir: values['yaegi-dir'] || undefined });
    for (const src of sources) {
      const { issues: runIssues, reports } = await runChecks(src, runtimes);
      io.log(`${runIssues.length ? '✗' : '✓'} ${src.slug}`);
      for (const r of reports) io.log(`  ${r.ok ? '✓' : '✗'} ${r.lang} ${r.stage} ${r.kind}`);
      issues.push(...runIssues);
    }
  } else if (command !== 'test') {
    const bad = new Set(issues.map((i) => i.problem));
    for (const src of sources) if (!bad.has(src.slug)) io.log(`✓ ${src.slug}`);
  }

  for (const i of issues) io.log(`✗ ${i.problem}: ${i.message}`);
  if (issues.length) return 1;

  if (command === 'build') {
    const written = writeBuild(values.out!, sources.map(compileProblem));
    io.log(`wrote ${written.length} files to ${values.out}`);
  }
  return 0;
}
