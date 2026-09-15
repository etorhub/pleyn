---
title: "Scripts"
description: "Every package.json script in a generated app, and when to run it."
---

The conventions live in [Conventions](/application/conventions/). This page is
the lookup for what each script does.

## Day to day

| Script | What it does |
| --- | --- |
| `bun run dev` | Hot-reload server (`src/server.ts`) |
| `bun run start` | Same without `--hot` |
| `bun run ok` | `check` + `test:unit` — nothing is finished until this is green |
| `bun run check` | Types → lint → format:check → docs:check ([`scripts/check.ts`](https://github.com/etorhub/pleyn/blob/main/templates/app/scripts/check.ts)) |
| `bun run format` | Prettier write |
| `bun run cli …` | Operational commands — see [App CLI](/application/cli/) |
| `bun run new-resource …` | Scaffold a resource — see [new-resource](/application/new-resource/) |

`check` prints which step failed and the fix (`Run bun run format`, `Run bun run docs`, and so on).

## Tests

| Script | What it does |
| --- | --- |
| `bun run test:unit` | `SKIP_MIGRATIONS=true bun test tests/unit` — no Postgres |
| `bun run test:db` | `db:apply`, then the full suite with `SKIP_MIGRATIONS=true` |
| `bun run test` | `bun test` (everything under `tests/`) |

Migrations are applied only via `db:apply`, never on import — see
[Database](/application/database/).

## Database and Docker

| Script | What it does |
| --- | --- |
| `bun run db:apply` | Apply migrations (`src/db/migrate.ts`) |
| `bun run db:generate` | `drizzle-kit generate` from the schema |
| `bun run db:up` / `db:down` | Docker Compose for local Postgres |

## Stylesheet and generated docs

| Script | What it does |
| --- | --- |
| `bun run css` / `css:watch` | Tailwind → `public/app.css` |
| `bun run docs` / `docs:check` | Regenerate or verify `docs/reference.md` |

See [CSS](/application/css/) and [Generated reference.md](/application/generated-docs/).
