---
title: "App CLI"
description: "bun run cli seed and bun run cli user."
---

Small operational commands for a generated app:

```bash
bun run cli seed
bun run cli seed --email … --password …
bun run cli user --email … --password … [--name …]
```

## `seed`

Creates the demo user and four sample tasks (“Read AGENTS.md”, …). Idempotent on
the email: running twice changes nothing. Defaults:

- email: `demo@example.com`
- password: `pleyn-demo-password`

Prints `Created …` or `… already exists`. `create-pleyn` calls this after
migrate so a fresh project has something to sign in with.

## `user`

Creates an empty account. Requires `--email` and `--password`. Optional
`--name` (stored as `fullName`).

Both commands close the database pool when they finish.
