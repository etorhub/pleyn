# PLEYN

_Middle English for **plain**._

**Bun · Hono · `hono/html` · htmx · Drizzle · PostgreSQL · Zod · Tailwind**

Plain HTML, plain strings, nothing clever. One command leaves a running
application — and the seam between the HTML a route returns and the DOM that
receives it is checked statically.

```bash
bun create pleyn my-app
```

## Documentation

**[Read the docs](https://etorhub.github.io/pleyn/)** — install, conventions,
CLI, `htmx-contract`, recipes, roadmap.

Until Pages is enabled, build them locally:

```bash
bun install
bun run docs:dev
```

## Status

Early, and honest about it.

- ✅ `htmx-contract` extracted, generalised, tests green
- ✅ the application template — running, migrated, seeded, its own suite green
- ✅ `create-pleyn` — verified end to end against a real Postgres
- ✅ documentation site (`apps/docs`)
- ⬜ `htmx-contract` published to npm
- ⬜ `create-pleyn` published to npm
- ⬜ a hosted demo

`bun create pleyn` needs `htmx-contract` on npm to resolve. Until that first
publish, generate with `--no-install` and point the project at a local copy.

## This repository

```
packages/htmx-contract     the checker. Publishable on its own.
packages/create-pleyn      the CLI. `bun create pleyn` runs this.
templates/app              what it generates: a real, running application
apps/docs                  Starlight documentation site
```

```bash
bun install
bun run check                      types, no-leaks, the library's tests
cd templates/app && bun run ok
bun run docs:check                 documentation sync + build
```

## Licence

MIT.
