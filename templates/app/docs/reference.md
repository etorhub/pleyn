# Reference

Tables generated from the code. **Not edited by hand**: they come from
`src/lib/oob.ts` and `src/routes/`, `bun run docs` writes them, and
`bun run check` fails when they no longer match.

They are here and not in `AGENTS.md` because they are lookup material, and
`AGENTS.md` has to fit in the window of whoever is working.

## Out-of-band swap targets

Each target has **one owner**: the fragment of the owning resource exports it,
and nothing else draws it. To emit one, `oobAttributes()` from `src/lib/oob.ts`
— the type accepts no id that is not in the registry, so an unregistered target
does not compile.

<!-- generated:oob -->

| Target               | Owner                | When it changes                         |
| -------------------- | -------------------- | --------------------------------------- |
| `#toast` _(content)_ | lib/http.ts          | any error or confirmation               |
| `#pending-count`     | components/layout.ts | a task is created, completed or deleted |
| `#task-list`         | routes/tasks         | a task is created or deleted            |

<!-- /generated:oob -->

## Resources

The four-file rule, as it stands.

<!-- generated:resources -->

| Resource | `.routes` | `.page` | `.fragment` | `.schema` |
| -------- | --------- | ------- | ----------- | --------- |
| `auth/`  | yes       | yes     | yes         | yes       |
| `home/`  | yes       | —       | —           | —         |
| `tasks/` | yes       | yes     | yes         | yes       |

<!-- /generated:resources -->
