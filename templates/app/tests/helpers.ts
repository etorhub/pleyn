/**
 * What every test needs.
 *
 * Not a `*.test.ts` file, so `bun test` does not collect it.
 *
 * **Tokens are read from the markup, not with a regular expression.** The
 * session's CSRF token lives in the `<body>`'s `hx-headers` and the sign-in
 * one in a hidden field; `attributeOf()` finds them by looking at real
 * attributes. A regex over HTML is right until somebody moves an attribute or
 * changes the quoting, and then it fails in a way nobody can read.
 */

import { attributeOf } from "htmx-contract/inspect";

import { db } from "../src/db/client.ts";
import { sessions, tasks, users } from "../src/db/schema/index.ts";
import { hashPassword } from "../src/lib/auth.ts";
import { app } from "../src/server.ts";

export const PASSWORD = "a-test-password";

export interface TestSession {
  cookie: string;
  csrf: string;
}

/** Empties every table. Order matters: children before parents. */
export async function resetDatabase(): Promise<void> {
  await db.delete(tasks);
  await db.delete(sessions);
  await db.delete(users);
}

export async function createUser(
  email: string,
  name = "Test",
): Promise<number> {
  const [user] = await db
    .insert(users)
    .values({
      email,
      fullName: name,
      passwordHash: await hashPassword(PASSWORD),
    })
    .returning();
  if (!user) throw new Error("could not create the test user");
  return user.id;
}

/** The first cookie of a `set-cookie`, without its attributes. */
function firstCookie(header: string | null): string {
  return (header ?? "").split(";")[0] ?? "";
}

/**
 * Signs in and returns the session cookie plus its CSRF token.
 *
 * Three requests, because the application really works in three steps: the
 * form needs a seed cookie to derive its `_csrf` from, the post exchanges that
 * for a session, and the token that matches the session only exists once the
 * session does.
 */
export async function signInAs(email: string): Promise<TestSession> {
  const posted = await postSignIn({ email, password: PASSWORD });

  const cookie = firstCookie(posted.headers.get("set-cookie"));
  const pageResponse = await app.request("/tasks", {
    headers: { Cookie: cookie },
  });
  const csrf = await csrfFrom(await pageResponse.text());

  return { cookie, csrf };
}

/**
 * Posts the sign-in form the way a browser does.
 *
 * The form is fetched first, because the page is where the seed cookie and the
 * `_csrf` field come from. Posting without them is refused — correctly — so a
 * test that skips this step tests the CSRF middleware and nothing else, and
 * passes whatever the sign-in logic does.
 */
export async function postSignIn(
  fields: Record<string, string>,
): Promise<Response> {
  const form = await app.request("/signin");
  const seed = firstCookie(form.headers.get("set-cookie"));
  const token =
    (await attributeOf(await form.text(), 'input[name="_csrf"]', "value")) ??
    "";

  return app.request("/signin", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: seed,
    },
    body: new URLSearchParams({ ...fields, _csrf: token }).toString(),
  });
}

/** The token the layout publishes once, in the body's `hx-headers`. */
export async function csrfFrom(html: string): Promise<string> {
  const headers = (await attributeOf(html, "body", "hx-headers")) ?? "{}";
  try {
    return (
      (JSON.parse(headers) as Record<string, string>)["X-CSRF-Token"] ?? ""
    );
  } catch {
    return "";
  }
}

/** An authenticated request, with the token attached when it is needed. */
export async function requestAs(
  session: TestSession,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Cookie: session.cookie,
    ...(init.headers as Record<string, string>),
  };
  if (method !== "GET") {
    headers["X-CSRF-Token"] = session.csrf;
    headers["HX-Request"] = "true";
  }
  return app.request(path, { ...init, headers });
}
