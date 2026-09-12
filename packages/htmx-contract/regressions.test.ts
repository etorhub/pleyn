/**
 * Every rule, against the bug it exists for.
 *
 * These are the tests that matter. If one of them stops failing on the pre-fix
 * markup, the rule has quietly become decoration and the next instance of that
 * bug will ship exactly like the first one did.
 *
 * No database: this whole directory must run with DATABASE_URL unset, or it
 * could never be published on its own.
 */

import { describe, expect, test } from "bun:test";

import {
  BOUNDED_POLL,
  DELETE_ROW_ONLY,
  DELETE_WHOLE_LIST,
  LIST_WITH_ONE_ROW,
  PAGE,
  TABLE_WITH_HX_INCLUDE,
  TABLE_WRAPPED_IN_FORM,
  TOAST_ONLY_422,
  TOAST_ONLY_422_FIXED_HEADERS,
  UNBOUNDED_POLL,
} from "./fixtures.ts";
import { checkDocument, checkResponse, swapAndCheck, type RuleName } from "./index.ts";

function rules(violations: { rule: RuleName }[]): RuleName[] {
  return violations.map((v) => v.rule);
}

describe("a toast-only error response", () => {
  test("the response that shipped is caught", async () => {
    const found = await checkResponse({
      page: PAGE,
      response: TOAST_ONLY_422,
      status: 422,
      target: "#row-1",
      swap: "outerHTML",
    });
    expect(rules(found)).toContain("empty-after-oob");
  });

  test("and the swap really does delete the row", async () => {
    const { html, swapped } = await swapAndCheck({
      page: PAGE,
      response: TOAST_ONLY_422,
      status: 422,
      target: "#row-1",
      swap: "outerHTML",
    });
    expect(swapped).toBe(true);
    expect(html).not.toContain('id="row-1"');
    // The row it did not touch is still there, so this is the bug and not a
    // simulator that deletes everything.
    expect(html).toContain('id="row-2"');
  });

  test("HX-Reswap: none clears it, and the row survives", async () => {
    const { html, violations, swapped } = await swapAndCheck({
      page: PAGE,
      response: TOAST_ONLY_422,
      status: 422,
      target: "#row-1",
      swap: "outerHTML",
      headers: TOAST_ONLY_422_FIXED_HEADERS,
    });
    expect(rules(violations)).not.toContain("empty-after-oob");
    expect(swapped).toBe(false);
    expect(html).toContain('id="row-1"');
  });

  test("the toast still arrives, which was the point of the response", async () => {
    const { html } = await swapAndCheck({
      page: PAGE,
      response: TOAST_ONLY_422,
      status: 422,
      target: "#row-1",
      swap: "outerHTML",
      headers: TOAST_ONLY_422_FIXED_HEADERS,
    });
    expect(html).toContain("That item no longer exists");
    // Swapped as innerHTML, so the live region itself is untouched.
    expect(html).toContain('id="toast" aria-live="polite"');
  });
});

describe("row controls inside an enclosing form", () => {
  test("the enclosing form is caught", async () => {
    const found = await checkDocument(TABLE_WRAPPED_IN_FORM, { fragment: true });
    expect(rules(found)).toContain("duplicate-field-in-form");
  });

  test("so are the duplicated ids that came with it", async () => {
    const found = await checkDocument(TABLE_WRAPPED_IN_FORM, { fragment: true });
    expect(rules(found)).toContain("duplicate-id");
  });

  test("the hx-include shape is clean", async () => {
    const found = await checkDocument(TABLE_WITH_HX_INCLUDE, { fragment: true });
    expect(rules(found)).not.toContain("duplicate-field-in-form");
    expect(rules(found)).not.toContain("duplicate-id");
  });

  test("two fields sharing a name outside any form do not collide", async () => {
    // Each row sends only its own value, which is exactly the fix.
    const found = await checkDocument(
      `<select name="status"></select><select name="status"></select>`,
      { fragment: true },
    );
    expect(rules(found)).not.toContain("duplicate-field-in-form");
  });

  test("checkboxes sharing a name are a multi-value filter, not a collision", async () => {
    // The application's type filter is five checkboxes named `tipus` inside the
    // filter form. That is how HTML spells "several values for one field", and
    // this rule flagged every one of them until it learned the difference.
    const checkboxes = ["ingres", "despesa", "transferencia", "targeta", "altres"]
      .map((v) => `<input type="checkbox" name="tipus" value="${v}">`)
      .join("");
    const found = await checkDocument(`<form>${checkboxes}</form>`, { fragment: true });
    expect(rules(found)).not.toContain("duplicate-field-in-form");
  });

  test("radios sharing a name are how you pick one of several", async () => {
    const found = await checkDocument(
      `<form><input type="radio" name="mode" value="a"><input type="radio" name="mode" value="b"></form>`,
      { fragment: true },
    );
    expect(rules(found)).not.toContain("duplicate-field-in-form");
  });

  test("but a checkbox and a select sharing a name still collide", async () => {
    const found = await checkDocument(
      `<form><input type="checkbox" name="q" value="1"><select name="q"></select><select name="q"></select></form>`,
      { fragment: true },
    );
    expect(rules(found)).toContain("duplicate-field-in-form");
  });
});

describe("a delete that returns only the row", () => {
  test("returning only the row loses the container's identity", async () => {
    const found = await checkResponse({
      page: LIST_WITH_ONE_ROW,
      response: DELETE_ROW_ONLY,
      target: "#item-list",
      swap: "outerHTML",
    });
    expect(rules(found)).toContain("target-identity-lost");
  });

  test("and the resulting page has no empty state", async () => {
    const { html } = await swapAndCheck({
      page: LIST_WITH_ONE_ROW,
      response: DELETE_ROW_ONLY,
      target: "#item-list",
      swap: "outerHTML",
    });
    expect(html).not.toContain("buit");
    // Worse than cosmetic: the list is no longer addressable at all.
    expect(html).not.toContain('id="item-list"');
  });

  test("returning the whole list keeps it addressable and says it is empty", async () => {
    const { html, violations } = await swapAndCheck({
      page: LIST_WITH_ONE_ROW,
      response: DELETE_WHOLE_LIST,
      target: "#item-list",
      swap: "outerHTML",
    });
    expect(rules(violations)).not.toContain("target-identity-lost");
    expect(html).toContain('id="item-list"');
    expect(html).toContain("Nothing here yet.");
    expect(html).not.toContain('id="item-1"');
  });
});

describe("a poll with no declared bound", () => {
  test("a poll with no declared bound is caught", async () => {
    const found = await checkDocument(UNBOUNDED_POLL, { fragment: true });
    expect(rules(found)).toContain("unbounded-poll");
  });

  test("a bounded one is not", async () => {
    const found = await checkDocument(BOUNDED_POLL, { fragment: true });
    expect(rules(found)).not.toContain("unbounded-poll");
  });

  test("the bound is read regardless of the interval's units", async () => {
    for (const trigger of ["every 500ms", "every 2s", "every 1m"]) {
      const found = await checkDocument(`<div hx-get="/x" hx-trigger="${trigger}"></div>`, {
        fragment: true,
      });
      expect(rules(found)).toContain("unbounded-poll");
    }
  });

  test("a non-polling trigger is left alone", async () => {
    const found = await checkDocument(`<div hx-get="/x" hx-trigger="click"></div>`, {
      fragment: true,
    });
    expect(rules(found)).not.toContain("unbounded-poll");
  });
});
