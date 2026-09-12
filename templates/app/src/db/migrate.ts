/**
 * Applies the migrations.
 *
 * Run explicitly, never on import. The origin of this stack applied them at
 * import time, and ten test files importing the server meant ten processes
 * racing to migrate the same fresh database — a dozen failures that had
 * nothing to do with anybody's change.
 */

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { closeDb, db } from "./client.ts";

export async function applyMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

if (import.meta.main) {
  await applyMigrations();
  console.log("[db] migrations applied.");
  await closeDb();
}
