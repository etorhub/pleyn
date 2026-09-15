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

`--no-docker` is available whenever Postgres is already running somewhere
else — but on its own it does not pause for you to point `DATABASE_URL`
anywhere. Install still runs by default, and migration follows immediately
after, against the `DATABASE_URL` the CLI just generated
(`postgresql://<name>:<name>@127.0.0.1:5432/<name>`). Unless that role and
database already exist on your Postgres, pair it with `--no-install`: the CLI
then stops after writing `.env`, so you can edit `DATABASE_URL` before running
`bun install`, `bun run db:apply` and `bun run cli seed` yourself — see
[Docker](/application/docker/) and [`--no-install`](/cli/flags/).

From a monorepo checkout, `--no-install` also lets you run the CLI against the
workspace template — see the [CLI overview](/cli/overview/).

## Flags

See the [flags reference](/cli/flags/) — generated from the same list the CLI
prints for `--help`, so it cannot quietly drift.
