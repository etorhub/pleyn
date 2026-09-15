/**
 * A session for a command, without a browser.
 *
 * The CLI already has the database and the signing key, so it mints what the
 * sign-in route would have produced rather than replaying it: one insert, and
 * the CSRF token derived from the session digest exactly as `csrfMiddleware`
 * derives it. Replaying `POST /signin` would cost three requests and, worse,
 * would make every unrelated command fail whenever the sign-in page is the
 * thing that is broken.
 *
 * **Anonymous is minted too.** Before there is a session, the token comes from
 * the `pleyn_csrf` seed cookie — so a command can drive the sign-in form
 * itself, which is the one flow worth being able to run from here.
 *
 * `tests/helpers.ts` deliberately does *not* use this. Its three-request dance
 * is the assertion in `tests/auth.test.ts`: if signing in broke, a suite built
 * on minted sessions would never notice.
 */

import { eq } from "drizzle-orm";

import { db } from "../db/client.ts";
import { users } from "../db/schema/index.ts";
import {
  createSession,
  destroySession,
  SESSION_COOKIE,
  sessionDigest,
} from "../lib/auth.ts";
import { CSRF_SEED_COOKIE, csrfTokenFor, newCsrfSeed } from "../lib/csrf.ts";
import { CliError } from "./error.ts";

export interface Actor {
  /** Who this is, or null when nobody. */
  email: string | null;
  cookie: string;
  csrf: string;
  /** The raw session token, so the session can be cleaned up after. */
  token: string | null;
}

export async function actAs(email: string): Promise<Actor> {
  const wanted = email.toLowerCase();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, wanted))
    .limit(1);

  if (!user) {
    throw new CliError(
      `no user with email ${wanted}.\n` +
        `  Create one: bun run cli user --email ${wanted} --password …`,
    );
  }

  const token = await createSession(user.id);
  return {
    email: user.email,
    cookie: `${SESSION_COOKIE}=${token}`,
    csrf: await csrfTokenFor(sessionDigest(token)),
    token,
  };
}

export async function anonymous(): Promise<Actor> {
  const seed = newCsrfSeed();
  return {
    email: null,
    cookie: `${CSRF_SEED_COOKIE}=${seed}`,
    csrf: await csrfTokenFor(seed),
    token: null,
  };
}

/** Drops the minted session, so repeated use does not silt up the table. */
export async function release(actor: Actor): Promise<void> {
  if (actor.token) await destroySession(actor.token);
}
