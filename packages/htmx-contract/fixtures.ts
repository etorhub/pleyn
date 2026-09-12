/**
 * The failures, as markup.
 *
 * Each fixture is the smallest markup that produces one of the failures a rule
 * claims to catch, paired with the corrected version. They exist so every rule
 * is tested against the thing it is for: **a rule that passes its own failure
 * is decoration**, and the only way to know is to keep the failure around.
 *
 * These are shapes, not screenshots. What is preserved is the structure that
 * causes htmx to do the wrong thing — the ids and the copy are deliberately
 * boring.
 */

/**
 * A response that is nothing but an out-of-band toast.
 *
 * htmx lifts the `hx-swap-oob` node out first, and then performs the main swap
 * with what is left — which is nothing. Under `hx-swap="outerHTML"`, swapping
 * nothing into the target deletes the target. The user presses a button, gets a
 * perfectly good error message, and the row they were editing vanishes.
 *
 * This is the most dangerous shape in the set, because the natural place to
 * write it is a global error handler, where it fires on every failed mutation
 * at once.
 */
export const TOAST_ONLY_422 = `<div hx-swap-oob="innerHTML:#toast"><div class="toast toast-error" role="alert"><strong>Error</strong><span>That item no longer exists</span></div></div>`;

/** The same response done right: the header suppresses the main swap. */
export const TOAST_ONLY_422_FIXED_HEADERS = { "HX-Reswap": "none" };

/**
 * Per-row controls inside one enclosing `<form>`.
 *
 * For any non-GET request htmx collects the values of the form surrounding the
 * element (`getInputValues`) and lets them override the element's own
 * (`overrideFormData`). Most body parsers keep the last occurrence of a
 * repeated name. So every row ships every other row's value, and editing the
 * first row saves the last row's.
 *
 * The duplicated `id` in the same markup is a second, quieter failure: it is
 * invalid HTML, and it points every `aria-describedby` at the first row.
 */
export const TABLE_WRAPPED_IN_FORM = `<form hx-post="/items/bulk">
  <table>
    <tbody>
      <tr id="row-1">
        <td><select id="status" name="status"><option value="open">Open</option></select></td>
      </tr>
      <tr id="row-2">
        <td><select id="status" name="status"><option value="done">Done</option></select></td>
      </tr>
    </tbody>
  </table>
</form>`;

/** The same table without the enclosing form: each row sends only its own value. */
export const TABLE_WITH_HX_INCLUDE = `<div id="item-table">
  <table>
    <tbody>
      <tr id="row-1">
        <td><select id="status-1" name="status" hx-patch="/items/1" hx-target="#row-1" hx-swap="outerHTML"><option value="open">Open</option></select></td>
      </tr>
      <tr id="row-2">
        <td><select id="status-2" name="status" hx-patch="/items/2" hx-target="#row-2" hx-swap="outerHTML"><option value="done">Done</option></select></td>
      </tr>
    </tbody>
  </table>
</div>`;

/**
 * A list whose rows and empty state are rendered in separate branches.
 *
 * The delete route returns only the row, because that is the piece that
 * changed. It works for every row but the last one: removing that leaves a
 * table header standing over an empty body, for ever, with nothing anywhere
 * saying the list has ended. Nothing obliges the delete path to know the empty
 * state exists.
 *
 * The fix is structural rather than careful: one function that takes both the
 * rows and the empty state, so there is no way to draw one without the other.
 */
export const LIST_WITH_ONE_ROW = `<div id="item-list">
  <table class="data">
    <thead><tr><th>Item</th></tr></thead>
    <tbody><tr id="item-1"><td>The only one</td></tr></tbody>
  </table>
</div>`;

/** What the delete route used to answer: the row, hidden. Nothing else. */
export const DELETE_ROW_ONLY = `<tr id="item-1" hidden></tr>`;

/** What it answers now: the whole list, which is empty, and says so. */
export const DELETE_WHOLE_LIST = `<div id="item-list">
  <p class="empty">Nothing here yet.</p>
</div>`;

/**
 * A poll whose only stop condition is reaching a terminal state.
 *
 * The fragment re-arms itself while the work is unfinished, which is correct
 * right up until the work stops without finishing — a killed process, a
 * restarted container — and the state never becomes terminal. Then the page
 * asks for it every two seconds, indefinitely, for everyone looking at it.
 *
 * The markup of a poll that will stop and one that never will is identical,
 * which is why this is invisible in review. Declaring the bound is what makes
 * the difference checkable.
 */
export const UNBOUNDED_POLL = `<div id="job-4" hx-get="/jobs/4/fragment/status" hx-target="#job-4" hx-swap="outerHTML" hx-trigger="every 2s">Working…</div>`;

/** The same fragment declaring a bound. */
export const BOUNDED_POLL = `<div id="job-4" hx-get="/jobs/4/fragment/status?attempt=8" hx-target="#job-4" hx-swap="outerHTML" hx-trigger="every 2s" data-poll-max="900">Working…</div>`;

/** A minimal page to swap things into. */
export const PAGE = `<!doctype html>
<html lang="en">
  <body>
    <div id="item-table">
      <table>
        <tbody>
          <tr id="row-1"><td>One row</td></tr>
          <tr id="row-2"><td>Another</td></tr>
        </tbody>
      </table>
    </div>
    <div id="toast" aria-live="polite"></div>
    <span id="pending-count"></span>
  </body>
</html>`;
