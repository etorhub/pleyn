---
title: "Docs sync & versions"
description: "How documentation stays aligned with the code, and how to cut a docs version."
---

Documentation that lies is worse than none. This site is kept honest three ways:
a checklist in the repo-root `AGENTS.md`, generated fragments that CI refuses to
let drift, and dual-maintained narrative where generation would be dishonest.

## Commands

From the repository root:

```bash
bun run docs:sync     # regenerate _generated fragments
bun run docs:check    # sync --check + astro check + astro build
bun run docs:dev      # local preview (site base is /pleyn/)
bun run docs:build    # sync + production build
```

## Generated fragments

`apps/docs/scripts/sync.ts` writes `src/generated/`:

| File | Source |
| --- | --- |
| `cli-flags.md` | `packages/create-pleyn/flags.ts` (`CLI_FLAGS`) |
| `rules.md` | `packages/htmx-contract` `RULES` |
| `exports.md` | `htmx-contract` `package.json` exports |
| `versions.md` | both packages' `package.json` versions |
| `meta.json` | structured copy of the above |

**Never edit those files by hand.** Change the source, run `docs:sync`, commit
both. Import them from MDX pages under `src/content/docs/`.

## Dual-maintained narrative

[Application conventions](/application/conventions/) and
`templates/app/AGENTS.md` must stay in lockstep. One PR updates both. There is
no auto-copy: the template file ships inside every generated app and has to
stand alone.

## Versioning

Docs versions follow **`create-pleyn`’s semver** (the product entrypoint). The
current versions are generated into `src/generated/versions.md` and shown on the
introduction page. Library pages also surface the matching `htmx-contract`
version from those fragments.

`starlight-versions` is a dependency and is ready to wire in
`astro.config.mjs`, but the plugin **requires at least one archived version** —
so it stays off until the first npm release that needs an archive.

When you publish a meaningful `create-pleyn` release and want a version switcher:

1. Bump `packages/create-pleyn/package.json` (and `htmx-contract` if it ships too).
2. Run `bun run docs:sync`.
3. Add the plugin (see [starlight-versions](https://starlight-versions.vercel.app/guides/create-new-version/)):
   configure `versions: [{ slug: '0.1.0', label: 'v0.1.0' }]` (the version you
   are archiving), start the docs dev server so it archives the current tree,
   then set `current.label` to the new version.
4. Ship. The Pages deploy on `main` publishes the new current docs.

Until that first archive, only the current docs set exists.

## Filling stubs

Prefer expanding an existing stub page over inventing a new top-level sidebar
section. A stub carries a `TODO` callout so the next pass knows what belongs
there — as of this page, every sidebar entry is filled and none remain, but
the rule holds for whatever gets stubbed in next.

## CI

The dedicated **`docs`** job on every PR runs `bun run docs:check`. It is
mandatory: red docs block the same way red tests do.

On push to `main`, `.github/workflows/docs.yml` builds the site and deploys to
**GitHub Pages**. In the repository settings, set Pages → Source to **GitHub
Actions** once. The public URL is `https://etorhub.github.io/pleyn/` until a
custom domain is configured (`base` in `astro.config.mjs` stays `/pleyn` for the
project site).
