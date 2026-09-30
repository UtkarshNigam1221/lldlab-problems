import type { Files, Language, RunOutput, StageTests } from 'lldlab-runner';
import type { Issue } from '../issues';
import type { ProblemSource } from '../load';
import type { Execute } from '../runtimes';

export interface RunReport {
  lang: Language;
  stage: string;
  kind: 'solution' | 'starter';
  ok: boolean;
  message?: string;
  ms: number;
  output: RunOutput;
}

function starterThrough(src: ProblemSource, lang: Language, stage: number): Files {
  const out: Files = {};
  for (let i = 0; i <= stage; i++) Object.assign(out, src.stages[i].languages[lang]!.starter);
  return out;
}

function testsThrough(src: ProblemSource, lang: Language, stage: number): StageTests[] {
  return src.stages.slice(0, stage + 1).map((s) => ({ stage: s.id, files: s.languages[lang]!.tests }));
}

const describeFailures = (out: RunOutput) =>
  out.results
    .filter((r) => !r.passed)
    .map((r) => `${r.file} › ${r.name}: ${r.error}`)
    .join('; ');

// ponytail: runs in-process, so a solution with an infinite loop hangs until the CI job's timeout-minutes;
// run each problem in a child process with a kill timer if that becomes a problem for contributors.
export async function runChecks(src: ProblemSource, runtimes: Partial<Record<Language, Execute>>): Promise<{ issues: Issue[]; reports: RunReport[] }> {
  const issues: Issue[] = [];
  const reports: RunReport[] = [];
  const fail = (message: string) => issues.push({ problem: src.slug, message });
  const limit = Math.floor(src.meta.timeLimitMs / 2);

  for (const lang of src.meta.languages) {
    const exec = runtimes[lang];
    if (!exec) {
      fail(`${lang}: no runtime loaded`);
      continue;
    }
    for (let i = 0; i < src.stages.length; i++) {
      const s = src.stages[i];
      const tests = testsThrough(src, lang, i);
      const where = `${lang} stage ${s.id}`;

      let start = performance.now();
      const sol = await exec({ files: s.languages[lang]!.solution, tests });
      let ms = Math.round(performance.now() - start);
      let message: string | undefined;
      if (sol.error) message = `${where}: the solution doesn't run: ${sol.error}`;
      else if (!sol.results.length) message = `${where}: no tests ran`;
      else if (sol.results.some((r) => !r.passed)) message = `${where}: the solution fails ${describeFailures(sol)}`;
      else if (ms > limit) message = `${where}: the solution took ${ms} ms; the limit is ${limit} ms (half of timeLimitMs)`;
      if (message) fail(message);
      reports.push({ lang, stage: s.id, kind: 'solution', ok: !message, message, ms, output: sol });

      start = performance.now();
      const st = await exec({ files: starterThrough(src, lang, i), tests });
      ms = Math.round(performance.now() - start);
      message = undefined;
      // Stage 1 and every debug stage must run, so users see failing tests rather than a compile error.
      const mustRun = i === 0 || src.meta.kind === 'debug';
      if (st.error) {
        if (mustRun) message = `${where}: the starter must run without errors: ${st.error}`;
      } else if (!st.results.some((r) => r.stage === s.id && !r.passed)) {
        message = `${where}: the starter passes every ${s.id} test, so the tests don't check the requirement`;
      }
      if (message) fail(message);
      reports.push({ lang, stage: s.id, kind: 'starter', ok: !message, message, ms, output: st });
    }
  }
  return { issues, reports };
}
