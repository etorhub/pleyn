/**
 * Every route the application answers on, out of Hono's own table.
 *
 * The alternative is reading `src/routes/` and believing it, and a map drawn by
 * hand beside the code drifts from it within a dozen commits. This one cannot:
 * it is the router, printed.
 *
 * It exists because this stack has a rule about URLs — `GET <base>` is a whole
 * page, `GET <base>/fragment/<name>` is a fragment, and the URL decides, never
 * the `HX-Request` header — and a rule about who may reach them. Both are
 * facts about the router, so both are read off it rather than guessed at.
 */

import type { Hono } from "hono";

import { requireUser } from "../middleware/session.ts";
import { parseArgs } from "./args.ts";
import { columns, emit, type Outcome } from "./output.ts";

/** What the URL promises to return. */
export type RouteKind = "page" | "fragment" | "mutation";

export interface RouteRecord {
  method: string;
  path: string;
  kind: RouteKind;
  /** The directory under `src/routes/` it was mounted from, when it has one. */
  resource: string | null;
  /** The guard it sits behind, or null when anybody may reach it. */
  guard: "requireUser" | null;
  /** The `:name` segments, in order. */
  params: string[];
}

export interface MiddlewareRecord {
  method: string;
  path: string;
  name: string;
}

export interface RoutesReport {
  count: number;
  routes: RouteRecord[];
  middleware: MiddlewareRecord[];
  /** Breaches of the URL rule that cost nothing to notice. */
  warnings: string[];
}

/**
 * Middleware is registered for every method, on a pattern. Handlers are not.
 *
 * The wildcard is what separates them, not the method alone: `serveStatic` is
 * mounted on `ALL /*.js`, which is a file mount and not a route anybody calls,
 * while a deliberate `app.all("/webhook")` carries no wildcard and stays in the
 * table where it belongs.
 */
function isMiddleware(method: string, path: string): boolean {
  return method === "ALL" && path.includes("*");
}

/**
 * The prefixes that sit behind the session guard.
 *
 * `signedIn()` in `src/routes/index.ts` mounts `use("*", requireUser)` on a
 * wrapper, so the guard appears in the table as `ALL /<mount>/*` carrying
 * `requireUser` itself. Comparing the function is a fact rather than a guess
 * about path shapes — and if a future Hono ever wraps handlers on the way in,
 * the fallback below still finds the mounts, because no other middleware in
 * this application is registered on anything but `/*`.
 */
function guardedPrefixes(app: Hono): string[] {
  const middleware = app.routes.filter((entry) =>
    isMiddleware(entry.method, entry.path),
  );

  const byIdentity = middleware.filter(
    (entry) => (entry.handler as unknown) === (requireUser as unknown),
  );

  const found =
    byIdentity.length > 0
      ? byIdentity
      : middleware.filter(
          (entry) => entry.path.endsWith("/*") && entry.path !== "/*",
        );

  return found.map((entry) => entry.path.replace(/\/\*$/, ""));
}

function kindOf(method: string, path: string): RouteKind {
  if (path.includes("/fragment/")) return "fragment";
  return method === "GET" || method === "HEAD" ? "page" : "mutation";
}

/** The router as a table. Pure: hand it an app, get a record. */
export function describeRoutes(app: Hono): RoutesReport {
  const prefixes = guardedPrefixes(app);
  const routes: RouteRecord[] = [];
  const middleware: MiddlewareRecord[] = [];
  const warnings: string[] = [];

  for (const entry of app.routes) {
    if (isMiddleware(entry.method, entry.path)) {
      middleware.push({
        method: entry.method,
        path: entry.path,
        name: entry.handler.name === "" ? "(anonymous)" : entry.handler.name,
      });
      continue;
    }

    const guarded = prefixes.some(
      (prefix) =>
        prefix !== "" &&
        (entry.path === prefix || entry.path.startsWith(`${prefix}/`)),
    );

    const base = (entry.basePath ?? "/").replace(/^\//, "");

    routes.push({
      method: entry.method,
      path: entry.path,
      kind: kindOf(entry.method, entry.path),
      resource: base === "" ? null : base,
      guard: guarded ? "requireUser" : null,
      params: entry.path
        .split("/")
        .filter((segment) => segment.startsWith(":"))
        .map((segment) => segment.slice(1)),
    });

    if (entry.path.includes("/fragment/") && entry.method !== "GET") {
      warnings.push(
        `${entry.method} ${entry.path} — a fragment URL answered by a mutation. ` +
          "`/fragment/` is what a GET returns; a mutation returns the piece that changed.",
      );
    }
  }

  return { count: routes.length, routes, middleware, warnings };
}

export function format(report: RoutesReport): string {
  const rows = report.routes.map((route) => [
    route.method,
    route.path,
    route.kind,
    route.guard === null ? "open" : "signed in",
    route.resource ?? "",
  ]);

  const parts = [columns(rows)];

  if (report.middleware.length > 0) {
    parts.push(
      "",
      "Before every match:",
      columns(report.middleware.map((m) => [`  ${m.path}`, m.name])),
    );
  }

  if (report.warnings.length > 0) {
    parts.push("", ...report.warnings.map((warning) => `! ${warning}`));
  }

  return parts.join("\n");
}

export async function run(argv: readonly string[]): Promise<Outcome> {
  const args = parseArgs(argv, { booleans: ["json"] });

  // Imported here rather than at the top: `src/cli/commands.ts` is read by the
  // documentation generator, and nothing it can reach should start the app.
  const { app } = await import("../server.ts");
  const report = describeRoutes(app);

  return emit(
    args.bool("json"),
    report,
    () => format(report),
    report.warnings.length > 0 ? 1 : 0,
  );
}
