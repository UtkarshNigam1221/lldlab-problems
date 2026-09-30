# lldlab-runner

Runs LLDLab problem tests in a Web Worker: JavaScript and TypeScript (Sucrase, no type checking), Python (Pyodide 0.29.5), Go (Yaegi, `lldlab-yaegi-runtime@0.2.2`).

```ts
import { runTests, runInputFor } from 'lldlab-runner';

const out = await runTests('go', runInputFor(problem, 'go', workspaceFiles, stageIndex), { timeoutMs: problem.meta.timeLimitMs, problem: problem.slug });
// out.results: [{ name, stage, file, passed, error?, ms }]
```

`runTests` creates `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })` by default; your bundler must emit `dist/worker.js` as a worker asset. To serve the worker yourself, bundle `lldlab-runner/worker` into a same-origin file (for example `esbuild` an entry containing `import 'lldlab-runner/worker';` to `public/runner/worker.js`) and pass `() => new Worker('/runner/worker.js', { type: 'module' })` to `setWorkerFactory`. Don't rely on a bundler's `new Worker(new URL(...))` if it starts the worker from a `blob:` URL (Turbopack does): a `blob:` worker inherits the page's CSP, so the worker CSP below would not apply. After a runtime loads, the worker removes `fetch`, `XMLHttpRequest`, `WebSocket` and other network globals. Serve the worker with a Content-Security-Policy that limits `connect-src` and `script-src` to `https://cdn.jsdelivr.net`, since `import()` can't be removed from inside the worker.
