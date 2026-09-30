import type { Issue } from '../issues';
import type { ProblemSource } from '../load';

export function checkStructure(src: ProblemSource): Issue[] {
  const out: string[] = [];
  if (src.yamlSlug !== src.slug) out.push(`slug "${src.yamlSlug}" in problem.yaml must match the folder name "${src.slug}"`);
  for (const f of src.extraFolders) out.push(`unexpected folder ${f}: not listed in problem.yaml`);
  for (const s of src.stages) if (!s.readme.trim()) out.push(`stages/${s.folder}/README.md is missing or empty`);
  for (const lang of src.meta.languages) {
    src.stages.forEach((s, i) => {
      const ls = s.languages[lang]!;
      const base = `${lang}/stages/${s.folder}`;
      if (!ls.present) {
        out.push(`${base} is missing`);
        return;
      }
      if (!Object.keys(ls.tests).length) out.push(`${base}/tests has no test files`);
      if (!Object.keys(ls.solution).length) out.push(`${base}/solution is empty`);
      if (i === 0 && !Object.keys(ls.starter).length) out.push(`${base}/starter is empty`);
    });
    const entry = src.meta.entry[lang];
    const first = src.stages[0];
    if (!entry) out.push(`entry.${lang} is required`);
    else if (!(entry in first.languages[lang]!.starter)) out.push(`entry.${lang} "${entry}" is not in ${lang}/stages/${first.folder}/starter`);
  }
  for (const lang of Object.keys(src.meta.entry)) {
    if (!src.meta.languages.includes(lang as never)) out.push(`entry.${lang} is set but ${lang} is not in languages`);
  }
  return out.map((message) => ({ problem: src.slug, message }));
}
