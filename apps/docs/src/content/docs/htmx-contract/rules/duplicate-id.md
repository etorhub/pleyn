---
title: "duplicate-id"
description: "The same id twice; htmx swaps the first match."
---

## The failure

The same `id` appears two or more times in one document. Invalid HTML; htmx
swaps the first match, so the wrong element is replaced. `aria-describedby` and
`label`/`for` point at the first one too.

Often rides along with [duplicate-field-in-form](/htmx-contract/rules/duplicate-field-in-form/)
when a table of rows reuses `id="status"` on every control.

## Why nothing else sees it

Browsers are lenient. Reviewers read one row. Tests that check a single row's
markup never see the collision across the table.

## The fix

Unique ids per control (`status-1`, `status-2`, …). Prefer per-row `hx-*`
without an enclosing form — see [Per-row controls](/recipes/per-row-controls/).

Fixture: `TABLE_WRAPPED_IN_FORM` in [Fixtures](/htmx-contract/fixtures/).
