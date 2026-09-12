# create-pleyn

Creates a [PLEYN](https://github.com/etorhub/pleyn) application.

```
bun create pleyn my-app
```

That is the whole setup. It copies the template, writes a `.env` with a real
`SECRET_KEY`, installs, starts Postgres with Docker, waits for it to accept
connections, applies the migrations, seeds an account you can sign in with, and
builds the stylesheet.

```
cd my-app
bun run dev        # http://localhost:3000
```

## What you get

A running application, not a folder of files to wire up: sessions stored as
digests, argon2id passwords via `Bun.password`, CSRF derived from the session and
published once in the layout, and a worked resource with a list, a filter in the
query string, an empty state, an out-of-band counter and toasts.

Plus its own `AGENTS.md`, its own test suite in two tiers, a scaffolding
generator (`bun run new-resource`), generated documentation that CI checks, and
`bun run ok` — one command that says which step failed and what to do about it.

## Options

| Flag | What it does |
| ---- | ------------ |
| `--no-docker` | do not start Postgres; `DATABASE_URL` in `.env` is used as it stands |
| `--no-install` | do not run `bun install` (and so no migrate, seed or stylesheet) |
| `--no-git` | do not create a git repository |

## If a step fails

It says which one, prints the command's output, and tells you what to run to
carry on. Your files stay: a partly built project is still your project, and
deleting it would lose whatever the failure was. The one exception is a failure
while copying, where what is on disk belongs to nobody and is removed.

## Requirements

- Bun 1.2 or later
- Docker, for the default Postgres. Without it, point `DATABASE_URL` at a
  Postgres you have and pass `--no-docker`.

## Licence

MIT.
