/**
 * What a command hands back, and which stream it lands on.
 *
 * One rule, and it is load-bearing: **under `--json`, stdout carries the record
 * and nothing else.** Importing `src/server.ts` runs `validateConfig()`, which
 * warns about development defaults; every note a command wants to add is in the
 * same position. All of it goes to stderr, where a person still reads it and
 * `… | jq` never sees it.
 */

export interface Outcome {
  /** What goes to stdout. */
  text: string;
  /** 0 fine, 1 the project's problem, 2 the environment's. */
  exit: number;
}

/** A note for whoever is watching. Never stdout: see above. */
export function note(message: string): void {
  console.error(message);
}

/**
 * The record, or the prose.
 *
 * `human` is a function rather than a string so that formatting a large result
 * — a whole post-swap document — costs nothing when the caller asked for JSON.
 */
export function emit(
  json: boolean,
  data: unknown,
  human: () => string,
  exit = 0,
): Outcome {
  return { text: json ? JSON.stringify(data, null, 2) : human(), exit };
}

/** Left-aligned columns, for the tables the human forms print. */
export function columns(rows: readonly (readonly string[])[]): string {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i] ?? 0, cell.length);
    });
  }
  return rows
    .map((row) =>
      row
        .map((cell, i) =>
          i === row.length - 1 ? cell : cell.padEnd(widths[i] ?? 0),
        )
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}
