---
title: "duplicate-field-in-form"
description: "Shared names inside one form; htmx lets the form override the element."
---

## The failure

Two or more non-checkbox/radio controls share a `name` inside one `<form>`. For
a non-GET request htmx collects the surrounding form's values and lets them
**override** the element's own. Most body parsers keep the last occurrence — so
editing the first row saves the last row's value.

Checkboxes and radios are exempt: sharing a name is what they are for.

## Why nothing else sees it

Each row looks correct in isolation. The bug is the enclosing form, which is
easy to add “for the bulk action” and leave around the table forever.

## The fix

Give each row its own `hx-*` attributes. Use `hx-include` when you need extra
fields — do not wrap the table in one form. See
[Per-row controls](/recipes/per-row-controls/).

Fixtures: `TABLE_WRAPPED_IN_FORM` vs `TABLE_WITH_HX_INCLUDE` in
[Fixtures](/htmx-contract/fixtures/).
