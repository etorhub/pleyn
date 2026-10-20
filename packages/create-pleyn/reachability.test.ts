import { createServer } from "node:net";
import { describe, expect, test } from "bun:test";

import { canReachDatabaseUrl, parseDatabaseHostPort } from "./reachability.ts";

describe("parseDatabaseHostPort", () => {
  test("reads host and port from a postgresql URL", () => {
    expect(parseDatabaseHostPort("postgresql://a:b@127.0.0.1:5432/a")).toEqual({
      host: "127.0.0.1",
      port: 5432,
    });
  });

  test("defaults to 5432 when the port is omitted", () => {
    expect(parseDatabaseHostPort("postgresql://a:b@localhost/a")).toEqual({
      host: "localhost",
      port: 5432,
    });
  });
});

describe("canReachDatabaseUrl", () => {
  test("returns false when nothing is listening", async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") {
      server.close();
      throw new Error("expected a TCP address");
    }
    const { port } = address;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );

    const ok = await canReachDatabaseUrl(`postgresql://x:x@127.0.0.1:${port}/x`, 300);
    expect(ok).toBe(false);
  });

  test("returns true when the host/port accepts a connection", async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") {
      server.close();
      throw new Error("expected a TCP address");
    }

    try {
      const ok = await canReachDatabaseUrl(
        `postgresql://x:x@127.0.0.1:${address.port}/x`,
        1000,
      );
      expect(ok).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
