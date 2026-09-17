/**
 * The route map, read off the router.
 *
 * No database: importing `src/server.ts` builds the Hono instance and opens no
 * connection, which is what lets this live in the fast tier. If that ever
 * changes, this test is where it shows.
 *
 * It is also the test that would catch a Hono release changing the shape of
 * `app.routes` — the one internal `cli routes` reads.
 */

import { describe, expect, test } from "bun:test";

import { describeRoutes } from "../../src/cli/routes.ts";
import { app } from "../../src/server.ts";

const report = describeRoutes(app);
const find = (method: string, path: string) =>
  report.routes.find((r) => r.method === method && r.path === path);

describe("describeRoutes", () => {
  test("GET <base> is a page", () => {
    expect(find("GET", "/tasks")).toMatchObject({
      kind: "page",
      resource: "tasks",
      guard: "requireUser",
      params: [],
    });
  });

  test("GET <base>/fragment/<name> is a fragment", () => {
    expect(find("GET", "/tasks/fragment/list")).toMatchObject({
      kind: "fragment",
      guard: "requireUser",
    });
  });

  test("a mutation is a mutation, and its parameters are named", () => {
    expect(find("DELETE", "/tasks/:id")).toMatchObject({
      kind: "mutation",
      params: ["id"],
    });
  });

  test("what is open says so", () => {
    expect(find("GET", "/signin")?.guard).toBeNull();
    expect(find("POST", "/signin")?.guard).toBeNull();
  });

  test("everything behind signedIn() is guarded, the page included", () => {
    const tasks = report.routes.filter((r) => r.path.startsWith("/tasks"));
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((r) => r.guard === "requireUser")).toBe(true);
  });

  test("middleware is reported as middleware, not as a route", () => {
    expect(report.routes.some((r) => r.method === "ALL")).toBe(false);
    expect(report.middleware.map((m) => m.name)).toContain("requireUser");
    expect(report.middleware.map((m) => m.name)).toContain("loadUser");
  });

  test("the count is the routes, and the URL rule is not breached", () => {
    expect(report.count).toBe(report.routes.length);
    expect(report.warnings).toEqual([]);
  });
});
