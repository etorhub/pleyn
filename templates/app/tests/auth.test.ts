/**
 * Signing in, sessions and CSRF.
 */

import { beforeEach, describe, expect, test } from "bun:test";

import { db } from "../src/db/client.ts";
import { sessions } from "../src/db/schema/index.ts";
import { app } from "../src/server.ts";
import {
  PASSWORD,
  createUser,
  postSignIn,
  resetDatabase,
  signInAs,
} from "./helpers.ts";

beforeEach(async () => {
  await resetDatabase();
  await createUser("me@example.com");
});

/** The one thing a failed sign-in is allowed to say. */
const MESSAGE = "Those details do not match";

describe("signing in", () => {
  test("with the right details, a session starts", async () => {
    const session = await signInAs("me@example.com");
    expect(session.cookie).toContain("session=");

    const res = await app.request("/tasks", {
      headers: { Cookie: session.cookie },
    });
    expect(res.status).toBe(200);
  });

  test("the database stores a digest, never the token", async () => {
    const session = await signInAs("me@example.com");
    const token = session.cookie.split("=")[1] ?? "";

    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenDigest).not.toBe(token);
    expect(rows[0]?.tokenDigest).toHaveLength(64);
  });

  test("an unknown user and a wrong password are indistinguishable", async () => {
    const both = await Promise.all(
      [
        { email: "me@example.com", password: "wrong" },
        { email: "nobody@example.com", password: PASSWORD },
      ].map(async (body) => {
        const res = await postSignIn(body);
        return { status: res.status, text: await res.text() };
      }),
    );

    // Not byte-for-byte: the form returns the address that was typed, and each
    // page carries its own CSRF seed. What must not differ is the outcome and
    // the message — anything else is a way of asking which accounts exist.
    expect(both[0]?.status).toBe(both[1]?.status);
    expect(both[0]?.text).toContain(MESSAGE);
    expect(both[1]?.text).toContain(MESSAGE);
    expect(both[0]?.text).not.toContain("No account");
    expect(both[1]?.text).not.toContain("Wrong password");
  });
});

describe("protected pages", () => {
  test("send you to sign in, keeping where you were going", async () => {
    const res = await app.request("/tasks");

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/signin?next=%2Ftasks");
  });

  test("the destination cannot point off-site", async () => {
    const res = await postSignIn({
      email: "me@example.com",
      password: PASSWORD,
      next: "//evil.example.com/",
    });

    // A protocol-relative URL is a same-origin path to anything that only
    // checks for a leading slash, and an off-site destination to a browser.
    expect(res.headers.get("location")).toBe("/tasks");
  });
});

describe("CSRF", () => {
  test("a mutation with no token is refused", async () => {
    const session = await signInAs("me@example.com");

    const res = await app.request("/tasks", {
      method: "POST",
      headers: {
        Cookie: session.cookie,
        "Content-Type": "application/x-www-form-urlencoded",
        "HX-Request": "true",
      },
      body: new URLSearchParams({ title: "No token" }).toString(),
    });

    expect(res.status).toBe(403);
  });
});
