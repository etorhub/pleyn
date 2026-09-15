---
title: "Swap model & limits"
description: "What htmx-contract models — and what it deliberately does not."
---

`swap.ts` is a model of **htmx 2's response path**, not of htmx. It stands in
for a browser so tests can assert on the page after an interaction. Re-read
`MODELLED` when you bump `public/htmx.min.js`.

## MODELLED

- `hx-swap-oob` extraction before the main swap
- `hx-swap-oob` values: `true`, a bare swap style, and `<style>:<selector>`
- `HX-Reswap` overriding `hx-swap`, including `none`
- `HX-Retarget` overriding `hx-target`
- Swap styles: `innerHTML`, `outerHTML`, `beforebegin`, `afterbegin`,
  `beforeend`, `afterend`, `delete`, `none`
- Default swap style `innerHTML` when none is given
- 4xx responses swapping only when the application opts in (`allowErrorSwap`,
  default `true` to match a layout `htmx:beforeSwap` that swaps error toasts)

## Non-goals

Not modelled: CSS, focus, `htmx:*` event handlers, settling, transitions, or
anything a stylesheet or script does after the swap. Relative targets
(`this`, `closest …`, `find …`, …) are also out of scope for
[dead-target](/htmx-contract/rules/dead-target/) — they cannot be resolved
without a live DOM.

If a bug lives outside this list, the checker will not see it. That is
intentional: the rules catch failures that shipped in this stack, not a full
simulator.
