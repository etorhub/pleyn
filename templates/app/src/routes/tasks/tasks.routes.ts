/**
 * Task routes — the worked example of every convention in the stack.
 *
 *   GET    /tasks                  the whole page, always
 *   GET    /tasks/fragment/list    the list on its own, always
 *   POST   /tasks                  create
 *   POST   /tasks/:id/toggle       the row, plus the counter out of band
 *   DELETE /tasks/:id              the whole list, because it may now be empty
 *
 * Routes are thin: read parameters, authorize, call a service, draw. Anything
 * that starts making decisions belongs in `services/tasks.ts`.
 */

import { Hono } from "hono";

import { Layout, PendingCount } from "../../components/layout.ts";
import {
  fragment,
  idFromRoute,
  page,
  pushUrl,
  toast,
  withOob,
} from "../../lib/http.ts";
import { currentUser } from "../../middleware/session.ts";
import { pendingCount } from "../../services/counters.ts";
import {
  createTask,
  deleteTask,
  listTasks,
  toggleTask,
} from "../../services/tasks.ts";
import { TaskForm, TaskList, TaskRow } from "./tasks.fragment.ts";
import { TasksPage } from "./tasks.page.ts";
import {
  createTaskSchema,
  taskQuerySchema,
  taskQueryToString,
} from "./tasks.schema.ts";

export const tasksRoutes = new Hono();

// --- Page --------------------------------------------------------------------

tasksRoutes.get("/", async (c) => {
  const user = currentUser(c);
  const filters = taskQuerySchema.parse(c.req.query());
  const [list, pending] = await Promise.all([
    listTasks(user.id, filters),
    pendingCount(user.id),
  ]);

  return page(
    c,
    Layout({
      title: "Tasks",
      user,
      csrfToken: c.get("csrfToken") ?? "",
      path: c.req.path,
      pending,
      children: TasksPage({
        tasks: list.items,
        filters,
        total: list.total,
        pages: list.pages,
      }),
    }),
  );
});

// --- Fragments ---------------------------------------------------------------

tasksRoutes.get("/fragment/list", async (c) => {
  const user = currentUser(c);
  const filters = taskQuerySchema.parse(c.req.query());
  const list = await listTasks(user.id, filters);

  // A fragment route pushes **the page's** URL, never its own. Otherwise the
  // address bar ends up pointing at something that returns a fragment.
  pushUrl(c, `/tasks${taskQueryToString(filters)}`);

  return fragment(
    c,
    TaskList({
      tasks: list.items,
      filters,
      total: list.total,
      pages: list.pages,
    }),
  );
});

// --- Mutations ---------------------------------------------------------------

tasksRoutes.post("/", async (c) => {
  const user = currentUser(c);
  const parsed = createTaskSchema.safeParse(await c.req.parseBody());

  if (!parsed.success) {
    // Redraw the form fragment with the message, at 422. Whatever the person
    // typed is not thrown away.
    // The status goes through `fragment()`. Setting `c.status()` beforehand
    // does nothing: `fragment` sets it too, and its default is 200.
    const message = parsed.error.issues[0]?.message ?? "That is not valid";
    return fragment(c, TaskForm(message), 422);
  }

  await createTask(user.id, parsed.data.title);
  const [list, pending] = await Promise.all([
    listTasks(user.id, taskQuerySchema.parse({})),
    pendingCount(user.id),
  ]);

  // The form is the target; the list and the counter ride along out of band.
  // Both of them have to say so — `oob` on the list, `true` on the counter.
  // A node that does not is left in the remainder and swapped into the form.
  return fragment(
    c,
    await withOob(
      TaskForm(),
      TaskList({
        tasks: list.items,
        filters: taskQuerySchema.parse({}),
        total: list.total,
        pages: list.pages,
        oob: true,
      }),
      PendingCount(pending, true),
      toast("Task added", "success"),
    ),
  );
});

tasksRoutes.post("/:id/toggle", async (c) => {
  const user = currentUser(c);
  const id = idFromRoute(c.req.param("id"), "That task does not exist");

  const task = await toggleTask(user.id, id);
  const pending = await pendingCount(user.id);

  // The row is the target. The sidebar counter changed too, and it belongs to
  // a different module — so it travels out of band.
  return fragment(c, await withOob(TaskRow(task), PendingCount(pending, true)));
});

tasksRoutes.delete("/:id", async (c) => {
  const user = currentUser(c);
  const id = idFromRoute(c.req.param("id"), "That task does not exist");

  await deleteTask(user.id, id);

  const filters = taskQuerySchema.parse(c.req.query());
  const [list, pending] = await Promise.all([
    listTasks(user.id, filters),
    pendingCount(user.id),
  ]);

  // The whole list, not the row: this may have been the last one, and the
  // empty state has to appear.
  return fragment(
    c,
    await withOob(
      TaskList({
        tasks: list.items,
        filters,
        total: list.total,
        pages: list.pages,
      }),
      PendingCount(pending, true),
      toast("Task deleted", "success"),
    ),
  );
});
