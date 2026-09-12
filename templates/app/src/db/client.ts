/**
 * The PostgreSQL connection.
 *
 * One pool per process. `postgres.js` connects lazily, on the first query —
 * which is why importing this file costs nothing and the tests that never touch
 * the database can run with no database at all.
 */

import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  drizzle,
  type PostgresJsQueryResultHKT,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { config } from "../lib/config.ts";
import * as schema from "./schema/index.ts";

const client = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
});

export const db = drizzle(client, { schema, casing: "snake_case" });

/**
 * The pool **or** a transaction in progress.
 *
 * This is the type a writing function should ask for, so its caller can put it
 * inside a `db.transaction()` of their own. `typeof db` will not do: the `tx`
 * handed to a transaction callback is a `PgTransaction`, which has no
 * `$client`. Both extend `PgDatabase`, which is what is here.
 */
export type Transactor = PgDatabase<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

/** Closes the pool. Only for scripts and tests. */
export async function closeDb(): Promise<void> {
  await client.end({ timeout: 5 });
}
