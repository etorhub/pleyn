---
title: "Toast-only mutation"
description: "OOB toast with HX-Reswap: none so the target is not deleted."
---

A response that is nothing but an out-of-band toast must not perform a main
swap. After htmx lifts the OOB node, the remainder is empty; under
`outerHTML`, swapping emptiness deletes `hx-target` — see
[empty-after-oob](/htmx-contract/rules/empty-after-oob/).

## In a PLEYN app

```ts
import { toastOnly } from "../lib/http.ts";

return toastOnly(c, "That item no longer exists", 422);
```

`toastOnly()` sets `HX-Reswap: none` and returns the toast via the registered
`#toast` OOB target. Used from CSRF failures, 404 handlers, and other
error paths that should not touch the triggering element.

## Without the helper

Send the same header yourself:

```
HX-Reswap: none
```

Fixture: `TOAST_ONLY_422` / `TOAST_ONLY_422_FIXED_HEADERS` in
[Fixtures](/htmx-contract/fixtures/).
