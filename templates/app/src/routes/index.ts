/**
 * Route registry.
 *
 * Two levels: what anyone can reach, and what needs a session.
 *
 * **Mind how the guard is mounted.** Hono matches in registration order, so
 * `tasksRoutes.use("*", requireUser)` written here — after `tasks.routes.ts`
 * has already registered its handlers — would never run. And putting
 * `app.use("*", requireUser)` at the top would guard the sign-in page too and
 * lock everybody out. So the guard goes on a wrapper that is built before
 * anything is mounted into it.
 *
 * `bun run new-resource <name>` writes the wrapper for you.
 */

import { Hono } from "hono";

import { requireUser } from "../middleware/session.ts";
import { authRoutes } from "./auth/auth.routes.ts";
import { homeRoutes } from "./home/home.routes.ts";
import { tasksRoutes } from "./tasks/tasks.routes.ts";

/** Hangs a set of routes behind the session guard. */
function signedIn(routes: Hono): Hono {
  const guarded = new Hono();
  guarded.use("*", requireUser);
  guarded.route("/", routes);
  return guarded;
}

export function registerRoutes(app: Hono): void {
  // --- Open ------------------------------------------------------------------
  app.route("/", homeRoutes);
  app.route("/", authRoutes);

  // --- Signed in -------------------------------------------------------------
  app.route("/tasks", signedIn(tasksRoutes));
}
