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

## Publishing

After **Checks** passes on a push to `main` (or when run by hand on `main`), `.github/workflows/publish.yml` validates and builds all problems, uploads `v/<version>/<slug>.json` (immutable, cached for a year) and then `index.json` (cached for 60 s) to the problems bucket, and checks that the live index matches. If `main` has already moved on, the older run skips and the newer commit publishes. Nothing is ever deleted, so users mid-problem keep their version. It needs the repo variables `PROBLEMS_URL`, `PROBLEMS_BUCKET` and `PROBLEMS_PUBLISH_ROLE_ARN` (outputs of `ProblemsStack` in `lldlab-frontend/infra`).

## Releasing

Two packages publish to npm from this repo. Each has its own tag and workflow, and publishes through npm Trusted Publishing (GitHub OIDC, with provenance), so no npm token is stored anywhere.

| Package | Version lives in | Tag | Workflow |
|---|---|---|---|
| `lldlab-yaegi-runtime` | `packages/yaegi-runtime/npm/package.json` | `yaegi-v<version>` | `.github/workflows/release-yaegi.yml` |
| `lldlab-runner` | `packages/runner/package.json` | `runner-v<version>` | `.github/workflows/release-runner.yml` |

### Release `lldlab-yaegi-runtime`

1. On a branch, bump `version` in `packages/yaegi-runtime/npm/package.json`.
2. Update the pin in `packages/runner/src/config.ts` (`YAEGI_BASE_URL`) to the new version, and bump `packages/runner/package.json` too: the runner has to ship the new pin. `config.test.ts` fails until the pin matches.
3. Open a PR, wait for **Checks**, and merge it.
4. Tag the merge commit on `main` and push the tag:
   ```bash
   git switch main && git pull
   git tag -a yaegi-v<version> -m "lldlab-yaegi-runtime <version>"
   git push origin yaegi-v<version>
   ```
   The workflow checks that the tag matches `package.json`, runs the Go tests, builds `yaegi.wasm` from source (no npm install), checks the tarball contains it, and publishes.
5. Release the runner (below) with the new pin. Publish the runtime first: the runner loads it from `cdn.jsdelivr.net/npm/lldlab-yaegi-runtime@<version>/`.

### Release `lldlab-runner`

1. On a branch, bump `version` in `packages/runner/package.json` and open a PR. Wait for **Checks** and merge it.
2. Tag the merge commit on `main` and push the tag:
   ```bash
   git switch main && git pull
   git tag -a runner-v<version> -m "lldlab-runner <version>"
   git push origin runner-v<version>
   ```
   The workflow checks that the tag matches `package.json`, installs with `--ignore-scripts`, runs the runner tests, builds `dist/` and publishes.

### After a release

- `npm view <package> version` shows the new version. It can take a few minutes to appear, and jsDelivr can take a few more.
- Tags are permanent: never move or re-push a published tag. If a release is broken, bump to the next patch version and release again.
- 0.x versions follow semver loosely: a minor bump may break the API, so the frontend pins exact versions.

### Setting up a new package (one time)

npm only lets you add a Trusted Publisher to a package that already exists, so the first version is published by hand:

1. `npm login`, then publish from the package folder with `npm publish --access public --otp=<code>` (for the runtime, run `npm run build:yaegi` first; for the runner, `npm run build --workspace packages/runner`).
2. Push the matching tag. Its workflow run fails at the publish step because that version already exists; that's expected.
3. On npmjs.com: the package, then **Settings**, then **Trusted Publisher**, then **GitHub Actions**, with owner `UtkarshNigam1221`, repository `lldlab-problems` and the package's workflow file. Also set **Publishing access** to require 2FA and disallow tokens.

MIT licensed.
