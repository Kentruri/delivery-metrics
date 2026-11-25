import { describe, expect, it } from "vitest";
import { deploySchema, historyQuerySchema, historyResponseSchema } from "./deploys.js";
import { defineEndpoint } from "./endpoint.js";
import { healthResponseSchema } from "./health.js";
import { loginBodySchema, sessionResponseSchema } from "./session.js";
import { syncReportSchema } from "./sync.js";

const deploy = {
  id: "netlify:abc",
  repo: "belture-frontend",
  environment: "production",
  source: "Netlify",
  status: "succeeded",
  kind: "change",
  counted: true,
  sha: "0123456789abcdef",
  version: "3.112.0",
  finishedAt: "2026-10-26T16:40:00.000Z",
  triggeredBy: "Kentruri",
  title: "Staging",
  pullNumber: 3290,
  leadTimesHours: [4.5, 30],
  changes: [{ kind: "feature", title: "Feedback on events", ticket: "TEN-4199", pullNumber: 3270 }],
  internalChanges: 2,
  hotfixAt: "2026-10-28T18:41:45.000Z",
  rollbackAt: null,
  conflict: null,
};

describe("contract schemas", () => {
  it("accepts a deploy and a history answer", () => {
    expect(deploySchema.parse(deploy)).toEqual(deploy);
    expect(
      historyResponseSchema.parse({
        since: "2026-01-01T00:00:00.000Z",
        generatedAt: "2026-11-09T12:00:00.000Z",
        windowHours: 72,
        repos: [{ name: "belture-frontend", host: "Netlify" }],
        sources: [
          {
            repo: "belture-frontend",
            source: "Netlify",
            connected: false,
            coversFrom: null,
            syncedAt: null,
          },
        ],
        deploys: [deploy],
        conflicts: [],
      }).deploys,
    ).toHaveLength(1);
  });

  it("rejects a deploy with an unknown environment or a bad time", () => {
    expect(deploySchema.safeParse({ ...deploy, environment: "qa" }).success).toBe(false);
    expect(deploySchema.safeParse({ ...deploy, finishedAt: "yesterday" }).success).toBe(false);
  });

  it("defaults the history query to production", () => {
    expect(historyQuerySchema.parse({})).toEqual({ environment: "production" });
  });

  it("validates the session, sync and health bodies", () => {
    expect(loginBodySchema.safeParse({ password: "" }).success).toBe(false);
    expect(sessionResponseSchema.parse({ authenticated: true })).toEqual({ authenticated: true });
    expect(healthResponseSchema.parse({ status: "ok" })).toEqual({ status: "ok" });
    expect(
      syncReportSchema.parse({
        startedAt: "2026-11-09T05:00:00.000Z",
        finishedAt: "2026-11-09T05:01:00.000Z",
        repos: [
          {
            repo: "belture-api",
            deploys: 12,
            conflicts: 1,
            sources: [{ source: "Forge", connected: true, records: 30 }],
          },
        ],
      }).repos,
    ).toHaveLength(1);
  });

  it("keeps an endpoint definition as given", () => {
    const endpoint = defineEndpoint({
      method: "GET",
      path: "/v1/x",
      response: healthResponseSchema,
    });
    expect(endpoint.path).toBe("/v1/x");
  });
});
