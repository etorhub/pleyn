---
title: "Template bundling"
description: "prepack copies templates/app into create-pleyn/template."
---

npm ships one package directory. A `files` entry pointing outside it is
silently dropped. Keeping two template copies in git means keeping them in
step by hand — and that never survives.

So there is **one** source: `templates/app/`, a workspace member with its own
CI. At pack time:

```bash
# packages/create-pleyn prepack
bun run ../../scripts/bundle-template.ts
```

[`scripts/bundle-template.ts`](https://github.com/etorhub/pleyn/blob/main/scripts/bundle-template.ts)
copies into `packages/create-pleyn/template/` with the same skip set the CLI
uses when generating (`node_modules`, `.git`, `bun.lock`, `.env`, `dist`).
`template/` is gitignored.

From a checkout, `create-pleyn` resolves `../../templates/app` directly when
the bundled copy is absent — see [Project layout](/getting-started/layout/).
