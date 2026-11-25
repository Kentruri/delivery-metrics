import type { Deploy } from "@cloudnonic/delivery-contracts";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPostgresStore, type PostgresStore } from "./postgresStore.js";

// Runs against a throwaway database only: CI starts one and sets TEST_DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;

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
  triggeredBy: null,
  title: "Staging",
  pullNumber: null,
  leadTimesHours: [1.5],
  changes: [{ kind: "fix", title: "Dates", ticket: "TEN-4208", pullNumber: 5 }],
  internalChanges: 1,
  hotfixAt: null,
  rollbackAt: null,
  conflict: null,
};

describe.skipIf(!url)("createPostgresStore", () => {
  let store: PostgresStore;

  beforeAll(async () => {
    const admin = postgres(url as string, { onnotice: () => {} });
    await admin.unsafe(
      "drop table if exists host_deploys, commit_ranges, deploys, conflicts, source_status, sync_runs, schema_migrations cascade",
    );
    await admin.end();
    store = createPostgresStore(url as string);
  });

  afterAll(async () => {
    await store.close();
  });

  it("migrates once", async () => {
    expect(await store.migrate()).toEqual(["001_init"]);
    expect(await store.migrate()).toEqual([]);
  });

  it("keeps host deploys and updates them in place", async () => {
    const record = {
      id: "forge:1",
      source: "Forge" as const,
      environment: "production" as const,
      sha: "abc",
      status: "failed" as const,
      finishedAt: Date.UTC(2026, 9, 26, 16, 30),
      author: null,
      message: "Merge",
    };
    await store.saveHostDeploys("belture-api", [record]);
    await store.saveHostDeploys("belture-api", [{ ...record, status: "succeeded" }]);
    expect(await store.loadHostDeploys("belture-api")).toEqual([
      { ...record, status: "succeeded" },
    ]);
    expect(await store.loadHostDeploys("belture-frontend")).toEqual([]);
  });

  it("caches commit ranges", async () => {
    const commits = [{ sha: "c", message: "feat: x", authoredAt: null, parents: 1 }];
    await store.saveRange("belture-api", { base: "a", head: "b" }, commits);
    await store.saveRange("belture-api", { base: "a", head: "b" }, []);
    expect(await store.loadRanges("belture-api")).toEqual(new Map([["a...b", commits]]));
  });

  it("replaces a repo's deploys and conflicts, and reads them by environment", async () => {
    const conflict = {
      id: "tag:belture-api:v1",
      repo: "belture-api",
      environment: "production" as const,
      kind: "tag_without_deploy" as const,
      ref: "v1",
      at: "2026-10-20T10:00:00.000Z",
      detail: "x",
    };
    await store.replaceRepo(
      "belture-api",
      [deploy, { ...deploy, id: "s", environment: "staging" }],
      [conflict],
    );
    await store.replaceRepo("belture-api", [deploy], [conflict]);
    expect(await store.deploys("production")).toEqual([deploy]);
    expect(await store.deploys("staging")).toEqual([]);
    expect(await store.deploys("all")).toEqual([deploy]);
    expect(await store.conflicts("all")).toEqual([conflict]);
  });

  it("stores source status and sync runs", async () => {
    const status = {
      repo: "belture-api",
      source: "Forge" as const,
      connected: true,
      coversFrom: "2026-09-01T00:00:00.000Z",
      syncedAt: "2026-11-09T05:00:00.000Z",
    };
    await store.saveSourceStatus(status);
    await store.saveSourceStatus({ ...status, connected: false });
    expect(await store.sources()).toEqual([{ ...status, connected: false }]);
    await store.recordRun({ startedAt: "2026-11-09T05:00:00.000Z", report: null, error: "boom" });
  });
});
