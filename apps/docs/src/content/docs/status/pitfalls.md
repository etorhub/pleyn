---
title: "Pitfalls"
description: "Things worth knowing that cost time to learn."
---

Hard-won. Each of these burned real hours. They live here so nobody has to learn
them the expensive way twice.

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
finds only the words you thought of. Enumerating every declared name through the
TypeScript AST and reading the whole vocabulary is the check that actually
terminates — see [no-leaks](/contributing/no-leaks/).

**A test that skips a security step passes for the wrong reason.** Two sign-in
tests posted without a CSRF token, so both sides of an "indistinguishable
responses" assertion were identical 403s. The test asserted nothing about
sign-in at all, and would have stayed green through any change to it.

**Registering an out-of-band target is not the same as sending one out of
band.** `TaskList` is the response when the request targets `#task-list`, and a
passenger when `POST /tasks` targets the form instead. It carried no
`hx-swap-oob` in either case, so on every add it stayed in the remainder and
was swapped into the form's place: two `#task-list`s, two of every `#task-N`,
and htmx swapping the first match — the copy inside the form — from then on.
The route's own comment said the list rode along out of band. The response was
impeccable; only the document after the swap showed it.

**A substring assertion cannot say which node carries an attribute.** The test
covering that response looked for `hx-swap-oob="true"` anywhere in the body and
found it — on the counter, which was out of band, while the list beside it was
not. It passed for the wrong reason for as long as the bug existed. Name the
nodes: `inspect(body).oob` says what is really travelling. And assert on the
page after the swap, which is where the duplicate ids lived, not on the body,
where they never appeared.
