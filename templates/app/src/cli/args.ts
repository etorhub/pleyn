/**
 * The argument parser the subcommands share.
 *
 * The scanner this replaces looked for `--name` and took whatever followed.
 * That is enough for `--email x`, and not enough for anything else: it cannot
 * express a flag given twice (`--form title=x --form done=1`), a flag with no
 * value, or a positional argument — and it accepts `--emial x` in silence,
 * which is the failure that costs the most time, because nothing appears to be
 * wrong.
 *
 * So each command **declares its flags**, and anything undeclared is refused by
 * name with the list of what was expected. Declaring them is also what makes
 * `--json` unambiguous: a boolean flag never swallows the argument after it, so
 * `cli request --json /tasks` and `cli request /tasks --json` mean the same
 * thing.
 */

import { CliError } from "./error.ts";

export interface ArgSpec {
  /** Flags that carry no value: `--json`, `--hx`. */
  booleans?: readonly string[];
  /** Flags that carry one, and may be repeated: `--form k=v`. */
  values?: readonly string[];
}

export interface Args {
  /** Everything that was not a flag, in order. */
  readonly positional: readonly string[];
  bool(name: string): boolean;
  /** The last value given for a flag, or undefined. */
  flag(name: string): string | undefined;
  /** Every value given for a flag, in order. */
  all(name: string): readonly string[];
  /** Repeated `k=v` values as a record. Splits on the first `=` only. */
  pairs(name: string): Record<string, string>;
  /** The value, or a refusal naming the flag. */
  require(name: string): string;
}

function known(spec: ArgSpec): string[] {
  return [...(spec.booleans ?? []), ...(spec.values ?? [])].toSorted();
}

/**
 * `--name value`, `--name=value`, `--name`, and `--` to stop reading flags.
 *
 * `--` matters for the one case where a value looks like a flag: a title that
 * begins with a dash, say. Without it there is no way to write one.
 */
export function parseArgs(argv: readonly string[], spec: ArgSpec = {}): Args {
  const booleans = new Set(spec.booleans ?? []);
  const values = new Set(spec.values ?? []);

  const positional: string[] = [];
  const given = new Map<string, string[]>();
  const flags = new Set<string>();

  let onlyPositional = false;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? "";

    if (onlyPositional || !token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    if (token === "--") {
      onlyPositional = true;
      continue;
    }

    const equals = token.indexOf("=");
    const name = (equals === -1 ? token : token.slice(0, equals)).slice(2);
    const inline = equals === -1 ? undefined : token.slice(equals + 1);

    if (booleans.has(name)) {
      if (inline !== undefined) {
        throw new CliError(`--${name} takes no value.`);
      }
      flags.add(name);
      continue;
    }

    if (!values.has(name)) {
      throw new CliError(
        `unknown flag --${name}.\n  Known flags: ${known(spec)
          .map((f) => `--${f}`)
          .join(", ")}`,
      );
    }

    const value = inline ?? argv[++i];
    if (value === undefined) throw new CliError(`--${name} needs a value.`);

    given.set(name, [...(given.get(name) ?? []), value]);
  }

  return {
    positional,
    bool: (name) => flags.has(name),
    flag: (name) => given.get(name)?.at(-1),
    all: (name) => given.get(name) ?? [],
    pairs(name) {
      const out: Record<string, string> = {};
      for (const entry of given.get(name) ?? []) {
        const at = entry.indexOf("=");
        if (at === -1) {
          throw new CliError(`--${name} expects key=value, not "${entry}".`);
        }
        out[entry.slice(0, at)] = entry.slice(at + 1);
      }
      return out;
    },
    require(name) {
      const value = given.get(name)?.at(-1);
      if (value === undefined) throw new CliError(`--${name} is required.`);
      return value;
    },
  };
}
