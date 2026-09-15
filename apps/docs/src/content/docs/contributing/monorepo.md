---
title: "Monorepo"
description: "Workspaces and how to run check, template, and CLI CI locally."
---

Workspaces: `packages/*`, `templates/app`, `apps/*`. Layout:
[Project layout](/getting-started/layout/).

## Local commands

| Command | What it covers |
| --- | --- |
| `bun run check` | Types across workspaces, [no-leaks](/contributing/no-leaks/), `bun test packages` |
| `cd templates/app && bun run ok` | Template as an application (`check` + unit tests) |
| `cd templates/app && bun run test:db` | Full template suite (needs Postgres) |
| `bun run docs:check` | Docs sync + `astro check` + production build |

Root `check` does **not** run the template suite or the docs build — those are
separate so a library change does not wait on Postgres or Astro.

## CI jobs

[`.github/workflows/ci.yml`](https://github.com/etorhub/pleyn/blob/main/.github/workflows/ci.yml):

1. **library and types** — `typecheck`, `leaks`, `bun test packages` (no services)
2. **documentation** — `docs:check`
3. **template** — Postgres service; `check` + `test:db` under `templates/app`
4. **create-pleyn** — generate with `--no-docker --no-install`, point at workspace
   `htmx-contract` via `file:`, then run the generated app's checks

Registry install is the happy path for real users (`bun create pleyn`). The CLI
CI job keeps the `--no-install` + `file:` rewrite so it always exercises the
workspace library without depending on npm — see [Publishing](/contributing/publishing/).
