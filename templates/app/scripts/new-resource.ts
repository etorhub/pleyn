/**
 * Scaffolds a resource.
 *
 *   bun run new-resource projects
 *   bun run new-resource projects --path clients --title "Client projects"
 *
 * A resource in this stack is **four files with fixed names**, and the naming
 * is not cosmetic: `scripts/agents-md.ts` reads the directory to generate the
 * table in `docs/reference.md`, and `bun run check` fails when a resource is
 * missing one of them. Written by hand, the fourth file is the one that gets
 * forgotten.
 *
 * What comes out compiles, is registered, and answers on its URL. It is
 * deliberately thin — a list, an empty state and a filter — because the point
 * is to start from something that already obeys the rules rather than from a
 * blank file where the rules are optional.
 *
 * The worked example to copy from is `src/routes/tasks/`.
 */

import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

interface Options {
  /** The directory under `src/routes/`, and the base of every symbol. */
  dir: string;
  /** The URL segment. Defaults to the directory name. */
  segment: string;
  /** What the `<h1>` says. */
  title: string;
}

function help(problem?: string): never {
  if (problem) console.error(`\n[new-resource] ${problem}\n`);
  console.error(
    "  bun run new-resource <name> [--path <segment>] [--title <Title>]\n\n" +
      "  <name>     the directory under src/routes/, in lowercase-with-hyphens\n" +
      "  --path     the URL segment. Defaults to <name>\n" +
      "  --title    the heading. Defaults to <name>, capitalised\n",
  );
  process.exit(problem ? 1 : 0);
}

function parseArguments(argv: string[]): Options {
  if (argv.includes("--help") || argv.includes("-h")) help();

  const named = new Map<string, string>();
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const argument = argv[i] ?? "";
    if (!argument.startsWith("--")) {
      positional.push(argument);
      continue;
    }
    const key = argument.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--"))
      help(`--${key} needs a value.`);
    named.set(key, value);
    i++;
  }

  const dir = positional[0];
  if (dir === undefined) help("Say what the resource is called.");
  if (!/^[a-z][a-z0-9-]*$/.test(dir)) {
    help(
      `"${dir}" will not do as a name: lowercase, digits and hyphens, starting with a letter.`,
    );
  }

  const segment = named.get("path") ?? dir;
  const title =
    named.get("title") ?? segment.charAt(0).toUpperCase() + segment.slice(1);
  return { dir, segment, title };
}

/** `projects` → `Projects`; `bank-connections` → `BankConnections`. */
function pascal(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** `bank-connections` → `bankConnections`. */
function camel(name: string): string {
  const p = pascal(name);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** `projects` → `project`. Good enough for the identifiers; rename if it is not. */
function singular(name: string): string {
  if (name.endsWith("ies")) return `${name.slice(0, -3)}y`;
  if (name.endsWith("ses") || name.endsWith("xes")) return name.slice(0, -2);
  if (name.endsWith("s")) return name.slice(0, -1);
  return name;
}

interface Names {
  dir: string;
  segment: string;
  title: string;
  /** `Projects` */
  Plural: string;
  /** `Project` */
  One: string;
  /** `projects` */
  plural: string;
  /** `project` */
  one: string;
  /** `project-list`, the out-of-band target id */
  listId: string;
}

function names(o: Options): Names {
  const one = camel(singular(o.dir));
  return {
    dir: o.dir,
    segment: o.segment,
    title: o.title,
    Plural: pascal(o.dir),
    One: pascal(singular(o.dir)),
    plural: camel(o.dir),
    one,
    listId: `${singular(o.dir)}-list`,
  };
}

// --- The four files ----------------------------------------------------------

function schemaFile(n: Names): string {
  return `/**
 * Schemas for the ${n.dir} resource.
 *
 * **The keys here are the wire format.** They are the names the browser sends
 * in the query string and in form bodies, so renaming one breaks every link
 * and bookmark that already exists. Rename the variable, not the key.
 */

import { z } from "zod";

/**
 * Filters live in the query string, never in a client variable.
 *
 * That is what makes a filtered list linkable and the back button work: the
 * fragment route reads the same parameters and answers with \`pushUrl()\`
 * pointing at the page's URL.
 */
export const ${n.one}QuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
});

export type ${n.One}Query = z.infer<typeof ${n.one}QuerySchema>;

/** Rebuilds the canonical query string, for \`HX-Push-Url\`. */
export function ${n.one}QueryToString(q: ${n.One}Query): string {
  const params = new URLSearchParams();
  if (q.page > 0) params.set("page", String(q.page));
  const s = params.toString();
  return s ? \`?\${s}\` : "";
}
`;
}

function fragmentFile(n: Names): string {
  return `/**
 * Everything htmx can ask for on its own.
 *
 * Mutations return the piece that changed; when they also change something
 * outside it, that travels alongside with \`withOob()\` and its target must be
 * declared in \`lib/oob.ts\`.
 *
 * **Rows and the empty state are drawn by the same function.** \`DataTable\`
 * takes both, so there is no way to render one without saying what the other
 * is — which is what stops a delete route leaving a header standing over
 * nothing.
 */

import { html } from "hono/html";

import { DataTable } from "../../components/views.ts";
import type { Html } from "../../lib/html.ts";
import { oobAttributes } from "../../lib/oob.ts";
import { ${n.one}QueryToString, type ${n.One}Query } from "./${n.dir}.schema.ts";

/** Replace this with the row type from \`db/schema\` once the table exists. */
export interface ${n.One} {
  id: number;
  name: string;
}

/** One row. Return this on its own from a route that changes one ${n.one}. */
export function ${n.One}Row(${n.one}: ${n.One}): Html {
  return html\`<tr id="${n.one}-\${${n.one}.id}">
    <td>\${${n.one}.name}</td>
  </tr>\` as Html;
}

export interface ${n.Plural}ListProps {
  ${n.plural}: ${n.One}[];
  filters: ${n.One}Query;
  total: number;
  pages: number;
}

/**
 * The list, with its pagination.
 *
 * The wrapper's id is declared in \`lib/oob.ts\`, which is what lets another
 * route redraw this list out of band without guessing at a selector.
 */
export function ${n.Plural}List({ ${n.plural}, filters, total, pages }: ${n.Plural}ListProps): Html {
  return html\`<div \${oobAttributes("${n.listId}")}>
    \${DataTable({
      columns: html\`<th>Name</th>\` as Html,
      rows: ${n.plural}.map((${n.one}) => ${n.One}Row(${n.one}) as Html),
      empty: "Nothing here yet.",
      footer:
        pages > 1
          ? (html\`<nav class="pages" aria-label="Pages">
              \${Array.from({ length: pages }, (_, i) => i).map(
                (i) => html\`<a
                  href="/${n.segment}\${${n.one}QueryToString({ ...filters, page: i })}"
                  class="\${i === filters.page ? "on" : ""}"
                  hx-get="/${n.segment}/fragment/list\${${n.one}QueryToString({ ...filters, page: i })}"
                  hx-target="#${n.listId}"
                  hx-swap="outerHTML"
                  >\${i + 1}</a
                >\`,
              )}
              <span class="muted">\${total} total</span>
            </nav>\` as Html)
          : "",
    })}
  </div>\` as Html;
}
`;
}

function pageFile(n: Names): string {
  return `/**
 * The whole page.
 *
 * \`GET /${n.segment}\` **always** returns this. The shell — sidebar, counter,
 * toast — is added by the caller, so this file only knows its own content.
 */

import { html } from "hono/html";

import type { Html } from "../../lib/html.ts";
import { ${n.Plural}List, type ${n.One} } from "./${n.dir}.fragment.ts";
import type { ${n.One}Query } from "./${n.dir}.schema.ts";

export interface ${n.Plural}PageProps {
  ${n.plural}: ${n.One}[];
  filters: ${n.One}Query;
  total: number;
  pages: number;
}

export function ${n.Plural}Page({ ${n.plural}, filters, total, pages }: ${n.Plural}PageProps): Html {
  return html\`
    <header class="head">
      <h1>${n.title}</h1>
    </header>

    \${${n.Plural}List({ ${n.plural}, filters, total, pages })}
  \` as Html;
}
`;
}

function routesFile(n: Names): string {
  return `/**
 * Routes for the ${n.dir} resource.
 *
 *   GET /${n.segment}                  the whole page, always
 *   GET /${n.segment}/fragment/list    the list on its own, always
 *
 * Routes are thin: read parameters, authorize, call a service, draw. Anything
 * that starts making decisions belongs in \`services/\`.
 *
 * The \`HX-Request\` header is never read to decide *what* to return. The URL
 * decides; see \`AGENTS.md\`.
 */

import { Hono } from "hono";

import { Layout } from "../../components/layout.ts";
import { fragment, page, pushUrl } from "../../lib/http.ts";
import { currentUser } from "../../middleware/session.ts";
import { pendingCount } from "../../services/counters.ts";
import { ${n.Plural}List, type ${n.One} } from "./${n.dir}.fragment.ts";
import { ${n.Plural}Page } from "./${n.dir}.page.ts";
import {
  ${n.one}QuerySchema,
  ${n.one}QueryToString,
  type ${n.One}Query,
} from "./${n.dir}.schema.ts";

export const ${n.plural}Routes = new Hono();

/**
 * Where the rows come from. Replace this with a call into \`services/\`.
 *
 * It is a function and not an inline \`[]\` so that the shape of what the routes
 * expect is stated once, and swapping in the real query is a one-line change.
 */
async function list${n.Plural}(
  _userId: number,
  filters: ${n.One}Query,
): Promise<{ items: ${n.One}[]; total: number; pages: number }> {
  void filters;
  return await Promise.resolve({ items: [], total: 0, pages: 0 });
}

// --- Page --------------------------------------------------------------------

${n.plural}Routes.get("/", async (c) => {
  const user = currentUser(c);
  const filters = ${n.one}QuerySchema.parse(c.req.query());
  const [list, pending] = await Promise.all([
    list${n.Plural}(user.id, filters),
    pendingCount(user.id),
  ]);

  return page(
    c,
    Layout({
      title: "${n.title}",
      user,
      csrfToken: c.get("csrfToken") ?? "",
      path: c.req.path,
      pending,
      children: ${n.Plural}Page({
        ${n.plural}: list.items,
        filters,
        total: list.total,
        pages: list.pages,
      }),
    }),
  );
});

// --- Fragments ---------------------------------------------------------------

${n.plural}Routes.get("/fragment/list", async (c) => {
  const user = currentUser(c);
  const filters = ${n.one}QuerySchema.parse(c.req.query());
  const list = await list${n.Plural}(user.id, filters);

  // A fragment route pushes **the page's** URL, never its own. Otherwise the
  // address bar ends up pointing at something that returns a fragment.
  pushUrl(c, \`/${n.segment}\${${n.one}QueryToString(filters)}\`);

  return fragment(
    c,
    ${n.Plural}List({
      ${n.plural}: list.items,
      filters,
      total: list.total,
      pages: list.pages,
    }),
  );
});
`;
}

// --- Registration ------------------------------------------------------------

/**
 * Adds the list's id to the out-of-band registry in `src/lib/oob.ts`.
 *
 * Done here rather than left as a note, because `oobAttributes()` only accepts
 * ids from that registry: a scaffold that skipped this step would not compile,
 * and "generated code that does not compile" teaches the wrong lesson about
 * the guardrail. The registry is still the source of truth — this writes into
 * it, and `bun run docs` picks the new row up from there.
 */
async function registerOobTarget(n: Names): Promise<void> {
  const path = join(ROOT, "src", "lib", "oob.ts");
  const source = await Bun.file(path).text();

  if (source.includes(`"${n.listId}":`)) {
    console.log(
      `[new-resource] #${n.listId} is already registered; leaving oob.ts alone.`,
    );
    return;
  }

  const anchor = "} as const satisfies Record<string, OobTarget>;";
  if (!source.includes(anchor)) {
    console.warn(
      `[new-resource] could not find the end of OOB_TARGETS in src/lib/oob.ts.\n` +
        `  Add this entry by hand:\n\n  "${n.listId}": { owner: "routes/${n.dir}", ... }`,
    );
    return;
  }

  const entry =
    `  "${n.listId}": {\n` +
    `    owner: "routes/${n.dir}",\n` +
    `    when: "a ${n.one} is created or deleted",\n` +
    `    mode: "outerHTML",\n` +
    `  },\n`;

  await Bun.write(path, source.replace(anchor, entry + anchor));
  console.log(`[new-resource] #${n.listId} registered in src/lib/oob.ts.`);
}

/**
 * Adds the import and the mount to `src/routes/index.ts`.
 *
 * Mounted through `signedIn()`, because the guard has to wrap the routes
 * before they are registered: `use("*")` written after a handler never runs.
 * A scaffold that is not registered is a scaffold nobody notices is missing.
 */
async function register(n: Names): Promise<void> {
  const path = join(ROOT, "src", "routes", "index.ts");
  const source = await Bun.file(path).text();

  if (source.includes(`./${n.dir}/${n.dir}.routes.ts`)) {
    console.log(
      `[new-resource] ${n.dir} is already registered; leaving index.ts alone.`,
    );
    return;
  }

  const importLine = `import { ${n.plural}Routes } from "./${n.dir}/${n.dir}.routes.ts";\n`;
  const mountLine = `  app.route("/${n.segment}", signedIn(${n.plural}Routes));\n`;

  const anchor = `  // --- Signed in -------------------------------------------------------------\n`;
  if (!source.includes(anchor)) {
    console.warn(
      `[new-resource] could not find the "Signed in" marker in src/routes/index.ts.\n` +
        `  Add these two lines by hand:\n\n${importLine}${mountLine}`,
    );
    return;
  }

  const lastImport = source.lastIndexOf("import { ");
  const endOfImports =
    source.indexOf("\n", source.indexOf("\n", lastImport)) + 1;

  const withImport =
    source.slice(0, endOfImports) + importLine + source.slice(endOfImports);
  const updated = withImport.replace(anchor, anchor + mountLine);

  await Bun.write(path, updated);
  console.log("[new-resource] registered in src/routes/index.ts.");
}

// --- Main --------------------------------------------------------------------

const options = parseArguments(process.argv.slice(2));
const n = names(options);
const base = join(ROOT, "src", "routes", n.dir);

/**
 * Refuses to touch a directory that already exists.
 *
 * Half-overwriting a resource leaves a tree that compiles in places and not in
 * others, and the error points at the generator rather than at what happened.
 */
try {
  const existing = await readdir(base);
  console.error(
    `\n[new-resource] src/routes/${n.dir}/ already exists (${existing.length} files). ` +
      `Nothing has been touched.\n`,
  );
  process.exit(1);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

await mkdir(base, { recursive: true });

const files: [string, string][] = [
  [`${n.dir}.schema.ts`, schemaFile(n)],
  [`${n.dir}.fragment.ts`, fragmentFile(n)],
  [`${n.dir}.page.ts`, pageFile(n)],
  [`${n.dir}.routes.ts`, routesFile(n)],
];

for (const [name, contents] of files) {
  await writeFile(join(base, name), contents, "utf8");
  console.log(`[new-resource] src/routes/${n.dir}/${name}`);
}

await register(n);
await registerOobTarget(n);

console.log(
  `\n  /${n.segment} is live behind the session guard.\n\n` +
    `  Next:\n` +
    `    1. Add the table in src/db/schema/, then replace ${n.One} in\n` +
    `       ${n.dir}.fragment.ts with the row type and list${n.Plural}() with a service.\n` +
    `    2. Add it to LINKS in src/components/layout.ts so it is reachable.\n` +
    `    3. bun run docs && bun run ok\n`,
);
