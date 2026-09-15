/**
 * The command table.
 *
 * The invariant worth pinning is the lazy `load`: `scripts/agents-md.ts`
 * imports this module to generate the table in `docs/reference.md`, and
 * `bun run check` — which runs `docs:check` — runs in CI with no database
 * service. The day a command is imported eagerly here, documentation
 * generation starts constructing a database pool, and the failure arrives
 * somewhere that looks unrelated.
 */

import { describe, expect, test } from "bun:test";

import { COMMANDS, findCommand } from "../../src/cli/commands.ts";

describe("COMMANDS", () => {
  test("every command says what it is and how to call it", () => {
    for (const command of COMMANDS) {
      expect(command.summary.length).toBeGreaterThan(0);
      expect(command.usage).toStartWith(`bun run cli ${command.name}`);
    }
  });

  test("names are unique, because dispatch is by name", () => {
    const names = COMMANDS.map((command) => command.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test("the commands that were always here are still here", () => {
    expect(findCommand("seed")).toBeDefined();
    expect(findCommand("user")).toBeDefined();
    expect(findCommand("nonsense")).toBeUndefined();
  });

  test("loading is lazy, so the generator does not start the application", () => {
    for (const command of COMMANDS) {
      expect(typeof command.load).toBe("function");
    }
  });
});
