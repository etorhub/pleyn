/**
 * The sign-in form.
 *
 * This is the one form in the application that carries a `_csrf` field. Every
 * other request inherits the token from the `<body>`'s `hx-headers` — but when
 * this form is drawn there is no session yet, so there is no body to inherit
 * from.
 *
 * It also submits as an ordinary form, not over htmx: after signing in the
 * browser needs a real navigation carrying the new cookie, not a swap.
 */

import { html, raw } from "hono/html";

import type { Html } from "../../lib/html.ts";
import { staticHref } from "../../lib/static-files.ts";

export interface SignInProps {
  csrfToken: string;
  next?: string;
  email?: string;
  error?: string;
}

export function SignInPage({
  csrfToken,
  next,
  email,
  error,
}: SignInProps): Html {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sign in</title>
        <link rel="stylesheet" href="${staticHref("app.css")}" />
      </head>
      <body class="centred">
        <main class="card">
          <h1>Sign in</h1>

          ${error ? html`<p class="error" role="alert">${error}</p>` : ""}

          <form method="post" action="/signin">
            <input type="hidden" name="_csrf" value="${csrfToken}" />
            ${next ? html`<input type="hidden" name="next" value="${next}" />` : ""}

            <label for="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="username"
              required
              value="${email ?? ""}"
              ${error ? raw('aria-invalid="true"') : ""}
            />

            <label for="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            />

            <button type="submit">Sign in</button>
          </form>
        </main>
      </body>
    </html>` as Html;
}
