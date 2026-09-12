/**
 * Copies `templates/app/` into `packages/create-pleyn/template/`.
 *
 * The template has to live inside the published package — npm ships one
 * directory, and a `files` entry pointing outside it is silently dropped. But
 * keeping two copies in the repository means keeping them in step by hand, and
 * that never survives.
 *
 * So there is one copy, at `templates/app/`, where it is a workspace member and
 * its own CI runs against it. This script makes the other one at pack time, and
 * `prepack` runs it. `template/` is gitignored for the same reason.
 */

import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const FROM = join(ROOT, "templates", "app");
const TO = join(ROOT, "packages", "create-pleyn", "template");

/** Build output and local state. The same list `index.ts` skips when copying. */
const SKIP = new Set(["node_modules", ".git", "bun.lock", ".env", "dist"]);

await rm(TO, { recursive: true, force: true });
await mkdir(TO, { recursive: true });

let count = 0;
for (const entry of await readdir(FROM, { withFileTypes: true })) {
  if (SKIP.has(entry.name)) continue;
  await cp(join(FROM, entry.name), join(TO, entry.name), { recursive: true });
  count += 1;
}

console.log(`[bundle-template] ${count} entries copied into packages/create-pleyn/template/`);
