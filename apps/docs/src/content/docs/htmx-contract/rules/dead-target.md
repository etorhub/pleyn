---
title: "dead-target"
description: "hx-target points at an id that is not in the document."
---

## The failure

`hx-target="#something"` where `#something` is not in the document (and not in
`knownIds`). htmx finds no target and falls back to the triggering element — so
the response lands somewhere nobody intended, often swallowing the control that
was clicked.

Relative targets (`this`, `closest …`, `find …`, `next`, `previous`, `body`,
`document`) are skipped: they cannot be resolved without a live DOM. Non-`#id`
selectors are skipped too.

## Why nothing else sees it

A typo in a string attribute. Fragments legitimately point at page ids that are
not in the fragment — which is why this rule runs only on whole pages (or when
you pass `knownIds`).

## The fix

Point at an id that exists, or register it and pass `knownIds` when checking a
partial. Prefer the OOB registry in a PLEYN app so targets stay compile-time
checked — see [Generated reference.md](/application/generated-docs/).
