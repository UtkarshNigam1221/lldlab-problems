import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadProblem, type ProblemSource } from '../load';
import { checkDesign } from './design';

const promo = () => structuredClone(loadProblem(fileURLToPath(new URL('../../fixtures/design/promo', import.meta.url))).source!) as ProblemSource;
const errors = (src: ProblemSource) => checkDesign(src).filter((i) => i.level !== 'warning').map((i) => i.message);
const warnings = (src: ProblemSource) => checkDesign(src).filter((i) => i.level === 'warning').map((i) => i.message);

describe('checkDesign', () => {
  it('passes the design fixture', () => {
    expect(checkDesign(promo())).toEqual([]);
  });

  it('rejects a pattern that does not compile', () => {
    const src = promo();
    src.stages[0].checks[0].forbid = '(';
    expect(errors(src)).toEqual([expect.stringMatching(/^stage codes: check "Checkout shouldn't know specific promotions": invalid pattern: /)]);
  });

  it('rejects nested quantifiers', () => {
    const src = promo();
    src.stages[0].checks[0].forbid = '(a+)+$';
    expect(errors(src)).toEqual([`stage codes: check "Checkout shouldn't know specific promotions": pattern /(a+)+$/ nests quantifiers; it can take exponential time`]);
  });

  it('reports the language where a glob matches no starter file', () => {
    const src = promo();
    src.stages[0].checks[0].in = ['checkout_service.py'];
    src.stages[1].frozen = ['nothing/**'];
    expect(errors(src)).toEqual([
      'stage codes: check "Checkout shouldn\'t know specific promotions": in glob "checkout_service.py" matches no javascript starter file',
      'stage stack: frozen glob "nothing/**" matches no javascript starter file',
    ]);
  });

  it('rejects frozen files on the first stage', () => {
    const src = promo();
    src.stages[0].frozen = ['checkout.js'];
    expect(errors(src)).toContain('stage codes: frozen files need an earlier part; use readonly for files that are never editable');
  });

  it('rejects an empty review.md', () => {
    const src = promo();
    src.review = '  \n';
    expect(errors(src)).toEqual(['review.md is empty']);
  });

  it('ignores imports that are not workspace modules', () => {
    const src = promo();
    src.stages[0].languages.javascript!.tests['checkout.test.js'] = "import { checkout } from '../checkout';\nimport x from '../vendor/x';\ntest('x', () => {});";
    expect(warnings(src)).toEqual([]);
  });

  it('warns when a test imports past the entry point', () => {
    const src = promo();
    src.stages[0].languages.javascript!.tests['checkout.test.js'] = "import { price } from '../promotions';\ntest('x', () => {});";
    expect(errors(src)).toEqual([]);
    expect(warnings(src)).toEqual(['javascript/stages/1-codes/tests/checkout.test.js imports promotions; tests should only use the entry point checkout.js']);
  });
});
