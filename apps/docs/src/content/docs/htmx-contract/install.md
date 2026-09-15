---
title: "Install"
description: "Add htmx-contract as a Bun-only dev dependency."
---

```bash
bun add -d htmx-contract
```

Zero dependencies. Built on Bun's `HTMLRewriter`. Knows nothing about your
application. **Bun only**, for now — the package requires Bun ≥ 1.2.

Generated PLEYN apps already depend on `htmx-contract: ^0.1.0` as a
devDependency. You only need this page when adding the checker to an existing
htmx backend, or until the first npm publish (then point at a local path — see
[Install & create](/getting-started/install/)).

## Next

- [Usage](/htmx-contract/usage/) — `checkDocument`, `checkResponse`, `swapAndCheck`
- [Rules](/htmx-contract/rules/) — what each rule catches
- [API](/htmx-contract/api/) — exports and signatures
