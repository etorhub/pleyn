/**
 * The sidebar counter.
 *
 * It lives in a service of its own because it is an **out-of-band target**:
 * whoever changes it has to redraw it, and that is not always the resource that
 * displays it. Completing a task changes a number the task list does not own.
 */

import { and, count, eq } from "drizzle-orm";

import { db } from "../db/client.ts";
import { tasks } from "../db/schema/index.ts";

/** Tasks still to do. */
export async function pendingCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.isDone, false)));

  return row?.n ?? 0;
}
