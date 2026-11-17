import type { Deploy, HistoryResponse } from "@cloudnonic/delivery-contracts";
import { describe, expect, it } from "vitest";
import { disconnectedHosts, lastSyncedAt, pullUrl, releaseUrl, toBoard } from "./fromApi";

const deploy: Deploy = {
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
  changes: [{ kind: "fix", title: "Dates", ticket: "TEN-4208", pullNumber: 2147 }],
  internalChanges: 2,
  hotfixAt: "2026-10-27T15:59:18.000Z",
  rollbackAt: null,
  conflict: null,
};

const history: HistoryResponse = {
  since: "2026-01-01T00:00:00.000Z",
  generatedAt: "2026-11-09T12:00:00.000Z",
  windowHours: 72,
  repos: [
    { name: "belture-frontend", host: "Netlify" },
    { name: "belture-api", host: "Forge" },
  ],
  sources: [
    {
      repo: "belture-api",
      source: "Forge",
      connected: true,
      coversFrom: null,
      syncedAt: "2026-11-09T05:00:00.000Z",
    },
    {
      repo: "belture-api",
      source: "GitHub",
      connected: true,
      coversFrom: null,
      syncedAt: "2026-11-09T05:02:00.000Z",
    },
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
};

describe("toBoard", () => {
  it("turns the API's history into board rows with real dates", () => {
    const board = toBoard(history);
    expect(board.since).toEqual(new Date("2026-01-01T00:00:00.000Z"));
    expect(board.deploys[0]).toMatchObject({
      service: "belture-api",
      shippedBy: "Kentruri",
      finishedAt: new Date("2026-10-26T16:30:00.000Z"),
      hotfixAt: new Date("2026-10-27T15:59:18.000Z"),
      rollbackAt: undefined,
      changes: { items: deploy.changes, internalCount: 2 },
    });
  });
});

describe("source helpers", () => {
  it("names the hosts without a token and the last sync", () => {
    expect(disconnectedHosts(history)).toEqual(["Netlify"]);
    expect(lastSyncedAt(history.sources)).toEqual(new Date("2026-11-09T05:02:00.000Z"));
    expect(lastSyncedAt([])).toBeNull();
  });

  it("links pull requests and releases on GitHub", () => {
    expect(pullUrl("belture-api", 2147)).toBe(
      "https://github.com/TensorParc-Inc/belture-api/pull/2147",
    );
    expect(releaseUrl("belture-api", "v3.99.0")).toBe(
      "https://github.com/TensorParc-Inc/belture-api/releases/tag/v3.99.0",
    );
  });
});
