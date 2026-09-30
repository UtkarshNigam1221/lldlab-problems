import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runTests, setWorkerFactory, warmUp, type WorkerLike } from './runTests';
import type { RunOutput } from './types';

const OK: RunOutput = { results: [{ name: 't', stage: 's', file: 'f', passed: true, ms: 1 }], stdout: '' };
const INPUT = { files: {}, tests: [] };

class FakeWorker implements WorkerLike {
  static created: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message?: string }) => void) | null = null;
  terminated = false;
  constructor(private script: (w: FakeWorker, msg: unknown) => void) {
    FakeWorker.created.push(this);
  }
  postMessage(msg: unknown) {
    this.script(this, msg);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: unknown, afterMs: number) {
    setTimeout(() => !this.terminated && this.onmessage?.({ data }), afterMs);
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeWorker.created = [];
});
afterEach(() => vi.useRealTimers());

describe('runTests', () => {
  it('starts a fresh worker when the problem changes, so state never leaks between problems', async () => {
    setWorkerFactory(() => new FakeWorker((w) => { w.emit({ type: 'started' }, 0); w.emit({ type: 'done', output: OK }, 1); }));
    const run = async (problem: string) => {
      const p = runTests('python', INPUT, { problem });
      await vi.runAllTimersAsync();
      return p;
    };
    await run('a');
    await run('a');
    expect(FakeWorker.created.length).toBe(1);
    await run('b');
    expect(FakeWorker.created.length).toBe(2);
    expect(FakeWorker.created[0].terminated).toBe(true);
  });

  it('sends the run input to the worker', async () => {
    const seen: unknown[] = [];
    setWorkerFactory(() => new FakeWorker((w, msg) => { seen.push(msg); w.emit({ type: 'started' }, 0); w.emit({ type: 'done', output: OK }, 1); }));
    const input = { files: { 'a.js': 'x' }, tests: [{ stage: 's', files: { 'a.test.js': 'y' } }] };
    const p = runTests('javascript', input);
    await vi.runAllTimersAsync();
    await p;
    expect(seen).toEqual([{ lang: 'javascript', input }]);
  });

  it('returns the worker output', async () => {
    setWorkerFactory(() => new FakeWorker((w) => { w.emit({ type: 'started' }, 0); w.emit({ type: 'done', output: OK }, 1); }));
    const p = runTests('javascript', INPUT);
    await vi.runAllTimersAsync();
    expect(await p).toEqual(OK);
  });

  it('timer starts after runtime is ready', async () => {
    // Runtime takes 10 s to load, test takes 100 ms; limit 1 s must not trip.
    setWorkerFactory(() => new FakeWorker((w) => { w.emit({ type: 'started' }, 10_000); w.emit({ type: 'done', output: OK }, 10_100); }));
    const p = runTests('python', INPUT, { timeoutMs: 1000 });
    await vi.runAllTimersAsync();
    expect(await p).toEqual(OK);
  });

  it('timeout terminates and next run uses a new worker', async () => {
    let first = true;
    setWorkerFactory(() => new FakeWorker((w) => {
      w.emit({ type: 'started' }, 0);
      if (!first) w.emit({ type: 'done', output: OK }, 1);
      first = false;
    }));
    const p1 = runTests('go', INPUT, { timeoutMs: 500 });
    await vi.runAllTimersAsync();
    expect(await p1).toEqual({ results: [], stdout: '', error: 'Timed out after 500 ms' });
    expect(FakeWorker.created[0].terminated).toBe(true);

    const p2 = runTests('go', INPUT, { timeoutMs: 500 });
    await vi.runAllTimersAsync();
    expect(await p2).toEqual(OK);
    expect(FakeWorker.created).toHaveLength(2);
  });

  it('reuses the Python worker (runtime is expensive to load)', async () => {
    setWorkerFactory(() => new FakeWorker((w) => { w.emit({ type: 'started' }, 0); w.emit({ type: 'done', output: OK }, 1); }));
    for (let i = 0; i < 2; i++) {
      const p = runTests('python', INPUT);
      await vi.runAllTimersAsync();
      await p;
    }
    expect(FakeWorker.created).toHaveLength(1);
  });

  it('worker crash resolves with an error and drops the worker', async () => {
    setWorkerFactory(() => new FakeWorker((w) => setTimeout(() => w.onerror?.({ message: 'boom' }), 0)));
    const p = runTests('typescript', INPUT);
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ results: [], stdout: '', error: 'boom' });
    expect(FakeWorker.created[0].terminated).toBe(true);
  });

  it('load failure is retried on next run', async () => {
    const LOAD_FAIL: RunOutput = { results: [], stdout: '', error: 'Failed to load python runtime: net', runtimeLoadFailed: true };
    let calls = 0;
    setWorkerFactory(() => new FakeWorker((w) => {
      calls++;
      if (calls === 1) w.emit({ type: 'done', output: LOAD_FAIL }, 0);
      else { w.emit({ type: 'started' }, 0); w.emit({ type: 'done', output: OK }, 1); }
    }));
    const p1 = runTests('python', INPUT);
    await vi.runAllTimersAsync();
    expect((await p1).runtimeLoadFailed).toBe(true);
    const p2 = runTests('python', INPUT);
    await vi.runAllTimersAsync();
    expect(await p2).toEqual(OK);
  });

  it('dead runtime drops the worker so the next run gets a fresh one', async () => {
    const DEAD: RunOutput = { results: [], stdout: '', error: 'Go program has already exited', workerDead: true };
    let calls = 0;
    setWorkerFactory(() => new FakeWorker((w) => {
      calls++;
      w.emit({ type: 'started' }, 0);
      w.emit({ type: 'done', output: calls === 1 ? DEAD : OK }, 1);
    }));
    const p1 = runTests('go', INPUT);
    await vi.runAllTimersAsync();
    expect((await p1).error).toBe('Go program has already exited');
    expect(FakeWorker.created[0].terminated).toBe(true);
    const p2 = runTests('go', INPUT);
    await vi.runAllTimersAsync();
    expect(await p2).toEqual(OK);
    expect(FakeWorker.created).toHaveLength(2);
  });

  it('warm-up resolves ok when the runtime is ready', async () => {
    setWorkerFactory(() => new FakeWorker((w) => w.emit({ type: 'ready' }, 5)));
    const p = warmUp('python');
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ ok: true });
  });

  it('warm-up reports load failures', async () => {
    setWorkerFactory(() => new FakeWorker((w) => w.emit({ type: 'loadFailed', error: 'net down' }, 5)));
    const p = warmUp('go');
    await vi.runAllTimersAsync();
    expect(await p).toEqual({ ok: false, error: 'net down' });
  });

  it('warm-up and run share the worker', async () => {
    // Warm-up answers after 1 s, the run after 1.1 s; both promises must settle on one worker.
    setWorkerFactory(() => new FakeWorker((w, msg) => {
      if ((msg as { type?: string }).type === 'warmup') { w.emit({ type: 'ready' }, 1000); return; }
      w.emit({ type: 'started' }, 1000);
      w.emit({ type: 'done', output: OK }, 1100);
    }));
    const warm = warmUp('python');
    const run = runTests('python', INPUT);
    await vi.runAllTimersAsync();
    expect(await warm).toEqual({ ok: true });
    expect(await run).toEqual(OK);
    expect(FakeWorker.created).toHaveLength(1);
  });
});

describe('runTests isolation (review fixes)', () => {
  it('uses a fresh worker for every JavaScript run so leftover code cannot leak into the next run', async () => {
    setWorkerFactory(() => new FakeWorker((w) => { w.emit({ type: 'started' }, 0); w.emit({ type: 'done', output: OK }, 1); }));
    const a = runTests('javascript', INPUT);
    await vi.runAllTimersAsync();
    await a;
    const b = runTests('javascript', INPUT);
    await vi.runAllTimersAsync();
    await b;
    expect(FakeWorker.created).toHaveLength(2);
    expect(FakeWorker.created[0].terminated).toBe(true);
  });

  it('fails a run whose worker never starts instead of hanging', async () => {
    // e.g. a previous run left `setTimeout(() => { while (true) {} })` behind.
    setWorkerFactory(() => new FakeWorker(() => {}));
    const p = runTests('python', INPUT, { timeoutMs: 1000, startTimeoutMs: 5000 });
    await vi.advanceTimersByTimeAsync(5001);
    const out = await p;
    expect(out.error).toMatch(/did not start/);
    expect(FakeWorker.created[0].terminated).toBe(true);
  });
});
