import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { executeJs } from 'lldlab-runner';
import { loadProblem } from '../load';
import { runChecks } from './run';

const load = (p: string) => loadProblem(fileURLToPath(new URL(`../../fixtures/${p}`, import.meta.url))).source!;
const runtimes = { javascript: executeJs };

describe('runChecks', () => {
  it('passes a good multi-stage problem', async () => {
    const { issues, reports } = await runChecks(load('good/hello'), runtimes);
    expect(issues).toEqual([]);
    expect(reports.map((r) => `${r.stage}/${r.kind}:${r.ok}`)).toEqual(['greet/solution:true', 'greet/starter:true', 'shout/solution:true', 'shout/starter:true']);
  });

  it('flags a starter that already passes', async () => {
    const { issues } = await runChecks(load('weak/weak-tests'), runtimes);
    expect(issues.map((i) => i.message)).toEqual(['javascript stage greet: the starter passes every greet test, so the tests don\'t check the requirement']);
  });

  it('flags a failing solution with the failing test', async () => {
    const { issues } = await runChecks(load('broken-solution/bad-solution'), runtimes);
    expect(issues.map((i) => i.message)).toEqual(['javascript stage greet: the solution fails greet.test.js › greets by name: expected "Hello, Ada!", got "Hi, Ada"']);
  });

  it('flags a solution slower than half the time limit', async () => {
    const src = load('good/hello');
    src.meta.timeLimitMs = 100;
    src.stages[0].languages.javascript!.solution['greet.js'] = 'export function greet(n) { const t = Date.now(); while (Date.now() - t < 80) {} return `Hello, ${n}!`; }';
    const { issues } = await runChecks(src, runtimes);
    expect(issues.map((i) => i.message)).toContainEqual(expect.stringMatching(/^javascript stage greet: the solution took \d+ ms; the limit is 50 ms \(half of timeLimitMs\)$/));
  });

  it('requires debug starters to run without errors', async () => {
    const src = load('good/hello');
    src.meta.kind = 'debug';
    src.stages[0].languages.javascript!.starter['greet.js'] = 'export function greet(n) {';
    const { issues } = await runChecks(src, runtimes);
    expect(issues.map((i) => i.message)).toContainEqual(expect.stringMatching(/^javascript stage greet: the starter must run without errors: ModuleError: greet\.js: syntax error/));
  });

  it('reports a missing runtime', async () => {
    const src = load('good/hello');
    const { issues } = await runChecks(src, {});
    expect(issues.map((i) => i.message)).toEqual(['javascript: no runtime loaded']);
  });

  it('passes the design fixture, checks included', async () => {
    const { issues } = await runChecks(load('design/promo'), runtimes);
    expect(issues).toEqual([]);
  });

  it('fails a solution that breaks a forbid check', async () => {
    const src = load('design/promo');
    src.stages[0].languages.javascript!.solution['checkout.js'] = "import { price } from './promotions';\nexport function checkout(s, c) { return c.includes('SAVE10') ? Math.floor(s * 0.9) : s; }";
    const { issues } = await runChecks(src, runtimes);
    expect(issues.map((i) => i.message)).toContain(`javascript stage codes: the solution fails design check "Checkout shouldn't know specific promotions": checkout.js:2 matches /SAVE10|FLAT100/`);
  });

  it('fails a solution that edits a frozen file', async () => {
    const src = load('design/promo');
    src.stages[1].languages.javascript!.solution['checkout.js'] += '\n// tweak';
    const { issues } = await runChecks(src, runtimes);
    expect(issues.map((i) => i.message)).toContain('javascript stage stack: the solution fails design check "checkout.js unchanged since part 2": checkout.js changed since the part unlocked');
  });

  it('snapshots a frozen file that the same part\'s starter adds', async () => {
    const src = load('design/promo');
    src.stages[1].languages.javascript!.starter['rate.js'] = 'export const RATE = 1;\n';
    src.stages[1].languages.javascript!.solution['rate.js'] = 'export const RATE = 1;\n';
    src.stages[1].frozen = ['checkout.js', 'rate.js'];
    const { issues } = await runChecks(src, runtimes);
    expect(issues).toEqual([]);
  });
});
