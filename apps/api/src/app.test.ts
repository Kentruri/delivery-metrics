import type { Conflict, Deploy, SyncReport } from "@cloudnonic/delivery-contracts";
import { describe, expect, it, vi } from "vitest";
import { type AppDeps, buildApp } from "./app.js";
import { hashPassword } from "./auth/password.js";
import { createMemoryStore } from "./db/store.js";
import { loadEnv } from "./env.js";

const PASSWORD = "correct horse battery";
const HASH = await hashPassword(PASSWORD);
const SYNC_KEY = "k".repeat(32);
const now = () => Date.UTC(2026, 10, 9, 12);

const deploy = (fields: Partial<Deploy>): Deploy => ({
  id: "forge:1",
  repo: "belture-api",
  environment: "production",
  source: "Forge",
  status: "succeeded",
  kind: "change",
  counted: true,
  sha: "abc",
  version: "3.98.0",
  finishedAt: "2026-10-26T16:30:00.000Z",
  triggeredBy: "Kentruri",
  title: "Staging",
  pullNumber: 2138,
  leadTimesHours: [10],
  changes: [],
  internalChanges: 0,
  hotfixAt: null,
  rollbackAt: null,
  conflict: null,
  ...fields,
});

const conflict: Conflict = {
  id: "tag:belture-api:v3.97.1",
  repo: "belture-api",
  environment: "production",
  kind: "tag_without_deploy",
  ref: "v3.97.1",
  at: "2026-10-20T10:00:00.000Z",
  detail: "Release v3.97.1 has no production deploy in Forge.",
};

const report: SyncReport = {
  startedAt: "2026-11-09T05:00:00.000Z",
  finishedAt: "2026-11-09T05:01:00.000Z",
  repos: [],
};

const setup = async (env: Record<string, string> = {}, deps: Partial<AppDeps> = {}) => {
  const store = createMemoryStore();
  await store.replaceRepo(
    "belture-api",
    [deploy({}), deploy({ id: "s", environment: "staging" })],
    [conflict],
  );
  const app = buildApp({
    env: loadEnv({
      LOG_LEVEL: "silent",
      APP_PASSWORD_HASH: HASH,
      SESSION_SECRET: "s".repeat(32),
      SYNC_API_KEY: SYNC_KEY,
      ...env,
    }),
    store,
    sync: async () => report,
    now,
    ...deps,
  });
  return app;
};

const signIn = async (app: Awaited<ReturnType<typeof setup>>) => {
  const response = await app.inject({
    method: "POST",
    url: "/v1/session",
    payload: { password: PASSWORD },
  });
  return String(response.headers["set-cookie"]).split(";")[0] ?? "";
};

describe("GET /v1/health", () => {
  it("answers with the contract shape", async () => {
    const app = await setup();
    const response = await app.inject({ method: "GET", url: "/v1/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});

describe("session", () => {
  it("signs in with the shared password and out again", async () => {
    const app = await setup();
    const wrong = await app.inject({
      method: "POST",
      url: "/v1/session",
      payload: { password: "nope" },
    });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json()).toEqual({ error: "Wrong password" });

    const login = await app.inject({
      method: "POST",
      url: "/v1/session",
      payload: { password: PASSWORD },
    });
    expect(login.json()).toEqual({ authenticated: true });
    expect(String(login.headers["set-cookie"])).toMatch(
      /^dm_session=\d+\.[\w-]+; Path=\/; HttpOnly/,
    );

    const cookie = await signIn(app);
    const check = await app.inject({ method: "GET", url: "/v1/session", headers: { cookie } });
    expect(check.json()).toEqual({ authenticated: true });
    expect((await app.inject({ method: "GET", url: "/v1/session" })).json()).toEqual({
      authenticated: false,
    });

    const logout = await app.inject({ method: "DELETE", url: "/v1/session", headers: { cookie } });
    expect(logout.json()).toEqual({ authenticated: false });
    expect(String(logout.headers["set-cookie"])).toContain("Max-Age=0");
  });

  it("refuses an empty password, a missing setup and too many attempts", async () => {
    const app = await setup();
    expect(
      (await app.inject({ method: "POST", url: "/v1/session", payload: { password: "" } }))
        .statusCode,
    ).toBe(400);

    const unconfigured = await setup({ APP_PASSWORD_HASH: "" });
    const answer = await unconfigured.inject({
      method: "POST",
      url: "/v1/session",
      payload: { password: PASSWORD },
    });
    expect(answer.statusCode).toBe(503);

    const codes: number[] = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await app.inject({
        method: "POST",
        url: "/v1/session",
        payload: { password: "nope" },
      });
      codes.push(response.statusCode);
    }
    expect(codes.at(-1)).toBe(429);
  });
});

describe("history and exports", () => {
  it("needs a session and then serves one environment", async () => {
    const app = await setup();
    expect((await app.inject({ method: "GET", url: "/v1/history" })).statusCode).toBe(401);

    const cookie = await signIn(app);
    const response = await app.inject({
      method: "GET",
      url: "/v1/history?environment=production",
      headers: { cookie },
    });
    const body = response.json();
    expect(response.statusCode).toBe(200);
    expect(body.deploys.map((item: Deploy) => item.id)).toEqual(["forge:1"]);
    expect(body.conflicts).toEqual([conflict]);
    expect(body).toMatchObject({
      since: "2026-01-01T00:00:00.000Z",
      generatedAt: "2026-11-09T12:00:00.000Z",
      windowHours: 72,
      repos: [
        { name: "belture-frontend", host: "Netlify" },
        { name: "belture-api", host: "Forge" },
      ],
    });
  });

  it("says when there is no database", async () => {
    const app = await setup({}, { store: null });
    const cookie = await signIn(app);
    const response = await app.inject({ method: "GET", url: "/v1/history", headers: { cookie } });
    expect(response.statusCode).toBe(503);
  });

  it("downloads the deploys and the monthly summary as CSV", async () => {
    const app = await setup();
    const cookie = await signIn(app);
    const deploys = await app.inject({
      method: "GET",
      url: "/v1/export/deploys.csv",
      headers: { cookie },
    });
    expect(deploys.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(deploys.headers["content-disposition"]).toBe(
      'attachment; filename="tensorparc-deploys-all-2026-11-09.csv"',
    );
    expect(deploys.body.split("\r\n")).toHaveLength(5);

    const summary = await app.inject({
      method: "GET",
      url: "/v1/export/summary.csv?environment=staging",
      headers: { cookie },
    });
    expect(summary.body).toContain("2026-10,belture-api,staging,1,1,10,10,,,");
  });
});

describe("POST /v1/sync", () => {
  it("runs with the sync key only, once at a time", async () => {
    const sync = vi.fn(
      () => new Promise<SyncReport>((resolve) => setTimeout(() => resolve(report), 10)),
    );
    const app = await setup({}, { sync });
    expect((await app.inject({ method: "POST", url: "/v1/sync" })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/sync",
          headers: { authorization: "Bearer wrong" },
        })
      ).statusCode,
    ).toBe(401);

    const headers = { authorization: `Bearer ${SYNC_KEY}` };
    const [first, second] = await Promise.all([
      app.inject({ method: "POST", url: "/v1/sync", headers }),
      app.inject({ method: "POST", url: "/v1/sync", headers }),
    ]);
    expect(first.json()).toEqual(report);
    expect(second.json()).toEqual(report);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("says when sync is not configured", async () => {
    const app = await setup({}, { sync: null });
    const response = await app.inject({
      method: "POST",
      url: "/v1/sync",
      headers: { authorization: `Bearer ${SYNC_KEY}` },
    });
    expect(response.statusCode).toBe(503);
  });
});
