---
title: "Failures & requirements"
description: "How create-pleyn fails, what it leaves on disk, and how to recover."
---

Two rules the CLI holds to:

**Loud.** Every step is numbered. Failures name the step, the command, and how
to carry on by hand. Command output is captured rather than inherited, so a
stack trace from `bun install` does not scroll the useful line off the screen.

**Never a half-built project.** If a step *after* the copy fails, the files
stay: they are yours. The directory is only removed when the failure happened
while writing it, because then what is there is nobody's.

## Hard failures

`die(message, recovery[])` prints `create-pleyn: …`, optional “To carry on by
hand” lines, and exits 1.

| Situation | What happens |
| --- | --- |
| Non-empty existing directory | Nothing touched |
| Unusable project name | Nothing touched |
| Copy fails mid-write | Target directory removed |
| `bun install` fails | Files stay; recovery: `cd …` / `bun install` |
| `db:apply` fails | Files stay; recovery: `bun run db:apply` |

Install and migrate use `mustRun`: hard fail with recovery when the command
exits non-zero.

## Soft failures (notes, project kept)

- Docker compose start fails, or Postgres never becomes ready within 60s.
- Docker is not on `PATH`.
- Seed or stylesheet build fails.

In each case the CLI leaves the project and prints the commands to finish:
typically `bun run db:up`, `bun run db:apply`, `bun run cli seed`, and
`bun run css`.

## Requirements

- **Bun** 1.2 or later (`engines` on both packages).
- **Docker** only if you want the default Postgres. Without it, pass
  `--no-docker` and point `DATABASE_URL` at a Postgres you already have — see
  [Docker](/application/docker/).

Until `htmx-contract` is on npm, generate with `--no-install` and point the
project at a local copy — see [Install & create](/getting-started/install/).
