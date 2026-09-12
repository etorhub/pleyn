/**
 * Who is asking.
 *
 * `loadUser` runs everywhere and only reads. `requireUser` is the guard: it
 * sends anonymous visitors to the sign-in page, keeping where they were going
 * so they land there afterwards.
 */

import type { Context, MiddlewareHandler, Next } from "hono";
import { getCookie } from "hono/cookie";

import type { User } from "../db/schema/index.ts";
import { SESSION_COOKIE, sessionDigest, userForToken } from "../lib/auth.ts";
import { redirect } from "../lib/http.ts";

export const loadUser: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  const user = await userForToken(token);
  c.set("user", user);
  // Only for a session that resolved. A digest of a token the database has
  // never heard of would derive a perfectly valid-looking CSRF token for a
  // session that does not exist.
  c.set("sessionTokenHash", user && token ? sessionDigest(token) : null);
  await next();
};

export const requireUser: MiddlewareHandler = async (
  c: Context,
  next: Next,
) => {
  const user = c.get("user") as User | null;
  if (!user) {
    const wanted = c.req.path + (new URL(c.req.url).search || "");
    // 302, not 303: this is a GET being sent somewhere else, not the answer to
    // a form post. 303 would tell a client to turn a POST into a GET, which is
    // not what happened here.
    return redirect(c, `/signin?next=${encodeURIComponent(wanted)}`, 302);
  }
  await next();
};

/** The signed-in user. Only call this behind `requireUser`. */
export function currentUser(c: Context): User {
  return c.get("user") as User;
}
