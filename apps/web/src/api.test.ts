import { healthEndpoint, loginEndpoint } from "@cloudnonic/delivery-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { exportUrl, request } from "./api";

const answer = (body: string, status = 200) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status })));

describe("request", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed response through the proxy, with the session cookie", async () => {
    answer(JSON.stringify({ status: "ok" }));
    await expect(request(healthEndpoint)).resolves.toEqual({ status: "ok" });
    expect(fetch).toHaveBeenCalledWith("/api/v1/health", {
      method: "GET",
      credentials: "same-origin",
    });
  });

  it("sends a query and a JSON body", async () => {
    answer(JSON.stringify({ authenticated: true }));
    await request(loginEndpoint, { body: { password: "x" }, query: { from: "web" } });
    expect(fetch).toHaveBeenCalledWith("/api/v1/session?from=web", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: '{"password":"x"}',
    });
  });

  it("raises the API's own message with its status, or a plain one", async () => {
    answer(JSON.stringify({ error: "Wrong password" }), 401);
    await expect(request(loginEndpoint, { body: { password: "x" } })).rejects.toMatchObject({
      name: "ApiError",
      message: "Wrong password",
      status: 401,
    });

    answer("<html>Bad gateway</html>", 502);
    await expect(request(healthEndpoint)).rejects.toMatchObject({
      message: "GET /v1/health answered 502",
      status: 502,
    });
  });

  it("throws when the response breaks the contract", async () => {
    answer(JSON.stringify({ status: "down" }));
    await expect(request(healthEndpoint)).rejects.toThrow();
  });
});

describe("exportUrl", () => {
  it("builds the download link behind the proxy", () => {
    expect(exportUrl("/v1/export/deploys.csv", "all")).toBe(
      "/api/v1/export/deploys.csv?environment=all",
    );
  });
});
