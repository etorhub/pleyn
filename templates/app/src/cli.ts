/**
 * Small operational commands.
 *
 *   bun run cli seed                            the demo user and some rows
 *   bun run cli seed --email … --password …     the same, with your own details
 *   bun run cli user --email … --password …     an empty account
 */

import { closeDb } from "./db/client.ts";
import { hashPassword } from "./lib/auth.ts";
import { db } from "./db/client.ts";
import { users } from "./db/schema/index.ts";
import { seedDemoUser } from "./services/seed.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  const value = i === -1 ? undefined : process.argv[i + 1];
  return value?.startsWith("--") ? undefined : value;
}

function requireArg(name: string): string {
  const value = arg(name);
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

const commands: Record<string, () => Promise<void>> = {
  async seed() {
    const { created, email } = await seedDemoUser({
      email: arg("email"),
      password: arg("password"),
    });
    console.log(created ? `Created ${email}` : `${email} already exists`);
  },

  async user() {
    const email = requireArg("email").toLowerCase();
    const [user] = await db
      .insert(users)
      .values({
        email,
        fullName: arg("name") ?? "",
        passwordHash: await hashPassword(requireArg("password")),
      })
      .returning();
    console.log(`Created ${user?.email}`);
  },
};

const name = process.argv[2];
const command = name ? commands[name] : undefined;

if (!command) {
  console.error(`Commands: ${Object.keys(commands).join(", ")}`);
  process.exit(1);
}

try {
  await command();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
