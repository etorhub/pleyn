---
title: "CLI overview"
description: "What create-pleyn does, step by step."
---

`bun create pleyn <directory>` is meant to leave a running application. There is
no README of six more commands afterwards — or there should not be, when every
step succeeds.

Flags are documented on [Flags](/cli/flags/). What follows is the pipeline those
flags skip or keep.

## Before any step

The last path segment of `<directory>` is slugified into an npm package name and
a Postgres database name. An existing non-empty directory is refused; nothing is
touched.

## The steps

1. **Copy the template.** From the bundled `template/` (npm) or
   `templates/app` (checkout). See [Project layout](/getting-started/layout/).
2. **Write `.env`.** A random 32-byte base64 `SECRET_KEY`, and a
   `DATABASE_URL` that matches the project name. The compose file's `pleyn`
   credentials are rewritten to that name so two generated apps do not share one
   database.
3. **Install** (`bun install`), unless `--no-install`.
4. **Postgres.** Default: `docker compose up -d`, then poll `pg_isready` for up
   to 60 seconds. Skipped with `--no-docker`. If Docker is missing, the project
   stays and the message says how to finish by hand.
5. **Migrate** (`bun run db:apply`) when the database is ready and install ran.
6. **Seed** (`bun run cli seed`). Demo credentials
   `demo@example.com / pleyn-demo-password` are printed only when the seed
   actually succeeded.
7. **Stylesheet** (`bun run css`) when install ran. Soft-fail → a note.
8. **Git** (`git init` + initial commit), unless `--no-git`, git is missing, or
   `.git` already exists.

## Done vs Copied

If the seed ran, the CLI prints `Done.` and the demo sign-in. Otherwise it
prints `Copied.` plus the remaining commands (`bun install`, `db:up`,
`db:apply`, `cli seed`, `css` as needed), then `bun run dev` and `bun run ok`.

Requirements: **Bun ≥ 1.2**. Docker is optional for the default Postgres path.

When a step fails, see [Failures & requirements](/cli/failures/).
