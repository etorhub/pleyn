/**
 * Markup checks that need no database.
 *
 * These run in `bun run test:unit`, in under a second, and in CI as a job with
 * no database service at all. That is what keeps the separation honest: if one
 * of these ever reaches for a query, it fails here rather than quietly joining
 * the slow tier.
 *
 * They look at **the markup**, not the route, because the failures they prevent
 * only exist in a browser.
 */

import { describe, expect, test } from "bun:test";
import { checkDocument, inspect } from "htmx-contract";
import { attributeOf } from "htmx-contract/inspect";

import { Layout, PendingCount } from "../../src/components/layout.ts";
import type { User } from "../../src/db/schema/index.ts";
import {
  TaskForm,
  TaskList,
  TaskRow,
} from "../../src/routes/tasks/tasks.fragment.ts";
import { taskQuerySchema } from "../../src/routes/tasks/tasks.schema.ts";

const FILTERS = taskQuerySchema.parse({});

function text(node: unknown): string {
  return String(node);
}

const task = (id: number, title: string, isDone = false) => ({
  id,
  userId: 1,
  title,
  isDone,
  createdAt: new Date(),
});

describe("the task list", () => {
  test("with no rows it draws the empty state, not a bare header", async () => {
    const html = text(
      TaskList({ tasks: [], filters: FILTERS, total: 0, pages: 1 }),
    );

    expect(html).toContain("Nothing here yet.");
    expect(html).not.toContain("<tbody>");
  });

  test("with rows it draws the table and not the notice", async () => {
    const html = text(
      TaskList({
        tasks: [task(1, "One")],
        filters: FILTERS,
        total: 1,
        pages: 1,
      }),
    );

    expect(html).toContain("One");
    expect(html).not.toContain("Nothing here yet.");
  });

  test("the delete button targets the whole list, never just the row", () => {
    const html = text(TaskRow(task(1, "One")));

    // Targeting the row would work until it was the last one, and then leave a
    // header standing over nothing.
    expect(html).toContain('hx-target="#task-list"');
  });

  test("no id appears twice", async () => {
    const html = text(
      TaskList({
        tasks: [task(1, "One"), task(2, "Two")],
        filters: FILTERS,
        total: 2,
        pages: 1,
      }),
    );
    const snapshot = await inspect(html);

    // `ids` maps each id to how many times it occurs. Anything above one is
    // invalid HTML, and htmx would swap into whichever came first.
    const repeated = [...snapshot.ids].filter(([, count]) => count > 1);
    expect(repeated).toEqual([]);
  });

  test("the list is self-consistent by the contract's own rules", async () => {
    const html = text(
      TaskList({
        tasks: [task(1, "One")],
        filters: FILTERS,
        total: 1,
        pages: 1,
      }),
    );

    expect(await checkDocument(html)).toEqual([]);
  });
});

describe("the add form", () => {
  test("is its own form, so it sends only its own field", async () => {
    const html = text(TaskForm());
    const snapshot = await inspect(html);

    expect(snapshot.fields.filter((f) => f.name === "title")).toHaveLength(1);
  });

  test("an error is announced and tied to the field", () => {
    const html = text(TaskForm("A task needs a title"));

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="title-error"');
  });
});

describe("the pending counter", () => {
  test("is an out-of-band target only when asked", () => {
    expect(text(PendingCount(3))).not.toContain("hx-swap-oob");
    expect(text(PendingCount(3, true))).toContain('hx-swap-oob="true"');
  });

  test("keeps its id either way, because that is how it is found", () => {
    expect(text(PendingCount(0))).toContain('id="pending-count"');
    expect(text(PendingCount(0, true))).toContain('id="pending-count"');
  });
});

describe("the CSRF token in the layout", () => {
  /**
   * The value is JSON, so the attribute must be single-quoted. A formatter run
   * over the template will normalise those quotes and terminate the attribute
   * on the JSON's first key, which publishes no token and makes every mutation
   * a 403 — with nothing in the markup looking wrong.
   *
   * This is asserted on the parsed attribute rather than on the source, so it
   * fails whatever caused the quoting to change.
   */
  test("survives being parsed back out of the attribute", async () => {
    const token = "a-token-with-no-quotes-in-it";
    const page = text(
      Layout({
        title: "Anything",
        user: { id: 1, fullName: "Test" } as User,
        csrfToken: token,
        path: "/tasks",
        pending: 0,
        children: "",
      }),
    );

    const published = await attributeOf(page, "body", "hx-headers");
    expect(published).not.toBeNull();
    expect(JSON.parse(published ?? "{}")).toEqual({ "X-CSRF-Token": token });
  });
});
