import type { Language, RunInput, RunOutput } from './types';

export interface WorkerLike {
  postMessage(msg: unknown): void;
  terminate(): void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: { message?: string }) => void) | null;
}

type WorkerMessage =
  | { type: 'started' }
  | { type: 'done'; output: RunOutput }
  | { type: 'ready' }
  | { type: 'loadFailed'; error: string }
  | { type: 'crash'; message: string };

type Listener = (m: WorkerMessage) => void;

interface Slot {
  worker: WorkerLike;
  listeners: Set<Listener>;
}

let factory: () => WorkerLike = () =>
  new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }) as unknown as WorkerLike;

const slots = new Map<Language, Slot>();

/** Test hook: replace how workers are created. */
export function setWorkerFactory(f: () => WorkerLike): void {
  factory = f;
  slots.clear();
}

function slotFor(lang: Language): Slot {
  let slot = slots.get(lang);
  if (!slot) {
    const s: Slot = { worker: factory(), listeners: new Set() };
    s.worker.onmessage = (e) => [...s.listeners].forEach((l) => l(e.data as WorkerMessage));
    s.worker.onerror = (e) => [...s.listeners].forEach((l) => l({ type: 'crash', message: e.message || 'Runner crashed' }));
    slots.set(lang, s);
    slot = s;
  }
  return slot;
}

function drop(lang: Language, slot: Slot) {
  slot.worker.terminate();
  if (slots.get(lang) === slot) slots.delete(lang);
}

/** Start downloading the language runtime without running code. */
export function warmUp(lang: Language): Promise<{ ok: true } | { ok: false; error: string }> {
  const slot = slotFor(lang);
  return new Promise((resolve) => {
    const listener: Listener = (m) => {
      if (m.type === 'ready') resolve({ ok: true });
      else if (m.type === 'loadFailed') resolve({ ok: false, error: m.error });
      else if (m.type === 'crash') resolve({ ok: false, error: m.message });
      else return;
      slot.listeners.delete(listener);
    };
    slot.listeners.add(listener);
    slot.worker.postMessage({ type: 'warmup', lang });
  });
}

// JS/TS workers are cheap: a fresh one per run means code left running (timers, patched globals,
// onmessage) can't leak into or hang the next run. Pyodide/Yaegi are expensive to load, so they're reused.
const FRESH_PER_RUN = new Set<Language>(['javascript', 'typescript']);
// Upper bound for the runtime to start (download + init) before the code limit applies.
const START_TIMEOUT_MS = 60_000;

// ponytail: one in-flight run per language (UI disables Run while running); queue runs if that changes.
export function runTests(
  lang: Language,
  input: RunInput,
  { timeoutMs = 5000, startTimeoutMs = START_TIMEOUT_MS }: { timeoutMs?: number; startTimeoutMs?: number } = {},
): Promise<RunOutput> {
  const slot = slotFor(lang);
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (out: RunOutput, dropWorker: boolean) => {
      clearTimeout(timer);
      slot.listeners.delete(listener);
      if (dropWorker || FRESH_PER_RUN.has(lang)) drop(lang, slot);
      resolve(out);
    };
    const listener: Listener = (m) => {
      if (m.type === 'started') {
        // The limit covers the code, not the Pyodide/Yaegi download.
        clearTimeout(timer);
        timer = setTimeout(() => finish({ results: [], stdout: '', error: `Timed out after ${timeoutMs} ms` }, true), timeoutMs);
      } else if (m.type === 'done') {
        finish(m.output, !!m.output.workerDead);
      } else if (m.type === 'crash') {
        finish({ results: [], stdout: '', error: m.message }, true);
      }
    };
    slot.listeners.add(listener);
    // A worker that never reports "started" (stuck, or runtime hung while loading) must not hang the UI.
    timer = setTimeout(
      () => finish({ results: [], stdout: '', error: `The ${lang} runtime did not start within ${Math.round(startTimeoutMs / 1000)} s` }, true),
      startTimeoutMs,
    );
    slot.worker.postMessage({ lang, input });
  });
}
