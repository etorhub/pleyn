# Working in this repository

PLEYN is one monorepo with three product parts and a docs site:

| Path | What it is |
| --- | --- |
| `packages/htmx-contract` | The checker. Publishable on its own. |
| `packages/create-pleyn` | The CLI. `bun create pleyn` runs this. |
| `templates/app` | What the CLI generates — a real application. |
| `apps/docs` | The Starlight documentation site. |

Generated apps have their own `AGENTS.md` (shipped from the template). This file
is for **this repository**.

## One command (library / packages)

```bash
bun run check
```

Types, no-leaks, and the library tests. For the template as an application:

```bash
cd templates/app && bun run ok
```

## Documentation sync contract

Documentation that lies is worse than none. The public site lives under
`apps/docs`. Keep it aligned as follows — non-negotiable.

### Generated (single source of truth)

| When you change… | Also… |
| --- | --- |
| `packages/create-pleyn/flags.ts` (`CLI_FLAGS`) | Teach `parseArguments` about the flag; run `bun run docs:sync`; fill flag prose on `cli/flags` if needed. |
| `packages/htmx-contract` `RULES` / rule implementations | Pin a fixture; expand `htmx-contract/rules/<name>`; run `bun run docs:sync`. |
| `htmx-contract` `package.json` `exports` | Run `bun run docs:sync`; expand `htmx-contract/api` if the export is public API. |
| Package versions on release | Run `bun run docs:sync`; update the docs version process in `contributing/docs` (and enable `starlight-versions` when cutting the first archive). |

**Never hand-edit** files under `apps/docs/src/generated/`.

### Dual-maintained (same PR)

| When you change… | Also update… |
| --- | --- |
| Template conventions in `templates/app/AGENTS.md` | `apps/docs/src/content/docs/application/conventions.md` |
| `application/conventions.md` on the docs site | `templates/app/AGENTS.md` |

There is no auto-copy. The template file ships inside every generated app and
must stand alone.

### Checklist before you say a docs-related change is done

- [ ] `bun run docs:sync` has been run (or `docs:check` is green).
- [ ] No hand edits under `apps/docs/src/generated/`.
- [ ] Convention changes touched **both** template `AGENTS.md` and the Starlight conventions page.
- [ ] Prefer filling an existing stub over inventing a new top-level sidebar section.
- [ ] `bun run docs:check` is green (sync drift + `astro check` + build).

### Docs commands

```bash
bun run docs:dev      # preview (base path /pleyn/)
bun run docs:sync     # regenerate generated fragments
bun run docs:check    # sync --check + astro check + build
bun run docs:build    # production build
```

Full process: [Docs sync & versions](apps/docs/src/content/docs/contributing/docs.md)
(or `/contributing/docs/` on the site).

## Prefer stubs

The sidebar already lists every planned page, and today every one of them is
filled — no `TODO` callouts remain. If a future page starts as a stub with one,
expand it rather than leaving it. Either way: do not add parallel top-level
sections for a topic that already has a page.
