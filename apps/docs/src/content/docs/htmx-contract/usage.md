---
title: "Usage"
description: "checkDocument, checkResponse, swapAndCheck, and asserting after the swap."
---

The library answers two questions, then offers a third helper for tests that
care about the page the user ends up looking at.

```ts
import {
  checkDocument,
  checkResponse,
  swapAndCheck,
  formatViolations,
} from "htmx-contract";
```

## `checkDocument(html, options?)`

Is this rendered page self-consistent?

Always runs [duplicate-id](/htmx-contract/rules/duplicate-id/),
[duplicate-field-in-form](/htmx-contract/rules/duplicate-field-in-form/), and
[unbounded-poll](/htmx-contract/rules/unbounded-poll/).
[dead-target](/htmx-contract/rules/dead-target/) and
[dead-oob](/htmx-contract/rules/dead-oob/) run only when the document is a whole
page — a fragment's targets belong to the page it lands in. Auto-detect: no
`<html>` / `<!doctype>` ⇒ fragment. Override with `{ fragment: true }` or pass
`knownIds` for ids that exist outside the document.

Use it on every page the application can serve. The template's
`tests/contract.test.ts` does exactly that, and fails if a resource under
`src/routes/` is missing from the list.

## `checkResponse(options)`

Would this response, swapped into that page, do damage?

```ts
const violations = await checkResponse({
  page,
  response: await res.text(),
  headers: res.headers,
  status: res.status,
  target: "#row-1",
  swap: "outerHTML",
});
```

Runs the document rules on the response, plus
[dead-oob](/htmx-contract/rules/dead-oob/),
[empty-after-oob](/htmx-contract/rules/empty-after-oob/), and
[target-identity-lost](/htmx-contract/rules/target-identity-lost/).

## `swapAndCheck(options)`

Apply the [modelled swap](/htmx-contract/model/), then return
`{ html, violations, … }`. Assert on the DOM *after* the swap, not on the
response body. The response body is not what the user ends up looking at.

```ts
const { html, violations } = await swapAndCheck({
  page,
  response,
  target: "#task-list",
  swap: "innerHTML",
});
expect(violations).toEqual([]);
// then assert on `html`
```

`formatViolations(violations)` turns a list into a one-line failure message for
tests.

Full signatures: [API reference](/htmx-contract/api/).
