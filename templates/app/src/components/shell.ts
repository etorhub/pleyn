/**
 * The layout without a sidebar: the sign-in page and the error pages.
 *
 * There is no `hx-headers` with the CSRF token here because there is not
 * always a session to derive one from. The sign-in form carries its own hidden
 * field; it is the only form in the application that does.
 */

import { html } from "hono/html";

import { config } from "../lib/config.ts";
import type { Html } from "../lib/html.ts";
import { staticHref } from "../lib/static-files.ts";

export interface ShellProps {
  title: string;
  children: unknown;
}

export function Shell(props: ShellProps): Html {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <title>${props.title} · ${config.appName}</title>
        <link rel="stylesheet" href="${staticHref("app.css")}" />
        <script src="${staticHref("htmx.min.js")}" defer></script>
      </head>
      <body class="centred">
        <main class="card">${props.children}</main>
        <div id="toast" aria-live="polite"></div>
        <script>
          // A 4xx is a rendered answer, not a transport failure: htmx discards
          // the body of an error response unless it is told otherwise, and the
          // body is where the form with its messages is.
          document.body.addEventListener("htmx:beforeSwap", function (e) {
            var status = e.detail.xhr.status;
            if (status >= 400 && status < 500) {
              e.detail.shouldSwap = true;
              e.detail.isError = false;
            }
          });
        </script>
      </body>
    </html>` as Html;
}

/** The 404 page. The same one whether it does not exist or you cannot see it. */
export function NotFoundPage(): Html {
  return Shell({
    title: "Not found",
    children: html`
      <h1>Not found</h1>
      <p class="muted">
        This page does not exist, or you do not have access to it. If you think
        you should, ask whoever administers this installation.
      </p>
      <p><a class="button" href="/">Back to the start</a></p>
    `,
  });
}

export function ErrorPage(message: string): Html {
  return Shell({
    title: "Error",
    children: html`
      <h1>Something went wrong</h1>
      <p class="muted">${message}</p>
      <p><a class="button" href="/">Back to the start</a></p>
    `,
  });
}
