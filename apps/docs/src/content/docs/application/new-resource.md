---
title: "new-resource"
description: "Scaffold a four-file resource with bun run new-resource."
---

Do not create the four resource files by hand. The naming is load-bearing:
`scripts/agents-md.ts` reads the directory for `docs/reference.md`, and
`bun run check` fails when a resource is missing one of them.

```bash
bun run new-resource <name> [--path <segment>] [--title <Title>]
```

| Argument | Meaning |
| --- | --- |
| `<name>` | Directory under `src/routes/`; lowercase, digits, hyphens; starts with a letter |
| `--path` | URL segment (defaults to `<name>`) |
| `--title` | Page `<h1>` (defaults to capitalised segment) |

Refuses an existing `src/routes/<name>/`.

## What it writes

Four files:

- `<name>.schema.ts`
- `<name>.fragment.ts`
- `<name>.page.ts`
- `<name>.routes.ts`

Then it registers the mount under the session guard in `src/routes/index.ts`
and the list OOB id in `src/lib/oob.ts`.

What comes out compiles and answers on its URL. It is deliberately thin — a
list, an empty state, and a filter — so you start from something that already
obeys the rules. Copy detail from `src/routes/tasks/`.

## After scaffolding

The script prints the next steps:

1. Add the table in `src/db/schema/`, then replace the placeholder row type and
   list function with a service.
2. Add the resource to `LINKS` in `src/components/layout.ts`.
3. `bun run docs && bun run ok`

Shape and conventions: [Conventions](/application/conventions/).
