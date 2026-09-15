---
title: "Per-row controls"
description: "Per-row hx-* without an enclosing form."
---

Per-row controls must not sit inside one enclosing `<form>`. For a non-GET
request htmx collects the surrounding form's values and lets them override the
element's own — so every row ships every other row's value. See
[duplicate-field-in-form](/htmx-contract/rules/duplicate-field-in-form/).

## The fix

Give each control its own `hx-*` attributes. Unique ids per control. Use
`hx-include` when you need fields from elsewhere — not a table-wide form.

In the template, `TaskRow` / `TaskForm` follow this shape. The anti-pattern and
the corrected table are fixtures:

- `TABLE_WRAPPED_IN_FORM` — wrong
- `TABLE_WITH_HX_INCLUDE` — right

See [Fixtures](/htmx-contract/fixtures/) and
[Conventions](/application/conventions/).
