/**
 * The shell every page sits in.
 *
 * Two things here are load-bearing rather than decorative:
 *
 * **`aria-current="page"`** is written from the path. The stylesheet gave it a
 * background from the start and nothing set it, so the sidebar did not say
 * where you were — in colour or to a screen reader.
 *
 * **`#toast` is created once, empty, with `aria-live`.** Toasts replace its
 * *content*, never the node, because a browser only announces a live region
 * that already existed when the text arrived. See `lib/http.ts`.
 */

import { html, raw } from "hono/html";

import type { User } from "../db/schema/index.ts";
import type { Html } from "../lib/html.ts";
import { csrfHeadersAttribute } from "../lib/csrf.ts";
import { oobAttributes } from "../lib/oob.ts";
import { staticHref } from "../lib/static-files.ts";

export interface LayoutProps {
  title: string;
  user: User;
  csrfToken: string;
  /** The path being viewed, so the menu can mark it. */
  path: string;
  pending: number;
  children: unknown;
}

/** The sidebar's pending-task badge. An out-of-band target: see `lib/oob.ts`. */
export function PendingCount(count: number, oob = false): Html {
  return html`<span
    ${oobAttributes("pending-count", oob)}
    class="badge ${count > 0 ? "badge-active" : ""}"
    >${count}</span
  >` as Html;
}

const LINKS = [
  { href: "/tasks", text: "Tasks" },
  { href: "/account", text: "Account" },
];

/**
 * The longest matching link wins, not the first.
 *
 * `/tasks` is a prefix of `/tasks/42`, and marking both would mark two entries
 * at once — which `aria-current` forbids and which reads as a bug.
 */
function currentHref(path: string): string | null {
  let best: string | null = null;
  for (const link of LINKS) {
    if (path === link.href || path.startsWith(`${link.href}/`)) {
      if (!best || link.href.length > best.length) best = link.href;
    }
  }
  return best;
}

export function Layout({
  title,
  user,
  csrfToken,
  path,
  pending,
  children,
}: LayoutProps): Html {
  const current = currentHref(path);

  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <link rel="stylesheet" href="${staticHref("app.css")}" />
        <script src="${staticHref("htmx.min.js")}" defer></script>
      </head>
      <!--
        The CSRF token is published once, here, and every htmx request inherits
        it. Never one per form: see AGENTS.md.
      -->
      <body ${raw(csrfHeadersAttribute(csrfToken))}>
        <a class="skip" href="#main">Skip to content</a>

        <div class="shell">
          <nav class="menu" aria-label="Main">
            <span class="brand">${title}</span>
            <ul>
              ${LINKS.map(
                (link) =>
                  html`<li>
                    <a
                      href="${link.href}"
                      ${current === link.href ? raw('aria-current="page"') : ""}
                      >${link.text}
                      ${link.href === "/tasks" ? PendingCount(pending) : ""}</a
                    >
                  </li>`,
              )}
            </ul>
            <form method="post" action="/signout" class="signout">
              <span class="who">${user.fullName || user.email}</span>
              <button type="submit" class="link">Sign out</button>
            </form>
          </nav>

          <main id="main">${children}</main>
        </div>

        <!--
          Born empty, with aria-live. Toasts change what is inside it; nothing
          ever replaces this node.
        -->
        <div id="toast" aria-live="polite" role="status"></div>
      </body>
    </html>` as Html;
}
