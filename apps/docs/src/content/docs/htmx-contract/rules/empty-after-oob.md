---
title: "empty-after-oob"
description: "OOB-only responses without HX-Reswap: none delete the target."
---

## The failure

htmx lifts `hx-swap-oob` nodes out of the response, then swaps what remains into
`hx-target`. If what remains is nothing, it swaps nothing. With
`hx-swap="outerHTML"`, nothing *deletes the target*.

A 422 that answers with only a toast removes the row the user was editing. The
natural place to write this shape is a global error handler — then it fires on
every failed mutation at once.

## Why nothing else sees it

The response body looks fine: it contains a toast. Type checkers and linters
see strings. A test that asserts on the response body never sees the empty
remainder after OOB extraction.

## The fix

Send `HX-Reswap: none` so the main swap is suppressed and only the out-of-band
nodes apply. In a PLEYN app, use `toastOnly()` — see
[Toast-only](/recipes/toast-only/).

Fixture: `TOAST_ONLY_422` / `TOAST_ONLY_422_FIXED_HEADERS` in
[Fixtures](/htmx-contract/fixtures/).
