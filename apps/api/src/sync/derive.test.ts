import { describe, expect, it } from "vitest";
import { derive, plannedRanges, rangeKey } from "./derive.js";
import type { Draft } from "./reconcile.js";
import type { Merge, RangeCommit } from "./types.js";

const HOUR = 3_600_000;
const t = (hours: number) => Date.UTC(2026, 9, 1) + hours * HOUR;
const since = t(0);

const draft = (id: string, sha: string, hours: number, fields: Partial<Draft> = {}): Draft => ({
  id,
  repo: "belture-frontend",
  environment: "production",
  source: "Netlify",
  status: "succeeded",
  kind: "change",
  sha,
  finishedAt: t(hours),
  triggeredBy: "kevin",
  title: "Staging",
  pullNumber: null,
  conflict: null,
  ...fields,
});

const pull = (number: number, title: string, headRef: string): Merge => ({
  number,
  title,
  headRef,
  environment: "develop",
  sha: `merge-${number}`,
  mergedAt: t(-10),
  mergedBy: "leon",
});

const commit = (
  sha: string,
  message: string,
  hoursBefore: number | null,
  parents = 1,
): RangeCommit => ({
  sha,
  message,
  authoredAt: hoursBefore === null ? null : t(10) - hoursBefore * HOUR,
  parents,
});

describe("plannedRanges", () => {
  it("asks for the commits since the previous production deploy, inside the window", () => {
    const drafts = [
      draft("before", "p0", -5),
      draft("first", "p1", 10),
      draft("bump", "p2", 11, { kind: "release" }),
      draft("failed", "p3", 12, { status: "failed" }),
      draft("second", "p4", 20),
      draft("same", "p4", 21, { kind: "redeploy" }),
      draft("staging", "s1", 15, { environment: "staging" }),
    ];
    expect(plannedRanges(drafts, since)).toEqual([
      { base: "p0", head: "p1" },
      { base: "p2", head: "p4" },
    ]);
    expect(rangeKey({ base: "p0", head: "p1" })).toBe("p0...p1");
  });
});

describe("derive", () => {
  const merges = [
    pull(1, "feat: :art: feedback events", "kevintrujillo/ten-4199-feedback"),
    pull(2, "fix: :bug: wiki link color", "kevintrujillo/ten-4202-wiki"),
    pull(3, "refactor: :recycle: login requests", "leon/ten-4171-login"),
    pull(4, "Develop", "develop"),
    pull(5, "fix: :bug: dates", "kevintrujillo/ten-4208-dates-main"),
  ];
  const ranges = new Map([
    [
      "p0...p1",
      [
        commit("c1", "feat: feedback", 30),
        commit("c2", "fix: color", 4),
        commit("m1", "Merge pull request #1 from TensorParc-Inc/x", 2, 2),
        commit("m2", "Merge pull request #2 from TensorParc-Inc/y", 2, 2),
        commit("m3", "Merge pull request #3 from TensorParc-Inc/z", 2, 2),
        commit("m4", "Merge pull request #4 from TensorParc-Inc/develop", 1, 2),
        commit("m5", "Merge pull request #2 from TensorParc-Inc/y", 1, 2),
        commit("r1", "chore(main): release 3.111.0", 1),
        commit("x1", "no author", null),
        commit("f1", "from the future", -5),
      ],
    ],
  ]);

  it("versions, times and lists what each production deploy shipped", () => {
    const [first, staging] = derive({
      drafts: [
        draft("before", "p0", -5),
        draft("first", "p1", 10),
        draft("staging", "s1", 15, { environment: "staging" }),
      ],
      releases: [
        { tag: "v3.110.0", sha: "p0", publishedAt: t(-4) },
        { tag: "v3.111.0", sha: "p9", publishedAt: t(12) },
      ],
      merges,
      ranges,
      since,
    });

    expect(first).toMatchObject({
      id: "first",
      counted: true,
      version: "3.111.0",
      finishedAt: "2026-10-01T10:00:00.000Z",
      leadTimesHours: [30, 4],
      changes: [
        { kind: "feature", title: "Feedback events", ticket: "TEN-4199", pullNumber: 1 },
        { kind: "fix", title: "Wiki link color", ticket: "TEN-4202", pullNumber: 2 },
      ],
      internalChanges: 1,
      hotfixAt: null,
      rollbackAt: null,
    });
    expect(staging).toMatchObject({
      version: "s1",
      leadTimesHours: [],
      changes: [],
      internalChanges: 0,
    });
  });

  it("marks the last ordinary deploy before a hotfix or a rollback, never another fix", () => {
    const deploys = derive({
      drafts: [
        draft("change", "a", 1),
        draft("hotfix", "b", 20, { kind: "hotfix", pullNumber: 5 }),
        draft("second-hotfix", "c", 30, { kind: "hotfix" }),
        draft("rollback", "d", 40, { kind: "rollback" }),
        draft("late", "e", 200),
        draft("late-fix", "f", 300, { kind: "hotfix" }),
      ],
      releases: [],
      merges,
      ranges: new Map(),
      since,
    });
    const byId = new Map(deploys.map((deploy) => [deploy.id, deploy]));

    expect(byId.get("change")).toMatchObject({
      hotfixAt: "2026-10-01T20:00:00.000Z",
      rollbackAt: "2026-10-02T16:00:00.000Z",
      version: "a",
    });
    expect(byId.get("hotfix")?.hotfixAt).toBeNull();
    expect(byId.get("hotfix")?.changes).toEqual([
      { kind: "fix", title: "Dates", ticket: "TEN-4208", pullNumber: 5 },
    ]);
    expect(byId.get("late")?.hotfixAt).toBeNull();
  });

  it("drops what happened before the window and does not count bumps or redeploys", () => {
    const deploys = derive({
      drafts: [
        draft("before", "p0", -5),
        draft("bump", "p1", 2, { kind: "release" }),
        draft("again", "p1", 3, { kind: "redeploy" }),
        draft("broken", "p2", 4, { status: "failed" }),
      ],
      releases: [],
      merges,
      ranges: new Map(),
      since,
    });
    expect(deploys.map((deploy) => [deploy.id, deploy.counted])).toEqual([
      ["bump", false],
      ["again", false],
      ["broken", false],
    ]);
  });
});
