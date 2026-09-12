/**
 * What middleware puts on the request.
 *
 * Declaring it here is what makes `c.get("user")` typed rather than `unknown`.
 * Without this every route would need a cast, and a cast is where a wrong
 * assumption hides.
 */

import type { User } from "../db/schema/index.ts";

declare module "hono" {
  interface ContextVariableMap {
    /** Null for anyone who has not signed in. Behind `requireUser`, never null. */
    user: User | null;
    /** Published once in the layout's `hx-headers`; every htmx request inherits it. */
    csrfToken: string;
    /**
     * The current session's digest, or null when nobody is signed in.
     *
     * `middleware/csrf.ts` derives the token from this, which is what ties the
     * token to the session: it rotates when the session does and dies with it.
     */
    sessionTokenHash: string | null;
  }
}
