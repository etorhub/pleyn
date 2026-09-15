---
title: "dead-oob"
description: "An out-of-band node with no resolvable target."
---

## The failure

An `hx-swap-oob` node that names no target and has no `id`, or that targets an
id missing from the page (and from ids the response itself introduces). htmx
drops it silently — the update simply never happens.

Ids the response adds count as present: an OOB node may target something the
same response is introducing.

## Why nothing else sees it

Silent drop. The main swap can still succeed, so a body assertion looks green
while the toast or counter never updates.

## The fix

Give every OOB node a resolvable target (`innerHTML:#toast`, or an `id` when
using `hx-swap-oob="true"`). In a PLEYN app, register targets in `oob.ts` and
use `oobAttributes()` — unregistered ids do not compile.

Related: [empty-after-oob](/htmx-contract/rules/empty-after-oob/) when the
response is *only* OOB content.
