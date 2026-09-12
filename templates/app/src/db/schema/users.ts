/**
 * People who can sign in.
 *
 * The password hash is argon2id via `Bun.password` — no dependency, and the
 * parameters are Bun's defaults, which are sensible. The plain password never
 * leaves `lib/auth.ts`.
 */

import {
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
