/**
 * CLI flags for `create-pleyn`.
 *
 * Single source of truth: `--help` prints these, and `apps/docs` syncs them into
 * the documentation. Add a flag here first, then teach `parseArguments` about it.
 */

export interface CliFlag {
  /** The long form, including the leading dashes. */
  flag: string;
  /** One-line description, shown in `--help` and the docs. */
  description: string;
}

export const CLI_FLAGS: readonly CliFlag[] = [
  {
    flag: "--no-docker",
    description: "do not start Postgres; use DATABASE_URL as it stands",
  },
  {
    flag: "--no-install",
    description: "do not run bun install",
  },
  {
    flag: "--no-git",
    description: "do not create a git repository",
  },
];
