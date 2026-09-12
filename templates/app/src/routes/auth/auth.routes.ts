/**
 * Signing in and out.
 *
 * Both are ordinary form posts rather than htmx requests, because both need a
 * real navigation afterwards with a changed cookie.
 */

import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import {
  SESSION_COOKIE,
  createSession,
  destroySession,
  signIn,
} from "../../lib/auth.ts";
import { config } from "../../lib/config.ts";
import { page, redirect } from "../../lib/http.ts";
import { SignInPage } from "./auth.page.ts";
import { safeNext, signInSchema } from "./auth.schema.ts";

export const authRoutes = new Hono();

authRoutes.get("/signin", (c) => {
  if (c.get("user")) return redirect(c, "/tasks");

  return page(
    c,
    SignInPage({
      csrfToken: c.get("csrfToken") ?? "",
      next: c.req.query("next"),
    }),
  );
});

authRoutes.post("/signin", async (c) => {
  const parsed = signInSchema.safeParse(await c.req.parseBody());

  if (!parsed.success) {
    c.status(422);
    return page(
      c,
      SignInPage({
        csrfToken: c.get("csrfToken") ?? "",
        error: parsed.error.issues[0]?.message ?? "Check those details",
      }),
    );
  }

  const { email, password, next } = parsed.data;
  const user = await signIn(email, password);

  if (!user) {
    // One message for every failure. Saying "no such user" would turn this
    // form into a way of discovering who has an account.
    c.status(422);
    return page(
      c,
      SignInPage({
        csrfToken: c.get("csrfToken") ?? "",
        next,
        email,
        error: "Those details do not match",
      }),
    );
  }

  const token = await createSession(user.id);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: config.sessionDays * 86_400,
  });

  return redirect(c, safeNext(next));
});

authRoutes.post("/signout", async (c) => {
  await destroySession(getCookie(c, SESSION_COOKIE));
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return redirect(c, "/signin");
});
