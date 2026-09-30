import { TESTS_DIR, workspacePathError } from './paths';
import type { RunInput, RunOutput } from './types';

export interface PyodideLike {
  runPythonAsync(code: string, options?: { globals?: unknown }): Promise<unknown>;
  FS: { mkdirTree(path: string): void; writeFile(path: string, data: string): void };
  setStdout(o: { batched: (s: string) => void }): void;
  setStderr(o: { batched: (s: string) => void }): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globals: { get(name: string): any };
}

const ROOT = '/workspace';

// Runs first on every call: forgets modules and files from the previous run, then defines the harness.
const PRELUDE = `
import sys, os, shutil, time, json, importlib
# Same-size rewrites within one second would otherwise reuse a stale .pyc.
sys.dont_write_bytecode = True

def _lldlab_in_workspace(mod):
    f = getattr(mod, "__file__", None) or ""
    if f.startswith("${ROOT}/"):
        return True
    return any(str(p) == "${ROOT}" or str(p).startswith("${ROOT}/") for p in (getattr(mod, "__path__", None) or []))

for _name, _mod in list(sys.modules.items()):
    if _mod is not None and _lldlab_in_workspace(_mod):
        del sys.modules[_name]
shutil.rmtree("${ROOT}", ignore_errors=True)
os.makedirs("${ROOT}", exist_ok=True)
if "${ROOT}" not in sys.path:
    sys.path.insert(0, "${ROOT}")

_lldlab_results = []
_lldlab_current = {"stage": "", "file": ""}

def test(name, fn=None):
    def run(f):
        start = time.perf_counter()
        r = {"name": str(name), "stage": _lldlab_current["stage"], "file": _lldlab_current["file"], "passed": True}
        try:
            f()
        except Exception as e:
            r["passed"] = False
            r["error"] = f"{type(e).__name__}: {e}"
        r["ms"] = (time.perf_counter() - start) * 1000
        _lldlab_results.append(r)
        return f
    return run(fn) if fn is not None else run

def assertEqual(actual, expected):
    if actual != expected:
        raise AssertionError(f"expected {expected!r}, got {actual!r}")

def _lldlab_run(test_files):
    importlib.invalidate_caches()
    for stage, file, path in test_files:
        _lldlab_current["stage"] = stage
        _lldlab_current["file"] = file
        g = {"__name__": "__lldlab_test__", "__file__": path, "test": test, "assertEqual": assertEqual}
        with open(path) as fh:
            exec(compile(fh.read(), path, "exec"), g)
    return json.dumps(_lldlab_results)
`;

/** Keep the traceback from the workspace files onward; drop Pyodide internals. */
function cleanError(message: string): string {
  const lines = message.split('\n');
  const first = lines.findIndex((l) => l.includes(`File "${ROOT}/`));
  return (first >= 0 ? lines.slice(first) : lines).join('\n').trim();
}

/** Pyodide's FS throws ErrnoError objects that aren't Errors; String() would give "[object Object]". */
function describeThrown(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const o = e as { name?: unknown; code?: unknown; message?: unknown };
    const parts = [o.name, o.code ?? o.message].filter((x) => typeof x === 'string' && x);
    if (parts.length) return parts.join(' ');
    try {
      return JSON.stringify(e);
    } catch {
      // fall through
    }
  }
  return String(e);
}

export async function executePython(py: PyodideLike, input: RunInput): Promise<RunOutput> {
  const pathErr = workspacePathError(input.files);
  if (pathErr) return { results: [], stdout: '', error: pathErr };

  let stdout = '';
  const sink = { batched: (s: string) => { stdout += s + '\n'; } };
  py.setStdout(sink);
  py.setStderr(sink);

  const ns = py.globals.get('dict')();
  try {
    await py.runPythonAsync(PRELUDE, { globals: ns });
    const write = (rel: string, src: string) => {
      const full = `${ROOT}/${rel}`;
      py.FS.mkdirTree(full.slice(0, full.lastIndexOf('/')));
      py.FS.writeFile(full, src);
    };
    for (const [p, src] of Object.entries(input.files)) write(p, src);
    const list: [string, string, string][] = [];
    for (const s of input.tests) {
      for (const [file, src] of Object.entries(s.files)) {
        write(`${TESTS_DIR}/${file}`, src);
        list.push([s.stage, file, `${ROOT}/${TESTS_DIR}/${file}`]);
      }
    }
    const json = (await py.runPythonAsync(`_lldlab_run(json.loads(${JSON.stringify(JSON.stringify(list))}))`, { globals: ns })) as string;
    return { results: JSON.parse(json), stdout };
  } catch (e) {
    const out: RunOutput = { results: [], stdout, error: cleanError(describeThrown(e)) };
    if ((e as { pyodide_fatal_error?: boolean })?.pyodide_fatal_error) out.workerDead = true;
    return out;
  } finally {
    ns.destroy?.();
  }
}
