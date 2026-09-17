/**
 * Every command, with what it is for.
 *
 * **Nothing here imports the application.** `load` is a dynamic import on
 * purpose: `scripts/agents-md.ts` reads this table to generate the command list
 * in `docs/reference.md`, and a documentation generator that has to start Hono,
 * read the environment and construct a database pool in order to print three
 * columns is a generator that will be quietly dropped from `bun run check` the
 * first time it breaks.
 *
 * The table is also what `bun run cli` prints when it is called with nothing,
 * which is how anybody — in particular an agent that has just arrived in a
 * repository it has never seen — finds out what this application can be asked.
 */

import type { Outcome } from "./output.ts";

export interface CommandModule {
  run(argv: readonly string[]): Promise<Outcome>;
}

export interface Command {
  name: string;
  /** One line. It appears in `bun run cli` and in the generated table. */
  summary: string;
  usage: string;
  /** Whether Postgres has to be up. The question every fresh clone asks. */
  needsDb: boolean;
  load: () => Promise<CommandModule>;
}

export const COMMANDS: readonly Command[] = [
  {
    name: "doctor",
    summary: "Check the environment and say what to run to fix it",
    usage: "bun run cli doctor [--json]",
    needsDb: false,
    load: () => import("./doctor.ts"),
  },
  {
    name: "request",
    summary: "Perform a request against the application, in process",
    usage:
      "bun run cli request [METHOD] <path> [--as <email>] [--form k=v] [--hx] [--swap] [--json]",
    needsDb: true,
    load: () => import("./request.ts"),
  },
  {
    name: "routes",
    summary: "Every route: page or fragment, open or behind the session guard",
    usage: "bun run cli routes [--json]",
    needsDb: false,
    load: () => import("./routes.ts"),
  },
  {
    name: "seed",
    summary: "Create the demo user and some rows. Idempotent on the email",
    usage:
      "bun run cli seed [--email <email>] [--password <password>] [--json]",
    needsDb: true,
    load: () => import("./seed.ts"),
  },
  {
    name: "user",
    summary: "Create an empty account",
    usage:
      "bun run cli user --email <email> --password <password> [--name <name>] [--json]",
    needsDb: true,
    load: () => import("./user.ts"),
  },
];

export function findCommand(name: string): Command | undefined {
  return COMMANDS.find((command) => command.name === name);
}
