/**
 * The one error the CLI raises on purpose.
 *
 * A command that refuses because it was called wrongly is not the same thing
 * as a command that crashed, and the difference has to survive the trip to the
 * shell: whoever is reading — person or agent — needs the usage line, not a
 * stack trace, and the exit code has to say "you asked for something
 * impossible" rather than "this is broken".
 */
export class CliError extends Error {
  constructor(
    message: string,
    /** The usage line, when knowing the shape of the command is the fix. */
    readonly usage?: string,
  ) {
    super(message);
    this.name = "CliError";
  }
}
