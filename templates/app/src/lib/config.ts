/**
 * Configuration, read once from the environment.
 *
 * Every value has a default that works in development, so a fresh checkout
 * runs without a `.env` at all. `validateConfig()` is what refuses to start in
 * production with those defaults still in place — the failure mode it prevents
 * is shipping with a signing key that is published in this file.
 */

const env = (name: string, fallback: string): string =>
  process.env[name] ?? fallback;

export const config = {
  environment: env("ENVIRONMENT", "local"),
  port: Number(env("PORT", "3000")),

  /** Shown in the browser tab and on the sign-in page. Set by the generator. */
  appName: env("APP_NAME", "Pleyn"),

  /** Where the app is reachable. Used to check the Origin of a mutation. */
  publicBaseUrl: env(
    "PUBLIC_BASE_URL",
    `http://localhost:${env("PORT", "3000")}`,
  ),

  databaseUrl: env(
    "DATABASE_URL",
    "postgresql://pleyn:pleyn@127.0.0.1:5432/pleyn",
  ),

  /** Signs session cookies and derives CSRF tokens. */
  secretKey: env("SECRET_KEY", "development-only-key-change-me-please-32"),

  /** `false` in development so the app works over plain HTTP on localhost. */
  cookieSecure: env("COOKIE_SECURE", "false") === "true",

  /** How long a session lasts. */
  sessionDays: Number(env("SESSION_DAYS", "14")),

  timezone: env("TZ", "UTC"),

  /**
   * The locale dates are formatted in.
   *
   * Separate from `TZ` on purpose: where the server thinks it is and what
   * language the screen is in are two different decisions.
   */
  locale: env("LOCALE", "en-GB"),
} as const;

const DEFAULT_SECRET = "development-only-key-change-me-please-32";

/**
 * Complains about anything unsafe.
 *
 * Outside production this warns and carries on, because a developer running
 * `bun run dev` should not be stopped by a missing secret. In production it
 * throws: a deployment that silently used the published default key would be
 * worse than one that refused to start.
 */
export function validateConfig(): void {
  const problems: string[] = [];

  if (config.secretKey === DEFAULT_SECRET) {
    problems.push("SECRET_KEY is the published default");
  }
  if (config.secretKey.length < 32) {
    problems.push("SECRET_KEY is shorter than 32 characters");
  }
  if (config.environment === "production" && !config.cookieSecure) {
    problems.push("COOKIE_SECURE is false in production");
  }

  if (problems.length === 0) return;

  if (config.environment === "production") {
    throw new Error(`Refusing to start:\n  - ${problems.join("\n  - ")}`);
  }

  console.warn(`[config] warnings (not fatal outside production):`);
  for (const problem of problems) console.warn(`  - ${problem}`);
}
