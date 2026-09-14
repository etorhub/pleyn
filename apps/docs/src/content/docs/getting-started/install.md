---
title: "Install & create"
description: "Create a PLEYN application with one command."
---

## Prerequisites

- **Bun** 1.2 or later
- **Docker**, if you want the default Postgres. Without it, point `DATABASE_URL`
  at a Postgres you already have and pass `--no-docker`.

## The happy path

Once `create-pleyn` and `htmx-contract` are on npm:

```bash
bun create pleyn my-app
cd my-app
bun run dev
```

That is the whole setup. The CLI copies the template, writes a `.env` with a
real `SECRET_KEY`, installs, starts Postgres, waits until it accepts
connections, migrates, seeds a demo account, and builds the stylesheet.

Sign in with whatever the CLI printed (by default `demo@example.com` /
`pleyn-demo-password`). Then `bun run ok` until it is green. Read `AGENTS.md`
before changing anything — it is short on purpose.

## Until the packages are published

`bun create pleyn` resolves `htmx-contract` from the registry. Until that
publish lands, generating with a full install is a 404 dressed as a setup
failure.

From a checkout of this repository:

```bash
bun packages/create-pleyn/index.ts my-app --no-install --no-git
```

Then point the generated app at the workspace library (or any local path),
install, migrate, seed, and build CSS yourself. The [CLI overview](/cli/overview/)
lists every step the scaffolder would have run.

`--no-docker` is available whenever Postgres is already running somewhere else.

## Flags

See the [flags reference](/cli/flags/) — generated from the same list the CLI
prints for `--help`, so it cannot quietly drift.
