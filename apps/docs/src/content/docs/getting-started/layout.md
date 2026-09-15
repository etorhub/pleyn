---
title: "Project layout"
description: "How the monorepo parts relate, and what create-pleyn copies."
---

PLEYN is one repository with four parts:

| Path | What it is |
| --- | --- |
| `packages/htmx-contract` | The checker. Publishable on its own. |
| `packages/create-pleyn` | The CLI. `bun create pleyn` runs this. |
| `templates/app` | What the CLI generates — a real application. |
| `apps/docs` | This documentation site. |

The template is a workspace member so CI can run it as an application, and so
`htmx-contract: ^0.1.0` resolves to the local package here and to npm in a
generated project — one spelling, both cases.

## At generate time

`create-pleyn` resolves the template from `packages/create-pleyn/template`
(when installed from npm) or `../../templates/app` (when run from a checkout).
It copies everything except `node_modules`, `.git`, `bun.lock`, `.env`, and
`dist`.

`bun.lock` is skipped on purpose: the one in this repository pins
`htmx-contract` to the workspace path, and carrying it over would make a fresh
project try to resolve a path that does not exist on the user's disk.

It then substitutes `__PROJECT_NAME__` in `package.json`, `README.md`,
`.env.example`, and `AGENTS.md`.

## Why a second copy for npm

npm cannot ship files outside the package directory. `prepack` runs
`scripts/bundle-template.ts`, which copies `templates/app` into
`packages/create-pleyn/template/` (gitignored). That is what a published
`create-pleyn` installs from. See [Template bundling](/contributing/bundling/).

## Commands in this repository

```bash
bun run check                      # types, no-leaks, library tests
cd templates/app && bun run ok     # the template as an application
bun run docs:check                 # documentation sync + build
```

Generated apps ship their own `AGENTS.md`. The root [`AGENTS.md`](https://github.com/etorhub/pleyn/blob/main/AGENTS.md)
is for this monorepo.
