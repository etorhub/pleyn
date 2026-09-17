/**
 * The commands that need a database.
 *
 * These call the commands' own functions rather than spawning `bun run cli`:
 * the record is the contract, and asserting on it directly is both faster and
 * more honest than parsing what the shell printed.
 *
 * What is being pinned is the part an agent depends on — that a minted session
 * is a session the application really accepts, that CSRF is carried rather
 * than bypassed, and that `--swap` reports the document the interaction
 * actually leaves behind.
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

import { diagnose } from "../src/cli/doctor.ts";
import { sendRequest, violationsCreatedBy } from "../src/cli/request.ts";
import { actAs, anonymous, release } from "../src/cli/session.ts";
import { db } from "../src/db/client.ts";
import { sessions } from "../src/db/schema/index.ts";
import { createTask } from "../src/services/tasks.ts";
import { createUser, resetDatabase } from "./helpers.ts";

const EMAIL = "cli@example.com";

const options = {
  hx: false,
  form: {},
  headers: {},
  swap: false,
  full: false,
  keepSession: false,
};

let userId: number;

beforeAll(async () => {
  await resetDatabase();
  userId = await createUser(EMAIL);
  await createTask(userId, "Already here");
});

describe("actAs", () => {
  test("mints a session the application accepts", async () => {
    const actor = await actAs(EMAIL);
    try {
      const response = await (
        await import("../src/server.ts")
      ).app.request("/tasks", { headers: { Cookie: actor.cookie } });
      expect(response.status).toBe(200);
      expect(actor.email).toBe(EMAIL);
      expect(actor.csrf.length).toBeGreaterThan(0);
    } finally {
      await release(actor);
    }
  });

  test("says how to create a user it cannot find", async () => {
    expect(actAs("nobody@example.com")).rejects.toThrow(
      /no user with email nobody@example\.com/,
    );
  });

  test("anonymous carries the pre-session CSRF seed, not a session", async () => {
    const actor = await anonymous();
    expect(actor.token).toBeNull();
    expect(actor.cookie).toStartWith("pleyn_csrf=");
  });
});

describe("request", () => {
  test("as somebody, reaches a guarded page", async () => {
    const report = await sendRequest({
      ...options,
      method: "GET",
      path: "/tasks",
      as: EMAIL,
    });
    expect(report.response.status).toBe(200);
    expect(report.request.as).toBe(EMAIL);
    expect(report.response.body).toContain("Already here");
  });

  test("as nobody, is sent to sign in", async () => {
    const report = await sendRequest({
      ...options,
      method: "GET",
      path: "/tasks",
    });
    expect(report.response.status).toBe(302);
    expect(report.response.headers.location).toStartWith("/signin");
  });

  test("a mutation carries CSRF, and creates the row", async () => {
    const report = await sendRequest({
      ...options,
      method: "POST",
      path: "/tasks",
      as: EMAIL,
      form: { title: "Written by the CLI" },
    });

    expect(report.response.status).toBe(200);
    expect(report.response.body).toContain("Written by the CLI");
  });

  test("a wrong CSRF token is refused — the header is what gets it through", async () => {
    const report = await sendRequest({
      ...options,
      method: "POST",
      path: "/tasks",
      as: EMAIL,
      form: { title: "Should not exist" },
      headers: { "X-CSRF-Token": "nonsense" },
    });

    expect(report.response.status).toBe(403);
  });

  test("the minted session does not outlive the command", async () => {
    await sendRequest({ ...options, method: "GET", path: "/tasks", as: EMAIL });
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId));
    expect(rows).toHaveLength(0);
  });

  test("the session cookie is not printed unless it was asked for", async () => {
    const report = await sendRequest({
      ...options,
      method: "GET",
      path: "/tasks",
      as: EMAIL,
    });
    expect(report.request.headers.Cookie).toBe("session=…");
  });
});

describe("request --swap", () => {
  test("finds the target on the page and models the swap", async () => {
    const report = await sendRequest({
      ...options,
      method: "GET",
      path: "/tasks/fragment/list",
      as: EMAIL,
      swap: true,
    });

    expect(report.swap).toBeDefined();
    expect(report.swap).toMatchObject({
      page: "/tasks",
      target: "#task-list",
      targetSource: "page",
      style: "outerHTML",
      styleSource: "page",
      swapped: true,
    });
    expect(report.swap?.targetHtml).toContain("Already here");
  });

  test("an explicit target wins, and --full carries the whole document", async () => {
    const report = await sendRequest({
      ...options,
      method: "GET",
      path: "/tasks/fragment/list",
      as: EMAIL,
      swap: true,
      target: "#task-list",
      full: true,
    });

    expect(report.swap?.targetSource).toBe("flag");
    expect(report.swap?.html).toContain("<!doctype html>");
  });

  test("refuses to guess when nothing on the page sends the request", async () => {
    expect(
      sendRequest({
        ...options,
        method: "GET",
        path: "/health",
        as: EMAIL,
        swap: true,
        page: "/tasks",
      }),
    ).rejects.toThrow(/could not work out what GET \/health targets/);
  });
});

describe("violationsCreatedBy", () => {
  test("blames the swap for what the swap created, and nothing else", async () => {
    const page = `<!doctype html><html><body><div id="list">one</div></body></html>`;
    const after = `<!doctype html><html><body><div id="list">one</div><div id="list">two</div></body></html>`;

    const created = await violationsCreatedBy(page, after);
    expect(created.map((violation) => violation.rule)).toEqual([
      "duplicate-id",
    ]);
  });

  test("says nothing about what was already wrong", async () => {
    const broken = `<!doctype html><html><body><p id="x"></p><p id="x"></p></body></html>`;
    expect(await violationsCreatedBy(broken, broken)).toEqual([]);
  });
});

describe("doctor", () => {
  test("is green against the database the suite is using", async () => {
    const report = await diagnose();
    const byName = Object.fromEntries(
      report.checks.map((check) => [check.name, check]),
    );

    expect(byName.database?.status).toBe("ok");
    expect(byName.migrations?.status).toBe("ok");
  });

  test("an unreachable database is the environment's problem, not the project's", async () => {
    const report = await diagnose("postgresql://pleyn:pleyn@127.0.0.1:1/pleyn");
    expect(report.exit).toBe(2);
    expect(
      report.checks.find((check) => check.name === "migrations")?.status,
    ).toBe("skipped");
  });
});
