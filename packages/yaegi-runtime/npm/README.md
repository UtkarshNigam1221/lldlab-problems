# lldlab-yaegi-runtime

[Yaegi](https://github.com/traefik/yaegi) (Go interpreter) compiled to `GOOS=js GOARCH=wasm`, plus Go's `wasm_exec.js`. Built from `packages/yaegi-runtime` in [lldlab-problems](https://github.com/UtkarshNigam1221/lldlab-problems).

```js
// In a (Web) Worker:
await import('https://cdn.jsdelivr.net/npm/lldlab-yaegi-runtime@0.2.2/wasm_exec.js');
const go = new Go();
const { instance } = await WebAssembly.instantiateStreaming(
  fetch('https://cdn.jsdelivr.net/npm/lldlab-yaegi-runtime@0.2.2/yaegi.wasm'), go.importObject);
go.run(instance);
const { stdout, results, error } = globalThis.yaegiRun(JSON.stringify({ helper, workspace, tests }));
```

- `workspace`: `{ path: source }`. Root-level `.go` files are `package main`; files in folders are packages imported as `app/<folder>`.
- `tests`: `[{ stage, file, src }]`, each a `package main` file defining `func lldlabTests()`.
- `net` (except the parsing-only `net/url` and `net/netip`), `os/exec`, `os/signal`, `plugin`, `syscall` and `unsafe` can't be imported.

0.1.0 (single-file `yaegiRun(files, entry)`) stays published for older clients.

Licenses: Yaegi is Apache-2.0 (`LICENSE-yaegi`); `wasm_exec.js` and the Go runtime are BSD-3-Clause (`LICENSE-go`).
