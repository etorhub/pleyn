/**
 * Everything htmx can ask for on its own.
 *
 * Mutations return the piece that changed; when they also change something
 * outside it, that travels alongside with `withOob()` and its target must be
 * in `lib/oob.ts`.
 *
 * The rule this file exists to demonstrate: **rows and the empty state are
 * drawn by the same function.** `DataTable` takes both, so there is no way to
 * render one without saying what the other is — which is what stops a delete
 * route leaving a header standing over nothing.
 */

import { html, raw } from "hono/html";

import { DataTable } from "../../components/views.ts";
import type { Task } from "../../db/schema/index.ts";
import type { Html } from "../../lib/html.ts";
import { oobAttributes } from "../../lib/oob.ts";
import type { TaskQuery } from "./tasks.schema.ts";
import { taskQueryToString } from "./tasks.schema.ts";

/** One row. Returned on its own by the toggle route. */
export function TaskRow(task: Task): Html {
  return html`<tr id="task-${task.id}" class="${task.isDone ? "done" : ""}">
    <td>
      <button
        type="button"
        class="toggle"
        aria-pressed="${task.isDone ? "true" : "false"}"
        hx-post="/tasks/${task.id}/toggle"
        hx-target="#task-${task.id}"
        hx-swap="outerHTML"
      >
        ${task.isDone ? "Done" : "Open"}
      </button>
    </td>
    <td>${task.title}</td>
    <td class="right">
      <!--
        The delete target is the whole list, not this row. Returning only the
        row works until it is the last one, and then the table header stands
        over an empty body for ever.
      -->
      <button
        type="button"
        class="link danger"
        hx-delete="/tasks/${task.id}"
        hx-target="#task-list"
        hx-swap="outerHTML"
      >
        Delete
      </button>
    </td>
  </tr>` as Html;
}

export interface TaskListProps {
  tasks: Task[];
  filters: TaskQuery;
  total: number;
  pages: number;
}

/** The list, its filter and its pagination. An out-of-band target. */
export function TaskList({
  tasks,
  filters,
  total,
  pages,
}: TaskListProps): Html {
  const link = (show: TaskQuery["show"], label: string) => {
    const url = `/tasks${taskQueryToString({ ...filters, show, page: 0 })}`;
    return html`<a
      href="${url}"
      class="chip ${filters.show === show ? "chip-on" : ""}"
      ${filters.show === show ? raw('aria-current="true"') : ""}
      hx-get="/tasks/fragment/list${taskQueryToString({ ...filters, show, page: 0 })}"
      hx-target="#task-list"
      hx-swap="outerHTML"
      >${label}</a
    >`;
  };

  return html`<div ${oobAttributes("task-list")}>
    <div class="filters" role="group" aria-label="Filter tasks">
      ${link("all", "All")} ${link("open", "Open")} ${link("done", "Done")}
    </div>

    ${DataTable({
      columns: html`<th>State</th>
        <th>Task</th>
        <th></th>` as Html,
      rows: tasks.map((task) => TaskRow(task) as Html),
      // Rows and the empty state, together. See the note at the top of the file.
      empty:
        filters.show === "all"
          ? "Nothing here yet. Add the first task above."
          : "No tasks match that filter.",
      footer:
        pages > 1
          ? (html`<nav class="pages" aria-label="Pages">
              ${Array.from({ length: pages }, (_, i) => i).map(
                (i) =>
                  html`<a
                    href="/tasks${taskQueryToString({ ...filters, page: i })}"
                    class="${i === filters.page ? "on" : ""}"
                    hx-get="/tasks/fragment/list${taskQueryToString({ ...filters, page: i })}"
                    hx-target="#task-list"
                    hx-swap="outerHTML"
                    >${i + 1}</a
                  >`,
              )}
              <span class="muted">${total} total</span>
            </nav>` as Html)
          : "",
    })}
  </div>` as Html;
}

/** The add form. Its own `<form>`, so it sends only its own field. */
export function TaskForm(error?: string): Html {
  return html`<form
    id="task-form"
    class="add"
    hx-post="/tasks"
    hx-target="#task-form"
    hx-swap="outerHTML"
  >
    <label class="sr-only" for="title">Task</label>
    <input
      id="title"
      name="title"
      type="text"
      placeholder="What needs doing?"
      required
      maxlength="200"
      autocomplete="off"
      ${error ? raw('aria-invalid="true" aria-describedby="title-error"') : ""}
    />
    <button type="submit">Add</button>
    ${error ? html`<p id="title-error" class="error">${error}</p>` : ""}
  </form>` as Html;
}
