# Contributing a problem

## Layout

```
problems/<slug>/
  problem.yaml
  README.md                      the ticket: team, system, what's asked (optional, recommended)
  review.md                      design review, shown after solving (optional)
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
kind: implement                # implement | refactor | debug
domain: Parking · Operations   # shown instead of patterns until the problem is solved (optional)
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
    checks:                    # design checks, from this part on (optional)
      - forbid: "HourlyPricing|FlatPricing"
        in: [src/lot.ts]
        message: The lot shouldn't know specific pricing rules
  - id: pricing
    title: Pluggable pricing
    frozen: [src/lot.ts]       # read-only from this part on (optional)
```

- `kind`: `implement` (build the missing piece of a working service), `refactor` (restructure working but rigid code; the tests already pass) or `debug` (fix failing tests).
- `domain`: shown instead of `patterns` until the problem is solved, so the pattern isn't a spoiler.
- `frozen` (per part): globs that become read-only from that part on. Not allowed on the first part (use `readonly`). Each frozen file gets a check that it is unchanged since its part unlocked.
- `checks` (per part): `{ forbid: <regex>, in: [<globs>], message: <shown on failure> }`. The regex must not match any file matching `in`; checks apply from their part on, and the reference solution must pass them. Avoid nested quantifiers such as `(a+)+`; the build rejects them.

## Rules

- Stages are cumulative: the user keeps their code, the next stage's `starter/` only **adds** files, and all earlier tests keep running.
- `solution/` must pass every test of stages 1..N within half of `timeLimitMs`.
- The combined starter must fail at least one of the stage's tests (for `refactor` problems: at least one of its tests or design checks). Stage 1, and every stage of a `debug` or `refactor` problem, must run without errors.
- Tests use `test(name, fn)` and `assertEqual(actual, expected)`. Test file names must be unique across stages.
- No network or packages: relative imports only in JS/TS; no `js`, `urllib`, `http`, `socket`, `subprocess` in Python; no `net` (except `net/url` and `net/netip`), `os/exec`, `os/signal`, `plugin`, `syscall`, `unsafe` in Go.
- Max 40 starter and test files per stage, 200 KB per problem.
- Write the problem as a small working service plus a ticket; the user's module is what's missing (see `problems/discount-strategy`). Every part's requirements are visible from the start, so later parts must not contradict earlier tests.
- Tests should only use the entry point (`entry`), the way the rest of the system would; the build warns when a test imports another module.

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
