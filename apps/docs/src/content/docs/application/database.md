---
title: "Database & Drizzle"
description: "Migrations, generate, and the db.execute generic trap."
---

## Migrations

`db:generate` runs `drizzle-kit generate` from `src/db/schema/index.ts` into
`./drizzle`. `db:apply` runs `src/db/migrate.ts`.

Apply explicitly — **never on import**. Import-time migrate races every test
file that loads the server against the same fresh database.

`test:unit` and `test:db` set `SKIP_MIGRATIONS=true` so the suite does not
migrate on its own; `test:db` calls `db:apply` first.

## Client

One postgres.js pool, lazy connect. Prefer the `Transactor` type when a function
accepts either `db` or a transaction. Schema casing is `snake_case`.

Default URL (compose / `.env.example`):

```
postgresql://pleyn:pleyn@127.0.0.1:5432/pleyn
```

`create-pleyn` rewrites the compose credentials to the project name.

## The `db.execute<T>()` trap

Drizzle raw-SQL generics are an **assertion**, not a check. A type that drifts
from the SQL's column alias compiles cleanly and returns `undefined` at
runtime. Full write-up: [Pitfalls](/status/pitfalls/).
