---
title: "unbounded-poll"
description: "hx-trigger every … with no declared bound."
---

## The failure

`hx-trigger="every …"` with no `data-poll-max`. The usual stop is for the
server to drop the trigger once work reaches a terminal state. That works until
the work *never* reaches one — killed process, stuck `running` — and the page
asks again forever, for every viewer.

A bounded poll and an unbounded one look identical in review until the bound is
declared on the markup.

## Why nothing else sees it

The happy path stops. The failure mode is “work died without a terminal state,”
which tests that always finish the job never exercise.

## The fix

Declare the bound with `data-poll-max`. Use `pollAttributes` from
`htmx-contract/poll`, or `poll()` / `pollExhausted()` in a PLEYN app — see
[Bounded poll](/recipes/bounded-poll/).

Fixtures: `UNBOUNDED_POLL` / `BOUNDED_POLL` in
[Fixtures](/htmx-contract/fixtures/).
