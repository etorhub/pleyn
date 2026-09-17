/**
 * Working out what an interaction targets, from the page it starts on.
 *
 * A guessed target produces a post-swap DOM that is confidently wrong, and a
 * confidently wrong answer is worse than a refusal — so the resolution says
 * where each half came from, and these tests pin that precedence.
 *
 * Pure: markup in, record out. No application, no database.
 */

import { describe, expect, test } from "bun:test";

import { pageFor, resolveSwap } from "../../src/cli/request.ts";

const PAGE = `<!doctype html>
<html><body>
  <form id="task-form" hx-post="/tasks" hx-target="#task-list" hx-swap="outerHTML">
    <input name="title" />
  </form>
  <div id="task-list">
    <button hx-delete="/tasks/1" hx-target="#row-1">Delete</button>
  </div>
</body></html>`;

describe("pageFor", () => {
  test("a fragment belongs to the page above it", () => {
    expect(pageFor("/tasks/fragment/list?show=open")).toBe("/tasks");
  });

  test("a mutation belongs to its resource", () => {
    expect(pageFor("/tasks/7/toggle")).toBe("/tasks");
  });

  test("the root is the root", () => {
    expect(pageFor("/")).toBe("/");
  });
});

describe("resolveSwap", () => {
  test("takes the target and the style off the triggering element", async () => {
    const resolved = await resolveSwap(PAGE, "POST", "/tasks");
    expect(resolved).toMatchObject({
      target: "#task-list",
      targetSource: "page",
      style: "outerHTML",
      styleSource: "page",
    });
    expect(resolved.trigger).toMatchObject({ tag: "form", id: "task-form" });
  });

  test("an explicit flag wins over the page", async () => {
    const resolved = await resolveSwap(PAGE, "POST", "/tasks", {
      target: "#toast",
      style: "innerHTML",
    });
    expect(resolved).toMatchObject({
      target: "#toast",
      targetSource: "flag",
      style: "innerHTML",
      styleSource: "flag",
    });
  });

  test("matches on the path, ignoring the query string", async () => {
    const resolved = await resolveSwap(PAGE, "DELETE", "/tasks/1?show=open");
    expect(resolved.target).toBe("#row-1");
  });

  test("when nothing on the page sends this request, it says so", async () => {
    const resolved = await resolveSwap(PAGE, "POST", "/projects");
    expect(resolved.trigger).toBeNull();
    expect(resolved.target).toBeNull();
    expect(resolved.style).toBe("innerHTML");
    expect(resolved.styleSource).toBe("default");
  });
});
