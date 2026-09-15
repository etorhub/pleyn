---
title: "Delete last row"
description: "Rows and empty state from one DataTable so the last delete stays honest."
---

If rows and the empty state are drawn in separate branches, deleting the last
row leaves a table header over nothing forever. The delete route that returns
only the vanished row has no reason to know the empty state exists.

Returning a row stub under `outerHTML` into a list target can also lose the
list's identity — see
[target-identity-lost](/htmx-contract/rules/target-identity-lost/).

## The fix

One function takes both rows and the empty state. In the template, `DataTable`
does that; `TaskList` always goes through it. Delete targets `#task-list` and
returns the whole `TaskList` (empty or not), not a single row.

```ts
// delete handler — conceptual
return fragment(
  c,
  TaskList({ tasks: remaining, filters, total, pages }),
);
```

Assert with `swapAndCheck` on the post-swap DOM (`tests/tasks.test.ts`), not
on the response body alone.

Fixtures: `LIST_WITH_ONE_ROW`, `DELETE_ROW_ONLY`, `DELETE_WHOLE_LIST` in
[Fixtures](/htmx-contract/fixtures/).
