import { AssertionError, deepEqual, errorMessage, show } from './harness';
import { createRequire } from './modules';
import { TESTS_DIR, testsError, workspacePathError } from './paths';
import type { Files, RunInput, RunOutput, TestResult } from './types';

interface Pending {
  name: string;
  stage: string;
  file: string;
  fn: () => unknown;
}

/** Runs JavaScript and TypeScript workspaces; `.ts` files are type-stripped, never type-checked. */
export async function executeJs(input: RunInput): Promise<RunOutput> {
  const pathErr = workspacePathError(input.files) ?? testsError(input.tests);
  if (pathErr) return { results: [], stdout: '', error: pathErr };

  const pending: Pending[] = [];
  let current = { stage: '', file: '' };
  let stdout = '';
  const log = (...args: unknown[]) => {
    stdout += args.map((a) => (typeof a === 'string' ? a : show(a))).join(' ') + '\n';
  };
  const globals = {
    console: { log, info: log, warn: log, error: log, debug: log },
    test: (name: string, fn: () => unknown) => {
      pending.push({ name: String(name), ...current, fn });
    },
    assertEqual: (actual: unknown, expected: unknown) => {
      if (!deepEqual(actual, expected)) throw new AssertionError(`expected ${show(expected)}, got ${show(actual)}`);
    },
  };

  const files: Files = { ...input.files };
  const testFiles: { stage: string; file: string; path: string }[] = [];
  for (const s of input.tests) {
    for (const [file, src] of Object.entries(s.files)) {
      const path = `${TESTS_DIR}/${file}`;
      files[path] = src;
      testFiles.push({ stage: s.stage, file, path });
    }
  }

  const load = createRequire(files, globals);
  try {
    for (const t of testFiles) {
      current = { stage: t.stage, file: t.file };
      load(t.path);
    }
  } catch (e) {
    return { results: [], stdout, error: errorMessage(e) };
  }

  const results: TestResult[] = [];
  for (const t of pending) {
    const start = performance.now();
    try {
      await t.fn();
      results.push({ name: t.name, stage: t.stage, file: t.file, passed: true, ms: performance.now() - start });
    } catch (e) {
      const error = e instanceof AssertionError ? e.message : errorMessage(e);
      results.push({ name: t.name, stage: t.stage, file: t.file, passed: false, error, ms: performance.now() - start });
    }
  }
  return { results, stdout };
}
