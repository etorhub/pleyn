---
title: "Auth, sessions, CSRF"
description: "Sessions as digests, argon2id passwords, and CSRF on the body."
---

Three decisions worth knowing. The [conventions](/application/conventions/)
already say CSRF is published once; this page is the how.

## Sessions

The cookie holds the raw token. The database stores only `sha256(token)`. A
leaked dump does not hand anybody a working session. `SECRET_KEY` signs cookies
and CSRF; without it the app refuses to start in production.

Default lifetime: `SESSION_DAYS` (14). Expired sessions count as absent.
`requireUser` redirects to `/signin?next=…`.

## Passwords

Hashed with argon2id via `Bun.password` (Bun defaults). Sign-in verifies a
dummy hash when the user does not exist, so response timing does not leak which
emails are registered. Bad user and bad password both return null.

## CSRF

The token is `HMAC-SHA256(SECRET_KEY, session_token_digest)` — no table, tied to
the session, rotates when the session does.

It is published **once** as the `<body>`'s `hx-headers` → `X-CSRF-Token`. Every
htmx request inherits it. Never one per form.

Sign-in is the exception: a seed cookie `pleyn_csrf` plus a hidden `_csrf` field
on the only non-htmx form. Middleware also checks origin / `Sec-Fetch-Site`;
GET and HEAD are unchecked.

A formatter can break the `hx-headers` attribute — see [Pitfalls](/status/pitfalls/).
Tests that post without CSRF only exercise middleware; they do not test the
handler.
