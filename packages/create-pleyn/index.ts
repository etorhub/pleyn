#!/usr/bin/env bun
/**
 * `bun create pleyn my-app`
 *
 * The point of this file is that there is no step after it. It copies the
 * template, writes a real `.env` with a real key, installs, starts Postgres,
 * waits for it, migrates, seeds, builds the stylesheet — and then the thing
 * runs. A scaffolder that leaves you with a README of six more commands has
 * moved the work, not done it.
 *
 * Two rules it holds to:
 *
 * **Loud.** Every step announces itself, and every failure says which step
 * failed, what the command was, and how to carry on from there by hand.
 *
 * **Never a half-built project.** If a step after the copy fails, the files
 * stay: they are yours, they are fine, and the message says which command to
 * re-run. The directory is only removed when the failure happened while
 * writing it, because then what is there is nobody's.
 */

import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { CLI_FLAGS } from "./flags.ts";

export { CLI_FLAGS, type CliFlag } from "./flags.ts";

// --- Output ------------------------------------------------------------------

const ESC = String.fromCodePoint(27);
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RED = `${ESC}[31m`;
const GREEN = `${ESC}[32m`;
const OFF = `${ESC}[0m`;

let stepNumber = 0;
function step(what: string): void {
  stepNumber += 1;
  console.log(`${BOLD}[${stepNumber}]${OFF} ${what}`);
}

function note(what: string): void {
  console.log(`    ${DIM}${what}${OFF}`);
}

function die(message: string, recovery: string[] = []): never {
  console.error(`\n${RED}${BOLD}create-pleyn:${OFF} ${message}\n`);
  if (recovery.length > 0) {
    console.error("  To carry on by hand:\n");
    for (const line of recovery) console.error(`    ${line}`);
    console.error("");
  }
  process.exit(1);
}

// --- Arguments ---------------------------------------------------------------

interface Options {
  directory: string;
  name: string;
  /** Provision Postgres with Docker. Off with `--no-docker`. */
  docker: boolean;
  install: boolean;
  git: boolean;
}

function usage(): never {
  const flagLines = CLI_FLAGS.map((f) => {
    const pad = " ".repeat(Math.max(2, 16 - f.flag.length));
    return `    ${f.flag}${pad}${f.description}\n`;
  }).join("");
  console.log(`\n  ${BOLD}bun create pleyn${OFF} <directory> [options]\n\n${flagLines}`);
  process.exit(0);
}

/** A name npm and Postgres will both accept. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function parseArguments(argv: string[]): Options {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) usage();

  const target = argv.find((a) => !a.startsWith("--"));
  if (target === undefined) usage();

  const name = slugify(target.split("/").filter(Boolean).at(-1) ?? "");
  if (name === "") {
    die(
      `"${target}" does not give a usable project name.\n` +
        "  It becomes an npm package name and a Postgres database name, so it needs\n" +
        "  at least one letter or digit.",
    );
  }

  return {
    directory: isAbsolute(target) ? target : resolve(process.cwd(), target),
    name,
    docker: !argv.includes("--no-docker"),
    install: !argv.includes("--no-install"),
    git: !argv.includes("--no-git"),
  };
}

// --- Running things ----------------------------------------------------------

interface RunResult {
  ok: boolean;
  output: string;
}

/**
 * Runs a command, capturing its output.
 *
 * Captured rather than inherited so that a failure can print the output *after*
 * saying which step failed. Inherited, a stack trace from `bun install` scrolls
 * the one useful line off the screen.
 */
async function run(command: string[], cwd: string): Promise<RunResult> {
  const proc = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const [out, error, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { ok: code === 0, output: `${out}${error}`.trim() };
}

async function mustRun(
  command: string[],
  cwd: string,
  what: string,
  recovery: string[],
): Promise<void> {
  const { ok, output } = await run(command, cwd);
  if (ok) return;
  if (output) console.error(`\n${output}\n`);
  die(`${what} failed: \`${command.join(" ")}\``, recovery);
}

/** What the seed creates. Printed only when the seed actually ran. */
const DEMO = "demo@example.com / pleyn-demo-password";

function have(command: string): boolean {
  return Bun.which(command) !== null;
}

// --- The template ------------------------------------------------------------

/**
 * Where the template lives.
 *
 * `./template` when this package is installed from npm, and
 * `../../templates/app` when running from a checkout of the repository. Both
 * are checked, so the same file works in development and in anger.
 */
function templateDirectory(): string {
  const here = dirname(Bun.fileURLToPath(import.meta.url));
  const candidates = [join(here, "template"), resolve(here, "..", "..", "templates", "app")];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "package.json"))) return candidate;
  }
  return die(
    "the application template is missing from this package.\n" +
      `  Looked in:\n    ${candidates.join("\n    ")}`,
  );
}

/**
 * What never travels into a generated project.
 *
 * `bun.lock` most of all: the one in the repository pins `htmx-contract` to the
 * workspace copy, and carrying it over would make a fresh project try to
 * resolve a path that does not exist on the user's disk.
 */
const SKIP = new Set(["node_modules", ".git", "bun.lock", ".env", "dist"]);

async function copyTemplate(from: string, to: string): Promise<void> {
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    await cp(join(from, entry.name), join(to, entry.name), { recursive: true });
  }
}

/** Replaces the placeholder wherever it appears in a file. */
async function substitute(path: string, name: string): Promise<void> {
  const file = Bun.file(path);
  if (!(await file.exists())) return;
  const text = await file.text();
  if (!text.includes("__PROJECT_NAME__")) return;
  await Bun.write(path, text.replaceAll("__PROJECT_NAME__", name));
}

// --- Postgres ----------------------------------------------------------------

/**
 * Waits for the database to answer, not merely for the container to exist.
 *
 * `docker compose up -d` returns as soon as the container has started, which is
 * several seconds before Postgres accepts a connection. Migrating in that gap
 * fails with a connection error that looks like a configuration problem and is
 * not one — so this polls the readiness check instead of sleeping and hoping.
 */
async function waitForPostgres(cwd: string, seconds = 60): Promise<boolean> {
  const deadline = Date.now() + seconds * 1000;
  let reported = false;

  while (Date.now() < deadline) {
    const { ok } = await run(["docker", "compose", "exec", "-T", "db", "pg_isready"], cwd);
    if (ok) return true;
    if (!reported) {
      note("waiting for Postgres to accept connections...");
      reported = true;
    }
    await Bun.sleep(1000);
  }
  return false;
}

// --- Main --------------------------------------------------------------------

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const template = templateDirectory();

  console.log(`\n${BOLD}Creating ${options.name}${OFF} in ${options.directory}\n`);

  // An existing directory with anything in it is left alone. Merging a template
  // into somebody's work is not a thing to do on a guess.
  if (existsSync(options.directory)) {
    const existing = await readdir(options.directory);
    if (existing.length > 0) {
      die(`${options.directory} already exists and is not empty. Nothing has been touched.`);
    }
  }

  // --- Copy ------------------------------------------------------------------
  step("Copying the template");
  try {
    await copyTemplate(template, options.directory);
  } catch (error) {
    // The only point at which cleaning up is right: what is on disk is a
    // half-written copy that belongs to nobody.
    await rm(options.directory, { recursive: true, force: true });
    throw error;
  }

  for (const file of ["package.json", "README.md", ".env.example", "AGENTS.md"]) {
    await substitute(join(options.directory, file), options.name);
  }

  // --- Configure -------------------------------------------------------------
  step("Writing .env");

  const secret = randomBytes(32).toString("base64");
  const databaseUrl = `postgresql://${options.name}:${options.name}@127.0.0.1:5432/${options.name}`;

  await writeFile(
    join(options.directory, ".env"),
    "# Generated by create-pleyn. Not committed: see .gitignore.\n" +
      `APP_NAME=${options.name}\n` +
      `DATABASE_URL=${databaseUrl}\n` +
      `SECRET_KEY=${secret}\n` +
      "PORT=3000\n" +
      "ENVIRONMENT=local\n" +
      "PUBLIC_BASE_URL=http://localhost:3000\n" +
      "COOKIE_SECURE=false\n" +
      "SESSION_DAYS=14\n" +
      "TZ=UTC\n" +
      "LOCALE=en-GB\n",
    "utf8",
  );
  note("SECRET_KEY generated; the application refuses to start in production without one");

  // The compose file ships with the template's own names. They become this
  // project's, so two generated applications do not fight over one database.
  const composePath = join(options.directory, "docker-compose.yml");
  const compose = await Bun.file(composePath).text();
  await Bun.write(composePath, compose.replaceAll("pleyn", options.name));

  // --- Install ---------------------------------------------------------------
  if (options.install) {
    step("Installing dependencies");
    await mustRun(["bun", "install"], options.directory, "the install", [
      `cd ${options.name}`,
      "bun install",
    ]);
  } else {
    note("skipping the install (--no-install)");
  }

  // --- Database --------------------------------------------------------------
  let databaseReady = false;

  if (!options.docker) {
    note("skipping Postgres (--no-docker); DATABASE_URL in .env is used as it stands");
    databaseReady = true;
  } else if (have("docker")) {
    step("Starting Postgres");
    const { ok, output } = await run(["docker", "compose", "up", "-d"], options.directory);
    if (!ok) {
      if (output) console.error(`\n${output}\n`);
      note("Postgres did not start. The project itself is fine; finish it with:");
      note("  bun run db:up && bun run db:apply && bun run cli seed");
    } else if (await waitForPostgres(options.directory)) {
      databaseReady = true;
      note("Postgres is accepting connections");
    } else {
      note("Postgres started but never became ready. Finish it with:");
      note("  bun run db:apply && bun run cli seed");
    }
  } else {
    step("Starting Postgres");
    note("docker was not found on PATH, so Postgres has not been started.");
    note("Point DATABASE_URL in .env at a Postgres you have, then:");
    note("  bun run db:apply && bun run cli seed");
  }

  // --- Migrate and seed ------------------------------------------------------
  let seeded = false;

  if (databaseReady && options.install) {
    step("Applying migrations");
    await mustRun(["bun", "run", "db:apply"], options.directory, "the migration", [
      `cd ${options.name}`,
      "bun run db:apply",
    ]);

    step("Seeding the demo account");
    const result = await run(["bun", "run", "cli", "seed"], options.directory);
    seeded = result.ok;
    note(
      result.ok
        ? (result.output.split("\n").at(-1) ?? "seeded")
        : "the seed did not run; `bun run cli seed` will do it",
    );
  }

  // --- Stylesheet ------------------------------------------------------------
  if (options.install) {
    step("Building the stylesheet");
    const css = await run(["bun", "run", "css"], options.directory);
    if (!css.ok) note("the stylesheet did not build; `bun run css` will do it");
  }

  // --- Git -------------------------------------------------------------------
  if (options.git && have("git") && !existsSync(join(options.directory, ".git"))) {
    step("Creating the git repository");
    const init = await run(["git", "init", "-q"], options.directory);
    if (init.ok) {
      await run(["git", "add", "-A"], options.directory);
      await run(
        ["git", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "Initial commit"],
        options.directory,
      );
    }
  }

  // --- Done ------------------------------------------------------------------
  //
  // What this prints depends on what actually ran. Telling somebody to sign in
  // with the demo account after skipping the install and the migrations would
  // be the scaffolder's version of a test that passes without asserting.
  const ready = seeded;
  const remaining: string[] = [];
  if (!options.install) remaining.push("bun install");
  if (!databaseReady) remaining.push("bun run db:up");
  if (!seeded) remaining.push("bun run db:apply", "bun run cli seed", "bun run css");

  console.log(
    `\n${GREEN}${BOLD}${ready ? "Done." : "Copied."}${OFF}\n\n  cd ${options.name}\n` +
      (remaining.length > 0 ? `${remaining.map((r) => `  ${r}\n`).join("")}` : "") +
      `  bun run dev${DIM}        http://localhost:3000${OFF}\n\n` +
      (ready ? `  Sign in:   ${DEMO}\n` : "") +
      "  Check it:  bun run ok\n" +
      "  Read:      AGENTS.md - the rules, and why each one exists\n",
  );
}

await main();
