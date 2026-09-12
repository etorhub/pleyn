# PLEYN

_Middle English for **plain**._

**Bun · Hono · `hono/html` · htmx · Drizzle · PostgreSQL · Zod · Tailwind**

Plain HTML, plain strings, nothing clever.

```
bun create pleyn my-app
```

One command. It copies the template, writes a `.env` with a real signing key,
installs, starts Postgres, waits for it, runs the migrations, seeds an account
you can sign in with, and builds the stylesheet. Then:

```
cd my-app
bun run dev
```

and there is a working application on `localhost:3000` — sessions, CSRF,
argon2id passwords, a resource with a list, a filter, an empty state, an
out-of-band counter and toasts, plus its own test suite and its own `AGENTS.md`.

Nothing to wire up afterwards. That is the point of the stack being opinionated:
the opinions are already applied.

---

## The claim

The server renders HTML. htmx swaps in the piece that changed. There is no
bundler, no client router, no client state, and no JSON API for the browser.
Templates are the `html` tagged template — they return **strings**, which is
what makes a fragment testable without a browser and without a DOM.

None of that is new. Plenty of people build this way.

What PLEYN adds is one thing: **the seam between the HTML a route returns and
the DOM that receives it is checked statically, in under a second, with no
browser.**

## Why that matters

In a hypermedia application that seam is a string on one side and a browser on
the other, so nothing checks it. `hx-target="#row-7"` is text. The type checker
cannot tell you the target is gone. The linter cannot tell you the response body
empties itself once the out-of-band nodes are lifted out. A test asserting on a
response body cannot tell you the swap deletes the row the user was touching.

Four failure classes come out of that seam. Each is silent in review, invisible
to `tsc`, and passes a route test that asserts on the response body:

| The failure | Why nothing catches it |
| --- | --- |
| **A response that is only an out-of-band toast deletes its target.** htmx lifts the toast out first and swaps what is left — nothing — into `hx-target`. Under `outerHTML` that removes the element. The natural place to write it is a global error handler, where it fires on every failed mutation at once. | The body looks correct. It is only empty _after_ extraction, and no test models the swap. |
| **Per-row controls inside one enclosing `<form>` ship every other row's values.** For a non-GET request htmx collects the surrounding form's inputs and lets them override the element's own; most body parsers keep the last occurrence of a repeated name. Editing the first row saves the last row's value. | Route tests hand-build the request body, so they never send what a browser sends. |
| **Deleting the last row leaves a header standing over an empty body, for ever.** The delete route returns the row, because that is what changed. It works for every row but the last. | Rows and the empty state are rendered in separate branches, and nothing obliges the delete path to know the empty state exists. |
| **A poll with no declared bound runs for ever.** The stop condition is "the work reached a terminal state"; a killed process never reaches one, and the page asks every two seconds, indefinitely, for everyone looking at it. | The markup of a poll that will stop and one that never will is identical. |

The usual defence is a line in the contributing guide: _open it in a browser_.
That is exactly the step that gets skipped — by a tired person on a Friday, and
by every coding agent that has ever existed.

So PLEYN moves the defence into `bun run check`.

## What you get

**[`htmx-contract`](packages/htmx-contract)** — seven rules and a model of htmx's
swap algorithm, so a test can assert on the DOM _after_ an interaction. Every
rule is pinned against the markup of the failure it exists to catch: a rule that
passes its own failure is decoration. Zero dependencies, knows nothing about your
application, works with any htmx backend.

**A conformance test** that walks every page through the checker, plus a
meta-test asserting every resource is enrolled. Adding a resource without an
entry fails CI — which is the only mechanism that survives contributors who do
not read the docs.

**A scaffolding generator.** `bun run new-resource projects` writes the four
files a resource is, registers the routes behind the session guard, and registers
the list's out-of-band target. What comes out compiles and answers on its URL.

**Two declared test tiers.** The fast one runs in under a second with no
database, in a CI job with no database _service_, which is what keeps the
separation honest.

**Generated documentation.** The out-of-band target table comes out of a registry
the components actually import, and CI fails when they diverge. Documentation
that lies is worse than none, because somebody builds on it.

**Bounded polling.** The attempt counter travels in the polled URL, so it stays
server-authoritative with no client state, and the page gives up and says so
rather than asking for ever.

## Why agents

A stack with no bundler, no client state and no indirection is a stack where an
average model — or a local one — can make a correct change. Locality of
behaviour is not an aesthetic here; it is the reason the work is tractable at all
for something with a small context window.

The conventions exist so an agent cannot quietly get it wrong: the four-file
resource rule, one Zod schema per resource, out-of-band targets that do not
compile unless registered, and a single `bun run ok` that says which step failed
and what to do about it.

The honest version: this is a stack designed on the assumption that whoever
touches the code next may not be a person, may not be excellent, and will not
open a browser.

## This repository

```
packages/htmx-contract     the checker. Publishable on its own.
packages/create-pleyn      the CLI. `bun create pleyn` runs this.
templates/app              what it generates: a real, running application
```

`templates/app` is a workspace member, and CI runs its full suite against
Postgres rather than merely compiling it. It is the only evidence that what the
CLI hands somebody works.

```
bun install
bun run check                      types, no-leaks, the library's 50 tests
cd templates/app && bun run ok
```

## Status

Early, and honest about it.

- ✅ `htmx-contract` extracted, generalised, 50 tests green
- ✅ the application template — running, migrated, seeded, its own suite green
- ✅ `create-pleyn` — verified end to end against a real Postgres
- ⬜ `htmx-contract` published to npm
- ⬜ `create-pleyn` published to npm
- ⬜ a hosted demo

`bun create pleyn` needs `htmx-contract` on npm to resolve. Until that first
publish, generate with `--no-install` and point the project at a local copy.

## Licence

MIT.
