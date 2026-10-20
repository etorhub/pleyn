---
title: "Install & create"
description: "Create a PLEYN application with one command."
---

## Prerequisites

- **Bun** 1.2 or later
- **Docker**, if you want the default Postgres. Without it, pass `--no-docker`
  — see the note below before reaching for it on its own.

## The happy path

```bash
bun create pleyn my-app
cd my-app
bun run dev
```

That is the whole setup. The CLI copies the template, writes a `.env` with a
real `SECRET_KEY`, installs, starts Postgres, waits until it accepts
connections, migrates, seeds a demo account, builds the stylesheet, and
initialises a git repository with an initial commit.

Sign in with whatever the CLI printed (by default `demo@example.com` /
`pleyn-demo-password`). Then `bun run ok` until it is green. Read `AGENTS.md`
before changing anything — it is short on purpose.

## Existing Postgres

When you already have Postgres (and do not want Compose), prefer stopping after
`.env` is written so you can point `DATABASE_URL` before any DB command:

```bash
bun create pleyn my-app --no-docker --no-install
cd my-app
# edit .env — set DATABASE_URL
bun install
bun run db:apply
bun run cli seed
bun run dev
```

`--no-docker` alone still installs. The CLI prints the exact `DATABASE_URL` it
wrote (`postgresql://<name>:<name>@127.0.0.1:5432/<name>`), checks that the
host/port accepts a TCP connection, and only then migrates. If nothing is
listening, it exits with recovery steps (edit `.env`, then install / apply /
seed) instead of migrating against a closed port. See also
[Docker](/application/docker/) and [`--no-install`](/cli/flags/).

From a monorepo checkout, `--no-install` also lets you run the CLI against the
workspace template — see the [CLI overview](/cli/overview/).

## Flags

See the [flags reference](/cli/flags/) — generated from the same list the CLI
prints for `--help`, so it cannot quietly drift.
