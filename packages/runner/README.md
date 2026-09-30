# lldlab-runner

Runs LLDLab problem tests in a Web Worker: JavaScript and TypeScript (Sucrase, no type checking), Python (Pyodide 0.29.5), Go (Yaegi, `lldlab-yaegi-runtime@0.2.1`).

```ts
import { runTests, runInputFor } from 'lldlab-runner';

const out = await runTests('go', runInputFor(problem, 'go', workspaceFiles, stageIndex), { timeoutMs: problem.meta.timeLimitMs, problem: problem.slug });
// out.results: [{ name, stage, file, passed, error?, ms }]
```

Workers are created with `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`; your bundler must emit `dist/worker.js` as a worker asset. After a runtime loads, the worker removes `fetch`, `XMLHttpRequest`, `WebSocket` and other network globals. Serve the worker with a Content-Security-Policy that limits `connect-src` and `script-src` to `https://cdn.jsdelivr.net`, since `import()` can't be removed from inside the worker.
