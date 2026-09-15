/**
 * An empty account.
 *
 * Separate from `seed` because seeding is for a project that has just been
 * generated, and this is for the second person who needs to sign in.
 */

import { db } from "../db/client.ts";
import { users } from "../db/schema/index.ts";
import { hashPassword } from "../lib/auth.ts";
import { parseArgs } from "./args.ts";
import { CliError } from "./error.ts";
import { emit, type Outcome } from "./output.ts";

export interface UserResult {
  id: number;
  email: string;
}

export async function createUser(options: {
  email: string;
  password: string;
  name?: string | undefined;
}): Promise<UserResult> {
  const email = options.email.toLowerCase();

  const [user] = await db
    .insert(users)
    .values({
      email,
      fullName: options.name ?? "",
      passwordHash: await hashPassword(options.password),
    })
    .returning();

  if (!user) throw new CliError(`could not create ${email}.`);
  return { id: user.id, email: user.email };
}

export function format(result: UserResult): string {
  return `Created ${result.email}`;
}

export async function run(argv: readonly string[]): Promise<Outcome> {
  const args = parseArgs(argv, {
    booleans: ["json"],
    values: ["email", "password", "name"],
  });

  const result = await createUser({
    email: args.require("email"),
    password: args.require("password"),
    name: args.flag("name"),
  });

  return emit(args.bool("json"), result, () => format(result));
}
