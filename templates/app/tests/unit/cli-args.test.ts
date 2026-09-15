/**
 * The argument parser, which every command depends on being boring.
 *
 * The case worth naming is the last one: the scanner this replaced accepted a
 * misspelled flag in silence and ran with the default, and a command that does
 * something slightly different from what was asked, without complaint, costs
 * far more than one that refuses.
 */

import { describe, expect, test } from "bun:test";

import { parseArgs } from "../../src/cli/args.ts";
import { CliError } from "../../src/cli/error.ts";

const SPEC = { booleans: ["json", "swap"], values: ["as", "form", "target"] };

describe("parseArgs", () => {
  test("reads --name value and --name=value alike", () => {
    const a = parseArgs(["--as", "x@example.com"], SPEC);
    const b = parseArgs(["--as=x@example.com"], SPEC);
    expect(a.flag("as")).toBe("x@example.com");
    expect(b.flag("as")).toBe("x@example.com");
  });

  test("a boolean flag never swallows what follows it", () => {
    const args = parseArgs(["--json", "/tasks"], SPEC);
    expect(args.bool("json")).toBe(true);
    expect(args.positional).toEqual(["/tasks"]);
  });

  test("keeps every value of a repeated flag", () => {
    const args = parseArgs(["--form", "title=Write", "--form", "done=1"], SPEC);
    expect(args.all("form")).toEqual(["title=Write", "done=1"]);
    expect(args.pairs("form")).toEqual({ title: "Write", done: "1" });
  });

  test("splits a pair on the first = only", () => {
    const args = parseArgs(["--form", "title=a=b"], SPEC);
    expect(args.pairs("form")).toEqual({ title: "a=b" });
  });

  test("positionals keep their order, flags or not", () => {
    const args = parseArgs(["POST", "/tasks", "--json"], SPEC);
    expect(args.positional).toEqual(["POST", "/tasks"]);
  });

  test("-- stops the flag reading, so a value may start with a dash", () => {
    const args = parseArgs(
      ["--as", "x@example.com", "--", "--not-a-flag"],
      SPEC,
    );
    expect(args.positional).toEqual(["--not-a-flag"]);
  });

  test("require() names the flag it wanted", () => {
    expect(() => parseArgs([], SPEC).require("as")).toThrow(
      new CliError("--as is required."),
    );
  });

  test("refuses a flag nobody declared, rather than ignoring it", () => {
    expect(() => parseArgs(["--emial", "x@example.com"], SPEC)).toThrow(
      /unknown flag --emial/,
    );
  });

  test("refuses a value for a flag that takes none", () => {
    expect(() => parseArgs(["--json=yes"], SPEC)).toThrow(/takes no value/);
  });

  test("refuses a flag left without its value", () => {
    expect(() => parseArgs(["--as"], SPEC)).toThrow(/--as needs a value/);
  });
});
