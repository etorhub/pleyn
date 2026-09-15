/**
 * The checks, one after another, saying which one failed.
 *
 * This used to be a chain of five `&&` inside `package.json`. When it broke,
 * what came out was the raw output of whichever tool had failed — sometimes a
 * hundred lines of `tsc` — with nothing saying **which** of the five it was or
 * what to do. Whoever already knows does not need it; whoever does not is
 * exactly who is reading it.
 *
 * Here each step carries its name and how to fix it, and the end says so in
 * one line. No magic: the same chain, with labels.
 *
 * `--json` prints the same facts as one record — the step, whether it passed,
 * its fix and its output — for whoever is reading this with a program rather
 * than with their eyes. The human form is untouched by that flag, because it is
 * the one everybody already knows, and the exit code is the same either way: a
 * contract that changed with the output format would be a trap.
 */

interface Step {
  name: string;
  command: string[];
  /** What whoever sees it red has to do. */
  fix: string;
}

export const STEPS: Step[] = [
  {
    name: "types",
    command: ["bun", "run", "typecheck"],
    fix: "Fix what `tsc` reports. Do not reach for `any` or `!`.",
  },
  {
    name: "lint",
    command: ["bun", "run", "lint"],
    fix: "Fix what oxlint reports.",
  },
  {
    name: "format",
    command: ["bun", "run", "format:check"],
    fix: "Run `bun run format`. Nothing needs fixing by hand.",
  },
  {
    name: "docs",
    command: ["bun", "run", "docs:check"],
    fix: "Run `bun run docs`. The generated tables are not edited by hand.",
  },
];

export interface StepResult {
  step: string;
  ok: boolean;
  fix: string;
  /** stdout then stderr. Empty unless `--json` asked for it to be captured. */
  output: string;
  durationMs: number;
}

export interface CheckReport {
  ok: boolean;
  durationMs: number;
  failed: string[];
  steps: StepResult[];
}

export function summarize(
  results: readonly StepResult[],
  durationMs: number,
): CheckReport {
  const failed = results.filter((result) => !result.ok).map((r) => r.step);
  return { ok: failed.length === 0, durationMs, failed, steps: [...results] };
}

async function runStep(step: Step, capture: boolean): Promise<StepResult> {
  const started = Date.now();

  const proc = Bun.spawn(step.command, {
    stdout: capture ? "pipe" : "inherit",
    stderr: capture ? "pipe" : "inherit",
  });

  // Two pipes cannot be interleaved into one stream, so they are concatenated
  // in a fixed order and the field says so rather than implying a transcript.
  const [out, err, code] = await Promise.all([
    capture ? new Response(proc.stdout).text() : Promise.resolve(""),
    capture ? new Response(proc.stderr).text() : Promise.resolve(""),
    proc.exited,
  ]);

  return {
    step: step.name,
    ok: code === 0,
    fix: step.fix,
    output: `${out}${err}`,
    durationMs: Date.now() - started,
  };
}

async function main(): Promise<void> {
  const json = process.argv.includes("--json");
  const started = Date.now();
  const results: StepResult[] = [];

  // One at a time, on purpose: run in parallel and four tools interleave their
  // output, and the first failure is the one you cannot find.
  for (const step of STEPS) {
    results.push(await runStep(step, json));
  }

  const report = summarize(results, Date.now() - started);

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exit(1);
    return;
  }

  if (report.ok) {
    console.log("\n[check] all clean.");
    return;
  }

  console.error(`\n[check] failed: ${report.failed.join(", ")}\n`);
  for (const result of report.steps.filter((r) => !r.ok)) {
    console.error(`  ${result.step}: ${result.fix}`);
  }
  console.error("");
  process.exit(1);
}

if (import.meta.main) await main();
