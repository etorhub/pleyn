# create-pleyn

Creates a [PLEYN](https://github.com/etorhub/pleyn) application.

```bash
bun create pleyn my-app
cd my-app
bun run dev
```

That copies the template, writes a real `.env`, installs, starts Postgres,
migrates, seeds, and builds the stylesheet — when the default flags are on.

```bash
bun create pleyn my-app --no-docker --no-install --no-git
```

**Full documentation:** [etorhub.github.io/pleyn](https://etorhub.github.io/pleyn/)
(CLI pipeline, flags, failures, what you get).

## Requirements

- Bun 1.2 or later
- Docker for the default Postgres (or `--no-docker` and your own `DATABASE_URL`)

## Licence

MIT.
