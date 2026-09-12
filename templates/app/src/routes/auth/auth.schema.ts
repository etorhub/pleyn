/**
 * Sign-in validation.
 *
 * `next` is the one field worth care: it decides where the browser goes after
 * a successful sign-in, so it must never be allowed to point off-site. An
 * unchecked redirect parameter is how a link that looks like yours takes
 * somebody somewhere else.
 */

import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("That is not an email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

/** Only an internal path survives. Anything else becomes the default. */
export function safeNext(
  value: string | undefined,
  fallback = "/tasks",
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
