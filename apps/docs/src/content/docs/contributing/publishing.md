---
title: "Publishing"
description: "Publish order: htmx-contract first, then create-pleyn."
---

## Order

1. **Publish `htmx-contract`** to npm with provenance from GitHub Actions.
   Generated apps depend on `htmx-contract: ^0.1.0` from the registry.
2. **Publish `create-pleyn`.** `prepack` [bundles the template](/contributing/bundling/)
   into the package. `bun create pleyn` maps to this package name.

Do not publish `create-pleyn` before `htmx-contract`: every generated install
would fail at the first `bun install`.

Bump versions, run `bun run docs:sync`, and update the docs version process on
[Docs sync](/contributing/docs/) when cutting a release. Enable
`starlight-versions` when archiving the first docs version.

## Workflow

[`.github/workflows/publish.yml`](https://github.com/etorhub/pleyn/blob/main/.github/workflows/publish.yml)
runs on **workflow_dispatch**. It publishes `htmx-contract`, then `create-pleyn`,
with `--provenance --access public`. Bun is installed so `create-pleyn`'s
`prepack` can bundle the template.

### Trusted Publisher (preferred)

On [npmjs.com](https://www.npmjs.com/) for **each** package, under Settings →
Trusted Publisher, add GitHub Actions:

| Field | Value |
| --- | --- |
| Organization or user | `etorhub` |
| Repository | `pleyn` |
| Workflow filename | `publish.yml` |

npm requires the package to **exist** before you can attach a Trusted Publisher.
For a brand-new name, bootstrap once with a granular automation token (below),
then add the Trusted Publisher and remove the token.

### First publish bootstrap

1. Create a granular npm automation token with publish access.
2. Add it as the `NPM_TOKEN` repository secret on GitHub.
3. Run the **Publish** workflow.
4. On npmjs.com, configure the Trusted Publisher as above.
5. Delete `NPM_TOKEN` from the repo secrets (OIDC takes over).

Subsequent publishes need no long-lived token: the workflow's `id-token: write`
permission is enough.

## CI note

The create-pleyn CI job still generates with `--no-install` and rewrites
`htmx-contract` to `file:<workspace-path>` so the monorepo exercises the
workspace copy without waiting on the registry. That is a workspace shortcut,
not a substitute for publishing.
