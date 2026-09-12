/**
 * The example resource.
 *
 * One small table is enough to exercise every convention in the stack: a list
 * with an empty state, a filter that lives in the query string, a mutation that
 * returns the changed row plus an out-of-band counter, and a delete that has to
 * redraw the whole list rather than just the row.
 *
 * Delete it when you build your own. `bun run new-resource` writes the same
 * shape for any name.
 */

import {
  boolean,
  index,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users.ts";

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    userId: serial("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    isDone: boolean("is_done").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("ix_tasks_user_id").on(table.userId)],
);

export type Task = typeof tasks.$inferSelect;
