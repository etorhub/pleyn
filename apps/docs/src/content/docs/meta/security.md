---
title: "Security"
description: "How to report a vulnerability."
---

If you find a vulnerability in PLEYN, `htmx-contract`, or a generated
application's security-sensitive paths (sessions, CSRF, password hashing):

1. Prefer a [GitHub Security Advisory](https://github.com/etorhub/pleyn/security)
   on the repository, if available.
2. Otherwise open a private report via GitHub Issues and mark it clearly — do
   not file a public issue with an exploit write-up.

Do not put secrets, production keys, or personal data into documentation PRs or
issue templates. The template's `.env` is generated locally and gitignored for a
reason.
