/**
 * The application's operational commands.
 *
 *   bun run cli                      what there is to ask
 *   bun run cli <command> --help     how to ask it
 *
 * This file is dispatch and nothing else: each command lives in `src/cli/` and
 * is loaded only when it is called, so asking for the route map does not open a
 * database pool and generating the documentation does not start Hono.
 *
 * Most commands take `--json`. That is not decoration either — these commands
 * are read by agents at least as often as by people, and a shape you can parse
 * beats a paragraph you have to guess at.
 */

import { COMMANDS, findCommand } from "./cli/commands.ts";
import { CliError } from "./cli/error.ts";
import { closeDb } from "./db/client.ts";
import { columns, note } from "./cli/output.ts";

function listing(): string {
  const rows = COMMANDS.map((command) => [
    `  ${command.name}`,
    command.summary,
    command.needsDb ? "(needs Postgres)" : "",
  ]);
  return `Commands:\n${columns(rows)}\n\n  bun run cli <command> --help`;
}

async function main(): Promise<number> {
  const [name, ...rest] = process.argv.slice(2);

  if (name === undefined || name === "--help" || name === "-h") {
    note(listing());
    return name === undefined ? 1 : 0;
  }

  const command = findCommand(name);
  if (!command) {
    note(`[cli] no command called "${name}".\n\n${listing()}`);
    return 1;
  }

  if (rest.includes("--help") || rest.includes("-h")) {
    note(`${command.summary}.\n\n  ${command.usage}`);
    return 0;
  }

  const outcome = await (await command.load()).run(rest);
  if (outcome.text !== "") console.log(outcome.text);
  return outcome.exit;
}

try {
  process.exitCode = await main();
} catch (error) {
  if (error instanceof CliError) {
    note(`[cli] ${error.message}`);
    if (error.usage) note(`\n  ${error.usage}`);
  } else {
    note(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
} finally {
  await closeDb();
}
