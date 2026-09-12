/**
 * Everything that reads or writes tasks.
 *
 * Routes stay thin — read parameters, authorize, call one of these, draw. The
 * moment a route starts doing two queries and a decision, the logic belongs
 * here instead.
 *
 * **Every query filters by `userId`.** The id in the URL is a claim, not a
 * permission: a task belonging to somebody else must be indistinguishable from
 * one that does not exist.
 */

import { and, count, desc, eq } from "drizzle-orm";

import { db, type Transactor } from "../db/client.ts";
import { tasks, type Task } from "../db/schema/index.ts";
import { NotFoundError } from "../lib/http.ts";

export const PER_PAGE = 20;

export interface TaskFilters {
  /** `all` | `open` | `done`. Lives in the query string. */
  show: "all" | "open" | "done";
  page: number;
}

export interface TaskPage {
  items: Task[];
  total: number;
  page: number;
  pages: number;
}

function scope(userId: number, show: TaskFilters["show"]) {
  if (show === "open")
    return and(eq(tasks.userId, userId), eq(tasks.isDone, false));
  if (show === "done")
    return and(eq(tasks.userId, userId), eq(tasks.isDone, true));
  return eq(tasks.userId, userId);
}

export async function listTasks(
  userId: number,
  filters: TaskFilters,
): Promise<TaskPage> {
  const where = scope(userId, filters.show);

  const [[total], items] = await Promise.all([
    db.select({ n: count() }).from(tasks).where(where),
    db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(desc(tasks.createdAt), desc(tasks.id))
      .limit(PER_PAGE)
      .offset(filters.page * PER_PAGE),
  ]);

  const n = total?.n ?? 0;
  return {
    items,
    total: n,
    page: filters.page,
    pages: Math.max(1, Math.ceil(n / PER_PAGE)),
  };
}

/** One task of this user's, or 404. Never "403": see AGENTS.md. */
export async function taskOf(userId: number, id: number): Promise<Task> {
  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1);

  if (!task) throw new NotFoundError("That task does not exist");
  return task;
}

export async function createTask(
  userId: number,
  title: string,
  connection: Transactor = db,
): Promise<Task> {
  const [task] = await connection
    .insert(tasks)
    .values({ userId, title })
    .returning();
  if (!task) throw new Error("insert returned nothing");
  return task;
}

/** Flips done/not done and returns the row as it now is. */
export async function toggleTask(userId: number, id: number): Promise<Task> {
  const current = await taskOf(userId, id);

  const [updated] = await db
    .update(tasks)
    .set({ isDone: !current.isDone })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();

  if (!updated) throw new NotFoundError("That task does not exist");
  return updated;
}

export async function deleteTask(userId: number, id: number): Promise<void> {
  await taskOf(userId, id);
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}
