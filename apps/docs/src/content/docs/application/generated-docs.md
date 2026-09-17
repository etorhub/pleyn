---
title: "Generated reference.md"
description: "How docs/reference.md is generated, and why CI checks it."
---

The lookup tables in `docs/reference.md` come out of the code. Written by hand
beside the registry, they drift within a dozen commits. Generated, they cannot.

```bash
bun run docs          # rewrite
bun run docs:check    # fail when they no longer match
```

`bun run check` includes `docs:check`. The generator is
[`scripts/agents-md.ts`](https://github.com/etorhub/pleyn/blob/main/templates/app/scripts/agents-md.ts).

## What is generated

Sections live between `<!-- generated:<name> -->` markers. Outside them is
never touched. Today:

| Section | Source |
| --- | --- |
| `oob` | `OOB_TARGETS` in `src/lib/oob.ts` |
| `resources` | directories under `src/routes/` and which of the four `*.ts` files each has |
| `commands` | `COMMANDS` in `src/cli/commands.ts` — every `bun run cli` command |

Output is Prettier'd so format and check do not fight.

## Why it matters

`oobAttributes()` only accepts registered ids — the registry is load-bearing,
not documentation fluff. The resources table is not: it records which of the
four files each resource under `src/routes/` has, and `check` fails only when
that table drifts from the filesystem — not when a resource is missing a file
outright. A resource with `—` in three columns (`home/` is one) is honest, not
broken. Nothing today fails a resource for being incomplete; see
[Conventions](/application/conventions/) for the shape a resource is meant to
have.

The command table is why `src/cli/commands.ts` holds metadata and a *lazy*
loader: generating documentation must not start Hono and construct a database
pool, and `docs:check` runs inside `bun run check`, in a CI job with no
database at all.

Do not edit between the markers. After adding a resource, an OOB target or a
command, run `bun run docs`. The short rules stay in `AGENTS.md`; the tables live here so
that file stays short.
