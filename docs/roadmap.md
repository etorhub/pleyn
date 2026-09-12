# Where this stands, and what comes next

Kept so the next session — or the next person — starts with the context rather
than the archaeology.

## Decisions already made

**The name is PLEYN**, Middle English for _plain_. Chosen after `cairn` and
`create-cairn` turned out to be taken on npm, and after discovering that every
common English word is gone from that namespace — `spare`, `stark`, `quiet`,
`slab`, `folio`, `wedge`, `terse`, `bare`, `legible`, all of them. That is why
Vite, Astro, Hono, Zod, Bun, Qwik and Svelte are coined, foreign or deliberately
misspelled: it is the only space left. `pleyn`, `create-pleyn` and `pleyn-stack`
were all verified free.

**The library keeps its descriptive name**, `htmx-contract`, not
`@pleyn/contract`. It is the thing that will bring people to the stack rather
than the other way round: somebody searching npm for htmx tooling will find
`htmx-contract` and has no reason ever to search for "pleyn". It also works with
any htmx backend, so hiding it inside an unknown brand costs it its natural
audience.

**One repository, three parts.** The library, the CLI and the template live
together, because the template is the only honest test of the other two, and
splitting them means keeping three things in step by hand.

**The primary artifact is the CLI, not the doctrine.** `bun create pleyn my-app`
has to leave a running application: installed, migrated, seeded, styled. A stack
whose first experience is a list of setup steps is a blog post.

**Single-tenant by default.** Users, sessions and one worked resource.
Workspaces, roles and installation administration are a decision an application
makes, not one a template should make for it.

**The template is a workspace member.** `htmx-contract: ^0.1.0` then resolves to
the local package here and to npm in a generated project — one spelling, both
cases — and CI can run the template as an application rather than compiling it
and hoping.

## Done

- **`htmx-contract`** extracted with `git subtree split`, so the commits that
  explain why each rule exists came with it. Generalised: every trace of the
  application it came from is gone, and the 20 regression tests were reframed
  around the _shape_ that causes each failure rather than the incident that
  exposed it. 50 tests green. `scripts/no-leaks.ts` is wired into CI and has
  been verified to fail when a banned term is reintroduced.
- **`templates/app`** — a real application: sessions stored as digests, argon2id
  via `Bun.password`, CSRF derived from the session, and a `tasks` resource with
  a list, a filter in the query string, an empty state, an out-of-band counter
  and toasts. `bun run check` clean, 26 tests green against Postgres.
- **`packages/create-pleyn`** — copies, substitutes the name, generates a
  `SECRET_KEY`, installs, provisions Postgres, waits for it to accept
  connections, migrates, seeds and builds the stylesheet. Verified end to end:
  the generated project serves pages, signs in, creates a task over HTTP with a
  correct out-of-band response, and passes its own suite.

## Next

1. **Publish `htmx-contract` to npm.** Everything else is blocked behind it:
   until it resolves, `bun create pleyn` cannot install. Publish from GitHub
   Actions with `--provenance`.
2. **Publish `create-pleyn`.** `bun create pleyn` maps to the `create-pleyn`
   package; `prepack` bundles the template into it.
3. **A hosted demo**, so the claim can be seen rather than read.
4. **A lint rule for the `db.execute<T>()` trap**, below. It is the one failure
   in this stack that nothing currently catches.

## Things worth knowing that cost time to learn

**`db.execute<T>()` generics are an assertion, not a check.** A Drizzle raw-SQL
generic that drifts from the SQL's own column alias compiles cleanly and returns
`undefined` at runtime. Nothing caught it — not `tsc`, not the tests, because the
affected branch only runs against a database with no tables.

**A formatter can break markup that looks right.** The CSRF token is published in
the `<body>`'s `hx-headers`, whose value is JSON and therefore full of double
quotes, so the attribute has to be single-quoted. Prettier normalised the quotes,
the attribute terminated on the JSON's first key, and every mutation started
answering 403 — with nothing in the template looking wrong. The fix is to build
the whole attribute, quotes included, in code, where no formatter sees it as
markup. There is now a test that parses the token back out.

**Setting a status before a helper that also sets one does nothing.**
`c.status(422)` followed by `fragment(c, …)` — whose `status` parameter defaults
to 200 — answers 200. The validation branch looked correct and returned success.

**Renaming can silently collapse two bindings into one.** A rename that produces
a name already bound in an enclosing scope compiles, shadows, and changes
behaviour. The only reason it was caught was the linter's `no-shadow`.

**Word-list greps do not find everything.** Searching for known foreign words
finds only the words you thought of; it reported three remaining identifiers when
there were 246. Enumerating every declared name through the TypeScript AST and
reading the whole vocabulary is the check that actually terminates.

**A test that skips a security step passes for the wrong reason.** Two sign-in
tests posted without a CSRF token, so both sides of an "indistinguishable
responses" assertion were identical 403s. The test asserted nothing about
sign-in at all, and would have stayed green through any change to it.
