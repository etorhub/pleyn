/**
 * Polling, bounded.
 *
 * `AGENTS.md` says not to poll. Where a poll is genuinely the answer — waiting
 * on work that runs outside the request, with no channel to push on — this is
 * how it is written, and it is the only way it is written.
 *
 * A poll that stops **only** when the server says the work has finished is
 * correct exactly as long as the work finishes. When it does not — a killed
 * process, a restarted container, a row left `running` for ever — the page
 * asks for it every two seconds, indefinitely, for everyone looking at it. The
 * markup of a poll that will stop and one that never will is identical, which
 * is why this is invisible in review; declaring the bound is what makes the
 * difference checkable.
 *
 * So the attempt counter travels **in the URL being polled**. It is
 * server-authoritative and holds no client state, like everything else here:
 * each response asks for the next attempt, and when they run out the fragment
 * stops emitting a trigger and says that it has given up.
 *
 * This file is the thin application layer; the mechanism, and the rule that
 * checks it, live in `htmx-contract`.
 */

import { raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

import { pollAttributes, readAttempt } from "htmx-contract/poll";

/** The query parameter the counter rides in. */
export const ATTEMPT_PARAM = "attempt";

/**
 * Thirty minutes at two seconds.
 *
 * Generous on purpose: the cost of giving up late is a few wasted requests,
 * and the cost of giving up early is telling somebody their work failed while
 * it is still running. Pass `maxAttempts` where a resource knows better.
 */
export const MAX_ATTEMPTS = 900;

export interface PollOptions {
  /** The URL of the fragment being polled. */
  url: string;
  /** Where the response goes. */
  target: string;
  /** Which attempt rendered this. The first one is 0. */
  attempt: number;
  /** How many seconds between attempts. */
  everySeconds?: number;
  maxAttempts?: number;
}

/**
 * The attributes for one more attempt, or `""` when there are none left.
 *
 * The caller must check `pollExhausted()` to show that it has given up: it is
 * not enough to stop emitting the trigger silently, because then the page sits
 * there showing a spinner that will never move.
 */
export function poll(options: PollOptions): HtmlEscapedString | "" {
  const attributes = pollAttributes({
    url: options.url,
    target: options.target,
    everyMs: (options.everySeconds ?? 2) * 1000,
    attempt: options.attempt,
    maxAttempts: options.maxAttempts ?? MAX_ATTEMPTS,
    attemptParam: ATTEMPT_PARAM,
  });
  return attributes === null ? "" : (raw(attributes) as HtmlEscapedString);
}

/** Whether this attempt is already past the limit. */
export function pollExhausted(
  attempt: number,
  maxAttempts = MAX_ATTEMPTS,
): boolean {
  return attempt >= maxAttempts;
}

/** The attempt counter as it arrives in the query string. */
export function attemptFromQuery(value: string | null | undefined): number {
  return readAttempt(value);
}
