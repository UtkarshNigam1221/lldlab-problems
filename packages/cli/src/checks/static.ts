import type { Issue } from '../issues';
import type { ProblemSource } from '../load';
import { checkBanned } from './banned';
import { checkDesign } from './design';
import { checkPaths } from './paths';
import { checkStructure } from './structure';

export { checkBanned, checkDesign, checkPaths, checkStructure };

export const MAX_FILES_PER_STAGE = 40;

export function checkFileCounts(src: ProblemSource): Issue[] {
  const out: Issue[] = [];
  for (const lang of src.meta.languages) {
    for (const s of src.stages) {
      const ls = s.languages[lang]!;
      const n = Object.keys(ls.starter).length + Object.keys(ls.tests).length;
      if (n > MAX_FILES_PER_STAGE) out.push({ problem: src.slug, message: `${lang}/stages/${s.folder} has ${n} starter and test files; the limit is ${MAX_FILES_PER_STAGE}` });
    }
  }
  return out;
}

export function staticChecks(src: ProblemSource): Issue[] {
  return [...checkStructure(src), ...checkPaths(src), ...checkBanned(src), ...checkFileCounts(src), ...checkDesign(src)];
}
