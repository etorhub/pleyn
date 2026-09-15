---
title: "Filter + pushUrl"
description: "Filters in the query string; push the page URL from a fragment route."
---

Filters live in the query string. A fragment route that re-renders the list
must push **the page's** URL, never its own fragment path — otherwise the
address bar shows `/tasks/fragment/list?…` and a refresh or share is wrong.

## In the template

The tasks filter form `hx-get`s the fragment list into `#task-list`. The
handler in `tasks.routes.ts` reads the same query schema as the page, then:

```ts
pushUrl(c, `/tasks${taskQueryToString(filters)}`);
return fragment(c, TaskList({ tasks, filters, total, pages }));
```

`pushUrl` sets `HX-Push-Url`. The page route and the fragment route share
`tasks.schema.ts` so both agree on the filter shape.

Convention: [Conventions](/application/conventions/).
