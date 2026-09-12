/**
 * The demo account.
 *
 * Idempotent on the email: running it twice changes nothing. The CLI calls it
 * once so that a freshly generated project has something to sign in with,
 * rather than a login form and no way past it.
 */

import { eq } from "drizzle-orm";

import { db } from "../db/client.ts";
import { tasks, users } from "../db/schema/index.ts";
import { hashPassword } from "../lib/auth.ts";

export const DEMO_EMAIL = "demo@example.com";
export const DEMO_PASSWORD = "pleyn-demo-password";

const SAMPLE = [
  "Read AGENTS.md",
  "Run bun run ok",
  "Add a resource with bun run new-resource",
  "Delete the tasks resource and build your own",
];

export interface SeedOptions {
  email?: string | undefined;
  password?: string | undefined;
}

export async function seedDemoUser(options: SeedOptions = {}): Promise<{
  created: boolean;
  email: string;
}> {
  const email = (options.email ?? DEMO_EMAIL).toLowerCase();
  const password = options.password ?? DEMO_PASSWORD;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) return { created: false, email };

  const [user] = await db
    .insert(users)
    .values({
      email,
      fullName: "Demo",
      passwordHash: await hashPassword(password),
    })
    .returning();

  if (!user) throw new Error("could not create the demo user");

  await db
    .insert(tasks)
    .values(
      SAMPLE.map((title, i) => ({ userId: user.id, title, isDone: i === 0 })),
    );

  return { created: true, email };
}
