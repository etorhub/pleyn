/**
 * Schemas for the tasks resource.
 *
 * One schema per resource. When a schema validates a row, derive it from the
 * Drizzle table with `drizzle-zod` and refine — the table is the source of
 * truth and the schema comes out of it, not the other way round.
 *
 * **The keys here are the wire format.** They are the names the browser sends
 * in the query string and in form bodies, so renaming one breaks every link
 * and bookmark that already exists. Rename the variable, not the key.
 */

import { z } from "zod";

/**
 * Filters live in the query string, never in a client variable.
 *
 * That is what makes a filtered list linkable and the back button work: the
 * fragment route reads the same parameters, and answers with `pushUrl()`
 * pointing at the page's URL.
 */
export const taskQuerySchema = z.object({
  show: z.enum(["all", "open", "done"]).default("all"),
  page: z.coerce.number().int().min(0).default(0),
});

export type TaskQuery = z.infer<typeof taskQuerySchema>;

/** Rebuilds the canonical query string, for `HX-Push-Url`. */
export function taskQueryToString(q: TaskQuery): string {
  const params = new URLSearchParams();
  if (q.show !== "all") params.set("show", q.show);
  if (q.page > 0) params.set("page", String(q.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "A task needs a title")
    .max(200, "200 characters at most"),
});
