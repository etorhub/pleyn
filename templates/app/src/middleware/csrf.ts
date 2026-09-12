/**
 * The CSRF check, on every request that changes something.
 *
 * `GET` and `HEAD` are not checked, because they must not change anything. A
 * `GET` route that writes is a bug in that route, not a gap here.
 *
 * This middleware also **publishes** the token, so the layout can put it in the
 * `<body>`'s `hx-headers` exactly once and every htmx request inherits it. One
 * token per page, never one per form.
 */

import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";

import { config } from "../lib/config.ts";
import {
  CSRF_FIELD,
  CSRF_HEADER,
  CSRF_SEED_COOKIE,
  newCsrfSeed,
  csrfTokenFor,
  csrfTokenValid,
  originAllowed,
} from "../lib/csrf.ts";
import { toastOnly } from "../lib/http.ts";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Routes exempt from the check.
 *
 * Empty, and it should stay that way. An exemption is a hole; if you add one,
 * say here what protects that route instead.
 */
const EXEMPT: readonly RegExp[] = [];

export const csrfMiddleware: MiddlewareHandler = async (c, next) => {
  /**
   * The seed the token derives from.
   *
   * With a session it is that session's digest, so the token rotates when the
   * session does and dies with it. Without one — the sign-in form — it is a
   * short-lived cookie set here, because that form has to be protected too and
   * there is no session yet to hang it on.
   */
  let seed =
    c.get("sessionTokenHash") ?? getCookie(c, CSRF_SEED_COOKIE) ?? null;

  if (seed === null && SAFE_METHODS.has(c.req.method)) {
    seed = newCsrfSeed();
    setCookie(c, CSRF_SEED_COOKIE, seed, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: "Lax",
      path: "/",
      maxAge: 3600,
    });
  }

  c.set("csrfToken", seed ? await csrfTokenFor(seed) : "");

  if (SAFE_METHODS.has(c.req.method)) return next();

  const path = new URL(c.req.url).pathname;
  if (EXEMPT.some((pattern) => pattern.test(path))) return next();

  if (!originAllowed(c)) {
    return toastOnly(c, "That request came from somewhere unexpected", 403);
  }

  if (seed === null) {
    return toastOnly(c, "Your session has ended. Reload the page.", 403);
  }

  // The header comes from the body's `hx-headers`; the hidden field is for the
  // forms that do not go through htmx, which is only the sign-in form.
  let presented = c.req.header(CSRF_HEADER);
  if (presented === undefined) {
    const type = c.req.header("Content-Type") ?? "";
    if (
      type.includes("application/x-www-form-urlencoded") ||
      type.includes("multipart/form-data")
    ) {
      const body = await c.req.parseBody();
      const field = body[CSRF_FIELD];
      if (typeof field === "string") presented = field;
    }
  }

  if (!(await csrfTokenValid(seed, presented))) {
    return toastOnly(c, "This form has expired. Reload the page.", 403);
  }

  await next();
};
