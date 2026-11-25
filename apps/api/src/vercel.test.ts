import { createServer, type RequestListener } from "node:http";
import type { AddressInfo } from "node:net";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { createHandler, stripApiPrefix } from "./vercel.js";

const serve = async (handler: RequestListener) => {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    get: (path: string) => fetch(`http://127.0.0.1:${port}${path}`),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

describe("stripApiPrefix", () => {
  it("turns board paths into API paths", () => {
    expect(stripApiPrefix("/api/v1/history?environment=production")).toBe(
      "/v1/history?environment=production",
    );
    expect(stripApiPrefix("/api")).toBe("/");
    expect(stripApiPrefix("/api?x=1")).toBe("/?x=1");
    expect(stripApiPrefix("/apis/v1")).toBe("/apis/v1");
    expect(stripApiPrefix(undefined)).toBe("/");
  });
});

describe("createHandler", () => {
  it("routes /api requests to the app", async () => {
    const handler = createHandler(async () => {
      const app = Fastify();
      app.get("/v1/health", async () => ({ status: "ok" }));
      return app;
    });
    const server = await serve(handler);
    const response = await server.get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    await server.close();
  });

  it("answers 503 when the app cannot start and tries again on the next request", async () => {
    let attempts = 0;
    const handler = createHandler(async () => {
      attempts += 1;
      throw new Error("DATABASE_URL: Required in production");
    });
    const server = await serve(handler);
    const first = await server.get("/api/v1/health");
    expect(first.status).toBe(503);
    expect(await first.json()).toEqual({ message: "The API is not configured" });
    await server.get("/api/v1/health");
    expect(attempts).toBe(2);
    await server.close();
  });
});
