# **PROJECT_NAME**

Built with [PLEYN](https://github.com/etorhub/pleyn): Bun, Hono, `hono/html`,
htmx, Drizzle, PostgreSQL, Zod and Tailwind. The server renders HTML, htmx swaps
in the piece that changed, and there is no bundler, no client state and no JSON
API for the browser.

## Running it

```
bun run db:up      # Postgres, in Docker
bun run dev        # http://localhost:3000
```

`bun create pleyn` already did both once, along with the migrations, the seed
and the stylesheet. You only need these again after `bun run db:down` or a fresh
clone.

The seeded account is printed by the generator. If you have lost it:

```
bun run cli seed --email you@example.com --password <something>
```

## The commands

| Command                       | What it does                                           |
| ----------------------------- | ------------------------------------------------------ |
| `bun run dev`                 | the application, with hot reload                       |
| `bun run ok`                  | types, lint, format, docs, fast tests — the one to run |
| `bun run test:db`             | the full suite, against Postgres                       |
| `bun run new-resource <name>` | scaffolds a resource and registers it                  |
| `bun run docs`                | regenerates the tables in `docs/reference.md`          |
| `bun run css`                 | rebuilds `public/app.css`                              |
| `bun run db:generate`         | a migration, from the Drizzle schema                   |
| `bun run db:apply`            | applies pending migrations                             |

## Where things are

```
src/
  routes/          one directory per resource, four files each
  components/      the shell, the form and list primitives
  services/        the decisions; routes stay thin
  db/              Drizzle schema, client, migration runner
  lib/             http conventions, oob registry, csrf, config
  middleware/      session and CSRF
tests/
  unit/            markup only, no database, under a second
  *.test.ts        the rest, against Postgres
```

## Before you change anything

Read [`AGENTS.md`](AGENTS.md). It is the manual — for people and for agents —
and it is short. The rules in it are the ones `bun run check` enforces, and the
reason each exists is a bug that shipped in an htmx application because nothing
was checking that seam.
