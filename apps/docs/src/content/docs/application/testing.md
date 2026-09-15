---
title: "Testing"
description: "Unit vs db tiers, contract tests, and CI job split."
---

Two tiers, declared rather than implied. See also
[Conventions](/application/conventions/).

## Tiers

| Tier | Where | Needs |
| --- | --- | --- |
| Unit | `tests/unit/` | Markup only — no Postgres |
| Full | `tests/` | Real Postgres |

```bash
bun run test:unit    # SKIP_MIGRATIONS=true bun test tests/unit
bun run test:db      # db:apply, then the full suite
bun run ok           # check + test:unit
```

If a “unit” test hits the database it fails with no service — that keeps the
split honest.

## Contract and post-swap asserts

`tests/contract.test.ts` walks pages through `htmx-contract`
(`checkDocument`). Every resource under `src/routes/` must be enrolled; a
meta-test fails when one is missing. Sign-in is checked separately.

For interactions, assert on the DOM *after* the swap with `swapAndCheck` — see
`tests/tasks.test.ts` and [Usage](/htmx-contract/usage/). The response body is
not what the user ends up looking at.

Helpers pull CSRF from markup (`attributeOf` / `hx-headers`), not with a regex.
Posts without CSRF only test middleware.

## CI in a generated app

[`templates/app/.github/workflows/ci.yml`](https://github.com/etorhub/pleyn/blob/main/templates/app/.github/workflows/ci.yml)
ships two jobs:

- **fast** — `check` + `test:unit`, **no** Postgres service
- **full** — Postgres service + `test:db`

That is what keeps the separation honest in CI as well as locally.
