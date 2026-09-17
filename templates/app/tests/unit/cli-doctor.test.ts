/**
 * Doctor's judgements, without a database to judge.
 *
 * The database-down case is the one doctor exists for, and it is tested
 * against a port nothing listens on: a refused connection is immediate and
 * deterministic, where a timeout is neither. The three-second bound is
 * deliberately *not* exercised here — a test that waits three seconds to prove
 * that it waits three seconds belongs in nobody's fast tier.
 */

import { describe, expect, test } from "bun:test";

import {
  inspectDatabase,
  pendingMigrations,
  stylesheetStatus,
} from "../../src/cli/doctor.ts";

const FILES = [
  { folderMillis: 1_000, hash: "a" },
  { folderMillis: 2_000, hash: "b" },
];

describe("pendingMigrations", () => {
  test("nothing applied means everything is pending", () => {
    expect(pendingMigrations(FILES, null)).toHaveLength(2);
  });

  test("drizzle's rule: applied when the record is not older than the folder", () => {
    expect(pendingMigrations(FILES, 2_000)).toHaveLength(0);
    expect(pendingMigrations(FILES, 1_000)).toEqual([
      { folderMillis: 2_000, hash: "b" },
    ]);
  });
});

describe("stylesheetStatus", () => {
  test("missing is a failure", () => {
    expect(stylesheetStatus(10, null)).toBe("fail");
  });

  test("older than its source is a failure", () => {
    expect(stylesheetStatus(20, 10)).toBe("fail");
  });

  test("built after its source is fine", () => {
    expect(stylesheetStatus(10, 20)).toBe("ok");
    expect(stylesheetStatus(10, 10)).toBe("ok");
  });
});

describe("inspectDatabase", () => {
  test("reports the refusal instead of raising it", async () => {
    const state = await inspectDatabase(
      "postgresql://pleyn:pleyn@127.0.0.1:1/pleyn",
    );
    expect(state.reachable).toBe(false);
    expect(state.error).toBeString();
    expect(state.appliedAt).toBeNull();
  });
});
