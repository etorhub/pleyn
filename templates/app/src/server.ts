/**
 * The server.
 *
 * One process serves the HTML and its own static files. No bundler, no
 * separate API, no client build step — which is why `bun run dev` is the whole
 * development setup.
 */

import { Hono } from "hono";
import { serveStatic } from "hono/bun";

import "./lib/context.ts";
import { config, validateConfig } from "./lib/config.ts";
import { describeError, toastOnly } from "./lib/http.ts";
import { csrfMiddleware } from "./middleware/csrf.ts";
import { loadUser } from "./middleware/session.ts";
import { registerRoutes } from "./routes/index.ts";

validateConfig();

export const app = new Hono();

// Static files carry a long immutable cache; `staticHref()` busts it with a
// content digest, so a deployment is picked up without a stale-cache dance.
app.use(
  "/*.js",
  serveStatic({
    root: "./public",
    onFound: (_p, c) =>
      c.header("Cache-Control", "public, max-age=31536000, immutable"),
  }),
);
app.use(
  "/*.css",
  serveStatic({
    root: "./public",
    onFound: (_p, c) =>
      c.header("Cache-Control", "public, max-age=31536000, immutable"),
  }),
);

app.use("*", loadUser);
app.use("*", csrfMiddleware);

registerRoutes(app);

/**
 * Errors answer with the right status and a body containing **only** the
 * out-of-band toast, plus `HX-Reswap: none`.
 *
 * Without that header htmx swaps the emptiness left after the toast is lifted
 * out into the target — which under `outerHTML` deletes the element the user
 * was touching. A global handler is the worst place for that to happen,
 * because it fires on every failed mutation at once.
 */
app.notFound((c) => {
  if (c.req.header("HX-Request"))
    return toastOnly(c, "That page does not exist", 404);
  c.status(404);
  return c.text("Not found");
});

app.onError((error, c) => {
  const { message, status } = describeError(error);
  if (status >= 500) console.error(error);

  if (c.req.header("HX-Request")) return toastOnly(c, message, status);
  c.status(status as 400);
  return c.text(message);
});

export default {
  port: config.port,
  fetch: app.fetch,
};
