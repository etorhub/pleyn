---
title: "target-identity-lost"
description: "An outerHTML swap whose replacement drops the target id."
---

## The failure

An `outerHTML` swap returns markup whose root does not carry the target's id.
The swap works once; afterwards the element is unaddressable. The next click
targets an id that is no longer in the document — “worked the first time, then
stopped.”

A common shape: deleting a row by returning only that row (or a hidden stub)
when the target was the whole list. After the last delete, nothing keeps
`#item-list` (or the row id) alive for the next interaction.

## Why nothing else sees it

The first delete looks fine. Empty-after-oob is a different rule (empty
remainder). Reviewers check that *a* row vanishes, not that the list identity
survives.

## The fix

Return a replacement that still answers to the target id. For list deletes,
return the whole list (including the empty state) from one `DataTable` — see
[Delete last row](/recipes/delete-last-row/).

Fixtures: `LIST_WITH_ONE_ROW` + `DELETE_ROW_ONLY` vs `DELETE_WHOLE_LIST` in
[Fixtures](/htmx-contract/fixtures/).
