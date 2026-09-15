// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { unified } from "@astrojs/markdown-remark";

import createPleynPkg from "../../packages/create-pleyn/package.json";

const versionLabel = `v${createPleynPkg.version}`;
const base = "/pleyn";

// Docs versioning follows create-pleyn's semver. Versions are generated into
// src/generated/versions.md. Enable `starlight-versions` when cutting the first
// archived release (the plugin requires ≥1 archive). See contributing/docs.md.

/**
 * The slice of a hast node this plugin touches. Not importing `hast`'s own
 * types: it is a transitive dependency here, not a declared one.
 * @typedef {{
 *   type: string;
 *   tagName?: string;
 *   properties?: { href?: unknown };
 *   children?: HastNode[];
 * }} HastNode
 */

/**
 * Prefixes root-absolute links written in Markdown prose with `base`.
 *
 * Starlight prefixes the links *it* generates (sidebar, pagination,
 * breadcrumbs) with `base` automatically. A plain Markdown link written as
 * `[x](/htmx-contract/api/)` is not one of those — it is an `<a>` the
 * Markdown renderer emitted as-is, and without this it 404s under
 * `/pleyn/`. One rehype pass fixes every such link, present and future,
 * instead of every page author having to remember the prefix by hand.
 */
function rehypeBaseLinks() {
  /** @param {HastNode} tree */
  return (tree) => {
    /** @param {HastNode} node */
    function visit(node) {
      if (
        node.type === "element" &&
        node.tagName === "a" &&
        typeof node.properties?.href === "string"
      ) {
        const href = node.properties.href;
        const alreadyPrefixed = href === base || href.startsWith(`${base}/`);
        if (href.startsWith("/") && !href.startsWith("//") && !alreadyPrefixed) {
          node.properties.href = base + href;
        }
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://etorhub.github.io",
  base,
  markdown: {
    // Astro 7's default processor (Sätteri) doesn't run rehype plugins; the
    // legacy `unified` one from `@astrojs/markdown-remark` does.
    processor: unified({ rehypePlugins: [rehypeBaseLinks] }),
  },
  integrations: [
    starlight({
      title: "PLEYN",
      description: `An opinionated hypermedia stack (${versionLabel}): Bun, Hono, htmx, Drizzle, PostgreSQL — with the HTML↔DOM seam checked.`,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/etorhub/pleyn",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/etorhub/pleyn/edit/main/apps/docs/",
      },
      defaultLocale: "en",
      sidebar: [
        {
          label: "Getting started",
          items: [
            { label: "Introduction", slug: "index" },
            { label: "Install & create", slug: "getting-started/install" },
            { label: "Why PLEYN", slug: "getting-started/why" },
            { label: "Project layout", slug: "getting-started/layout" },
          ],
        },
        {
          label: "CLI",
          items: [
            { label: "Overview", slug: "cli/overview" },
            { label: "Flags", slug: "cli/flags" },
            { label: "Failures & requirements", slug: "cli/failures" },
          ],
        },
        {
          label: "The application",
          items: [
            { label: "Conventions", slug: "application/conventions" },
            { label: "Scripts", slug: "application/scripts" },
            { label: "new-resource", slug: "application/new-resource" },
            { label: "App CLI", slug: "application/cli" },
            { label: "Auth, sessions, CSRF", slug: "application/auth" },
            { label: "Database & Drizzle", slug: "application/database" },
            { label: "CSS & Tailwind", slug: "application/css" },
            { label: "Testing", slug: "application/testing" },
            { label: "Docker", slug: "application/docker" },
            { label: "Generated reference.md", slug: "application/generated-docs" },
          ],
        },
        {
          label: "htmx-contract",
          items: [
            { label: "Install", slug: "htmx-contract/install" },
            { label: "Usage", slug: "htmx-contract/usage" },
            { label: "Rules overview", slug: "htmx-contract/rules" },
            {
              label: "Rules",
              collapsed: true,
              items: [
                { label: "empty-after-oob", slug: "htmx-contract/rules/empty-after-oob" },
                { label: "duplicate-id", slug: "htmx-contract/rules/duplicate-id" },
                {
                  label: "duplicate-field-in-form",
                  slug: "htmx-contract/rules/duplicate-field-in-form",
                },
                {
                  label: "target-identity-lost",
                  slug: "htmx-contract/rules/target-identity-lost",
                },
                { label: "unbounded-poll", slug: "htmx-contract/rules/unbounded-poll" },
                { label: "dead-target", slug: "htmx-contract/rules/dead-target" },
                { label: "dead-oob", slug: "htmx-contract/rules/dead-oob" },
              ],
            },
            { label: "API reference", slug: "htmx-contract/api" },
            { label: "Swap model & limits", slug: "htmx-contract/model" },
            { label: "Fixtures & poll", slug: "htmx-contract/fixtures" },
          ],
        },
        {
          label: "Recipes",
          items: [
            { label: "Toast-only mutation", slug: "recipes/toast-only" },
            { label: "Filter + pushUrl", slug: "recipes/filter-pushurl" },
            { label: "Bounded poll", slug: "recipes/bounded-poll" },
            { label: "Delete last row", slug: "recipes/delete-last-row" },
            { label: "Per-row controls", slug: "recipes/per-row-controls" },
          ],
        },
        {
          label: "Status",
          items: [
            { label: "Roadmap", slug: "status/roadmap" },
            { label: "Pitfalls", slug: "status/pitfalls" },
          ],
        },
        {
          label: "Contributing",
          items: [
            { label: "Monorepo", slug: "contributing/monorepo" },
            { label: "no-leaks", slug: "contributing/no-leaks" },
            { label: "Template bundling", slug: "contributing/bundling" },
            { label: "Publishing", slug: "contributing/publishing" },
            { label: "Docs sync & versions", slug: "contributing/docs" },
          ],
        },
        {
          label: "Meta",
          items: [
            { label: "Licence", slug: "meta/licence" },
            { label: "Security", slug: "meta/security" },
            { label: "Support", slug: "meta/support" },
          ],
        },
      ],
    }),
  ],
});
