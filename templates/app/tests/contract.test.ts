/**
 * The htmx contract, checked on every page.
 *
 * `htmx-contract` knows how to find the problems; this brings them to it. The
 * difference matters: a tool you have to remember to call is a tool somebody
 * will not call, and the failures it catches are exactly the ones that survive
 * a type checker, a linter and a passing route test.
 *
 * Two things happen here:
 *
 *   1. Every page the app serves goes through `checkDocument()`.
 *   2. **The `PAGES` table below must cover all of `src/routes/`**, and a test
 *      at the bottom enforces that. Adding a resource without an entry fails
 *      CI — which is the only mechanism that survives somebody who has not
 *      read AGENTS.md.
 *
 * Needs a database: the pages are really requested.
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { checkDocument, formatViolations } from "htmx-contract";

import { app } from "../src/server.ts";
import {
  createUser,
  resetDatabase,
  signInAs,
  type TestSession,
} from "./helpers.ts";
import { createTask } from "../src/services/tasks.ts";

let session: TestSession;

/** Pages, and which resource each belongs to. */
const PAGES: { resource: string; url: string; what: string }[] = [
  { resource: "tasks", url: "/tasks", what: "the task list" },
  { resource: "tasks", url: "/tasks?show=open", what: "the list, filtered" },
];

/**
 * Resources with no page of their own, and why.
 *
 * If a third ever appears, better that this test forces somebody to write the
 * reason here than that it slips past in silence.
 */
const WITHOUT_PAGE: Record<string, string> = {
  home: "redirects; it renders nothing of its own",
  auth: "renders its own document outside the shell, and has no session to test with",
};

beforeAll(async () => {
  await resetDatabase();
  const userId = await createUser("contract@example.com");

  // Real content: rows, a filter, pagination. An empty page checks very little.
  for (const title of ["First", "Second", "Third"])
    await createTask(userId, title);

  session = await signInAs("contract@example.com");
});

describe("every page meets the contract", () => {
  for (const { url, what } of PAGES) {
    test(`${what} (${url})`, async () => {
      const res = await app.request(url, {
        headers: { Cookie: session.cookie },
      });
      expect(res.status).toBe(200);

      const violations = await checkDocument(await res.text());

      // The whole message: a list of rule names without what they say sends
      // the reader to the source to find out.
      expect(violations, `${url}\n${formatViolations(violations)}`).toEqual([]);
    });
  }
});

describe("the sign-in page, which has no session", () => {
  test("meets the contract too", async () => {
    const res = await app.request("/signin");
    expect(res.status).toBe(200);

    const violations = await checkDocument(await res.text());
    expect(violations, `/signin\n${formatViolations(violations)}`).toEqual([]);
  });
});

describe("the table's coverage", () => {
  test("every resource has a page here, or a stated reason not to", async () => {
    const entries = await readdir(
      join(import.meta.dir, "..", "src", "routes"),
      {
        withFileTypes: true,
      },
    );
    const resources = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .toSorted();

    const covered = new Set(PAGES.map((p) => p.resource));
    const forgotten = resources.filter(
      (r) => !covered.has(r) && !(r in WITHOUT_PAGE),
    );

    expect(
      forgotten,
      `These resources are in neither PAGES nor WITHOUT_PAGE: ${forgotten.join(", ")}.\n` +
        "Add their page, or say why they have none.",
    ).toEqual([]);
  });

  test("and names no resource that no longer exists", async () => {
    const entries = await readdir(
      join(import.meta.dir, "..", "src", "routes"),
      {
        withFileTypes: true,
      },
    );
    const resources = new Set(
      entries.filter((e) => e.isDirectory()).map((e) => e.name),
    );

    const ghosts = [
      ...new Set(PAGES.map((p) => p.resource)),
      ...Object.keys(WITHOUT_PAGE),
    ]
      .filter((r) => !resources.has(r))
      .toSorted();

    expect(ghosts, `These resources are gone: ${ghosts.join(", ")}`).toEqual(
      [],
    );
  });
});
