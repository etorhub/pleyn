---
title: "Docker"
description: "Compose defaults, --no-docker, and an external Postgres."
---

## Defaults

`docker-compose.yml` runs `postgres:16-alpine` with user / password / database
`pleyn`, port 5432, a named volume, and a `pg_isready` healthcheck.

```bash
bun run db:up
bun run db:down
```

`create-pleyn` starts Compose for you, waits until Postgres accepts connections
(up to 60s), then migrates and seeds. It also rewrites every `pleyn` in the
compose file to the project name so two generated apps do not fight over one
database.

## `--no-docker`

Skip Compose entirely. `DATABASE_URL` in `.env` is used as written — but
`.env` is written by `create-pleyn` itself, with a database URL derived from
the project name, and nothing pauses between that and migrating: by default
install runs and migration follows straight after, against that generated
URL. If your existing Postgres does not already have a matching role and
database, pass `--no-install` as well. The CLI then stops after writing
`.env`, so you can edit `DATABASE_URL` before:

```bash
bun install
bun run db:apply
bun run cli seed
```

If Docker is missing from `PATH`, the CLI takes the same finish path: notes
only, project kept — see [Failures](/cli/failures/).

CI for the template mirrors the same image and credentials
(`postgresql://pleyn:pleyn@127.0.0.1:5432/pleyn`).
