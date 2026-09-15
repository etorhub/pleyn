---
title: "Install & create"
description: "Create a PLEYN application with one command."
---

## Prerequisites

- **Bun** 1.2 or later
- **Docker**, if you want the default Postgres. Without it, point `DATABASE_URL`
  at a Postgres you already have and pass `--no-docker`.

## The happy path

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

`--no-docker` is available whenever Postgres is already running somewhere else.
From a monorepo checkout, you can also run the CLI against the workspace
template with `--no-install` — see the [CLI overview](/cli/overview/).

## Flags

See the [flags reference](/cli/flags/) — generated from the same list the CLI
prints for `--help`, so it cannot quietly drift.
