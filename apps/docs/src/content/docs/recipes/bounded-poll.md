---
title: "Bounded poll"
description: "poll() / data-poll-max and pollExhausted()."
---

Never write `hx-trigger="every 2s"` by hand. A poll that stops only when the
server reports a terminal state never stops if the work dies without reaching
one — see [unbounded-poll](/htmx-contract/rules/unbounded-poll/).

## Mechanism

The attempt counter rides in the polled URL (`?attempt=N`). Each response asks
for the next attempt; when the count runs out, stop emitting a trigger and say
so. The bound is declared as `data-poll-max` so the checker can see it.

Library: `pollAttributes` / `readAttempt` from `htmx-contract/poll`.

## In a PLEYN app

```ts
import { poll, pollExhausted, attemptFromQuery } from "../lib/polling.ts";

const attempt = attemptFromQuery(c.req.query("attempt"));
if (pollExhausted(attempt)) {
  // render "gave up" — do not stay on a spinner forever
}
// else include ${poll({ url, target, attempt })} on the fragment
```

Default `MAX_ATTEMPTS` is 900 (thirty minutes at two seconds). There is no live
route in the template that polls yet — the helpers and the rule are there so
the first one is written correctly.

Fixtures: `UNBOUNDED_POLL` / `BOUNDED_POLL` in
[Fixtures](/htmx-contract/fixtures/).
