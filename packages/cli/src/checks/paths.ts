import { workspacePathError, type Language } from 'lldlab-runner';
import type { Issue } from '../issues';
import type { ProblemSource } from '../load';

const TEST_EXT: Record<Language, string> = { javascript: '.js', typescript: '.ts', python: '.py', go: '.go' };

export function checkPaths(src: ProblemSource): Issue[] {
  const out: string[] = [];
  for (const lang of src.meta.languages) {
    const earlierStarter = new Set<string>();
    const earlierTests = new Set<string>();
    src.stages.forEach((s, i) => {
      const ls = s.languages[lang]!;
      const base = `${lang}/stages/${s.folder}`;
      for (const kind of ['starter', 'solution'] as const) {
        const err = workspacePathError(ls[kind]);
        if (err) out.push(`${base}/${kind}: ${err}`);
      }
      for (const p of Object.keys(ls.starter)) {
        if (i > 0 && earlierStarter.has(p)) out.push(`${base}/starter/${p} already exists in an earlier stage; later stages may only add files`);
      }
      for (const f of Object.keys(ls.tests)) {
        if (f.includes('/')) out.push(`${base}/tests/${f}: test files must be directly in tests/`);
        else if (!f.endsWith(TEST_EXT[lang])) out.push(`${base}/tests/${f}: ${lang} test files must end in ${TEST_EXT[lang]}`);
        if (earlierTests.has(f)) out.push(`${base}/tests/${f} has the same name as a test in an earlier stage`);
      }
      Object.keys(ls.starter).forEach((p) => earlierStarter.add(p));
      Object.keys(ls.tests).forEach((f) => earlierTests.add(f));
    });
  }
  return out.map((message) => ({ problem: src.slug, message }));
}
