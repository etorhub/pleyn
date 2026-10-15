---
title: "Publishing"
description: "Publish order: htmx-contract first, then create-pleyn."
---

## On npm today

| Package | Version | Registry |
| --- | --- | --- |
| [`htmx-contract`](https://www.npmjs.com/package/htmx-contract) | `0.1.0` | public |
| [`create-pleyn`](https://www.npmjs.com/package/create-pleyn) | `0.1.0` | public |

Both were first published from GitHub Actions with provenance. Docs versioning
follows **`create-pleyn`** — see [Docs sync](/contributing/docs/).

## Order (every release)

1. **Publish `htmx-contract`** first. Generated apps depend on
   `htmx-contract: ^0.1.0` from the registry.
2. **Publish `create-pleyn`.** `prepack` [bundles the template](/contributing/bundling/)
   into the package. `bun create pleyn` maps to this package name.

Do not publish `create-pleyn` before `htmx-contract`: every generated install
would fail at the first `bun install`.

Bump versions, run `bun run docs:sync`, and follow the version process on
[Docs sync](/contributing/docs/) when cutting a release. Enable
`starlight-versions` when archiving a docs version.

## Workflow

[`.github/workflows/publish.yml`](https://github.com/etorhub/pleyn/blob/main/.github/workflows/publish.yml)
runs on **workflow_dispatch**. It publishes `htmx-contract`, then `create-pleyn`,
with `--provenance --access public`. Bun is installed so `create-pleyn`'s
`prepack` can bundle the template.

Auth is **OIDC Trusted Publishing** — no long-lived `NPM_TOKEN` on the repo.
The job needs `permissions.id-token: write` (already set).

### Trusted Publisher

Configured on npmjs.com for **each** package (Settings → Trusted Publisher →
GitHub Actions):

| Field | Value |
| --- | --- |
| Organization or user | `etorhub` |
| Repository | `pleyn` |
| Workflow filename | `publish.yml` |

To re-run a release: Actions → **Publish** → Run workflow.

### Brand-new package names (rare)

npm requires a package to **exist** before you can attach a Trusted Publisher.
For a name that has never been published, bootstrap once with a granular
automation token as `NPM_TOKEN`, run the workflow, attach the Trusted Publisher,
then delete the secret. That bootstrap is done for `htmx-contract` and
`create-pleyn`; ordinary releases do not need a token.

## CI note

The create-pleyn CI job still generates with `--no-install` and rewrites
`htmx-contract` to `file:<workspace-path>` so the monorepo always exercises the
workspace copy of the library. Real users install from the registry via
`bun create pleyn`.
