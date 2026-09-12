/**
 * The whole page.
 *
 * `GET /tasks` **always** returns this. The shell — sidebar, counter, toast —
 * is added by the caller, so this file only knows about its own content.
 */

import { html } from "hono/html";

import type { Task } from "../../db/schema/index.ts";
import type { Html } from "../../lib/html.ts";
import { TaskForm, TaskList } from "./tasks.fragment.ts";
import type { TaskQuery } from "./tasks.schema.ts";

export interface TasksPageProps {
  tasks: Task[];
  filters: TaskQuery;
  total: number;
  pages: number;
}

export function TasksPage({
  tasks,
  filters,
  total,
  pages,
}: TasksPageProps): Html {
  return html`
    <header class="head">
      <h1>Tasks</h1>
    </header>

    ${TaskForm()} ${TaskList({ tasks, filters, total, pages })}
  ` as Html;
}
