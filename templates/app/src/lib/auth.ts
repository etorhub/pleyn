/**
 * Passwords and sessions.
 *
 * Two decisions worth knowing:
 *
 * **The database stores `sha256(token)`, never the token.** A leaked dump does
 * not hand anybody a working session.
 *
 * **Password checking is constant-ish in time whether or not the user exists.**
 * If a missing user returned immediately, the response time would say which
 * email addresses are registered. So a dummy hash is verified in that case.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { and, eq, gt, ne } from "drizzle-orm";

import { db } from "../db/client.ts";
import { sessions, users, type User } from "../db/schema/index.ts";
import { config } from "./config.ts";

export const SESSION_COOKIE = "session";

/**
 * A hash of a password nobody has, verified when the user does not exist so
 * that the timing of a failed sign-in does not leak whether the account is
 * real. Computed once, lazily.
 */
let dummyHash: string | null = null;
async function dummyVerify(password: string): Promise<void> {
  dummyHash ??= await Bun.password.hash(randomBytes(24).toString("hex"));
  await Bun.password.verify(password, dummyHash);
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

/**
 * What the `sessions` table stores, and what the CSRF token is derived from.
 *
 * Exported because the CSRF token has to be tied to the session without the
 * raw token ever leaving this file: the digest is safe to hand around, the
 * token is not.
 */
export function sessionDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const digest = sessionDigest;

/** A fresh session token. Returned once; only its digest is stored. */
export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.sessionDays * 86_400_000);

  await db
    .insert(sessions)
    .values({ userId, tokenDigest: digest(token), expiresAt });
  return token;
}

/** The user behind a token, or null. Expired sessions count as absent. */
export async function userForToken(
  token: string | undefined,
): Promise<User | null> {
  if (!token) return null;

  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenDigest, digest(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row || !row.user.isActive) return null;
  return row.user;
}

/**
 * Signs in, or returns null.
 *
 * Deliberately gives the caller no way to tell "no such user" from "wrong
 * password": both are null, and both cost about the same time.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    await dummyVerify(password);
    return null;
  }

  const ok = await Bun.password.verify(password, user.passwordHash);
  if (!ok || !user.isActive) return null;

  return user;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenDigest, digest(token)));
}

/**
 * Ends every *other* session for a user.
 *
 * Keeping the current one is deliberate: the CSRF token already drawn on the
 * page derives from this session, so dropping it would make the next request
 * fail for a reason nobody could work out.
 */
export async function destroyOtherSessions(
  userId: number,
  keep: string,
): Promise<void> {
  await db
    .delete(sessions)
    .where(
      and(eq(sessions.userId, userId), ne(sessions.tokenDigest, digest(keep))),
    );
}

/** Constant-time compare for tokens that arrive from a request. */
export function sameToken(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
