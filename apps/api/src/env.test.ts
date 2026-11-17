import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

describe("loadEnv", () => {
  it("fills the defaults and leaves the sources off", () => {
    expect(loadEnv({})).toEqual({
      NODE_ENV: "development",
      HOST: "0.0.0.0",
      PORT: 3000,
      LOG_LEVEL: "info",
      HISTORY_SINCE: "2026-01-01",
    });
  });

  it("reads the port as a number and empty values as missing", () => {
    expect(loadEnv({ PORT: "8080" }).PORT).toBe(8080);
    expect(loadEnv({ TP_GITHUB_TOKEN: "" }).TP_GITHUB_TOKEN).toBeUndefined();
  });

  it("reads Netlify sites per environment or one site for all", () => {
    expect(loadEnv({ TP_NETLIFY_SITES: "production=a, staging=b" }).TP_NETLIFY_SITES).toEqual({
      production: "a",
      staging: "b",
    });
    expect(loadEnv({ TP_NETLIFY_SITES: "site" }).TP_NETLIFY_SITES).toEqual({ "*": "site" });
    expect(() => loadEnv({ TP_NETLIFY_SITES: "=x" })).toThrow(/Invalid Netlify site entry/);
  });

  it("reads the Forge servers as a list", () => {
    expect(loadEnv({ TP_FORGE_SERVERS: "1146914, 746061," }).TP_FORGE_SERVERS).toEqual([
      "1146914",
      "746061",
    ]);
  });

  it("fails fast on an invalid value or a missing production secret", () => {
    expect(() => loadEnv({ PORT: "abc" })).toThrow(/Invalid environment/);
    expect(() => loadEnv({ SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
    expect(() => loadEnv({ NODE_ENV: "production" })).toThrow(/DATABASE_URL/);
  });
});
