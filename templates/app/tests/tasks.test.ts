/**
 * The tasks resource, end to end.
 *
 * The interesting assertions are not "does it work" but the two structural
 * guarantees: **a mutation returns the piece that changed plus whatever it
 * changed elsewhere**, and **deleting the last row shows the empty state**
 * rather than leaving a header over nothing.
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { checkDocument, inspect, swapAndCheck } from "htmx-contract";

import { resolveSwap } from "../src/cli/request.ts";
import { app } from "../src/server.ts";
import { listTasks } from "../src/services/tasks.ts";
import { taskQuerySchema } from "../src/routes/tasks/tasks.schema.ts";
import {
  createUser,
  requestAs,
  resetDatabase,
  signInAs,
  type TestSession,
} from "./helpers.ts";
import { createTask } from "../src/services/tasks.ts";

let session: TestSession;
let userId = 0;

const occurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

beforeEach(async () => {
  await resetDatabase();
  userId = await createUser("tasks@example.com");
  session = await signInAs("tasks@example.com");
});

describe("creating", () => {
  test("adds the task and sends the list and the counter out of band", async () => {
    const res = await requestAs(session, "/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ title: "Write it down" }).toString(),
    });

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Write it down");

    // The nodes are named, not searched for. This assertion used to look for
    // `hx-swap-oob="true"` anywhere in the body, and it passed for a year
    // while the list did not carry it: the counter did, and a substring
    // cannot say which node an attribute belongs to.
    const snapshot = await inspect(body);
    expect(snapshot.oob.map((node) => node.target).toSorted()).toEqual([
      "#pending-count",
      "#task-list",
      "#toast",
    ]);
  });

  test("does not leave two lists on the page", async () => {
    const page = await app.request("/tasks", {
      headers: { Cookie: session.cookie },
    });
    const before = await page.text();

    const res = await requestAs(session, "/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ title: "Write it down" }).toString(),
    });

    // The target is read off the page rather than written down here. A test
    // that names its own target models an interaction the page may not
    // perform — and that is how the duplicate survived, because the response
    // on its own was impeccable.
    const { target, style } = await resolveSwap(before, "POST", "/tasks");
    expect(target).toBe("#task-form");

    const { html: after, violations } = await swapAndCheck({
      page: before,
      response: await res.text(),
      headers: res.headers,
      status: res.status,
      target,
      swap: style,
    });

    expect(violations).toEqual([]);
    // The document, not the response: the duplicate ids only exist after the
    // swap, which is the whole reason the contract is checked here.
    expect(await checkDocument(after)).toEqual([]);
    expect(occurrences(after, 'id="task-list"')).toBe(1);
    expect(after).toContain("Write it down");
  });

  test("an empty title comes back 422 with the message, not a blank form", async () => {
    const res = await requestAs(session, "/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ title: "   " }).toString(),
    });

    expect(res.status).toBe(422);
    expect(await res.text()).toContain("A task needs a title");
  });
});

describe("toggling", () => {
  test("returns the row and the counter, and nothing else", async () => {
    const task = await createTask(userId, "Toggle me");

    const res = await requestAs(session, `/tasks/${task.id}/toggle`, {
      method: "POST",
    });
    const body = await res.text();

    expect(body).toContain(`id="task-${task.id}"`);
    expect(body).toContain('id="pending-count"');

    const after = await listTasks(userId, taskQuerySchema.parse({}));
    expect(after.items[0]?.isDone).toBe(true);
  });
});

describe("deleting", () => {
  /**
   * The failure this prevents: returning only the row leaves a table header
   * standing over an empty body when it was the last one. So the assertion is
   * about the page *after* the swap, not about the response body.
   */
  test("removing the last task shows the empty state", async () => {
    const task = await createTask(userId, "The only one");

    const page = await app.request("/tasks", {
      headers: { Cookie: session.cookie },
    });
    const before = await page.text();

    const res = await requestAs(session, `/tasks/${task.id}`, {
      method: "DELETE",
    });

    const { html: after, violations } = await swapAndCheck({
      page: before,
      response: await res.text(),
      headers: res.headers,
      status: res.status,
      target: "#task-list",
      swap: "outerHTML",
    });

    expect(violations).toEqual([]);
    expect(after).toContain("Nothing here yet.");
    expect(after).not.toContain("The only one");
  });
});

describe("other people's tasks", () => {
  test("are a 404, not a 403", async () => {
    const otherId = await createUser("other@example.com");
    const theirs = await createTask(otherId, "Not yours");

    const res = await requestAs(session, `/tasks/${theirs.id}/toggle`, {
      method: "POST",
    });

    // "You may not" and "it does not exist" have to be the same answer, or the
    // difference between them is a way of counting other people's rows.
    expect(res.status).toBe(404);
  });
});
