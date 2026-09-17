---
title: "App CLI"
description: "Ask the application: routes, requests, the swap model, and the environment."
---

The operational commands of a generated app. Every one takes `--json`, and
`bun run cli` on its own lists them:

```bash
bun run cli                    # what there is to ask
bun run cli <command> --help   # how to ask it
```

The list in `docs/reference.md` is generated from `src/cli/commands.ts`, so it
cannot fall behind the code.

These exist because a question that has to be inferred gets inferred wrongly.
Which URLs are there, is this one a page or a fragment, what does the DOM look
like after htmx has swapped this response in, why can nothing reach Postgres —
each of those is a fact the application already knows, and each used to be
guessed at.

## `routes`

```bash
bun run cli routes
bun run cli routes --json
```

Read off Hono's own router, not from `src/routes/`:

```
GET     /tasks                page      signed in  tasks
GET     /tasks/fragment/list  fragment  signed in  tasks
POST    /tasks                mutation  signed in  tasks
DELETE  /tasks/:id            mutation  signed in  tasks
```

- **kind** applies this stack's URL rule: a path containing `/fragment/` is a
  `fragment`, any other `GET` is a `page`, everything else is a `mutation`.
- **guard** is derived by identity, not by path shape — the entries carrying
  `requireUser` are found in the router, and everything mounted under them is
  marked. See [Conventions](/application/conventions/).
- **middleware** is listed separately rather than dropped: what runs before a
  route is a real question.

A record is `{method, path, kind, resource, guard, params}`. `warnings` carries
breaches that cost nothing to notice — a `/fragment/` URL answered by a
mutation — and a non-empty `warnings` exits 1.

## `request`

```bash
bun run cli request /tasks --as demo@example.com
bun run cli request POST /tasks --as demo@example.com --form title="Write it down"
bun run cli request /tasks/fragment/list?show=open --as demo@example.com --hx
```

The request is performed **in process**, through the same `app.request()` the
tests use. No server, no port, no cookie jar.

| Flag | What it does |
| --- | --- |
| `--as <email>` | Mint a session for that user. Without it the request is anonymous |
| `--form k=v` | Repeatable. Sends `application/x-www-form-urlencoded` |
| `--json-body '<json>'` | Sends `application/json`. Cannot be combined with `--form` |
| `--header k=v` | Repeatable. Overrides anything the command set |
| `--hx` | Send as htmx would: `HX-Request`, `HX-Current-URL` |
| `--hx-target`, `--hx-trigger` | The corresponding request headers |
| `--keep-session` | Do not delete the minted session, and print its cookie |

`--as` mints the session directly — the row is inserted and the CSRF token
derived from the session digest, exactly as `csrfMiddleware` derives it — and
deletes it again when the command finishes. It does not replay `POST /signin`,
because a broken sign-in page would then make every unrelated command fail.
With no `--as` the pre-session `pleyn_csrf` seed is minted instead, so the
sign-in form itself can be driven from here.

For anything other than `GET`, `HEAD` and `OPTIONS` the command attaches
`X-CSRF-Token` and an `Origin` header. Note the asymmetry: with `--json-body`
the header is the *only* accepted proof, because the `_csrf` body field is only
read for form encodings.

The session cookie is printed as `session=…` unless `--keep-session` asked for
it.

## `request --swap`

The response body is not what the user ends up looking at. htmx lifts the
out-of-band nodes out of it, swaps them by id, and puts what remains into the
target. `--swap` runs that model — `htmx-contract`'s, the same one the test
suite asserts through — and prints the DOM that results.

```bash
bun run cli request POST /tasks --as demo@example.com --form title="Write it down" --swap
```

```
POST /tasks → 200 as demo@example.com

Swapped into #task-form (page) with outerHTML (page), from /tasks
  triggered by <form id="task-form"> via hx-post
  out of band → #task-list (outerHTML)
  out of band → #pending-count (outerHTML)
  out of band → #toast (innerHTML)

Contract: no violations.
```

**The starting page** is `--page`, defaulting to the page the path belongs to
(`/tasks/fragment/list` → `/tasks`). The resolved value is always reported,
because a default that might be wrong must not be invisible.

**The target and the swap style** are read off the page: the element whose
`hx-get`/`hx-post`/`hx-delete` matches the request is the trigger, and its
`hx-target` and `hx-swap` are used. Precedence, each reported as
`targetSource` / `styleSource`:

| Source | Meaning |
| --- | --- |
| `flag` | `--target` / `--swap-style` |
| `page` | the triggering element's own attributes |
| `default` | htmx's default, `innerHTML` |

When nothing on the page sends that request, the command **refuses** rather
than guessing: a guessed target produces a confidently wrong DOM.

**Violations are reported from two places**, and the record says which:

- `where: "response"` — what `htmx-contract` finds in the response itself.
- `where: "document"` — what the swap *created* in the page. Anything the
  starting page was already carrying is subtracted, so a swap is never blamed
  for a pre-existing problem.

That second one is the whole point, and it is not hypothetical: this command
found exactly that in the template's own `tasks` resource. A response carrying
one `#task-list` is impeccable; the same response swapped into a page that
already has one leaves two, and from then on htmx swaps the first match for
ever. Only the post-swap document shows it — see
[Pitfalls](/status/pitfalls/).

By default the printed DOM is the **target's subtree** — what the interaction
changed. `--full` prints the whole post-swap document and adds `swap.html` to
the record.

## `doctor`

```bash
bun run cli doctor
bun run cli doctor --json
```

```
ok    cwd        /srv/my-app
warn  config     SECRET_KEY is the published default
FAIL  database   connect ECONNREFUSED 127.0.0.1:5432
--    migrations the database is unreachable
ok    stylesheet public/app.css is current
ok    port       3000 is free

[doctor] problems: database

  database: bun run db:up
```

| Check | Fails when | Fix |
| --- | --- | --- |
| `cwd` | you are not at the project root | `db:apply` resolves `./drizzle` against the working directory |
| `config` | `SECRET_KEY` is the default or short; `COOKIE_SECURE` off in production | Set `SECRET_KEY` in `.env` |
| `database` | a one-shot connection fails | `bun run db:up` |
| `migrations` | the journal is ahead of `drizzle.__drizzle_migrations` | `bun run db:apply` |
| `stylesheet` | `public/app.css` is missing or older than its source | `bun run css` |
| `port` | never — it reports whether something is listening | — |

The probe opens **its own** connection with a three-second bound, because the
application pool waits ten and doctor is what you run when nothing answers.
Migrations are read through drizzle's own `readMigrationFiles`, against an
absolute path, so doctor and `bun run db:apply` cannot disagree. When the
database is unreachable, `migrations` is `skipped` rather than invented.

### Exit codes

The contract worth scripting against:

| Code | Meaning |
| --- | --- |
| `0` | nothing to do |
| `1` | this project's problem, fixable here |
| `2` | the environment's — Postgres is down, the configuration is refused |

`request` exits 1 on a status of 400 or more, or on any contract violation.
`routes` exits 1 when it has warnings.

## `seed` and `user`

```bash
bun run cli seed
bun run cli seed --email … --password …
bun run cli user --email … --password … [--name …]
```

`seed` creates the demo user and four sample tasks, idempotent on the email —
defaults `demo@example.com` / `pleyn-demo-password`. `create-pleyn` calls it
after migrating so a fresh project has something to sign in with. `user`
creates an empty account and requires `--email` and `--password`.

## `--json`

Under `--json`, **stdout carries the record and nothing else**. Every note,
warning and error goes to stderr — including the `[config]` warnings that
importing the app prints — so `bun run cli routes --json | jq` is always safe.
