---
title: "Fixtures"
description: "Regression fixtures and poll helpers."
---

Each fixture is the smallest markup that produces one failure a rule claims to
catch, paired with the corrected version. A rule that passes its own failure is
decoration. Shapes, not screenshots — ids and copy are deliberately boring.

Import from `htmx-contract/fixtures`. Exercised in `regressions.test.ts`,
`contract.test.ts`, and `poll.test.ts`.

| Constant | Rule / purpose |
| --- | --- |
| `TOAST_ONLY_422` | [empty-after-oob](/htmx-contract/rules/empty-after-oob/) bug |
| `TOAST_ONLY_422_FIXED_HEADERS` | Fix: `{ "HX-Reswap": "none" }` |
| `TABLE_WRAPPED_IN_FORM` | [duplicate-field-in-form](/htmx-contract/rules/duplicate-field-in-form/) (+ [duplicate-id](/htmx-contract/rules/duplicate-id/)) |
| `TABLE_WITH_HX_INCLUDE` | Per-row `hx-*` without an enclosing form |
| `LIST_WITH_ONE_ROW` + `DELETE_ROW_ONLY` | [target-identity-lost](/htmx-contract/rules/target-identity-lost/) |
| `DELETE_WHOLE_LIST` | Correct last-row delete |
| `UNBOUNDED_POLL` / `BOUNDED_POLL` | [unbounded-poll](/htmx-contract/rules/unbounded-poll/) |
| `PAGE` | Minimal document to swap into |

## Poll helpers

From `htmx-contract/poll`:

- `pollAttributes({ url, target, attempt, maxAttempts, … })` — attribute string
  for the next attempt, or `null` when exhausted.
- `readAttempt(value)` — parse the attempt query param; non-integers become 0.

The bound attribute is `data-poll-max` (`BOUNDED_POLL_ATTR`). Generated apps
wrap this in `src/lib/polling.ts` (`poll` / `pollExhausted`) — see
[Bounded poll](/recipes/bounded-poll/).
