/**
 * The demo user and some rows.
 *
 * `create-pleyn` calls this after migrating, so a fresh project has something
 * to sign in with rather than an empty login form and no way past it.
 */

import { seedDemoUser } from "../services/seed.ts";
import { parseArgs } from "./args.ts";
import { emit, type Outcome } from "./output.ts";

export interface SeedResult {
  created: boolean;
  email: string;
}

export async function seed(options: {
  email?: string | undefined;
  password?: string | undefined;
}): Promise<SeedResult> {
  const { created, email } = await seedDemoUser(options);
  return { created, email };
}

export function format(result: SeedResult): string {
  return result.created
    ? `Created ${result.email}`
    : `${result.email} already exists`;
}

export async function run(argv: readonly string[]): Promise<Outcome> {
  const args = parseArgs(argv, {
    booleans: ["json"],
    values: ["email", "password"],
  });

  const result = await seed({
    email: args.flag("email"),
    password: args.flag("password"),
  });

  return emit(args.bool("json"), result, () => format(result));
}
