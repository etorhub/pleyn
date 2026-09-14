# htmx-contract

Checks the seam between the HTML a route returns and the DOM that receives it.

Zero dependencies. Built on Bun's `HTMLRewriter`. Knows nothing about your
application.

```bash
bun add -d htmx-contract
```

```ts
import { checkDocument, checkResponse, swapAndCheck } from "htmx-contract";

const onPage = await checkDocument(html);
const onResponse = await checkResponse({
  page,
  response: await res.text(),
  headers: res.headers,
  status: res.status,
  target: "#row-1",
  swap: "outerHTML",
});
```

Bun only, for now.

**Full documentation:** [etorhub.github.io/pleyn/htmx-contract/install/](https://etorhub.github.io/pleyn/htmx-contract/install/)
(rules, API, swap model, non-goals).

## Licence

MIT.
