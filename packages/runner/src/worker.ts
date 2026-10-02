import { PYODIDE_INDEX_URL, WASM_EXEC_URL, YAEGI_WASM_URL } from './config';
import { withChecks } from './checks';
import { executeGo, type YaegiRun } from './go';
import { executeJs } from './js';
import { lockdown } from './lockdown';
import { capOutput } from './output';
import { executePython, type PyodideLike } from './python';
import type { Language, RunInput, RunOutput } from './types';

type Runner = (input: RunInput) => Promise<RunOutput>;

// Typed locally: adding lib "webworker" to a project that uses lib "dom" causes duplicate-declaration errors.
type InMessage = { type: 'warmup'; lang: Language } | { type?: undefined; lang: Language; input: RunInput };

const ctx = self as unknown as {
  onmessage: ((e: { data: InMessage }) => void) | null;
  postMessage(msg: unknown): void;
};

let pyodide: Promise<PyodideLike> | null = null;
let yaegi: Promise<YaegiRun> | null = null;
let locked = false;

type LoadPyodide = (opts: { indexURL: string }) => Promise<PyodideLike>;

// Classic workers (Turbopack) can't load pyodide.mjs; use pyodide.js via importScripts, else the ESM build.
async function importPyodide(): Promise<LoadPyodide> {
  const g = self as unknown as { importScripts?: (url: string) => void; loadPyodide?: LoadPyodide };
  try {
    g.importScripts?.(`${PYODIDE_INDEX_URL}pyodide.js`);
    if (g.loadPyodide) return g.loadPyodide;
  } catch {
    // module worker
  }
  const m = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${PYODIDE_INDEX_URL}pyodide.mjs`);
  return m.loadPyodide as LoadPyodide;
}

function loadPyodideOnce(): Promise<PyodideLike> {
  pyodide ??= importPyodide()
    .then((load) => load({ indexURL: PYODIDE_INDEX_URL }))
    .catch((e) => {
      pyodide = null; // allow retry on next run
      throw e;
    });
  return pyodide;
}

function loadYaegiOnce(): Promise<YaegiRun> {
  yaegi ??= (async () => {
    await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ WASM_EXEC_URL);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    const go = new g.Go();
    const { instance } = await WebAssembly.instantiateStreaming(fetch(YAEGI_WASM_URL), go.importObject);
    void go.run(instance);
    return ((req) => g.yaegiRun(req)) as YaegiRun;
  })().catch((e) => {
    yaegi = null;
    throw e;
  });
  return yaegi;
}

// One language per worker: once its runtime is loaded, nothing needs the network again.
async function runnerFor(lang: Language): Promise<Runner> {
  let runner: Runner;
  switch (lang) {
    case 'javascript':
    case 'typescript':
      runner = executeJs;
      break;
    case 'python': {
      const py = await loadPyodideOnce();
      runner = (input) => executePython(py, input);
      break;
    }
    case 'go': {
      const run = await loadYaegiOnce();
      runner = (input) => executeGo(run, input);
      break;
    }
  }
  if (!locked) {
    lockdown(self);
    locked = true;
  }
  return runner;
}

ctx.onmessage = async (e) => {
  if (e.data.type === 'warmup') {
    try {
      await runnerFor(e.data.lang);
      ctx.postMessage({ type: 'ready' });
    } catch (err) {
      ctx.postMessage({ type: 'loadFailed', error: `Failed to load ${e.data.lang} runtime: ${err instanceof Error ? err.message : String(err)}` });
    }
    return;
  }
  const { lang, input } = e.data;
  // Checks need no runtime: they're reported even when Pyodide or Yaegi fails to load. Running them here, inside
  // the worker, keeps a pathological pattern bounded by runTests' start timeout instead of freezing the page.
  const checked = (output: RunOutput) => withChecks(input, output);
  let run: Runner;
  try {
    run = await runnerFor(lang);
  } catch (err) {
    const output: RunOutput = {
      results: [],
      stdout: '',
      error: `Failed to load ${lang} runtime: ${err instanceof Error ? err.message : String(err)}`,
      runtimeLoadFailed: true,
    };
    ctx.postMessage({ type: 'done', output: checked(output) });
    return;
  }
  ctx.postMessage({ type: 'started' });
  let output: RunOutput;
  try {
    output = await run(input);
  } catch (err) {
    // Executors return errors as output; a throw means the runtime itself broke, so ask for a fresh worker.
    output = { results: [], stdout: '', error: err instanceof Error ? err.message : String(err), workerDead: true };
  }
  ctx.postMessage({ type: 'done', output: checked({ ...output, stdout: capOutput(output.stdout) }) });
};
