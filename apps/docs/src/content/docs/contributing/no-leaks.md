---
title: "no-leaks"
description: "Keep origin-application vocabulary out of the public tree."
---

`htmx-contract` was extracted from a private application. Origin vocabulary —
Catalan domain terms, old commit hashes — must not return a paste at a time.

```bash
bun run leaks    # scripts/no-leaks.ts
```

Wired into root `bun run check` and CI.

## What it does

Walks text files under the repo (skipping `.git`, `node_modules`, `dist`, …).
Matches a banned word list as whole words (`\b…\b`), case-insensitive. Hits
fail the script.

The list lives in [`scripts/no-leaks.ts`](https://github.com/etorhub/pleyn/blob/main/scripts/no-leaks.ts).
Add a term when something slips through review; do not delete terms because
they “look cleared.”

Word-list greps are incomplete by nature — see [Pitfalls](/status/pitfalls/) —
but they are cheap and catch the known leaks. A fuller AST vocabulary check is
future work if it becomes necessary.
