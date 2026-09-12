/**
 * The pieces a list is drawn with.
 *
 * **The empty state and the rows go together on purpose.** Written separately,
 * whoever renders the rows can forget the notice — and then deleting a list's
 * last row leaves a table with a header and an empty body, saying nowhere that
 * there is nothing. Here that cannot happen: there is no way to ask for the
 * rows without also saying what should be seen when there are none.
 *
 * This is one of the four failure classes the stack is built against; see
 * `AGENTS.md`.
 */

import { html } from "hono/html";

import type { Html } from "../lib/html.ts";

/** What is shown when a list has nothing in it. */
export function EmptyState(message: Html | string): Html {
  return html`<p class="empty">${message}</p>` as Html;
}

export interface DataTableProps {
  /** The header cells, already rendered: `<th>…</th><th>…</th>`. */
  columns: Html;
  rows: Html[];
  /** What is shown when `rows` is empty. */
  empty: Html | string;
  /** Above the table: an action bar, say. Only shown when there are rows. */
  before?: Html | "";
  /** Below the table: pagination, a summary. Only shown when there are rows. */
  footer?: Html | "";
  /** An extra class for the `<table>`, when a view has its own. */
  cssClass?: string;
}

/**
 * A data table with its empty state.
 *
 * What goes before and after only appears when there are rows: neither a bar
 * for selecting none of them nor paginating nothing means anything.
 */
export function DataTable({
  columns,
  rows,
  empty,
  before = "",
  footer = "",
  cssClass,
}: DataTableProps): Html {
  if (rows.length === 0) return EmptyState(empty);

  return html`${before}
    <div class="scroller">
      <table class="data${cssClass === undefined ? "" : ` ${cssClass}`}">
        <thead>
          <tr>
            ${columns}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    ${footer}` as Html;
}

export interface Page {
  total: number;
  limit: number;
  offset: number;
}

/**
 * "31–60 of 214", with the previous and next steps.
 *
 * The range is computed here rather than in each fragment, because a range
 * counted from `offset + 1` without looking at the total reads "1–0 of 0" on
 * an empty list.
 */
export function Pagination({
  page,
  steps,
  summary = "",
}: {
  page: Page;
  steps: Html | "";
  /** Next to the range: a total, a count. */
  summary?: Html | "";
}): Html {
  const from = page.total === 0 ? 0 : page.offset + 1;
  const to = Math.min(page.offset + page.limit, page.total);

  return html`<nav class="pages" aria-label="Pagination">
    <span class="muted">
      ${String(from)}–${String(to)} of ${String(page.total)}${summary}
    </span>
    ${steps}
  </nav>` as Html;
}

/**
 * A small badge next to a name.
 *
 * The title is rendered with a nested template and not with `raw()`: the text
 * can come from a database row, and a quote would break it out of the
 * attribute.
 */
export function Badge(
  text: string,
  options: { soft?: boolean; title?: string } = {},
): Html {
  const cssClass = options.soft === true ? "badge badge-soft" : "badge";
  return html`<span
    class="${cssClass}"
    ${options.title === undefined ? "" : html`title="${options.title}"`}
    >${text}</span
  >` as Html;
}

/**
 * The spinner shown while a request is in flight.
 *
 * It is always rendered, and htmx makes it visible: for as long as the request
 * lasts, htmx puts `.htmx-request` on whichever element `hx-indicator` names,
 * and the stylesheet fades this in and out.
 *
 * An action with no indicator can be pressed again while the first press is
 * still running, and gives no sign that anything is happening. Every mutation
 * in a generated resource points `hx-indicator` at one of these.
 *
 * `aria-hidden`: a spinning wheel is no use to somebody who cannot see it.
 * Whoever needs to know will know from the button, which is disabled.
 */
export function Spinner(): Html {
  return html`<span
    class="spinner htmx-indicator"
    aria-hidden="true"
  ></span>` as Html;
}
