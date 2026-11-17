import { type Change, type Deploy, WINDOW_HOURS } from "@cloudnonic/delivery-contracts";
import {
  changeOf,
  isPromotion,
  isReleaseBump,
  isReleaseCommit,
  pullNumberOf,
  shortSha,
} from "./classify.js";
import type { Draft } from "./reconcile.js";
import type { Merge, RangeCommit, Release } from "./types.js";

const HOUR_MS = 3_600_000;
const UNCOUNTED = new Set(["release", "redeploy"]);
const FIXES = new Set(["hotfix", "rollback"]);

export interface RangeRequest {
  base: string;
  head: string;
}

const isCounted = (draft: Draft) => draft.status === "succeeded" && !UNCOUNTED.has(draft.kind);
const iso = (time: number | null) => (time === null ? null : new Date(time).toISOString());

const productionOrder = (drafts: Draft[]) =>
  drafts
    .filter((draft) => draft.environment === "production")
    .sort((a, b) => a.finishedAt - b.finishedAt);

// Each counted production deploy needs the commits since the deploy before it.
export const plannedRanges = (drafts: Draft[], since: number): RangeRequest[] => {
  const ranges: RangeRequest[] = [];
  let base: string | null = null;
  for (const draft of productionOrder(drafts)) {
    if (draft.status !== "succeeded" || !draft.sha) {
      continue;
    }
    if (base && isCounted(draft) && base !== draft.sha && draft.finishedAt >= since) {
      ranges.push({ base, head: draft.sha });
    }
    base = draft.sha;
  }
  return ranges;
};

export const rangeKey = ({ base, head }: RangeRequest) => `${base}...${head}`;

const versionOf = (draft: Draft, releases: Release[]) => {
  if (draft.environment !== "production") {
    return shortSha(draft.sha);
  }
  const release =
    releases.find((candidate) => candidate.sha !== null && candidate.sha === draft.sha) ??
    releases.find((candidate) => candidate.publishedAt >= draft.finishedAt);
  return release ? release.tag.replace(/^v/, "") : shortSha(draft.sha);
};

// A hotfix or a rollback counts against the last ordinary deploy before it, within the window;
// a fix is never the target of the next one.
const failures = (drafts: Draft[]) => {
  const marks = new Map<string, { hotfixAt: number | null; rollbackAt: number | null }>();
  let target: Draft | null = null;
  for (const draft of productionOrder(drafts).filter(isCounted)) {
    if (!FIXES.has(draft.kind)) {
      target = draft;
      continue;
    }
    if (!target || draft.finishedAt - target.finishedAt > WINDOW_HOURS * HOUR_MS) {
      continue;
    }
    const mark = marks.get(target.id) ?? { hotfixAt: null, rollbackAt: null };
    const key = draft.kind === "hotfix" ? "hotfixAt" : "rollbackAt";
    mark[key] = mark[key] ?? draft.finishedAt;
    marks.set(target.id, mark);
  }
  return marks;
};

const shipped = (draft: Draft, commits: RangeCommit[], pulls: Map<number, Merge>) => {
  const changes: Change[] = [];
  let internal = 0;
  const seen = new Set<number>();
  const numbers = commits.map((commit) => pullNumberOf(commit.message));
  if (draft.pullNumber !== null && FIXES.has(draft.kind)) {
    numbers.push(draft.pullNumber);
  }
  for (const number of numbers) {
    const pull = number === null ? undefined : pulls.get(number);
    if (
      !pull ||
      seen.has(pull.number) ||
      isPromotion(pull.headRef) ||
      isReleaseBump(pull.headRef, pull.title)
    ) {
      continue;
    }
    seen.add(pull.number);
    const change = changeOf(
      pull,
      pull.number === draft.pullNumber && FIXES.has(draft.kind) ? "fix" : "feature",
    );
    if (change === "internal") {
      internal += 1;
    } else {
      changes.push(change);
    }
  }
  return { changes, internal };
};

const leadTimes = (draft: Draft, commits: RangeCommit[]) =>
  commits
    .filter(
      (commit) =>
        commit.parents === 1 &&
        !isReleaseCommit(commit.message) &&
        commit.authoredAt !== null &&
        commit.authoredAt <= draft.finishedAt,
    )
    .map(
      (commit) => Math.round(((draft.finishedAt - (commit.authoredAt ?? 0)) / HOUR_MS) * 10) / 10,
    );

export interface DeriveInput {
  drafts: Draft[];
  releases: Release[];
  merges: Merge[];
  ranges: Map<string, RangeCommit[]>;
  since: number;
}

export const derive = ({ drafts, releases, merges, ranges, since }: DeriveInput): Deploy[] => {
  const pulls = new Map(merges.map((merge) => [merge.number, merge]));
  const marks = failures(drafts);
  const commitsOf = new Map<string, RangeCommit[]>();
  for (const range of plannedRanges(drafts, since)) {
    commitsOf.set(range.head, ranges.get(rangeKey(range)) ?? []);
  }

  return drafts
    .filter((draft) => draft.finishedAt >= since)
    .map((draft) => {
      const counted = isCounted(draft);
      const commits = counted && draft.sha ? (commitsOf.get(draft.sha) ?? []) : [];
      const delivered =
        draft.environment === "production" && counted
          ? shipped(draft, commits, pulls)
          : { changes: [], internal: 0 };
      const mark = marks.get(draft.id);
      return {
        id: draft.id,
        repo: draft.repo,
        environment: draft.environment,
        source: draft.source,
        status: draft.status,
        kind: draft.kind,
        counted,
        sha: draft.sha,
        version: versionOf(draft, releases),
        finishedAt: new Date(draft.finishedAt).toISOString(),
        triggeredBy: draft.triggeredBy,
        title: draft.title,
        pullNumber: draft.pullNumber,
        leadTimesHours: draft.environment === "production" ? leadTimes(draft, commits) : [],
        changes: delivered.changes,
        internalChanges: delivered.internal,
        hotfixAt: iso(mark?.hotfixAt ?? null),
        rollbackAt: iso(mark?.rollbackAt ?? null),
        conflict: draft.conflict,
      };
    });
};
