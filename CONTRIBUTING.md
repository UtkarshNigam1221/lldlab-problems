# Contributing a problem

## Layout

```
problems/<slug>/
  problem.yaml
  stages/<n>-<id>/README.md      what to build in this stage (required)
  stages/<n>-<id>/hints.md       optional, shown on request
  <lang>/stages/<n>-<id>/
    starter/     files the user gets at this stage
    solution/    the complete working project at the end of this stage (never published)
    tests/       this stage's tests (flat files)
```

`<n>` is the stage's 1-based position in `stages`. See `problems/parking-lot` for a three-stage example and `problems/order-service-bugs` for a debug problem.

## problem.yaml

```yaml
slug: parking-lot              # permanent once merged
title: Parking Lot
summary: One line, 200 characters max.
difficulty: medium             # easy | medium | hard
kind: implement                # implement | debug
patterns: [strategy]
tags: []
authors: [your-github-handle]
timeLimitMs: 5000
languages: [typescript, go]    # any of go, python, typescript, javascript
entry:                         # the file that opens first
  typescript: src/lot.ts
  go: lot/lot.go
readonly: ["src/vehicle.ts"]   # globs users can see but not edit
stages:
  - id: basic
    title: Park and unpark
```

## Rules

- Stages are cumulative: the user keeps their code, the next stage's `starter/` only **adds** files, and all earlier tests keep running.
- `solution/` must pass every test of stages 1..N within half of `timeLimitMs`.
- The combined starter must fail at least one of the stage's tests. Stage 1, and every stage of a `debug` problem, must run without errors.
- Tests use `test(name, fn)` and `assertEqual(actual, expected)`. Test file names must be unique across stages.
- No network or packages: relative imports only in JS/TS; no `js`, `urllib`, `http`, `socket`, `subprocess` in Python; no `net` (except `net/url` and `net/netip`), `os/exec`, `os/signal`, `plugin`, `syscall`, `unsafe` in Go.
- Max 40 starter and test files per stage, 200 KB per problem.

## Language conventions

- **JavaScript / TypeScript:** ES modules with relative imports. Tests live in `tests/` and import `../src/...`.
- **Python:** packages are folders; tests import them by path, e.g. `from lot.lot import ParkingLot`. Decorate tests with `@test("name")`.
- **Go:** folders are packages imported as `app/<folder>`; root files are `package main`. Each test file is `package main` and defines `func lldlabTests()`.

## Check it locally

```bash
npm ci
npm run problems -- test <slug>
```

Go uses the published runtime unless `LLDLAB_YAEGI_DIR` points at a local `npm run build:yaegi` output.

## Review

Every PR needs the maintainer's review. Reviewers read all code that will run in users' browsers, check that READMEs describe the requirement (or, for debug problems, the symptoms) without giving away the solution, and that tests match the README.
