---
title: "CSS & Tailwind"
description: "Local Tailwind build, no CDN, css and css:watch."
---

The stylesheet is built locally and served by the application. No CDN for CSS,
fonts, or htmx — see [Conventions](/application/conventions/).

## Build

```bash
bun run css          # once
bun run css:watch    # while developing styles
```

Tailwind v4 CLI:

```
tailwindcss -i src/styles/app.css -o public/app.css
```

`src/styles/app.css` uses `@import "tailwindcss"` and an `@theme` block.
`public/app.css` is gitignored — `create-pleyn` runs `css` for you; after a
clone, run it yourself before `dev` if the file is missing.

## Serving

`staticHref("app.css")` adds a content-digest query so caches bust on change.
Static assets get a long `immutable` Cache-Control.

Prefer semantic classes (`card`, `chip`, `badge`, `data`) over long utility
strings — a fragment you can read is a fragment you can review.
