import { describe, expect, it } from "vitest";
import { reconcile } from "./reconcile.js";
import type { HostDeploy, Merge } from "./types.js";

const HOUR = 3_600_000;
const t = (hours: number) => Date.UTC(2026, 9, 1) + hours * HOUR;
const branches = { production: "main", staging: "staging", develop: "develop" } as const;

const merge = (number: number, sha: string, hours: number, fields: Partial<Merge> = {}): Merge => ({
  number,
  title: `Promotion ${number}`,
  headRef: "staging",
  environment: "production",
  sha,
  mergedAt: t(hours),
  mergedBy: "kevin",
  ...fields,
});

const host = (
  id: string,
  sha: string | null,
  hours: number,
  fields: Partial<HostDeploy> = {},
): HostDeploy => ({
  id,
  source: "Forge",
  environment: "production",
  sha,
  status: "succeeded",
  finishedAt: t(hours),
  author: "Forge user",
  message: "Merge pull request\n\nbody",
  ...fields,
});

const base = { repo: "belture-api", host: "Forge" as const, branches, releases: [] };

describe("reconcile", () => {
  it("matches host deploys to merges and keeps who merged", () => {
    const { drafts, conflicts, coversFrom } = reconcile({
      ...base,
      merges: [merge(10, "a", 1)],
      hostDeploys: [host("forge:1", "a", 1.1)],
    });
    expect(drafts).toEqual([
      expect.objectContaining({
        id: "forge:1",
        source: "Forge",
        kind: "change",
        triggeredBy: "kevin",
        title: "Promotion 10",
        pullNumber: 10,
        conflict: null,
      }),
    ]);
    expect(conflicts).toEqual([]);
    expect(coversFrom.production).toBe(t(1.1));
  });

  it("names redeploys, rollbacks and deploys GitHub does not know", () => {
    const { drafts, conflicts } = reconcile({
      ...base,
      merges: [merge(10, "a", 1), merge(11, "b", 5)],
      hostDeploys: [
        host("forge:1", "a", 1),
        host("forge:2", "b", 5),
        host("forge:3", "b", 6),
        host("forge:4", "a", 7),
        host("forge:5", "c", 8, { message: "Manual fix\n\ndetails" }),
        host("forge:6", "d", 9, { status: "failed" }),
      ],
    });
    expect(drafts.map((draft) => [draft.id, draft.kind, draft.conflict])).toEqual([
      ["forge:1", "change", null],
      ["forge:2", "change", null],
      ["forge:3", "redeploy", null],
      ["forge:4", "rollback", null],
      ["forge:5", "change", "no_github_record"],
      ["forge:6", "change", "no_github_record"],
    ]);
    expect(drafts[4]?.title).toBe("Manual fix");
    expect(conflicts[0]).toMatchObject({
      id: "forge:5",
      kind: "no_github_record",
      ref: "c",
      detail: expect.stringContaining("Forge deployed c on 2026-10-01"),
    });
  });

  it("flags merges the host never deployed, but only inside its history", () => {
    const { drafts, conflicts } = reconcile({
      ...base,
      merges: [merge(9, "old", 0), merge(10, "a", 10), merge(11, "b", 20)],
      hostDeploys: [host("forge:1", "a", 10)],
    });
    expect(drafts.map((draft) => [draft.id, draft.source, draft.conflict])).toEqual([
      ["github:production:9", "GitHub", null],
      ["forge:1", "Forge", null],
      ["github:production:11", "GitHub", "no_host_record"],
    ]);
    expect(conflicts.map((conflict) => conflict.detail)).toEqual([
      "#11 was merged into main on 2026-10-01, but Forge has no deploy of b.",
    ]);
  });

  it("lists release tags that never reached production", () => {
    const { conflicts } = reconcile({
      ...base,
      merges: [merge(10, "a", 1)],
      hostDeploys: [host("forge:1", "a", 1)],
      releases: [
        { tag: "v3.99.0", sha: "a", publishedAt: t(2) },
        { tag: "v3.100.0", sha: "z", publishedAt: t(3) },
        { tag: "v3.80.0", sha: "y", publishedAt: t(-5) },
      ],
    });
    expect(conflicts).toEqual([
      expect.objectContaining({
        id: "tag:belture-api:v3.100.0",
        kind: "tag_without_deploy",
        ref: "v3.100.0",
        detail: "Release v3.100.0 (z) has no production deploy in Forge.",
      }),
    ]);
  });

  it("infers every deploy from merges when the host is not connected", () => {
    const { drafts, conflicts } = reconcile({
      ...base,
      merges: [
        merge(10, "a", 1),
        merge(12, "s", 2, { environment: "staging", headRef: "develop" }),
      ],
      hostDeploys: null,
      releases: [{ tag: "v1.0.0", sha: "zz", publishedAt: t(3) }],
    });
    expect(drafts.map((draft) => [draft.environment, draft.source, draft.conflict])).toEqual([
      ["production", "GitHub", null],
      ["staging", "GitHub", null],
    ]);
    expect(conflicts).toEqual([]);
  });
});
