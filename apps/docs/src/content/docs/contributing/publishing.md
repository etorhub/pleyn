---
title: "Publishing"
description: "Publish order: htmx-contract first, then create-pleyn."
---

## Order

1. **Publish `htmx-contract`** to npm with provenance (`npm publish --provenance`
   from GitHub Actions). Generated apps depend on `htmx-contract: ^0.1.0` from
   the registry. Until it resolves, `bun create pleyn` cannot install.
2. **Publish `create-pleyn`.** `prepack` [bundles the template](/contributing/bundling/)
   into the package. `bun create pleyn` maps to this package name.

Bump versions, run `bun run docs:sync`, and update the docs version process on
[Docs sync](/contributing/docs/) when cutting a release. Enable
`starlight-versions` when archiving the first docs version.

## Until then

CI generates with `--no-install` and rewrites the project's
`htmx-contract` dependency to `file:<workspace-path>` so the end-to-end path
still runs. Locally, the same workaround is documented under
[Install & create](/getting-started/install/).

Do not publish `create-pleyn` before `htmx-contract`: every generated install
would fail at the first `bun install`.
