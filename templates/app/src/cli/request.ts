/**
 * A request against this application, performed in process.
 *
 * No listener, no port, no cookie jar: the same `app.request()` the tests use.
 * What it removes is the setup that stands between a question and its answer —
 * signing in, carrying the session, deriving the CSRF token, remembering which
 * headers htmx would have sent.
 *
 * And `--swap` answers the question this stack says actually matters. A
 * response body is not what the user ends up looking at: htmx lifts the
 * out-of-band nodes out of it, swaps them by id, and puts what remains into the
 * target. `--swap` runs that model — `htmx-contract`'s, the same one
 * `tests/tasks.test.ts` asserts through — and prints the DOM that results,
 * along with any violation of the contract it exposed.
 *
 *   bun run cli request /tasks --as demo@example.com
 *   bun run cli request POST /tasks --as demo@example.com --form title=Write
 *   bun run cli request POST /tasks --as demo@example.com --form title=Write --swap
 */

import {
  checkDocument,
  inspect,
  outerHtmlOf,
  swapAndCheck,
  type Violation,
} from "htmx-contract";

import { config } from "../lib/config.ts";
import { CSRF_HEADER } from "../lib/csrf.ts";
import { app } from "../server.ts";
import { parseArgs } from "./args.ts";
import { CliError } from "./error.ts";
import { emit, type Outcome } from "./output.ts";
import { actAs, anonymous, release, type Actor } from "./session.ts";

const USAGE =
  "bun run cli request [METHOD] <path> [--as <email>] [--form k=v] [--hx] [--swap] [--json]";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export interface RequestOptions {
  method: string;
  path: string;
  as?: string | undefined;
  hx: boolean;
  hxTarget?: string | undefined;
  hxTrigger?: string | undefined;
  form: Record<string, string>;
  jsonBody?: string | undefined;
  headers: Record<string, string>;
  swap: boolean;
  page?: string | undefined;
  target?: string | undefined;
  swapStyle?: string | undefined;
  full: boolean;
  keepSession: boolean;
}

export type Source = "flag" | "page" | "default";

export interface SwapResolution {
  /** The element on the page that would have sent this request. */
  trigger: { tag: string; id: string | null; matchedBy: string } | null;
  target: string | null;
  targetSource: Source;
  style: string;
  styleSource: Source;
}

/** A violation, and whether the response carried it or the swap created it. */
export interface LocatedViolation extends Violation {
  where: "response" | "document";
}

export interface SwapReport extends SwapResolution {
  page: string;
  swapped: boolean;
  oob: { target: string | null; mode: string }[];
  /** The target's subtree after the swap: what the interaction changed. */
  targetHtml: string | null;
  /** The whole post-swap document. Only with `--full`. */
  html?: string;
  violations: LocatedViolation[];
}

export interface RequestReport {
  ok: boolean;
  request: {
    method: string;
    path: string;
    as: string | null;
    hx: boolean;
    headers: Record<string, string>;
    body: string | null;
  };
  response: {
    status: number;
    bytes: number;
    headers: Record<string, string>;
    hxHeaders: Record<string, string>;
    body: string;
  };
  swap?: SwapReport;
}

/** `/tasks/fragment/list?show=open` → `/tasks`. The page the fragment lives on. */
export function pageFor(path: string): string {
  const [withoutQuery = "/"] = path.split("?");
  const at = withoutQuery.indexOf("/fragment/");
  if (at > 0) return withoutQuery.slice(0, at);
  const first = withoutQuery.split("/").find(Boolean);
  return first === undefined ? "/" : `/${first}`;
}

function samePath(attribute: string, path: string): boolean {
  const [a = ""] = attribute.split("?");
  const [b = ""] = path.split("?");
  return a === b;
}

/**
 * Where this request would have landed, according to the page itself.
 *
 * Precedence is explicit flag, then the triggering element's own `hx-target`
 * and `hx-swap`, then htmx's defaults — and each is reported, because a target
 * that was guessed produces a confidently wrong DOM, which is worse than being
 * told to pass `--target`.
 */
export async function resolveSwap(
  pageHtml: string,
  method: string,
  path: string,
  overrides: { target?: string | undefined; style?: string | undefined } = {},
): Promise<SwapResolution> {
  const snapshot = await inspect(pageHtml);
  const attribute = `hx-${method.toLowerCase()}`;

  const element = snapshot.elements.find((candidate) => {
    const value = candidate.attrs[attribute];
    return value !== undefined && samePath(value, path);
  });

  const fromPageTarget = element?.attrs["hx-target"];
  const fromPageStyle = element?.attrs["hx-swap"];

  return {
    trigger: element
      ? { tag: element.tag, id: element.id, matchedBy: attribute }
      : null,
    target: overrides.target ?? fromPageTarget ?? null,
    targetSource: overrides.target
      ? "flag"
      : fromPageTarget
        ? "page"
        : "default",
    style: overrides.style ?? fromPageStyle ?? "innerHTML",
    styleSource: overrides.style ? "flag" : fromPageStyle ? "page" : "default",
  };
}

function buildBody(options: RequestOptions): {
  body: string | null;
  contentType: string | null;
} {
  const hasForm = Object.keys(options.form).length > 0;

  if (hasForm && options.jsonBody !== undefined) {
    throw new CliError("--form and --json-body cannot both be given.", USAGE);
  }

  if (hasForm) {
    return {
      body: new URLSearchParams(options.form).toString(),
      contentType: "application/x-www-form-urlencoded",
    };
  }

  if (options.jsonBody !== undefined) {
    try {
      return {
        body: JSON.stringify(JSON.parse(options.jsonBody)),
        contentType: "application/json",
      };
    } catch {
      throw new CliError("--json-body is not valid JSON.");
    }
  }

  return { body: null, contentType: null };
}

function requestHeaders(
  options: RequestOptions,
  actor: Actor,
  contentType: string | null,
): Record<string, string> {
  const headers: Record<string, string> = { Cookie: actor.cookie };

  // The second CSRF barrier checks where the request claims to come from.
  if (!SAFE.has(options.method)) {
    headers.Origin = config.publicBaseUrl;
    headers[CSRF_HEADER] = actor.csrf;
  }

  if (contentType) headers["Content-Type"] = contentType;

  if (options.hx || options.swap) {
    headers["HX-Request"] = "true";
    headers["HX-Current-URL"] = new URL(
      options.page ?? pageFor(options.path),
      config.publicBaseUrl,
    ).toString();
  }
  if (options.hxTarget) headers["HX-Target"] = options.hxTarget;
  if (options.hxTrigger) headers["HX-Trigger"] = options.hxTrigger;

  return { ...headers, ...options.headers };
}

function headerRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

/** The same violations, each saying where it was found. */
function located(
  violations: readonly Violation[],
  where: LocatedViolation["where"],
): LocatedViolation[] {
  const out: LocatedViolation[] = [];
  for (const violation of violations) out.push({ ...violation, where });
  return out;
}

function fingerprint(violation: Violation): string {
  return `${violation.rule}:${violation.message}`;
}

/**
 * What the interaction did to the document, as opposed to what was already
 * wrong with it.
 *
 * The starting page is checked too, and anything it was already carrying is
 * subtracted — otherwise every swap on a page with a pre-existing problem
 * would be blamed for it, and a tool that cries wolf is a tool that gets
 * ignored.
 *
 * This is the check `swapAndCheck` cannot make on its own: it inspects the
 * response, and the failures that matter most here only exist **after** the
 * swap. A response carrying one `#task-list` is impeccable; the same response
 * swapped into a page that already has one leaves two, and htmx will swap the
 * first match for ever after.
 */
export async function violationsCreatedBy(
  pageHtml: string,
  afterHtml: string,
): Promise<Violation[]> {
  const before = new Set((await checkDocument(pageHtml)).map(fingerprint));
  return (await checkDocument(afterHtml)).filter(
    (violation) => !before.has(fingerprint(violation)),
  );
}

export async function sendRequest(
  options: RequestOptions,
): Promise<RequestReport> {
  const actor = options.as ? await actAs(options.as) : await anonymous();

  try {
    const pageUrl = options.page ?? pageFor(options.path);
    const pageHtml = options.swap
      ? await (
          await app.request(pageUrl, { headers: { Cookie: actor.cookie } })
        ).text()
      : "";

    const { body, contentType } = buildBody(options);
    const headers = requestHeaders(options, actor, contentType);

    const response = await app.request(options.path, {
      method: options.method,
      headers,
      ...(body === null ? {} : { body }),
    });

    const text = await response.text();
    const responseHeaders = headerRecord(response.headers);
    const hxHeaders = Object.fromEntries(
      Object.entries(responseHeaders).filter(([name]) =>
        name.startsWith("hx-"),
      ),
    );

    const report: RequestReport = {
      ok: response.status < 400,
      request: {
        method: options.method,
        path: options.path,
        as: actor.email,
        hx: options.hx || options.swap,
        headers: options.keepSession
          ? headers
          : { ...headers, Cookie: `${actor.cookie.split("=")[0]}=…` },
        body,
      },
      response: {
        status: response.status,
        bytes: Buffer.byteLength(text),
        headers: responseHeaders,
        hxHeaders,
        body: text,
      },
    };

    if (!options.swap) return report;

    const resolution = await resolveSwap(
      pageHtml,
      options.method,
      options.path,
      {
        target: options.target,
        style: options.swapStyle,
      },
    );

    if (resolution.target === null) {
      throw new CliError(
        `could not work out what ${options.method} ${options.path} targets on ${pageUrl}.\n` +
          "  Nothing on that page carries a matching hx-get/hx-post/hx-delete.\n" +
          "  Pass --target <selector>, or --page <url> if the interaction starts elsewhere.",
      );
    }

    const swapped = await swapAndCheck({
      page: pageHtml,
      response: text,
      headers: response.headers,
      status: response.status,
      target: resolution.target,
      swap: resolution.style,
    });

    const oob = (await inspect(text)).oob.map((node) => ({
      target: node.target,
      mode: node.mode as string,
    }));

    const created = await violationsCreatedBy(pageHtml, swapped.html);

    report.swap = {
      ...resolution,
      page: pageUrl,
      swapped: swapped.swapped,
      oob,
      targetHtml: resolution.target.startsWith("#")
        ? await outerHtmlOf(swapped.html, resolution.target)
        : null,
      ...(options.full ? { html: swapped.html } : {}),
      violations: [
        ...located(swapped.violations, "response"),
        ...located(created, "document"),
      ],
    };

    report.ok = report.ok && report.swap.violations.length === 0;
    return report;
  } finally {
    if (!options.keepSession) await release(actor);
  }
}

export function format(report: RequestReport): string {
  const lines = [
    `${report.request.method} ${report.request.path} → ${report.response.status}` +
      (report.request.as === null
        ? " (anonymous)"
        : ` as ${report.request.as}`),
  ];

  for (const [name, value] of Object.entries(report.response.hxHeaders)) {
    lines.push(`  ${name}: ${value}`);
  }

  const swap = report.swap;
  if (!swap) {
    lines.push("", report.response.body);
    if (report.response.status === 302 && report.request.as === null) {
      lines.push(
        "",
        "No session — pass --as <email> to make this request as somebody.",
      );
    }
    return lines.join("\n");
  }

  lines.push(
    "",
    `Swapped into ${swap.target} (${swap.targetSource}) with ${swap.style} (${swap.styleSource}), from ${swap.page}`,
  );
  if (swap.trigger) {
    lines.push(
      `  triggered by <${swap.trigger.tag}${swap.trigger.id ? ` id="${swap.trigger.id}"` : ""}> via ${swap.trigger.matchedBy}`,
    );
  }
  for (const node of swap.oob) {
    lines.push(`  out of band → ${node.target} (${node.mode})`);
  }

  lines.push(
    "",
    swap.violations.length === 0
      ? "Contract: no violations."
      : `Contract: ${swap.violations.length} violation(s)`,
  );
  for (const violation of swap.violations) {
    const where =
      violation.where === "document"
        ? " (after the swap)"
        : " (in the response)";
    lines.push(`  [${violation.rule}]${where} ${violation.message}`);
  }

  lines.push("", swap.html ?? swap.targetHtml ?? report.response.body);
  return lines.join("\n");
}

export async function run(argv: readonly string[]): Promise<Outcome> {
  const args = parseArgs(argv, {
    booleans: ["json", "hx", "swap", "full", "keep-session"],
    values: [
      "as",
      "form",
      "json-body",
      "header",
      "page",
      "target",
      "swap-style",
      "hx-target",
      "hx-trigger",
    ],
  });

  const [first, second] = args.positional;
  if (first === undefined) throw new CliError("a path is required.", USAGE);

  const method = second === undefined ? "GET" : first.toUpperCase();
  const path = second ?? first;

  if (!path.startsWith("/")) {
    throw new CliError(`a path starts with "/", not "${path}".`, USAGE);
  }

  const report = await sendRequest({
    method,
    path,
    as: args.flag("as"),
    hx: args.bool("hx"),
    hxTarget: args.flag("hx-target"),
    hxTrigger: args.flag("hx-trigger"),
    form: args.pairs("form"),
    jsonBody: args.flag("json-body"),
    headers: args.pairs("header"),
    swap: args.bool("swap"),
    page: args.flag("page"),
    target: args.flag("target"),
    swapStyle: args.flag("swap-style"),
    full: args.bool("full"),
    keepSession: args.bool("keep-session"),
  });

  return emit(
    args.bool("json"),
    report,
    () => format(report),
    report.ok ? 0 : 1,
  );
}
