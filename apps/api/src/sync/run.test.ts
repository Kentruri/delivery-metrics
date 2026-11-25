import { describe, expect, it, vi } from "vitest";
import { TENSORPARC_REPOS } from "../config/repos.js";
import { createMemoryStore } from "../db/store.js";
import type { GitHubSource } from "../sources/github.js";
import type { HostSource } from "../sources/hosts.js";
import { runSync, type SyncDeps } from "./run.js";
import type { Merge } from "./types.js";

const HOUR = 3_600_000;
const since = Date.UTC(2026, 0, 1);
const t = (hours: number) => since + hours * HOUR;

const merge = (fields: Partial<Merge>): Merge => ({
  number: 1,
  title: "Staging",
  headRef: "staging",
  environment: "production",
  sha: "a",
  mergedAt: t(1),
  mergedBy: "kevin",
  ...fields,
});

const fakeGitHub = (): GitHubSource => ({
  merges: vi.fn(async (_repo, environment) =>
    environment === "production"
      ? [merge({ number: 1, sha: "base", mergedAt: t(-48) }), merge({ number: 2, sha: "a" })]
      : [],
  ),
  releases: vi.fn(async () => [{ tag: "v3.99.0", sha: "a", publishedAt: t(2) }]),
  range: vi.fn(async () => [{ sha: "c1", message: "feat: x", authoredAt: t(-10), parents: 1 }]),
});

const deps = (fields: Partial<SyncDeps> = {}): SyncDeps => ({
  repos: [TENSORPARC_REPOS[1] as SyncDeps["repos"][number]],
  github: fakeGitHub(),
  hosts: {},
  store: createMemoryStore(),
  since,
  now: () => t(100),
  ...fields,
});

describe("runSync", () => {
  it("infers deploys from GitHub when the host is not connected", async () => {
    const run = deps();
    const report = await runSync(run);

    expect(report).toEqual({
      startedAt: new Date(t(100)).toISOString(),
      finishedAt: new Date(t(100)).toISOString(),
      repos: [
        {
          repo: "belture-api",
          deploys: 1,
          conflicts: 0,
          sources: [
            { source: "GitHub", connected: true, records: 2 },
            { source: "Forge", connected: false, records: 0 },
          ],
        },
      ],
    });
    const [deploy] = await run.store.deploys("production");
    expect(deploy).toMatchObject({ source: "GitHub", version: "3.99.0", leadTimesHours: [11] });
    expect(await run.store.sources()).toEqual([
      expect.objectContaining({ source: "GitHub", connected: true }),
      expect.objectContaining({
        source: "Forge",
        connected: false,
        coversFrom: null,
        syncedAt: null,
      }),
    ]);
  });

  it("keeps the host history and reuses commit ranges it already fetched", async () => {
    const forge: HostSource = {
      deploys: vi.fn(async () => [
        {
          id: "forge:1",
          source: "Forge" as const,
          environment: "production" as const,
          sha: "a",
          status: "succeeded" as const,
          finishedAt: t(1.2),
          author: "forge",
          message: "x",
        },
      ]),
    };
    const run = deps({ hosts: { Forge: forge } });
    await runSync(run);
    await runSync(run);

    expect(run.github.range).toHaveBeenCalledTimes(1);
    const [deploy] = await run.store.deploys("production");
    expect(deploy).toMatchObject({ id: "forge:1", source: "Forge", conflict: null });
    expect(await run.store.sources()).toContainEqual(
      expect.objectContaining({
        source: "Forge",
        connected: true,
        coversFrom: new Date(t(1.2)).toISOString(),
      }),
    );
  });

  it("records a failed run and rethrows", async () => {
    const store = createMemoryStore();
    const github = {
      ...fakeGitHub(),
      releases: vi.fn(async () => Promise.reject(new Error("rate limited"))),
    };
    await expect(runSync(deps({ store, github }))).rejects.toThrow("rate limited");
    expect(store.runs).toEqual([
      expect.objectContaining({ report: null, error: "Error: rate limited" }),
    ]);
  });
});
