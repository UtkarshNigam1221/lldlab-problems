import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPyodide } from 'pyodide';
import {
  executeGo,
  executeJs,
  executePython,
  WASM_EXEC_URL,
  YAEGI_WASM_URL,
  type Language,
  type PyodideLike,
  type RunInput,
  type RunOutput,
  type YaegiRun,
} from 'lldlab-runner';

export type Execute = (input: RunInput) => Promise<RunOutput>;

/** Yaegi from a local `npm run build:yaegi` output, or the pinned published runtime. */
async function loadYaegi(dir?: string): Promise<YaegiRun> {
  let execPath: string;
  let wasm: ArrayBuffer | Buffer;
  if (dir) {
    execPath = path.join(dir, 'wasm_exec.js');
    wasm = readFileSync(path.join(dir, 'yaegi.wasm'));
  } else {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'yaegi-'));
    execPath = path.join(tmp, 'wasm_exec.js');
    writeFileSync(execPath, await (await fetch(WASM_EXEC_URL)).text());
    wasm = await (await fetch(YAEGI_WASM_URL)).arrayBuffer();
  }
  await import(pathToFileURL(execPath).href);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  const go = new g.Go();
  const { instance } = await WebAssembly.instantiate(wasm, go.importObject);
  void go.run(instance);
  return (req) => g.yaegiRun(req);
}

export async function loadRuntimes(langs: Language[], opts: { yaegiDir?: string } = {}): Promise<Partial<Record<Language, Execute>>> {
  const out: Partial<Record<Language, Execute>> = {};
  for (const lang of new Set(langs)) {
    if (lang === 'javascript' || lang === 'typescript') out[lang] = executeJs;
    if (lang === 'python') {
      const py = (await loadPyodide()) as unknown as PyodideLike;
      out.python = (input) => executePython(py, input);
    }
    if (lang === 'go') {
      const run = await loadYaegi(opts.yaegiDir);
      out.go = (input) => executeGo(run, input);
    }
  }
  return out;
}
