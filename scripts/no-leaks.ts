/**
 * Nothing from the application this stack was extracted from may reach the
 * public tree.
 *
 * The library began inside a private accounting application, and carried 52
 * traces of it — ids and copy in another language, commit hashes nobody outside
 * can look up, comments explaining rules in terms of incidents in a codebase
 * you cannot read. All of that is gone. This is what stops it coming back a
 * paste at a time.
 *
 * A rule nobody enforces drifts, which is the same argument that made the
 * documentation generated rather than written. Cheap to run, so it runs in CI.
 */

import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

/** Terms from the origin application. Matched case-insensitively, as words. */
const BANNED = [
  "comptabilitat",
  "moviment",
  "etiqueta",
  "espai",
  "feina",
  "connexio",
  "categoria",
  "e5dd962",
  "f5b8e9b",
  "da64cb1",
  "f80df91",
];

const SKIP_DIRS = new Set([".git", "node_modules", "dist", ".next", "coverage", ".astro"]);
const TEXT = /\.(ts|tsx|js|json|md|yml|yaml|css|html|sql|toml)$/;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (TEXT.test(entry.name)) yield path;
  }
}

const pattern = new RegExp(`\\b(${BANNED.join("|")})`, "i");
const hits: string[] = [];

for await (const path of walk(ROOT)) {
  // This file names the terms in order to ban them.
  if (path === import.meta.path) continue;

  const lines = (await Bun.file(path).text()).split("\n");
  lines.forEach((line, i) => {
    if (pattern.test(line)) {
      hits.push(`${path.replace(`${ROOT}/`, "")}:${i + 1}  ${line.trim().slice(0, 90)}`);
    }
  });
}

if (hits.length > 0) {
  console.error(`\n[no-leaks] ${hits.length} reference(s) to the origin application:\n`);
  for (const hit of hits) console.error(`  ${hit}`);
  console.error(
    "\nThese must not reach the public tree. Say what the code does, not where\n" +
      "it came from.\n",
  );
  process.exit(1);
}

console.log("[no-leaks] clean.");
