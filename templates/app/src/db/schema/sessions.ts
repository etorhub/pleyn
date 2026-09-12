/**
 * Sessions, stored as a digest.
 *
 * The database holds `sha256(token)`, never the token itself. A leaked dump
 * therefore does not hand anybody a working session, which is the whole reason
 * to keep sessions server-side rather than in a signed cookie.
 */

import {
  index,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users.ts";

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: serial("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenDigest: varchar("token_digest", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("ix_sessions_user_id").on(table.userId)],
);

export type Session = typeof sessions.$inferSelect;
