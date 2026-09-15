/**
 * Is this checkout able to run, and if not, what is the command that fixes it.
 *
 * Everything here is a question somebody answers anyway, badly, after a
 * confusing failure: the tests cannot reach Postgres, the page has no styles,
 * the schema is a migration behind. Each of those arrives as a raw error from
 * whichever library noticed first, and none of them arrives with the one line
 * that ends it.
 *
 * So the checks carry their own fix, in the voice `scripts/check.ts` uses, and
 * the exit code says whose problem it is:
 *
 *   0  nothing to do
 *   1  this project's, and fixable here
 *   2  the environment's — Postgres is down, the configuration is refused
 *
 * Two traps are handled on purpose. The probe opens **its own** connection with
 * a three-second bound, because the application pool waits ten and doctor is
 * precisely the thing you run when nothing is answering. And the migrations are
 * read through drizzle's own reader, against an absolute path, because
 * `src/db/migrate.ts` resolves `./drizzle` from the working directory — so a
 * doctor that repeated that trick would disagree with `bun run db:apply` from
 * anywhere but the project root.
 */

import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { readMigrationFiles } from "drizzle-orm/migrator";
import postgres from "postgres";

import { config, configProblems } from "../lib/config.ts";
import { parseArgs } from "./args.ts";
import { emit, type Outcome } from "./output.ts";

const ROOT = resolve(import.meta.dir, "..", "..");

export type CheckStatus = "ok" | "warn" | "fail" | "skipped";
export type Severity = "project" | "environment";

export interface CheckRecord {
  name: string;
  status: CheckStatus;
  detail: string;
  fix?: string;
  severity?: Severity;
}

export interface DoctorReport {
  ok: boolean;
  exit: number;
  checks: CheckRecord[];
}

export interface DatabaseState {
  reachable: boolean;
  /** Why not, when it is not. */
  error: string | null;
  /** `created_at` of the last applied migration, or null when none are. */
  appliedAt: number | null;
}

/**
 * One connection, its own timeout, closed whatever happens.
 *
 * Exported because the interesting case — nothing listening — is testable
 * against a port nothing listens on, deterministically and in milliseconds.
 */
export async function inspectDatabase(
  databaseUrl: string,
  connectSeconds = 3,
): Promise<DatabaseState> {
  const client = postgres(databaseUrl, {
    max: 1,
    connect_timeout: connectSeconds,
    onnotice: () => {},
  });

  try {
    const rows = await client<{ created_at: string }[]>`
      select created_at from drizzle.__drizzle_migrations
      order by created_at desc limit 1
    `.catch(async (error: unknown) => {
      // The table is created by the first migration. Not having it yet is an
      // answer ("none applied"), not a failure to reach the database — but
      // only once the connection itself has been shown to work.
      await client`select 1`;
      if (error instanceof Error && error.message.includes("does not exist")) {
        return [] as { created_at: string }[];
      }
      throw error;
    });

    return {
      reachable: true,
      error: null,
      appliedAt: rows[0] ? Number(rows[0].created_at) : null,
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
      appliedAt: null,
    };
  } finally {
    await client.end({ timeout: 1 });
  }
}

/**
 * Drizzle's rule, not a second opinion on it.
 *
 * `drizzle-orm`'s migrator applies a migration when the last recorded
 * `created_at` is older than the folder's `when`. Anything else here would let
 * doctor and `bun run db:apply` disagree, which is worse than doctor not
 * existing.
 */
export function pendingMigrations(
  files: readonly { folderMillis: number; hash: string }[],
  appliedAt: number | null,
): { folderMillis: number; hash: string }[] {
  return files.filter(
    (file) => appliedAt === null || appliedAt < file.folderMillis,
  );
}

/** Built from source, or older than it. */
export function stylesheetStatus(
  sourceMs: number,
  builtMs: number | null,
): CheckStatus {
  if (builtMs === null) return "fail";
  return builtMs >= sourceMs ? "ok" : "fail";
}

async function modifiedAt(path: string): Promise<number | null> {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return null;
  }
}

async function portInUse(port: number): Promise<boolean> {
  try {
    const socket = await Bun.connect({
      hostname: "127.0.0.1",
      port,
      socket: { data: () => {} },
    });
    socket.end();
    return true;
  } catch {
    return false;
  }
}

function severityExit(checks: readonly CheckRecord[]): number {
  let exit = 0;
  for (const check of checks) {
    if (check.status !== "fail") continue;
    exit = Math.max(exit, check.severity === "environment" ? 2 : 1);
  }
  return exit;
}

export async function diagnose(
  databaseUrl = config.databaseUrl,
): Promise<DoctorReport> {
  const checks: CheckRecord[] = [];

  // --- Where you are ---------------------------------------------------------
  // First, because it is the condition that makes the other fixes fail too:
  // `db:apply` resolves `./drizzle` against the working directory.
  const atRoot = process.cwd() === ROOT;
  checks.push({
    name: "cwd",
    status: atRoot ? "ok" : "fail",
    severity: "project",
    detail: atRoot ? ROOT : `${process.cwd()} — the project is at ${ROOT}`,
    ...(atRoot
      ? {}
      : {
          fix: `Run from ${ROOT}. db:apply resolves ./drizzle against the working directory.`,
        }),
  });

  // --- Configuration ---------------------------------------------------------
  const problems = configProblems();
  const production = config.environment === "production";
  checks.push({
    name: "config",
    status: problems.length === 0 ? "ok" : production ? "fail" : "warn",
    severity: "environment",
    detail:
      problems.length === 0
        ? `${config.environment}, SECRET_KEY set`
        : problems.join("; "),
    ...(problems.length === 0
      ? {}
      : { fix: "Set SECRET_KEY in .env: openssl rand -base64 32" }),
  });

  // --- Postgres --------------------------------------------------------------
  const database = await inspectDatabase(databaseUrl);
  checks.push({
    name: "database",
    status: database.reachable ? "ok" : "fail",
    severity: "environment",
    detail: database.reachable
      ? databaseUrl.replace(/:\/\/[^@]*@/, "://…@")
      : (database.error ?? "unreachable"),
    ...(database.reachable ? {} : { fix: "bun run db:up" }),
  });

  // --- Migrations ------------------------------------------------------------
  if (!database.reachable) {
    checks.push({
      name: "migrations",
      status: "skipped",
      detail: "the database is unreachable",
    });
  } else {
    try {
      const files = readMigrationFiles({
        migrationsFolder: join(ROOT, "drizzle"),
      });
      const pending = pendingMigrations(files, database.appliedAt);
      checks.push({
        name: "migrations",
        status: pending.length === 0 ? "ok" : "fail",
        severity: "project",
        detail:
          pending.length === 0
            ? `${files.length} applied`
            : `${pending.length} of ${files.length} pending`,
        ...(pending.length === 0 ? {} : { fix: "bun run db:apply" }),
      });
    } catch (error) {
      checks.push({
        name: "migrations",
        status: "fail",
        severity: "project",
        detail: error instanceof Error ? error.message : String(error),
        fix: "bun run db:generate",
      });
    }
  }

  // --- Stylesheet ------------------------------------------------------------
  const sourceMs = await modifiedAt(join(ROOT, "src", "styles", "app.css"));
  const builtMs = await modifiedAt(join(ROOT, "public", "app.css"));
  const stylesheet =
    sourceMs === null ? "ok" : stylesheetStatus(sourceMs, builtMs);
  checks.push({
    name: "stylesheet",
    status: stylesheet,
    severity: "project",
    detail:
      stylesheet === "ok"
        ? "public/app.css is current"
        : builtMs === null
          ? "public/app.css does not exist"
          : "public/app.css is older than src/styles/app.css",
    ...(stylesheet === "ok" ? {} : { fix: "bun run css" }),
  });

  // --- The port --------------------------------------------------------------
  // Never a failure: something listening is usually `bun run dev`, which is
  // what you wanted. It is here because "address in use" two minutes later is
  // not obviously the same fact.
  const busy = await portInUse(config.port);
  checks.push({
    name: "port",
    status: "ok",
    detail: busy
      ? `${config.port} is in use — a server is already running`
      : `${config.port} is free`,
  });

  const exit = severityExit(checks);
  return { ok: exit === 0, exit, checks };
}

const MARK: Record<CheckStatus, string> = {
  ok: "ok  ",
  warn: "warn",
  fail: "FAIL",
  skipped: "--  ",
};

export function format(report: DoctorReport): string {
  const lines = report.checks.map(
    (check) => `${MARK[check.status]}  ${check.name.padEnd(11)}${check.detail}`,
  );

  const failed = report.checks.filter((check) => check.status === "fail");
  if (failed.length === 0) {
    lines.push("", "[doctor] nothing to fix.");
    return lines.join("\n");
  }

  lines.push(
    "",
    `[doctor] problems: ${failed.map((c) => c.name).join(", ")}`,
    "",
  );
  for (const check of failed) {
    lines.push(`  ${check.name}: ${check.fix ?? "—"}`);
  }
  return lines.join("\n");
}

export async function run(argv: readonly string[]): Promise<Outcome> {
  const args = parseArgs(argv, { booleans: ["json"] });
  const report = await diagnose();
  return emit(args.bool("json"), report, () => format(report), report.exit);
}
