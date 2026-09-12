/**
 * The root.
 *
 * It shows nothing of its own: it sends you where you were going to end up
 * anyway. A landing page with one link on it is a page nobody wants.
 */

import { Hono } from "hono";

import { redirect } from "../../lib/http.ts";

export const homeRoutes = new Hono();

homeRoutes.get("/", (c) => redirect(c, c.get("user") ? "/tasks" : "/signin"));

/** For load balancers and `docker compose` health checks. */
homeRoutes.get("/health", (c) => c.json({ ok: true }));
