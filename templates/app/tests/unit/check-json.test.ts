/**
 * The record `bun run check --json` prints.
 *
 * It does not run the chain. Four real tools inside the tier whose premise is
 * "under a second" would end that premise, and `bun run check` runs them for
 * real on every commit anyway. What is worth pinning here is the shape an
 * agent parses, and that every step carries the fix it would be told.
 */

import { describe, expect, test } from "bun:test";

import { STEPS, summarize, type StepResult } from "../../scripts/check.ts";

const result = (step: string, ok: boolean): StepResult => ({
  step,
  ok,
  fix: `fix ${step}`,
  output: ok ? "" : "boom",
  durationMs: 1,
});

describe("summarize", () => {
  test("all green is ok, with nothing named as failed", () => {
    const report = summarize([result("types", true)], 5);
    expect(report).toMatchObject({ ok: true, failed: [], durationMs: 5 });
  });

  test("names every failure, in order", () => {
    const report = summarize(
      [result("types", false), result("lint", true), result("docs", false)],
      9,
    );
    expect(report.ok).toBe(false);
    expect(report.failed).toEqual(["types", "docs"]);
    expect(report.steps).toHaveLength(3);
  });
});

describe("STEPS", () => {
  test("every step carries a fix, and the names are unique", () => {
    for (const step of STEPS) {
      expect(step.fix.length).toBeGreaterThan(0);
      expect(step.command.length).toBeGreaterThan(0);
    }
    const names = STEPS.map((step) => step.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
