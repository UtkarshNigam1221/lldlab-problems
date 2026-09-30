# lldlab-runner

Runs LLDLab problem tests in a Web Worker: JavaScript and TypeScript (Sucrase, no type checking), Python (Pyodide 0.29.5), Go (Yaegi, `lldlab-yaegi-runtime@0.2.2`).

```ts
import { runTests, runInputFor } from 'lldlab-runner';

const out = await runTests('go', runInputFor(problem, 'go', workspaceFiles, stageIndex), { timeoutMs: problem.meta.timeLimitMs, problem: problem.slug });
// out.results: [{ name, stage, file, passed, error?, ms }]
```

`runTests` creates `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })` by default; your bundler must emit `dist/worker.js` as a worker asset. Apps whose bundler doesn't emit workers from `node_modules` (Next.js/Turbopack) create their own entry file containing `import 'lldlab-runner/worker';` and pass `() => new Worker(new URL('./runner.worker.ts', import.meta.url), { type: 'module' })` to `setWorkerFactory`. After a runtime loads, the worker removes `fetch`, `XMLHttpRequest`, `WebSocket` and other network globals. Serve the worker with a Content-Security-Policy that limits `connect-src` and `script-src` to `https://cdn.jsdelivr.net`, since `import()` can't be removed from inside the worker.
