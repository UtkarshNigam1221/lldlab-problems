# lldlab-problems

Open-source low-level design problems for [LLDLab](https://lldlab.com). Problems are small multi-file projects with failing tests; you make them pass, one stage at a time. Some are `debug` problems: a working service with planted bugs.

- `problems/<slug>/`: the problems. See [CONTRIBUTING.md](CONTRIBUTING.md) to add one.
- `packages/runner`: `lldlab-runner`, the in-browser test runner the site uses.
- `packages/cli`: validates, tests and builds problems.
- `packages/yaegi-runtime`: the Go interpreter (Yaegi) compiled to WebAssembly.

```bash
npm ci
npm run problems -- test parking-lot
```

MIT licensed.
