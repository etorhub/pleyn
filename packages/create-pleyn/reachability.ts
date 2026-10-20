/**
 * Host/port reachability for DATABASE_URL — not auth, not “is this Postgres”.
 * Enough to refuse migrate/seed when nothing is listening.
 */

import { connect } from "node:net";

export function parseDatabaseHostPort(url: string): { host: string; port: number } {
  const parsed = new URL(url);
  const port = parsed.port === "" ? 5432 : Number(parsed.port);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`DATABASE_URL has an invalid port: ${url}`);
  }
  return { host: parsed.hostname, port };
}

/** True if a TCP connect to the URL's host/port succeeds within `timeoutMs`. */
export async function canReachDatabaseUrl(url: string, timeoutMs = 2000): Promise<boolean> {
  const { host, port } = parseDatabaseHostPort(url);

  return await new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };

    const socket = connect({ host, port });
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}
