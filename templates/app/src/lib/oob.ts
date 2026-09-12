/**
 * The out-of-band swap targets.
 *
 * **This file is the source of truth, and the table in `docs/reference.md`
 * comes out of it.** `bun run docs` rewrites that table and `bun run docs:check`
 * (inside `bun run check`) fails when it no longer matches. The documentation
 * cannot fall behind, because it does not exist separately: nobody has to
 * remember to update it.
 *
 * That matters more than it sounds. A list of targets written by hand beside
 * the code drifts away from it within a dozen commits, and a document that
 * lies is worse than no document, because somebody builds on it.
 *
 * **The registry is load-bearing, not decorative.** Components ask
 * `oobAttributes()` for their attributes, and it only accepts keys from here:
 * a new target that is not registered does not compile. A registry nobody
 * imports is exactly as fragile as the table it replaces.
 */

import { raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

/**
 * How a target is swapped.
 *
 * Nearly all of them are `outerHTML`: the whole node arrives and replaces what
 * was there. `#toast` is not, and the reason is in `lib/http.ts`: replacing the
 * whole node would mean the replacement has to carry `aria-live`, and the
 * browser only announces a live region that already existed when the text was
 * put into it.
 */
export type OobMode = "outerHTML" | "innerHTML";

export interface OobTarget {
  /** Which module renders it. */
  owner: string;
  /** When it changes. */
  when: string;
  mode: OobMode;
}

export const OOB_TARGETS = {
  toast: {
    owner: "lib/http.ts",
    when: "any error or confirmation",
    mode: "innerHTML",
  },
  "pending-count": {
    owner: "components/layout.ts",
    when: "a task is created, completed or deleted",
    mode: "outerHTML",
  },
  "task-list": {
    owner: "routes/tasks",
    when: "a task is created or deleted",
    mode: "outerHTML",
  },
} as const satisfies Record<string, OobTarget>;

export type OobId = keyof typeof OOB_TARGETS;

/**
 * A target's `id` and, when it applies, its `hx-swap-oob`.
 *
 * The type of `id` is what ties the registry to the code: a target that is not
 * in it does not compile.
 */
export function oobAttributes(id: OobId, oob = false): HtmlEscapedString {
  return raw(
    `id="${id}"${oob ? ' hx-swap-oob="true"' : ""}`,
  ) as HtmlEscapedString;
}

/**
 * The attribute for a wrapper that replaces a target's **content**.
 *
 * Only for `innerHTML` targets: the node being rendered is not the target
 * itself but a box carrying the new content towards it.
 */
export function oobWrapper(id: OobId): HtmlEscapedString {
  return raw(`hx-swap-oob="innerHTML:#${id}"`) as HtmlEscapedString;
}
